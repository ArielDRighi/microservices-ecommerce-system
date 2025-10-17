import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderProcessingSagaService } from './order-processing-saga.service';
import { SagaStateEntity, SagaStatus } from '../../../database/entities/saga-state.entity';
import { Order } from '../entities/order.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { InventoryServiceClient } from '../../inventory-client/inventory-client.service';
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
  expectAllStepsSucceeded,
  expectCircuitBreakerStats,
} from './helpers/order-saga.test-helpers';

describe('OrderProcessingSagaService - Core Functionality', () => {
  let service: OrderProcessingSagaService;
  let sagaStateRepository: Repository<SagaStateEntity>;
  let orderRepository: Repository<Order>;
  let inventoryClient: InventoryServiceClient;
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
          provide: InventoryServiceClient,
          useValue: {
            checkStock: jest.fn(),
            reserveStock: jest.fn(),
            confirmReservation: jest.fn(),
            releaseReservation: jest.fn(),
            healthCheck: jest.fn(),
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
    inventoryClient = module.get<InventoryServiceClient>(InventoryServiceClient);
    paymentsService = module.get<PaymentsService>(PaymentsService);
    notificationsService = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  describe('Service Definition', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
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
      jest.spyOn(inventoryClient, 'checkStock').mockResolvedValue(createMockInventoryAvailable());

      // Mock successful reservation
      jest.spyOn(inventoryClient, 'reserveStock').mockResolvedValue(createMockStockReservation());

      // Mock successful payment
      jest.spyOn(paymentsService, 'processPayment').mockResolvedValue(createMockPaymentSucceeded());

      // Mock successful notification
      jest
        .spyOn(notificationsService, 'sendOrderConfirmation')
        .mockResolvedValue(createMockNotificationSuccess());

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

      expectSagaCompleted(metrics);
      expectAllStepsSucceeded(metrics);
      expect(metrics.stepMetrics).toHaveLength(5);
    });
  });

  describe('Circuit Breaker', () => {
    it('should have circuit breaker stats', () => {
      const stats = service.getCircuitBreakerStats();

      expectCircuitBreakerStats(stats);
    });
  });
});
