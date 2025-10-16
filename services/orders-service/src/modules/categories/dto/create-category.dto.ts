import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  IsObject,
  MinLength,
  MaxLength,
  Matches,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Category name',
    example: 'Electronics',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @MinLength(2, { message: 'Category name must be at least 2 characters long' })
  @MaxLength(255, { message: 'Category name must not exceed 255 characters' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({
    description: 'Category description',
    example: 'Electronic products and gadgets',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Description must not exceed 1000 characters' })
  @Transform(({ value }) => value?.trim() || undefined)
  description?: string;

  @ApiPropertyOptional({
    description: 'URL-friendly slug for SEO. If not provided, it will be generated from name',
    example: 'electronics',
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  @MinLength(2, { message: 'Slug must be at least 2 characters long' })
  @MaxLength(255, { message: 'Slug must not exceed 255 characters' })
  @Transform(({ value }) => value?.toLowerCase().trim() || undefined)
  slug?: string;

  @ApiPropertyOptional({
    description: 'Parent category ID for hierarchical structure',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID(4, { message: 'Parent ID must be a valid UUID' })
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Sort order for category ordering within same level',
    example: 10,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt({ message: 'Sort order must be an integer' })
  @Min(0, { message: 'Sort order must be non-negative' })
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 0))
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Additional metadata for the category',
    example: {
      color: '#FF5722',
      icon: 'electronics-icon',
      seoKeywords: ['electronics', 'gadgets', 'technology'],
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
