import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { NotificationProcessor } from './notification.processor';
import { NotificationsService } from '../notifications.service';
import { NotificationPriority } from '../enums';
import {
  mockNotificationsService,
  createMockJob,
  expectSuccessfulJobResult,
} from './helpers/notification-processor.test-helpers';

describe('NotificationProcessor - Welcome & Priority', () => {
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

  describe('Welcome Email Notifications', () => {
    it('should process welcome job successfully', async () => {
      // Arrange
      const mockJob = createMockJob(
        '7',
        'welcome',
        { userName: 'John Doe' },
        NotificationPriority.LOW,
        'user-welcome',
      );

      // Act
      const result = await processor.handleNotification(mockJob);

      // Assert
      expectSuccessfulJobResult(result, '7');
      expect(notificationsService.sendWelcomeEmail).toHaveBeenCalledWith('user-welcome');
      expect(notificationsService.sendWelcomeEmail).toHaveBeenCalledTimes(1);
    });

    it('should handle welcome emails with different user IDs', async () => {
      // Arrange
      const userIds = ['user-1', 'user-2', 'user-3'];

      // Act
      for (const userId of userIds) {
        const mockJob = createMockJob(
          `job-${userId}`,
          'welcome',
          {},
          NotificationPriority.LOW,
          userId,
        );
        await processor.handleNotification(mockJob);
      }

      // Assert
      expect(notificationsService.sendWelcomeEmail).toHaveBeenCalledTimes(userIds.length);
      expect(notificationsService.sendWelcomeEmail).toHaveBeenCalledWith('user-1');
      expect(notificationsService.sendWelcomeEmail).toHaveBeenCalledWith('user-2');
      expect(notificationsService.sendWelcomeEmail).toHaveBeenCalledWith('user-3');
    });
  });

  describe('Priority Levels', () => {
    it('should handle HIGH priority notifications', async () => {
      // Arrange
      const mockJob = createMockJob(
        '12',
        'payment-failure',
        {
          userId: 'user-123',
          orderId: 'order-123',
          orderNumber: 'ORD-123',
          amount: 100,
          failureReason: 'Test',
          attemptNumber: 1,
        },
        NotificationPriority.HIGH,
      );

      // Act
      const result = await processor.handleNotification(mockJob);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should handle NORMAL priority notifications', async () => {
      // Arrange
      const mockJob = createMockJob(
        '13',
        'shipping-update',
        {
          userId: 'user-123',
          orderId: 'order-123',
          orderNumber: 'ORD-123',
          trackingNumber: 'TRACK-123',
          carrier: 'DHL',
          status: 'in_transit',
          estimatedDelivery: new Date(),
        },
        NotificationPriority.NORMAL,
      );

      // Act
      const result = await processor.handleNotification(mockJob);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should handle LOW priority notifications', async () => {
      // Arrange
      const mockJob = createMockJob('14', 'welcome', {}, NotificationPriority.LOW);

      // Act
      const result = await processor.handleNotification(mockJob);

      // Assert
      expect(result.success).toBe(true);
    });
  });
});
