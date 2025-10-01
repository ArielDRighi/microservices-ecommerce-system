/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bull';
import { OrderProcessingProcessor } from './order-processing.processor';
import { Logger } from '@nestjs/common';
import { OrderProcessingSagaService } from '../../modules/orders/services/order-processing-saga.service';

describe('OrderProcessingProcessor', () => {
  let processor: OrderProcessingProcessor;

  const mockSagaService = {
    executeSaga: jest.fn().mockResolvedValue({
      finalStatus: 'COMPLETED',
      totalDurationMs: 1000,
      compensationExecuted: false,
      stepMetrics: [
        { step: 'STOCK_VERIFIED', success: true, durationMs: 100, retries: 0 },
        { step: 'STOCK_RESERVED', success: true, durationMs: 150, retries: 0 },
        { step: 'PAYMENT_PROCESSING', success: true, durationMs: 200, retries: 0 },
        { step: 'PAYMENT_COMPLETED', success: true, durationMs: 150, retries: 0 },
        { step: 'NOTIFICATION_SENT', success: true, durationMs: 100, retries: 0 },
        { step: 'CONFIRMED', success: true, durationMs: 100, retries: 0 },
      ],
      circuitBreakerStats: {
        payment: { state: 'CLOSED', failures: 0, successes: 1, lastFailureTime: null },
        inventory: { state: 'CLOSED', failures: 0, successes: 2, lastFailureTime: null },
        notification: { state: 'CLOSED', failures: 0, successes: 1, lastFailureTime: null },
      },
    }),
  };

  beforeEach(async () => {
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleJob - create-order', () => {
    it('should process order creation job successfully', async () => {
      const mockJob: Partial<Job> = {
        id: '1',
        name: 'create-order',
        data: {
          jobId: 'order-123',
          orderId: 'order-123',
          sagaId: 'saga-123',
          userId: 'user-456',
          items: [
            { productId: 'prod-1', quantity: 2 },
            { productId: 'prod-2', quantity: 1 },
          ],
          totalAmount: 299.99,
          currency: 'USD',
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            country: 'US',
          },
          createdAt: new Date(),
        },
        attemptsMade: 0,
        opts: { attempts: 3 },
        progress: jest.fn(),
      };

      const result = await processor.handleJob(mockJob as Job);

      expect(result.success).toBe(true);
      expect(mockSagaService.executeSaga).toHaveBeenCalledWith('saga-123');
      expect(mockJob.progress).toHaveBeenCalled(); // Verifica que progress fue llamado
    });

    it('should update progress correctly', async () => {
      const mockJob: Partial<Job> = {
        id: '2',
        name: 'create-order',
        data: {
          jobId: 'order-456',
          orderId: 'order-456',
          sagaId: 'saga-456',
          userId: 'user-789',
          items: [{ productId: 'prod-1', quantity: 1 }],
          totalAmount: 99.99,
          currency: 'USD',
          createdAt: new Date(),
        },
        attemptsMade: 0,
        opts: { attempts: 3 },
        progress: jest.fn(),
      };

      const result = await processor.handleJob(mockJob as Job);

      // Verificar que el job se completó exitosamente
      expect(result.success).toBe(true);
      // Verificar que progress se llamó al menos una vez
      expect(mockJob.progress).toHaveBeenCalled();
    });
  });

  describe('handleJob - confirm-order', () => {
    it('should process order confirmation successfully', async () => {
      const mockJob: Partial<Job> = {
        id: '3',
        name: 'confirm-order',
        data: {
          jobId: 'confirm-order-123',
          orderId: 'order-123',
          sagaId: 'saga-confirm-123',
          userId: 'user-456',
          items: [{ productId: 'prod-1', quantity: 1 }],
          totalAmount: 99.99,
          currency: 'USD',
          paymentId: 'payment-456',
          createdAt: new Date(),
        },
        attemptsMade: 0,
        opts: { attempts: 3 },
        progress: jest.fn(),
      };

      const result = await processor.handleJob(mockJob as Job);

      expect(result.success).toBe(true);
      expect(mockSagaService.executeSaga).toHaveBeenCalledWith('saga-confirm-123');
    });
  });

  describe('handleJob - cancel-order', () => {
    it('should process order cancellation successfully', async () => {
      const mockJob: Partial<Job> = {
        id: '4',
        name: 'cancel-order',
        data: {
          jobId: 'cancel-order-123',
          orderId: 'order-123',
          sagaId: 'saga-cancel-123',
          userId: 'user-456',
          items: [{ productId: 'prod-1', quantity: 1 }],
          totalAmount: 99.99,
          currency: 'USD',
          reason: 'Customer requested cancellation',
          createdAt: new Date(),
        },
        attemptsMade: 0,
        opts: { attempts: 3 },
        progress: jest.fn(),
      };

      const result = await processor.handleJob(mockJob as Job);

      expect(result.success).toBe(true);
      expect(mockSagaService.executeSaga).toHaveBeenCalledWith('saga-cancel-123');
    });
  });

  describe('processor integration', () => {
    it('should process jobs with various data configurations', async () => {
      // Test with minimal valid data to verify processor flexibility
      const mockJob: Partial<Job> = {
        id: '6',
        name: 'create-order',
        data: {
          jobId: 'order-flexible',
          orderId: 'order-flexible',
          sagaId: 'saga-flexible',
          userId: 'user-123',
          items: [{ productId: 'prod-1', quantity: 1 }],
          totalAmount: 99.99,
          currency: 'USD',
          createdAt: new Date(),
        },
        attemptsMade: 0,
        opts: { attempts: 3 },
        progress: jest.fn(),
      };

      // Test the public interface with valid data
      const result = await processor.handleJob(mockJob as Job);

      // Verify successful processing
      expect(result.success).toBe(true);
      expect(mockSagaService.executeSaga).toHaveBeenCalledWith('saga-flexible');
    });
  });
});
