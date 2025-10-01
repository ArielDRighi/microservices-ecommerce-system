import { NotificationStatus } from '../enums';

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  status: NotificationStatus;
  error?: string;
  sentAt?: Date;
}

export interface NotificationProviderOptions {
  attachments?: Array<{ filename: string; content: string }>;
  priority?: 'high' | 'normal' | 'low';
  metadata?: Record<string, string>;
}

export interface NotificationProvider {
  send(
    to: string,
    subject: string,
    content: string,
    options?: NotificationProviderOptions,
  ): Promise<NotificationResult>;

  getStatus(messageId: string): Promise<NotificationStatus>;
}
