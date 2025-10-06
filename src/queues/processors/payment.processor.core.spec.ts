/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PaymentProcessingProcessor } from './payment.processor';
import { PaymentProcessingJobData } from '../../common/interfaces/queue-job.interface';
import {
  createMockPaymentJob,
  expectPaymentJobSuccess,
  expectPaymentData,
} from './helpers/payment-processor.test-helpers';

describe('PaymentProcessingProcessor - Core Functionality', () => {
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

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(processor).toBeDefined();
    });

    it('should have correct processor name', () => {
      expect((processor as any).processorName).toBe('PaymentProcessingProcessor');
    });

    it('should have logger instance', () => {
      expect((processor as any).logger).toBeDefined();
      expect((processor as any).logger).toBeInstanceOf(Logger);
    });
  });

  describe('handleAuthorizePayment', () => {
    it('should process payment authorization successfully', async () => {
      const mockJob = createMockPaymentJob({
        orderId: 'order-001',
        paymentId: 'pay-001',
        amount: 150.0,
        currency: 'USD',
        paymentMethod: 'credit_card',
        customerId: 'customer-001',
      });

      const result = await processor.handleAuthorizePayment(
        mockJob as Job<PaymentProcessingJobData>,
      );

      expectPaymentData(result, 'pay-001', 'order-001');
    });

    it('should update progress during authorization', async () => {
      const mockJob = createMockPaymentJob();

      await processor.handleAuthorizePayment(mockJob as Job<PaymentProcessingJobData>);

      expect(mockJob.progress).toHaveBeenCalledWith({
        percentage: 0,
        message: 'Job started',
      });
      expect(mockJob.progress).toHaveBeenCalledWith({
        percentage: 20,
        message: 'Validating payment method',
        currentStep: 'validation',
      });
      expect(mockJob.progress).toHaveBeenCalledWith({
        percentage: 40,
        message: 'Contacting payment gateway',
        currentStep: 'gateway-communication',
      });
      expect(mockJob.progress).toHaveBeenCalledWith({
        percentage: 70,
        message: 'Processing transaction',
        currentStep: 'transaction-processing',
      });
      expect(mockJob.progress).toHaveBeenCalledWith({
        percentage: 90,
        message: 'Verifying result',
        currentStep: 'verification',
      });
      expect(mockJob.progress).toHaveBeenCalledWith({
        percentage: 100,
        message: 'Job completed',
      });
    });

    it('should log payment authorization details', async () => {
      const mockJob = createMockPaymentJob({
        paymentId: 'pay-log-1',
        orderId: 'order-log-1',
        amount: 250.5,
        currency: 'EUR',
      });

      await processor.handleAuthorizePayment(mockJob as Job<PaymentProcessingJobData>);

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Processing payment pay-log-1'),
        expect.objectContaining({
          paymentId: 'pay-log-1',
          orderId: 'order-log-1',
          amount: 250.5,
          currency: 'EUR',
        }),
      );
    });

    it('should handle large payment amounts', async () => {
      const mockJob = createMockPaymentJob({
        amount: 9999.99,
      });

      const result = await processor.handleAuthorizePayment(
        mockJob as Job<PaymentProcessingJobData>,
      );

      expect(result.success).toBe(true);
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          amount: 9999.99,
        }),
      );
    });

    it('should handle different payment methods', async () => {
      const paymentMethods: Array<'credit_card' | 'debit_card' | 'bank_transfer' | 'paypal'> = [
        'credit_card',
        'debit_card',
        'bank_transfer',
        'paypal',
      ];

      for (const method of paymentMethods) {
        const mockJob = createMockPaymentJob({ paymentMethod: method });
        const result = await processor.handleAuthorizePayment(
          mockJob as Job<PaymentProcessingJobData>,
        );
        expect(result.success).toBe(true);
      }
    });
  });

  describe('handleCapturePayment', () => {
    it('should process payment capture successfully', async () => {
      const mockJob = createMockPaymentJob({
        orderId: 'order-002',
        paymentId: 'pay-002',
        amount: 75.0,
        currency: 'GBP',
      });

      const result = await processor.handleCapturePayment(mockJob as Job<PaymentProcessingJobData>);

      expectPaymentData(result, 'pay-002', 'order-002');
    });

    it('should update progress during capture', async () => {
      const mockJob = createMockPaymentJob();

      await processor.handleCapturePayment(mockJob as Job<PaymentProcessingJobData>);

      expect(mockJob.progress).toHaveBeenCalledWith(
        expect.objectContaining({
          percentage: 40,
          message: 'Contacting payment gateway',
        }),
      );
    });

    it('should log capture operation', async () => {
      const mockJob = createMockPaymentJob({
        paymentId: 'pay-capture-1',
      });

      await processor.handleCapturePayment(mockJob as Job<PaymentProcessingJobData>);

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('pay-capture-1'),
        expect.any(Object),
      );
    });

    it('should handle captures with different currencies', async () => {
      const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD'];

      for (const currency of currencies) {
        const mockJob = createMockPaymentJob({ currency });
        const result = await processor.handleCapturePayment(
          mockJob as Job<PaymentProcessingJobData>,
        );
        expect(result.success).toBe(true);
      }
    });
  });

  describe('handleRefundPayment', () => {
    it('should process payment refund successfully', async () => {
      const mockJob = createMockPaymentJob({
        orderId: 'order-003',
        paymentId: 'pay-003',
        amount: 50.0,
        currency: 'USD',
      });

      const result = await processor.handleRefundPayment(mockJob as Job<PaymentProcessingJobData>);

      expectPaymentJobSuccess(result);
      expect((result.data as any)?.paymentId).toBe('pay-003');
    });

    it('should update progress during refund', async () => {
      const mockJob = createMockPaymentJob();

      await processor.handleRefundPayment(mockJob as Job<PaymentProcessingJobData>);

      expect(mockJob.progress).toHaveBeenCalledWith(
        expect.objectContaining({
          percentage: 70,
          message: 'Processing transaction',
        }),
      );
    });

    it('should handle partial refunds', async () => {
      const mockJob = createMockPaymentJob({
        amount: 25.0, // Partial refund of original 99.99
      });

      const result = await processor.handleRefundPayment(mockJob as Job<PaymentProcessingJobData>);

      expect(result.success).toBe(true);
    });

    it('should log refund details', async () => {
      const mockJob = createMockPaymentJob({
        paymentId: 'pay-refund-1',
        amount: 100.0,
      });

      await processor.handleRefundPayment(mockJob as Job<PaymentProcessingJobData>);

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('pay-refund-1'),
        expect.objectContaining({
          amount: 100.0,
        }),
      );
    });
  });

  describe('All Operation Types', () => {
    it('should handle authorize, capture, and refund operations', async () => {
      const mockJob = createMockPaymentJob({
        paymentId: 'pay-all-ops',
      });

      const authorizeResult = await processor.handleAuthorizePayment(
        mockJob as Job<PaymentProcessingJobData>,
      );
      const captureResult = await processor.handleCapturePayment(
        mockJob as Job<PaymentProcessingJobData>,
      );
      const refundResult = await processor.handleRefundPayment(
        mockJob as Job<PaymentProcessingJobData>,
      );

      expect(authorizeResult.success).toBe(true);
      expect(captureResult.success).toBe(true);
      expect(refundResult.success).toBe(true);
    });
  });
});
