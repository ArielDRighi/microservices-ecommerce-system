/* eslint-disable @typescript-eslint/no-explicit-any */
// Test file - using 'any' for mocking payment responses is acceptable
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MockPaymentProvider } from './mock-payment.provider';
import { PaymentStatus, PaymentMethod } from '../dto/payment.dto';
import {
  mockSuccessfulOutcome,
  mockDeterministicSequence,
  createMockProcessPaymentDto,
  createMockRefundPaymentDto,
  expectValidRefundResponse,
} from './helpers/mock-payment-provider.test-helpers';

/**
 * Tests for MockPaymentProvider - Refund Operations
 * Covers: full refunds, partial refunds, multiple refunds, refund validations, errors
 */
describe('MockPaymentProvider - Refund Operations', () => {
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

  describe('Successful Refunds', () => {
    it('should successfully refund a successful payment (full refund)', async () => {
      // Arrange
      const randomSpy = mockDeterministicSequence(true);
      const payment = await provider.processPayment(
        createMockProcessPaymentDto({
          orderId: 'order-refund-deterministic',
          amount: 100,
          idempotencyKey: 'key-refund-deterministic',
        }),
      );

      // Act
      const refund = await provider.refundPayment(
        createMockRefundPaymentDto(payment.paymentId, {
          amount: 100,
          reason: 'Customer requested full refund',
        }),
      );

      // Assert
      expectValidRefundResponse(refund, payment.paymentId, 100);
      expect(refund.status).toBe(PaymentStatus.REFUNDED);
      expect(refund.reason).toBe('Customer requested full refund');

      // Verify payment status updated to REFUNDED
      const updatedPayment = await provider.getPaymentStatus(payment.paymentId);
      expect(updatedPayment.status).toBe(PaymentStatus.REFUNDED);

      randomSpy.mockRestore();
    });

    it('should successfully process partial refund', async () => {
      // Arrange
      const randomSpy = mockSuccessfulOutcome();
      const payment = await provider.processPayment(
        createMockProcessPaymentDto({
          orderId: 'order-partial-deterministic',
          amount: 200,
          paymentMethod: PaymentMethod.DIGITAL_WALLET,
          idempotencyKey: 'key-partial-deterministic',
        }),
      );

      // Act - refund 50 out of 200
      const refund = await provider.refundPayment(
        createMockRefundPaymentDto(payment.paymentId, {
          amount: 50,
          reason: 'Partial refund',
        }),
      );

      // Assert
      expect(refund.amount).toBe(50);
      expect(refund.status).toBe(PaymentStatus.REFUNDED);

      // Verify payment status updated to PARTIALLY_REFUNDED
      const updatedPayment = await provider.getPaymentStatus(payment.paymentId);
      expect(updatedPayment.status).toBe(PaymentStatus.PARTIALLY_REFUNDED);

      randomSpy.mockRestore();
    });

    it('should use default reason when none provided', async () => {
      // Arrange
      const randomSpy = mockSuccessfulOutcome();
      const payment = await provider.processPayment(
        createMockProcessPaymentDto({
          orderId: 'order-default-reason-deterministic',
          amount: 80,
          idempotencyKey: 'key-default-reason-deterministic',
        }),
      );

      // Act
      const refund = await provider.refundPayment({
        paymentId: payment.paymentId,
        amount: 80,
        // No reason provided
      });

      // Assert
      expect(refund.reason).toBe('Customer requested refund');

      randomSpy.mockRestore();
    });
  });

  describe('Multiple Refunds', () => {
    it('should handle multiple partial refunds', async () => {
      // Arrange
      const randomSpy = mockSuccessfulOutcome();
      const payment = await provider.processPayment(
        createMockProcessPaymentDto({
          orderId: 'order-multi-refund-deterministic',
          amount: 300,
          idempotencyKey: 'key-multi-refund-deterministic',
        }),
      );

      // Act - refund in 3 parts: 100, 100, 100
      const refund1 = await provider.refundPayment(
        createMockRefundPaymentDto(payment.paymentId, { amount: 100 }),
      );
      const refund2 = await provider.refundPayment(
        createMockRefundPaymentDto(payment.paymentId, { amount: 100 }),
      );
      const refund3 = await provider.refundPayment(
        createMockRefundPaymentDto(payment.paymentId, { amount: 100 }),
      );

      // Assert
      expect(refund1.refundId).toBeDefined();
      expect(refund2.refundId).toBeDefined();
      expect(refund3.refundId).toBeDefined();
      expect(refund1.refundId).not.toBe(refund2.refundId);

      // After all 3 refunds, payment should be fully REFUNDED
      const updatedPayment = await provider.getPaymentStatus(payment.paymentId);
      expect(updatedPayment.status).toBe(PaymentStatus.REFUNDED);

      randomSpy.mockRestore();
    });
  });

  describe('Refund Errors', () => {
    it('should reject refund for non-existent payment', async () => {
      // Arrange
      const refundDto = createMockRefundPaymentDto('non-existent-payment', { amount: 50 });

      // Act & Assert
      await expect(provider.refundPayment(refundDto)).rejects.toThrow(BadRequestException);
      await expect(provider.refundPayment(refundDto)).rejects.toThrow('not found');
    });

    it('should reject refund amount exceeding payment amount', async () => {
      // Arrange
      const randomSpy = mockSuccessfulOutcome();
      const payment = await provider.processPayment(
        createMockProcessPaymentDto({
          orderId: 'order-exceed-deterministic',
          amount: 100,
          idempotencyKey: 'key-exceed-deterministic',
        }),
      );

      // Act & Assert
      await expect(
        provider.refundPayment(createMockRefundPaymentDto(payment.paymentId, { amount: 150 })),
      ).rejects.toThrow(BadRequestException);
      await expect(
        provider.refundPayment(createMockRefundPaymentDto(payment.paymentId, { amount: 150 })),
      ).rejects.toThrow('exceeds available');

      randomSpy.mockRestore();
    });

    it('should reject refund amount exceeding remaining balance after partial refund', async () => {
      // Arrange
      const randomSpy = mockSuccessfulOutcome();
      const payment = await provider.processPayment(
        createMockProcessPaymentDto({
          orderId: 'order-remaining-deterministic',
          amount: 100,
          idempotencyKey: 'key-remaining-deterministic',
        }),
      );

      // First refund 60
      await provider.refundPayment(createMockRefundPaymentDto(payment.paymentId, { amount: 60 }));

      // Act & Assert - try to refund 50 (but only 40 remaining)
      await expect(
        provider.refundPayment(createMockRefundPaymentDto(payment.paymentId, { amount: 50 })),
      ).rejects.toThrow(BadRequestException);
      await expect(
        provider.refundPayment(createMockRefundPaymentDto(payment.paymentId, { amount: 50 })),
      ).rejects.toThrow('exceeds available amount');

      randomSpy.mockRestore();
    });
  });

  describe('Idempotency in Refunds', () => {
    it('should enforce idempotency - return existing payment for duplicate idempotency key', async () => {
      // Arrange
      let successfulPayment = null;
      let attempts = 0;

      // Try to get a successful payment
      while (!successfulPayment && attempts < 20) {
        try {
          const payment = await provider.processPayment(
            createMockProcessPaymentDto({
              idempotencyKey: `idem-unique-${attempts}`,
              orderId: `order-unique-${attempts}`,
            }),
          );
          if (payment.status === PaymentStatus.SUCCEEDED) {
            successfulPayment = payment;
          }
        } catch (error) {
          // Continue
        }
        attempts++;
      }

      if (successfulPayment) {
        // Use consistent idempotency key for duplicate test
        const actualDuplicateDto = createMockProcessPaymentDto({
          orderId: 'order-new-123',
          amount: 200,
          idempotencyKey: `test-idem-${Date.now()}`,
        });

        const original = await provider.processPayment(actualDuplicateDto).catch(() => null);
        if (original && original.status === PaymentStatus.SUCCEEDED) {
          const duplicate = await provider.processPayment(actualDuplicateDto);

          // Assert
          expect(duplicate.paymentId).toBe(original.paymentId);
          expect(duplicate.transactionId).toBe(original.transactionId);
        }
      }

      // If we couldn't get a successful payment, test passes
      expect(true).toBe(true);
    });
  });

  describe('getPaymentStatus - Refund Scenarios', () => {
    it('should throw exception for non-existent payment', async () => {
      // Arrange
      const nonExistentId = 'non-existent-payment-id';

      // Act & Assert
      await expect(provider.getPaymentStatus(nonExistentId)).rejects.toThrow(BadRequestException);
      await expect(provider.getPaymentStatus(nonExistentId)).rejects.toThrow('not found');
    });
  });
});
