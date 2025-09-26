import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  @Transform(({ value }) => parseInt(value, 10) || 1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  @Transform(({ value }) => parseInt(value, 10) || 20)
  limit?: number = 20;
}

export class InventoryQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by product ID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({
    description: 'Filter by location/warehouse',
    example: 'MAIN_WAREHOUSE',
  })
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({
    description: 'Filter by stock status',
    example: 'LOW_STOCK',
    enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'DISCONTINUED'],
  })
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by minimum available stock',
    example: 10,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Minimum stock must be an integer' })
  @Min(0, { message: 'Minimum stock cannot be negative' })
  minStock?: number;

  @ApiPropertyOptional({
    description: 'Filter by maximum available stock',
    example: 1000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Maximum stock must be an integer' })
  @Min(0, { message: 'Maximum stock cannot be negative' })
  maxStock?: number;

  @ApiPropertyOptional({
    description: 'Search by product name or SKU',
    example: 'iPhone',
  })
  @IsOptional()
  search?: string;
}

export class PaginatedResponseDto<T> {
  @ApiPropertyOptional({
    description: 'Array of items',
  })
  data!: T[];

  @ApiPropertyOptional({
    description: 'Pagination metadata',
  })
  meta!: {
    currentPage: number;
    itemsPerPage: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
