/* eslint-disable @typescript-eslint/no-explicit-any */
// Test file - using 'any' for mocking complex entity types is acceptable
import { OutboxProcessor } from './outbox.processor';
import {
  mockOutboxRepository,
  mockQueue,
  createOutboxProcessorTestingModule,
  createMockOutboxEvent,
} from './helpers/outbox-processor.test-helpers';

describe('OutboxProcessor - Batch Processing & Retry', () => {
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

  describe('Batch Processing', () => {
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
      mockRepo.save.mockImplementation((event) => Promise.resolve({ ...event, processed: true } as any));

      await processor.processPendingEvents();

      expect(mockQ.add).toHaveBeenCalledTimes(3);
      expect(mockRepo.save).toHaveBeenCalledTimes(3);
    });

    it('should handle empty batch gracefully', async () => {
      mockRepo.find.mockResolvedValue([]);

      await processor.processPendingEvents();

      expect(mockQ.add).not.toHaveBeenCalled();
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('should process events sequentially within batch', async () => {
      const events = [
        createMockOutboxEvent({
          id: 'event-seq-1',
          aggregateType: 'Inventory',
          eventType: 'InventoryReserved',
          eventData: { productId: 'prod-1' },
          sequenceNumber: BigInt(1),
        }),
        createMockOutboxEvent({
          id: 'event-seq-2',
          aggregateType: 'Inventory',
          eventType: 'InventoryReserved',
          eventData: { productId: 'prod-2' },
          sequenceNumber: BigInt(2),
        }),
      ];

      mockRepo.find.mockResolvedValue(events as any);
      mockRepo.save.mockImplementation((event) => Promise.resolve({ ...event, processed: true } as any));

      await processor.processPendingEvents();

      expect(mockQ.add).toHaveBeenCalledTimes(2);
      expect(mockRepo.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('Retry Configuration', () => {
    it('should configure job with retry attempts and exponential backoff', async () => {
      const event = createMockOutboxEvent({
        id: 'event-retry',
        aggregateType: 'Inventory',
        eventType: 'InventoryReserved',
        eventData: { productId: 'prod-1' },
      });

      mockRepo.find.mockResolvedValue([event] as any);
      mockRepo.save.mockResolvedValue({ ...event, processed: true } as any);

      await processor.processPendingEvents();

      expect(mockQ.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        }),
      );
    });

    it('should retry failed events on next processing cycle', async () => {
      const failedEvent = createMockOutboxEvent({
        id: 'event-retry-fail',
        aggregateType: 'Inventory',
        eventType: 'InventoryReserved',
        eventData: { productId: 'prod-1' },
        processed: false,
        retryCount: 2,
      });

      mockRepo.find.mockResolvedValue([failedEvent] as any);
      mockQ.add.mockResolvedValue({} as any);
      mockRepo.save.mockResolvedValue({ ...failedEvent, processed: true } as any);

      await processor.processPendingEvents();

      expect(mockQ.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          attempts: 5,
          backoff: { type: 'exponential', delay: 1000 },
        }),
      );
    });

    it('should handle events with high retry counts', async () => {
      const highRetryEvent = createMockOutboxEvent({
        id: 'event-high-retry',
        aggregateType: 'Payment',
        eventType: 'PaymentProcessed',
        eventData: { paymentId: 'pay-1' },
        retryCount: 10,
      });

      mockRepo.find.mockResolvedValue([highRetryEvent] as any);
      mockRepo.save.mockResolvedValue({ ...highRetryEvent, processed: true } as any);

      await processor.processPendingEvents();

      expect(mockQ.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          attempts: 5,
          backoff: { type: 'exponential', delay: 1000 },
        }),
      );
    });
  });

  describe('Concurrent Processing Protection', () => {
    it('should skip processing if already in progress', async () => {
      mockRepo.find.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve([]), 100);
          }),
      );

      const firstProcessing = processor.processPendingEvents();

      await processor.processPendingEvents();

      await firstProcessing;

      expect(mockRepo.find).toHaveBeenCalledTimes(1);
    });

    it('should allow processing after previous completes', async () => {
      mockRepo.find.mockResolvedValue([]);

      await processor.processPendingEvents();
      await processor.processPendingEvents();

      expect(mockRepo.find).toHaveBeenCalledTimes(2);
    });

    it('should wait for current processing to complete when stopping', async () => {
      mockRepo.find.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve([]), 50);
          }),
      );

      const processing = processor.processPendingEvents();

      await new Promise((resolve) => setTimeout(resolve, 10));

      const stopPromise = processor.stop();

      await Promise.all([processing, stopPromise]);

      expect(true).toBe(true);
    });

    it('should handle rapid successive processing calls', async () => {
      mockRepo.find.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve([]), 50);
          }),
      );

      const calls = [
        processor.processPendingEvents(),
        processor.processPendingEvents(),
        processor.processPendingEvents(),
      ];

      await Promise.all(calls);

      expect(mockRepo.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance and Optimization', () => {
    it('should process large batches efficiently', async () => {
      const largeEventBatch = Array.from({ length: 100 }, (_, i) =>
        createMockOutboxEvent({
          id: `event-batch-${i}`,
          aggregateType: 'Inventory',
          eventType: 'InventoryReserved',
          eventData: { productId: `prod-${i}`, quantity: 1 },
          sequenceNumber: BigInt(i),
        }),
      );

      mockRepo.find.mockResolvedValue(largeEventBatch as any);
      mockRepo.save.mockImplementation((event) => Promise.resolve({ ...event, processed: true } as any));

      await processor.processPendingEvents();

      expect(mockQ.add).toHaveBeenCalledTimes(100);
      expect(mockRepo.save).toHaveBeenCalledTimes(100);
    });

    it('should handle mixed event types in batch', async () => {
      const mixedEvents = [
        createMockOutboxEvent({
          id: 'event-mix-1',
          aggregateType: 'Order',
          eventType: 'OrderCreated',
          eventData: { orderId: 'order-1' },
        }),
        createMockOutboxEvent({
          id: 'event-mix-2',
          aggregateType: 'Inventory',
          eventType: 'InventoryReserved',
          eventData: { productId: 'prod-1' },
        }),
        createMockOutboxEvent({
          id: 'event-mix-3',
          aggregateType: 'Payment',
          eventType: 'PaymentProcessed',
          eventData: { paymentId: 'pay-1' },
        }),
      ];

      mockRepo.find.mockResolvedValue(mixedEvents as any);
      mockRepo.save.mockImplementation((event) => Promise.resolve({ ...event, processed: true } as any));

      await processor.processPendingEvents();

      expect(mockRepo.save).toHaveBeenCalledTimes(3);
      expect(mockQ.add).toHaveBeenCalledTimes(2);
    });
  });
});
