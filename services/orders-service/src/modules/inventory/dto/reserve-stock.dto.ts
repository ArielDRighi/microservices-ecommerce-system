import { IsString, IsUUID, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class ReserveStockDto {
  @ApiProperty({
    description: 'Product ID to reserve stock for',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsUUID('4', { message: 'Product ID must be a valid UUID' })
  productId!: string;

  @ApiProperty({
    description: 'Quantity to reserve',
    example: 3,
    minimum: 1,
  })
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  @Transform(({ value }) => parseInt(value, 10))
  quantity!: number;

  @ApiProperty({
    description: 'Unique reservation ID for tracking',
    example: 'res_1234567890',
  })
  @IsString({ message: 'Reservation ID must be a string' })
  reservationId!: string;

  @ApiPropertyOptional({
    description: 'Location/warehouse to reserve stock from',
    example: 'MAIN_WAREHOUSE',
    default: 'MAIN_WAREHOUSE',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Reason for reservation',
    example: 'Order processing',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Reference ID (e.g., order ID)',
    example: 'order_1234567890',
  })
  @IsOptional()
  @IsString()
  referenceId?: string;

  @ApiPropertyOptional({
    description: 'TTL for reservation in minutes',
    example: 30,
    default: 30,
  })
  @IsOptional()
  @IsInt({ message: 'TTL must be an integer' })
  @Min(1, { message: 'TTL must be at least 1 minute' })
  @Transform(({ value }) => parseInt(value, 10))
  ttlMinutes?: number;
}
