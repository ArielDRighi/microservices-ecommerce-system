import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class CategoryTreeDto {
  @ApiProperty({
    description: 'Category unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Category name',
    example: 'Electronics',
  })
  @Expose()
  name: string;

  @ApiPropertyOptional({
    description: 'Category description',
    example: 'Electronic products and gadgets',
  })
  @Expose()
  description?: string;

  @ApiProperty({
    description: 'URL-friendly slug for SEO',
    example: 'electronics',
  })
  @Expose()
  slug: string;

  @ApiPropertyOptional({
    description: 'Parent category ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @Expose()
  parentId?: string;

  @ApiProperty({
    description: 'Whether the category is active',
    example: true,
  })
  @Expose()
  isActive: boolean;

  @ApiProperty({
    description: 'Sort order for category ordering',
    example: 10,
  })
  @Expose()
  sortOrder: number;

  @ApiPropertyOptional({
    description: 'Additional metadata for the category',
    example: {
      color: '#FF5722',
      icon: 'electronics-icon',
    },
  })
  @Expose()
  metadata?: Record<string, unknown>;

  @ApiProperty({
    description: 'Hierarchical level (0 for root categories)',
    example: 0,
  })
  @Expose()
  level: number;

  @ApiPropertyOptional({
    description: 'Number of products in this category and subcategories',
    example: 150,
  })
  @Expose()
  productCount?: number;

  @ApiProperty({
    description: 'Child categories in tree structure',
    type: [CategoryTreeDto],
  })
  @Expose()
  @Type(() => CategoryTreeDto)
  children: CategoryTreeDto[];

  @ApiProperty({
    description: 'Whether this category has children',
    example: true,
  })
  @Expose()
  hasChildren: boolean;

  constructor() {
    this.children = [];
    this.level = 0;
    this.hasChildren = false;
  }
}
