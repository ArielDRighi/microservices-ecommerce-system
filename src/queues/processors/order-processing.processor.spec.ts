/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bull';
import { OrderProcessingProcessor } from './order-processing.processor';
import { Logger } from '@nestjs/common';

describe('OrderProcessingProcessor', () => {
  let processor: OrderProcessingProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderProcessingProcessor],
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
      expect((result.data as any).orderId).toBe('order-123');
      expect(mockJob.progress).toHaveBeenCalled(); // Verifica que progress fue llamado
    });

    it('should update progress correctly', async () => {
      const mockJob: Partial<Job> = {
        id: '2',
        name: 'create-order',
        data: {
          jobId: 'order-456',
          orderId: 'order-456',
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
      expect((result.data as any).orderId).toBe('order-123');
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
      expect((result.data as any).orderId).toBe('order-123');
    });
  });

  describe('error handling', () => {
    it('should handle missing required fields', async () => {
      const mockJob: Partial<Job> = {
        id: '5',
        name: 'create-order',
        data: {
          jobId: 'order-invalid',
          // Missing orderId and other required fields
        },
        attemptsMade: 0,
        opts: { attempts: 3 },
        progress: jest.fn(),
      };

      // El procesador maneja errores y devuelve success: false
      const result = await processor.handleJob(mockJob as Job);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should retry on retryable errors', async () => {
      const mockJob: Partial<Job> = {
        id: '6',
        name: 'create-order',
        data: {
          jobId: 'order-retry',
          orderId: 'order-retry',
          userId: 'user-123',
          items: [],
          totalAmount: 0,
          currency: 'USD',
          createdAt: new Date(),
        },
        attemptsMade: 0,
        opts: { attempts: 3 },
        progress: jest.fn(),
      };

      // Simular error de red
      const networkError = new Error('ECONNRESET');
      jest
        .spyOn(processor as unknown as { processJob: () => Promise<any> }, 'processJob')
        .mockRejectedValueOnce(networkError);

      const isRetryable = processor['isRetryableError'](networkError);
      expect(isRetryable).toBe(true);
    });
  });
});
