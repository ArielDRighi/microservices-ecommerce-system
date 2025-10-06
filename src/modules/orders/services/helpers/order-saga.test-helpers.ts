import { Order } from '../../entities/order.entity';
import { OrderStatus } from '../../enums/order-status.enum';
import {
  SagaStateEntity,
  SagaStatus,
  SagaType,
} from '../../../../database/entities/saga-state.entity';
import { SagaStep } from '../../types/saga.types';
import { PaymentStatus, PaymentMethod } from '../../../payments/dto/payment.dto';
import { NotificationStatus } from '../../../notifications/enums';

/**
 * Factory: Mock Order for saga testing
 */
export const createMockOrder = (overrides: Partial<Order> = {}): Order => {
  return {
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
    ...overrides,
  } as Order;
};

/**
 * Factory: Mock Saga State
 */
export const createMockSagaState = (overrides: Partial<SagaStateEntity> = {}): SagaStateEntity => {
  return {
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
    ...overrides,
  };
};

/**
 * Factory: Mock Inventory Response - Available Stock
 */
export const createMockInventoryAvailable = (productId = 'product-1') => ({
  productId,
  physicalStock: 100,
  reservedStock: 0,
  availableStock: 100,
  minimumStock: 5,
  maximumStock: 200,
  reorderPoint: 10,
  location: 'MAIN_WAREHOUSE',
  lastUpdated: new Date(),
  status: 'IN_STOCK' as const,
});

/**
 * Factory: Mock Inventory Response - Low Stock
 */
export const createMockInventoryLowStock = (productId = 'product-1') => ({
  productId,
  physicalStock: 1,
  reservedStock: 0,
  availableStock: 1,
  minimumStock: 5,
  maximumStock: 200,
  reorderPoint: 10,
  location: 'MAIN_WAREHOUSE',
  lastUpdated: new Date(),
  status: 'LOW_STOCK' as const,
});

/**
 * Factory: Mock Inventory Response - Out of Stock
 */
export const createMockInventoryOutOfStock = (productId = 'product-1') => ({
  productId,
  physicalStock: 0,
  reservedStock: 0,
  availableStock: 0,
  minimumStock: 5,
  maximumStock: 200,
  reorderPoint: 10,
  location: 'MAIN_WAREHOUSE',
  lastUpdated: new Date(),
  status: 'OUT_OF_STOCK' as const,
});

/**
 * Factory: Mock Stock Reservation
 */
export const createMockStockReservation = (reservationId = 'res-123') => ({
  reservationId,
  productId: 'product-1',
  quantity: 2,
  location: 'MAIN_WAREHOUSE',
  expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  status: 'ACTIVE' as const,
  createdAt: new Date(),
});

/**
 * Factory: Mock Payment Response - Succeeded
 */
export const createMockPaymentSucceeded = () => ({
  paymentId: 'pay-123',
  transactionId: 'txn-123',
  status: PaymentStatus.SUCCEEDED,
  orderId: 'order-123',
  amount: 100,
  currency: 'USD',
  paymentMethod: PaymentMethod.CREDIT_CARD,
  createdAt: new Date(),
});

/**
 * Factory: Mock Payment Response - Failed
 */
export const createMockPaymentFailed = (failureReason = 'Insufficient funds') => ({
  paymentId: 'pay-123',
  transactionId: 'txn-123',
  status: PaymentStatus.FAILED,
  orderId: 'order-123',
  amount: 100,
  currency: 'USD',
  paymentMethod: PaymentMethod.CREDIT_CARD,
  failureReason,
  createdAt: new Date(),
});

/**
 * Factory: Mock Payment Refund
 */
export const createMockPaymentRefund = () => ({
  paymentId: 'pay-123',
  refundId: 'ref-123',
  status: PaymentStatus.REFUNDED,
  amount: 100,
  currency: 'USD',
  createdAt: new Date(),
});

/**
 * Factory: Mock Notification Success
 */
export const createMockNotificationSuccess = (messageId = 'notif-123') => ({
  success: true,
  messageId,
  status: NotificationStatus.SENT,
  sentAt: new Date(),
});

/**
 * Factory: Mock Multiple Items Order
 */
export const createMockMultiItemOrder = (): Order => {
  return {
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
        unitPrice: 30,
        totalPrice: 60,
      },
      {
        id: 'item-2',
        productId: 'product-2',
        quantity: 1,
        unitPrice: 40,
        totalPrice: 40,
      },
    ]),
  } as Order;
};

/**
 * Factory: Mock Saga State with Multiple Items
 */
export const createMockMultiItemSagaState = (): SagaStateEntity => {
  return createMockSagaState({
    stateData: {
      orderId: 'order-123',
      userId: 'user-123',
      items: [
        { productId: 'product-1', quantity: 2, price: 30 },
        { productId: 'product-2', quantity: 1, price: 40 },
      ],
      totalAmount: 100,
      currency: 'USD',
      startedAt: new Date(),
    },
  });
};

/**
 * Assertion Helper: Verify Saga Completed Successfully
 */
export const expectSagaCompleted = (metrics: any) => {
  expect(metrics.finalStatus).toBe('COMPLETED');
  expect(metrics.compensationExecuted).toBe(false);
  expect(metrics.stepMetrics).toBeDefined();
  expect(metrics.stepMetrics.length).toBeGreaterThan(0);
};

/**
 * Assertion Helper: Verify Saga Compensated
 */
export const expectSagaCompensated = (metrics: any) => {
  expect(metrics.finalStatus).toBe('COMPENSATED');
  expect(metrics.compensationExecuted).toBe(true);
};

/**
 * Assertion Helper: Verify All Steps Succeeded
 */
export const expectAllStepsSucceeded = (metrics: any) => {
  expect(metrics.stepMetrics.every((m: any) => m.success)).toBe(true);
};

/**
 * Assertion Helper: Verify Circuit Breaker Stats
 */
export const expectCircuitBreakerStats = (stats: any) => {
  expect(stats).toHaveProperty('payment');
  expect(stats).toHaveProperty('inventory');
  expect(stats).toHaveProperty('notification');
  expect(stats.payment.state).toBeDefined();
  expect(stats.inventory.state).toBeDefined();
  expect(stats.notification.state).toBeDefined();
};
