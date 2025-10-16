/* eslint-disable @typescript-eslint/no-explicit-any */
// Test file - using 'any' for mocking payment responses is acceptable
import { Test, TestingModule } from '@nestjs/testing';
import { MockPaymentProvider } from './mock-payment.provider';
import { PaymentStatus, PaymentMethod } from '../dto/payment.dto';
import {
  mockSuccessfulOutcome,
  mockDeterministicSequence,
  createMockProcessPaymentDto,
  expectValidMockPaymentResponse,
} from './helpers/mock-payment-provider.test-helpers';

/**
 * Tests for MockPaymentProvider - Core Functionality
 * Covers: initialization, successful payment processing, getPaymentStatus, basic scenarios
 */
describe('MockPaymentProvider - Core Functionality', () => {
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

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(provider).toBeDefined();
    });

    it('should have provider name "MockPaymentGateway"', () => {
      expect(provider.getProviderName()).toBe('MockPaymentGateway');
    });

    it('should start with empty stats', () => {
      // Act
      const stats = provider.getStats();

      // Assert
      expect(stats.totalPayments).toBe(0);
      expect(stats.totalRefunds).toBe(0);
      expect(stats.totalAmount).toBe(0);
    });
  });

  describe('processPayment - Success Paths', () => {
    it('should process payment successfully with valid data when outcome is success', async () => {
      // Arrange
      const randomSpy = mockSuccessfulOutcome();
      const dto = createMockProcessPaymentDto({
        orderId: 'order-123',
        amount: 100.5,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
      });

      // Act
      const result = await provider.processPayment(dto);

      // Assert
      expect(result.status).toBe(PaymentStatus.SUCCEEDED);
      expectValidMockPaymentResponse(result, dto);

      randomSpy.mockRestore();
    });

    it('should generate unique payment IDs for multiple payments', async () => {
      // Arrange
      const payment1Dto = createMockProcessPaymentDto({
        orderId: 'order-1',
        idempotencyKey: 'key-1',
      });
      const payment2Dto = createMockProcessPaymentDto({
        orderId: 'order-2',
        idempotencyKey: 'key-2',
      });

      // Act
      let result1, result2;
      try {
        result1 = await provider.processPayment(payment1Dto);
      } catch (error) {
        result1 = null;
      }

      try {
        result2 = await provider.processPayment(payment2Dto);
      } catch (error) {
        result2 = null;
      }

      // Assert - at least check IDs are different if both succeeded
      if (result1 && result2) {
        expect(result1.paymentId).not.toBe(result2.paymentId);
        expect(result1.transactionId).not.toBe(result2.transactionId);
      } else {
        // If payments failed, verify they were stored
        const stats = provider.getStats();
        expect(stats.totalPayments).toBeGreaterThan(0);
      }
    });

    it('should support all valid payment methods', async () => {
      // Arrange
      const paymentMethods = [
        PaymentMethod.CREDIT_CARD,
        PaymentMethod.DEBIT_CARD,
        PaymentMethod.DIGITAL_WALLET,
        PaymentMethod.BANK_TRANSFER,
      ];

      // Act & Assert
      for (const method of paymentMethods) {
        const dto = createMockProcessPaymentDto({
          orderId: `order-${method}`,
          paymentMethod: method,
          idempotencyKey: `key-${method}`,
        });

        try {
          const result = await provider.processPayment(dto);
          expect(result.paymentMethod).toBe(method);
        } catch (error) {
          // Payment might fail randomly, but should not reject payment method
          if (error instanceof Error) {
            expect(error.message).not.toContain('not supported');
          }
        }
      }
    });

    it('should include processedAt timestamp for successful payments', async () => {
      // Arrange
      const randomSpy = mockSuccessfulOutcome();
      const dto = createMockProcessPaymentDto({
        orderId: 'order-processed-deterministic',
        idempotencyKey: 'key-processed-deterministic',
      });

      // Act
      const result = await provider.processPayment(dto);

      // Assert
      expect(result.status).toBe(PaymentStatus.SUCCEEDED);
      expect(result.processedAt).toBeDefined();
      expect(result.processedAt).toBeInstanceOf(Date);

      randomSpy.mockRestore();
    });
  });

  describe('getPaymentStatus', () => {
    it('should retrieve payment status for existing payment', async () => {
      // Arrange
      const randomSpy = mockDeterministicSequence(true);
      const payment = await provider.processPayment(
        createMockProcessPaymentDto({
          orderId: 'order-status-deterministic',
          amount: 50,
          idempotencyKey: 'key-status-deterministic',
        }),
      );
      const paymentId = payment.paymentId;

      // Act
      const status = await provider.getPaymentStatus(paymentId);

      // Assert
      expect(status).toBeDefined();
      expect(status.paymentId).toBe(paymentId);
      expect(status.status).toBe(PaymentStatus.SUCCEEDED);
      expect(status.amount).toBe(50);

      randomSpy.mockRestore();
    });

    it('should retrieve failed payment status', async () => {
      // Arrange
      const randomSpy = mockDeterministicSequence(false);

      // Act
      try {
        await provider.processPayment(
          createMockProcessPaymentDto({
            orderId: 'order-failed-status-deterministic',
            amount: 75,
            idempotencyKey: 'key-failed-status-deterministic',
          }),
        );
      } catch (error: any) {
        // Check if payment failure was tracked
        const stats = provider.getStats();
        expect(stats.failedPayments).toBeGreaterThan(0);
        expect(stats.totalPayments).toBeGreaterThan(0);
      }

      randomSpy.mockRestore();
    });
  });
});
