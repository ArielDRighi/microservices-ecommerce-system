import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Inventory } from './inventory.entity';
import { Product } from '../../products/entities/product.entity';

export enum ReservationStatus {
  ACTIVE = 'ACTIVE',
  RELEASED = 'RELEASED',
  FULFILLED = 'FULFILLED',
  EXPIRED = 'EXPIRED',
}

@Entity('inventory_reservations')
@Index(['reservationId'], { unique: true })
@Index(['productId', 'location'])
@Index(['expiresAt'])
export class InventoryReservation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'reservation_id', type: 'varchar', length: 255 })
  reservationId!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column({ name: 'inventory_id', type: 'uuid' })
  inventoryId!: string;

  @Column({ type: 'integer' })
  quantity!: number;

  @Column({ type: 'varchar', length: 100, default: 'MAIN_WAREHOUSE' })
  location!: string;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.ACTIVE,
  })
  status!: ReservationStatus;

  @Column({ name: 'reference_id', type: 'varchar', length: 255, nullable: true })
  referenceId?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason?: string;

  @Column({ name: 'expires_at', type: 'timestamp with time zone' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @ManyToOne(() => Inventory)
  @JoinColumn({ name: 'inventory_id' })
  inventory?: Inventory;

  // Business logic methods
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isActive(): boolean {
    return this.status === ReservationStatus.ACTIVE && !this.isExpired();
  }

  canBeReleased(): boolean {
    return this.status === ReservationStatus.ACTIVE;
  }

  canBeFulfilled(): boolean {
    return this.status === ReservationStatus.ACTIVE && !this.isExpired();
  }

  release(): void {
    if (!this.canBeReleased()) {
      throw new Error(`Cannot release reservation with status: ${this.status}`);
    }
    this.status = ReservationStatus.RELEASED;
  }

  fulfill(): void {
    if (!this.canBeFulfilled()) {
      throw new Error(`Cannot fulfill reservation with status: ${this.status}`);
    }
    this.status = ReservationStatus.FULFILLED;
  }

  expire(): void {
    if (this.status === ReservationStatus.ACTIVE) {
      this.status = ReservationStatus.EXPIRED;
    }
  }
}
