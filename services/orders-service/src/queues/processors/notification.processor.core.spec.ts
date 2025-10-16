/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { NotificationProcessor } from './notification.processor';
import { NotificationSendingJobData } from '../../common/interfaces/queue-job.interface';
import {
  createMockNotificationJob,
  expectNotificationSuccess,
} from './helpers/notification-processor.test-helpers';

describe('NotificationProcessor - Core Functionality', () => {
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

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(processor).toBeDefined();
    });

    it('should have correct processor name', () => {
      expect((processor as any).processorName).toBe('NotificationProcessor');
    });

    it('should have logger instance', () => {
      expect((processor as any).logger).toBeDefined();
      expect((processor as any).logger).toBeInstanceOf(Logger);
    });
  });

  describe('handleSendEmail', () => {
    it('should process email notification successfully', async () => {
      const mockJob = createMockNotificationJob({
        type: 'email',
        recipient: 'user@example.com',
        template: 'order-confirmation',
        subject: 'Your Order Confirmation',
        data: { orderNumber: '12345' },
      });

      const result = await processor.handleSendEmail(mockJob as Job<NotificationSendingJobData>);

      expect((result.data as any)?.type).toBe('email');
      expect((result.data as any)?.recipient).toBe('user@example.com');
      expect((result.data as any)?.template).toBe('order-confirmation');
      expectNotificationSuccess(result);
    });

    it('should update progress during email sending', async () => {
      const mockJob = createMockNotificationJob({ type: 'email' });

      await processor.handleSendEmail(mockJob as Job<NotificationSendingJobData>);

      expect(mockJob.progress).toHaveBeenCalledWith({
        percentage: 0,
        message: 'Job started',
      });
      expect(mockJob.progress).toHaveBeenCalledWith({
        percentage: 20,
        message: 'Preparing notification',
        currentStep: 'preparation',
      });
      expect(mockJob.progress).toHaveBeenCalledWith({
        percentage: 40,
        message: 'Rendering template',
        currentStep: 'rendering',
      });
      expect(mockJob.progress).toHaveBeenCalledWith({
        percentage: 70,
        message: 'Sending via email',
        currentStep: 'sending',
      });
      expect(mockJob.progress).toHaveBeenCalledWith({
        percentage: 90,
        message: 'Verifying delivery',
        currentStep: 'verification',
      });
      expect(mockJob.progress).toHaveBeenCalledWith({
        percentage: 100,
        message: 'Job completed',
      });
    });

    it('should log email notification details', async () => {
      const mockJob = createMockNotificationJob({
        type: 'email',
        recipient: 'test@example.com',
        template: 'welcome-email',
        priority: 'high',
      });

      await processor.handleSendEmail(mockJob as Job<NotificationSendingJobData>);

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Sending email notification'),
        expect.objectContaining({
          type: 'email',
          recipient: 'test@example.com',
          template: 'welcome-email',
          priority: 'high',
        }),
      );
    });

    it('should take longer for email than other notification types', async () => {
      const mockJob = createMockNotificationJob({ type: 'email' });
      const startTime = Date.now();

      await processor.handleSendEmail(mockJob as Job<NotificationSendingJobData>);
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThan(2600); // 300 + 500 + 1500 + 300 = 2600ms minimum
    });

    it('should include subject when provided', async () => {
      const mockJob = createMockNotificationJob({
        type: 'email',
        subject: 'Important Notification',
      });

      const result = await processor.handleSendEmail(mockJob as Job<NotificationSendingJobData>);

      expect(result.success).toBe(true);
    });
  });

  describe('handleSendSms', () => {
    it('should process SMS notification successfully', async () => {
      const mockJob = createMockNotificationJob({
        type: 'sms',
        recipient: '+1234567890',
        template: 'order-shipped',
        data: { trackingNumber: 'TRACK123' },
      });

      const result = await processor.handleSendSms(mockJob as Job<NotificationSendingJobData>);

      expect((result.data as any)?.type).toBe('sms');
      expect((result.data as any)?.recipient).toBe('+1234567890');
      expectNotificationSuccess(result);
    });

    it('should update progress during SMS sending', async () => {
      const mockJob = createMockNotificationJob({ type: 'sms' });

      await processor.handleSendSms(mockJob as Job<NotificationSendingJobData>);

      expect(mockJob.progress).toHaveBeenCalledWith(
        expect.objectContaining({
          percentage: 70,
          message: 'Sending via sms',
        }),
      );
    });

    it('should be faster than email notifications', async () => {
      const mockJob = createMockNotificationJob({ type: 'sms' });
      const startTime = Date.now();

      await processor.handleSendSms(mockJob as Job<NotificationSendingJobData>);
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThan(1900); // 300 + 500 + 800 + 300 = 1900ms minimum
      expect(duration).toBeLessThan(2600); // Less than email
    });

    it('should log SMS notification with phone number', async () => {
      const mockJob = createMockNotificationJob({
        type: 'sms',
        recipient: '+9876543210',
      });

      await processor.handleSendSms(mockJob as Job<NotificationSendingJobData>);

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Sending sms notification'),
        expect.objectContaining({
          type: 'sms',
          recipient: '+9876543210',
        }),
      );
    });

    it('should handle international phone numbers', async () => {
      const mockJob = createMockNotificationJob({
        type: 'sms',
        recipient: '+44 20 1234 5678',
      });

      const result = await processor.handleSendSms(mockJob as Job<NotificationSendingJobData>);

      expect(result.success).toBe(true);
      expect((result.data as any)?.recipient).toBe('+44 20 1234 5678');
    });
  });

  describe('handleSendPush', () => {
    it('should process push notification successfully', async () => {
      const mockJob = createMockNotificationJob({
        type: 'push',
        recipient: 'device-token-abc123',
        template: 'new-message',
        data: { message: 'You have a new message' },
      });

      const result = await processor.handleSendPush(mockJob as Job<NotificationSendingJobData>);

      expect((result.data as any)?.type).toBe('push');
      expect((result.data as any)?.recipient).toBe('device-token-abc123');
      expectNotificationSuccess(result);
    });

    it('should be fastest notification type', async () => {
      const mockJob = createMockNotificationJob({ type: 'push' });
      const startTime = Date.now();

      await processor.handleSendPush(mockJob as Job<NotificationSendingJobData>);
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThan(1500); // 300 + 500 + 400 + 300 = 1500ms minimum
      expect(duration).toBeLessThan(1900); // Faster than SMS
    });

    it('should update progress with push-specific message', async () => {
      const mockJob = createMockNotificationJob({ type: 'push' });

      await processor.handleSendPush(mockJob as Job<NotificationSendingJobData>);

      expect(mockJob.progress).toHaveBeenCalledWith(
        expect.objectContaining({
          percentage: 70,
          message: 'Sending via push',
        }),
      );
    });

    it('should handle device tokens', async () => {
      const mockJob = createMockNotificationJob({
        type: 'push',
        recipient: 'expo-push-token[xyz789]',
      });

      const result = await processor.handleSendPush(mockJob as Job<NotificationSendingJobData>);

      expect(result.success).toBe(true);
      expect((result.data as any)?.recipient).toBe('expo-push-token[xyz789]');
    });
  });
});
