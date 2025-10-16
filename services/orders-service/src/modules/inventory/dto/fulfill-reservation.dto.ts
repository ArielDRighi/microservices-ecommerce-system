import { IsUUID, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class FulfillReservationDto {
  @ApiProperty({
    description: 'Product ID to fulfill reservation for',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsUUID('4', { message: 'Product ID must be a valid UUID' })
  productId!: string;

  @ApiProperty({
    description: 'Quantity to fulfill from reservation',
    example: 1,
    minimum: 1,
  })
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  @Transform(({ value }) => parseInt(value, 10))
  quantity!: number;

  @ApiProperty({
    description: 'Reservation ID to fulfill',
    example: 'res_1234567890',
  })
  @IsString({ message: 'Reservation ID must be a string' })
  reservationId!: string;

  @ApiPropertyOptional({
    description: 'Location/warehouse to fulfill reservation from',
    example: 'MAIN_WAREHOUSE',
    default: 'MAIN_WAREHOUSE',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    description: 'Order ID associated with fulfillment',
    example: 'ord_1234567890',
  })
  @IsString({ message: 'Order ID is required for fulfillment' })
  orderId!: string;

  @ApiPropertyOptional({
    description: 'Additional notes for fulfillment',
    example: 'Order #12345 - Express shipping',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
