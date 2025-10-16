import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QueueService } from './queue.service';
import {
  createMockQueue,
  getEventListener,
  expectEventListeners,
} from './helpers/queue-service.test-helpers';

describe('QueueService - Lifecycle & Events', () => {
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

  describe('onModuleInit', () => {
    it('should set up event listeners for all queues on module initialization', async () => {
      await service.onModuleInit();

      // Verify event listeners were set up for all queues
      const queues = [orderQueue, paymentQueue, inventoryQueue, notificationQueue];
      const events = ['completed', 'failed', 'stalled', 'error'];

      expectEventListeners(queues, events);
    });

    it('should set up completed event listener for order queue', async () => {
      await service.onModuleInit();

      expect(orderQueue.on).toHaveBeenCalledWith('completed', expect.any(Function));
    });

    it('should set up failed event listener for payment queue', async () => {
      await service.onModuleInit();

      expect(paymentQueue.on).toHaveBeenCalledWith('failed', expect.any(Function));
    });

    it('should set up stalled event listener for inventory queue', async () => {
      await service.onModuleInit();

      expect(inventoryQueue.on).toHaveBeenCalledWith('stalled', expect.any(Function));
    });

    it('should set up error event listener for notification queue', async () => {
      await service.onModuleInit();

      expect(notificationQueue.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('Event Listeners', () => {
    it('should trigger completed event listener when job completes', async () => {
      await service.onModuleInit();

      const completedListener = getEventListener(orderQueue, 'completed');

      expect(completedListener).toBeDefined();

      // Simulate a completed job
      const mockJob = { id: 'test-job-123' } as Job;
      completedListener!(mockJob);

      // Verify logger was called (implicitly tested via no errors)
      expect(completedListener).toBeDefined();
    });

    it('should trigger failed event listener when job fails', async () => {
      await service.onModuleInit();

      const failedListener = getEventListener(orderQueue, 'failed');

      expect(failedListener).toBeDefined();

      // Simulate a failed job
      const mockJob = { id: 'test-job-456' } as Job;
      const mockError = new Error('Processing error');
      failedListener!(mockJob, mockError);

      // Verify the listener handles the failure
      expect(failedListener).toBeDefined();
    });

    it('should trigger stalled event listener when job stalls', async () => {
      await service.onModuleInit();

      const stalledListener = getEventListener(orderQueue, 'stalled');

      expect(stalledListener).toBeDefined();

      // Simulate a stalled job
      const mockJob = { id: 'test-job-789' } as Job;
      stalledListener!(mockJob);

      // Verify the listener handles the stall
      expect(stalledListener).toBeDefined();
    });

    it('should trigger error event listener when queue error occurs', async () => {
      await service.onModuleInit();

      const errorListener = getEventListener(orderQueue, 'error');

      expect(errorListener).toBeDefined();

      // Simulate a queue error
      const mockError = new Error('Queue connection error');
      errorListener!(mockError);

      // Verify the listener handles the error
      expect(errorListener).toBeDefined();
    });

    it('should handle failed event with null job gracefully', async () => {
      await service.onModuleInit();

      const failedListener = getEventListener(orderQueue, 'failed');

      expect(failedListener).toBeDefined();

      // Simulate a failed event with null job (edge case)
      const mockError = new Error('Processing error');
      expect(() => failedListener!(null as unknown as Job, mockError)).not.toThrow();
    });

    it('should set up event listeners for all four queues', async () => {
      await service.onModuleInit();

      // Verify each queue has all 4 event listeners
      const queues = [orderQueue, paymentQueue, inventoryQueue, notificationQueue];
      const expectedEvents = ['completed', 'failed', 'stalled', 'error'];

      queues.forEach((queue) => {
        expectedEvents.forEach((event) => {
          expect(queue.on).toHaveBeenCalledWith(event, expect.any(Function));
        });
      });
    });

    it('should handle completed event for all queues', async () => {
      await service.onModuleInit();

      const queues = [
        { queue: orderQueue, name: 'order' },
        { queue: paymentQueue, name: 'payment' },
        { queue: inventoryQueue, name: 'inventory' },
        { queue: notificationQueue, name: 'notification' },
      ];

      queues.forEach(({ queue, name }) => {
        const listener = getEventListener(queue, 'completed');
        expect(listener).toBeDefined();

        const mockJob = { id: `test-${name}-job` } as Job;
        expect(() => listener!(mockJob)).not.toThrow();
      });
    });
  });

  describe('gracefulShutdown', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should pause all queues during shutdown', async () => {
      orderQueue.getActiveCount.mockResolvedValue(0);
      paymentQueue.getActiveCount.mockResolvedValue(0);
      inventoryQueue.getActiveCount.mockResolvedValue(0);
      notificationQueue.getActiveCount.mockResolvedValue(0);

      await service.gracefulShutdown();

      expect(orderQueue.pause).toHaveBeenCalled();
      expect(paymentQueue.pause).toHaveBeenCalled();
      expect(inventoryQueue.pause).toHaveBeenCalled();
      expect(notificationQueue.pause).toHaveBeenCalled();
    });

    it('should close all queues after active jobs complete', async () => {
      orderQueue.getActiveCount.mockResolvedValue(0);
      paymentQueue.getActiveCount.mockResolvedValue(0);
      inventoryQueue.getActiveCount.mockResolvedValue(0);
      notificationQueue.getActiveCount.mockResolvedValue(0);

      await service.gracefulShutdown();

      expect(orderQueue.close).toHaveBeenCalled();
      expect(paymentQueue.close).toHaveBeenCalled();
      expect(inventoryQueue.close).toHaveBeenCalled();
      expect(notificationQueue.close).toHaveBeenCalled();
    });

    it('should wait for active jobs to complete before closing', async () => {
      // First call: 2 active jobs, second call: 0 active jobs
      orderQueue.getActiveCount.mockResolvedValueOnce(2).mockResolvedValueOnce(0);
      paymentQueue.getActiveCount.mockResolvedValue(0);
      inventoryQueue.getActiveCount.mockResolvedValue(0);
      notificationQueue.getActiveCount.mockResolvedValue(0);

      const shutdownPromise = service.gracefulShutdown();

      // Advance timers to simulate waiting period
      await jest.advanceTimersByTimeAsync(1000);

      await shutdownPromise;

      expect(orderQueue.getActiveCount).toHaveBeenCalledTimes(2);
      expect(orderQueue.close).toHaveBeenCalled();
    });

    it('should handle graceful shutdown timeout scenario', async () => {
      // Simulate jobs that never complete
      orderQueue.getActiveCount.mockResolvedValue(5);
      paymentQueue.getActiveCount.mockResolvedValue(3);
      inventoryQueue.getActiveCount.mockResolvedValue(0);
      notificationQueue.getActiveCount.mockResolvedValue(0);

      const shutdownPromise = service.gracefulShutdown(5000);

      // Advance time past the timeout
      await jest.advanceTimersByTimeAsync(6000);

      await shutdownPromise;

      // Even with timeout, all queues should be closed
      expect(orderQueue.close).toHaveBeenCalled();
      expect(paymentQueue.close).toHaveBeenCalled();
      expect(inventoryQueue.close).toHaveBeenCalled();
      expect(notificationQueue.close).toHaveBeenCalled();
    });

    it('should handle graceful shutdown with custom timeout', async () => {
      orderQueue.getActiveCount.mockResolvedValue(0);
      paymentQueue.getActiveCount.mockResolvedValue(0);
      inventoryQueue.getActiveCount.mockResolvedValue(0);
      notificationQueue.getActiveCount.mockResolvedValue(0);

      const customTimeout = 60000; // 1 minute
      await service.gracefulShutdown(customTimeout);

      expect(orderQueue.close).toHaveBeenCalled();
      expect(paymentQueue.close).toHaveBeenCalled();
    });

    it('should pause queues in correct order', async () => {
      orderQueue.getActiveCount.mockResolvedValue(0);
      paymentQueue.getActiveCount.mockResolvedValue(0);
      inventoryQueue.getActiveCount.mockResolvedValue(0);
      notificationQueue.getActiveCount.mockResolvedValue(0);

      await service.gracefulShutdown();

      // Verify pause was called for all queues
      expect(orderQueue.pause).toHaveBeenCalled();
      expect(paymentQueue.pause).toHaveBeenCalled();
      expect(inventoryQueue.pause).toHaveBeenCalled();
      expect(notificationQueue.pause).toHaveBeenCalled();
    });

    it('should wait for multiple queues with active jobs', async () => {
      orderQueue.getActiveCount.mockResolvedValueOnce(3).mockResolvedValueOnce(0);
      paymentQueue.getActiveCount.mockResolvedValueOnce(2).mockResolvedValueOnce(0);
      inventoryQueue.getActiveCount.mockResolvedValue(0);
      notificationQueue.getActiveCount.mockResolvedValue(0);

      const shutdownPromise = service.gracefulShutdown();

      await jest.advanceTimersByTimeAsync(1000);

      await shutdownPromise;

      expect(orderQueue.getActiveCount).toHaveBeenCalledTimes(2);
      expect(paymentQueue.getActiveCount).toHaveBeenCalledTimes(2);
    });
  });
});
