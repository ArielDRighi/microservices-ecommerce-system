/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InventoryProcessor } from './inventory.processor';
import { InventoryManagementJobData, JobResult } from '../../common/interfaces/queue-job.interface';
import { createMockInventoryJob } from './helpers/inventory-processor.test-helpers';

describe('InventoryProcessor - Edge Cases', () => {
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

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle job with minimal required fields', async () => {
      const mockJob = createMockInventoryJob({
        action: 'reserve',
        productId: 'product-min',
        quantity: 1,
      });

      const result = await processor.handleReserveInventory(
        mockJob as Job<InventoryManagementJobData>,
      );

      expect(result.success).toBe(true);
    });

    it('should handle job with all optional fields', async () => {
      const mockJob = createMockInventoryJob({
        action: 'reserve',
        productId: 'product-full',
        quantity: 10,
        orderId: 'order-123',
        reservationId: 'res-456',
        reason: 'Customer request',
        correlationId: 'corr-789',
        userId: 'user-111',
        metadata: { source: 'web', priority: 'high' },
      });

      const result = await processor.handleReserveInventory(
        mockJob as Job<InventoryManagementJobData>,
      );

      expect(result.success).toBe(true);
    });

    it('should handle zero quantity gracefully', async () => {
      const mockJob = createMockInventoryJob({
        quantity: 0,
      });

      const result = await processor.handleReserveInventory(
        mockJob as Job<InventoryManagementJobData>,
      );

      expect(result.success).toBe(true);
      expect((result.data as any)?.quantity).toBe(0);
    });

    it('should handle progress update failure gracefully', async () => {
      const mockJob = createMockInventoryJob();
      (mockJob.progress as jest.Mock).mockRejectedValueOnce(new Error('Progress failed'));

      const result = await processor.handleReserveInventory(
        mockJob as Job<InventoryManagementJobData>,
      );

      expect(result.success).toBe(true); // Job should still succeed
      expect(Logger.prototype.warn).toHaveBeenCalled();
    });

    it('should process different product IDs correctly', async () => {
      const products = ['prod-a', 'prod-b', 'prod-c'];
      const results: JobResult[] = [];

      for (const productId of products) {
        const mockJob = createMockInventoryJob({ productId });
        const result = await processor.handleReserveInventory(
          mockJob as Job<InventoryManagementJobData>,
        );
        results.push(result);
      }

      expect(results).toHaveLength(3);
      expect((results[0]?.data as any)?.productId).toBe('prod-a');
      expect((results[1]?.data as any)?.productId).toBe('prod-b');
      expect((results[2]?.data as any)?.productId).toBe('prod-c');
    });

    it('should handle concurrent job processing', async () => {
      const jobs = [
        createMockInventoryJob({ productId: 'prod-1' }),
        createMockInventoryJob({ productId: 'prod-2' }),
        createMockInventoryJob({ productId: 'prod-3' }),
      ];

      const results = await Promise.all(
        jobs.map((job) => processor.handleReserveInventory(job as Job<InventoryManagementJobData>)),
      );

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
    });
  });

  describe('Different Action Types', () => {
    it('should handle all four action types correctly', async () => {
      const actions: Array<'reserve' | 'release' | 'confirm' | 'replenish'> = [
        'reserve',
        'release',
        'confirm',
        'replenish',
      ];

      for (const action of actions) {
        const mockJob = createMockInventoryJob({ action });
        let result: JobResult;

        switch (action) {
          case 'reserve':
            result = await processor.handleReserveInventory(
              mockJob as Job<InventoryManagementJobData>,
            );
            break;
          case 'release':
            result = await processor.handleReleaseInventory(
              mockJob as Job<InventoryManagementJobData>,
            );
            break;
          case 'confirm':
            result = await processor.handleConfirmInventory(
              mockJob as Job<InventoryManagementJobData>,
            );
            break;
          case 'replenish':
            result = await processor.handleReplenishInventory(
              mockJob as Job<InventoryManagementJobData>,
            );
            break;
        }

        expect(result.success).toBe(true);
        expect((result.data as any)?.action).toBe(action);
      }
    });

    it('should log different messages for different actions', async () => {
      const actions: Array<'reserve' | 'release' | 'confirm' | 'replenish'> = [
        'reserve',
        'release',
        'confirm',
        'replenish',
      ];

      for (const action of actions) {
        jest.clearAllMocks();
        const mockJob = createMockInventoryJob({ action });

        switch (action) {
          case 'reserve':
            await processor.handleReserveInventory(mockJob as Job<InventoryManagementJobData>);
            break;
          case 'release':
            await processor.handleReleaseInventory(mockJob as Job<InventoryManagementJobData>);
            break;
          case 'confirm':
            await processor.handleConfirmInventory(mockJob as Job<InventoryManagementJobData>);
            break;
          case 'replenish':
            await processor.handleReplenishInventory(mockJob as Job<InventoryManagementJobData>);
            break;
        }

        expect(Logger.prototype.log).toHaveBeenCalledWith(
          expect.stringContaining(action),
          expect.any(Object),
        );
      }
    });
  });
});
