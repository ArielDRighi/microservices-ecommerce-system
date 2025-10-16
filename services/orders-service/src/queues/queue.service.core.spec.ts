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

describe('QueueService - Core Functionality', () => {
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

  describe('addOrderJob', () => {
    const jobData: OrderProcessingJobData = {
      jobId: 'JOB-123',
      createdAt: new Date(),
      orderId: 'ORD-123',
      userId: 'USER-456',
      items: [{ productId: 'PROD-789', quantity: 2, unitPrice: 99.99 }],
      totalAmount: 199.98,
      sagaId: 'SAGA-123',
    };

    it('should add an order job to the queue without options', async () => {
      const mockJob = { id: '1', data: jobData } as Partial<Job>;
      orderQueue.add.mockResolvedValue(mockJob as Job);

      const result = await service.addOrderJob('process-order', jobData);

      expect(orderQueue.add).toHaveBeenCalledWith('process-order', jobData, undefined);
      expect(result).toEqual(mockJob);
    });

    it('should add an order job with priority option', async () => {
      const mockJob = { id: '2', data: jobData } as Partial<Job>;
      const options = { priority: 1 };
      orderQueue.add.mockResolvedValue(mockJob as Job);

      const result = await service.addOrderJob('process-order', jobData, options);

      expect(orderQueue.add).toHaveBeenCalledWith('process-order', jobData, options);
      expect(result).toEqual(mockJob);
    });

    it('should add an order job with delay option', async () => {
      const mockJob = { id: '3', data: jobData } as Partial<Job>;
      const options = { delay: 5000 };
      orderQueue.add.mockResolvedValue(mockJob as Job);

      const result = await service.addOrderJob('process-order', jobData, options);

      expect(orderQueue.add).toHaveBeenCalledWith('process-order', jobData, options);
      expect(result).toEqual(mockJob);
    });

    it('should add an order job with attempts option', async () => {
      const mockJob = { id: '4', data: jobData } as Partial<Job>;
      const options = { attempts: 3 };
      orderQueue.add.mockResolvedValue(mockJob as Job);

      const result = await service.addOrderJob('process-order', jobData, options);

      expect(orderQueue.add).toHaveBeenCalledWith('process-order', jobData, options);
      expect(result).toEqual(mockJob);
    });

    it('should add an order job with all options', async () => {
      const mockJob = { id: '5', data: jobData } as Partial<Job>;
      const options = { priority: 1, delay: 5000, attempts: 3 };
      orderQueue.add.mockResolvedValue(mockJob as Job);

      const result = await service.addOrderJob('process-order', jobData, options);

      expect(orderQueue.add).toHaveBeenCalledWith('process-order', jobData, options);
      expect(result).toEqual(mockJob);
    });

    it('should propagate errors from queue.add', async () => {
      const error = new Error('Queue full');
      orderQueue.add.mockRejectedValue(error);

      await expect(service.addOrderJob('process-order', jobData)).rejects.toThrow('Queue full');
    });
  });

  describe('addPaymentJob', () => {
    const jobData: PaymentProcessingJobData = {
      jobId: 'JOB-PAY-123',
      createdAt: new Date(),
      orderId: 'ORD-123',
      paymentId: 'PAY-456',
      amount: 199.98,
      currency: 'USD',
      paymentMethod: 'credit_card',
      customerId: 'CUST-789',
    };

    it('should add a payment job to the queue without options', async () => {
      const mockJob = { id: '1', data: jobData } as Partial<Job>;
      paymentQueue.add.mockResolvedValue(mockJob as Job);

      const result = await service.addPaymentJob('process-payment', jobData);

      expect(paymentQueue.add).toHaveBeenCalledWith('process-payment', jobData, undefined);
      expect(result).toEqual(mockJob);
    });

    it('should add a payment job with priority option', async () => {
      const mockJob = { id: '2', data: jobData } as Partial<Job>;
      const options = { priority: 1 };
      paymentQueue.add.mockResolvedValue(mockJob as Job);

      const result = await service.addPaymentJob('process-payment', jobData, options);

      expect(paymentQueue.add).toHaveBeenCalledWith('process-payment', jobData, options);
      expect(result).toEqual(mockJob);
    });

    it('should add a payment job with delay and attempts', async () => {
      const mockJob = { id: '3', data: jobData } as Partial<Job>;
      const options = { delay: 2000, attempts: 5 };
      paymentQueue.add.mockResolvedValue(mockJob as Job);

      const result = await service.addPaymentJob('process-payment', jobData, options);

      expect(paymentQueue.add).toHaveBeenCalledWith('process-payment', jobData, options);
      expect(result).toEqual(mockJob);
    });

    it('should propagate errors from queue.add', async () => {
      const error = new Error('Payment gateway unavailable');
      paymentQueue.add.mockRejectedValue(error);

      await expect(service.addPaymentJob('process-payment', jobData)).rejects.toThrow(
        'Payment gateway unavailable',
      );
    });
  });

  describe('addInventoryJob', () => {
    const jobData: InventoryManagementJobData = {
      jobId: 'JOB-INV-123',
      createdAt: new Date(),
      productId: 'PROD-789',
      action: 'reserve',
      quantity: 2,
      orderId: 'ORD-123',
    };

    it('should add an inventory job to the queue without options', async () => {
      const mockJob = { id: '1', data: jobData } as Partial<Job>;
      inventoryQueue.add.mockResolvedValue(mockJob as Job);

      const result = await service.addInventoryJob('reserve-stock', jobData);

      expect(inventoryQueue.add).toHaveBeenCalledWith('reserve-stock', jobData, undefined);
      expect(result).toEqual(mockJob);
    });

    it('should add an inventory job with all options', async () => {
      const mockJob = { id: '2', data: jobData } as Partial<Job>;
      const options = { priority: 2, delay: 1000, attempts: 3 };
      inventoryQueue.add.mockResolvedValue(mockJob as Job);

      const result = await service.addInventoryJob('reserve-stock', jobData, options);

      expect(inventoryQueue.add).toHaveBeenCalledWith('reserve-stock', jobData, options);
      expect(result).toEqual(mockJob);
    });

    it('should propagate errors from queue.add', async () => {
      const error = new Error('Inventory service down');
      inventoryQueue.add.mockRejectedValue(error);

      await expect(service.addInventoryJob('reserve-stock', jobData)).rejects.toThrow(
        'Inventory service down',
      );
    });
  });

  describe('addNotificationJob', () => {
    const jobData: NotificationSendingJobData = {
      jobId: 'JOB-NOT-123',
      createdAt: new Date(),
      userId: 'USER-456',
      type: 'email',
      recipient: 'user@example.com',
      template: 'order-confirmation',
      data: { orderId: 'ORD-123', total: 199.98 },
    };

    it('should add a notification job to the queue without options', async () => {
      const mockJob = { id: '1', data: jobData } as Partial<Job>;
      notificationQueue.add.mockResolvedValue(mockJob as Job);

      const result = await service.addNotificationJob('send-email', jobData);

      expect(notificationQueue.add).toHaveBeenCalledWith('send-email', jobData, undefined);
      expect(result).toEqual(mockJob);
    });

    it('should add a notification job with priority and delay', async () => {
      const mockJob = { id: '2', data: jobData } as Partial<Job>;
      const options = { priority: 3, delay: 3000 };
      notificationQueue.add.mockResolvedValue(mockJob as Job);

      const result = await service.addNotificationJob('send-email', jobData, options);

      expect(notificationQueue.add).toHaveBeenCalledWith('send-email', jobData, options);
      expect(result).toEqual(mockJob);
    });

    it('should propagate errors from queue.add', async () => {
      const error = new Error('Notification service unavailable');
      notificationQueue.add.mockRejectedValue(error);

      await expect(service.addNotificationJob('send-email', jobData)).rejects.toThrow(
        'Notification service unavailable',
      );
    });
  });
});
