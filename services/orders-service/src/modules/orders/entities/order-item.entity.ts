import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  BeforeInsert,
  BeforeUpdate,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('order_items')
@Index('idx_order_items_order_id', ['orderId'])
@Index('idx_order_items_product_id', ['productId'])
@Index('idx_order_items_order_product', ['orderId', 'productId'], { unique: true })
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'uuid',
    name: 'order_id',
    nullable: false,
  })
  @Index('idx_order_items_order_id_btree')
  orderId!: string;

  @Column({
    type: 'uuid',
    name: 'product_id',
    nullable: false,
  })
  @Index('idx_order_items_product_id_btree')
  productId!: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
    comment: 'Product SKU at the time of order',
  })
  sku!: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
    name: 'product_name',
    comment: 'Product name at the time of order',
  })
  productName!: string;

  @Column({
    type: 'int',
    nullable: false,
    default: 1,
  })
  quantity!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    name: 'unit_price',
    comment: 'Price per unit at the time of order',
  })
  unitPrice!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    name: 'total_price',
    comment: 'Calculated total price (quantity * unit_price)',
  })
  totalPrice!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'original_price',
    comment: 'Original product price before any discounts',
  })
  originalPrice?: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'discount_amount',
    comment: 'Total discount applied to this item',
  })
  discountAmount?: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    name: 'discount_percentage',
    comment: 'Discount percentage applied',
  })
  discountPercentage?: number;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'discount_code',
    comment: 'Discount code applied to this item',
  })
  discountCode?: string;

  @Column({
    type: 'varchar',
    length: 3,
    default: 'USD',
  })
  currency!: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    name: 'product_attributes',
    comment: 'Product attributes at the time of order (size, color, etc.)',
  })
  productAttributes?: Record<string, string | number | boolean>;

  @Column({
    type: 'text',
    nullable: true,
  })
  notes?: string;

  @Column({
    type: 'boolean',
    default: false,
    name: 'is_refunded',
  })
  isRefunded!: boolean;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'refunded_amount',
  })
  refundedAmount?: number;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'refunded_at',
  })
  refundedAt?: Date;

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
  @ManyToOne(() => Order, (order) => order.items, {
    lazy: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order!: Promise<Order>;

  @ManyToOne(() => Product, (product) => product.orderItems, { lazy: true })
  @JoinColumn({ name: 'product_id' })
  product!: Promise<Product>;

  // Virtual Properties
  get totalDiscountAmount(): number {
    return this.discountAmount || 0;
  }

  get finalUnitPrice(): number {
    const discountPerUnit = this.totalDiscountAmount / this.quantity;
    return this.unitPrice - discountPerUnit;
  }

  get hasDiscount(): boolean {
    return (this.discountAmount || 0) > 0;
  }

  get savings(): number {
    if (!this.originalPrice) return 0;
    return (this.originalPrice - this.unitPrice) * this.quantity;
  }

  // Methods
  @BeforeInsert()
  @BeforeUpdate()
  validateQuantityAndPrices(): void {
    if (this.quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    if (this.unitPrice <= 0) {
      throw new Error('Unit price must be greater than 0');
    }

    if (this.originalPrice && this.originalPrice < 0) {
      throw new Error('Original price cannot be negative');
    }

    if (this.discountAmount && this.discountAmount < 0) {
      throw new Error('Discount amount cannot be negative');
    }

    if (this.discountPercentage && (this.discountPercentage < 0 || this.discountPercentage > 100)) {
      throw new Error('Discount percentage must be between 0 and 100');
    }
  }

  @BeforeInsert()
  @BeforeUpdate()
  calculateTotalPrice(): void {
    this.totalPrice = Number((this.quantity * this.unitPrice).toFixed(2));

    // Apply discount if specified
    if (this.discountAmount) {
      this.totalPrice = Number((this.totalPrice - this.discountAmount).toFixed(2));
    }

    if (this.totalPrice < 0) {
      this.totalPrice = 0;
    }
  }

  updateQuantity(newQuantity: number): void {
    if (newQuantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    const oldQuantity = this.quantity;
    this.quantity = newQuantity;

    // Recalculate total price
    this.calculateTotalPrice();

    // Update discount amount proportionally if it exists
    if (this.discountAmount && oldQuantity > 0) {
      const discountPerUnit = this.discountAmount / oldQuantity;
      this.discountAmount = Number((discountPerUnit * newQuantity).toFixed(2));
    }
  }

  applyDiscount(discountAmount: number, discountCode?: string): void {
    if (discountAmount < 0) {
      throw new Error('Discount amount cannot be negative');
    }

    if (discountAmount > this.totalPrice) {
      throw new Error('Discount amount cannot exceed item total price');
    }

    this.discountAmount = discountAmount;
    this.discountCode = discountCode;

    // Calculate discount percentage
    if (this.unitPrice > 0) {
      this.discountPercentage = Number(
        ((discountAmount / (this.quantity * this.unitPrice)) * 100).toFixed(2),
      );
    }

    this.calculateTotalPrice();
  }

  removeDiscount(): void {
    this.discountAmount = undefined;
    this.discountPercentage = undefined;
    this.discountCode = undefined;
    this.calculateTotalPrice();
  }

  processRefund(refundAmount?: number): void {
    const maxRefund = this.totalPrice - (this.refundedAmount || 0);
    const amountToRefund = refundAmount || maxRefund;

    if (amountToRefund <= 0) {
      throw new Error('Refund amount must be greater than 0');
    }

    if (amountToRefund > maxRefund) {
      throw new Error('Refund amount exceeds refundable amount');
    }

    this.refundedAmount = (this.refundedAmount || 0) + amountToRefund;
    this.isRefunded = this.refundedAmount >= this.totalPrice;
    this.refundedAt = new Date();
  }

  clone(): Partial<OrderItem> {
    return {
      productId: this.productId,
      sku: this.sku,
      productName: this.productName,
      quantity: this.quantity,
      unitPrice: this.unitPrice,
      originalPrice: this.originalPrice,
      currency: this.currency,
      productAttributes: this.productAttributes ? { ...this.productAttributes } : undefined,
      notes: this.notes,
    };
  }
}
