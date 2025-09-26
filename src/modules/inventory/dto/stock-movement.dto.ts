import { IsUUID, IsInt, IsOptional, IsString, IsEnum, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { InventoryMovementType } from '../enums/inventory-movement-type.enum';

export class StockMovementDto {
  @ApiProperty({
    description: 'Inventory ID for the movement',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsUUID('4', { message: 'Inventory ID must be a valid UUID' })
  inventoryId!: string;

  @ApiProperty({
    description: 'Type of inventory movement',
    enum: InventoryMovementType,
    example: InventoryMovementType.RESTOCK,
  })
  @IsEnum(InventoryMovementType, { message: 'Invalid movement type' })
  movementType!: InventoryMovementType;

  @ApiProperty({
    description: 'Quantity for movement (positive for additions, negative for removals)',
    example: 10,
  })
  @IsInt({ message: 'Quantity must be an integer' })
  @Transform(({ value }) => parseInt(value, 10))
  quantity!: number;

  @ApiPropertyOptional({
    description: 'Unit cost for the movement',
    example: 25.99,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Unit cost must be a valid number with up to 2 decimal places' },
  )
  @Min(0, { message: 'Unit cost must be greater than 0' })
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  unitCost?: number;

  @ApiPropertyOptional({
    description: 'Reference ID for tracking (order, purchase, etc.)',
    example: 'order_1234567890',
  })
  @IsOptional()
  @IsString()
  referenceId?: string;

  @ApiPropertyOptional({
    description: 'Type of reference',
    example: 'ORDER',
  })
  @IsOptional()
  @IsString()
  referenceType?: string;

  @ApiPropertyOptional({
    description: 'Reason for the movement',
    example: 'Restock from supplier',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'User or system that performed the movement',
    example: 'admin@example.com',
  })
  @IsOptional()
  @IsString()
  performedBy?: string;
}
