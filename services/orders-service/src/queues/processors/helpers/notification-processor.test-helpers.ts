/* eslint-disable @typescript-eslint/no-explicit-any */
import { Job } from 'bull';
import { NotificationSendingJobData } from '../../../common/interfaces/queue-job.interface';

/**
 * Factory function to create mock notification jobs
 * @param data - Partial notification job data to override defaults
 * @param options - Partial Job options to override defaults
 * @returns Mock Job object for testing
 */
export const createMockNotificationJob = (
  data: Partial<NotificationSendingJobData> = {},
  options: Partial<Job> = {},
): Partial<Job<NotificationSendingJobData>> => ({
  id: options.id || '1',
  name: options.name || 'send-email',
  data: {
    jobId: 'job-1',
    createdAt: new Date(),
    type: 'email',
    recipient: 'test@example.com',
    template: 'welcome-email',
    data: { name: 'Test User' },
    ...data,
  } as NotificationSendingJobData,
  attemptsMade: options.attemptsMade || 0,
  opts: { attempts: 3, ...options.opts },
  progress: jest.fn().mockResolvedValue(undefined),
  ...options,
});

/**
 * Assertion helper to verify successful notification delivery
 * @param result - Job result to verify
 */
export const expectNotificationSuccess = (result: any) => {
  expect(result.success).toBe(true);
  expect((result.data as any)?.status).toBe('delivered');
  expect((result.data as any)?.messageId).toMatch(/^msg_\d+$/);
  expect((result.data as any)?.deliveredAt).toBeInstanceOf(Date);
};

/**
 * Assertion helper to verify all 6 progress steps for notifications
 * @param progressCalls - Array of progress calls from mock
 */
export const expectNotificationProgressSteps = (progressCalls: any[]) => {
  expect(progressCalls).toHaveLength(6);
  expect(progressCalls[0].percentage).toBe(0);
  expect(progressCalls[1].percentage).toBe(20);
  expect(progressCalls[2].percentage).toBe(40);
  expect(progressCalls[3].percentage).toBe(70);
  expect(progressCalls[4].percentage).toBe(90);
  expect(progressCalls[5].percentage).toBe(100);
};

/**
 * Assertion helper to verify progress step names
 * @param progressCalls - Array of progress calls from mock
 */
export const expectNotificationProgressStepNames = (progressCalls: any[]) => {
  const stepsWithNames = progressCalls.filter((p) => p.currentStep);
  expect(stepsWithNames).toHaveLength(4);
  expect(stepsWithNames[0].currentStep).toBe('preparation');
  expect(stepsWithNames[1].currentStep).toBe('rendering');
  expect(stepsWithNames[2].currentStep).toBe('sending');
  expect(stepsWithNames[3].currentStep).toBe('verification');
};
