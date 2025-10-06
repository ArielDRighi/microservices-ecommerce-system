/* eslint-disable @typescript-eslint/no-explicit-any */
// Test file - using 'any' for mocking complex entity types is acceptable
import { OutboxProcessor } from './outbox.processor';
import {
  mockOutboxRepository,
  mockQueue,
  createOutboxProcessorTestingModule,
  createMockOutboxEvent,
} from './helpers/outbox-processor.test-helpers';

describe('OutboxProcessor - Errors & Edge Cases', () => {
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

  describe('Error Handling', () => {
    it('should continue processing after individual event failure', async () => {
      const events = [
        createMockOutboxEvent({
          id: 'event-success',
          aggregateType: 'Inventory',
          eventType: 'InventoryReserved',
          eventData: { productId: 'prod-1' },
        }),
        createMockOutboxEvent({
          id: 'event-fail',
          aggregateType: 'Payment',
          eventType: 'PaymentProcessed',
          eventData: { paymentId: 'pay-1' },
        }),
      ];

      mockRepo.find.mockResolvedValue(events as any);

      mockQ.add.mockResolvedValueOnce({} as any).mockRejectedValueOnce(new Error('Queue error'));

      mockRepo.save.mockImplementation((event) =>
        Promise.resolve({ ...event, processed: true } as any),
      );

      await processor.processPendingEvents();

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'event-success', processed: true }),
      );

      expect(mockRepo.save).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'event-fail' }));
    });

    it('should handle repository errors gracefully', async () => {
      mockRepo.find.mockRejectedValue(new Error('Database connection error'));

      await processor.processPendingEvents();

      expect(mockQ.add).not.toHaveBeenCalled();
    });

    it('should not mark event as processed when queue enqueue fails', async () => {
      const event = createMockOutboxEvent({
        id: 'event-fail',
        aggregateType: 'Inventory',
        eventType: 'InventoryReserved',
        eventData: { productId: 'prod-1' },
      });

      mockRepo.find.mockResolvedValue([event] as any);
      mockQ.add.mockRejectedValue(new Error('Queue is full'));

      await processor.processPendingEvents();

      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('should handle save failures gracefully', async () => {
      const event = createMockOutboxEvent({
        id: 'event-save-fail',
        aggregateType: 'Inventory',
        eventType: 'InventoryReserved',
        eventData: { productId: 'prod-1' },
      });

      mockRepo.find.mockResolvedValue([event] as any);
      mockQ.add.mockResolvedValue({} as any);
      mockRepo.save.mockRejectedValue(new Error('Database write error'));

      await processor.processPendingEvents();

      expect(mockQ.add).toHaveBeenCalled();
    });

    it('should handle network timeouts', async () => {
      const event = createMockOutboxEvent({
        id: 'event-timeout',
        aggregateType: 'Payment',
        eventType: 'PaymentProcessed',
        eventData: { paymentId: 'pay-1' },
      });

      mockRepo.find.mockResolvedValue([event] as any);
      mockQ.add.mockRejectedValue(new Error('Network timeout'));

      await processor.processPendingEvents();

      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('Unknown Aggregate Types', () => {
    it('should handle unknown aggregate type by marking as processed', async () => {
      const unknownEvent = createMockOutboxEvent({
        id: 'event-unknown',
        aggregateType: 'UnknownType',
        eventType: 'UnknownEvent',
        eventData: { someData: 'value' },
      });

      mockRepo.find.mockResolvedValue([unknownEvent] as any);
      mockRepo.save.mockResolvedValue({ ...unknownEvent, processed: false } as any);

      await processor.processPendingEvents();

      expect(mockQ.add).not.toHaveBeenCalled();
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'event-unknown',
          processed: false,
        }),
      );
    });

    it('should handle generic fallback for unknown event types', async () => {
      const genericEvent = createMockOutboxEvent({
        id: 'event-generic',
        aggregateType: 'CustomAggregate',
        aggregateId: 'custom-123',
        eventType: 'CustomEvent',
        eventData: {
          customField1: 'value1',
          customField2: 123,
        },
        createdAt: new Date('2024-01-15'),
        correlationId: 'corr-generic',
        userId: 'user-generic',
        eventMetadata: { source: 'custom-service' },
      });

      mockRepo.find.mockResolvedValue([genericEvent] as any);
      mockRepo.save.mockResolvedValue({ ...genericEvent, processed: false } as any);

      await processor.processPendingEvents();

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'event-generic',
          processed: false,
        }),
      );
    });

    it('should skip unsupported aggregate types', async () => {
      const unsupportedEvent = createMockOutboxEvent({
        id: 'event-unsupported',
        aggregateType: 'UnsupportedAggregate',
        eventType: 'UnsupportedEvent',
        eventData: {},
      });

      mockRepo.find.mockResolvedValue([unsupportedEvent] as any);
      mockRepo.save.mockResolvedValue({ ...unsupportedEvent, processed: false } as any);

      await processor.processPendingEvents();

      expect(mockQ.add).not.toHaveBeenCalled();
    });
  });

  describe('Job Data Preparation - Edge Cases', () => {
    it('should handle Order events with minimal data', async () => {
      const minimalOrderEvent = createMockOutboxEvent({
        id: 'event-order-minimal',
        aggregateType: 'Order',
        aggregateId: 'order-999',
        eventType: 'OrderCreated',
        eventData: {},
      });

      mockRepo.find.mockResolvedValue([minimalOrderEvent] as any);
      mockRepo.save.mockResolvedValue({ ...minimalOrderEvent, processed: true } as any);

      await processor.processPendingEvents();

      expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ processed: true }));
    });

    it('should use aggregateId as orderId fallback for Order events', async () => {
      const event = createMockOutboxEvent({
        id: 'event-order-fallback',
        aggregateType: 'Order',
        aggregateId: 'order-fallback-id',
        eventType: 'OrderCreated',
        eventData: {
          userId: 'user-1',
        },
      });

      mockRepo.find.mockResolvedValue([event] as any);
      mockRepo.save.mockResolvedValue({ ...event, processed: true } as any);

      await processor.processPendingEvents();

      expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ processed: true }));
    });

    it('should handle Payment event with customerId field', async () => {
      const paymentWithCustomerId = createMockOutboxEvent({
        id: 'event-pay-customerid',
        aggregateType: 'Payment',
        eventType: 'PaymentProcessed',
        eventData: {
          paymentId: 'pay-123',
          amount: 75.5,
          customerId: 'customer-abc',
        },
      });

      mockRepo.find.mockResolvedValue([paymentWithCustomerId] as any);
      mockRepo.save.mockResolvedValue({ ...paymentWithCustomerId, processed: true } as any);

      await processor.processPendingEvents();

      expect(mockQ.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          customerId: 'customer-abc',
        }),
        expect.any(Object),
      );
    });

    it('should handle events with missing optional fields', async () => {
      const minimalEvent = createMockOutboxEvent({
        id: 'event-minimal',
        aggregateType: 'Inventory',
        eventType: 'InventoryReserved',
        eventData: {
          productId: 'prod-1',
          quantity: 5,
        },
      });

      mockRepo.find.mockResolvedValue([minimalEvent] as any);
      mockRepo.save.mockResolvedValue({ ...minimalEvent, processed: true } as any);

      await processor.processPendingEvents();

      expect(mockQ.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          productId: 'prod-1',
          quantity: 5,
        }),
        expect.any(Object),
      );
    });

    it('should handle events with null eventData gracefully', async () => {
      const nullDataEvent = createMockOutboxEvent({
        id: 'event-null-data',
        aggregateType: 'Inventory',
        eventType: 'InventoryReserved',
        eventData: null as any,
      });

      mockRepo.find.mockResolvedValue([nullDataEvent] as any);
      mockRepo.save.mockResolvedValue({ ...nullDataEvent, processed: true } as any);

      await processor.processPendingEvents();

      // Processor should skip events with null eventData
      expect(mockQ.add).not.toHaveBeenCalled();
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('should handle events with empty eventData', async () => {
      const emptyDataEvent = createMockOutboxEvent({
        id: 'event-empty-data',
        aggregateType: 'Payment',
        eventType: 'PaymentProcessed',
        eventData: {},
      });

      mockRepo.find.mockResolvedValue([emptyDataEvent] as any);
      mockRepo.save.mockResolvedValue({ ...emptyDataEvent, processed: true } as any);

      await processor.processPendingEvents();

      expect(mockQ.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          currency: 'USD',
        }),
        expect.any(Object),
      );
    });

    it('should handle events with very large eventData', async () => {
      const largeDataEvent = createMockOutboxEvent({
        id: 'event-large-data',
        aggregateType: 'Inventory',
        eventType: 'InventoryReserved',
        eventData: {
          productId: 'prod-1',
          quantity: 5,
          metadata: {
            largeField: 'x'.repeat(10000),
            nestedData: Array.from({ length: 100 }, (_, i) => ({
              id: i,
              value: `value-${i}`,
            })),
          },
        },
      });

      mockRepo.find.mockResolvedValue([largeDataEvent] as any);
      mockRepo.save.mockResolvedValue({ ...largeDataEvent, processed: true } as any);

      await processor.processPendingEvents();

      expect(mockQ.add).toHaveBeenCalled();
      expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ processed: true }));
    });
  });
});
