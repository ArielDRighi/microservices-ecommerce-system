import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { TemplateService } from './templates/template.service';
import { EmailProvider } from './providers/email.provider';
import { SMSProvider } from './providers/sms.provider';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationType, NotificationStatus } from './enums';
import { mockNotificationRepository } from './helpers/notifications.test-helpers';

describe('NotificationsService - Preferences & Queries', () => {
  let service: NotificationsService;
  let notificationRepository: ReturnType<typeof mockNotificationRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        TemplateService,
        EmailProvider,
        SMSProvider,
        {
          provide: getRepositoryToken(NotificationEntity),
          useValue: mockNotificationRepository(),
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    notificationRepository = module.get(getRepositoryToken(NotificationEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('shouldSendNotification', () => {
    it('should return true when no preferences provided', async () => {
      // Act
      const result = await service.shouldSendNotification('user-123', NotificationType.EMAIL);

      // Assert
      expect(result).toBe(true);
    });

    it('should respect email preferences', async () => {
      // Arrange
      const preferences = {
        userId: 'user-123',
        email: { enabled: false, address: 'test@example.com' },
        sms: { enabled: true, phoneNumber: '+1234567890', optedOut: false },
        push: { enabled: true },
      };

      // Act
      const result = await service.shouldSendNotification(
        'user-123',
        NotificationType.EMAIL,
        preferences,
      );

      // Assert
      expect(result).toBe(false);
    });

    it('should respect SMS opt-out', async () => {
      // Arrange
      const preferences = {
        userId: 'user-123',
        email: { enabled: true, address: 'test@example.com' },
        sms: { enabled: true, phoneNumber: '+1234567890', optedOut: true },
        push: { enabled: true },
      };

      // Act
      const result = await service.shouldSendNotification(
        'user-123',
        NotificationType.SMS,
        preferences,
      );

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getNotificationStatus', () => {
    it('should return notification status when found', async () => {
      // Arrange
      const notificationId = 'notif-123';
      const mockNotification = {
        id: notificationId,
        status: NotificationStatus.SENT,
        messageId: 'msg-123',
        sentAt: new Date(),
      } as NotificationEntity;

      notificationRepository.findOne.mockResolvedValue(mockNotification);

      // Act
      const result = await service.getNotificationStatus(notificationId);

      // Assert
      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
      expect(result?.messageId).toBe('msg-123');
    });

    it('should return null when notification not found', async () => {
      // Arrange
      notificationRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.getNotificationStatus('non-existent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getUserNotifications', () => {
    it('should return all notifications for a user', async () => {
      // Arrange
      const userId = 'user-123';
      const mockNotifications = [
        { id: 'notif-1', userId } as NotificationEntity,
        { id: 'notif-2', userId } as NotificationEntity,
      ];

      notificationRepository.find.mockResolvedValue(mockNotifications);

      // Act
      const result = await service.getUserNotifications(userId);

      // Assert
      expect(result).toHaveLength(2);
      expect(notificationRepository.find).toHaveBeenCalledWith({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
    });
  });
});
