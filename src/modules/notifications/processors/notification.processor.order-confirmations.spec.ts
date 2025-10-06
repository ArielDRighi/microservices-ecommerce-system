import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { NotificationProcessor } from './notification.processor';
import { NotificationsService } from '../notifications.service';
import { NotificationPriority } from '../enums';
import { SendOrderConfirmationDto } from '../dto';
import {
  mockNotificationsService,
  createMockJob,
  expectSuccessfulJobResult,
} from './helpers/notification-processor.test-helpers';

describe('NotificationProcessor - Order Confirmations', () => {
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

  describe('Order Confirmation Notifications', () => {
    it('should process order-confirmation job successfully', async () => {
      // Arrange
      const orderData: SendOrderConfirmationDto = {
        orderId: 'order-456',
        orderNumber: 'ORD-123',
        items: [
          {
            productId: 'prod-123',
            quantity: 2,
            price: 29.99,
          },
        ],
        totalAmount: 59.98,
        currency: 'USD',
      };

      const mockJob = createMockJob('1', 'order-confirmation', orderData, NotificationPriority.HIGH, 'user-123');

      // Act
      const result = await processor.handleNotification(mockJob);

      // Assert
      expectSuccessfulJobResult(result, '1');
      expect(notificationsService.sendOrderConfirmation).toHaveBeenCalledWith(orderData);
      expect(notificationsService.sendOrderConfirmation).toHaveBeenCalledTimes(1);
    });

    it('should log processing start for order-confirmation', async () => {
      // Arrange
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      const mockJob = createMockJob('2', 'order-confirmation', {
        userId: 'user-123',
        orderId: 'order-456',
        orderNumber: 'ORD-123',
        items: [],
        total: 0,
        estimatedDelivery: new Date(),
      });

      // Act
      await processor.handleNotification(mockJob);

      // Assert
      expect(logSpy).toHaveBeenCalledWith(
        'Processing notification job 2 of type order-confirmation',
      );
    });

    it('should log success after processing order-confirmation', async () => {
      // Arrange
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      const mockJob = createMockJob('3', 'order-confirmation', {
        userId: 'user-123',
        orderId: 'order-456',
        orderNumber: 'ORD-123',
        items: [],
        total: 0,
        estimatedDelivery: new Date(),
      });

      // Act
      await processor.handleNotification(mockJob);

      // Assert
      expect(logSpy).toHaveBeenCalledWith('Successfully processed notification job 3');
    });
  });
});
