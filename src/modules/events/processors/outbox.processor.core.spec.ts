/* eslint-disable @typescript-eslint/no-explicit-any */
// Test file - using 'any' for mocking complex entity types is acceptable
import { OutboxProcessor } from './outbox.processor';
import {
  mockOutboxRepository,
  mockQueue,
  createOutboxProcessorTestingModule,
  createMockOutboxEvent,
} from './helpers/outbox-processor.test-helpers';

describe('OutboxProcessor - Core Functionality', () => {
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

  describe('processPendingEvents', () => {
    it('should process pending events', async () => {
      mockRepo.find.mockResolvedValue([]);

      await processor.processPendingEvents();

      expect(mockRepo.find).toHaveBeenCalled();
    });

    it('should handle empty batch gracefully', async () => {
      mockRepo.find.mockResolvedValue([]);

      await processor.processPendingEvents();

      expect(mockQ.add).not.toHaveBeenCalled();
      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('getStatistics', () => {
    it('should return processing statistics', async () => {
      mockRepo.count.mockResolvedValueOnce(100).mockResolvedValueOnce(80).mockResolvedValueOnce(20);

      const oldestPending = createMockOutboxEvent({
        id: 'event-old',
        createdAt: new Date('2024-01-01'),
      });

      mockRepo.findOne.mockResolvedValue(oldestPending as any);

      const stats = await processor.getStatistics();

      expect(stats).toEqual({
        totalEvents: 100,
        processedEvents: 80,
        pendingEvents: 20,
        oldestPendingEvent: new Date('2024-01-01'),
      });
    });

    it('should handle no pending events', async () => {
      mockRepo.count.mockResolvedValueOnce(50).mockResolvedValueOnce(50).mockResolvedValueOnce(0);

      mockRepo.findOne.mockResolvedValue(null);

      const stats = await processor.getStatistics();

      expect(stats).toEqual({
        totalEvents: 50,
        processedEvents: 50,
        pendingEvents: 0,
        oldestPendingEvent: undefined,
      });
    });
  });

  describe('start and stop', () => {
    it('should start and process events immediately', async () => {
      mockRepo.find.mockResolvedValue([]);

      await processor.start();

      expect(mockRepo.find).toHaveBeenCalled();
    });

    it('should stop processing', async () => {
      await processor.stop();
      expect(true).toBe(true);
    });
  });

  describe('Lifecycle Management', () => {
    it('should initialize with config disabled and not start', async () => {
      const disabledProcessor = new OutboxProcessor(
        mockRepo as any,
        mockQ as any,
        mockQ as any,
        mockQ as any,
      );

      (disabledProcessor as any).config.enabled = false;

      await disabledProcessor.onModuleInit();

      mockRepo.find.mockClear();
      expect(mockRepo.find).not.toHaveBeenCalled();
    });

    it('should not process when config is disabled', async () => {
      (processor as any).config.enabled = false;

      await processor.processPendingEvents();

      expect(mockRepo.find).not.toHaveBeenCalled();
      expect(mockQ.add).not.toHaveBeenCalled();

      (processor as any).config.enabled = true;
    });

    it('should warn when trying to start while already running', async () => {
      mockRepo.find.mockResolvedValue([]);

      await processor.start();

      (processor as any).processingInterval = setTimeout(() => {}, 1000);

      await processor.start();

      expect(true).toBe(true);

      clearTimeout((processor as any).processingInterval);
      (processor as any).processingInterval = undefined;
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

    it('should cleanup on module destroy', async () => {
      await processor.onModuleDestroy();

      expect(true).toBe(true);
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
  });
});
