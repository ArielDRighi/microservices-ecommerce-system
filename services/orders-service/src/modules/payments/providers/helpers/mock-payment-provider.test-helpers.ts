/**
 * Helper functions and utilities for testing MockPaymentProvider
 * Provides mock setup, factory functions, and deterministic random mocking
 */

import {
  ProcessPaymentDto,
  PaymentMethod,
  RefundPaymentDto,
  PaymentResponseDto,
  RefundResponseDto,
} from '../../dto/payment.dto';
import type { MockPaymentProvider } from '../mock-payment.provider';

/**
 * Mock Math.random() to force successful payment scenarios
 * Success occurs when random * 100 < 80
 */
export function mockSuccessfulOutcome(): jest.SpyInstance {
  return jest.spyOn(Math, 'random').mockReturnValue(0.5); // 0.5 * 100 = 50 < 80
}

/**
 * Mock Math.random() to force temporary failure scenarios
 * Temporary failure occurs when 80 <= random * 100 < 95
 */
export function mockTemporaryFailure(): jest.SpyInstance {
  return jest.spyOn(Math, 'random').mockReturnValue(0.85); // 0.85 * 100 = 85
}

/**
 * Mock Math.random() to force permanent failure scenarios
 * Permanent failure occurs when random * 100 >= 95
 */
export function mockPermanentFailure(): jest.SpyInstance {
  return jest.spyOn(Math, 'random').mockReturnValue(0.99); // 0.99 * 100 = 99 >= 95
}

/**
 * Mock Math.random() with deterministic sequence for predictable tests
 * First call determines success/failure, subsequent calls for IDs
 */
export function mockDeterministicSequence(successOutcome = true): jest.SpyInstance {
  let callCount = 0;
  return jest.spyOn(Math, 'random').mockImplementation(() => {
    if (callCount++ === 0) {
      return successOutcome ? 0.5 : 0.99; // First call: success (0.5) or failure (0.99)
    }
    return 0.123456789 + callCount * 0.001; // Subsequent calls: fixed sequence for IDs
  });
}

/**
 * Factory function to create a ProcessPaymentDto with default values
 */
export function createMockProcessPaymentDto(
  overrides?: Partial<ProcessPaymentDto>,
): ProcessPaymentDto {
  return {
    orderId: `order-${Date.now()}`,
    amount: 100.0,
    currency: 'USD',
    paymentMethod: PaymentMethod.CREDIT_CARD,
    customerId: 'customer-123',
    idempotencyKey: `idem-${Date.now()}`,
    ...overrides,
  };
}

/**
 * Factory function to create a RefundPaymentDto with default values
 */
export function createMockRefundPaymentDto(
  paymentId: string,
  overrides?: Partial<RefundPaymentDto>,
): RefundPaymentDto {
  return {
    paymentId,
    amount: 50.0,
    reason: 'Customer requested refund',
    ...overrides,
  };
}

/**
 * Factory function to create multiple ProcessPaymentDto with unique identifiers
 */
export function createMultipleMockPayments(
  count: number,
  baseOverrides?: Partial<ProcessPaymentDto>,
): ProcessPaymentDto[] {
  return Array.from({ length: count }, (_, i) =>
    createMockProcessPaymentDto({
      ...baseOverrides,
      orderId: `order-${i}`,
      idempotencyKey: `key-${i}`,
    }),
  );
}

/**
 * Assertion helper for payment response structure
 */
export function expectValidMockPaymentResponse(
  payment: PaymentResponseDto,
  expectedDto: ProcessPaymentDto,
) {
  expect(payment).toBeDefined();
  expect(payment.paymentId).toBeDefined();
  expect(payment.transactionId).toBeDefined();
  expect(payment.orderId).toBe(expectedDto.orderId);
  expect(payment.amount).toBe(expectedDto.amount);
  expect(payment.currency).toBe(expectedDto.currency);
  expect(payment.paymentMethod).toBe(expectedDto.paymentMethod);
  expect(payment.createdAt).toBeInstanceOf(Date);
}

/**
 * Assertion helper for refund response structure
 */
export function expectValidRefundResponse(
  refund: RefundResponseDto,
  expectedPaymentId: string,
  expectedAmount: number,
) {
  expect(refund).toBeDefined();
  expect(refund.refundId).toBeDefined();
  expect(refund.paymentId).toBe(expectedPaymentId);
  expect(refund.amount).toBe(expectedAmount);
}

/**
 * Helper to process payment with retries (for probabilistic tests)
 */
export async function processPaymentWithRetries(
  provider: MockPaymentProvider,
  dto: ProcessPaymentDto,
  maxAttempts = 10,
): Promise<PaymentResponseDto | null> {
  let result: PaymentResponseDto | null = null;

  for (let i = 0; i < maxAttempts && !result; i++) {
    try {
      result = await provider.processPayment({
        ...dto,
        orderId: `${dto.orderId}-${i}`,
        idempotencyKey: `${dto.idempotencyKey}-${i}`,
      });
    } catch (error) {
      // Continue trying
    }
  }

  return result;
}
