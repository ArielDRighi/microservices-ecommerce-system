import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { NotificationsService } from '../notifications.service';
import { NotificationPriority } from '../enums';
import { SendOrderConfirmationDto, SendPaymentFailureDto, SendShippingUpdateDto } from '../dto';

// Discriminated union types for type-safe job handling
type NotificationJob =
  | {
      type: 'order-confirmation';
      data: SendOrderConfirmationDto;
      priority: NotificationPriority;
      userId: string;
    }
  | {
      type: 'payment-failure';
      data: SendPaymentFailureDto;
      priority: NotificationPriority;
      userId: string;
    }
  | {
      type: 'shipping-update';
      data: SendShippingUpdateDto;
      priority: NotificationPriority;
      userId: string;
    }
  | {
      type: 'welcome';
      data: Record<string, unknown>;
      priority: NotificationPriority;
      userId: string;
    };

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
          await this.notificationsService.sendOrderConfirmation(job.data.data);
          break;
        case 'payment-failure':
          await this.notificationsService.sendPaymentFailure(job.data.data);
          break;
        case 'shipping-update':
          await this.notificationsService.sendShippingUpdate(job.data.data);
          break;
        case 'welcome':
          await this.notificationsService.sendWelcomeEmail(job.data.userId);
          break;
        default:
          // Exhaustiveness check - TypeScript will error if a case is missed
          const _exhaustiveCheck: never = job.data;
          this.logger.warn(
            `Unknown notification type: ${(_exhaustiveCheck as NotificationJob).type}`,
          );
      }

      this.logger.log(`Successfully processed notification job ${job.id}`);
      return { success: true, jobId: job.id };
    } catch (error) {
      this.logger.error(`Failed to process notification job ${job.id}:`, error);
      throw error; // Re-throw for Bull to handle retries
    }
  }
}
