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
  createMockMultiItemOrder,
  createMockMultiItemSagaState,
  createMockInventoryAvailable,
  createMockStockReservation,
  createMockPaymentSucceeded,
  createMockNotificationSuccess,
  expectSagaCompleted,
  expectCircuitBreakerStats,
} from './helpers/order-saga.test-helpers';
import { SagaStateData } from '../types/saga.types';

describe('OrderProcessingSagaService - Edge Cases', () => {
  let service: OrderProcessingSagaService;
  let sagaStateRepository: Repository<SagaStateEntity>;
  let orderRepository: Repository<Order>;
  let inventoryService: InventoryService;
  let paymentsService: PaymentsService;
  let notificationsService: NotificationsService;

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

  describe('Multiple Product Items', () => {
    it('should verify stock for all items in order', async () => {
      const multiItemOrder = createMockMultiItemOrder();
      const multiItemSagaState = createMockMultiItemSagaState();

      const createSpy = jest
        .spyOn(sagaStateRepository, 'create')
        .mockReturnValue(multiItemSagaState);
      const saveSpy = jest.spyOn(sagaStateRepository, 'save').mockResolvedValue(multiItemSagaState);

      const result = await service.startOrderProcessing(multiItemOrder);

      expect(createSpy).toHaveBeenCalled();
      expect(saveSpy).toHaveBeenCalled();
      expect(result.stateData).toHaveProperty('items');
      expect((result.stateData as unknown as SagaStateData).items).toHaveLength(2);
    });
  });

  describe('Circuit Breaker States', () => {
    it('should execute operations through circuit breakers', async () => {
      const mockSagaState = createMockMultiItemSagaState();

      jest.spyOn(sagaStateRepository, 'findOne').mockResolvedValue(mockSagaState);
      jest.spyOn(sagaStateRepository, 'save').mockResolvedValue(mockSagaState);

      // Mock all services for successful saga
      jest
        .spyOn(inventoryService, 'checkAvailability')
        .mockResolvedValue(createMockInventoryAvailable());

      jest.spyOn(inventoryService, 'reserveStock').mockResolvedValue(createMockStockReservation());

      jest.spyOn(paymentsService, 'processPayment').mockResolvedValue(createMockPaymentSucceeded());

      jest
        .spyOn(notificationsService, 'sendOrderConfirmation')
        .mockResolvedValue(createMockNotificationSuccess());

      jest.spyOn(orderRepository, 'findOne').mockResolvedValue({
        id: 'order-123',
        userId: 'user-123',
        status: OrderStatus.PENDING,
        totalAmount: 100,
        currency: 'USD',
      } as Order);

      jest.spyOn(orderRepository, 'save').mockResolvedValue({
        id: 'order-123',
        userId: 'user-123',
        status: OrderStatus.CONFIRMED,
        totalAmount: 100,
        currency: 'USD',
      } as Order);

      const metrics = await service.executeSaga('saga-123');

      // All operations should pass through circuit breakers
      expectSagaCompleted(metrics);

      // Verify circuit breaker stats are accessible
      const cbStats = service.getCircuitBreakerStats();
      expectCircuitBreakerStats(cbStats);
    });
  });
});
