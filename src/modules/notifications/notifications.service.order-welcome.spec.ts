import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { TemplateService } from './templates/template.service';
import { EmailProvider } from './providers/email.provider';
import { SMSProvider } from './providers/sms.provider';
import { NotificationEntity } from './entities/notification.entity';
import { Language, TemplateType } from './enums';
import { SendOrderConfirmationDto } from './dto';
import {
  mockNotificationRepository,
  createMockNotification,
  expectValidNotificationResult,
} from './helpers/notifications.test-helpers';

describe('NotificationsService - Order & Welcome', () => {
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendOrderConfirmation', () => {
    it('should send order confirmation email', async () => {
      // Arrange
      const dto: SendOrderConfirmationDto = {
        orderId: 'order-123',
        orderNumber: 'ORD-2024-001',
        totalAmount: 150.5,
        currency: 'USD',
        items: [],
      };

      const mockNotification = createMockNotification('notif-123', dto.orderId);
      notificationRepository.create.mockReturnValue(mockNotification);
      notificationRepository.save.mockResolvedValue(mockNotification);

      // Act
      const result = await service.sendOrderConfirmation(dto);

      // Assert
      expectValidNotificationResult(result);
      expect(notificationRepository.save).toHaveBeenCalled();
    });

    it('should use order confirmation template', async () => {
      // Arrange
      const dto: SendOrderConfirmationDto = {
        orderId: 'order-123',
        orderNumber: 'ORD-2024-001',
        totalAmount: 150.5,
        currency: 'USD',
        items: [],
      };

      const templateSpy = jest.spyOn(templateService, 'renderTemplate');
      notificationRepository.create.mockReturnValue({} as NotificationEntity);
      notificationRepository.save.mockResolvedValue({ id: 'notif-123' } as NotificationEntity);

      // Act
      await service.sendOrderConfirmation(dto);

      // Assert
      expect(templateSpy).toHaveBeenCalledWith(
        TemplateType.ORDER_CONFIRMATION,
        expect.objectContaining({
          orderNumber: dto.orderNumber,
          totalAmount: dto.totalAmount,
          currency: dto.currency,
        }),
        Language.EN,
      );
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email to new user', async () => {
      // Arrange
      const userId = 'user-456';
      const mockNotification = createMockNotification('notif-126', userId);

      notificationRepository.create.mockReturnValue(mockNotification);
      notificationRepository.save.mockResolvedValue(mockNotification);

      // Act
      const result = await service.sendWelcomeEmail(userId);

      // Assert
      expectValidNotificationResult(result);
      expect(notificationRepository.save).toHaveBeenCalled();
    });

    it('should use welcome email template', async () => {
      // Arrange
      const userId = 'user-456';
      const templateSpy = jest.spyOn(templateService, 'renderTemplate');

      notificationRepository.create.mockReturnValue({} as NotificationEntity);
      notificationRepository.save.mockResolvedValue({ id: 'notif-126' } as NotificationEntity);

      // Act
      await service.sendWelcomeEmail(userId);

      // Assert
      expect(templateSpy).toHaveBeenCalledWith(
        TemplateType.WELCOME_EMAIL,
        expect.any(Object),
        Language.EN,
      );
    });
  });
});
