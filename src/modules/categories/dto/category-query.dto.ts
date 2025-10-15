import {
  IsOptional,
  IsBoolean,
  IsUUID,
  IsString,
  IsInt,
  Min,
  Max,
  IsIn,
  ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class CategoryQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
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
    description: 'Search term for category name and description',
    example: 'electronics',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({
    description:
      'Filter by parent category ID. Use "null" (as string) for root categories only, or provide a valid UUID to get subcategories of a specific parent. Leave empty to get all categories.',
    example: 'null',
  })
  @IsOptional()
  @Transform(({ value }) => {
    // Allow "null" string to filter root categories
    if (value === 'null' || value === null) return null;
    return value;
  })
  @ValidateIf((obj) => obj.parentId !== null)
  @IsUUID(4, { message: 'Parent ID must be a valid UUID' })
  parentId?: string | null;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Include inactive categories in results',
    example: false,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return false;
  })
  @IsBoolean()
  includeInactive?: boolean = false;

  @ApiPropertyOptional({
    description: 'Include deleted categories in results (admin only)',
    example: false,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return false;
  })
  @IsBoolean()
  includeDeleted?: boolean = false;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'sortOrder',
    enum: ['name', 'createdAt', 'updatedAt', 'sortOrder'],
    default: 'sortOrder',
  })
  @IsOptional()
  @IsString()
  @IsIn(['name', 'createdAt', 'updatedAt', 'sortOrder'], {
    message: 'Sort by must be one of: name, createdAt, updatedAt, sortOrder',
  })
  sortBy?: string = 'sortOrder';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'ASC',
    enum: ['ASC', 'DESC'],
    default: 'ASC',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toUpperCase())
  @IsIn(['ASC', 'DESC'], {
    message: 'Sort order must be ASC or DESC',
  })
  sortOrder?: 'ASC' | 'DESC' = 'ASC';

  @ApiPropertyOptional({
    description: 'Include product count for each category',
    example: false,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return false;
  })
  @IsBoolean()
  includeProductCount?: boolean = false;

  @ApiPropertyOptional({
    description: 'Maximum depth for hierarchical queries (0 for flat list)',
    example: 2,
    minimum: 0,
    maximum: 10,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Max depth must be an integer' })
  @Min(0, { message: 'Max depth must be non-negative' })
  @Max(10, { message: 'Max depth must not exceed 10' })
  maxDepth?: number = 0;
}
