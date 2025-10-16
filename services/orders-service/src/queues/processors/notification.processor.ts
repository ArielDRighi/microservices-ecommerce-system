import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { BaseProcessor } from './base.processor';
import { NotificationSendingJobData, JobResult } from '../../common/interfaces/queue-job.interface';

/**
 * Notification Sending Processor
 * Handles asynchronous notification delivery
 */
@Processor('notification-sending')
export class NotificationProcessor extends BaseProcessor<NotificationSendingJobData> {
  protected readonly logger = new Logger(NotificationProcessor.name);
  protected readonly processorName = 'NotificationProcessor';

  /**
   * Process email notifications
   */
  @Process('send-email')
  async handleSendEmail(job: Job<NotificationSendingJobData>): Promise<JobResult> {
    return this.handleJob(job);
  }

  /**
   * Process SMS notifications
   */
  @Process('send-sms')
  async handleSendSms(job: Job<NotificationSendingJobData>): Promise<JobResult> {
    return this.handleJob(job);
  }

  /**
   * Process push notifications
   */
  @Process('send-push')
  async handleSendPush(job: Job<NotificationSendingJobData>): Promise<JobResult> {
    return this.handleJob(job);
  }

  /**
   * Main processing logic for notification jobs
   */
  protected async processJob(
    data: NotificationSendingJobData,
    job: Job<NotificationSendingJobData>,
  ): Promise<JobResult> {
    this.logger.log(`Sending ${data.type} notification to ${data.recipient}`, {
      type: data.type,
      recipient: data.recipient,
      template: data.template,
      priority: data.priority,
      jobId: job.id,
    });

    // Update progress: 20% - Preparing notification
    await this.updateProgress(job, {
      percentage: 20,
      message: 'Preparing notification',
      currentStep: 'preparation',
    });

    await this.delay(300);

    // Update progress: 40% - Rendering template
    await this.updateProgress(job, {
      percentage: 40,
      message: 'Rendering template',
      currentStep: 'rendering',
    });

    await this.delay(500);

    // Update progress: 70% - Sending notification
    await this.updateProgress(job, {
      percentage: 70,
      message: `Sending via ${data.type}`,
      currentStep: 'sending',
    });

    // Simulate sending delay based on type
    const sendDelay = this.getSendDelay(data.type);
    await this.delay(sendDelay);

    // Update progress: 90% - Verifying delivery
    await this.updateProgress(job, {
      percentage: 90,
      message: 'Verifying delivery',
      currentStep: 'verification',
    });

    await this.delay(300);

    const result: JobResult = {
      success: true,
      data: {
        type: data.type,
        recipient: data.recipient,
        template: data.template,
        status: 'delivered',
        messageId: `msg_${Date.now()}`,
        deliveredAt: new Date(),
      },
      processedAt: new Date(),
      duration: 0,
      attemptsMade: job.attemptsMade + 1,
    };

    this.logMetrics(job, result);

    return result;
  }

  /**
   * Get send delay based on notification type
   */
  private getSendDelay(type: string): number {
    switch (type) {
      case 'email':
        return 1500; // Email typically takes longer
      case 'sms':
        return 800;
      case 'push':
        return 400;
      default:
        return 1000;
    }
  }

  /**
   * Customize retryable errors for notifications
   * Notifications failures are often retryable
   */
  protected override isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      // Most notification errors are retryable except for validation errors
      const nonRetryableErrors = ['INVALID_RECIPIENT', 'INVALID_TEMPLATE', 'UNSUBSCRIBED'];

      if (nonRetryableErrors.some((err) => error.message.includes(err))) {
        return false;
      }

      // Everything else is retryable
      return true;
    }

    return super.isRetryableError(error);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
