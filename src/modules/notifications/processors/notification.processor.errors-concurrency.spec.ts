import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { NotificationProcessor } from './notification.processor';
import { NotificationsService } from '../notifications.service';
import { NotificationPriority } from '../enums';
import {
  mockNotificationsService,
  createMockJob,
  expectValidJobResultStructure,
} from './helpers/notification-processor.test-helpers';

describe('NotificationProcessor - Errors & Concurrency', () => {
  let processor: NotificationProcessor;
  let notificationsService: jest.Mocked<NotificationsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationProcessor,
        {
          provide: NotificationsService,
          useValue: mockNotificationsService(),
        },
      ],
    }).compile();

    processor = module.get<NotificationProcessor>(NotificationProcessor);
    notificationsService = module.get(NotificationsService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Error Handling', () => {
    it('should rethrow errors for Bull to handle retries', async () => {
      // Arrange
      const error = new Error('Service unavailable');
      notificationsService.sendOrderConfirmation.mockRejectedValue(error);

      const mockJob = createMockJob('8', 'order-confirmation', {
        userId: 'user-error',
        orderId: 'order-error',
        orderNumber: 'ORD-ERROR',
        items: [],
        total: 0,
        estimatedDelivery: new Date(),
      });

      // Act & Assert
      await expect(processor.handleNotification(mockJob)).rejects.toThrow('Service unavailable');
    });

    it('should log error when notification fails', async () => {
      // Arrange
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      const error = new Error('Network timeout');
      notificationsService.sendPaymentFailure.mockRejectedValue(error);

      const mockJob = createMockJob('9', 'payment-failure', {
        userId: 'user-123',
        orderId: 'order-123',
        orderNumber: 'ORD-123',
        amount: 100,
        failureReason: 'Test',
        attemptNumber: 1,
      });

      // Act
      try {
        await processor.handleNotification(mockJob);
      } catch (e) {
        // Expected
      }

      // Assert
      expect(errorSpy).toHaveBeenCalledWith('Failed to process notification job 9:', error);
    });

    it('should handle errors in shipping updates', async () => {
      // Arrange
      const error = new Error('Carrier API down');
      notificationsService.sendShippingUpdate.mockRejectedValue(error);

      const mockJob = createMockJob('10', 'shipping-update', {
        userId: 'user-123',
        orderId: 'order-123',
        orderNumber: 'ORD-123',
        trackingNumber: 'TRACK-123',
        carrier: 'USPS',
        status: 'shipped',
        estimatedDelivery: new Date(),
      });

      // Act & Assert
      await expect(processor.handleNotification(mockJob)).rejects.toThrow('Carrier API down');
    });

    it('should handle errors in welcome emails', async () => {
      // Arrange
      const error = new Error('Template not found');
      notificationsService.sendWelcomeEmail.mockRejectedValue(error);

      const mockJob = createMockJob('11', 'welcome', {}, NotificationPriority.LOW);

      // Act & Assert
      await expect(processor.handleNotification(mockJob)).rejects.toThrow('Template not found');
    });
  });

  describe('Job Result Structure', () => {
    it('should return consistent result structure', async () => {
      // Arrange
      const mockJob = createMockJob('15', 'order-confirmation', {
        userId: 'user-123',
        orderId: 'order-123',
        orderNumber: 'ORD-123',
        items: [],
        total: 0,
        estimatedDelivery: new Date(),
      });

      // Act
      const result = await processor.handleNotification(mockJob);

      // Assert
      expectValidJobResultStructure(result);
    });

    it('should include correct job ID in result', async () => {
      // Arrange
      const jobIds = ['job-a', 'job-b', 'job-c'];

      // Act & Assert
      for (const jobId of jobIds) {
        const mockJob = createMockJob(jobId, 'welcome', {}, NotificationPriority.LOW);
        const result = await processor.handleNotification(mockJob);
        expect(result.jobId).toBe(jobId);
      }
    });
  });

  describe('Concurrent Job Processing', () => {
    it('should handle multiple concurrent jobs', async () => {
      // Arrange
      const jobs = [
        createMockJob('16', 'order-confirmation', {
          userId: 'user-1',
          orderId: 'order-1',
          orderNumber: 'ORD-1',
          items: [],
          total: 100,
          estimatedDelivery: new Date(),
        }, NotificationPriority.NORMAL, 'user-1'),
        createMockJob('17', 'payment-failure', {
          userId: 'user-2',
          orderId: 'order-2',
          orderNumber: 'ORD-2',
          amount: 200,
          failureReason: 'Test',
          attemptNumber: 1,
        }, NotificationPriority.HIGH, 'user-2'),
        createMockJob('18', 'welcome', {}, NotificationPriority.LOW, 'user-3'),
      ] as Job[];

      // Act
      const results = await Promise.all(jobs.map((job) => processor.handleNotification(job)));

      // Assert
      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });

      expect(notificationsService.sendOrderConfirmation).toHaveBeenCalledTimes(1);
      expect(notificationsService.sendPaymentFailure).toHaveBeenCalledTimes(1);
      expect(notificationsService.sendWelcomeEmail).toHaveBeenCalledTimes(1);
    });
  });
});
