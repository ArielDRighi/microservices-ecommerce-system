import { IsUUID, IsString, IsInt, IsOptional, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateInventoryDto {
  @ApiProperty({
    description: 'Product ID to create inventory for',
    example: 'a21ba620-1020-4611-9b54-200811f2448f',
  })
  @IsUUID('4', { message: 'Product ID must be a valid UUID' })
  productId!: string;

  @ApiProperty({
    description: 'Product SKU for reference',
    example: 'LAP-GAMING-001',
    maxLength: 100,
  })
  @IsString({ message: 'SKU must be a string' })
  @MaxLength(100, { message: 'SKU must not exceed 100 characters' })
  sku!: string;

  @ApiPropertyOptional({
    description: 'Warehouse or storage location',
    example: 'MAIN_WAREHOUSE',
    default: 'MAIN_WAREHOUSE',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Location must be a string' })
  @MaxLength(100, { message: 'Location must not exceed 100 characters' })
  location?: string;

  @ApiProperty({
    description: 'Initial stock quantity',
    example: 100,
    minimum: 0,
  })
  @IsInt({ message: 'Initial stock must be an integer' })
  @Min(0, { message: 'Initial stock must be at least 0' })
  @Transform(({ value }) => parseInt(value, 10))
  initialStock!: number;

  @ApiPropertyOptional({
    description: 'Minimum stock level before reorder alert',
    example: 10,
    minimum: 0,
    default: 10,
  })
  @IsOptional()
  @IsInt({ message: 'Minimum stock must be an integer' })
  @Min(0, { message: 'Minimum stock must be at least 0' })
  @Transform(({ value }) => parseInt(value, 10))
  minimumStock?: number;

  @ApiPropertyOptional({
    description: 'Maximum stock capacity',
    example: 1000,
    minimum: 0,
  })
  @IsOptional()
  @IsInt({ message: 'Maximum stock must be an integer' })
  @Min(0, { message: 'Maximum stock must be at least 0' })
  @Transform(({ value }) => parseInt(value, 10))
  maximumStock?: number;

  @ApiPropertyOptional({
    description: 'Stock level to trigger reorder',
    example: 20,
    minimum: 0,
  })
  @IsOptional()
  @IsInt({ message: 'Reorder point must be an integer' })
  @Min(0, { message: 'Reorder point must be at least 0' })
  @Transform(({ value }) => parseInt(value, 10))
  reorderPoint?: number;

  @ApiPropertyOptional({
    description: 'Quantity to reorder when stock reaches reorder point',
    example: 50,
    minimum: 1,
  })
  @IsOptional()
  @IsInt({ message: 'Reorder quantity must be an integer' })
  @Min(1, { message: 'Reorder quantity must be at least 1' })
  @Transform(({ value }) => parseInt(value, 10))
  reorderQuantity?: number;

  @ApiPropertyOptional({
    description: 'Additional notes about this inventory',
    example: 'Initial inventory setup for new product line',
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes?: string;
}
