/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PaymentProcessingProcessor } from './payment.processor';
import { PaymentProcessingJobData } from '../../common/interfaces/queue-job.interface';
import { createMockPaymentJob } from './helpers/payment-processor.test-helpers';

describe('PaymentProcessingProcessor - Edge Cases', () => {
  let processor: PaymentProcessingProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentProcessingProcessor],
    }).compile();

    processor = module.get<PaymentProcessingProcessor>(PaymentProcessingProcessor);

    // Mock logger to avoid console spam
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    // Mock delay method to avoid real delays in tests
    jest.spyOn(processor as any, 'delay').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isRetryableError - Payment-Specific Logic', () => {
    it('should identify GATEWAY_TIMEOUT as retryable', () => {
      const error = new Error('GATEWAY_TIMEOUT: Payment gateway timed out');

      const isRetryable = (processor as any).isRetryableError(error);

      expect(isRetryable).toBe(true);
    });

    it('should identify INSUFFICIENT_FUNDS_TEMP as retryable', () => {
      const error = new Error('INSUFFICIENT_FUNDS_TEMP: Temporary insufficient funds');

      const isRetryable = (processor as any).isRetryableError(error);

      expect(isRetryable).toBe(true);
    });

    it('should identify CARD_ISSUER_UNAVAILABLE as retryable', () => {
      const error = new Error('CARD_ISSUER_UNAVAILABLE: Card issuer is temporarily unavailable');

      const isRetryable = (processor as any).isRetryableError(error);

      expect(isRetryable).toBe(true);
    });

    it('should treat network errors as retryable', () => {
      const error = new Error('ECONNRESET: Connection reset');

      const isRetryable = (processor as any).isRetryableError(error);

      expect(isRetryable).toBe(true);
    });

    it('should treat unknown payment errors as non-retryable by default', () => {
      const error = new Error('INVALID_CARD: Card is invalid');

      const isRetryable = (processor as any).isRetryableError(error);

      expect(isRetryable).toBe(false);
    });

    it('should handle non-Error objects', () => {
      const error = { message: 'Not an Error instance' };

      const isRetryable = (processor as any).isRetryableError(error);

      expect(isRetryable).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero amount payments', async () => {
      const mockJob = createMockPaymentJob({
        amount: 0,
      });

      const result = await processor.handleAuthorizePayment(
        mockJob as Job<PaymentProcessingJobData>,
      );

      expect(result.success).toBe(true);
    });

    it('should handle very small amounts', async () => {
      const mockJob = createMockPaymentJob({
        amount: 0.01,
      });

      const result = await processor.handleAuthorizePayment(
        mockJob as Job<PaymentProcessingJobData>,
      );

      expect(result.success).toBe(true);
    });

    it('should handle decimal precision', async () => {
      const mockJob = createMockPaymentJob({
        amount: 99.999,
      });

      const result = await processor.handleAuthorizePayment(
        mockJob as Job<PaymentProcessingJobData>,
      );

      expect(result.success).toBe(true);
    });

    it('should handle concurrent payment processing', async () => {
      const jobs = Array.from({ length: 3 }, (_, i) =>
        createMockPaymentJob({ paymentId: `pay-concurrent-${i}` }),
      );

      const results = await Promise.all(
        jobs.map((job) => processor.handleAuthorizePayment(job as Job<PaymentProcessingJobData>)),
      );

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it('should handle progress update failure gracefully', async () => {
      const mockJob = createMockPaymentJob();
      (mockJob.progress as jest.Mock).mockRejectedValueOnce(new Error('Progress update failed'));

      const result = await processor.handleAuthorizePayment(
        mockJob as Job<PaymentProcessingJobData>,
      );

      expect(result.success).toBe(true); // Job should still succeed
      expect(Logger.prototype.warn).toHaveBeenCalled();
    });

    it('should handle missing optional fields', async () => {
      const mockJob = createMockPaymentJob();
      delete (mockJob.data as any).metadata;

      const result = await processor.handleAuthorizePayment(
        mockJob as Job<PaymentProcessingJobData>,
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Different Currencies', () => {
    it('should process payments in USD', async () => {
      const mockJob = createMockPaymentJob({ currency: 'USD', amount: 100.0 });

      const result = await processor.handleAuthorizePayment(
        mockJob as Job<PaymentProcessingJobData>,
      );

      expect(result.success).toBe(true);
    });

    it('should process payments in EUR', async () => {
      const mockJob = createMockPaymentJob({ currency: 'EUR', amount: 85.0 });

      const result = await processor.handleAuthorizePayment(
        mockJob as Job<PaymentProcessingJobData>,
      );

      expect(result.success).toBe(true);
    });

    it('should process payments in GBP', async () => {
      const mockJob = createMockPaymentJob({ currency: 'GBP', amount: 75.0 });

      const result = await processor.handleAuthorizePayment(
        mockJob as Job<PaymentProcessingJobData>,
      );

      expect(result.success).toBe(true);
    });

    it('should process payments in JPY', async () => {
      const mockJob = createMockPaymentJob({ currency: 'JPY', amount: 10000 });

      const result = await processor.handleAuthorizePayment(
        mockJob as Job<PaymentProcessingJobData>,
      );

      expect(result.success).toBe(true);
    });
  });
});
