import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { NotificationsService } from '../notifications.service';
import { NotificationPriority } from '../enums';

interface NotificationJob {
  type: 'order-confirmation' | 'payment-failure' | 'shipping-update' | 'welcome';
  data: Record<string, unknown>;
  priority: NotificationPriority;
  userId: string;
}

@Processor('notification-sending')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @Process()
  async handleNotification(job: Job<NotificationJob>) {
    this.logger.log(`Processing notification job ${job.id} of type ${job.data.type}`);

    try {
      switch (job.data.type) {
        case 'order-confirmation':
          await this.notificationsService.sendOrderConfirmation(
            job.data.data as unknown as Parameters<
              typeof this.notificationsService.sendOrderConfirmation
            >[0],
          );
          break;
        case 'payment-failure':
          await this.notificationsService.sendPaymentFailure(
            job.data.data as unknown as Parameters<
              typeof this.notificationsService.sendPaymentFailure
            >[0],
          );
          break;
        case 'shipping-update':
          await this.notificationsService.sendShippingUpdate(
            job.data.data as unknown as Parameters<
              typeof this.notificationsService.sendShippingUpdate
            >[0],
          );
          break;
        case 'welcome':
          await this.notificationsService.sendWelcomeEmail(job.data.userId);
          break;
        default:
          this.logger.warn(`Unknown notification type: ${job.data.type}`);
      }

      this.logger.log(`Successfully processed notification job ${job.id}`);
      return { success: true, jobId: job.id };
    } catch (error) {
      this.logger.error(`Failed to process notification job ${job.id}:`, error);
      throw error; // Re-throw for Bull to handle retries
    }
  }
}
