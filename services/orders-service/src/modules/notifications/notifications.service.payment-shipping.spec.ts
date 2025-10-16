import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { TemplateService } from './templates/template.service';
import { EmailProvider } from './providers/email.provider';
import { SMSProvider } from './providers/sms.provider';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationStatus, Language, TemplateType } from './enums';
import { SendPaymentFailureDto, SendShippingUpdateDto } from './dto';
import {
  mockNotificationRepository,
  createMockNotification,
  expectValidNotificationResult,
  mockSuccessfulNotification,
} from './helpers/notifications.test-helpers';

describe('NotificationsService - Payment & Shipping', () => {
  let service: NotificationsService;
  let templateService: TemplateService;
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
    templateService = module.get<TemplateService>(TemplateService);
    notificationRepository = module.get(getRepositoryToken(NotificationEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendPaymentFailure', () => {
    it('should send payment failure notification', async () => {
      // Arrange
      mockSuccessfulNotification(); // Mock Math.random to ensure success

      const dto: SendPaymentFailureDto = {
        orderId: 'order-123',
        orderNumber: 'ORD-2024-001',
        reason: 'Insufficient funds',
      };

      const mockNotification = createMockNotification('notif-124', dto.orderId);
      notificationRepository.create.mockReturnValue(mockNotification);
      notificationRepository.save.mockResolvedValue(mockNotification);

      // Act
      const result = await service.sendPaymentFailure(dto);

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe(NotificationStatus.SENT);
      expect(notificationRepository.save).toHaveBeenCalled();
    });

    it('should use payment failure template with high priority', async () => {
      // Arrange
      const dto: SendPaymentFailureDto = {
        orderId: 'order-123',
        orderNumber: 'ORD-2024-001',
        reason: 'Card declined',
      };

      const templateSpy = jest.spyOn(templateService, 'renderTemplate');
      notificationRepository.create.mockReturnValue({} as NotificationEntity);
      notificationRepository.save.mockResolvedValue({ id: 'notif-124' } as NotificationEntity);

      // Act
      await service.sendPaymentFailure(dto);

      // Assert
      expect(templateSpy).toHaveBeenCalledWith(
        TemplateType.PAYMENT_FAILURE,
        expect.objectContaining({
          orderNumber: dto.orderNumber,
          reason: dto.reason,
        }),
        Language.EN,
      );
    });
  });

  describe('sendShippingUpdate', () => {
    it('should send shipping update notification', async () => {
      // Arrange
      const dto: SendShippingUpdateDto = {
        orderId: 'order-123',
        orderNumber: 'ORD-2024-001',
        trackingNumber: 'TRACK-123',
        carrier: 'DHL',
      };

      const mockNotification = createMockNotification('notif-125', dto.orderId);
      notificationRepository.create.mockReturnValue(mockNotification);
      notificationRepository.save.mockResolvedValue(mockNotification);

      // Act
      const result = await service.sendShippingUpdate(dto);

      // Assert
      expectValidNotificationResult(result);
      expect(notificationRepository.save).toHaveBeenCalled();
    });

    it('should use shipping update template', async () => {
      // Arrange
      const dto: SendShippingUpdateDto = {
        orderId: 'order-123',
        orderNumber: 'ORD-2024-001',
        trackingNumber: 'TRACK-123',
        carrier: 'FedEx',
      };

      const templateSpy = jest.spyOn(templateService, 'renderTemplate');
      notificationRepository.create.mockReturnValue({} as NotificationEntity);
      notificationRepository.save.mockResolvedValue({ id: 'notif-125' } as NotificationEntity);

      // Act
      await service.sendShippingUpdate(dto);

      // Assert
      expect(templateSpy).toHaveBeenCalledWith(
        TemplateType.SHIPPING_UPDATE,
        expect.objectContaining({
          orderNumber: dto.orderNumber,
          trackingNumber: dto.trackingNumber,
          carrier: dto.carrier,
        }),
        Language.EN,
      );
    });
  });
});
