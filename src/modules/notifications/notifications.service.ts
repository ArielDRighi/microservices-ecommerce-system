import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

export enum NotificationType {
  ORDER_CONFIRMATION = 'ORDER_CONFIRMATION',
  PAYMENT_FAILURE = 'PAYMENT_FAILURE',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  SHIPPING_UPDATE = 'SHIPPING_UPDATE',
  WELCOME_EMAIL = 'WELCOME_EMAIL',
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  DELIVERED = 'DELIVERED',
}

export interface SendNotificationDto {
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  data: Record<string, unknown>;
}

export interface NotificationResult {
  notificationId: string;
  status: NotificationStatus;
  channel: NotificationChannel;
  sentAt: Date;
  failureReason?: string;
}

/**
 * Mock Notifications Service
 * Simulates email/SMS sending with realistic scenarios:
 * - 95% success rate
 * - 5% failures
 * - Random latency
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  // In-memory storage
  private notifications = new Map<string, NotificationResult>();

  /**
   * Send order confirmation notification
   */
  async sendOrderConfirmation(
    userId: string,
    orderData: {
      orderId: string;
      orderNumber: string;
      totalAmount: number;
      currency: string;
      items: Array<{ productId: string; quantity: number; price: number }>;
    },
  ): Promise<NotificationResult> {
    this.logger.log(`Sending order confirmation for order ${orderData.orderId} to user ${userId}`);

    return this.sendNotification({
      userId,
      type: NotificationType.ORDER_CONFIRMATION,
      channel: NotificationChannel.EMAIL,
      data: orderData,
    });
  }

  /**
   * Send payment failure notification
   */
  async sendPaymentFailure(
    userId: string,
    orderData: {
      orderId: string;
      orderNumber: string;
      reason: string;
    },
  ): Promise<NotificationResult> {
    this.logger.log(
      `Sending payment failure notification for order ${orderData.orderId} to user ${userId}`,
    );

    return this.sendNotification({
      userId,
      type: NotificationType.PAYMENT_FAILURE,
      channel: NotificationChannel.EMAIL,
      data: orderData,
    });
  }

  /**
   * Send order cancelled notification
   */
  async sendOrderCancelled(
    userId: string,
    orderData: {
      orderId: string;
      orderNumber: string;
      reason: string;
    },
  ): Promise<NotificationResult> {
    this.logger.log(
      `Sending order cancelled notification for order ${orderData.orderId} to user ${userId}`,
    );

    return this.sendNotification({
      userId,
      type: NotificationType.ORDER_CANCELLED,
      channel: NotificationChannel.EMAIL,
      data: orderData,
    });
  }

  /**
   * Send shipping update notification
   */
  async sendShippingUpdate(
    userId: string,
    data: {
      orderId: string;
      trackingNumber: string;
      carrier: string;
    },
  ): Promise<NotificationResult> {
    this.logger.log(`Sending shipping update for order ${data.orderId} to user ${userId}`);

    return this.sendNotification({
      userId,
      type: NotificationType.SHIPPING_UPDATE,
      channel: NotificationChannel.EMAIL,
      data,
    });
  }

  /**
   * Generic notification sending
   */
  private async sendNotification(dto: SendNotificationDto): Promise<NotificationResult> {
    const notificationId = randomUUID();

    this.logger.debug(`Sending ${dto.type} notification via ${dto.channel} to user ${dto.userId}`);

    // Simulate sending delay (50-500ms)
    await this.simulateDelay(50, 500);

    // Simulate notification outcome (95% success)
    const success = Math.random() < 0.95;

    let result: NotificationResult;

    if (success) {
      result = {
        notificationId,
        status: NotificationStatus.SENT,
        channel: dto.channel,
        sentAt: new Date(),
      };

      this.logger.log(
        `Notification ${notificationId} sent successfully via ${dto.channel} to user ${dto.userId}`,
      );
    } else {
      const failureReason = this.getRandomFailureReason(dto.channel);

      result = {
        notificationId,
        status: NotificationStatus.FAILED,
        channel: dto.channel,
        sentAt: new Date(),
        failureReason,
      };

      this.logger.warn(
        `Notification ${notificationId} failed to send: ${failureReason}. This is retriable.`,
      );

      // Throw error for failed notifications (but they are retriable)
      throw new Error(`Failed to send notification via ${dto.channel}: ${failureReason}`);
    }

    this.notifications.set(notificationId, result);
    return result;
  }

  /**
   * Get notification status
   */
  async getNotificationStatus(notificationId: string): Promise<NotificationResult | null> {
    return this.notifications.get(notificationId) || null;
  }

  /**
   * Simulate sending delay
   */
  private async simulateDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Get random failure reason based on channel
   */
  private getRandomFailureReason(channel: NotificationChannel): string {
    const emailReasons = [
      'Email server temporarily unavailable',
      'Invalid email address format',
      'Email bounced',
      'Spam filter rejection',
      'Rate limit exceeded',
    ];

    const smsReasons = [
      'SMS gateway temporarily unavailable',
      'Invalid phone number format',
      'SMS delivery failed',
      'Carrier rejection',
      'Rate limit exceeded',
    ];

    const pushReasons = [
      'Push notification service unavailable',
      'Device token expired',
      'Push delivery failed',
      'Rate limit exceeded',
    ];

    let reasons: string[] = ['Unknown notification error'];

    switch (channel) {
      case NotificationChannel.EMAIL:
        reasons = emailReasons;
        break;
      case NotificationChannel.SMS:
        reasons = smsReasons;
        break;
      case NotificationChannel.PUSH:
        reasons = pushReasons;
        break;
    }

    const index = Math.floor(Math.random() * reasons.length);
    return reasons[index] || reasons[0] || 'Unknown failure reason';
  }

  /**
   * Clear all notifications (for testing)
   */
  clearAll(): void {
    this.notifications.clear();
    this.logger.warn('All notifications cleared');
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalNotifications: this.notifications.size,
      sentNotifications: Array.from(this.notifications.values()).filter(
        (n) => n.status === NotificationStatus.SENT,
      ).length,
      failedNotifications: Array.from(this.notifications.values()).filter(
        (n) => n.status === NotificationStatus.FAILED,
      ).length,
    };
  }
}
