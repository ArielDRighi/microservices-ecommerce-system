import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { NotificationType, NotificationStatus, NotificationPriority } from '../enums';

@Entity('notifications')
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  @Index()
  status: NotificationStatus;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  priority: NotificationPriority;

  @Column({ type: 'varchar', length: 255 })
  recipient: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  subject: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'template_type', type: 'varchar', length: 100, nullable: true })
  templateType: string;

  @Column({ name: 'template_data', type: 'jsonb', nullable: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  templateData: Record<string, any>;

  @Column({ name: 'message_id', type: 'varchar', length: 255, nullable: true })
  @Index()
  messageId: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'retry_count', type: 'integer', default: 0 })
  retryCount: number;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ name: 'opened_at', type: 'timestamp', nullable: true })
  openedAt: Date;

  @Column({ name: 'clicked_at', type: 'timestamp', nullable: true })
  clickedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
