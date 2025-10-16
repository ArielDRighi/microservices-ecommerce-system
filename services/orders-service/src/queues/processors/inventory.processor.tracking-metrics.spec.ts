/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InventoryProcessor } from './inventory.processor';
import { InventoryManagementJobData } from '../../common/interfaces/queue-job.interface';
import {
  createMockInventoryJob,
  expectProgressSteps,
  expectProgressStepNames,
} from './helpers/inventory-processor.test-helpers';

describe('InventoryProcessor - Tracking & Metrics', () => {
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

  describe('processJob - Internal Logic', () => {
    it('should include processedAt timestamp in result', async () => {
      const mockJob = createMockInventoryJob();
      const beforeTime = new Date();

      const result = await processor.handleReserveInventory(
        mockJob as Job<InventoryManagementJobData>,
      );

      expect((result.data as any)?.processedAt).toBeInstanceOf(Date);
      expect((result.data as any)?.processedAt.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime(),
      );
    });

    it('should increment attemptsMade in result', async () => {
      const mockJob = createMockInventoryJob({}, { attemptsMade: 0 });

      const result = await processor.handleReserveInventory(
        mockJob as Job<InventoryManagementJobData>,
      );

      expect(result.attemptsMade).toBe(1);
    });

    it('should track multiple attempts correctly', async () => {
      const mockJob = createMockInventoryJob({}, { attemptsMade: 2 });

      const result = await processor.handleReserveInventory(
        mockJob as Job<InventoryManagementJobData>,
      );

      expect(result.attemptsMade).toBe(3);
    });

    it('should calculate duration correctly', async () => {
      const mockJob = createMockInventoryJob();

      const result = await processor.handleReserveInventory(
        mockJob as Job<InventoryManagementJobData>,
      );

      // duration can be 0 in tests since delay() is mocked
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(typeof result.duration).toBe('number');
    });

    it('should include all progress steps in correct order', async () => {
      const mockJob = createMockInventoryJob({ action: 'reserve' });
      const progressCalls: any[] = [];
      (mockJob.progress as jest.Mock).mockImplementation((progress) => {
        progressCalls.push(progress);
        return Promise.resolve();
      });

      await processor.handleReserveInventory(mockJob as Job<InventoryManagementJobData>);

      expectProgressSteps(progressCalls);
    });

    it('should include currentStep in progress updates', async () => {
      const mockJob = createMockInventoryJob();
      const progressCalls: any[] = [];
      (mockJob.progress as jest.Mock).mockImplementation((progress) => {
        progressCalls.push(progress);
        return Promise.resolve();
      });

      await processor.handleReserveInventory(mockJob as Job<InventoryManagementJobData>);

      expectProgressStepNames(progressCalls);
    });
  });

  describe('Logging and Metrics', () => {
    it('should log job start with all relevant data', async () => {
      const mockJob = createMockInventoryJob({
        action: 'reserve',
        productId: 'product-log-1',
        quantity: 15,
        orderId: 'order-log-1',
      });

      await processor.handleReserveInventory(mockJob as Job<InventoryManagementJobData>);

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Processing inventory reserve'),
        expect.objectContaining({
          productId: 'product-log-1',
          action: 'reserve',
          quantity: 15,
          orderId: 'order-log-1',
          jobId: '1',
        }),
      );
    });

    it('should log job completion', async () => {
      const mockJob = createMockInventoryJob();

      await processor.handleReserveInventory(mockJob as Job<InventoryManagementJobData>);

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('completed successfully'),
        expect.any(Object),
      );
    });

    it('should call logMetrics with job result', async () => {
      const mockJob = createMockInventoryJob();
      const logMetricsSpy = jest.spyOn(processor as any, 'logMetrics');

      await processor.handleReserveInventory(mockJob as Job<InventoryManagementJobData>);

      expect(logMetricsSpy).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
        }),
      );
    });

    it('should log metrics with correct processor name', async () => {
      const mockJob = createMockInventoryJob();

      await processor.handleReserveInventory(mockJob as Job<InventoryManagementJobData>);

      expect(Logger.prototype.debug).toHaveBeenCalledWith(
        expect.stringContaining('Job metrics'),
        expect.objectContaining({
          processorName: 'InventoryProcessor',
        }),
      );
    });
  });

  describe('Timing and Performance', () => {
    it('should include duration in job result', async () => {
      const mockJob = createMockInventoryJob();

      const result = await processor.handleReserveInventory(
        mockJob as Job<InventoryManagementJobData>,
      );

      // duration can be 0 in tests since delay() is mocked
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(typeof result.duration).toBe('number');
    });
  });
});
