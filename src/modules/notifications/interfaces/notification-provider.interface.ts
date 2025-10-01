import { NotificationStatus } from '../enums';

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  status: NotificationStatus;
  error?: string;
  sentAt?: Date;
}

export interface NotificationProvider {
  send(to: string, subject: string, content: string, options?: any): Promise<NotificationResult>;

  getStatus(messageId: string): Promise<NotificationStatus>;
}
