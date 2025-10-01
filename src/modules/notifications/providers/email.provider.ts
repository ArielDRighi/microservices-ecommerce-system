import { Injectable, Logger } from '@nestjs/common';
import { NotificationProvider, NotificationResult } from '../interfaces';
import { NotificationStatus } from '../enums';
import { v4 as uuidv4 } from 'uuid';

interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

interface EmailOptions {
  attachments?: EmailAttachment[];
  from?: string;
  replyTo?: string;
}

@Injectable()
export class EmailProvider implements NotificationProvider {
  private readonly logger = new Logger(EmailProvider.name);
  private readonly messageStatuses: Map<string, NotificationStatus> = new Map();
  private readonly SUCCESS_RATE = 0.95; // 95% success rate

  /**
   * Send an email notification
   */
  async send(
    to: string,
    subject: string,
    content: string,
    options?: EmailOptions,
  ): Promise<NotificationResult> {
    // Validate inputs
    const validation = this.validateEmail(to, subject, content);
    if (!validation.valid) {
      return {
        success: false,
        status: NotificationStatus.FAILED,
        error: validation.error,
      };
    }

    // Check for special test cases
    if (to.includes('bounce@')) {
      return {
        success: false,
        status: NotificationStatus.BOUNCED,
        error: 'Email bounced - invalid recipient',
      };
    }

    if (to.includes('unsubscribed@')) {
      return {
        success: false,
        status: NotificationStatus.FAILED,
        error: 'Recipient has unsubscribed from notifications',
      };
    }

    // Simulate realistic delay (100-2000ms)
    const delay = Math.floor(Math.random() * 1900) + 100;
    await this.sleep(delay);

    // Simulate success/failure rate (95% success)
    const isSuccess = Math.random() < this.SUCCESS_RATE;

    if (!isSuccess) {
      return {
        success: false,
        status: NotificationStatus.FAILED,
        error: this.getRandomFailureReason(),
      };
    }

    // Generate unique message ID
    const messageId = this.generateMessageId();

    // Store status for tracking
    this.messageStatuses.set(messageId, NotificationStatus.SENT);

    // Simulate possible status changes after sending
    this.simulateStatusUpdates(messageId);

    this.logger.log(`Email sent to ${to} - MessageID: ${messageId}`);

    if (options?.attachments && options.attachments.length > 0) {
      this.logger.log(`Email includes ${options.attachments.length} attachment(s)`);
    }

    return {
      success: true,
      messageId,
      status: NotificationStatus.SENT,
      sentAt: new Date(),
    };
  }

  /**
   * Get the status of a sent message
   */
  async getStatus(messageId: string): Promise<NotificationStatus> {
    const status = this.messageStatuses.get(messageId);

    if (!status) {
      return NotificationStatus.FAILED;
    }

    return status;
  }

  /**
   * Validate email parameters
   */
  private validateEmail(
    to: string,
    subject: string,
    content: string,
  ): { valid: boolean; error?: string } {
    if (!to || to.trim().length === 0) {
      return { valid: false, error: 'Invalid email address: empty' };
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return { valid: false, error: 'Invalid email address format' };
    }

    if (!subject || subject.trim().length === 0) {
      return { valid: false, error: 'Subject cannot be empty' };
    }

    if (!content || content.trim().length === 0) {
      return { valid: false, error: 'Content cannot be empty' };
    }

    return { valid: true };
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `email-${uuidv4()}`;
  }

  /**
   * Get random failure reason for simulation
   */
  private getRandomFailureReason(): string {
    const reasons = [
      'SMTP server temporarily unavailable',
      'Recipient mailbox full',
      'Message rejected by recipient server',
      'Connection timeout',
      'Rate limit exceeded',
    ];

    const index = Math.floor(Math.random() * reasons.length);
    return reasons[index]!;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Simulate status updates after sending (opened, clicked)
   */
  private simulateStatusUpdates(messageId: string): void {
    // Simulate open rate (30% chance within 5 seconds)
    setTimeout(() => {
      if (Math.random() < 0.3) {
        this.messageStatuses.set(messageId, NotificationStatus.OPENED);
        this.logger.debug(`Email ${messageId} opened`);

        // Simulate click rate (20% of opened emails within next 3 seconds)
        setTimeout(() => {
          if (Math.random() < 0.2) {
            this.messageStatuses.set(messageId, NotificationStatus.CLICKED);
            this.logger.debug(`Email ${messageId} clicked`);
          }
        }, 3000);
      }
    }, 5000);
  }
}
