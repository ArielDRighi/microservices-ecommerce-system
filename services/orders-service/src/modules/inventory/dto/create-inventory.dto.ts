import { IsUUID, IsString, IsInt, IsOptional, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ParseInt } from '../../../common/decorators/parse-int.decorator';
import {
  DEFAULT_MINIMUM_STOCK,
  DEFAULT_WAREHOUSE_LOCATION,
} from '../constants/inventory.constants';

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
    example: DEFAULT_WAREHOUSE_LOCATION,
    default: DEFAULT_WAREHOUSE_LOCATION,
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
  @ParseInt()
  @IsInt({ message: 'Initial stock must be an integer' })
  @Min(0, { message: 'Initial stock must be at least 0' })
  initialStock!: number;

  @ApiPropertyOptional({
    description: 'Minimum stock level before reorder alert',
    example: DEFAULT_MINIMUM_STOCK,
    minimum: 0,
    default: DEFAULT_MINIMUM_STOCK,
  })
  @IsOptional()
  @ParseInt()
  @IsInt({ message: 'Minimum stock must be an integer' })
  @Min(0, { message: 'Minimum stock must be at least 0' })
  minimumStock?: number;

  @ApiPropertyOptional({
    description: 'Maximum stock capacity',
    example: 1000,
    minimum: 0,
  })
  @IsOptional()
  @ParseInt()
  @IsInt({ message: 'Maximum stock must be an integer' })
  @Min(0, { message: 'Maximum stock must be at least 0' })
  maximumStock?: number;

  @ApiPropertyOptional({
    description: 'Stock level to trigger reorder',
    example: 20,
    minimum: 0,
  })
  @IsOptional()
  @ParseInt()
  @IsInt({ message: 'Reorder point must be an integer' })
  @Min(0, { message: 'Reorder point must be at least 0' })
  reorderPoint?: number;

  @ApiPropertyOptional({
    description: 'Quantity to reorder when stock reaches reorder point',
    example: 50,
    minimum: 1,
  })
  @IsOptional()
  @ParseInt()
  @IsInt({ message: 'Reorder quantity must be an integer' })
  @Min(1, { message: 'Reorder quantity must be at least 1' })
  reorderQuantity?: number;

  @ApiPropertyOptional({
    description: 'Additional notes about this inventory',
    example: 'Initial inventory setup for new product line',
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes?: string;
}
