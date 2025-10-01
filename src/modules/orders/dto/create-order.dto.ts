import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderItemDto } from './order-item.dto';

/**
 * DTO for creating a new order
 * Used by POST /orders endpoint
 */
export class CreateOrderDto {
  @ApiProperty({
    description: 'Array of order items (products and quantities)',
    type: [OrderItemDto],
    example: [
      { productId: '123e4567-e89b-12d3-a456-426614174000', quantity: 2 },
      { productId: '987e6543-e89b-12d3-a456-426614174999', quantity: 1 },
    ],
  })
  @IsArray({ message: 'Items must be an array' })
  @ArrayMinSize(1, { message: 'At least one item is required' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional({
    description:
      'Optional idempotency key to prevent duplicate orders. If not provided, one will be generated automatically.',
    example: 'order-2025-10-01-user-123-abc',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Idempotency key is too long' })
  idempotencyKey?: string;
}
