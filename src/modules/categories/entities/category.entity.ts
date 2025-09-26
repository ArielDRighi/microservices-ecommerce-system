import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Product } from '../../products/entities/product.entity';

@Entity('categories')
@Index(['parentId', 'isActive'])
@Index(['slug'], { unique: true })
@Index(['sortOrder', 'name'])
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @Index()
  slug: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  parentId?: string;

  @Column({ type: 'boolean', default: true })
  @Index()
  isActive: boolean;

  @Column({ type: 'integer', default: 0 })
  @Index()
  sortOrder: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
  @Exclude()
  deletedAt?: Date;

  // Relations
  @ManyToOne(() => Category, (category) => category.children, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parentId' })
  parent?: Category;

  @OneToMany(() => Category, (category) => category.parent, {
    cascade: true,
  })
  children?: Category[];

  @OneToMany(() => Product, (product) => product.category)
  products?: Product[];

  // Virtual properties (not stored in DB)
  level?: number;
  path?: string[];
  productCount?: number;

  @BeforeInsert()
  @BeforeUpdate()
  generateSlugIfEmpty() {
    if (!this.slug && this.name) {
      this.slug = this.generateSlug(this.name);
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, and hyphens with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  // Helper methods
  isRoot(): boolean {
    return !this.parentId;
  }

  hasChildren(): boolean {
    return Boolean(this.children && this.children.length > 0);
  }

  isDescendantOf(category: Category): boolean {
    let current = this.parent;
    while (current) {
      if (current.id === category.id) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  getAncestors(): Category[] {
    const ancestors: Category[] = [];
    let current = this.parent;
    while (current) {
      ancestors.unshift(current);
      current = current.parent;
    }
    return ancestors;
  }

  getLevel(): number {
    if (this.level !== undefined) {
      return this.level;
    }
    return this.getAncestors().length;
  }

  getPath(): string[] {
    if (this.path !== undefined) {
      return this.path;
    }
    const ancestors = this.getAncestors();
    return [...ancestors.map((a) => a.name), this.name];
  }
}
