import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QueueService } from './queue.service';
import {
  OrderProcessingJobData,
  PaymentProcessingJobData,
  InventoryManagementJobData,
  NotificationSendingJobData,
} from '../common/interfaces/queue-job.interface';
import { createMockQueue } from './helpers/queue-service.test-helpers';

describe('QueueService - Edge Cases & Error Handling', () => {
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

  describe('Concurrent Operations', () => {
    it('should handle concurrent job additions', async () => {
      const jobData1: OrderProcessingJobData = {
        jobId: 'JOB-1',
        createdAt: new Date(),
        orderId: 'ORD-1',
        userId: 'USER-1',
        items: [],
        totalAmount: 100,
        sagaId: 'SAGA-1',
      };
      const jobData2: OrderProcessingJobData = {
        jobId: 'JOB-2',
        createdAt: new Date(),
        orderId: 'ORD-2',
        userId: 'USER-2',
        items: [],
        totalAmount: 200,
        sagaId: 'SAGA-2',
      };

      orderQueue.add
        .mockResolvedValueOnce({ id: '1' } as Job)
        .mockResolvedValueOnce({ id: '2' } as Job);

      const [result1, result2] = await Promise.all([
        service.addOrderJob('process-order', jobData1),
        service.addOrderJob('process-order', jobData2),
      ]);

      expect(orderQueue.add).toHaveBeenCalledTimes(2);
      expect(result1.id).toBe('1');
      expect(result2.id).toBe('2');
    });

    it('should handle concurrent additions across different queues', async () => {
      const orderData: OrderProcessingJobData = {
        jobId: 'JOB-ORDER',
        createdAt: new Date(),
        orderId: 'ORD-1',
        userId: 'USER-1',
        items: [],
        totalAmount: 100,
        sagaId: 'SAGA-1',
      };

      const paymentData: PaymentProcessingJobData = {
        jobId: 'JOB-PAY',
        createdAt: new Date(),
        orderId: 'ORD-1',
        paymentId: 'PAY-1',
        amount: 100,
        currency: 'USD',
        paymentMethod: 'credit_card',
        customerId: 'CUST-1',
      };

      const inventoryData: InventoryManagementJobData = {
        jobId: 'JOB-INV',
        createdAt: new Date(),
        productId: 'PROD-1',
        action: 'reserve',
        quantity: 1,
        orderId: 'ORD-1',
      };

      const notificationData: NotificationSendingJobData = {
        jobId: 'JOB-NOT',
        createdAt: new Date(),
        userId: 'USER-1',
        type: 'email',
        recipient: 'user@example.com',
        template: 'order-confirmation',
        data: { orderId: 'ORD-1' },
      };

      orderQueue.add.mockResolvedValue({ id: 'order-job' } as Job);
      paymentQueue.add.mockResolvedValue({ id: 'payment-job' } as Job);
      inventoryQueue.add.mockResolvedValue({ id: 'inventory-job' } as Job);
      notificationQueue.add.mockResolvedValue({ id: 'notification-job' } as Job);

      const [order, payment, inventory, notification] = await Promise.all([
        service.addOrderJob('process-order', orderData),
        service.addPaymentJob('process-payment', paymentData),
        service.addInventoryJob('reserve-stock', inventoryData),
        service.addNotificationJob('send-email', notificationData),
      ]);

      expect(order.id).toBe('order-job');
      expect(payment.id).toBe('payment-job');
      expect(inventory.id).toBe('inventory-job');
      expect(notification.id).toBe('notification-job');
    });

    it('should handle concurrent metrics retrieval', async () => {
      orderQueue.getJobCounts.mockResolvedValue({ waiting: 5, active: 2, completed: 100, failed: 3, delayed: 1 });
      orderQueue.isPaused.mockResolvedValue(false);

      paymentQueue.getJobCounts.mockResolvedValue({ waiting: 10, active: 5, completed: 200, failed: 10, delayed: 2 });
      paymentQueue.isPaused.mockResolvedValue(false);

      const [orderMetrics, paymentMetrics] = await Promise.all([
        service.getQueueMetrics('order-processing'),
        service.getQueueMetrics('payment-processing'),
      ]);

      expect(orderMetrics.queueName).toBe('order-processing');
      expect(paymentMetrics.queueName).toBe('payment-processing');
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors from queue.add for order jobs', async () => {
      const error = new Error('Queue full');
      const jobData: OrderProcessingJobData = {
        jobId: 'JOB-1',
        createdAt: new Date(),
        orderId: 'ORD-1',
        userId: 'USER-1',
        items: [],
        totalAmount: 100,
        sagaId: 'SAGA-1',
      };

      orderQueue.add.mockRejectedValue(error);

      await expect(service.addOrderJob('process-order', jobData)).rejects.toThrow('Queue full');
    });

    it('should propagate errors from queue.add for payment jobs', async () => {
      const error = new Error('Payment gateway unavailable');
      const jobData: PaymentProcessingJobData = {
        jobId: 'JOB-PAY',
        createdAt: new Date(),
        orderId: 'ORD-1',
        paymentId: 'PAY-1',
        amount: 100,
        currency: 'USD',
        paymentMethod: 'credit_card',
        customerId: 'CUST-1',
      };

      paymentQueue.add.mockRejectedValue(error);

      await expect(service.addPaymentJob('process-payment', jobData)).rejects.toThrow(
        'Payment gateway unavailable',
      );
    });

    it('should propagate errors from queue.add for inventory jobs', async () => {
      const error = new Error('Inventory service down');
      const jobData: InventoryManagementJobData = {
        jobId: 'JOB-INV',
        createdAt: new Date(),
        productId: 'PROD-1',
        action: 'reserve',
        quantity: 1,
        orderId: 'ORD-1',
      };

      inventoryQueue.add.mockRejectedValue(error);

      await expect(service.addInventoryJob('reserve-stock', jobData)).rejects.toThrow(
        'Inventory service down',
      );
    });

    it('should propagate errors from queue.add for notification jobs', async () => {
      const error = new Error('Notification service unavailable');
      const jobData: NotificationSendingJobData = {
        jobId: 'JOB-NOT',
        createdAt: new Date(),
        userId: 'USER-1',
        type: 'email',
        recipient: 'user@example.com',
        template: 'order-confirmation',
        data: { orderId: 'ORD-1' },
      };

      notificationQueue.add.mockRejectedValue(error);

      await expect(service.addNotificationJob('send-email', jobData)).rejects.toThrow(
        'Notification service unavailable',
      );
    });

    it('should handle unknown queue names in pauseQueue', async () => {
      await expect(service.pauseQueue('unknown-queue')).rejects.toThrow(
        'Unknown queue: unknown-queue',
      );
    });

    it('should handle unknown queue names in resumeQueue', async () => {
      await expect(service.resumeQueue('unknown-queue')).rejects.toThrow(
        'Unknown queue: unknown-queue',
      );
    });

    it('should handle unknown queue names in cleanQueue', async () => {
      await expect(service.cleanQueue('unknown-queue')).rejects.toThrow(
        'Unknown queue: unknown-queue',
      );
    });

    it('should handle unknown queue names in emptyQueue', async () => {
      await expect(service.emptyQueue('unknown-queue')).rejects.toThrow(
        'Unknown queue: unknown-queue',
      );
    });

    it('should handle unknown queue names in getQueueMetrics', async () => {
      await expect(service.getQueueMetrics('unknown-queue')).rejects.toThrow(
        'Unknown queue: unknown-queue',
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle job addition with undefined options', async () => {
      const jobData: OrderProcessingJobData = {
        jobId: 'JOB-1',
        createdAt: new Date(),
        orderId: 'ORD-1',
        userId: 'USER-1',
        items: [],
        totalAmount: 100,
        sagaId: 'SAGA-1',
      };

      orderQueue.add.mockResolvedValue({ id: '1' } as Job);

      const result = await service.addOrderJob('process-order', jobData, undefined);

      expect(orderQueue.add).toHaveBeenCalledWith('process-order', jobData, undefined);
      expect(result.id).toBe('1');
    });

    it('should handle empty job data objects', async () => {
      const minimalJobData: OrderProcessingJobData = {
        jobId: 'JOB-MIN',
        createdAt: new Date(),
        orderId: 'ORD-MIN',
        userId: 'USER-MIN',
        items: [],
        totalAmount: 0,
        sagaId: 'SAGA-MIN',
      };

      orderQueue.add.mockResolvedValue({ id: 'minimal-job' } as Job);

      const result = await service.addOrderJob('process-order', minimalJobData);

      expect(result.id).toBe('minimal-job');
    });

    it('should handle zero grace period in cleanQueue', async () => {
      await service.cleanQueue('order-processing', 0);

      expect(orderQueue.clean).toHaveBeenCalledWith(0, 'completed');
      expect(orderQueue.clean).toHaveBeenCalledWith(0, 'failed');
    });

    it('should handle very large grace period in cleanQueue', async () => {
      const largeGrace = Number.MAX_SAFE_INTEGER;
      await service.cleanQueue('order-processing', largeGrace);

      expect(orderQueue.clean).toHaveBeenCalledWith(largeGrace, 'completed');
      expect(orderQueue.clean).toHaveBeenCalledWith(largeGrace, 'failed');
    });

    it('should handle multiple pause operations on same queue', async () => {
      await service.pauseQueue('order-processing');
      await service.pauseQueue('order-processing');

      expect(orderQueue.pause).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple resume operations on same queue', async () => {
      await service.resumeQueue('order-processing');
      await service.resumeQueue('order-processing');

      expect(orderQueue.resume).toHaveBeenCalledTimes(2);
    });

    it('should handle getAllQueues being called multiple times', () => {
      const result1 = service.getAllQueues();
      const result2 = service.getAllQueues();

      expect(result1).toEqual(result2);
      expect(result1).toHaveLength(4);
    });
  });
});
