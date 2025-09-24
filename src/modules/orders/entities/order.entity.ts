import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  BeforeInsert,
  BeforeUpdate,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatus } from '../enums/order-status.enum';

@Entity('orders')
@Index('idx_orders_user_id', ['userId'])
@Index('idx_orders_status', ['status'])
@Index('idx_orders_idempotency_key', ['idempotencyKey'], { unique: true })
@Index('idx_orders_created_at', ['createdAt'])
@Index('idx_orders_payment_id', ['paymentId'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'uuid',
    name: 'user_id',
    nullable: false,
  })
  @Index('idx_orders_user_id_btree')
  userId!: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  @Index('idx_orders_status_btree')
  status!: OrderStatus;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    name: 'total_amount',
  })
  totalAmount!: number;

  @Column({
    type: 'varchar',
    length: 3,
    default: 'USD',
  })
  currency!: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
    nullable: true,
    name: 'idempotency_key',
  })
  @Index('idx_orders_idempotency_key_btree', { unique: true })
  idempotencyKey?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'payment_id',
  })
  @Index('idx_orders_payment_id_btree')
  paymentId?: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'subtotal_amount',
    comment: 'Amount before taxes and fees',
  })
  subtotalAmount?: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'tax_amount',
  })
  taxAmount?: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'shipping_amount',
  })
  shippingAmount?: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'discount_amount',
  })
  discountAmount?: number;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'discount_code',
  })
  discountCode?: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    name: 'shipping_address',
    comment: 'Shipping address as JSON',
  })
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    name?: string;
    phone?: string;
  };

  @Column({
    type: 'jsonb',
    nullable: true,
    name: 'billing_address',
    comment: 'Billing address as JSON',
  })
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    name?: string;
    phone?: string;
  };

  @Column({
    type: 'text',
    nullable: true,
  })
  notes?: string;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'processing_started_at',
  })
  processingStartedAt?: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'completed_at',
  })
  completedAt?: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'failed_at',
  })
  failedAt?: Date;

  @Column({
    type: 'text',
    nullable: true,
    name: 'failure_reason',
  })
  failureReason?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'tracking_number',
  })
  trackingNumber?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'shipping_carrier',
  })
  shippingCarrier?: string;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'shipped_at',
  })
  shippedAt?: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'delivered_at',
  })
  deliveredAt?: Date;

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

  // Relations
  @ManyToOne(() => User, (user) => user.orders, { lazy: true })
  @JoinColumn({ name: 'user_id' })
  user!: Promise<User>;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, { lazy: true, cascade: true })
  items!: Promise<OrderItem[]>;

  // Virtual Properties
  get isCompleted(): boolean {
    return [OrderStatus.DELIVERED, OrderStatus.CONFIRMED].includes(this.status);
  }

  get isCancellable(): boolean {
    return [OrderStatus.PENDING, OrderStatus.PROCESSING].includes(this.status);
  }

  get isRefundable(): boolean {
    return [OrderStatus.DELIVERED, OrderStatus.CONFIRMED].includes(this.status);
  }

  get totalItems(): number {
    // This would need to be calculated from the items relation
    return 0; // Placeholder
  }

  // Methods
  @BeforeInsert()
  @BeforeUpdate()
  validateAmounts(): void {
    if (this.totalAmount <= 0) {
      throw new Error('Total amount must be greater than 0');
    }

    if (this.subtotalAmount && this.subtotalAmount <= 0) {
      throw new Error('Subtotal amount must be greater than 0');
    }

    if (this.taxAmount && this.taxAmount < 0) {
      throw new Error('Tax amount cannot be negative');
    }

    if (this.shippingAmount && this.shippingAmount < 0) {
      throw new Error('Shipping amount cannot be negative');
    }

    if (this.discountAmount && this.discountAmount < 0) {
      throw new Error('Discount amount cannot be negative');
    }
  }

  @BeforeInsert()
  generateIdempotencyKey(): void {
    if (!this.idempotencyKey) {
      this.idempotencyKey = `order_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
  }

  startProcessing(): void {
    this.status = OrderStatus.PROCESSING;
    this.processingStartedAt = new Date();
  }

  markAsConfirmed(): void {
    this.status = OrderStatus.CONFIRMED;
    this.completedAt = new Date();
  }

  markAsShipped(trackingNumber?: string, carrier?: string): void {
    this.status = OrderStatus.SHIPPED;
    this.shippedAt = new Date();
    if (trackingNumber) {
      this.trackingNumber = trackingNumber;
    }
    if (carrier) {
      this.shippingCarrier = carrier;
    }
  }

  markAsDelivered(): void {
    this.status = OrderStatus.DELIVERED;
    this.deliveredAt = new Date();
    this.completedAt = new Date();
  }

  cancel(reason?: string): void {
    if (!this.isCancellable) {
      throw new Error('Order cannot be cancelled in current status');
    }
    this.status = OrderStatus.CANCELLED;
    this.failedAt = new Date();
    if (reason) {
      this.failureReason = reason;
    }
  }

  markAsPaymentFailed(reason?: string): void {
    this.status = OrderStatus.PAYMENT_FAILED;
    this.failedAt = new Date();
    if (reason) {
      this.failureReason = reason;
    }
  }

  markAsRefunded(): void {
    if (!this.isRefundable) {
      throw new Error('Order is not eligible for refund');
    }
    this.status = OrderStatus.REFUNDED;
  }

  addNote(note: string): void {
    if (!this.notes) {
      this.notes = note;
    } else {
      this.notes += `\n---\n${note}`;
    }
  }
}
