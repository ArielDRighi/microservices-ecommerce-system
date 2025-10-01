import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TemplateService } from './templates/template.service';
import { EmailProvider } from './providers/email.provider';
import { SMSProvider } from './providers/sms.provider';
import { NotificationEntity } from './entities/notification.entity';
import {
  NotificationType,
  NotificationStatus,
  NotificationPriority,
  Language,
  TemplateType,
} from './enums';
import { NotificationResult, NotificationPreferences } from './interfaces';
import { SendOrderConfirmationDto, SendPaymentFailureDto, SendShippingUpdateDto } from './dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
    private readonly templateService: TemplateService,
    private readonly emailProvider: EmailProvider,
    private readonly smsProvider: SMSProvider,
  ) {}

  async sendOrderConfirmation(data: SendOrderConfirmationDto): Promise<NotificationResult> {
    this.logger.log(`Sending order confirmation for order ${data.orderId}`);

    const userEmail = 'customer@example.com';
    const userName = 'Customer';

    const templateData = {
      orderNumber: data.orderNumber,
      customerName: userName,
      totalAmount: data.totalAmount,
      currency: data.currency,
    };

    const rendered = this.templateService.renderTemplate(
      TemplateType.ORDER_CONFIRMATION,
      templateData,
      Language.EN,
    );

    const result = await this.emailProvider.send(userEmail, rendered.subject, rendered.body);

    await this.saveNotification({
      userId: data.orderId,
      type: NotificationType.EMAIL,
      status: result.status,
      recipient: userEmail,
      subject: rendered.subject,
      content: rendered.body,
      templateType: TemplateType.ORDER_CONFIRMATION,
      templateData,
      messageId: result.messageId,
      errorMessage: result.error,
      priority: NotificationPriority.HIGH,
    });

    return result;
  }

  async sendPaymentFailure(data: SendPaymentFailureDto): Promise<NotificationResult> {
    this.logger.log(`Sending payment failure notification for order ${data.orderId}`);

    const userEmail = 'customer@example.com';
    const userName = 'Customer';

    const templateData = {
      orderNumber: data.orderNumber,
      customerName: userName,
      reason: data.reason,
    };

    const rendered = this.templateService.renderTemplate(
      TemplateType.PAYMENT_FAILURE,
      templateData,
      Language.EN,
    );

    const result = await this.emailProvider.send(userEmail, rendered.subject, rendered.body);

    await this.saveNotification({
      userId: data.orderId,
      type: NotificationType.EMAIL,
      status: result.status,
      recipient: userEmail,
      subject: rendered.subject,
      content: rendered.body,
      templateType: TemplateType.PAYMENT_FAILURE,
      templateData,
      messageId: result.messageId,
      errorMessage: result.error,
      priority: NotificationPriority.CRITICAL,
    });

    return result;
  }

  async sendShippingUpdate(data: SendShippingUpdateDto): Promise<NotificationResult> {
    this.logger.log(`Sending shipping update for order ${data.orderId}`);

    const userEmail = 'customer@example.com';
    const userName = 'Customer';

    const templateData = {
      orderNumber: data.orderNumber,
      customerName: userName,
      trackingNumber: data.trackingNumber,
      carrier: data.carrier,
    };

    const rendered = this.templateService.renderTemplate(
      TemplateType.SHIPPING_UPDATE,
      templateData,
      Language.EN,
    );

    const result = await this.emailProvider.send(userEmail, rendered.subject, rendered.body);

    await this.saveNotification({
      userId: data.orderId,
      type: NotificationType.EMAIL,
      status: result.status,
      recipient: userEmail,
      subject: rendered.subject,
      content: rendered.body,
      templateType: TemplateType.SHIPPING_UPDATE,
      templateData,
      messageId: result.messageId,
      errorMessage: result.error,
      priority: NotificationPriority.NORMAL,
    });

    return result;
  }

  async sendWelcomeEmail(userId: string): Promise<NotificationResult> {
    this.logger.log(`Sending welcome email to user ${userId}`);

    const userEmail = 'newuser@example.com';
    const userName = 'New User';

    const templateData = {
      userName,
    };

    const rendered = this.templateService.renderTemplate(
      TemplateType.WELCOME_EMAIL,
      templateData,
      Language.EN,
    );

    const result = await this.emailProvider.send(userEmail, rendered.subject, rendered.body);

    await this.saveNotification({
      userId,
      type: NotificationType.EMAIL,
      status: result.status,
      recipient: userEmail,
      subject: rendered.subject,
      content: rendered.body,
      templateType: TemplateType.WELCOME_EMAIL,
      templateData,
      messageId: result.messageId,
      errorMessage: result.error,
      priority: NotificationPriority.LOW,
    });

    return result;
  }

  async shouldSendNotification(
    userId: string,
    type: NotificationType,
    preferences?: NotificationPreferences,
  ): Promise<boolean> {
    if (!preferences) {
      return true;
    }

    switch (type) {
      case NotificationType.EMAIL:
        return preferences.email?.enabled ?? true;
      case NotificationType.SMS:
        return (preferences.sms?.enabled && !preferences.sms?.optedOut) || false;
      case NotificationType.PUSH:
        return preferences.push?.enabled ?? true;
      default:
        return true;
    }
  }

  async getNotificationStatus(notificationId: string): Promise<NotificationResult | null> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      return null;
    }

    return {
      success:
        notification.status === NotificationStatus.SENT ||
        notification.status === NotificationStatus.OPENED ||
        notification.status === NotificationStatus.CLICKED,
      messageId: notification.messageId,
      status: notification.status,
      sentAt: notification.sentAt,
      error: notification.errorMessage,
    };
  }

  async getUserNotifications(userId: string): Promise<NotificationEntity[]> {
    return this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  private async saveNotification(data: {
    userId: string;
    type: NotificationType;
    status: NotificationStatus;
    recipient: string;
    subject?: string;
    content: string;
    templateType?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    templateData?: Record<string, any>;
    messageId?: string;
    errorMessage?: string;
    priority: NotificationPriority;
  }): Promise<NotificationEntity> {
    const notification = this.notificationRepository.create({
      userId: data.userId,
      type: data.type,
      status: data.status,
      recipient: data.recipient,
      subject: data.subject,
      content: data.content,
      templateType: data.templateType,
      templateData: data.templateData,
      messageId: data.messageId,
      errorMessage: data.errorMessage,
      priority: data.priority,
      sentAt: data.status === NotificationStatus.SENT ? new Date() : undefined,
    });

    return this.notificationRepository.save(notification);
  }
}
