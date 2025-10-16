import { IsString, IsUUID, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CheckStockDto {
  @ApiProperty({
    description: 'Product ID to check stock for',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsUUID('4', { message: 'Product ID must be a valid UUID' })
  productId!: string;

  @ApiProperty({
    description: 'Quantity to check availability for',
    example: 5,
    minimum: 1,
  })
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  @Transform(({ value }) => parseInt(value, 10))
  quantity!: number;

  @ApiPropertyOptional({
    description: 'Location/warehouse to check stock in',
    example: 'MAIN_WAREHOUSE',
    default: 'MAIN_WAREHOUSE',
  })
  @IsOptional()
  @IsString()
  location?: string;
}
