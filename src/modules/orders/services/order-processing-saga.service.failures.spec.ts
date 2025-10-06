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
  createMockInventoryLowStock,
  createMockInventoryOutOfStock,
  createMockStockReservation,
  createMockPaymentFailed,
  createMockInventoryAvailable,
  expectSagaCompensated,
} from './helpers/order-saga.test-helpers';

describe('OrderProcessingSagaService - Failure Scenarios', () => {
  let service: OrderProcessingSagaService;
  let sagaStateRepository: Repository<SagaStateEntity>;
  let orderRepository: Repository<Order>;
  let inventoryService: InventoryService;
  let paymentsService: PaymentsService;

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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  describe('Stock Availability Failures', () => {
    it('should compensate when stock is not available', async () => {
      jest.spyOn(sagaStateRepository, 'findOne').mockResolvedValue(mockSagaState);
      jest.spyOn(sagaStateRepository, 'save').mockResolvedValue(mockSagaState);

      // Mock insufficient stock
      jest
        .spyOn(inventoryService, 'checkAvailability')
        .mockResolvedValue(createMockInventoryLowStock());

      // Mock order cancellation
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
    });
  });

  describe('Payment Failures', () => {
    it('should compensate and release inventory when payment fails', async () => {
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

      // Mock successful stock operations
      jest
        .spyOn(inventoryService, 'checkAvailability')
        .mockResolvedValue(createMockInventoryAvailable());

      jest.spyOn(inventoryService, 'reserveStock').mockResolvedValue(createMockStockReservation());

      // Mock failed payment
      jest.spyOn(paymentsService, 'processPayment').mockResolvedValue(createMockPaymentFailed());

      // Mock release reservation
      jest
        .spyOn(inventoryService, 'releaseReservation')
        .mockResolvedValue(createMockInventoryAvailable());

      // Mock order cancellation
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
      expect(inventoryService.releaseReservation).toHaveBeenCalled();
    });
  });

  describe('Saga Not Found', () => {
    it('should throw error if saga state not found', async () => {
      jest.spyOn(sagaStateRepository, 'findOne').mockResolvedValue(null);

      await expect(service.executeSaga('nonexistent-saga')).rejects.toThrow(
        'Saga state not found: nonexistent-saga',
      );
    });
  });

  describe('Non-Retryable Errors', () => {
    it('should not retry when error is marked as non-retryable', async () => {
      jest.spyOn(sagaStateRepository, 'findOne').mockResolvedValue(mockSagaState);
      jest.spyOn(sagaStateRepository, 'save').mockResolvedValue(mockSagaState);

      // Mock insufficient stock (non-retryable)
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

      const metrics = await service.executeSaga('saga-123');

      expectSagaCompensated(metrics);
      expect(metrics.stepMetrics[0]?.retryCount).toBe(0);
    });
  });
});
