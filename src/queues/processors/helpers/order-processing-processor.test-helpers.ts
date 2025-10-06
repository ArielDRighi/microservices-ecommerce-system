/* eslint-disable @typescript-eslint/no-explicit-any */
import { Job } from 'bull';

/**
 * Factory: Create Mock Order Processing Job
 */
export const createMockOrderJob = (overrides: Partial<any> = {}): Partial<Job> => ({
  id: '1',
  name: 'create-order',
  data: {
    jobId: 'order-123',
    orderId: 'order-123',
    sagaId: 'saga-123',
    userId: 'user-456',
    items: [
      { productId: 'prod-1', quantity: 2 },
      { productId: 'prod-2', quantity: 1 },
    ],
    totalAmount: 299.99,
    currency: 'USD',
    shippingAddress: {
      street: '123 Test St',
      city: 'Test City',
      country: 'US',
    },
    createdAt: new Date(),
    ...(overrides['data'] || {}),
  },
  attemptsMade: 0,
  opts: { attempts: 3 },
  progress: jest.fn(),
  ...overrides,
});

/**
 * Factory: Create Mock Confirm Order Job
 */
export const createMockConfirmOrderJob = (overrides: Partial<any> = {}): Partial<Job> => ({
  id: '3',
  name: 'confirm-order',
  data: {
    jobId: 'confirm-order-123',
    orderId: 'order-123',
    sagaId: 'saga-confirm-123',
    userId: 'user-456',
    items: [{ productId: 'prod-1', quantity: 1 }],
    totalAmount: 99.99,
    currency: 'USD',
    paymentId: 'payment-456',
    createdAt: new Date(),
    ...(overrides['data'] || {}),
  },
  attemptsMade: 0,
  opts: { attempts: 3 },
  progress: jest.fn(),
  ...overrides,
});

/**
 * Factory: Create Mock Cancel Order Job
 */
export const createMockCancelOrderJob = (overrides: Partial<any> = {}): Partial<Job> => ({
  id: '4',
  name: 'cancel-order',
  data: {
    jobId: 'cancel-order-123',
    orderId: 'order-123',
    sagaId: 'saga-cancel-123',
    userId: 'user-456',
    items: [{ productId: 'prod-1', quantity: 1 }],
    totalAmount: 99.99,
    currency: 'USD',
    reason: 'Customer requested cancellation',
    createdAt: new Date(),
    ...(overrides['data'] || {}),
  },
  attemptsMade: 0,
  opts: { attempts: 3 },
  progress: jest.fn(),
  ...overrides,
});

/**
 * Factory: Create Mock Saga Service
 */
export const createMockSagaService = () => ({
  executeSaga: jest.fn().mockResolvedValue({
    finalStatus: 'COMPLETED',
    totalDurationMs: 1000,
    compensationExecuted: false,
    stepMetrics: [
      { step: 'STOCK_VERIFIED', success: true, durationMs: 100, retries: 0 },
      { step: 'STOCK_RESERVED', success: true, durationMs: 150, retries: 0 },
      { step: 'PAYMENT_PROCESSING', success: true, durationMs: 200, retries: 0 },
      { step: 'PAYMENT_COMPLETED', success: true, durationMs: 150, retries: 0 },
      { step: 'NOTIFICATION_SENT', success: true, durationMs: 100, retries: 0 },
      { step: 'CONFIRMED', success: true, durationMs: 100, retries: 0 },
    ],
    circuitBreakerStats: {
      payment: { state: 'CLOSED', failures: 0, successes: 1, lastFailureTime: null },
      inventory: { state: 'CLOSED', failures: 0, successes: 2, lastFailureTime: null },
      notification: { state: 'CLOSED', failures: 0, successes: 1, lastFailureTime: null },
    },
  }),
  getCircuitBreakerStats: jest.fn().mockReturnValue({
    payment: { state: 'CLOSED', failureCount: 0, successCount: 1, lastFailureTime: null },
    inventory: { state: 'CLOSED', failureCount: 0, successCount: 2, lastFailureTime: null },
    notification: { state: 'CLOSED', failureCount: 0, successCount: 1, lastFailureTime: null },
  }),
});

/**
 * Factory: Create Mock Saga Metrics (Compensated)
 */
export const createMockSagaMetricsCompensated = () => ({
  finalStatus: 'COMPENSATED',
  totalDurationMs: 2500,
  compensationExecuted: true,
  orderId: 'order-compensated',
  stepMetrics: [
    { step: 'STOCK_VERIFIED', success: true, durationMs: 100, retryCount: 0 },
    { step: 'STOCK_RESERVED', success: true, durationMs: 150, retryCount: 0 },
    { step: 'PAYMENT_PROCESSING', success: false, durationMs: 300, retryCount: 2 },
    { step: 'COMPENSATION', success: true, durationMs: 200, retryCount: 0 },
  ],
});

/**
 * Factory: Create Mock Saga Metrics (Failed)
 */
export const createMockSagaMetricsFailed = () => ({
  finalStatus: 'FAILED',
  totalDurationMs: 1800,
  compensationExecuted: false,
  orderId: 'order-failed',
  stepMetrics: [
    { step: 'STOCK_VERIFIED', success: true, durationMs: 100, retryCount: 0 },
    { step: 'STOCK_RESERVED', success: false, durationMs: 200, retryCount: 3 },
  ],
});

/**
 * Factory: Create Mock Circuit Breaker Stats with Different States
 */
export const createMockCircuitBreakerStatsOpen = () => ({
  payment: { state: 'OPEN', failureCount: 5, successCount: 2, lastFailureTime: new Date() },
  inventory: {
    state: 'HALF_OPEN',
    failureCount: 3,
    successCount: 8,
    lastFailureTime: new Date(),
  },
  notification: { state: 'CLOSED', failureCount: 0, successCount: 10, lastFailureTime: null },
});

/**
 * Assertion Helper: Verify Job Result Success
 */
export const expectJobSuccess = (result: any) => {
  expect(result.success).toBe(true);
  expect(result.processedAt).toBeDefined();
};

/**
 * Assertion Helper: Verify Progress Called
 */
export const expectProgressCalled = (job: Partial<Job>, expectedMessage?: string) => {
  expect(job.progress).toHaveBeenCalled();
  if (expectedMessage) {
    expect(job.progress).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(expectedMessage),
      }),
    );
  }
};
