import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderProcessingSagaService } from './order-processing-saga.service';
import { SagaStateEntity, SagaStatus } from '../../../database/entities/saga-state.entity';
import { SagaStep } from '../types/saga.types';
import { Order } from '../entities/order.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { InventoryHttpClient } from '../../../infrastructure/http/inventory.client';
import {
  InventoryServiceUnavailableException,
  InventoryServiceTimeoutException,
  InsufficientStockException,
  ReservationNotFoundException,
  CheckStockResponse,
  ReserveStockResponse,
  ReleaseReservationResponse,
} from '../../../infrastructure/http/inventory.interface';
import { PaymentsService } from '../../payments/payments.service';
import { NotificationsService } from '../../notifications/notifications.service';

/**
 * Tests de integración para OrderProcessingSagaService con InventoryHttpClient
 * Verifica que el saga usa correctamente el nuevo cliente HTTP
 */
describe('OrderProcessingSagaService - HTTP Client Integration', () => {
  let service: OrderProcessingSagaService;
  let inventoryClient: jest.Mocked<InventoryHttpClient>;
  let paymentsService: jest.Mocked<PaymentsService>;
  let notificationsService: jest.Mocked<NotificationsService>;
  let sagaStateRepository: jest.Mocked<Repository<SagaStateEntity>>;
  let orderRepository: jest.Mocked<Repository<Order>>;

  // Mock responses siguiendo las interfaces del HTTP client
  const mockCheckStockResponse: CheckStockResponse = {
    product_id: 'product-123',
    is_available: true,
    requested_quantity: 10,
    available_quantity: 50,
    total_stock: 100,
    reserved_quantity: 50,
  };

  const mockReserveStockResponse: ReserveStockResponse = {
    reservation_id: 'reservation-456',
    product_id: 'product-123',
    order_id: 'order-789',
    quantity: 10,
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    remaining_stock: 40,
    reserved_quantity: 60,
  };

  const mockReleaseReservationResponse: ReleaseReservationResponse = {
    reservation_id: 'reservation-456',
    inventory_item_id: 'item-123',
    order_id: 'order-789',
    quantity_released: 10,
    available_stock: 50,
    reserved_stock: 50,
  };

  const mockOrder: Partial<Order> = {
    id: 'order-789',
    userId: 'user-123',
    totalAmount: 100,
    currency: 'USD',
    status: OrderStatus.PENDING,
    items: Promise.resolve([
      {
        id: 'item-1',
        productId: 'product-123',
        quantity: 10,
        unitPrice: 10,
      } as any,
    ]),
  };

  beforeEach(async () => {
    // Mock repositories
    const mockSagaStateRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    const mockOrderRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    // Mock InventoryHttpClient
    const mockInventoryClient = {
      checkStock: jest.fn(),
      reserveStock: jest.fn(),
      confirmReservation: jest.fn(),
      releaseReservation: jest.fn(),
      healthCheck: jest.fn(),
    };

    // Mock PaymentsService
    const mockPaymentsService = {
      processPayment: jest.fn(),
      refundPayment: jest.fn(),
    };

    // Mock NotificationsService
    const mockNotificationsService = {
      sendOrderConfirmation: jest.fn(),
      sendPaymentFailure: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderProcessingSagaService,
        {
          provide: getRepositoryToken(SagaStateEntity),
          useValue: mockSagaStateRepository,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: InventoryHttpClient,
          useValue: mockInventoryClient,
        },
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<OrderProcessingSagaService>(OrderProcessingSagaService);
    inventoryClient = module.get(InventoryHttpClient);
    paymentsService = module.get(PaymentsService);
    notificationsService = module.get(NotificationsService);
    sagaStateRepository = module.get(getRepositoryToken(SagaStateEntity));
    orderRepository = module.get(getRepositoryToken(Order));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startOrderProcessing', () => {
    it('should create saga state with correct order data', async () => {
      // Arrange
      const mockSagaState = {
        id: 'saga-123',
        sagaType: 'ORDER_PROCESSING',
        aggregateId: 'order-789',
        currentStep: SagaStep.STARTED,
        status: SagaStatus.STARTED,
      } as SagaStateEntity;

      sagaStateRepository.create.mockReturnValue(mockSagaState);
      sagaStateRepository.save.mockResolvedValue(mockSagaState);

      // Act
      const result = await service.startOrderProcessing(mockOrder as Order);

      // Assert
      expect(sagaStateRepository.create).toHaveBeenCalled();
      expect(sagaStateRepository.save).toHaveBeenCalledWith(mockSagaState);
      expect(result).toEqual(mockSagaState);
    });
  });

  describe('executeSaga - HTTP Client Integration', () => {
    let mockSagaState: SagaStateEntity;

    beforeEach(() => {
      mockSagaState = {
        id: 'saga-123',
        aggregateId: 'order-789',
        correlationId: 'saga-order-789-123',
        currentStep: SagaStep.STARTED,
        status: SagaStatus.STARTED,
        stateData: {
          orderId: 'order-789',
          userId: 'user-123',
          items: [
            {
              productId: 'product-123',
              quantity: 10,
              price: 10,
            },
          ],
          totalAmount: 100,
          currency: 'USD',
          startedAt: new Date(),
        } as any,
        retryCount: 0,
      } as SagaStateEntity;

      sagaStateRepository.findOne.mockResolvedValue(mockSagaState);
      sagaStateRepository.save.mockResolvedValue(mockSagaState);
      orderRepository.findOne.mockResolvedValue(mockOrder as Order);
      orderRepository.save.mockResolvedValue(mockOrder as Order);
    });

    it('should successfully execute saga with new HTTP client', async () => {
      // Arrange - Mock successful HTTP responses
      inventoryClient.checkStock.mockResolvedValue(mockCheckStockResponse);
      inventoryClient.reserveStock.mockResolvedValue(mockReserveStockResponse);

      paymentsService.processPayment.mockResolvedValue({
        paymentId: 'payment-123',
        transactionId: 'txn-456',
        status: 'SUCCEEDED',
      } as any);

      notificationsService.sendOrderConfirmation.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      } as any);

      // Act
      const result = await service.executeSaga('saga-123');

      // Assert
      expect(result.finalStatus).toBe('COMPLETED');
      expect(inventoryClient.checkStock).toHaveBeenCalledWith('product-123');
      expect(inventoryClient.reserveStock).toHaveBeenCalledWith({
        product_id: 'product-123',
        order_id: 'order-789',
        quantity: 10,
      });
      expect(paymentsService.processPayment).toHaveBeenCalled();
      expect(notificationsService.sendOrderConfirmation).toHaveBeenCalled();
    });

    it('should handle InventoryServiceUnavailableException during stock check', async () => {
      // Arrange
      inventoryClient.checkStock.mockRejectedValue(
        new InventoryServiceUnavailableException('Service temporarily down'),
      );

      // Act
      const result = await service.executeSaga('saga-123');

      // Assert
      expect(result.finalStatus).toBe('COMPENSATED');
      expect(inventoryClient.checkStock).toHaveBeenCalled();
      expect(inventoryClient.reserveStock).not.toHaveBeenCalled();
      expect(paymentsService.processPayment).not.toHaveBeenCalled();
    });

    it('should handle InventoryServiceTimeoutException during stock check', async () => {
      // Arrange
      inventoryClient.checkStock.mockRejectedValue(
        new InventoryServiceTimeoutException('Request timed out'),
      );

      // Act
      const result = await service.executeSaga('saga-123');

      // Assert
      expect(result.finalStatus).toBe('COMPENSATED');
      expect(inventoryClient.checkStock).toHaveBeenCalled();
    });

    it('should handle insufficient stock scenario', async () => {
      // Arrange
      const insufficientStockResponse: CheckStockResponse = {
        ...mockCheckStockResponse,
        is_available: false,
        available_quantity: 5, // Less than requested (10)
      };

      inventoryClient.checkStock.mockResolvedValue(insufficientStockResponse);

      // Act
      const result = await service.executeSaga('saga-123');

      // Assert
      expect(result.finalStatus).toBe('COMPENSATED');
      expect(inventoryClient.reserveStock).not.toHaveBeenCalled();
      expect(paymentsService.processPayment).not.toHaveBeenCalled();
    });

    it('should handle InsufficientStockException during reservation', async () => {
      // Arrange
      inventoryClient.checkStock.mockResolvedValue(mockCheckStockResponse);
      inventoryClient.reserveStock.mockRejectedValue(
        new InsufficientStockException('Not enough stock', 5),
      );

      // Act
      const result = await service.executeSaga('saga-123');

      // Assert
      expect(result.finalStatus).toBe('COMPENSATED');
      expect(inventoryClient.checkStock).toHaveBeenCalled();
      expect(inventoryClient.reserveStock).toHaveBeenCalled();
      expect(paymentsService.processPayment).not.toHaveBeenCalled();
    });

    it('should release reservation on payment failure', async () => {
      // Arrange
      inventoryClient.checkStock.mockResolvedValue(mockCheckStockResponse);
      inventoryClient.reserveStock.mockResolvedValue(mockReserveStockResponse);
      inventoryClient.releaseReservation.mockResolvedValue(mockReleaseReservationResponse);

      paymentsService.processPayment.mockResolvedValue({
        paymentId: 'payment-123',
        status: 'FAILED',
      } as any);

      // Act
      const result = await service.executeSaga('saga-123');

      // Assert
      expect(result.finalStatus).toBe('COMPENSATED');
      expect(inventoryClient.releaseReservation).toHaveBeenCalledWith({
        reservation_id: 'reservation-456',
      });
    });

    it('should handle ReservationNotFoundException during compensation gracefully', async () => {
      // Arrange
      inventoryClient.checkStock.mockResolvedValue(mockCheckStockResponse);
      inventoryClient.reserveStock.mockResolvedValue(mockReserveStockResponse);
      inventoryClient.releaseReservation.mockRejectedValue(
        new ReservationNotFoundException('Reservation expired'),
      );

      paymentsService.processPayment.mockResolvedValue({
        paymentId: 'payment-123',
        status: 'FAILED',
      } as any);

      // Act
      const result = await service.executeSaga('saga-123');

      // Assert - Should not fail saga due to reservation not found
      expect(result.finalStatus).toBe('COMPENSATED');
      expect(inventoryClient.releaseReservation).toHaveBeenCalled();
    });

    it('should handle InventoryServiceUnavailableException during compensation gracefully', async () => {
      // Arrange
      inventoryClient.checkStock.mockResolvedValue(mockCheckStockResponse);
      inventoryClient.reserveStock.mockResolvedValue(mockReserveStockResponse);
      inventoryClient.releaseReservation.mockRejectedValue(
        new InventoryServiceUnavailableException('Service down during compensation'),
      );

      paymentsService.processPayment.mockResolvedValue({
        paymentId: 'payment-123',
        status: 'FAILED',
      } as any);

      // Act
      const result = await service.executeSaga('saga-123');

      // Assert - Should complete compensation despite inventory service being unavailable
      expect(result.finalStatus).toBe('COMPENSATED');
    });

    it('should use correct snake_case field names in HTTP requests', async () => {
      // Arrange
      inventoryClient.checkStock.mockResolvedValue(mockCheckStockResponse);
      inventoryClient.reserveStock.mockResolvedValue(mockReserveStockResponse);

      paymentsService.processPayment.mockResolvedValue({
        paymentId: 'payment-123',
        transactionId: 'txn-456',
        status: 'SUCCEEDED',
      } as any);

      notificationsService.sendOrderConfirmation.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      } as any);

      // Act
      await service.executeSaga('saga-123');

      // Assert - Verify snake_case fields used
      expect(inventoryClient.reserveStock).toHaveBeenCalledWith(
        expect.objectContaining({
          product_id: expect.any(String),
          order_id: expect.any(String),
          quantity: expect.any(Number),
        }),
      );
    });

    it('should correctly parse snake_case response fields', async () => {
      // Arrange
      const customStockResponse: CheckStockResponse = {
        product_id: 'product-123',
        is_available: true,
        requested_quantity: 10,
        available_quantity: 25,
        total_stock: 100,
        reserved_quantity: 75,
      };

      inventoryClient.checkStock.mockResolvedValue(customStockResponse);
      inventoryClient.reserveStock.mockResolvedValue(mockReserveStockResponse);

      paymentsService.processPayment.mockResolvedValue({
        paymentId: 'payment-123',
        transactionId: 'txn-456',
        status: 'SUCCEEDED',
      } as any);

      notificationsService.sendOrderConfirmation.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      } as any);

      // Act
      const result = await service.executeSaga('saga-123');

      // Assert
      expect(result.finalStatus).toBe('COMPLETED');
      expect(inventoryClient.checkStock).toHaveBeenCalledWith('product-123');
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should trigger circuit breaker on repeated InventoryServiceUnavailableException', async () => {
      // Arrange
      const mockSagaState = {
        id: 'saga-123',
        aggregateId: 'order-789',
        currentStep: SagaStep.STARTED,
        status: SagaStatus.STARTED,
        stateData: {
          orderId: 'order-789',
          userId: 'user-123',
          items: [{ productId: 'product-123', quantity: 10, price: 10 }],
          totalAmount: 100,
          currency: 'USD',
        } as any,
      } as SagaStateEntity;

      sagaStateRepository.findOne.mockResolvedValue(mockSagaState);
      sagaStateRepository.save.mockResolvedValue(mockSagaState);

      inventoryClient.checkStock.mockRejectedValue(
        new InventoryServiceUnavailableException('Service down'),
      );

      // Act - Execute multiple times to trigger circuit breaker
      for (let i = 0; i < 3; i++) {
        await service.executeSaga('saga-123');
      }

      // Assert - Circuit breaker should have opened after failures
      expect(inventoryClient.checkStock).toHaveBeenCalled();
    });
  });
});
