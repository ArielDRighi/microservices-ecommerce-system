import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max, IsIn, IsNumber, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ProductQueryDto {
  @ApiPropertyOptional({
    description: 'Search term for filtering products by name, description, or tags',
    example: 'wireless headphones',
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'Search term must be a string' })
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by product category',
    example: 'Electronics',
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'Category must be a string' })
  @Transform(({ value }) => value?.trim())
  category?: string;

  @ApiPropertyOptional({
    description: 'Filter by product brand',
    example: 'AudioTech',
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'Brand must be a string' })
  @Transform(({ value }) => value?.trim())
  brand?: string;

  @ApiPropertyOptional({
    description: 'Filter by product status',
    example: 'active',
    enum: ['active', 'inactive', 'all'],
    default: 'active',
  })
  @IsOptional()
  @IsString({ message: 'Status must be a string' })
  @IsIn(['active', 'inactive', 'all'], {
    message: 'Status must be either active, inactive, or all',
  })
  status?: 'active' | 'inactive' | 'all' = 'active';

  @ApiPropertyOptional({
    description: 'Minimum price filter',
    example: 50.0,
    type: Number,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Minimum price must be a valid number' })
  @Min(0, { message: 'Minimum price cannot be negative' })
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Maximum price filter',
    example: 500.0,
    type: Number,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Maximum price must be a valid number' })
  @Min(0, { message: 'Maximum price cannot be negative' })
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Filter products on sale only',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: 'onSale must be a boolean value' })
  onSale?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by specific tags (comma-separated)',
    example: 'wireless,bluetooth,premium',
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'Tags must be a string' })
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean)
      : value,
  )
  tags?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination (starts from 1)',
    example: 1,
    type: Number,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    type: Number,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must not exceed 100' })
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt',
    enum: [
      'name',
      'price',
      'createdAt',
      'updatedAt',
      'category',
      'brand',
      'sku',
      'popularity',
      'discountPercentage',
    ],
    default: 'createdAt',
  })
  @IsOptional()
  @IsString({ message: 'Sort by must be a string' })
  @IsIn(
    [
      'name',
      'price',
      'createdAt',
      'updatedAt',
      'category',
      'brand',
      'sku',
      'popularity',
      'discountPercentage',
    ],
    {
      message: 'Invalid sort field',
    },
  )
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsString({ message: 'Sort order must be a string' })
  @IsIn(['ASC', 'DESC'], {
    message: 'Sort order must be either ASC or DESC',
  })
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({
    description: 'Include soft deleted products',
    example: false,
    type: Boolean,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: 'includeDeleted must be a boolean value' })
  includeDeleted?: boolean = false;
}
