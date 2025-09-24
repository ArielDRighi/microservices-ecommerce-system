import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  BeforeInsert,
} from 'typeorm';

@Entity('outbox_events')
@Index('idx_outbox_events_processed', ['processed'])
@Index('idx_outbox_events_event_type', ['eventType'])
@Index('idx_outbox_events_created_at', ['createdAt'])
@Index('idx_outbox_events_aggregate_id', ['aggregateId'])
@Index('idx_outbox_events_idempotency_key', ['idempotencyKey'], { unique: true })
export class OutboxEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
    name: 'aggregate_type',
    comment: 'Type of aggregate that generated this event (User, Order, Product, etc.)',
  })
  @Index('idx_outbox_events_aggregate_type')
  aggregateType!: string;

  @Column({
    type: 'uuid',
    nullable: false,
    name: 'aggregate_id',
    comment: 'ID of the aggregate that generated this event',
  })
  @Index('idx_outbox_events_aggregate_id_btree')
  aggregateId!: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
    name: 'event_type',
    comment: 'Type of event (UserCreated, OrderPlaced, ProductUpdated, etc.)',
  })
  @Index('idx_outbox_events_event_type_btree')
  eventType!: string;

  @Column({
    type: 'jsonb',
    nullable: false,
    name: 'event_data',
    comment: 'Event payload as JSON',
  })
  eventData!: Record<string, unknown>;

  @Column({
    type: 'jsonb',
    nullable: true,
    name: 'event_metadata',
    comment: 'Additional metadata for the event',
  })
  eventMetadata?: Record<string, unknown>;

  @Column({
    type: 'bigint',
    nullable: false,
    name: 'sequence_number',
    comment: 'Sequence number for ordering events',
  })
  @Index('idx_outbox_events_sequence')
  sequenceNumber!: bigint;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
    unique: true,
    name: 'idempotency_key',
    comment: 'Unique key to prevent duplicate events',
  })
  @Index('idx_outbox_events_idempotency_key_btree', { unique: true })
  idempotencyKey!: string;

  @Column({
    type: 'boolean',
    default: false,
    nullable: false,
    comment: 'Whether this event has been processed by the message publisher',
  })
  @Index('idx_outbox_events_processed_btree')
  processed!: boolean;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'processed_at',
    comment: 'Timestamp when the event was processed',
  })
  processedAt?: Date;

  @Column({
    type: 'int',
    default: 0,
    name: 'retry_count',
    comment: 'Number of times processing this event has been retried',
  })
  retryCount!: number;

  @Column({
    type: 'int',
    default: 5,
    name: 'max_retries',
    comment: 'Maximum number of retry attempts',
  })
  maxRetries!: number;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'next_retry_at',
    comment: 'Timestamp for the next retry attempt',
  })
  nextRetryAt?: Date;

  @Column({
    type: 'text',
    nullable: true,
    name: 'last_error',
    comment: 'Last error message if processing failed',
  })
  lastError?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'correlation_id',
    comment: 'Correlation ID for tracking related events',
  })
  @Index('idx_outbox_events_correlation_id')
  correlationId?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'causation_id',
    comment: 'ID of the event that caused this event',
  })
  causationId?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'user_id',
    comment: 'ID of the user who triggered this event',
  })
  @Index('idx_outbox_events_user_id')
  userId?: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'low',
    comment: 'Event processing priority (low, normal, high, critical)',
  })
  priority!: 'low' | 'normal' | 'high' | 'critical';

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'scheduled_for',
    comment: 'Timestamp for when this event should be processed (for delayed events)',
  })
  scheduledFor?: Date;

  @CreateDateColumn({
    type: 'timestamptz',
    name: 'created_at',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    name: 'updated_at',
  })
  updatedAt!: Date;

  // Methods
  @BeforeInsert()
  generateIdempotencyKey(): void {
    if (!this.idempotencyKey) {
      this.idempotencyKey = `${this.aggregateType}_${this.aggregateId}_${this.eventType}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
  }

  @BeforeInsert()
  generateSequenceNumber(): void {
    if (!this.sequenceNumber) {
      this.sequenceNumber = BigInt(Date.now() * 1000 + Math.floor(Math.random() * 1000));
    }
  }

  markAsProcessed(): void {
    this.processed = true;
    this.processedAt = new Date();
  }

  incrementRetryCount(): void {
    this.retryCount += 1;
    this.calculateNextRetry();
  }

  markAsFailed(error: string): void {
    this.lastError = error;
    this.incrementRetryCount();
  }

  private calculateNextRetry(): void {
    if (this.retryCount < this.maxRetries) {
      // Exponential backoff: 2^retryCount minutes
      const delayMinutes = Math.pow(2, this.retryCount);
      this.nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000);
    }
  }

  canRetry(): boolean {
    return this.retryCount < this.maxRetries && !this.processed;
  }

  isReadyForRetry(): boolean {
    if (!this.canRetry()) return false;
    if (!this.nextRetryAt) return true;
    return new Date() >= this.nextRetryAt;
  }

  isScheduledEvent(): boolean {
    return !!this.scheduledFor;
  }

  isReadyForProcessing(): boolean {
    if (this.processed) return false;
    if (this.isScheduledEvent() && this.scheduledFor! > new Date()) return false;
    if (!this.canRetry()) return false;
    if (!this.isReadyForRetry()) return false;
    return true;
  }

  addMetadata(key: string, value: unknown): void {
    if (!this.eventMetadata) {
      this.eventMetadata = {};
    }
    this.eventMetadata[key] = value;
  }

  getMetadata<T = unknown>(key: string): T | undefined {
    return this.eventMetadata?.[key] as T;
  }
}
