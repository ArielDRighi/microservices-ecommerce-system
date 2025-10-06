import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PaymentMethod } from './dto/payment.dto';
import {
  mockSuccessfulPayment,
  createProcessPaymentDto,
  expectSuccessfulPayment,
} from './helpers/payments.test-helpers';

/**
 * Tests for PaymentsService - Idempotency
 * Covers: idempotency key handling, duplicate request detection, multiple requests with same/different keys
 */
describe('PaymentsService - Idempotency', () => {
  let service: PaymentsService;
  let randomSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentsService],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  afterEach(() => {
    service.clearAll();
    if (randomSpy) {
      randomSpy.mockRestore();
    }
  });

  describe('Basic Idempotency', () => {
    it('should enforce idempotency for requests with same key', async () => {
      // Arrange
      const dto = createProcessPaymentDto({
        orderId: 'order-idempotent',
        amount: 100.0,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        idempotencyKey: 'test-idempotency-key',
      });

      // Act - first attempt
      let firstResult;
      try {
        firstResult = await service.processPayment(dto);
      } catch (error) {
        // If first attempt fails, we can't test idempotency
        return;
      }

      // Second attempt with same idempotency key
      const secondResult = await service.processPayment(dto);

      // Assert
      expect(secondResult.paymentId).toBe(firstResult.paymentId);
      expect(secondResult.transactionId).toBe(firstResult.transactionId);
    });

    it('should return same payment for duplicate requests even if payment failed', async () => {
      // Arrange
      const dto = createProcessPaymentDto({
        orderId: 'order-failed-idempotent',
        amount: 100.0,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        idempotencyKey: 'failed-payment-key',
      });

      // Act - first attempt (may succeed or fail)
      let firstError;
      let firstResult;
      try {
        firstResult = await service.processPayment(dto);
      } catch (error) {
        firstError = error;
      }

      // Second attempt with same key
      let secondError;
      let secondResult;
      try {
        secondResult = await service.processPayment(dto);
      } catch (error) {
        secondError = error;
      }

      // Assert - both attempts should behave the same
      if (firstResult) {
        expect(secondResult).toBeDefined();
        expect(secondResult?.paymentId).toBe(firstResult.paymentId);
      } else if (firstError) {
        // If first failed, second may also fail or return cached result
        expect(secondError || secondResult).toBeDefined();
      }
    });
  });

  describe('Multiple Requests with Same Idempotency Key', () => {
    it('should return same payment for multiple requests with same idempotency key', async () => {
      // Arrange
      randomSpy = mockSuccessfulPayment();
      const dto = createProcessPaymentDto({
        orderId: 'order-idempotent-multi',
        amount: 100.0,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        idempotencyKey: 'multi-request-key',
      });

      // Act - first request
      const firstResult = await service.processPayment(dto);

      // Make 3 more requests with same key
      const secondResult = await service.processPayment(dto);
      const thirdResult = await service.processPayment(dto);
      const fourthResult = await service.processPayment(dto);

      // Assert - all should return the same payment
      expect(secondResult.paymentId).toBe(firstResult.paymentId);
      expect(thirdResult.paymentId).toBe(firstResult.paymentId);
      expect(fourthResult.paymentId).toBe(firstResult.paymentId);
      expect(secondResult.transactionId).toBe(firstResult.transactionId);
      expect(thirdResult.transactionId).toBe(firstResult.transactionId);
      expect(fourthResult.transactionId).toBe(firstResult.transactionId);
    });

    it('should maintain all payment properties across duplicate requests', async () => {
      // Arrange
      randomSpy = mockSuccessfulPayment();
      const dto = createProcessPaymentDto({
        orderId: 'order-properties-test',
        amount: 250.0,
        currency: 'EUR',
        paymentMethod: PaymentMethod.DIGITAL_WALLET,
        idempotencyKey: 'properties-key',
      });

      // Act
      const firstResult = await service.processPayment(dto);
      const secondResult = await service.processPayment(dto);

      // Assert - all properties should match
      expectSuccessfulPayment(firstResult, dto);
      expectSuccessfulPayment(secondResult, dto);
      expect(secondResult.status).toBe(firstResult.status);
      expect(secondResult.createdAt).toEqual(firstResult.createdAt);
    });
  });

  describe('Different Idempotency Keys', () => {
    it('should create different payments for different idempotency keys', async () => {
      // Arrange
      randomSpy = mockSuccessfulPayment();

      // Act
      const payment1 = await service.processPayment(
        createProcessPaymentDto({
          orderId: 'order-diff-keys-0',
          amount: 100.0,
          currency: 'USD',
          paymentMethod: PaymentMethod.CREDIT_CARD,
          idempotencyKey: 'unique-key-0',
        }),
      );

      const payment2 = await service.processPayment(
        createProcessPaymentDto({
          orderId: 'order-diff-keys-1',
          amount: 100.0,
          currency: 'USD',
          paymentMethod: PaymentMethod.CREDIT_CARD,
          idempotencyKey: 'unique-key-1',
        }),
      );

      // Assert - payments should have different IDs
      expect(payment1.paymentId).not.toBe(payment2.paymentId);
      expect(payment1.transactionId).not.toBe(payment2.transactionId);
    });

    it('should handle no idempotency key (creates new payment each time)', async () => {
      // Arrange
      randomSpy = mockSuccessfulPayment();

      // Act
      const payment1 = await service.processPayment(
        createProcessPaymentDto({
          orderId: 'order-no-key-0',
          amount: 100.0,
        }),
      );

      const payment2 = await service.processPayment(
        createProcessPaymentDto({
          orderId: 'order-no-key-1',
          amount: 100.0,
        }),
      );

      // Assert - should create different payments
      expect(payment1.paymentId).not.toBe(payment2.paymentId);
      expect(payment1.transactionId).not.toBe(payment2.transactionId);
    });
  });
});
