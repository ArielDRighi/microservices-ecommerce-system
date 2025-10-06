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
  createMockSagaMetricsCompensated,
  createMockSagaMetricsFailed,
} from './helpers/order-processing-processor.test-helpers';

describe('OrderProcessingProcessor - Error Handling', () => {
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

  describe('Error Scenarios', () => {
    it('should handle processing without sagaId (backwards compatibility)', async () => {
      const mockJob = createMockOrderJob({
        id: '10',
        data: {
          jobId: 'order-no-saga',
          orderId: 'order-no-saga',
          // sagaId is missing - should process without saga pattern
          userId: 'user-123',
          items: [{ productId: 'prod-1', quantity: 1 }],
          totalAmount: 99.99,
        },
      });

      const result = await processor.handleCreateOrder(mockJob as Job);

      // Verify warning was logged and job succeeded
      expect(Logger.prototype.warn).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect((result.data as any).status).toBe('COMPLETED');
    });

    it('should handle saga execution failure', async () => {
      mockSagaService.executeSaga.mockRejectedValueOnce(new Error('Saga execution failed'));

      const mockJob = createMockOrderJob({
        id: '11',
        data: {
          jobId: 'order-fail',
          orderId: 'order-fail',
          sagaId: 'saga-fail',
        },
        attemptsMade: 1,
      });

      // When saga throws, processJob catches and returns error result
      // BaseProcessor logs the error
      await processor.handleCreateOrder(mockJob as Job);

      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  describe('Saga Compensation Scenarios', () => {
    it('should handle saga with compensation executed', async () => {
      mockSagaService.executeSaga.mockResolvedValueOnce(createMockSagaMetricsCompensated());

      const mockJob = createMockOrderJob({
        id: '12',
        data: {
          jobId: 'order-compensate',
          orderId: 'order-compensate',
          sagaId: 'saga-compensate',
        },
      });

      const result = await processor.handleCreateOrder(mockJob as Job);

      // Verify job was processed
      expect(result).toBeDefined();
      expect(result.processedAt).toBeDefined();
      // Verify saga completed with compensation
      expect(mockSagaService.executeSaga).toHaveBeenCalledWith('saga-compensate');
    });

    it('should handle saga with FAILED status', async () => {
      mockSagaService.executeSaga.mockResolvedValueOnce(createMockSagaMetricsFailed());

      const mockJob = createMockOrderJob({
        id: '13',
        data: {
          jobId: 'order-failed',
          orderId: 'order-failed',
          sagaId: 'saga-failed',
        },
        attemptsMade: 2,
      });

      const result = await processor.handleCreateOrder(mockJob as Job);

      // Verify job was processed
      expect(result).toBeDefined();
      expect(result.processedAt).toBeDefined();
      expect(mockSagaService.executeSaga).toHaveBeenCalledWith('saga-failed');
    });
  });
});
