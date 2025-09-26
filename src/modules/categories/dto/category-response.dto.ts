import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';

export class CategoryResponseDto {
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
    description: 'Category creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'Category last update timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Expose()
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Parent category information',
  })
  @Expose()
  @Type(() => CategoryResponseDto)
  parent?: CategoryResponseDto;

  @ApiPropertyOptional({
    description: 'Child categories',
    type: [CategoryResponseDto],
  })
  @Expose()
  @Type(() => CategoryResponseDto)
  children?: CategoryResponseDto[];

  @ApiPropertyOptional({
    description: 'Hierarchical level (0 for root categories)',
    example: 1,
  })
  @Expose()
  level?: number;

  @ApiPropertyOptional({
    description: 'Category path from root to current category',
    example: ['Electronics', 'Computers'],
    type: [String],
  })
  @Expose()
  path?: string[];

  @ApiPropertyOptional({
    description: 'Number of products in this category and subcategories',
    example: 150,
  })
  @Expose()
  productCount?: number;

  @ApiPropertyOptional({
    description: 'Breadcrumb path for navigation',
    example: 'Electronics > Computers',
  })
  @Expose()
  @Transform(({ obj }) => {
    if (obj.path && Array.isArray(obj.path)) {
      return obj.path.join(' > ');
    }
    return undefined;
  })
  breadcrumb?: string;
}
