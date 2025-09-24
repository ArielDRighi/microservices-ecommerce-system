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
import { Product } from '../../products/entities/product.entity';
import { InventoryMovementType } from '../enums/inventory-movement-type.enum';

@Entity('inventory')
@Index('idx_inventory_product_id', ['productId'])
@Index('idx_inventory_location', ['location'])
@Index('idx_inventory_sku', ['sku'])
@Index('idx_inventory_low_stock', ['currentStock', 'minimumStock'])
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'uuid',
    name: 'product_id',
    nullable: false,
  })
  @Index('idx_inventory_product_id_btree')
  productId!: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
    comment: 'Product SKU for reference',
  })
  @Index('idx_inventory_sku_btree')
  sku!: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
    default: 'MAIN_WAREHOUSE',
    comment: 'Inventory location/warehouse identifier',
  })
  @Index('idx_inventory_location_btree')
  location!: string;

  @Column({
    type: 'int',
    nullable: false,
    default: 0,
    name: 'current_stock',
    comment: 'Current available stock quantity',
  })
  @Index('idx_inventory_current_stock')
  currentStock!: number;

  @Column({
    type: 'int',
    nullable: false,
    default: 0,
    name: 'reserved_stock',
    comment: 'Stock reserved for pending orders',
  })
  reservedStock!: number;

  @Column({
    type: 'int',
    nullable: false,
    default: 0,
    name: 'minimum_stock',
    comment: 'Minimum stock level before reorder alert',
  })
  @Index('idx_inventory_minimum_stock')
  minimumStock!: number;

  @Column({
    type: 'int',
    nullable: true,
    name: 'maximum_stock',
    comment: 'Maximum stock capacity for this location',
  })
  maximumStock?: number;

  @Column({
    type: 'int',
    nullable: true,
    name: 'reorder_point',
    comment: 'Stock level that triggers automatic reorder',
  })
  reorderPoint?: number;

  @Column({
    type: 'int',
    nullable: true,
    name: 'reorder_quantity',
    comment: 'Quantity to reorder when reaching reorder point',
  })
  reorderQuantity?: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'average_cost',
    comment: 'Average cost per unit (for accounting)',
  })
  averageCost?: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'last_cost',
    comment: 'Last purchase cost per unit',
  })
  lastCost?: number;

  @Column({
    type: 'varchar',
    length: 3,
    default: 'USD',
  })
  currency!: string;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'last_movement_at',
    comment: 'Timestamp of last inventory movement',
  })
  lastMovementAt?: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'last_restock_at',
    comment: 'Timestamp of last restocking',
  })
  lastRestockAt?: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'next_expected_restock',
    comment: 'Expected date for next restock',
  })
  nextExpectedRestock?: Date;

  @Column({
    type: 'boolean',
    default: true,
    name: 'is_active',
    comment: 'Whether this inventory record is active',
  })
  isActive!: boolean;

  @Column({
    type: 'boolean',
    default: false,
    name: 'auto_reorder_enabled',
    comment: 'Whether automatic reordering is enabled',
  })
  autoReorderEnabled!: boolean;

  @Column({
    type: 'jsonb',
    nullable: true,
    name: 'metadata',
    comment: 'Additional metadata for inventory management',
  })
  metadata?: Record<string, string | number | boolean>;

  @Column({
    type: 'text',
    nullable: true,
  })
  notes?: string;

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
  @ManyToOne(() => Product, (product) => product.inventory, { lazy: true })
  @JoinColumn({ name: 'product_id' })
  product!: Promise<Product>;

  @OneToMany(() => InventoryMovement, (movement) => movement.inventory, { lazy: true })
  movements!: Promise<InventoryMovement[]>;

  // Virtual Properties
  get availableStock(): number {
    return Math.max(0, this.currentStock - this.reservedStock);
  }

  get totalStock(): number {
    return this.currentStock + this.reservedStock;
  }

  get isLowStock(): boolean {
    return this.currentStock <= this.minimumStock;
  }

  get isOutOfStock(): boolean {
    return this.currentStock <= 0;
  }

  get isOverMaximum(): boolean {
    return this.maximumStock ? this.currentStock > this.maximumStock : false;
  }

  get needsReorder(): boolean {
    return this.reorderPoint ? this.currentStock <= this.reorderPoint : this.isLowStock;
  }

  get stockStatus(): 'OUT_OF_STOCK' | 'LOW_STOCK' | 'NORMAL' | 'OVERSTOCKED' {
    if (this.isOutOfStock) return 'OUT_OF_STOCK';
    if (this.isLowStock) return 'LOW_STOCK';
    if (this.isOverMaximum) return 'OVERSTOCKED';
    return 'NORMAL';
  }

  get stockPercentage(): number {
    if (!this.maximumStock || this.maximumStock <= 0) return 0;
    return Math.min(100, (this.currentStock / this.maximumStock) * 100);
  }

  // Methods
  @BeforeInsert()
  @BeforeUpdate()
  validateStock(): void {
    if (this.currentStock < 0) {
      throw new Error('Current stock cannot be negative');
    }

    if (this.reservedStock < 0) {
      throw new Error('Reserved stock cannot be negative');
    }

    if (this.minimumStock < 0) {
      throw new Error('Minimum stock cannot be negative');
    }

    if (this.maximumStock && this.maximumStock <= 0) {
      throw new Error('Maximum stock must be greater than 0 if specified');
    }

    if (this.reorderPoint && this.reorderPoint < 0) {
      throw new Error('Reorder point cannot be negative');
    }

    if (this.reorderQuantity && this.reorderQuantity <= 0) {
      throw new Error('Reorder quantity must be greater than 0 if specified');
    }
  }

  canReserve(quantity: number): boolean {
    return this.availableStock >= quantity;
  }

  reserveStock(quantity: number, _reason?: string): void {
    if (quantity <= 0) {
      throw new Error('Reserve quantity must be greater than 0');
    }

    if (!this.canReserve(quantity)) {
      throw new Error(
        `Insufficient available stock. Available: ${this.availableStock}, Requested: ${quantity}`,
      );
    }

    this.reservedStock += quantity;
    this.lastMovementAt = new Date();
  }

  releaseReservedStock(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('Release quantity must be greater than 0');
    }

    if (quantity > this.reservedStock) {
      throw new Error(
        `Cannot release more than reserved. Reserved: ${this.reservedStock}, Requested: ${quantity}`,
      );
    }

    this.reservedStock -= quantity;
    this.lastMovementAt = new Date();
  }

  addStock(quantity: number, cost?: number): void {
    if (quantity <= 0) {
      throw new Error('Add quantity must be greater than 0');
    }

    // Update average cost if cost is provided
    if (cost && cost > 0) {
      const totalValue = this.currentStock * (this.averageCost || 0) + quantity * cost;
      const totalQuantity = this.currentStock + quantity;
      this.averageCost = Number((totalValue / totalQuantity).toFixed(2));
      this.lastCost = cost;
    }

    this.currentStock += quantity;
    this.lastMovementAt = new Date();
    this.lastRestockAt = new Date();
  }

  removeStock(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('Remove quantity must be greater than 0');
    }

    if (quantity > this.currentStock) {
      throw new Error(
        `Cannot remove more than current stock. Current: ${this.currentStock}, Requested: ${quantity}`,
      );
    }

    this.currentStock -= quantity;
    this.lastMovementAt = new Date();
  }

  fulfillReservation(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('Fulfill quantity must be greater than 0');
    }

    if (quantity > this.reservedStock) {
      throw new Error(
        `Cannot fulfill more than reserved. Reserved: ${this.reservedStock}, Requested: ${quantity}`,
      );
    }

    this.reservedStock -= quantity;
    this.currentStock -= quantity;
    this.lastMovementAt = new Date();
  }

  adjustStock(newQuantity: number, reason?: string): void {
    if (newQuantity < 0) {
      throw new Error('New quantity cannot be negative');
    }

    this.currentStock = newQuantity;
    this.lastMovementAt = new Date();

    if (reason && this.notes) {
      this.notes += `\n${new Date().toISOString()}: Stock adjusted to ${newQuantity}. Reason: ${reason}`;
    } else if (reason) {
      this.notes = `${new Date().toISOString()}: Stock adjusted to ${newQuantity}. Reason: ${reason}`;
    }
  }

  updateReorderSettings(reorderPoint?: number, reorderQuantity?: number): void {
    if (reorderPoint !== undefined) {
      if (reorderPoint < 0) {
        throw new Error('Reorder point cannot be negative');
      }
      this.reorderPoint = reorderPoint;
    }

    if (reorderQuantity !== undefined) {
      if (reorderQuantity <= 0) {
        throw new Error('Reorder quantity must be greater than 0');
      }
      this.reorderQuantity = reorderQuantity;
    }
  }

  scheduleRestock(expectedDate: Date): void {
    this.nextExpectedRestock = expectedDate;
  }
}

// Separate entity for tracking inventory movements
@Entity('inventory_movements')
@Index('idx_inventory_movements_inventory_id', ['inventoryId'])
@Index('idx_inventory_movements_type', ['movementType'])
@Index('idx_inventory_movements_created_at', ['createdAt'])
export class InventoryMovement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'uuid',
    name: 'inventory_id',
    nullable: false,
  })
  inventoryId!: string;

  @Column({
    type: 'enum',
    enum: InventoryMovementType,
    name: 'movement_type',
  })
  movementType!: InventoryMovementType;

  @Column({
    type: 'int',
    nullable: false,
    comment: 'Positive for additions, negative for removals',
  })
  quantity!: number;

  @Column({
    type: 'int',
    nullable: false,
    name: 'stock_before',
    comment: 'Stock level before this movement',
  })
  stockBefore!: number;

  @Column({
    type: 'int',
    nullable: false,
    name: 'stock_after',
    comment: 'Stock level after this movement',
  })
  stockAfter!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'unit_cost',
  })
  unitCost?: number;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'reference_id',
    comment: 'Reference to order, purchase, etc.',
  })
  referenceId?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'reference_type',
    comment: 'Type of reference (ORDER, PURCHASE, ADJUSTMENT, etc.)',
  })
  referenceType?: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  reason?: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'performed_by',
    comment: 'User or system that performed this movement',
  })
  performedBy?: string;

  @CreateDateColumn({
    type: 'timestamptz',
    name: 'created_at',
  })
  createdAt!: Date;

  // Relations
  @ManyToOne(() => Inventory, (inventory) => inventory.movements, { lazy: true })
  @JoinColumn({ name: 'inventory_id' })
  inventory!: Promise<Inventory>;
}
