/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InventoryProcessor } from './inventory.processor';
import { InventoryManagementJobData } from '../../common/interfaces/queue-job.interface';
import {
  createMockInventoryJob,
  expectInventoryJobSuccess,
  expectInventoryData,
} from './helpers/inventory-processor.test-helpers';

describe('InventoryProcessor - Core Functionality', () => {
  let processor: InventoryProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InventoryProcessor],
    }).compile();

    processor = module.get<InventoryProcessor>(InventoryProcessor);

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
      expect((processor as any).processorName).toBe('InventoryProcessor');
    });

    it('should have logger instance', () => {
      expect((processor as any).logger).toBeDefined();
      expect((processor as any).logger).toBeInstanceOf(Logger);
    });
  });

  describe('handleReserveInventory', () => {
    it('should process reserve inventory job successfully', async () => {
      const mockJob = createMockInventoryJob({
        action: 'reserve',
        productId: 'product-123',
        quantity: 10,
        orderId: 'order-456',
      });

      const result = await processor.handleReserveInventory(
        mockJob as Job<InventoryManagementJobData>,
      );

      expectInventoryJobSuccess(result);
      expectInventoryData(result, 'product-123', 'reserve', 10);
    });

    it('should update progress during reserve operation', async () => {
      const mockJob = createMockInventoryJob({ action: 'reserve' });

      await processor.handleReserveInventory(mockJob as Job<InventoryManagementJobData>);

      expect(mockJob.progress).toHaveBeenCalledWith({
        percentage: 0,
        message: 'Job started',
      });
      expect(mockJob.progress).toHaveBeenCalledWith({
        percentage: 30,
        message: 'Validating reserve operation',
        currentStep: 'validation',
      });
      expect(mockJob.progress).toHaveBeenCalledWith({
        percentage: 60,
        message: 'Executing reserve',
        currentStep: 'execution',
      });
      expect(mockJob.progress).toHaveBeenCalledWith({
        percentage: 90,
        message: 'Updating records',
        currentStep: 'record-update',
      });
      expect(mockJob.progress).toHaveBeenCalledWith({
        percentage: 100,
        message: 'Job completed',
      });
    });

    it('should include orderId in result when provided', async () => {
      const mockJob = createMockInventoryJob({
        action: 'reserve',
        orderId: 'order-789',
      });

      const result = await processor.handleReserveInventory(
        mockJob as Job<InventoryManagementJobData>,
      );

      expect(result.success).toBe(true);
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Processing inventory reserve'),
        expect.objectContaining({
          orderId: 'order-789',
        }),
      );
    });

    it('should process reserve with reservationId', async () => {
      const mockJob = createMockInventoryJob({
        action: 'reserve',
        reservationId: 'res-123',
      });

      const result = await processor.handleReserveInventory(
        mockJob as Job<InventoryManagementJobData>,
      );

      expect(result.success).toBe(true);
    });
  });

  describe('handleReleaseInventory', () => {
    it('should process release inventory job successfully', async () => {
      const mockJob = createMockInventoryJob({
        action: 'release',
        productId: 'product-456',
        quantity: 3,
        reservationId: 'res-789',
      });

      const result = await processor.handleReleaseInventory(
        mockJob as Job<InventoryManagementJobData>,
      );

      expectInventoryJobSuccess(result);
      expectInventoryData(result, 'product-456', 'release', 3);
    });

    it('should update progress during release operation', async () => {
      const mockJob = createMockInventoryJob({ action: 'release' });

      await processor.handleReleaseInventory(mockJob as Job<InventoryManagementJobData>);

      expect(mockJob.progress).toHaveBeenCalledWith(
        expect.objectContaining({
          percentage: 30,
          message: 'Validating release operation',
        }),
      );
      expect(mockJob.progress).toHaveBeenCalledWith(
        expect.objectContaining({
          percentage: 60,
          message: 'Executing release',
        }),
      );
    });

    it('should log release operation with correct context', async () => {
      const mockJob = createMockInventoryJob({
        action: 'release',
        productId: 'product-999',
        quantity: 7,
      });

      await processor.handleReleaseInventory(mockJob as Job<InventoryManagementJobData>);

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('release'),
        expect.objectContaining({
          productId: 'product-999',
          action: 'release',
          quantity: 7,
        }),
      );
    });

    it('should include reason in release operation when provided', async () => {
      const mockJob = createMockInventoryJob({
        action: 'release',
        reason: 'Order cancelled',
      });

      const result = await processor.handleReleaseInventory(
        mockJob as Job<InventoryManagementJobData>,
      );

      expect(result.success).toBe(true);
    });
  });

  describe('handleConfirmInventory', () => {
    it('should process confirm inventory job successfully', async () => {
      const mockJob = createMockInventoryJob({
        action: 'confirm',
        productId: 'product-111',
        quantity: 2,
        orderId: 'order-222',
      });

      const result = await processor.handleConfirmInventory(
        mockJob as Job<InventoryManagementJobData>,
      );

      expectInventoryJobSuccess(result);
      expectInventoryData(result, 'product-111', 'confirm', 2);
    });

    it('should update progress during confirm operation', async () => {
      const mockJob = createMockInventoryJob({ action: 'confirm' });

      await processor.handleConfirmInventory(mockJob as Job<InventoryManagementJobData>);

      expect(mockJob.progress).toHaveBeenCalledWith(
        expect.objectContaining({
          percentage: 30,
          message: 'Validating confirm operation',
        }),
      );
      expect(mockJob.progress).toHaveBeenCalledWith(
        expect.objectContaining({
          percentage: 60,
          message: 'Executing confirm',
        }),
      );
    });

    it('should log confirm operation with job ID', async () => {
      const mockJob = createMockInventoryJob(
        {
          action: 'confirm',
        },
        { id: 'job-confirm-123' },
      );

      await processor.handleConfirmInventory(mockJob as Job<InventoryManagementJobData>);

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('confirm'),
        expect.objectContaining({
          jobId: 'job-confirm-123',
        }),
      );
    });
  });

  describe('handleReplenishInventory', () => {
    it('should process replenish inventory job successfully', async () => {
      const mockJob = createMockInventoryJob({
        action: 'replenish',
        productId: 'product-777',
        quantity: 50,
      });

      const result = await processor.handleReplenishInventory(
        mockJob as Job<InventoryManagementJobData>,
      );

      expectInventoryJobSuccess(result);
      expectInventoryData(result, 'product-777', 'replenish', 50);
    });

    it('should update progress during replenish operation', async () => {
      const mockJob = createMockInventoryJob({ action: 'replenish' });

      await processor.handleReplenishInventory(mockJob as Job<InventoryManagementJobData>);

      expect(mockJob.progress).toHaveBeenCalledWith(
        expect.objectContaining({
          percentage: 30,
          message: 'Validating replenish operation',
        }),
      );
      expect(mockJob.progress).toHaveBeenCalledWith(
        expect.objectContaining({
          percentage: 60,
          message: 'Executing replenish',
        }),
      );
    });

    it('should process large quantity replenishment', async () => {
      const mockJob = createMockInventoryJob({
        action: 'replenish',
        productId: 'product-888',
        quantity: 1000,
      });

      const result = await processor.handleReplenishInventory(
        mockJob as Job<InventoryManagementJobData>,
      );

      expect(result.success).toBe(true);
      expect((result.data as any)?.quantity).toBe(1000);
    });

    it('should log replenish operation details', async () => {
      const mockJob = createMockInventoryJob({
        action: 'replenish',
        productId: 'product-555',
      });

      await processor.handleReplenishInventory(mockJob as Job<InventoryManagementJobData>);

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('replenish'),
        expect.objectContaining({
          productId: 'product-555',
          action: 'replenish',
        }),
      );
    });
  });
});
