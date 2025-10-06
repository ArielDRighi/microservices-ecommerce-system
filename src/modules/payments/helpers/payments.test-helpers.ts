/**
 * Helper functions and utilities for testing PaymentsService
 * Provides mock setup, factory functions, and assertion utilities
 */

import { BadRequestException } from '@nestjs/common';
import { ProcessPaymentDto, PaymentMethod, PaymentResponseDto } from '../dto/payment.dto';
import type { PaymentsService } from '../payments.service';

/**
 * Mock Math.random() to force successful payment scenarios
 * Success occurs when random < 0.8
 */
export function mockSuccessfulPayment(): jest.SpyInstance {
  return jest.spyOn(Math, 'random').mockReturnValue(0.5); // Ensures success (< 0.8)
}

/**
 * Mock Math.random() to force payment failure scenarios
 * Failure occurs when random >= 0.8
 */
export function mockFailedPayment(): jest.SpyInstance {
  return jest.spyOn(Math, 'random').mockReturnValue(0.85); // Ensures failure (>= 0.8)
}

/**
 * Factory function to create a ProcessPaymentDto with default values
 */
export function createProcessPaymentDto(overrides?: Partial<ProcessPaymentDto>): ProcessPaymentDto {
  return {
    orderId: `order-${Date.now()}`,
    amount: 100.0,
    currency: 'USD',
    paymentMethod: PaymentMethod.CREDIT_CARD,
    ...overrides,
  };
}

/**
 * Factory function to create multiple ProcessPaymentDto with sequential IDs
 */
export function createMultiplePaymentDtos(
  count: number,
  baseOverrides?: Partial<ProcessPaymentDto>,
): ProcessPaymentDto[] {
  return Array.from({ length: count }, (_, i) =>
    createProcessPaymentDto({
      ...baseOverrides,
      orderId: `order-${i}`,
    }),
  );
}

/**
 * Helper to create a successful payment with retries
 * Useful for probabilistic tests
 */
export async function createSuccessfulPayment(
  service: PaymentsService,
  dto?: Partial<ProcessPaymentDto>,
  maxAttempts = 10,
): Promise<PaymentResponseDto | null> {
  let payment: PaymentResponseDto | null = null;

  for (let i = 0; i < maxAttempts && !payment; i++) {
    try {
      payment = await service.processPayment(
        createProcessPaymentDto({
          ...dto,
          orderId: `${dto?.orderId || 'order'}-${i}`,
        }),
      );
    } catch (error) {
      // Continue trying
    }
  }

  return payment;
}

/**
 * Assertion helper for successful payment response
 */
export function expectSuccessfulPayment(
  result: PaymentResponseDto,
  expectedDto: ProcessPaymentDto,
) {
  expect(result).toHaveProperty('paymentId');
  expect(result).toHaveProperty('transactionId');
  expect(result.orderId).toBe(expectedDto.orderId);
  expect(result.amount).toBe(expectedDto.amount);
  expect(result.currency).toBe(expectedDto.currency);
  expect(result.paymentMethod).toBe(expectedDto.paymentMethod);
}

/**
 * Assertion helper for payment response structure
 */
export function expectValidPaymentStructure(payment: PaymentResponseDto) {
  expect(payment).toHaveProperty('paymentId');
  expect(payment).toHaveProperty('transactionId');
  expect(payment).toHaveProperty('status');
  expect(payment).toHaveProperty('orderId');
  expect(payment).toHaveProperty('amount');
  expect(payment).toHaveProperty('currency');
  expect(payment).toHaveProperty('paymentMethod');
  expect(payment).toHaveProperty('createdAt');
}

/**
 * Assertion helper for BadRequestException with specific code
 */
export function expectBadRequestWithCode(error: BadRequestException, expectedCode: string) {
  const response = error.getResponse() as { code: string; retriable: boolean };
  expect(response.code).toBe(expectedCode);
  expect(response).toHaveProperty('retriable');
}
