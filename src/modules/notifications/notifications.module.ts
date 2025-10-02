import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { NotificationsService } from './notifications.service';
import { TemplateService } from './templates/template.service';
import { EmailProvider } from './providers/email.provider';
import { SMSProvider } from './providers/sms.provider';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationProcessor } from './processors/notification.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity]),
    BullModule.registerQueue({
      name: 'notification-sending',
    }),
  ],
  providers: [
    NotificationsService,
    TemplateService,
    EmailProvider,
    SMSProvider,
    NotificationProcessor,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
