import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderProcessingSagaService } from '../services/order-processing-saga.service';
import {
  SagaStateEntity,
  SagaStatus,
  SagaType,
} from '../../../database/entities/saga-state.entity';
import { Order } from '../entities/order.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { InventoryService } from '../../inventory/inventory.service';
import { PaymentsService } from '../../payments/payments.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType, NotificationStatus } from '../../notifications/enums';
import { SagaStep } from '../types/saga.types';
import { PaymentStatus, PaymentMethod } from '../../payments/dto/payment.dto';

describe('OrderProcessingSagaService', () => {
  let service: OrderProcessingSagaService;
  let sagaStateRepository: Repository<SagaStateEntity>;
  let orderRepository: Repository<Order>;
  let inventoryService: InventoryService;
  let paymentsService: PaymentsService;
  let notificationsService: NotificationsService;

  const mockOrder = {
    id: 'order-123',
    userId: 'user-123',
    status: OrderStatus.PENDING,
    totalAmount: 100,
    currency: 'USD',
    items: Promise.resolve([
      {
        id: 'item-1',
        productId: 'product-1',
        quantity: 2,
        unitPrice: 50,
        totalPrice: 100,
      },
    ]),
  } as Order;

  const mockSagaState: SagaStateEntity = {
    id: 'saga-123',
    sagaType: SagaType.ORDER_PROCESSING,
    aggregateId: 'order-123',
    correlationId: 'saga-order-123-123456789',
    currentStep: SagaStep.STARTED,
    status: SagaStatus.STARTED,
    stateData: {
      orderId: 'order-123',
      userId: 'user-123',
      items: [{ productId: 'product-1', quantity: 2, price: 50 }],
      totalAmount: 100,
      currency: 'USD',
      startedAt: new Date(),
    },
    errorDetails: null,
    retryCount: 0,
    completedAt: null,
    failedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

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
    // Clear all mocks after each test
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Give time for any pending timers to clear
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startOrderProcessing', () => {
    it('should create and save saga state for an order', async () => {
      const createSpy = jest.spyOn(sagaStateRepository, 'create').mockReturnValue(mockSagaState);
      const saveSpy = jest.spyOn(sagaStateRepository, 'save').mockResolvedValue(mockSagaState);

      const result = await service.startOrderProcessing(mockOrder);

      expect(createSpy).toHaveBeenCalled();
      expect(saveSpy).toHaveBeenCalled();
      expect(result.id).toBe('saga-123');
      expect(result.status).toBe(SagaStatus.STARTED);
    });
  });

  describe('executeSaga - Success Path', () => {
    it('should successfully execute all saga steps and confirm order', async () => {
      jest.spyOn(sagaStateRepository, 'findOne').mockResolvedValue(mockSagaState);
      jest.spyOn(sagaStateRepository, 'save').mockResolvedValue(mockSagaState);

      // Mock successful stock verification
      jest.spyOn(inventoryService, 'checkAvailability').mockResolvedValue({
        productId: 'product-1',
        physicalStock: 100,
        reservedStock: 0,
        availableStock: 100,
        minimumStock: 5,
        maximumStock: 200,
        reorderPoint: 10,
        location: 'MAIN_WAREHOUSE',
        lastUpdated: new Date(),
        status: 'IN_STOCK',
      });

      // Mock successful reservation
      jest.spyOn(inventoryService, 'reserveStock').mockResolvedValue({
        reservationId: 'res-123',
        productId: 'product-1',
        quantity: 2,
        location: 'MAIN_WAREHOUSE',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'ACTIVE',
        createdAt: new Date(),
      });

      // Mock successful payment
      jest.spyOn(paymentsService, 'processPayment').mockResolvedValue({
        paymentId: 'pay-123',
        transactionId: 'txn-123',
        status: PaymentStatus.SUCCEEDED,
        orderId: 'order-123',
        amount: 100,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        createdAt: new Date(),
      });

      // Mock successful notification
      jest.spyOn(notificationsService, 'sendOrderConfirmation').mockResolvedValue({
        success: true,
        messageId: 'notif-123',
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      });

      // Mock order update
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue({
        ...mockOrder,
        id: 'order-123',
      } as Order);
      jest.spyOn(orderRepository, 'save').mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CONFIRMED,
      } as Order);

      const metrics = await service.executeSaga('saga-123');

      expect(metrics.finalStatus).toBe('COMPLETED');
      expect(metrics.compensationExecuted).toBe(false);
      expect(metrics.stepMetrics).toHaveLength(5);
      expect(metrics.stepMetrics.every((m) => m.success)).toBe(true);
    });
  });

  describe('executeSaga - Failure Scenarios', () => {
    it('should compensate when stock is not available', async () => {
      jest.spyOn(sagaStateRepository, 'findOne').mockResolvedValue(mockSagaState);
      jest.spyOn(sagaStateRepository, 'save').mockResolvedValue(mockSagaState);

      // Mock insufficient stock
      jest.spyOn(inventoryService, 'checkAvailability').mockResolvedValue({
        productId: 'product-1',
        physicalStock: 1,
        reservedStock: 0,
        availableStock: 1,
        minimumStock: 5,
        maximumStock: 200,
        reorderPoint: 10,
        location: 'MAIN_WAREHOUSE',
        lastUpdated: new Date(),
        status: 'LOW_STOCK',
      });

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

      expect(metrics.finalStatus).toBe('COMPENSATED');
      expect(metrics.compensationExecuted).toBe(true);
    });

    it('should compensate and release inventory when payment fails', async () => {
      jest.spyOn(sagaStateRepository, 'findOne').mockResolvedValue({
        ...mockSagaState,
        stateData: {
          ...mockSagaState.stateData,
          reservationId: 'res-123',
        },
      });
      jest.spyOn(sagaStateRepository, 'save').mockResolvedValue(mockSagaState);

      // Mock successful stock operations
      jest.spyOn(inventoryService, 'checkAvailability').mockResolvedValue({
        productId: 'product-1',
        physicalStock: 100,
        reservedStock: 0,
        availableStock: 100,
        minimumStock: 5,
        maximumStock: 200,
        reorderPoint: 10,
        location: 'MAIN_WAREHOUSE',
        lastUpdated: new Date(),
        status: 'IN_STOCK',
      });

      jest.spyOn(inventoryService, 'reserveStock').mockResolvedValue({
        reservationId: 'res-123',
        productId: 'product-1',
        quantity: 2,
        location: 'MAIN_WAREHOUSE',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        status: 'ACTIVE',
        createdAt: new Date(),
      });

      // Mock failed payment
      jest.spyOn(paymentsService, 'processPayment').mockResolvedValue({
        paymentId: 'pay-123',
        transactionId: 'txn-123',
        status: PaymentStatus.FAILED,
        orderId: 'order-123',
        amount: 100,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        failureReason: 'Insufficient funds',
        createdAt: new Date(),
      });

      // Mock release reservation
      jest.spyOn(inventoryService, 'releaseReservation').mockResolvedValue({
        productId: 'product-1',
        physicalStock: 100,
        reservedStock: 0,
        availableStock: 100,
        minimumStock: 5,
        maximumStock: 200,
        reorderPoint: 10,
        location: 'MAIN_WAREHOUSE',
        lastUpdated: new Date(),
        status: 'IN_STOCK',
      });

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

      expect(metrics.finalStatus).toBe('COMPENSATED');
      expect(metrics.compensationExecuted).toBe(true);
      expect(inventoryService.releaseReservation).toHaveBeenCalled();
    });
  });

  describe('Circuit Breaker', () => {
    it('should have circuit breaker stats', () => {
      const stats = service.getCircuitBreakerStats();

      expect(stats).toHaveProperty('payment');
      expect(stats).toHaveProperty('inventory');
      expect(stats).toHaveProperty('notification');
      expect(stats.payment.state).toBeDefined();
    });
  });
});
