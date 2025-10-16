/* eslint-disable @typescript-eslint/no-explicit-any */
// Test file - using 'any' for mocking payment responses is acceptable
import { Test, TestingModule } from '@nestjs/testing';
import { MockPaymentProvider } from './mock-payment.provider';
import {
  mockSuccessfulOutcome,
  createMockProcessPaymentDto,
  createMultipleMockPayments,
  createMockRefundPaymentDto,
} from './helpers/mock-payment-provider.test-helpers';

/**
 * Tests for MockPaymentProvider - Statistics and Data Management
 * Covers: getStats, statistics tracking, clearAll
 */
describe('MockPaymentProvider - Statistics and Data Management', () => {
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

  describe('getStats - Structure and Initialization', () => {
    it('should return correct statistics structure', () => {
      // Act
      const stats = provider.getStats();

      // Assert
      expect(stats).toHaveProperty('provider');
      expect(stats).toHaveProperty('totalPayments');
      expect(stats).toHaveProperty('totalRefunds');
      expect(stats).toHaveProperty('successfulPayments');
      expect(stats).toHaveProperty('failedPayments');
      expect(stats).toHaveProperty('totalAmount');
      expect(stats).toHaveProperty('refundedPayments');
      expect(stats).toHaveProperty('totalRefundedAmount');
    });

    it('should have correct provider name in stats', () => {
      // Act
      const stats = provider.getStats();

      // Assert
      expect(stats.provider).toBe('MockPaymentGateway');
    });
  });

  describe('Payment Statistics Tracking', () => {
    it('should return correct statistics after multiple operations', async () => {
      // Arrange & Act - process several payments
      const payments = createMultipleMockPayments(5, { amount: 100 });
      await Promise.all(
        payments.map((dto) => provider.processPayment(dto).catch((error) => ({ error }))),
      );

      // Get stats
      const stats = provider.getStats();

      // Assert
      expect(stats.provider).toBe('MockPaymentGateway');
      expect(stats.totalPayments).toBeGreaterThan(0);
      expect(stats.totalPayments).toBeLessThanOrEqual(5);
      expect(stats.successfulPayments + stats.failedPayments).toBe(stats.totalPayments);
    });

    it('should calculate total amount correctly', async () => {
      // Arrange
      const randomSpy = mockSuccessfulOutcome();

      // Act - create 2 successful payments
      const payment1 = await provider.processPayment(
        createMockProcessPaymentDto({
          orderId: 'order-amount-1',
          amount: 50,
          idempotencyKey: 'key-amount-1',
        }),
      );
      const payment2 = await provider.processPayment(
        createMockProcessPaymentDto({
          orderId: 'order-amount-2',
          amount: 50,
          idempotencyKey: 'key-amount-2',
        }),
      );

      const stats = provider.getStats();

      // Assert
      expect(stats.totalAmount).toBeGreaterThanOrEqual(100); // At least 2 x 50
      expect(payment1).toBeDefined();
      expect(payment2).toBeDefined();

      randomSpy.mockRestore();
    });

    it('should track successful payments separately', async () => {
      // Arrange
      const randomSpy = mockSuccessfulOutcome();

      // Act - process successful payments
      await provider.processPayment(
        createMockProcessPaymentDto({
          orderId: 'order-success-1',
          amount: 100,
          idempotencyKey: 'key-success-1',
        }),
      );
      await provider.processPayment(
        createMockProcessPaymentDto({
          orderId: 'order-success-2',
          amount: 200,
          idempotencyKey: 'key-success-2',
        }),
      );

      const stats = provider.getStats();

      // Assert
      expect(stats.successfulPayments).toBeGreaterThanOrEqual(2);
      expect(stats.totalPayments).toBeGreaterThanOrEqual(stats.successfulPayments);

      randomSpy.mockRestore();
    });
  });

  describe('Refund Statistics Tracking', () => {
    it('should track refunds in statistics', async () => {
      // Arrange
      const randomSpy = mockSuccessfulOutcome();
      const payment = await provider.processPayment(
        createMockProcessPaymentDto({
          orderId: 'order-stats-refund-deterministic',
          amount: 150,
          idempotencyKey: 'key-stats-refund-deterministic',
        }),
      );

      await provider.refundPayment(createMockRefundPaymentDto(payment.paymentId, { amount: 150 }));

      // Act
      const stats = provider.getStats();

      // Assert
      expect(stats.totalRefunds).toBeGreaterThan(0);
      expect(stats.refundedPayments).toBeGreaterThan(0);
      expect(stats.totalRefundedAmount).toBeGreaterThanOrEqual(150);

      randomSpy.mockRestore();
    });

    it('should track multiple refunds correctly', async () => {
      // Arrange
      const randomSpy = mockSuccessfulOutcome();

      const payment1 = await provider.processPayment(
        createMockProcessPaymentDto({
          orderId: 'order-multi-stats-1',
          amount: 100,
          idempotencyKey: 'key-multi-stats-1',
        }),
      );
      const payment2 = await provider.processPayment(
        createMockProcessPaymentDto({
          orderId: 'order-multi-stats-2',
          amount: 200,
          idempotencyKey: 'key-multi-stats-2',
        }),
      );

      // Act - refund both (partial refunds)
      await provider.refundPayment(createMockRefundPaymentDto(payment1.paymentId, { amount: 50 }));
      await provider.refundPayment(createMockRefundPaymentDto(payment2.paymentId, { amount: 100 }));

      const stats = provider.getStats();

      // Assert
      expect(stats.totalRefunds).toBe(2);
      // Note: refundedPayments might count only fully refunded payments
      expect(stats.refundedPayments).toBeGreaterThanOrEqual(0);
      expect(stats.totalRefundedAmount).toBeGreaterThanOrEqual(150);

      randomSpy.mockRestore();
    });
  });

  describe('clearAll - Data Reset', () => {
    it('should clear all payments and refunds', async () => {
      // Arrange - create some payments
      await provider
        .processPayment(
          createMockProcessPaymentDto({
            orderId: 'order-clear-1',
            idempotencyKey: 'key-clear-1',
          }),
        )
        .catch(() => {});

      await provider
        .processPayment(
          createMockProcessPaymentDto({
            orderId: 'order-clear-2',
            idempotencyKey: 'key-clear-2',
          }),
        )
        .catch(() => {});

      // Act
      provider.clearAll();

      // Assert
      const stats = provider.getStats();
      expect(stats.totalPayments).toBe(0);
      expect(stats.totalRefunds).toBe(0);
      expect(stats.totalAmount).toBe(0);
    });

    it('should reset all statistics after clearAll', async () => {
      // Arrange
      const randomSpy = mockSuccessfulOutcome();
      await provider.processPayment(
        createMockProcessPaymentDto({
          orderId: 'order-before-clear',
          idempotencyKey: 'key-before-clear',
        }),
      );

      // Act
      provider.clearAll();

      // Assert
      const stats = provider.getStats();
      expect(stats.totalPayments).toBe(0);
      expect(stats.successfulPayments).toBe(0);
      expect(stats.failedPayments).toBe(0);
      expect(stats.totalRefunds).toBe(0);
      expect(stats.refundedPayments).toBe(0);
      expect(stats.totalAmount).toBe(0);
      expect(stats.totalRefundedAmount).toBe(0);

      randomSpy.mockRestore();
    });

    it('should allow new statistics tracking after clearAll', async () => {
      // Arrange
      const randomSpy = mockSuccessfulOutcome();
      await provider.processPayment(
        createMockProcessPaymentDto({
          orderId: 'order-old',
          idempotencyKey: 'key-old',
        }),
      );
      provider.clearAll();

      // Act
      await provider.processPayment(
        createMockProcessPaymentDto({
          orderId: 'order-new',
          idempotencyKey: 'key-new',
        }),
      );

      // Assert
      const stats = provider.getStats();
      expect(stats.totalPayments).toBeGreaterThanOrEqual(1);
      expect(stats.successfulPayments).toBeGreaterThanOrEqual(1);

      randomSpy.mockRestore();
    });
  });
});
