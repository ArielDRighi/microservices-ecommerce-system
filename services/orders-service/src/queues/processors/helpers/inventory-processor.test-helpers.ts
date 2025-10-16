/* eslint-disable @typescript-eslint/no-explicit-any */
import { Job } from 'bull';
import { InventoryManagementJobData } from '../../../common/interfaces/queue-job.interface';

/**
 * Factory function to create mock inventory jobs
 * @param data - Partial inventory job data to override defaults
 * @param options - Partial Job options to override defaults
 * @returns Mock Job object for testing
 */
export const createMockInventoryJob = (
  data: Partial<InventoryManagementJobData> = {},
  options: Partial<Job> = {},
): Partial<Job<InventoryManagementJobData>> => ({
  id: options.id || '1',
  name: options.name || 'reserve-inventory',
  data: {
    jobId: 'job-1',
    createdAt: new Date(),
    action: 'reserve',
    productId: 'product-1',
    quantity: 5,
    ...data,
  } as InventoryManagementJobData,
  attemptsMade: options.attemptsMade || 0,
  opts: { attempts: 3, ...options.opts },
  progress: jest.fn().mockResolvedValue(undefined),
  ...options,
});

/**
 * Assertion helper to verify successful inventory job result
 * @param result - Job result to verify
 */
export const expectInventoryJobSuccess = (result: any) => {
  expect(result.success).toBe(true);
  expect(result.data).toBeDefined();
  expect(result.processedAt).toBeInstanceOf(Date);
};

/**
 * Assertion helper to verify inventory data in result
 * @param result - Job result to verify
 * @param productId - Expected product ID
 * @param action - Expected action type
 * @param quantity - Expected quantity
 */
export const expectInventoryData = (
  result: any,
  productId: string,
  action: string,
  quantity: number,
) => {
  expect((result.data as any)?.productId).toBe(productId);
  expect((result.data as any)?.action).toBe(action);
  expect((result.data as any)?.quantity).toBe(quantity);
  expect((result.data as any)?.status).toBe('completed');
};

/**
 * Assertion helper to verify all 5 progress steps
 * @param progressCalls - Array of progress calls from mock
 */
export const expectProgressSteps = (progressCalls: any[]) => {
  expect(progressCalls).toHaveLength(5);
  expect(progressCalls[0].percentage).toBe(0);
  expect(progressCalls[1].percentage).toBe(30);
  expect(progressCalls[2].percentage).toBe(60);
  expect(progressCalls[3].percentage).toBe(90);
  expect(progressCalls[4].percentage).toBe(100);
};

/**
 * Assertion helper to verify progress step names
 * @param progressCalls - Array of progress calls from mock
 */
export const expectProgressStepNames = (progressCalls: any[]) => {
  const stepsWithCurrentStep = progressCalls.filter((p) => p.currentStep);
  expect(stepsWithCurrentStep).toHaveLength(3);
  expect(stepsWithCurrentStep[0].currentStep).toBe('validation');
  expect(stepsWithCurrentStep[1].currentStep).toBe('execution');
  expect(stepsWithCurrentStep[2].currentStep).toBe('record-update');
};
