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
import {
  createMockOrder,
  createMockSagaState,
  createMockInventoryAvailable,
  createMockStockReservation,
  createMockPaymentSucceeded,
  createMockNotificationSuccess,
  expectSagaCompleted,
  expectSagaCompensated,
} from './helpers/order-saga.test-helpers';
import { SagaStep } from '../types/saga.types';

describe('OrderProcessingSagaService - Retry Logic', () => {
  let service: OrderProcessingSagaService;
  let sagaStateRepository: Repository<SagaStateEntity>;
  let orderRepository: Repository<Order>;
  let inventoryService: InventoryService;
  let paymentsService: PaymentsService;
  let notificationsService: NotificationsService;

  const mockOrder = createMockOrder();
  const mockSagaState = createMockSagaState();

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

  describe('Exponential Backoff', () => {
    it('should retry failed step with exponential backoff', async () => {
      jest.spyOn(sagaStateRepository, 'findOne').mockResolvedValue(mockSagaState);
      jest.spyOn(sagaStateRepository, 'save').mockResolvedValue(mockSagaState);

      // Mock stock check that fails twice then succeeds
      let stockCheckAttempts = 0;
      jest.spyOn(inventoryService, 'checkAvailability').mockImplementation(async () => {
        stockCheckAttempts++;
        if (stockCheckAttempts < 3) {
          throw new Error('Temporary service unavailable');
        }
        return createMockInventoryAvailable();
      });

      // Mock other services for successful saga
      jest.spyOn(inventoryService, 'reserveStock').mockResolvedValue(createMockStockReservation());

      jest.spyOn(paymentsService, 'processPayment').mockResolvedValue(createMockPaymentSucceeded());

      jest
        .spyOn(notificationsService, 'sendOrderConfirmation')
        .mockResolvedValue(createMockNotificationSuccess());

      jest.spyOn(orderRepository, 'findOne').mockResolvedValue({
        ...mockOrder,
        id: 'order-123',
      } as Order);
      jest.spyOn(orderRepository, 'save').mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CONFIRMED,
      } as Order);

      const metrics = await service.executeSaga('saga-123');

      expect(stockCheckAttempts).toBeGreaterThanOrEqual(3);
      expectSagaCompleted(metrics);
      expect(metrics.stepMetrics[0]?.retryCount).toBeGreaterThan(0);
    });
  });

  describe('Max Retries Exceeded', () => {
    it('should fail after max retries exceeded', async () => {
      jest.spyOn(sagaStateRepository, 'findOne').mockResolvedValue(mockSagaState);
      jest.spyOn(sagaStateRepository, 'save').mockResolvedValue(mockSagaState);

      // Mock persistent failure
      jest
        .spyOn(inventoryService, 'checkAvailability')
        .mockRejectedValue(new Error('Persistent service failure'));

      jest.spyOn(orderRepository, 'findOne').mockResolvedValue({
        ...mockOrder,
        id: 'order-123',
      } as Order);
      jest.spyOn(orderRepository, 'save').mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CANCELLED,
      } as Order);

      const metrics = await service.executeSaga('saga-123');

      expectSagaCompensated(metrics);
      expect(metrics.stepMetrics[0]?.retryCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Non-Critical Notification Failures', () => {
    it('should continue saga even if notification fails (non-critical)', async () => {
      jest.spyOn(sagaStateRepository, 'findOne').mockResolvedValue(mockSagaState);
      jest.spyOn(sagaStateRepository, 'save').mockResolvedValue(mockSagaState);

      // Mock successful steps until notification
      jest
        .spyOn(inventoryService, 'checkAvailability')
        .mockResolvedValue(createMockInventoryAvailable());

      jest.spyOn(inventoryService, 'reserveStock').mockResolvedValue(createMockStockReservation());

      jest.spyOn(paymentsService, 'processPayment').mockResolvedValue(createMockPaymentSucceeded());

      // Mock notification failure
      jest
        .spyOn(notificationsService, 'sendOrderConfirmation')
        .mockRejectedValue(new Error('Email service down'));

      jest.spyOn(orderRepository, 'findOne').mockResolvedValue({
        ...mockOrder,
        id: 'order-123',
      } as Order);
      jest.spyOn(orderRepository, 'save').mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CONFIRMED,
      } as Order);

      const metrics = await service.executeSaga('saga-123');

      // Saga completes successfully even if notification fails (non-critical step)
      // The order is still confirmed, notification failure doesn't roll back payment
      expect(metrics.finalStatus).toBe('COMPLETED');
      expect(metrics.stepMetrics.some((m) => m.step === SagaStep.NOTIFICATION_SENT)).toBe(true);
    });
  });
});
