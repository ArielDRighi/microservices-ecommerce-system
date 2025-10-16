import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SagaType {
  ORDER_PROCESSING = 'ORDER_PROCESSING',
}

export enum SagaStatus {
  STARTED = 'STARTED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
  COMPENSATING = 'COMPENSATING',
  COMPENSATED = 'COMPENSATED',
  COMPENSATION_FAILED = 'COMPENSATION_FAILED',
  CANCELLED = 'CANCELLED',
  TIMEOUT = 'TIMEOUT',
}

@Entity('saga_states')
export class SagaStateEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'saga_type',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  sagaType: SagaType;

  @Column({
    name: 'aggregate_id',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  aggregateId: string; // orderId en caso de ORDER_PROCESSING

  @Column({
    name: 'correlation_id',
    type: 'varchar',
    length: 255,
    nullable: false,
    unique: true,
  })
  correlationId: string;

  @Column({
    name: 'current_step',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  currentStep: string;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 50,
    nullable: false,
    default: SagaStatus.STARTED,
  })
  status: SagaStatus;

  @Column({
    name: 'saga_data',
    type: 'jsonb',
    nullable: false,
  })
  stateData: Record<string, unknown>;

  @Column({
    name: 'last_error',
    type: 'text',
    nullable: true,
  })
  errorDetails: string | null;

  @Column({
    name: 'retry_count',
    type: 'int',
    default: 0,
  })
  retryCount: number;

  @Column({
    name: 'completed_at',
    type: 'timestamptz',
    nullable: true,
  })
  completedAt: Date | null;

  @Column({
    name: 'failed_at',
    type: 'timestamptz',
    nullable: true,
  })
  failedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
