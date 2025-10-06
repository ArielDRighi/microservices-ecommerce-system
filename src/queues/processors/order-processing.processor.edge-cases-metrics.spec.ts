/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { OrderProcessingProcessor } from './order-processing.processor';
import { OrderProcessingSagaService } from '../../modules/orders/services/order-processing-saga.service';
import {
  createMockOrderJob,
  createMockSagaService,
  createMockCircuitBreakerStatsOpen,
  expectJobSuccess,
} from './helpers/order-processing-processor.test-helpers';

describe('OrderProcessingProcessor - Edge Cases & Metrics', () => {
  let processor: OrderProcessingProcessor;
  let mockSagaService: ReturnType<typeof createMockSagaService>;

  beforeEach(async () => {
    mockSagaService = createMockSagaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderProcessingProcessor,
        {
          provide: OrderProcessingSagaService,
          useValue: mockSagaService,
        },
      ],
    }).compile();

    processor = module.get<OrderProcessingProcessor>(OrderProcessingProcessor);

    // Mock logger to avoid console spam
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Circuit Breaker Stats Logging', () => {
    it('should log saga metrics including circuit breaker stats', async () => {
      const mockJob = createMockOrderJob({
        id: '14',
        data: {
          jobId: 'order-metrics',
          orderId: 'order-metrics',
          sagaId: 'saga-metrics',
        },
      });

      const result = await processor.handleJob(mockJob as Job);

      // Verify job completed successfully
      expect(result.success).toBe(true);
      // Verify logging was called (logSagaMetrics is private and calls getCircuitBreakerStats)
      expect(Logger.prototype.debug).toHaveBeenCalled();
    });

    it('should handle different circuit breaker states', async () => {
      mockSagaService.getCircuitBreakerStats.mockReturnValueOnce(
        createMockCircuitBreakerStatsOpen(),
      );

      const mockJob = createMockOrderJob({
        id: '15',
        data: {
          jobId: 'order-cb-open',
          orderId: 'order-cb-open',
          sagaId: 'saga-cb-open',
        },
      });

      const result = await processor.handleJob(mockJob as Job);

      // Verify job completed
      expect(result.success).toBe(true);
      expect(Logger.prototype.debug).toHaveBeenCalled();
    });
  });

  describe('Progress Tracking Details', () => {
    it('should track progress with step details', async () => {
      const mockJob = createMockOrderJob({
        id: '16',
        data: {
          jobId: 'order-progress',
          orderId: 'order-progress',
          sagaId: 'saga-progress',
          items: [{ productId: 'prod-1', quantity: 2 }],
          totalAmount: 199.99,
        },
      });

      await processor.handleJob(mockJob as Job);

      // Verify saga-start progress (called by processJob)
      expect(mockJob.progress).toHaveBeenCalledWith(
        expect.objectContaining({
          percentage: 10,
          message: 'Starting order processing saga',
          currentStep: 'saga-start',
        }),
      );

      // Progress is also called by BaseProcessor for 0% and 100%
      expect(mockJob.progress).toHaveBeenCalled();
    });
  });

  describe('Saga Metrics Logging Details', () => {
    it('should log detailed step metrics with retries', async () => {
      mockSagaService.executeSaga.mockResolvedValueOnce({
        finalStatus: 'COMPLETED',
        totalDurationMs: 3500,
        compensationExecuted: false,
        orderId: 'order-detailed',
        stepMetrics: [
          { step: 'STOCK_VERIFIED', success: true, durationMs: 150, retryCount: 0 },
          { step: 'STOCK_RESERVED', success: true, durationMs: 250, retryCount: 1 },
          { step: 'PAYMENT_PROCESSING', success: true, durationMs: 500, retryCount: 2 },
          { step: 'PAYMENT_COMPLETED', success: true, durationMs: 200, retryCount: 0 },
        ],
      });

      const mockJob = createMockOrderJob({
        id: '17',
        data: {
          jobId: 'order-detailed',
          orderId: 'order-detailed',
          sagaId: 'saga-detailed',
        },
      });

      await processor.handleJob(mockJob as Job);

      // Verify detailed logging was called
      expect(Logger.prototype.debug).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple retry attempts', async () => {
      const mockJob = createMockOrderJob({
        id: '18',
        data: {
          jobId: 'order-retry',
          orderId: 'order-retry',
          sagaId: 'saga-retry',
        },
        attemptsMade: 5,
        opts: { attempts: 10 },
      });

      const result = await processor.handleJob(mockJob as Job);

      expect(result.success).toBe(true);
      expect(result.attemptsMade).toBe(6);
    });

    it('should handle large order amounts', async () => {
      const mockJob = createMockOrderJob({
        id: '19',
        data: {
          jobId: 'order-large',
          orderId: 'order-large',
          sagaId: 'saga-large',
          items: [
            { productId: 'prod-1', quantity: 100 },
            { productId: 'prod-2', quantity: 200 },
          ],
          totalAmount: 99999.99,
        },
      });

      const result = await processor.handleCreateOrder(mockJob as Job);

      // Verify job was processed
      expect(result).toBeDefined();
      expect(result.processedAt).toBeDefined();
      expect(mockSagaService.executeSaga).toHaveBeenCalled();
    });

    it('should handle different currencies', async () => {
      const currencies = ['EUR', 'GBP', 'JPY', 'CAD'];

      for (const currency of currencies) {
        const mockJob = createMockOrderJob({
          id: `currency-${currency}`,
          data: {
            jobId: `order-${currency}`,
            orderId: `order-${currency}`,
            sagaId: `saga-${currency}`,
            currency,
          },
        });

        const result = await processor.handleJob(mockJob as Job);
        expect(result.success).toBe(true);
      }
    });
  });
});
