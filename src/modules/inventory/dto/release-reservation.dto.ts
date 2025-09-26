import { IsUUID, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class ReleaseReservationDto {
  @ApiProperty({
    description: 'Product ID to release reservation for',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsUUID('4', { message: 'Product ID must be a valid UUID' })
  productId!: string;

  @ApiProperty({
    description: 'Quantity to release from reservation',
    example: 2,
    minimum: 1,
  })
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  @Transform(({ value }) => parseInt(value, 10))
  quantity!: number;

  @ApiProperty({
    description: 'Reservation ID to release',
    example: 'res_1234567890',
  })
  @IsString({ message: 'Reservation ID must be a string' })
  reservationId!: string;

  @ApiPropertyOptional({
    description: 'Location/warehouse to release reservation from',
    example: 'MAIN_WAREHOUSE',
    default: 'MAIN_WAREHOUSE',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Reason for releasing reservation',
    example: 'Order cancelled',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
