import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { OrderItem } from '../../orders/entities/order-item.entity';
import { Inventory } from '../../inventory/entities/inventory.entity';

@Entity('products')
@Index('idx_products_sku', ['sku'], { unique: true })
@Index('idx_products_name', ['name'])
@Index('idx_products_active', ['isActive'])
@Index('idx_products_price', ['price'])
@Index('idx_products_created_at', ['createdAt'])
@Index('idx_products_name_description', ['name', 'description'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @Index('idx_products_name_btree')
  name!: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
  })
  @Index('idx_products_price_btree')
  price!: number;

  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
    nullable: false,
  })
  @Index('idx_products_sku_btree', { unique: true })
  sku!: string;

  @Column({
    type: 'boolean',
    default: true,
    name: 'is_active',
  })
  @Index('idx_products_is_active')
  isActive!: boolean;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  brand?: string;

  @Column({
    type: 'decimal',
    precision: 8,
    scale: 3,
    nullable: true,
    comment: 'Weight in kilograms',
  })
  weight?: number;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Additional product attributes and metadata',
  })
  attributes?: Record<string, unknown>;

  @Column({
    type: 'varchar',
    array: true,
    nullable: true,
    comment: 'Array of image URLs',
  })
  images?: string[];

  @Column({
    type: 'varchar',
    array: true,
    nullable: true,
    comment: 'Search tags for the product',
  })
  tags?: string[];

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'cost_price',
    comment: 'Cost price for margin calculations',
  })
  costPrice?: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'compare_at_price',
    comment: 'Original price for discount calculations',
  })
  compareAtPrice?: number;

  @Column({
    type: 'boolean',
    default: true,
    name: 'track_inventory',
    comment: 'Whether to track inventory for this product',
  })
  trackInventory!: boolean;

  @Column({
    type: 'integer',
    default: 0,
    name: 'minimum_stock',
    comment: 'Minimum stock level for low stock alerts',
  })
  minimumStock!: number;

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

  @DeleteDateColumn({
    type: 'timestamptz',
    name: 'deleted_at',
    nullable: true,
  })
  deletedAt?: Date;

  // Relations
  @OneToMany(() => OrderItem, (orderItem) => orderItem.product, { lazy: true })
  orderItems!: Promise<OrderItem[]>;

  @OneToOne(() => Inventory, (inventory) => inventory.product, { lazy: true })
  inventory!: Promise<Inventory>;

  // Virtual Properties
  get isOnSale(): boolean {
    return (
      this.compareAtPrice !== null &&
      this.compareAtPrice !== undefined &&
      this.compareAtPrice > this.price
    );
  }

  get discountPercentage(): number {
    if (!this.isOnSale || !this.compareAtPrice) {
      return 0;
    }
    return Math.round(((this.compareAtPrice - this.price) / this.compareAtPrice) * 100);
  }

  get profitMargin(): number {
    if (!this.costPrice) {
      return 0;
    }
    return Math.round(((this.price - this.costPrice) / this.price) * 100);
  }

  // Methods
  @BeforeInsert()
  @BeforeUpdate()
  validatePricing(): void {
    if (this.price <= 0) {
      throw new Error('Product price must be greater than 0');
    }

    if (this.costPrice && this.costPrice < 0) {
      throw new Error('Cost price cannot be negative');
    }

    if (this.compareAtPrice && this.compareAtPrice <= this.price) {
      throw new Error('Compare at price must be greater than selling price');
    }
  }

  @BeforeInsert()
  @BeforeUpdate()
  normalizeData(): void {
    if (this.name) {
      this.name = this.name.trim();
    }

    if (this.sku) {
      this.sku = this.sku.toUpperCase().trim();
    }

    if (this.brand) {
      this.brand = this.brand.trim();
    }

    // Normalize tags
    if (this.tags) {
      this.tags = this.tags.map((tag) => tag.toLowerCase().trim()).filter(Boolean);
    }
  }

  activate(): void {
    this.isActive = true;
  }

  deactivate(): void {
    this.isActive = false;
  }

  updatePrice(newPrice: number): void {
    if (newPrice <= 0) {
      throw new Error('Price must be greater than 0');
    }
    this.price = newPrice;
  }

  addTag(tag: string): void {
    if (!this.tags) {
      this.tags = [];
    }
    const normalizedTag = tag.toLowerCase().trim();
    if (!this.tags.includes(normalizedTag)) {
      this.tags.push(normalizedTag);
    }
  }

  removeTag(tag: string): void {
    if (!this.tags) {
      return;
    }
    const normalizedTag = tag.toLowerCase().trim();
    this.tags = this.tags.filter((t) => t !== normalizedTag);
  }

  addImage(imageUrl: string): void {
    if (!this.images) {
      this.images = [];
    }
    if (!this.images.includes(imageUrl)) {
      this.images.push(imageUrl);
    }
  }

  removeImage(imageUrl: string): void {
    if (!this.images) {
      return;
    }
    this.images = this.images.filter((img) => img !== imageUrl);
  }
}
