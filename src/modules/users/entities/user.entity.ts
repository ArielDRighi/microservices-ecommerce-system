import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import * as bcrypt from 'bcrypt';
import { Order } from '../../orders/entities/order.entity';

@Entity('users')
@Index('idx_users_email', ['email'], { unique: true })
@Index('idx_users_active', ['isActive'])
@Index('idx_users_created_at', ['createdAt'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
    nullable: false,
  })
  @Index('idx_users_email_btree', { unique: true })
  email: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
    name: 'password_hash',
  })
  @Exclude({ toPlainOnly: true }) // Exclude from serialization
  passwordHash: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
    name: 'first_name',
  })
  firstName: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
    name: 'last_name',
  })
  lastName: string;

  @Column({
    type: 'boolean',
    default: true,
    name: 'is_active',
  })
  @Index('idx_users_is_active')
  isActive: boolean;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    name: 'phone_number',
  })
  phoneNumber?: string;

  @Column({
    type: 'date',
    nullable: true,
    name: 'date_of_birth',
  })
  dateOfBirth?: Date;

  @Column({
    type: 'varchar',
    length: 10,
    nullable: true,
    default: 'en',
  })
  language?: string;

  @Column({
    type: 'varchar',
    length: 10,
    nullable: true,
    default: 'UTC',
  })
  timezone?: string;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'email_verified_at',
  })
  emailVerifiedAt?: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    name: 'last_login_at',
  })
  lastLoginAt?: Date;

  @CreateDateColumn({
    type: 'timestamptz',
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    name: 'updated_at',
  })
  updatedAt: Date;

  // Relations
  @OneToMany(() => Order, (order) => order.user, { lazy: true })
  orders: Promise<Order[]>;

  // Virtual Properties
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  get isEmailVerified(): boolean {
    return this.emailVerifiedAt !== null && this.emailVerifiedAt !== undefined;
  }

  // Methods
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword(): Promise<void> {
    if (this.passwordHash && !this.passwordHash.startsWith('$2b$')) {
      const saltRounds = 12;
      this.passwordHash = await bcrypt.hash(this.passwordHash, saltRounds);
    }
  }

  @BeforeInsert()
  @BeforeUpdate()
  normalizeEmail(): void {
    if (this.email) {
      this.email = this.email.toLowerCase().trim();
    }
  }

  @BeforeInsert()
  @BeforeUpdate()
  normalizeName(): void {
    if (this.firstName) {
      this.firstName = this.firstName.trim();
    }
    if (this.lastName) {
      this.lastName = this.lastName.trim();
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.passwordHash);
  }

  markEmailAsVerified(): void {
    this.emailVerifiedAt = new Date();
  }

  updateLastLogin(): void {
    this.lastLoginAt = new Date();
  }

  deactivate(): void {
    this.isActive = false;
  }

  activate(): void {
    this.isActive = true;
  }
}
