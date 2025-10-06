/* eslint-disable @typescript-eslint/no-explicit-any */
// Test file - using 'any' for mocking payment responses is acceptable
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MockPaymentProvider } from './mock-payment.provider';
import { PaymentMethod } from '../dto/payment.dto';
import {
  mockPermanentFailure,
  createMockProcessPaymentDto,
  createMultipleMockPayments,
} from './helpers/mock-payment-provider.test-helpers';

/**
 * Tests for MockPaymentProvider - Validations and Rate Limiting
 * Covers: fraud detection, unsupported payment methods, rate limiting, validatePaymentMethod
 */
describe('MockPaymentProvider - Validations and Rate Limiting', () => {
  let provider: MockPaymentProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MockPaymentProvider],
    }).compile();

    provider = module.get<MockPaymentProvider>(MockPaymentProvider);
  });

  afterEach(() => {
    provider.clearAll();
  });

  describe('Fraud Detection', () => {
    it('should reject payment exceeding fraud threshold ($10,000)', async () => {
      // Arrange
      const fraudulentPayment = createMockProcessPaymentDto({
        amount: 10001,
      });

      // Act & Assert
      await expect(provider.processPayment(fraudulentPayment)).rejects.toThrow(BadRequestException);
      await expect(provider.processPayment(fraudulentPayment)).rejects.toThrow(
        'Payment amount exceeds fraud threshold',
      );
    });

    it('should allow payment at fraud threshold ($10,000)', async () => {
      // Arrange
      const maxAmountPayment = createMockProcessPaymentDto({
        amount: 10000,
      });

      // Act - may succeed or fail randomly, but should not throw fraud exception
      try {
        const result = await provider.processPayment(maxAmountPayment);
        // Assert
        expect(result).toBeDefined();
      } catch (error: any) {
        // If it fails, should not be fraud-related
        expect(error.message).not.toContain('fraud threshold');
      }
    });
  });

  describe('Unsupported Payment Methods', () => {
    it('should reject unsupported payment method', async () => {
      // Arrange
      const invalidPaymentDto = createMockProcessPaymentDto({
        paymentMethod: 'BITCOIN' as any,
      });

      // Act & Assert
      await expect(provider.processPayment(invalidPaymentDto)).rejects.toThrow(BadRequestException);
      await expect(provider.processPayment(invalidPaymentDto)).rejects.toThrow(
        'Payment method BITCOIN not supported',
      );
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting - max 10 payments per minute per customer', async () => {
      // Arrange
      const customerId = 'rate-limit-customer';
      const payments = createMultipleMockPayments(11, { customerId, amount: 10 });

      // Act - try to make 11 payments
      const results = await Promise.all(
        payments.map((dto) => provider.processPayment(dto).catch((error) => error)),
      );

      // Assert - 11th payment should be rate limited
      const rateLimitErrors = results.filter(
        (r) => r instanceof BadRequestException && r.message?.includes('Rate limit exceeded'),
      );
      expect(rateLimitErrors.length).toBeGreaterThan(0);
    });

    it('should have different rate limits for different customers', async () => {
      // Arrange
      const customer1Payments = createMultipleMockPayments(5, {
        customerId: 'customer-1',
        amount: 10,
      });
      const customer2Payments = createMultipleMockPayments(5, {
        customerId: 'customer-2',
        amount: 10,
      });

      // Update orderId and idempotencyKey to ensure uniqueness across customers
      customer1Payments.forEach((dto, i) => {
        dto.orderId = `order-c1-${i}`;
        dto.idempotencyKey = `key-c1-${i}`;
      });
      customer2Payments.forEach((dto, i) => {
        dto.orderId = `order-c2-${i}`;
        dto.idempotencyKey = `key-c2-${i}`;
      });

      // Act
      const results1 = await Promise.all(
        customer1Payments.map((dto) => provider.processPayment(dto).catch((error) => error)),
      );
      const results2 = await Promise.all(
        customer2Payments.map((dto) => provider.processPayment(dto).catch((error) => error)),
      );

      // Assert - both customers should be able to make payments
      const success1 = results1.filter((r) => r && r.paymentId);
      const success2 = results2.filter((r) => r && r.paymentId);

      expect(success1.length + success2.length).toBeGreaterThan(0);
    });

    it('should reset rate limiting after clearAll', async () => {
      // Arrange - hit rate limit
      const customerId = 'rate-limit-clear-test';
      const payments = createMultipleMockPayments(10, { customerId, amount: 10 });

      await Promise.all(payments.map((dto) => provider.processPayment(dto).catch(() => {})));

      // Act
      provider.clearAll();

      // Assert - should be able to make payments again
      const result = await provider
        .processPayment(
          createMockProcessPaymentDto({
            orderId: 'order-after-clear',
            amount: 10,
            customerId,
            idempotencyKey: 'key-after-clear',
          }),
        )
        .catch((error) => error);

      // Should not be rate limited
      if (result instanceof BadRequestException) {
        expect(result.message).not.toContain('Rate limit');
      }
    });
  });

  describe('validatePaymentMethod', () => {
    it('should validate CREDIT_CARD as supported', () => {
      expect(provider.validatePaymentMethod(PaymentMethod.CREDIT_CARD)).toBe(true);
    });

    it('should validate DEBIT_CARD as supported', () => {
      expect(provider.validatePaymentMethod(PaymentMethod.DEBIT_CARD)).toBe(true);
    });

    it('should validate DIGITAL_WALLET as supported', () => {
      expect(provider.validatePaymentMethod(PaymentMethod.DIGITAL_WALLET)).toBe(true);
    });

    it('should validate BANK_TRANSFER as supported', () => {
      expect(provider.validatePaymentMethod(PaymentMethod.BANK_TRANSFER)).toBe(true);
    });

    it('should reject unsupported payment method', () => {
      expect(provider.validatePaymentMethod('CRYPTOCURRENCY')).toBe(false);
    });

    it('should reject empty string as payment method', () => {
      expect(provider.validatePaymentMethod('')).toBe(false);
    });
  });

  describe('Error Response Details', () => {
    it('should include failure reason and code for failed payments', async () => {
      // Arrange
      const randomSpy = mockPermanentFailure();

      // Act
      let response: any;
      try {
        await provider.processPayment(
          createMockProcessPaymentDto({
            orderId: 'order-failed-deterministic',
            idempotencyKey: 'key-failed-deterministic',
          }),
        );
      } catch (err: any) {
        if (err instanceof BadRequestException && err.getResponse) {
          response = err.getResponse();
        }
      }

      // Assert
      expect(response).toBeDefined();
      expect(response.code).toBeDefined();
      expect(response.message).toBeDefined();
      expect(response.retriable).toBe(false);

      randomSpy.mockRestore();
    });
  });
});
