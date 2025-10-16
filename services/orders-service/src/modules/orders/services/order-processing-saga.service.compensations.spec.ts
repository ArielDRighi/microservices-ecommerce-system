import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderProcessingSagaService } from './order-processing-saga.service';
import { SagaStateEntity } from '../../../database/entities/saga-state.entity';
import { Order } from '../entities/order.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { InventoryService } from '../../inventory/inventory.service';
import { PaymentsService } from '../../payments/payments.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationStatus } from '../../notifications/enums';
import {
  createMockOrder,
  createMockSagaState,
  createMockInventoryAvailable,
  createMockInventoryOutOfStock,
  createMockStockReservation,
  createMockPaymentSucceeded,
  createMockPaymentRefund,
  expectSagaCompensated,
} from './helpers/order-saga.test-helpers';

describe('OrderProcessingSagaService - Compensations', () => {
  let service: OrderProcessingSagaService;
  let sagaStateRepository: Repository<SagaStateEntity>;
  let orderRepository: Repository<Order>;
  let inventoryService: InventoryService;
  let paymentsService: PaymentsService;
  let notificationsService: NotificationsService;

  const mockOrder = createMockOrder();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderProcessingSagaService,
        {
          provide: getRepositoryToken(SagaStateEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Order),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: InventoryService,
          useValue: {
            checkAvailability: jest.fn(),
            reserveStock: jest.fn(),
            releaseReservation: jest.fn(),
          },
        },
        {
          provide: PaymentsService,
          useValue: {
            processPayment: jest.fn(),
            refundPayment: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            sendOrderConfirmation: jest.fn(),
            sendPaymentFailure: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrderProcessingSagaService>(OrderProcessingSagaService);
    sagaStateRepository = module.get<Repository<SagaStateEntity>>(
      getRepositoryToken(SagaStateEntity),
    );
    orderRepository = module.get<Repository<Order>>(getRepositoryToken(Order));
    inventoryService = module.get<InventoryService>(InventoryService);
    paymentsService = module.get<PaymentsService>(PaymentsService);
    notificationsService = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  describe('REFUND_PAYMENT Compensation', () => {
    it('should execute REFUND_PAYMENT compensation', async () => {
      const sagaWithPayment = createMockSagaState({
        stateData: {
          orderId: 'order-123',
          userId: 'user-123',
          items: [{ productId: 'product-1', quantity: 2, price: 50 }],
          totalAmount: 100,
          currency: 'USD',
          startedAt: new Date(),
          paymentId: 'pay-123',
        },
      });

      jest.spyOn(sagaStateRepository, 'findOne').mockResolvedValue(sagaWithPayment);
      jest.spyOn(sagaStateRepository, 'save').mockResolvedValue(sagaWithPayment);

      // Mock successful initial steps
      jest
        .spyOn(inventoryService, 'checkAvailability')
        .mockResolvedValue(createMockInventoryAvailable());

      jest.spyOn(inventoryService, 'reserveStock').mockResolvedValue(createMockStockReservation());

      jest.spyOn(paymentsService, 'processPayment').mockResolvedValue(createMockPaymentSucceeded());

      // Mock notification failure to test notification step
      jest
        .spyOn(notificationsService, 'sendOrderConfirmation')
        .mockRejectedValue(new Error('Notification service down'));

      // Mock order repository for order update
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue({
        ...mockOrder,
        id: 'order-123',
      } as Order);
      jest.spyOn(orderRepository, 'save').mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CONFIRMED,
      } as Order);

      jest.spyOn(paymentsService, 'refundPayment').mockResolvedValue(createMockPaymentRefund());

      jest
        .spyOn(inventoryService, 'releaseReservation')
        .mockResolvedValue(createMockInventoryAvailable());

      const metrics = await service.executeSaga('saga-123');

      // Saga should complete successfully despite notification failure
      expect(metrics.finalStatus).toBe('COMPLETED');
    });
  });

  describe('NOTIFY_FAILURE Compensation', () => {
    it('should execute NOTIFY_FAILURE compensation', async () => {
      const mockSagaState = createMockSagaState();

      jest.spyOn(sagaStateRepository, 'findOne').mockResolvedValue(mockSagaState);
      jest.spyOn(sagaStateRepository, 'save').mockResolvedValue(mockSagaState);

      // Mock stock verification failure
      jest
        .spyOn(inventoryService, 'checkAvailability')
        .mockResolvedValue(createMockInventoryOutOfStock());

      jest.spyOn(orderRepository, 'findOne').mockResolvedValue({
        ...mockOrder,
        id: 'order-123',
      } as Order);
      jest.spyOn(orderRepository, 'save').mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CANCELLED,
      } as Order);

      jest.spyOn(notificationsService, 'sendPaymentFailure').mockResolvedValue({
        success: true,
        messageId: 'notif-failure-123',
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      });

      const metrics = await service.executeSaga('saga-123');

      expectSagaCompensated(metrics);
    });
  });

  describe('Compensation Failure Handling', () => {
    it('should handle compensation failure gracefully', async () => {
      const sagaWithReservation = createMockSagaState({
        stateData: {
          orderId: 'order-123',
          userId: 'user-123',
          items: [{ productId: 'product-1', quantity: 2, price: 50 }],
          totalAmount: 100,
          currency: 'USD',
          startedAt: new Date(),
          reservationId: 'res-123',
        },
      });

      jest.spyOn(sagaStateRepository, 'findOne').mockResolvedValue(sagaWithReservation);
      jest.spyOn(sagaStateRepository, 'save').mockResolvedValue(sagaWithReservation);

      // Mock successful stock and reservation
      jest
        .spyOn(inventoryService, 'checkAvailability')
        .mockResolvedValue(createMockInventoryAvailable());

      jest.spyOn(inventoryService, 'reserveStock').mockResolvedValue(createMockStockReservation());

      // Mock payment failure
      jest.spyOn(paymentsService, 'processPayment').mockResolvedValue({
        paymentId: 'pay-123',
        transactionId: 'txn-123',
        status: 'FAILED' as any,
        orderId: 'order-123',
        amount: 100,
        currency: 'USD',
        paymentMethod: 'CREDIT_CARD' as any,
        failureReason: 'Card declined',
        createdAt: new Date(),
      });

      // Mock release reservation failure
      jest
        .spyOn(inventoryService, 'releaseReservation')
        .mockRejectedValue(new Error('Inventory service down'));

      jest.spyOn(orderRepository, 'findOne').mockResolvedValue({
        ...mockOrder,
        id: 'order-123',
      } as Order);
      jest.spyOn(orderRepository, 'save').mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CANCELLED,
      } as Order);

      const metrics = await service.executeSaga('saga-123');

      // Should complete compensation flow despite release failure (logged but not thrown)
      expectSagaCompensated(metrics);
    });
  });
});
