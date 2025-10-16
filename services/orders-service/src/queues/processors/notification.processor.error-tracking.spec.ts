/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { NotificationProcessor } from './notification.processor';
import { NotificationSendingJobData } from '../../common/interfaces/queue-job.interface';
import {
  createMockNotificationJob,
  expectNotificationProgressSteps,
  expectNotificationProgressStepNames,
} from './helpers/notification-processor.test-helpers';

describe('NotificationProcessor - Error Handling & Tracking', () => {
  let processor: NotificationProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationProcessor],
    }).compile();

    processor = module.get<NotificationProcessor>(NotificationProcessor);

    // Mock logger to avoid console spam
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isRetryableError - Custom Logic', () => {
    it('should identify INVALID_RECIPIENT as non-retryable', () => {
      const error = new Error('INVALID_RECIPIENT: Email format is invalid');

      const isRetryable = (processor as any).isRetryableError(error);

      expect(isRetryable).toBe(false);
    });

    it('should identify INVALID_TEMPLATE as non-retryable', () => {
      const error = new Error('INVALID_TEMPLATE: Template not found');

      const isRetryable = (processor as any).isRetryableError(error);

      expect(isRetryable).toBe(false);
    });

    it('should identify UNSUBSCRIBED as non-retryable', () => {
      const error = new Error('UNSUBSCRIBED: User has unsubscribed from emails');

      const isRetryable = (processor as any).isRetryableError(error);

      expect(isRetryable).toBe(false);
    });

    it('should treat network errors as retryable', () => {
      const error = new Error('Network timeout occurred');

      const isRetryable = (processor as any).isRetryableError(error);

      expect(isRetryable).toBe(true);
    });

    it('should treat service unavailable as retryable', () => {
      const error = new Error('Service temporarily unavailable');

      const isRetryable = (processor as any).isRetryableError(error);

      expect(isRetryable).toBe(true);
    });

    it('should treat rate limit errors as retryable', () => {
      const error = new Error('Rate limit exceeded');

      const isRetryable = (processor as any).isRetryableError(error);

      expect(isRetryable).toBe(true);
    });

    it('should treat unknown errors as retryable by default', () => {
      const error = new Error('Unknown error occurred');

      const isRetryable = (processor as any).isRetryableError(error);

      expect(isRetryable).toBe(true);
    });

    it('should handle non-Error objects', () => {
      const error = { message: 'Not an Error instance' };

      const isRetryable = (processor as any).isRetryableError(error);

      expect(isRetryable).toBe(false);
    });
  });

  describe('Progress Tracking', () => {
    it('should track all progress steps in order', async () => {
      const mockJob = createMockNotificationJob();
      const progressCalls: any[] = [];
      (mockJob.progress as jest.Mock).mockImplementation((progress) => {
        progressCalls.push(progress);
        return Promise.resolve();
      });

      await processor.handleSendEmail(mockJob as Job<NotificationSendingJobData>);

      expectNotificationProgressSteps(progressCalls);
    });

    it('should include step names in progress', async () => {
      const mockJob = createMockNotificationJob();
      const progressCalls: any[] = [];
      (mockJob.progress as jest.Mock).mockImplementation((progress) => {
        progressCalls.push(progress);
        return Promise.resolve();
      });

      await processor.handleSendEmail(mockJob as Job<NotificationSendingJobData>);

      expectNotificationProgressStepNames(progressCalls);
    });
  });

  describe('Job Metrics', () => {
    it('should log metrics after successful delivery', async () => {
      const mockJob = createMockNotificationJob();

      await processor.handleSendEmail(mockJob as Job<NotificationSendingJobData>);

      expect(Logger.prototype.debug).toHaveBeenCalledWith(
        expect.stringContaining('Job metrics'),
        expect.objectContaining({
          processorName: 'NotificationProcessor',
          success: true,
        }),
      );
    });

    it('should include duration in metrics', async () => {
      const mockJob = createMockNotificationJob();

      const result = await processor.handleSendEmail(mockJob as Job<NotificationSendingJobData>);

      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data object', async () => {
      const mockJob = createMockNotificationJob({
        data: {},
      });

      const result = await processor.handleSendEmail(mockJob as Job<NotificationSendingJobData>);

      expect(result.success).toBe(true);
    });

    it('should handle very long recipient strings', async () => {
      const mockJob = createMockNotificationJob({
        recipient: 'a'.repeat(100) + '@example.com',
      });

      const result = await processor.handleSendEmail(mockJob as Job<NotificationSendingJobData>);

      expect(result.success).toBe(true);
    });

    it('should handle special characters in templates', async () => {
      const mockJob = createMockNotificationJob({
        template: 'special-template-2024_v1',
      });

      const result = await processor.handleSendEmail(mockJob as Job<NotificationSendingJobData>);

      expect(result.success).toBe(true);
    });

    it('should handle concurrent notifications', async () => {
      const jobs = Array.from({ length: 5 }, (_, i) =>
        createMockNotificationJob({ recipient: `user${i}@example.com` }),
      );

      const results = await Promise.all(
        jobs.map((job) => processor.handleSendEmail(job as Job<NotificationSendingJobData>)),
      );

      expect(results).toHaveLength(5);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it('should handle progress update failure gracefully', async () => {
      const mockJob = createMockNotificationJob();
      (mockJob.progress as jest.Mock).mockRejectedValueOnce(new Error('Progress update failed'));

      const result = await processor.handleSendEmail(mockJob as Job<NotificationSendingJobData>);

      expect(result.success).toBe(true); // Job should still succeed
      expect(Logger.prototype.warn).toHaveBeenCalled();
    });
  });

  describe('Attempt Tracking', () => {
    it('should increment attemptsMade', async () => {
      const mockJob = createMockNotificationJob({}, { attemptsMade: 0 });

      const result = await processor.handleSendEmail(mockJob as Job<NotificationSendingJobData>);

      expect(result.attemptsMade).toBe(1);
    });

    it('should track multiple attempts', async () => {
      const mockJob = createMockNotificationJob({}, { attemptsMade: 2 });

      const result = await processor.handleSendEmail(mockJob as Job<NotificationSendingJobData>);

      expect(result.attemptsMade).toBe(3);
    });
  });
});
