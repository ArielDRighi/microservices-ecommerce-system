import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  BeforeInsert,
} from 'typeorm';
import { SagaStatus } from '../enums/saga-status.enum';

@Entity('saga_states')
@Index('idx_saga_states_saga_type', ['sagaType'])
@Index('idx_saga_states_status', ['status'])
@Index('idx_saga_states_correlation_id', ['correlationId'], { unique: true })
@Index('idx_saga_states_created_at', ['createdAt'])
@Index('idx_saga_states_next_step_at', ['nextStepAt'])
export class SagaState {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
    name: 'saga_type',
    comment: 'Type of saga (OrderProcessingSaga, PaymentProcessingSaga, etc.)',
  })
  @Index('idx_saga_states_saga_type_btree')
  sagaType!: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
    unique: true,
    name: 'correlation_id',
    comment: 'Unique identifier for this saga instance',
  })
  @Index('idx_saga_states_correlation_id_btree', { unique: true })
  correlationId!: string;

  @Column({
    type: 'enum',
    enum: SagaStatus,
    default: SagaStatus.STARTED,
    comment: 'Current status of the saga',
  })
  @Index('idx_saga_states_status_btree')
  status!: SagaStatus;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
    name: 'current_step',
    comment: 'Current step in the saga workflow',
  })
  currentStep!: string;

  @Column({
    type: 'int',
    default: 0,
    name: 'step_sequence',
    comment: 'Sequence number of the current step',
  })
  stepSequence!: number;

  @Column({
    type: 'jsonb',
    nullable: false,
    name: 'saga_data',
    comment: 'Data context for the saga',
  })
  sagaData!: Record<string, unknown>;

  @Column({
    type: 'jsonb',
    nullable: true,
    name: 'compensation_data',
    comment: 'Data needed for compensation actions',
  })
  compensationData?: Record<string, unknown>;

  @Column({
    type: 'text',
    array: true,
    default: '{}',
    name: 'completed_steps',
    comment: 'Array of completed step names',
  })
  completedSteps!: string[];

  @Column({
    type: 'text',
    array: true,
    default: '{}',
    name: 'failed_steps',
    comment: 'Array of failed step names',
  })
  failedSteps!: string[];

  @Column({
    type: 'text',
    array: true,
    default: '{}',
    name: 'compensated_steps',
    comment: 'Array of compensated step names',
  })
  compensatedSteps!: string[];

  @Column({
    type: 'int',
    default: 0,
    name: 'retry_count',
    comment: 'Number of retries for the current step',
  })
  retryCount!: number;

  @Column({
    type: 'int',
    default: 3,
    name: 'max_retries',
    comment: 'Maximum number of retries allowed',
  })
  maxRetries!: number;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'next_step_at',
    comment: 'Scheduled time for the next step execution',
  })
  @Index('idx_saga_states_next_step_at_btree')
  nextStepAt?: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'started_at',
    comment: 'Timestamp when the saga was started',
  })
  startedAt?: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'completed_at',
    comment: 'Timestamp when the saga was completed',
  })
  completedAt?: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'failed_at',
    comment: 'Timestamp when the saga failed',
  })
  failedAt?: Date;

  @Column({
    type: 'text',
    nullable: true,
    name: 'failure_reason',
    comment: 'Reason for saga failure',
  })
  failureReason?: string;

  @Column({
    type: 'text',
    nullable: true,
    name: 'last_error',
    comment: 'Last error message',
  })
  lastError?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'initiator_id',
    comment: 'ID of the user or system that initiated the saga',
  })
  @Index('idx_saga_states_initiator_id')
  initiatorId?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'aggregate_id',
    comment: 'ID of the main aggregate this saga is processing',
  })
  @Index('idx_saga_states_aggregate_id')
  aggregateId?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'aggregate_type',
    comment: 'Type of the main aggregate this saga is processing',
  })
  aggregateType?: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    name: 'metadata',
    comment: 'Additional metadata for the saga',
  })
  metadata?: Record<string, unknown>;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'expires_at',
    comment: 'Expiration time for the saga',
  })
  expiresAt?: Date;

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

  // Virtual Properties
  get isActive(): boolean {
    return [SagaStatus.STARTED, SagaStatus.RUNNING, SagaStatus.RETRYING].includes(this.status);
  }

  get isCompleted(): boolean {
    return this.status === SagaStatus.COMPLETED;
  }

  get isFailed(): boolean {
    return [SagaStatus.FAILED, SagaStatus.COMPENSATION_FAILED].includes(this.status);
  }

  get isCompensating(): boolean {
    return [SagaStatus.COMPENSATING, SagaStatus.COMPENSATION_FAILED].includes(this.status);
  }

  get canRetry(): boolean {
    return this.retryCount < this.maxRetries && this.isActive;
  }

  get isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  get isReadyForExecution(): boolean {
    if (!this.isActive) return false;
    if (this.isExpired) return false;
    if (this.nextStepAt && this.nextStepAt > new Date()) return false;
    return true;
  }

  // Methods
  @BeforeInsert()
  initializeSaga(): void {
    if (!this.correlationId) {
      this.correlationId = `saga_${this.sagaType}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }

    if (!this.startedAt) {
      this.startedAt = new Date();
    }
  }

  start(): void {
    this.status = SagaStatus.STARTED;
    this.startedAt = new Date();
  }

  markAsRunning(): void {
    this.status = SagaStatus.RUNNING;
  }

  completeStep(stepName: string): void {
    if (!this.completedSteps.includes(stepName)) {
      this.completedSteps.push(stepName);
    }
    this.retryCount = 0; // Reset retry count on successful step
  }

  failStep(stepName: string, error?: string): void {
    if (!this.failedSteps.includes(stepName)) {
      this.failedSteps.push(stepName);
    }

    if (error) {
      this.lastError = error;
    }

    this.incrementRetryCount();
  }

  moveToNextStep(stepName: string, scheduleAt?: Date): void {
    this.currentStep = stepName;
    this.stepSequence += 1;
    this.retryCount = 0;
    this.nextStepAt = scheduleAt;
    this.status = SagaStatus.RUNNING;
  }

  complete(): void {
    this.status = SagaStatus.COMPLETED;
    this.completedAt = new Date();
  }

  fail(reason?: string): void {
    this.status = SagaStatus.FAILED;
    this.failedAt = new Date();
    if (reason) {
      this.failureReason = reason;
    }
  }

  startCompensation(): void {
    this.status = SagaStatus.COMPENSATING;
  }

  compensateStep(stepName: string): void {
    if (!this.compensatedSteps.includes(stepName)) {
      this.compensatedSteps.push(stepName);
    }
  }

  completeCompensation(): void {
    this.status = SagaStatus.COMPENSATED;
    this.completedAt = new Date();
  }

  failCompensation(reason?: string): void {
    this.status = SagaStatus.COMPENSATION_FAILED;
    this.failedAt = new Date();
    if (reason) {
      this.failureReason = reason;
    }
  }

  incrementRetryCount(): void {
    this.retryCount += 1;

    if (this.retryCount >= this.maxRetries) {
      this.status = SagaStatus.FAILED;
      this.failedAt = new Date();
      this.failureReason = 'Maximum retry attempts exceeded';
    } else {
      this.status = SagaStatus.RETRYING;
      this.scheduleRetry();
    }
  }

  private scheduleRetry(): void {
    // Exponential backoff: 2^retryCount minutes
    const delayMinutes = Math.pow(2, this.retryCount);
    this.nextStepAt = new Date(Date.now() + delayMinutes * 60 * 1000);
  }

  updateData(key: string, value: unknown): void {
    this.sagaData[key] = value;
  }

  getData<T = unknown>(key: string): T | undefined {
    return this.sagaData[key] as T;
  }

  addCompensationData(key: string, value: unknown): void {
    if (!this.compensationData) {
      this.compensationData = {};
    }
    this.compensationData[key] = value;
  }

  getCompensationData<T = unknown>(key: string): T | undefined {
    return this.compensationData?.[key] as T;
  }

  addMetadata(key: string, value: unknown): void {
    if (!this.metadata) {
      this.metadata = {};
    }
    this.metadata[key] = value;
  }

  getMetadata<T = unknown>(key: string): T | undefined {
    return this.metadata?.[key] as T;
  }

  setExpiration(expiresAt: Date): void {
    this.expiresAt = expiresAt;
  }

  extend(additionalMinutes: number): void {
    const newExpiration = new Date(Date.now() + additionalMinutes * 60 * 1000);
    this.setExpiration(newExpiration);
  }
}
