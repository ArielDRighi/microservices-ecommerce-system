import { ApiProperty } from '@nestjs/swagger';
import { NotificationStatus, NotificationPriority } from '../enums';

export class NotificationResponseDto {
  @ApiProperty({ description: 'Notification ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ enum: NotificationStatus })
  status: NotificationStatus;

  @ApiProperty({ enum: NotificationPriority })
  priority: NotificationPriority;

  @ApiProperty({ description: 'Recipient address' })
  recipient: string;

  @ApiProperty({ description: 'Message ID from provider', required: false })
  messageId?: string;

  @ApiProperty({ description: 'When notification was sent', required: false })
  sentAt?: Date;

  @ApiProperty({ description: 'When notification was created' })
  createdAt: Date;
}
