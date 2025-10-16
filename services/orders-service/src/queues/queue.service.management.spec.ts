import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { Queue } from 'bull';
import { Logger } from '@nestjs/common';
import { QueueService } from './queue.service';
import { createMockQueue } from './helpers/queue-service.test-helpers';

describe('QueueService - Queue Management', () => {
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

  describe('pauseQueue', () => {
    it('should pause order-processing queue', async () => {
      await service.pauseQueue('order-processing');

      expect(orderQueue.pause).toHaveBeenCalled();
    });

    it('should pause payment-processing queue', async () => {
      await service.pauseQueue('payment-processing');

      expect(paymentQueue.pause).toHaveBeenCalled();
    });

    it('should pause inventory-management queue', async () => {
      await service.pauseQueue('inventory-management');

      expect(inventoryQueue.pause).toHaveBeenCalled();
    });

    it('should pause notification-sending queue', async () => {
      await service.pauseQueue('notification-sending');

      expect(notificationQueue.pause).toHaveBeenCalled();
    });

    it('should throw error for unknown queue name', async () => {
      await expect(service.pauseQueue('unknown-queue')).rejects.toThrow(
        'Unknown queue: unknown-queue',
      );
    });

    it('should handle pause queue errors gracefully', async () => {
      const error = new Error('Failed to pause queue');
      orderQueue.pause.mockRejectedValue(error);

      await expect(service.pauseQueue('order-processing')).rejects.toThrow('Failed to pause queue');
    });
  });

  describe('resumeQueue', () => {
    it('should resume order-processing queue', async () => {
      await service.resumeQueue('order-processing');

      expect(orderQueue.resume).toHaveBeenCalled();
    });

    it('should resume payment-processing queue', async () => {
      await service.resumeQueue('payment-processing');

      expect(paymentQueue.resume).toHaveBeenCalled();
    });

    it('should resume inventory-management queue', async () => {
      await service.resumeQueue('inventory-management');

      expect(inventoryQueue.resume).toHaveBeenCalled();
    });

    it('should resume notification-sending queue', async () => {
      await service.resumeQueue('notification-sending');

      expect(notificationQueue.resume).toHaveBeenCalled();
    });

    it('should throw error for unknown queue name', async () => {
      await expect(service.resumeQueue('unknown-queue')).rejects.toThrow(
        'Unknown queue: unknown-queue',
      );
    });

    it('should handle resume queue errors gracefully', async () => {
      const error = new Error('Failed to resume queue');
      paymentQueue.resume.mockRejectedValue(error);

      await expect(service.resumeQueue('payment-processing')).rejects.toThrow(
        'Failed to resume queue',
      );
    });
  });

  describe('cleanQueue', () => {
    it('should clean order-processing queue with default grace period', async () => {
      await service.cleanQueue('order-processing');

      expect(orderQueue.clean).toHaveBeenCalledWith(3600000, 'completed');
      expect(orderQueue.clean).toHaveBeenCalledWith(3600000, 'failed');
    });

    it('should clean payment-processing queue with custom grace period', async () => {
      const customGrace = 7200000; // 2 hours
      await service.cleanQueue('payment-processing', customGrace);

      expect(paymentQueue.clean).toHaveBeenCalledWith(customGrace, 'completed');
      expect(paymentQueue.clean).toHaveBeenCalledWith(customGrace, 'failed');
    });

    it('should clean inventory-management queue with custom grace period', async () => {
      const customGrace = 1800000; // 30 minutes
      await service.cleanQueue('inventory-management', customGrace);

      expect(inventoryQueue.clean).toHaveBeenCalledTimes(2);
      expect(inventoryQueue.clean).toHaveBeenCalledWith(customGrace, 'completed');
      expect(inventoryQueue.clean).toHaveBeenCalledWith(customGrace, 'failed');
    });

    it('should clean notification-sending queue', async () => {
      const customGrace = 900000; // 15 minutes
      await service.cleanQueue('notification-sending', customGrace);

      expect(notificationQueue.clean).toHaveBeenCalledWith(customGrace, 'completed');
      expect(notificationQueue.clean).toHaveBeenCalledWith(customGrace, 'failed');
    });

    it('should throw error for unknown queue name', async () => {
      await expect(service.cleanQueue('unknown-queue')).rejects.toThrow(
        'Unknown queue: unknown-queue',
      );
    });

    it('should handle clean queue errors gracefully', async () => {
      const error = new Error('Failed to clean queue');
      inventoryQueue.clean.mockRejectedValue(error);

      await expect(service.cleanQueue('inventory-management')).rejects.toThrow(
        'Failed to clean queue',
      );
    });
  });

  describe('emptyQueue', () => {
    it('should empty order-processing queue', async () => {
      await service.emptyQueue('order-processing');

      expect(orderQueue.empty).toHaveBeenCalled();
    });

    it('should empty payment-processing queue', async () => {
      await service.emptyQueue('payment-processing');

      expect(paymentQueue.empty).toHaveBeenCalled();
    });

    it('should empty inventory-management queue', async () => {
      await service.emptyQueue('inventory-management');

      expect(inventoryQueue.empty).toHaveBeenCalled();
    });

    it('should empty notification-sending queue', async () => {
      await service.emptyQueue('notification-sending');

      expect(notificationQueue.empty).toHaveBeenCalled();
    });

    it('should throw error for unknown queue name', async () => {
      await expect(service.emptyQueue('unknown-queue')).rejects.toThrow(
        'Unknown queue: unknown-queue',
      );
    });

    it('should handle empty queue errors gracefully', async () => {
      const error = new Error('Failed to empty queue');
      notificationQueue.empty.mockRejectedValue(error);

      await expect(service.emptyQueue('notification-sending')).rejects.toThrow(
        'Failed to empty queue',
      );
    });
  });

  describe('getAllQueues', () => {
    it('should return all queue instances with their names', () => {
      const result = service.getAllQueues();

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({
        name: 'order-processing',
        queue: orderQueue,
      });
      expect(result[1]).toEqual({
        name: 'payment-processing',
        queue: paymentQueue,
      });
      expect(result[2]).toEqual({
        name: 'inventory-management',
        queue: inventoryQueue,
      });
      expect(result[3]).toEqual({
        name: 'notification-sending',
        queue: notificationQueue,
      });
    });

    it('should return queues in consistent order', () => {
      const result1 = service.getAllQueues();
      const result2 = service.getAllQueues();

      expect(result1.map((q) => q.name)).toEqual(result2.map((q) => q.name));
    });

    it('should return actual queue instances', () => {
      const result = service.getAllQueues();

      result.forEach((item) => {
        expect(item.queue).toBeDefined();
        expect(item.name).toBeTruthy();
      });
    });
  });
});
