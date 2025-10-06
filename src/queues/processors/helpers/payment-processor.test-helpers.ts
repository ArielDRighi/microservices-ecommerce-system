/* eslint-disable @typescript-eslint/no-explicit-any */
import { Job } from 'bull';
import { PaymentProcessingJobData } from '../../../common/interfaces/queue-job.interface';

/**
 * Factory: Create Mock Payment Processing Job
 */
export const createMockPaymentJob = (
  data: Partial<PaymentProcessingJobData> = {},
  options: Partial<Job> = {},
): Partial<Job<PaymentProcessingJobData>> => ({
  id: options.id || '1',
  name: options.name || 'authorize-payment',
  data: {
    jobId: 'job-1',
    createdAt: new Date(),
    orderId: 'order-123',
    paymentId: 'pay-456',
    amount: 99.99,
    currency: 'USD',
    paymentMethod: 'credit_card',
    customerId: 'cust-789',
    ...data,
  } as PaymentProcessingJobData,
  attemptsMade: options.attemptsMade || 0,
  opts: { attempts: 3, ...options.opts },
  progress: jest.fn().mockResolvedValue(undefined),
  ...options,
});

/**
 * Assertion Helper: Verify Job Result Success
 */
export const expectPaymentJobSuccess = (result: any) => {
  expect(result.success).toBe(true);
  expect(result.data?.status).toBe('processed');
  expect(result.processedAt).toBeDefined();
};

/**
 * Assertion Helper: Verify Payment Data
 */
export const expectPaymentData = (result: any, paymentId: string, orderId: string) => {
  expect(result.data?.paymentId).toBe(paymentId);
  expect(result.data?.orderId).toBe(orderId);
  expect(result.data?.status).toBe('processed');
  expect(result.data?.transactionId).toMatch(/^txn_\d+$/);
};

/**
 * Assertion Helper: Verify Progress Steps
 */
export const expectProgressSteps = (progressCalls: any[]) => {
  expect(progressCalls).toHaveLength(6);
  expect(progressCalls[0].percentage).toBe(0);
  expect(progressCalls[1].percentage).toBe(20);
  expect(progressCalls[2].percentage).toBe(40);
  expect(progressCalls[3].percentage).toBe(70);
  expect(progressCalls[4].percentage).toBe(90);
  expect(progressCalls[5].percentage).toBe(100);
};

/**
 * Assertion Helper: Verify Progress Steps with Names
 */
export const expectProgressStepNames = (progressCalls: any[]) => {
  const stepsWithNames = progressCalls.filter((p) => p.currentStep);
  expect(stepsWithNames).toHaveLength(4);
  expect(stepsWithNames[0].currentStep).toBe('validation');
  expect(stepsWithNames[1].currentStep).toBe('gateway-communication');
  expect(stepsWithNames[2].currentStep).toBe('transaction-processing');
  expect(stepsWithNames[3].currentStep).toBe('verification');
};
