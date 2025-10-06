import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { NotificationProcessor } from './notification.processor';
import { NotificationsService } from '../notifications.service';
import { NotificationPriority } from '../enums';
import { SendPaymentFailureDto, SendShippingUpdateDto } from '../dto';
import {
  mockNotificationsService,
  createMockJob,
  expectSuccessfulJobResult,
} from './helpers/notification-processor.test-helpers';

describe('NotificationProcessor - Payment & Shipping', () => {
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

  describe('Payment Failure Notifications', () => {
    it('should process payment-failure job successfully', async () => {
      // Arrange
      const paymentData: SendPaymentFailureDto = {
        orderId: 'order-111',
        orderNumber: 'ORD-789',
        reason: 'Insufficient funds',
      };

      const mockJob = createMockJob(
        '4',
        'payment-failure',
        paymentData,
        NotificationPriority.HIGH,
        'user-789',
      );

      // Act
      const result = await processor.handleNotification(mockJob);

      // Assert
      expectSuccessfulJobResult(result);
      expect(notificationsService.sendPaymentFailure).toHaveBeenCalledWith(paymentData);
      expect(notificationsService.sendPaymentFailure).toHaveBeenCalledTimes(1);
    });

    it('should handle high priority payment failures', async () => {
      // Arrange
      const mockJob = createMockJob(
        '5',
        'payment-failure',
        {
          userId: 'user-urgent',
          orderId: 'order-urgent',
          orderNumber: 'ORD-URGENT',
          amount: 999.99,
          failureReason: 'Card declined',
          attemptNumber: 3,
        },
        NotificationPriority.HIGH,
        'user-urgent',
      );

      // Act
      const result = await processor.handleNotification(mockJob);

      // Assert
      expect(result.success).toBe(true);
      expect(notificationsService.sendPaymentFailure).toHaveBeenCalled();
    });
  });

  describe('Shipping Update Notifications', () => {
    it('should process shipping-update job successfully', async () => {
      // Arrange
      const shippingData: SendShippingUpdateDto = {
        orderId: 'order-666',
        orderNumber: 'ORD-555',
        trackingNumber: 'TRACK-123456',
        carrier: 'UPS',
      };

      const mockJob = createMockJob(
        '6',
        'shipping-update',
        shippingData,
        NotificationPriority.NORMAL,
        'user-555',
      );

      // Act
      const result = await processor.handleNotification(mockJob);

      // Assert
      expectSuccessfulJobResult(result);
      expect(notificationsService.sendShippingUpdate).toHaveBeenCalledWith(shippingData);
      expect(notificationsService.sendShippingUpdate).toHaveBeenCalledTimes(1);
    });

    it('should handle different shipping statuses', async () => {
      // Arrange
      const statuses = ['shipped', 'in_transit', 'out_for_delivery', 'delivered'];

      // Act
      for (const status of statuses) {
        const mockJob = createMockJob(`job-${status}`, 'shipping-update', {
          userId: 'user-123',
          orderId: 'order-123',
          orderNumber: 'ORD-123',
          trackingNumber: 'TRACK-123',
          carrier: 'FedEx',
          status,
          estimatedDelivery: new Date(),
        });

        const result = await processor.handleNotification(mockJob);
        expect(result.success).toBe(true);
      }

      // Assert
      expect(notificationsService.sendShippingUpdate).toHaveBeenCalledTimes(statuses.length);
    });
  });
});
