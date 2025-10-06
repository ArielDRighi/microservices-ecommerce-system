/* eslint-disable @typescript-eslint/no-explicit-any */
// Test file - using 'any' for mocking complex entity types is acceptable
import { OutboxProcessor } from './outbox.processor';
import {
  mockOutboxRepository,
  mockQueue,
  createOutboxProcessorTestingModule,
  createMockOutboxEvent,
} from './helpers/outbox-processor.test-helpers';

describe('OutboxProcessor - Event Processing', () => {
  let processor: OutboxProcessor;
  let mockRepo: ReturnType<typeof mockOutboxRepository>;
  let mockQ: ReturnType<typeof mockQueue>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRepo = mockOutboxRepository();
    mockQ = mockQueue();

    const { processor: proc } = await createOutboxProcessorTestingModule(mockRepo, mockQ);
    processor = proc;
  });

  afterEach(async () => {
    await processor.stop();
  });

  describe('Event Processing by Type', () => {
    it('should skip Order events (already enqueued directly)', async () => {
      const orderEvent = createMockOutboxEvent({
        id: 'event-order-1',
        aggregateType: 'Order',
        aggregateId: 'order-123',
        eventType: 'OrderCreated',
        eventData: { orderId: 'order-123', userId: 'user-1' },
      });

      mockRepo.find.mockResolvedValue([orderEvent] as any);
      mockRepo.save.mockResolvedValue(orderEvent as any);

      await processor.processPendingEvents();

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'event-order-1',
          processed: true,
          processedAt: expect.any(Date),
        }),
      );

      expect(mockQ.add).not.toHaveBeenCalled();
    });

    it('should process Inventory events and enqueue to inventory queue', async () => {
      const inventoryEvent = createMockOutboxEvent({
        id: 'event-inv-1',
        aggregateType: 'Inventory',
        aggregateId: 'product-456',
        eventType: 'InventoryReserved',
        eventData: {
          action: 'reserve',
          productId: 'product-456',
          quantity: 5,
          orderId: 'order-123',
          reservationId: 'res-789',
        },
        createdAt: new Date('2024-01-15'),
        correlationId: 'corr-123',
        userId: 'user-1',
      });

      mockRepo.find.mockResolvedValue([inventoryEvent] as any);
      mockRepo.save.mockResolvedValue({ ...inventoryEvent, processed: true } as any);

      await processor.processPendingEvents();

      expect(mockQ.add).toHaveBeenCalledWith(
        'reserve-inventory',
        expect.objectContaining({
          action: 'reserve',
          productId: 'product-456',
          quantity: 5,
          orderId: 'order-123',
          reservationId: 'res-789',
          jobId: 'event-inv-1',
          correlationId: 'corr-123',
          userId: 'user-1',
        }),
        expect.objectContaining({
          attempts: 5,
          backoff: { type: 'exponential', delay: 1000 },
        }),
      );

      expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ processed: true }));
    });

    it('should process Payment events and enqueue to payment queue', async () => {
      const paymentEvent = createMockOutboxEvent({
        id: 'event-pay-1',
        aggregateType: 'Payment',
        aggregateId: 'payment-789',
        eventType: 'PaymentProcessed',
        eventData: {
          orderId: 'order-123',
          paymentId: 'payment-789',
          amount: 99.99,
          currency: 'EUR',
          paymentMethod: 'credit_card',
          userId: 'user-1',
        },
        createdAt: new Date('2024-01-15'),
        correlationId: 'corr-456',
        userId: 'user-1',
      });

      mockRepo.find.mockResolvedValue([paymentEvent] as any);
      mockRepo.save.mockResolvedValue({ ...paymentEvent, processed: true } as any);

      await processor.processPendingEvents();

      expect(mockQ.add).toHaveBeenCalledWith(
        'process-payment',
        expect.objectContaining({
          orderId: 'order-123',
          paymentId: 'payment-789',
          amount: 99.99,
          currency: 'EUR',
          paymentMethod: 'credit_card',
          customerId: 'user-1',
          jobId: 'event-pay-1',
          correlationId: 'corr-456',
          userId: 'user-1',
        }),
        expect.any(Object),
      );

      expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ processed: true }));
    });

    it('should process multiple events in batch', async () => {
      const events = [
        createMockOutboxEvent({
          id: 'event-1',
          aggregateType: 'Inventory',
          eventType: 'InventoryReserved',
          eventData: { productId: 'prod-1', quantity: 5 },
          createdAt: new Date('2024-01-15T10:00:00Z'),
          sequenceNumber: BigInt(1),
        }),
        createMockOutboxEvent({
          id: 'event-2',
          aggregateType: 'Payment',
          eventType: 'PaymentProcessed',
          eventData: { paymentId: 'pay-1', amount: 100 },
          createdAt: new Date('2024-01-15T10:00:01Z'),
          sequenceNumber: BigInt(2),
        }),
        createMockOutboxEvent({
          id: 'event-3',
          aggregateType: 'Inventory',
          eventType: 'InventoryReleased',
          eventData: { productId: 'prod-2', quantity: 3 },
          createdAt: new Date('2024-01-15T10:00:02Z'),
          sequenceNumber: BigInt(3),
        }),
      ];

      mockRepo.find.mockResolvedValue(events as any);
      mockRepo.save.mockImplementation((event) =>
        Promise.resolve({ ...event, processed: true } as any),
      );

      await processor.processPendingEvents();

      expect(mockQ.add).toHaveBeenCalledTimes(3);
      expect(mockRepo.save).toHaveBeenCalledTimes(3);
    });
  });

  describe('Event Mapping', () => {
    it('should map OrderConfirmed event to confirm-order job', async () => {
      const event = createMockOutboxEvent({
        id: 'event-confirm',
        aggregateType: 'Order',
        eventType: 'OrderConfirmed',
        eventData: { orderId: 'order-123' },
      });

      mockRepo.find.mockResolvedValue([event] as any);
      mockRepo.save.mockResolvedValue({ ...event, processed: true } as any);

      await processor.processPendingEvents();

      expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ processed: true }));
    });

    it('should map InventoryReleased event to release-inventory job', async () => {
      const event = createMockOutboxEvent({
        id: 'event-release',
        aggregateType: 'Inventory',
        eventType: 'InventoryReleased',
        eventData: { productId: 'prod-1', quantity: 5 },
      });

      mockRepo.find.mockResolvedValue([event] as any);
      mockRepo.save.mockResolvedValue({ ...event, processed: true } as any);

      await processor.processPendingEvents();

      expect(mockQ.add).toHaveBeenCalledWith(
        'release-inventory',
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should map PaymentRefunded event to refund-payment job', async () => {
      const event = createMockOutboxEvent({
        id: 'event-refund',
        aggregateType: 'Payment',
        eventType: 'PaymentRefunded',
        eventData: { paymentId: 'pay-1', amount: 50 },
      });

      mockRepo.find.mockResolvedValue([event] as any);
      mockRepo.save.mockResolvedValue({ ...event, processed: true } as any);

      await processor.processPendingEvents();

      expect(mockQ.add).toHaveBeenCalledWith(
        'refund-payment',
        expect.any(Object),
        expect.any(Object),
      );
    });
  });

  describe('Job Data Preparation', () => {
    it('should include all required fields for Inventory job data', async () => {
      const event = createMockOutboxEvent({
        id: 'event-inv-complete',
        aggregateType: 'Inventory',
        eventType: 'InventoryReserved',
        eventData: {
          action: 'reserve',
          productId: 'prod-123',
          quantity: 10,
          orderId: 'order-456',
          reservationId: 'res-789',
          reason: 'Order placement',
        },
        createdAt: new Date('2024-01-15T14:30:00Z'),
        correlationId: 'corr-abc',
        userId: 'user-xyz',
      });

      mockRepo.find.mockResolvedValue([event] as any);
      mockRepo.save.mockResolvedValue({ ...event, processed: true } as any);

      await processor.processPendingEvents();

      expect(mockQ.add).toHaveBeenCalledWith(
        'reserve-inventory',
        expect.objectContaining({
          action: 'reserve',
          productId: 'prod-123',
          quantity: 10,
          orderId: 'order-456',
          reservationId: 'res-789',
          reason: 'Order placement',
          jobId: 'event-inv-complete',
          createdAt: new Date('2024-01-15T14:30:00Z'),
          correlationId: 'corr-abc',
          userId: 'user-xyz',
        }),
        expect.any(Object),
      );
    });

    it('should include all required fields for Payment job data', async () => {
      const event = createMockOutboxEvent({
        id: 'event-pay-complete',
        aggregateType: 'Payment',
        eventType: 'PaymentProcessed',
        eventData: {
          orderId: 'order-789',
          paymentId: 'pay-abc',
          amount: 149.99,
          currency: 'GBP',
          paymentMethod: 'paypal',
          userId: 'user-123',
        },
        createdAt: new Date('2024-01-15T15:45:00Z'),
        correlationId: 'corr-def',
        userId: 'user-123',
      });

      mockRepo.find.mockResolvedValue([event] as any);
      mockRepo.save.mockResolvedValue({ ...event, processed: true } as any);

      await processor.processPendingEvents();

      expect(mockQ.add).toHaveBeenCalledWith(
        'process-payment',
        expect.objectContaining({
          orderId: 'order-789',
          paymentId: 'pay-abc',
          amount: 149.99,
          currency: 'GBP',
          paymentMethod: 'paypal',
          customerId: 'user-123',
          jobId: 'event-pay-complete',
          createdAt: new Date('2024-01-15T15:45:00Z'),
          correlationId: 'corr-def',
          userId: 'user-123',
        }),
        expect.any(Object),
      );
    });

    it('should use default currency USD when not provided in Payment event', async () => {
      const event = createMockOutboxEvent({
        id: 'event-pay-default',
        aggregateType: 'Payment',
        eventType: 'PaymentProcessed',
        eventData: {
          paymentId: 'pay-1',
          amount: 50,
        },
      });

      mockRepo.find.mockResolvedValue([event] as any);
      mockRepo.save.mockResolvedValue({ ...event, processed: true } as any);

      await processor.processPendingEvents();

      expect(mockQ.add).toHaveBeenCalledWith(
        'process-payment',
        expect.objectContaining({
          currency: 'USD',
        }),
        expect.any(Object),
      );
    });
  });

  describe('Event Type to Job Type Mapping', () => {
    it('should map OrderCancelled to cancel-order job', async () => {
      const event = createMockOutboxEvent({
        id: 'event-cancel',
        aggregateType: 'Order',
        eventType: 'OrderCancelled',
        eventData: { orderId: 'order-1' },
      });

      mockRepo.find.mockResolvedValue([event] as any);
      mockRepo.save.mockResolvedValue({ ...event, processed: true } as any);

      await processor.processPendingEvents();

      expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ processed: true }));
    });

    it('should lowercase unknown event types for job mapping', async () => {
      const event = createMockOutboxEvent({
        id: 'event-unknown-type',
        aggregateType: 'Inventory',
        eventType: 'UnknownInventoryEvent',
        eventData: { productId: 'prod-1' },
      });

      mockRepo.find.mockResolvedValue([event] as any);
      mockRepo.save.mockResolvedValue({ ...event, processed: true } as any);

      await processor.processPendingEvents();

      expect(mockQ.add).toHaveBeenCalledWith(
        'unknowninventoryevent',
        expect.any(Object),
        expect.any(Object),
      );
    });
  });
});
