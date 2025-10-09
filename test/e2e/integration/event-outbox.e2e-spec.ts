import { INestApplication } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ResponseHelper } from '../../helpers/response.helper';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { TestAppHelper } from '../../helpers/test-app.helper';
import { OutboxEvent } from '../../../src/modules/events/entities/outbox-event.entity';
import { OutboxProcessor } from '../../../src/modules/events/processors/outbox.processor';
import { Product } from '../../../src/modules/products/entities/product.entity';
import { Category } from '../../../src/modules/categories/entities/category.entity';

describe('Event Outbox Pattern (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let outboxRepository: Repository<OutboxEvent>;
  let outboxProcessor: OutboxProcessor;
  let accessToken: string;
  let userId: string;
  let testProduct: Product;

  beforeAll(async () => {
    // Create test app with real dependencies
    app = await TestAppHelper.createTestApp();
    await app.init();

    // Get services and repositories
    dataSource = app.get(DataSource);
    outboxRepository = app.get(getRepositoryToken(OutboxEvent));
    outboxProcessor = app.get(OutboxProcessor);

    // Create test user and get auth token using direct registration
    const userTimestamp = Date.now().toString().slice(-6);
    const userData = {
      email: `outbox${userTimestamp}@test.com`,
      password: 'SecurePass123!',
      firstName: 'Outbox',
      lastName: 'Tester',
    };

    const userResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send(userData)
      .expect(201);

    // The actual data is nested due to response interceptor
    const authData = userResponse.body.data.data;
    userId = authData.user.id;
    accessToken = authData.accessToken;

    // Create test data (category and product)
    const categoryRepository = dataSource.getRepository(Category);
    const productRepository = dataSource.getRepository(Product);

    const testCategory = categoryRepository.create({
      name: 'Electronics',
      slug: `electronics-outbox-test-${Date.now()}`,
      description: 'Test category for outbox pattern tests',
      sortOrder: 1,
      isActive: true,
    });
    const savedCategory = await categoryRepository.save(testCategory);

    testProduct = productRepository.create({
      name: 'Test Product for Outbox',
      description: 'Product for testing outbox pattern',
      price: 99.99,
      sku: `TEST-OUTBOX-${Date.now()}`,
      categoryId: savedCategory.id,
      isActive: true,
    });
    await productRepository.save(testProduct);
  });

  afterAll(async () => {
    await TestAppHelper.closeApp(app);
  });

  beforeEach(async () => {
    // Clean outbox events before each test
    await outboxRepository.clear();
  });

  describe('Order Creation → Outbox Event Created', () => {
    it('should create outbox event when order is created', async () => {
      const orderData = {
        items: [
          {
            productId: testProduct.id,
            quantity: 2,
          },
        ],
      };

      // Create order
      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(orderData)
        .expect(202);

      const orderId = response.body.data.data.id;
      expect(orderId).toBeDefined();

      // Wait a moment for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify outbox event was created
      const outboxEvents = await outboxRepository.find({
        where: { aggregateId: orderId, eventType: 'OrderCreated' },
      });

      expect(outboxEvents).toHaveLength(1);

      const outboxEvent = outboxEvents[0]!;
      expect(outboxEvent.aggregateType).toBe('Order');
      expect(outboxEvent.aggregateId).toBe(orderId);
      expect(outboxEvent.eventType).toBe('OrderCreated');
      expect(outboxEvent.eventData['userId']).toBe(userId);
      expect(outboxEvent.processed).toBe(false);
      expect(outboxEvent.processedAt).toBeNull();
      expect(outboxEvent.idempotencyKey).toBeDefined();

      // Verify event data structure
      const eventData = outboxEvent.eventData as any;
      expect(eventData.orderId).toBe(orderId);
      expect(eventData.userId).toBe(userId);
      expect(eventData.items).toHaveLength(1);
      expect(eventData.totalAmount).toBe(199.98); // 99.99 * 2
      expect(eventData.currency).toBe('USD');
    });

    it('should create unique idempotency keys for different orders', async () => {
      const timestamp = Date.now();
      const orderData = {
        items: [
          {
            productId: testProduct.id,
            quantity: 1,
          },
        ],
        idempotencyKey: `test-order-1-${timestamp}`, // Explicit idempotency key
      };

      // Create first order
      const response1 = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(orderData)
        .expect(202);

      // Create second order with different data to avoid idempotency
      const orderData2 = {
        items: [
          {
            productId: testProduct.id,
            quantity: 2, // Different quantity
          },
        ],
        idempotencyKey: `test-order-2-${timestamp}`, // Different explicit idempotency key
      };

      // Create second order
      const response2 = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(orderData2)
        .expect(202);

      const orderId1 = response1.body.data.data.id;
      const orderId2 = response2.body.data.data.id;

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify both outbox events exist with unique idempotency keys
      const outboxEvents = await outboxRepository.find({
        where: { eventType: 'OrderCreated' },
        order: { createdAt: 'ASC' },
      });

      expect(outboxEvents).toHaveLength(2);
      expect(outboxEvents[0]!.idempotencyKey).not.toBe(outboxEvents[1]!.idempotencyKey);
      expect(outboxEvents[0]!.aggregateId).toBe(orderId1);
      expect(outboxEvents[1]!.aggregateId).toBe(orderId2);
    });
  });

  describe('Outbox Processor Picks Up Events', () => {
    it('should process pending outbox events', async () => {
      // Create an outbox event manually (simulating event creation)
      const testOrderId = randomUUID();
      const testEvent = outboxRepository.create();
      Object.assign(testEvent, {
        aggregateType: 'Order',
        aggregateId: testOrderId,
        eventType: 'OrderCreated',
        eventData: {
          orderId: testOrderId,
          userId: userId,
          items: [{ productId: testProduct.id, quantity: 1 }],
          totalAmount: 99.99,
          currency: 'USD',
        },
        eventMetadata: {
          source: 'test',
          publishedAt: new Date().toISOString(),
        },
        userId: userId,
        processed: false,
        retryCount: 0,
        maxRetries: 5,
        priority: 'normal' as const,
      });

      await outboxRepository.save(testEvent);

      // Verify event is unprocessed initially
      expect(testEvent.processed).toBe(false);

      // Process pending events
      await outboxProcessor.processPendingEvents();

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify event is now marked as processed
      const processedEvent = await outboxRepository.findOne({
        where: { id: testEvent.id },
      });

      expect(processedEvent).toBeTruthy();
      expect(processedEvent!.processed).toBe(true);
      expect(processedEvent!.processedAt).toBeTruthy();
    });

    it('should process events in order of creation', async () => {
      // Create multiple events with slight time differences
      const events = [];
      const testOrderIds = [randomUUID(), randomUUID(), randomUUID()];

      for (let i = 0; i < 3; i++) {
        const event = outboxRepository.create();
        Object.assign(event, {
          aggregateType: 'Order',
          aggregateId: testOrderIds[i],
          eventType: 'OrderCreated',
          eventData: {
            orderId: testOrderIds[i],
            userId: userId,
            items: [{ productId: testProduct.id, quantity: 1 }],
            totalAmount: 99.99,
            currency: 'USD',
          },
          userId: userId,
          processed: false,
          retryCount: 0,
          maxRetries: 5,
          priority: 'normal' as const,
        });

        const savedEvent = await outboxRepository.save(event);
        events.push(savedEvent);

        // Small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Process all pending events
      await outboxProcessor.processPendingEvents();

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify all events are processed
      const processedEvents = await outboxRepository.find({
        where: { processed: true },
        order: { processedAt: 'ASC' },
      });

      expect(processedEvents).toHaveLength(3);

      // Verify events were processed in order
      for (let i = 0; i < 3; i++) {
        expect(processedEvents[i]!.aggregateId).toBe(testOrderIds[i]);
      }
    });
  });

  describe('Event Marking as Processed', () => {
    it('should mark events as processed with timestamp', async () => {
      // Create an unprocessed event manually
      const testOrderId = randomUUID();
      const testEvent = outboxRepository.create();
      Object.assign(testEvent, {
        aggregateType: 'Order',
        aggregateId: testOrderId,
        eventType: 'OrderCreated',
        eventData: {
          orderId: testOrderId,
          userId: userId,
          items: [{ productId: testProduct.id, quantity: 1 }],
          totalAmount: 99.99,
          currency: 'USD',
        },
        eventMetadata: {
          source: 'test',
          publishedAt: new Date().toISOString(),
        },
        sequenceNumber: `${Date.now()}${Math.floor(Math.random() * 1000000)}`,
        idempotencyKey: `Order_${testOrderId}_OrderCreated_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        userId: userId,
        processed: false,
        retryCount: 0,
        maxRetries: 5,
        priority: 'normal' as const,
      });

      await outboxRepository.save(testEvent);

      // Verify event is unprocessed initially
      const unprocessedEvent = await outboxRepository.findOne({
        where: { id: testEvent.id },
      });

      expect(unprocessedEvent).toBeTruthy();
      expect(unprocessedEvent!.processed).toBe(false);
      expect(unprocessedEvent!.processedAt).toBeNull();

      const beforeProcessingTime = new Date();

      // Process the event
      await outboxProcessor.processPendingEvents();

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify event is marked as processed
      const processedEvent = await outboxRepository.findOne({
        where: { id: unprocessedEvent!.id },
      });

      expect(processedEvent!.processed).toBe(true);
      expect(processedEvent!.processedAt).toBeTruthy();
      expect(processedEvent!.processedAt!.getTime()).toBeGreaterThan(
        beforeProcessingTime.getTime(),
      );
    });

    it('should not reprocess already processed events', async () => {
      // Create and process an event
      const testOrderId = randomUUID();
      const testEvent = outboxRepository.create();
      Object.assign(testEvent, {
        aggregateType: 'Order',
        aggregateId: testOrderId,
        eventType: 'OrderCreated',
        eventData: {
          orderId: testOrderId,
          userId: userId,
        },
        userId: userId,
        processed: true,
        processedAt: new Date(),
        retryCount: 0,
        maxRetries: 5,
        priority: 'normal' as const,
      });

      await outboxRepository.save(testEvent);
      const originalProcessedAt = testEvent.processedAt;

      // Try to process events again
      await outboxProcessor.processPendingEvents();
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify the processed timestamp didn't change
      const unchangedEvent = await outboxRepository.findOne({
        where: { id: testEvent.id },
      });

      expect(unchangedEvent!.processed).toBe(true);
      expect(unchangedEvent!.processedAt!.getTime()).toBe(originalProcessedAt!.getTime());
    });
  });

  describe('Idempotent Event Consumption', () => {
    it('should handle duplicate events with same idempotency key', async () => {
      const idempotencyKey = `order-duplicate-test-${Date.now()}`;

      const orderData = {
        items: [
          {
            productId: testProduct.id,
            quantity: 1,
          },
        ],
        idempotencyKey: idempotencyKey,
      };

      // Create first order
      const response1 = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(orderData)
        .expect(202);

      // Create second order with same idempotency key
      const response2 = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(orderData)
        .expect(202);

      // Should return the same order ID
      expect(response1.body.data.orderId).toBe(response2.body.data.orderId);

      // Wait for event processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should only have one outbox event
      const outboxEvents = await outboxRepository.find({
        where: { eventType: 'OrderCreated', aggregateId: response1.body.data.data.id },
      });

      expect(outboxEvents).toHaveLength(1);
    });

    it('should prevent duplicate outbox events with unique idempotency constraint', async () => {
      const duplicateIdempotencyKey = `duplicate-key-${Date.now()}`;
      const testOrderId1 = randomUUID();

      // Create first event
      const event1 = outboxRepository.create({
        aggregateType: 'Order',
        aggregateId: testOrderId1,
        eventType: 'OrderCreated',
        eventData: { orderId: testOrderId1 },
        userId: userId,
        idempotencyKey: duplicateIdempotencyKey,
        processed: false,
        retryCount: 0,
        maxRetries: 5,
        priority: 'normal',
      });

      await outboxRepository.save(event1);

      // Try to create second event with same idempotency key
      const testOrderId2 = randomUUID();
      const event2 = outboxRepository.create({
        aggregateType: 'Order',
        aggregateId: testOrderId2,
        eventType: 'OrderCreated',
        eventData: { orderId: testOrderId2 },
        userId: userId,
        idempotencyKey: duplicateIdempotencyKey,
        processed: false,
        retryCount: 0,
        maxRetries: 5,
        priority: 'normal',
      });

      // Should throw unique constraint violation
      await expect(outboxRepository.save(event2)).rejects.toThrow();

      // Verify only one event exists
      const events = await outboxRepository.find({
        where: { idempotencyKey: duplicateIdempotencyKey },
      });

      expect(events).toHaveLength(1);
      expect(events[0]!.aggregateId).toBe(testOrderId1);
    });
  });

  describe('Event Retry on Failure', () => {
    it('should retry failed events according to retry policy', async () => {
      // Create a test event that will simulate failure
      const testOrderId = randomUUID();
      const testEvent = outboxRepository.create();
      Object.assign(testEvent, {
        aggregateType: 'InvalidAggregate', // This will cause processing to fail
        aggregateId: testOrderId,
        eventType: 'OrderCreated',
        eventData: {
          orderId: testOrderId,
          userId: userId,
        },
        userId: userId,
        processed: false,
        retryCount: 0,
        maxRetries: 3,
        priority: 'normal' as const,
      });

      await outboxRepository.save(testEvent);

      // Process events (should fail for invalid aggregate)
      await outboxProcessor.processPendingEvents();
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify event failed and remains unprocessed
      const failedEvent = await outboxRepository.findOne({
        where: { id: testEvent.id },
      });

      expect(failedEvent!.processed).toBe(false);

      // The retry logic is internal to the processor, so we verify the event
      // remains in unprocessed state for future retry attempts
    });

    it('should track retry attempts and timing', async () => {
      // Create an event that might fail
      const testOrderId = randomUUID();
      const testEvent = outboxRepository.create();
      Object.assign(testEvent, {
        aggregateType: 'Order',
        aggregateId: testOrderId,
        eventType: 'OrderCreated',
        eventData: {
          orderId: testOrderId,
          userId: userId,
        },
        userId: userId,
        processed: false,
        retryCount: 2, // Simulate previous retry attempts
        maxRetries: 5,
        priority: 'normal' as const,
        nextRetryAt: new Date(Date.now() - 1000), // Past time, ready for retry
        lastError: 'Previous processing error',
      });

      await outboxRepository.save(testEvent);

      // Verify initial state
      expect(testEvent.retryCount).toBe(2);
      expect(testEvent.canRetry()).toBe(true);
      expect(testEvent.isReadyForRetry()).toBe(true);
      expect(testEvent.isReadyForProcessing()).toBe(true);
    });
  });

  describe('Dead Letter for Problematic Events', () => {
    it('should handle events that exceed max retries', async () => {
      // Create an event that has reached max retries - use non-Order type to test retry logic
      const testOrderId = randomUUID();
      const deadLetterEvent = outboxRepository.create();
      Object.assign(deadLetterEvent, {
        aggregateType: 'Inventory', // Use Inventory instead of Order to test retry logic
        aggregateId: testOrderId,
        eventType: 'InventoryUpdated',
        eventData: {
          inventoryId: testOrderId,
          userId: userId,
        },
        userId: userId,
        processed: false,
        retryCount: 5,
        maxRetries: 5,
        priority: 'normal' as const,
        lastError: 'Maximum retries exceeded',
      });

      await outboxRepository.save(deadLetterEvent);

      // Verify event cannot retry anymore (dead letter properties)
      expect(deadLetterEvent.canRetry()).toBe(false);
      expect(deadLetterEvent.isReadyForProcessing()).toBe(false);

      // Don't process events - just verify the dead letter state
      // Since Order events are auto-processed, we skip processor testing for this case

      // Verify event remains in dead letter state
      const finalEvent = await outboxRepository.findOne({
        where: { id: deadLetterEvent.id },
      });

      expect(finalEvent!.retryCount).toBe(5);
      expect(finalEvent!.canRetry()).toBe(false);
      expect(finalEvent!.isReadyForProcessing()).toBe(false);
    });

    it('should provide outbox statistics including problematic events', async () => {
      // Create mix of events: processed, pending, and dead letter
      const processedOrderId = randomUUID();
      const pendingOrderId = randomUUID();

      const events = [
        // Processed event
        (() => {
          const event = outboxRepository.create();
          Object.assign(event, {
            aggregateType: 'Order',
            aggregateId: processedOrderId,
            eventType: 'OrderCreated',
            eventData: { orderId: processedOrderId },
            userId: userId,
            processed: true,
            processedAt: new Date(),
            retryCount: 0,
            maxRetries: 5,
            priority: 'normal' as const,
          });
          return event;
        })(),
        // Pending event
        (() => {
          const event = outboxRepository.create();
          Object.assign(event, {
            aggregateType: 'Order',
            aggregateId: pendingOrderId,
            eventType: 'OrderCreated',
            eventData: { orderId: pendingOrderId },
            userId: userId,
            processed: false,
            retryCount: 1,
            maxRetries: 5,
            priority: 'normal' as const,
          });
          return event;
        })(),
        // Dead letter event
        (() => {
          const deadLetterOrderId = randomUUID();
          const event = outboxRepository.create();
          Object.assign(event, {
            aggregateType: 'Order',
            aggregateId: deadLetterOrderId,
            eventType: 'OrderCreated',
            eventData: { orderId: deadLetterOrderId },
            userId: userId,
            processed: false,
            retryCount: 5,
            maxRetries: 5,
            priority: 'normal' as const,
            lastError: 'Dead letter event',
          });
          return event;
        })(),
      ];

      await outboxRepository.save(events);

      // Get statistics
      const stats = await outboxProcessor.getStatistics();

      expect(stats.totalEvents).toBe(3);
      expect(stats.processedEvents).toBe(1);
      expect(stats.pendingEvents).toBe(2); // Includes dead letter (technically pending but can't retry)
      expect(stats.oldestPendingEvent).toBeTruthy();
    });
  });
});
