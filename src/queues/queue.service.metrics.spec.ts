import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';
import { Logger } from '@nestjs/common';
import { QueueService } from './queue.service';
import {
  createMockQueue,
  createMockJobCounts,
  expectValidQueueMetrics,
} from './helpers/queue-service.test-helpers';

describe('QueueService - Metrics', () => {
  let service: QueueService;
  let orderQueue: jest.Mocked<Queue>;
  let paymentQueue: jest.Mocked<Queue>;
  let inventoryQueue: jest.Mocked<Queue>;
  let notificationQueue: jest.Mocked<Queue>;

  beforeEach(async () => {
    orderQueue = createMockQueue() as jest.Mocked<Queue>;
    paymentQueue = createMockQueue() as jest.Mocked<Queue>;
    inventoryQueue = createMockQueue() as jest.Mocked<Queue>;
    notificationQueue = createMockQueue() as jest.Mocked<Queue>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        {
          provide: getQueueToken('order-processing'),
          useValue: orderQueue,
        },
        {
          provide: getQueueToken('payment-processing'),
          useValue: paymentQueue,
        },
        {
          provide: getQueueToken('inventory-management'),
          useValue: inventoryQueue,
        },
        {
          provide: getQueueToken('notification-sending'),
          useValue: notificationQueue,
        },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getQueueMetrics', () => {
    it('should return metrics for order-processing queue', async () => {
      const mockCounts = createMockJobCounts({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
      });
      orderQueue.getJobCounts.mockResolvedValue(mockCounts);
      orderQueue.isPaused.mockResolvedValue(false);

      const result = await service.getQueueMetrics('order-processing');

      expectValidQueueMetrics(result, 'order-processing');
      expect(result).toEqual({
        queueName: 'order-processing',
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
        paused: false,
        timestamp: expect.any(Date),
      });
    });

    it('should return metrics for payment-processing queue', async () => {
      const mockCounts = createMockJobCounts({
        waiting: 10,
        active: 5,
        completed: 200,
        failed: 10,
        delayed: 2,
      });
      paymentQueue.getJobCounts.mockResolvedValue(mockCounts);
      paymentQueue.isPaused.mockResolvedValue(true);

      const result = await service.getQueueMetrics('payment-processing');

      expectValidQueueMetrics(result, 'payment-processing');
      expect(result).toEqual({
        queueName: 'payment-processing',
        waiting: 10,
        active: 5,
        completed: 200,
        failed: 10,
        delayed: 2,
        paused: true,
        timestamp: expect.any(Date),
      });
    });

    it('should return metrics for inventory-management queue', async () => {
      const mockCounts = createMockJobCounts({
        waiting: 3,
        active: 1,
        completed: 50,
        failed: 2,
        delayed: 0,
      });
      inventoryQueue.getJobCounts.mockResolvedValue(mockCounts);
      inventoryQueue.isPaused.mockResolvedValue(false);

      const result = await service.getQueueMetrics('inventory-management');

      expectValidQueueMetrics(result, 'inventory-management');
      expect(result.waiting).toBe(3);
      expect(result.active).toBe(1);
      expect(result.completed).toBe(50);
    });

    it('should return metrics for notification-sending queue', async () => {
      const mockCounts = createMockJobCounts({
        waiting: 15,
        active: 8,
        completed: 500,
        failed: 5,
        delayed: 3,
      });
      notificationQueue.getJobCounts.mockResolvedValue(mockCounts);
      notificationQueue.isPaused.mockResolvedValue(false);

      const result = await service.getQueueMetrics('notification-sending');

      expectValidQueueMetrics(result, 'notification-sending');
      expect(result.waiting).toBe(15);
      expect(result.completed).toBe(500);
    });

    it('should handle missing count properties with default 0', async () => {
      const mockCounts = {}; // Empty counts
      orderQueue.getJobCounts.mockResolvedValue(mockCounts as never);
      orderQueue.isPaused.mockResolvedValue(false);

      const result = await service.getQueueMetrics('order-processing');

      expect(result).toEqual({
        queueName: 'order-processing',
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: false,
        timestamp: expect.any(Date),
      });
    });

    it('should throw error for unknown queue name', async () => {
      await expect(service.getQueueMetrics('unknown-queue')).rejects.toThrow(
        'Unknown queue: unknown-queue',
      );
    });

    it('should handle metrics retrieval when queue operations fail', async () => {
      const error = new Error('Redis connection lost');
      orderQueue.getJobCounts.mockRejectedValue(error);

      await expect(service.getQueueMetrics('order-processing')).rejects.toThrow(
        'Redis connection lost',
      );
    });
  });

  describe('getAllQueueMetrics', () => {
    it('should return metrics for all queues', async () => {
      const orderCounts = createMockJobCounts({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
      });
      const paymentCounts = createMockJobCounts({
        waiting: 10,
        active: 5,
        completed: 200,
        failed: 10,
        delayed: 2,
      });
      const inventoryCounts = createMockJobCounts({
        waiting: 3,
        active: 1,
        completed: 50,
        failed: 2,
        delayed: 0,
      });
      const notificationCounts = createMockJobCounts({
        waiting: 15,
        active: 8,
        completed: 500,
        failed: 5,
        delayed: 3,
      });

      orderQueue.getJobCounts.mockResolvedValue(orderCounts);
      orderQueue.isPaused.mockResolvedValue(false);

      paymentQueue.getJobCounts.mockResolvedValue(paymentCounts);
      paymentQueue.isPaused.mockResolvedValue(false);

      inventoryQueue.getJobCounts.mockResolvedValue(inventoryCounts);
      inventoryQueue.isPaused.mockResolvedValue(false);

      notificationQueue.getJobCounts.mockResolvedValue(notificationCounts);
      notificationQueue.isPaused.mockResolvedValue(false);

      const result = await service.getAllQueueMetrics();

      expect(result).toHaveLength(4);
      expect(result[0]).toMatchObject({ queueName: 'order-processing' });
      expect(result[1]).toMatchObject({ queueName: 'payment-processing' });
      expect(result[2]).toMatchObject({ queueName: 'inventory-management' });
      expect(result[3]).toMatchObject({ queueName: 'notification-sending' });

      // Verify each has valid metrics structure
      result.forEach((metrics) => {
        expect(metrics).toHaveProperty('queueName');
        expect(metrics).toHaveProperty('waiting');
        expect(metrics).toHaveProperty('active');
        expect(metrics).toHaveProperty('completed');
        expect(metrics).toHaveProperty('failed');
        expect(metrics).toHaveProperty('delayed');
        expect(metrics).toHaveProperty('paused');
        expect(metrics).toHaveProperty('timestamp');
      });
    });

    it('should return metrics even if some queues have errors', async () => {
      orderQueue.getJobCounts.mockResolvedValue(createMockJobCounts({ waiting: 5, active: 2 }));
      orderQueue.isPaused.mockResolvedValue(false);

      paymentQueue.getJobCounts.mockRejectedValue(new Error('Payment queue error'));

      inventoryQueue.getJobCounts.mockResolvedValue(createMockJobCounts({ waiting: 3, active: 1 }));
      inventoryQueue.isPaused.mockResolvedValue(false);

      notificationQueue.getJobCounts.mockResolvedValue(
        createMockJobCounts({ waiting: 15, active: 8 }),
      );
      notificationQueue.isPaused.mockResolvedValue(false);

      // Should reject since one queue failed
      await expect(service.getAllQueueMetrics()).rejects.toThrow();
    });

    it('should return empty metrics when all queues have zero jobs', async () => {
      const emptyCounts = createMockJobCounts();

      orderQueue.getJobCounts.mockResolvedValue(emptyCounts);
      orderQueue.isPaused.mockResolvedValue(false);

      paymentQueue.getJobCounts.mockResolvedValue(emptyCounts);
      paymentQueue.isPaused.mockResolvedValue(false);

      inventoryQueue.getJobCounts.mockResolvedValue(emptyCounts);
      inventoryQueue.isPaused.mockResolvedValue(false);

      notificationQueue.getJobCounts.mockResolvedValue(emptyCounts);
      notificationQueue.isPaused.mockResolvedValue(false);

      const result = await service.getAllQueueMetrics();

      expect(result).toHaveLength(4);
      result.forEach((metrics) => {
        expect(metrics.waiting).toBe(0);
        expect(metrics.active).toBe(0);
        expect(metrics.completed).toBe(0);
        expect(metrics.failed).toBe(0);
        expect(metrics.delayed).toBe(0);
      });
    });
  });
});
