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
    description:
      'Array of order items (products and quantities). Prices are calculated automatically from product database.',
    type: [OrderItemDto],
    example: [
      {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: 2,
      },
      {
        productId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        quantity: 1,
      },
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
    example: 'order-2025-10-11-user-john-doe-1234567890',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Idempotency key is too long' })
  idempotencyKey?: string;
}
