/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { NotificationProcessor } from './notification.processor';
import { NotificationSendingJobData, JobResult } from '../../common/interfaces/queue-job.interface';
import { createMockNotificationJob } from './helpers/notification-processor.test-helpers';

describe('NotificationProcessor - Features', () => {
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

  describe('Priority Handling', () => {
    it('should process high priority notifications', async () => {
      const mockJob = createMockNotificationJob({
        priority: 'high',
      });

      const result = await processor.handleSendEmail(mockJob as Job<NotificationSendingJobData>);

      expect(result.success).toBe(true);
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          priority: 'high',
        }),
      );
    });

    it('should process normal priority notifications', async () => {
      const mockJob = createMockNotificationJob({
        priority: 'normal',
      });

      const result = await processor.handleSendEmail(mockJob as Job<NotificationSendingJobData>);

      expect(result.success).toBe(true);
    });

    it('should process low priority notifications', async () => {
      const mockJob = createMockNotificationJob({
        priority: 'low',
      });

      const result = await processor.handleSendEmail(mockJob as Job<NotificationSendingJobData>);

      expect(result.success).toBe(true);
    });

    it('should handle notifications without priority', async () => {
      const mockJob = createMockNotificationJob();
      delete (mockJob.data as any).priority;

      const result = await processor.handleSendEmail(mockJob as Job<NotificationSendingJobData>);

      expect(result.success).toBe(true);
    });
  });

  describe('Template Handling', () => {
    it('should process different templates correctly', async () => {
      const templates = ['welcome-email', 'order-confirmation', 'password-reset', 'newsletter'];
      const results: JobResult[] = [];

      for (const template of templates) {
        const mockJob = createMockNotificationJob({ template });
        const result = await processor.handleSendEmail(mockJob as Job<NotificationSendingJobData>);
        results.push(result);
      }

      expect(results).toHaveLength(4);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it('should pass template data correctly', async () => {
      const mockJob = createMockNotificationJob({
        template: 'order-confirmation',
        data: {
          orderNumber: 'ORD-12345',
          total: 99.99,
          items: ['Item 1', 'Item 2'],
        },
      });

      const result = await processor.handleSendEmail(mockJob as Job<NotificationSendingJobData>);

      expect(result.success).toBe(true);
    });
  });

  describe('Message ID Generation', () => {
    it('should generate unique message IDs', async () => {
      const jobs = [
        createMockNotificationJob({ recipient: 'user1@example.com' }),
        createMockNotificationJob({ recipient: 'user2@example.com' }),
        createMockNotificationJob({ recipient: 'user3@example.com' }),
      ];

      // Execute sequentially to ensure different timestamps
      const results: JobResult[] = [];
      for (const job of jobs) {
        const result = await processor.handleSendEmail(job as Job<NotificationSendingJobData>);
        results.push(result);
      }

      const messageIds = results.map((r) => (r.data as any)?.messageId);
      const uniqueIds = new Set(messageIds);
      expect(uniqueIds.size).toBe(3);
    });

    it('should include timestamp in message ID', async () => {
      const mockJob = createMockNotificationJob();

      const result = await processor.handleSendEmail(mockJob as Job<NotificationSendingJobData>);

      expect((result.data as any)?.messageId).toMatch(/^msg_\d+$/);
      const timestamp = parseInt((result.data as any)?.messageId.replace('msg_', ''));
      expect(timestamp).toBeGreaterThan(Date.now() - 10000); // Within last 10 seconds
    });
  });

  describe('Delivery Status', () => {
    it('should mark all notifications as delivered on success', async () => {
      const types: Array<'email' | 'sms' | 'push'> = ['email', 'sms', 'push'];

      for (const type of types) {
        const mockJob = createMockNotificationJob({ type });
        let result: JobResult;

        switch (type) {
          case 'email':
            result = await processor.handleSendEmail(mockJob as Job<NotificationSendingJobData>);
            break;
          case 'sms':
            result = await processor.handleSendSms(mockJob as Job<NotificationSendingJobData>);
            break;
          case 'push':
            result = await processor.handleSendPush(mockJob as Job<NotificationSendingJobData>);
            break;
        }

        expect((result.data as any)?.status).toBe('delivered');
      }
    });

    it('should include deliveredAt timestamp', async () => {
      const mockJob = createMockNotificationJob();
      const beforeTime = new Date();

      const result = await processor.handleSendEmail(mockJob as Job<NotificationSendingJobData>);

      expect((result.data as any)?.deliveredAt).toBeInstanceOf(Date);
      expect((result.data as any)?.deliveredAt.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime(),
      );
    });
  });
});
