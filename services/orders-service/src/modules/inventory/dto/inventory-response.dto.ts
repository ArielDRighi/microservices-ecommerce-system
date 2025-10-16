import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InventoryStockDto {
  @ApiProperty({
    description: 'Product ID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  productId!: string;

  @ApiProperty({
    description: 'Physical stock quantity in warehouse',
    example: 100,
  })
  physicalStock!: number;

  @ApiProperty({
    description: 'Reserved stock quantity (temporarily held)',
    example: 5,
  })
  reservedStock!: number;

  @ApiProperty({
    description: 'Available stock for new orders',
    example: 95,
  })
  availableStock!: number;

  @ApiProperty({
    description: 'Minimum stock level threshold',
    example: 10,
  })
  minimumStock!: number;

  @ApiProperty({
    description: 'Maximum stock level threshold',
    example: 500,
  })
  maximumStock!: number;

  @ApiProperty({
    description: 'Reorder point threshold',
    example: 15,
  })
  reorderPoint!: number;

  @ApiPropertyOptional({
    description: 'Location/warehouse identifier',
    example: 'MAIN_WAREHOUSE',
  })
  location?: string;

  @ApiPropertyOptional({
    description: 'Last stock update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  lastUpdated?: Date;

  @ApiPropertyOptional({
    description: 'Stock status indicator',
    example: 'IN_STOCK',
    enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'DISCONTINUED'],
  })
  status?: string;
}

export class InventoryResponseDto extends InventoryStockDto {
  @ApiProperty({
    description: 'Inventory record ID',
    example: 'inv_f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  id!: string;

  @ApiProperty({
    description: 'Product information',
    type: 'object',
  })
  product?: {
    id: string;
    name: string;
    sku: string;
    category?: string;
  };

  @ApiPropertyOptional({
    description: 'Inventory movements history count',
    example: 15,
  })
  movementsCount?: number;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt!: Date;
}

export class ReservationResponseDto {
  @ApiProperty({
    description: 'Reservation ID',
    example: 'res_1234567890',
  })
  reservationId!: string;

  @ApiProperty({
    description: 'Product ID',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  productId!: string;

  @ApiProperty({
    description: 'Reserved quantity',
    example: 2,
  })
  quantity!: number;

  @ApiProperty({
    description: 'Reservation expiry timestamp',
    example: '2024-01-15T11:30:00Z',
  })
  expiresAt!: Date;

  @ApiPropertyOptional({
    description: 'Location/warehouse',
    example: 'MAIN_WAREHOUSE',
  })
  location?: string;

  @ApiPropertyOptional({
    description: 'Reference information',
    example: 'cart_abc123',
  })
  reference?: string;

  @ApiProperty({
    description: 'Reservation creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Reservation status',
    example: 'ACTIVE',
    enum: ['ACTIVE', 'EXPIRED', 'FULFILLED', 'CANCELLED'],
  })
  status!: string;
}
