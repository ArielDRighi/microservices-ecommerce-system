import { MockPaymentProvider } from '../mock-payment.provider';
import {
  createMockProcessPaymentDto,
  createMockRefundPaymentDto,
  expectValidMockPaymentResponse,
  expectValidRefundResponse,
  processPaymentWithRetries,
  mockSuccessfulOutcome,
  mockPermanentFailure,
} from './mock-payment-provider.test-helpers';
import { PaymentMethod, PaymentStatus, PaymentResponseDto } from '../../dto/payment.dto';

/**
 * Tests for mock-payment-provider.test-helpers to improve branch coverage
 * Focus on covering the processPaymentWithRetries function branches
 */
describe('MockPaymentProvider Test Helpers - Branch Coverage', () => {
  let provider: MockPaymentProvider;

  beforeEach(() => {
    provider = new MockPaymentProvider();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('processPaymentWithRetries - Branch Coverage', () => {
    it('should return result on first successful attempt', async () => {
      // Cover the success path without retries (line 140-154)
      mockSuccessfulOutcome();

      const dto = createMockProcessPaymentDto();
      const result = await processPaymentWithRetries(provider, dto, 10);

      expect(result).not.toBeNull();
      expect(result?.paymentId).toBeDefined();
      expect(result?.orderId).toContain(dto.orderId);
    });

    it('should retry and eventually succeed', async () => {
      // Cover the retry loop with eventual success
      let callCount = 0;
      jest.spyOn(Math, 'random').mockImplementation(() => {
        callCount++;
        // Fail first 2 attempts, succeed on 3rd
        return callCount <= 2 ? 0.99 : 0.5;
      });

      const dto = createMockProcessPaymentDto();
      const result = await processPaymentWithRetries(provider, dto, 10);

      expect(result).not.toBeNull();
      expect(callCount).toBeGreaterThan(2);
    });

    it('should return null after max attempts when all fail', async () => {
      // Cover the failure path where maxAttempts is reached (line 149)
      mockPermanentFailure();

      const dto = createMockProcessPaymentDto();
      const result = await processPaymentWithRetries(provider, dto, 3);

      expect(result).toBeNull();
    });

    it('should handle exception in retry loop', async () => {
      // Cover the catch block in the retry loop (line 150-152)
      jest.spyOn(provider, 'processPayment').mockImplementation(async () => {
        throw new Error('Payment gateway unavailable');
      });

      const dto = createMockProcessPaymentDto();
      const result = await processPaymentWithRetries(provider, dto, 5);

      expect(result).toBeNull();
      expect(provider.processPayment).toHaveBeenCalledTimes(5);
    });

    it('should handle temporary failures then success', async () => {
      // Cover mixed success/failure scenario
      let attemptNumber = 0;
      jest.spyOn(provider, 'processPayment').mockImplementation(async (dto) => {
        attemptNumber++;
        if (attemptNumber < 3) {
          throw new Error('Temporary failure');
        }
        // Success on 3rd attempt
        const response: PaymentResponseDto = {
          paymentId: `pay-${Date.now()}`,
          transactionId: `txn-${Date.now()}`,
          orderId: dto.orderId,
          amount: dto.amount,
          currency: dto.currency,
          paymentMethod: dto.paymentMethod,
          status: PaymentStatus.SUCCEEDED,
          createdAt: new Date(),
        };
        return response;
      });

      const dto = createMockProcessPaymentDto();
      const result = await processPaymentWithRetries(provider, dto, 10);

      expect(result).not.toBeNull();
      expect(attemptNumber).toBe(3);
    });
  });

  describe('Assertion helpers - Edge Cases', () => {
    it('should validate payment response with all fields', async () => {
      mockSuccessfulOutcome();

      const dto = createMockProcessPaymentDto({
        amount: 250.5,
        currency: 'EUR',
        paymentMethod: PaymentMethod.DIGITAL_WALLET,
      });

      const payment = await provider.processPayment(dto);

      expectValidMockPaymentResponse(payment, dto);
      expect(payment.amount).toBe(250.5);
      expect(payment.currency).toBe('EUR');
      expect(payment.paymentMethod).toBe(PaymentMethod.DIGITAL_WALLET);
    });

    it('should validate refund response structure', async () => {
      mockSuccessfulOutcome();

      const paymentDto = createMockProcessPaymentDto();
      const payment = await provider.processPayment(paymentDto);

      const refundDto = createMockRefundPaymentDto(payment.paymentId, {
        amount: 75.25,
        reason: 'Partial refund requested',
      });

      const refund = await provider.refundPayment(refundDto);

      expectValidRefundResponse(refund, payment.paymentId, 75.25);
      expect(refund.status).toBeDefined();
    });
  });

  describe('Edge cases for different payment methods', () => {
    it('should handle BANK_TRANSFER payment method', async () => {
      mockSuccessfulOutcome();

      const dto = createMockProcessPaymentDto({
        paymentMethod: PaymentMethod.BANK_TRANSFER,
      });

      const result = await processPaymentWithRetries(provider, dto, 5);

      expect(result).not.toBeNull();
      expect(result?.paymentMethod).toBe(PaymentMethod.BANK_TRANSFER);
    });

    it('should handle DIGITAL_WALLET payment method', async () => {
      mockSuccessfulOutcome();

      const dto = createMockProcessPaymentDto({
        paymentMethod: PaymentMethod.DIGITAL_WALLET,
      });

      const result = await processPaymentWithRetries(provider, dto, 5);

      expect(result).not.toBeNull();
      expect(result?.paymentMethod).toBe(PaymentMethod.DIGITAL_WALLET);
    });
  });

  describe('Special edge case - zero maxAttempts', () => {
    it('should return null immediately when maxAttempts is 0', async () => {
      // Cover the edge case where loop never executes
      const dto = createMockProcessPaymentDto();
      const result = await processPaymentWithRetries(provider, dto, 0);

      expect(result).toBeNull();
    });
  });
});
