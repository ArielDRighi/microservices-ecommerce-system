import { Injectable, Logger } from '@nestjs/common';
import { NotificationProvider, NotificationResult } from '../interfaces';
import { NotificationStatus } from '../enums';
import { v4 as uuidv4 } from 'uuid';

interface SMSOptions {
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

@Injectable()
export class SMSProvider implements NotificationProvider {
  private readonly logger = new Logger(SMSProvider.name);
  private readonly messageStatuses: Map<string, NotificationStatus> = new Map();
  private readonly optedOutNumbers: Set<string> = new Set();
  private readonly rateLimits: Map<string, number[]> = new Map();

  private readonly MAX_SMS_LENGTH = 160;
  private readonly RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
  private readonly RATE_LIMIT_MAX_MESSAGES = 5;

  /**
   * Send an SMS notification
   */
  async send(
    to: string,
    subject: string,
    content: string,
    options?: SMSOptions,
  ): Promise<NotificationResult> {
    // Validate phone number
    const phoneValidation = this.validatePhoneNumber(to);
    if (!phoneValidation.valid) {
      return {
        success: false,
        status: NotificationStatus.FAILED,
        error: phoneValidation.error,
      };
    }

    // Check opt-out status
    if (this.isOptedOut(to)) {
      return {
        success: false,
        status: NotificationStatus.FAILED,
        error: 'Recipient has opted out of SMS notifications',
      };
    }

    // Validate message
    const messageValidation = this.validateMessage(subject, content);
    if (!messageValidation.valid) {
      return {
        success: false,
        status: NotificationStatus.FAILED,
        error: messageValidation.error,
      };
    }

    // Check rate limit
    if (!this.checkRateLimit(to)) {
      return {
        success: false,
        status: NotificationStatus.FAILED,
        error: 'Rate limit exceeded. Maximum 5 SMS per minute.',
      };
    }

    // Simulate realistic delay (50-1000ms)
    const delay = Math.floor(Math.random() * 950) + 50;
    await this.sleep(delay);

    // Generate unique message ID
    const messageId = this.generateMessageId();

    // Store status
    this.messageStatuses.set(messageId, NotificationStatus.SENT);

    // Record send for rate limiting
    this.recordSend(to);

    this.logger.log(
      `SMS sent to ${to} - MessageID: ${messageId}${options?.priority ? ` [${options.priority} priority]` : ''}`,
    );

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
    return status || NotificationStatus.FAILED;
  }

  /**
   * Opt out a phone number from SMS notifications
   */
  optOut(phoneNumber: string): void {
    this.optedOutNumbers.add(phoneNumber);
    this.logger.log(`Phone number opted out: ${phoneNumber}`);
  }

  /**
   * Opt in a phone number to SMS notifications
   */
  optIn(phoneNumber: string): void {
    this.optedOutNumbers.delete(phoneNumber);
    this.logger.log(`Phone number opted in: ${phoneNumber}`);
  }

  /**
   * Check if a phone number has opted out
   */
  isOptedOut(phoneNumber: string): boolean {
    return this.optedOutNumbers.has(phoneNumber);
  }

  /**
   * Clear rate limits (for testing)
   */
  clearRateLimits(): void {
    this.rateLimits.clear();
  }

  /**
   * Validate phone number format
   */
  private validatePhoneNumber(phoneNumber: string): {
    valid: boolean;
    error?: string;
  } {
    if (!phoneNumber || phoneNumber.trim().length === 0) {
      return { valid: false, error: 'Invalid phone number: empty' };
    }

    // Must start with +
    if (!phoneNumber.startsWith('+')) {
      return {
        valid: false,
        error: 'Invalid phone number: must start with + and country code',
      };
    }

    // Remove + and check if rest is digits
    const digits = phoneNumber.slice(1);
    if (!/^\d+$/.test(digits)) {
      return {
        valid: false,
        error: 'Invalid phone number: contains non-digit characters',
      };
    }

    // Check length (min 7, max 15 digits after +)
    if (digits.length < 7 || digits.length > 15) {
      return {
        valid: false,
        error: 'Invalid phone number: must be between 7 and 15 digits',
      };
    }

    return { valid: true };
  }

  /**
   * Validate message content
   */
  private validateMessage(subject: string, content: string): { valid: boolean; error?: string } {
    if (!subject || subject.trim().length === 0) {
      return { valid: false, error: 'Subject cannot be empty' };
    }

    if (!content || content.trim().length === 0) {
      return { valid: false, error: 'Content cannot be empty' };
    }

    if (content.length > this.MAX_SMS_LENGTH) {
      return {
        valid: false,
        error: `Content exceeds maximum length of ${this.MAX_SMS_LENGTH} characters`,
      };
    }

    return { valid: true };
  }

  /**
   * Check rate limit for a phone number
   */
  private checkRateLimit(phoneNumber: string): boolean {
    const now = Date.now();
    const sends = this.rateLimits.get(phoneNumber) || [];

    // Filter sends within the rate limit window
    const recentSends = sends.filter((timestamp) => now - timestamp < this.RATE_LIMIT_WINDOW_MS);

    // Update the rate limit map
    this.rateLimits.set(phoneNumber, recentSends);

    // Check if under limit
    return recentSends.length < this.RATE_LIMIT_MAX_MESSAGES;
  }

  /**
   * Record a send for rate limiting
   */
  private recordSend(phoneNumber: string): void {
    const now = Date.now();
    const sends = this.rateLimits.get(phoneNumber) || [];
    sends.push(now);
    this.rateLimits.set(phoneNumber, sends);
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `sms-${uuidv4()}`;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
