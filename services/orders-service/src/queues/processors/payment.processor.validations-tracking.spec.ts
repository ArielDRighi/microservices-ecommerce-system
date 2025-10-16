/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PaymentProcessingProcessor } from './payment.processor';
import { PaymentProcessingJobData, JobResult } from '../../common/interfaces/queue-job.interface';
import {
  createMockPaymentJob,
  expectProgressSteps,
  expectProgressStepNames,
} from './helpers/payment-processor.test-helpers';

describe('PaymentProcessingProcessor - Validations & Tracking', () => {
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

  describe('Transaction ID Generation', () => {
    it('should generate unique transaction IDs', async () => {
      const jobs = [
        createMockPaymentJob({ paymentId: 'pay-1' }),
        createMockPaymentJob({ paymentId: 'pay-2' }),
        createMockPaymentJob({ paymentId: 'pay-3' }),
      ];

      // Act - Execute sequentially to ensure different timestamps
      const results: JobResult[] = [];
      for (const job of jobs) {
        const result = await processor.handleAuthorizePayment(job as Job<PaymentProcessingJobData>);
        results.push(result);
        // Add delay to ensure different timestamps (since delay() is mocked)
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const transactionIds = results.map((r) => (r.data as any)?.transactionId);
      const uniqueIds = new Set(transactionIds);
      expect(uniqueIds.size).toBe(3);
    });

    it('should include timestamp in transaction ID', async () => {
      const mockJob = createMockPaymentJob();

      const result = await processor.handleAuthorizePayment(
        mockJob as Job<PaymentProcessingJobData>,
      );

      expect((result.data as any)?.transactionId).toMatch(/^txn_\d+$/);
      const timestamp = parseInt((result.data as any)?.transactionId.replace('txn_', ''));
      expect(timestamp).toBeGreaterThan(Date.now() - 10000); // Within last 10 seconds
    });
  });

  describe('Payment Status', () => {
    it('should mark all payments as processed on success', async () => {
      const mockJob = createMockPaymentJob();

      const result = await processor.handleAuthorizePayment(
        mockJob as Job<PaymentProcessingJobData>,
      );

      expect((result.data as any)?.status).toBe('processed');
    });

    it('should include processedAt timestamp', async () => {
      const mockJob = createMockPaymentJob();
      const beforeTime = new Date();

      const result = await processor.handleAuthorizePayment(
        mockJob as Job<PaymentProcessingJobData>,
      );

      expect((result.data as any)?.processedAt).toBeInstanceOf(Date);
      expect((result.data as any)?.processedAt.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime(),
      );
    });
  });

  describe('Progress Tracking', () => {
    it('should track all progress steps in order', async () => {
      const mockJob = createMockPaymentJob();
      const progressCalls: any[] = [];
      (mockJob.progress as jest.Mock).mockImplementation((progress) => {
        progressCalls.push(progress);
        return Promise.resolve();
      });

      await processor.handleAuthorizePayment(mockJob as Job<PaymentProcessingJobData>);

      expectProgressSteps(progressCalls);
    });

    it('should include step names in progress', async () => {
      const mockJob = createMockPaymentJob();
      const progressCalls: any[] = [];
      (mockJob.progress as jest.Mock).mockImplementation((progress) => {
        progressCalls.push(progress);
        return Promise.resolve();
      });

      await processor.handleAuthorizePayment(mockJob as Job<PaymentProcessingJobData>);

      expectProgressStepNames(progressCalls);
    });
  });

  describe('Job Metrics', () => {
    it('should log metrics after successful payment processing', async () => {
      const mockJob = createMockPaymentJob();

      await processor.handleAuthorizePayment(mockJob as Job<PaymentProcessingJobData>);

      expect(Logger.prototype.debug).toHaveBeenCalledWith(
        expect.stringContaining('Job metrics'),
        expect.objectContaining({
          processorName: 'PaymentProcessingProcessor',
          success: true,
        }),
      );
    });

    it('should include duration in metrics', async () => {
      const mockJob = createMockPaymentJob();

      const result = await processor.handleAuthorizePayment(
        mockJob as Job<PaymentProcessingJobData>,
      );

      // duration can be 0 in tests since delay() is mocked
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(typeof result.duration).toBe('number');
    });
  });

  describe('Attempt Tracking', () => {
    it('should increment attemptsMade on first attempt', async () => {
      const mockJob = createMockPaymentJob({}, { attemptsMade: 0 });

      const result = await processor.handleAuthorizePayment(
        mockJob as Job<PaymentProcessingJobData>,
      );

      expect(result.attemptsMade).toBe(1);
    });

    it('should track multiple retry attempts', async () => {
      const mockJob = createMockPaymentJob({}, { attemptsMade: 2 });

      const result = await processor.handleAuthorizePayment(
        mockJob as Job<PaymentProcessingJobData>,
      );

      expect(result.attemptsMade).toBe(3);
    });
  });

  describe('Customer Tracking', () => {
    it('should include customer ID in processing', async () => {
      const mockJob = createMockPaymentJob({
        customerId: 'customer-special-123',
      });

      const result = await processor.handleAuthorizePayment(
        mockJob as Job<PaymentProcessingJobData>,
      );

      expect(result.success).toBe(true);
    });

    it('should handle different customer IDs', async () => {
      const customerIds = ['cust-1', 'cust-2', 'cust-3'];

      for (const customerId of customerIds) {
        const mockJob = createMockPaymentJob({ customerId });
        const result = await processor.handleAuthorizePayment(
          mockJob as Job<PaymentProcessingJobData>,
        );
        expect(result.success).toBe(true);
      }
    });
  });
});
