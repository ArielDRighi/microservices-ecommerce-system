/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { OrderProcessingProcessor } from './order-processing.processor';
import { OrderProcessingSagaService } from '../../modules/orders/services/order-processing-saga.service';
import {
  createMockOrderJob,
  createMockConfirmOrderJob,
  createMockCancelOrderJob,
  createMockSagaService,
  expectJobSuccess,
  expectProgressCalled,
} from './helpers/order-processing-processor.test-helpers';

describe('OrderProcessingProcessor - Core Functionality', () => {
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

  describe('Service Definition', () => {
    it('should be defined', () => {
      expect(processor).toBeDefined();
    });
  });

  describe('handleJob - create-order', () => {
    it('should process order creation job successfully', async () => {
      const mockJob = createMockOrderJob();

      const result = await processor.handleJob(mockJob as Job);

      expect(result.success).toBe(true);
      expect(mockSagaService.executeSaga).toHaveBeenCalledWith('saga-123');
      expectProgressCalled(mockJob);
    });

    it('should update progress correctly', async () => {
      const mockJob = createMockOrderJob({
        id: '2',
        data: {
          jobId: 'order-456',
          orderId: 'order-456',
          sagaId: 'saga-456',
          userId: 'user-789',
          items: [{ productId: 'prod-1', quantity: 1 }],
          totalAmount: 99.99,
        },
      });

      const result = await processor.handleJob(mockJob as Job);

      expect(result.success).toBe(true);
      expectProgressCalled(mockJob);
    });
  });

  describe('handleJob - confirm-order', () => {
    it('should process order confirmation successfully', async () => {
      const mockJob = createMockConfirmOrderJob();

      const result = await processor.handleJob(mockJob as Job);

      expect(result.success).toBe(true);
      expect(mockSagaService.executeSaga).toHaveBeenCalledWith('saga-confirm-123');
    });
  });

  describe('handleJob - cancel-order', () => {
    it('should process order cancellation successfully', async () => {
      const mockJob = createMockCancelOrderJob();

      const result = await processor.handleJob(mockJob as Job);

      expect(result.success).toBe(true);
      expect(mockSagaService.executeSaga).toHaveBeenCalledWith('saga-cancel-123');
    });
  });

  describe('Processor Integration', () => {
    it('should process jobs with various data configurations', async () => {
      const mockJob = createMockOrderJob({
        id: '6',
        data: {
          jobId: 'order-flexible',
          orderId: 'order-flexible',
          sagaId: 'saga-flexible',
          userId: 'user-123',
          items: [{ productId: 'prod-1', quantity: 1 }],
          totalAmount: 99.99,
        },
      });

      const result = await processor.handleJob(mockJob as Job);

      expectJobSuccess(result);
      expect(mockSagaService.executeSaga).toHaveBeenCalledWith('saga-flexible');
    });
  });

  describe('Direct Handler Methods', () => {
    it('should call handleCreateOrder directly', async () => {
      const mockJob = createMockOrderJob({
        id: '7',
        data: {
          jobId: 'direct-create',
          orderId: 'order-direct-create',
          sagaId: 'saga-direct-create',
        },
      });

      const result = await processor.handleCreateOrder(mockJob as Job);

      expectJobSuccess(result);
      expect(mockSagaService.executeSaga).toHaveBeenCalledWith('saga-direct-create');
    });

    it('should call handleConfirmOrder directly', async () => {
      const mockJob = createMockConfirmOrderJob({
        id: '8',
        data: {
          jobId: 'direct-confirm',
          orderId: 'order-direct-confirm',
          sagaId: 'saga-direct-confirm',
        },
      });

      const result = await processor.handleConfirmOrder(mockJob as Job);

      expectJobSuccess(result);
      expect(mockSagaService.executeSaga).toHaveBeenCalledWith('saga-direct-confirm');
    });

    it('should call handleCancelOrder directly', async () => {
      const mockJob = createMockCancelOrderJob({
        id: '9',
        data: {
          jobId: 'direct-cancel',
          orderId: 'order-direct-cancel',
          sagaId: 'saga-direct-cancel',
        },
      });

      const result = await processor.handleCancelOrder(mockJob as Job);

      expectJobSuccess(result);
      expect(mockSagaService.executeSaga).toHaveBeenCalledWith('saga-direct-cancel');
    });
  });
});
