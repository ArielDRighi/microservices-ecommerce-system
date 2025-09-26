import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUrl,
  Min,
  Max,
  MaxLength,
  MinLength,
  Matches,
  IsPositive,
  ArrayMaxSize,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({
    description: 'Product name',
    example: 'Premium Wireless Headphones',
    type: String,
    minLength: 2,
    maxLength: 255,
  })
  @IsString({ message: 'Product name must be a string' })
  @IsNotEmpty({ message: 'Product name is required' })
  @MinLength(2, { message: 'Product name must be at least 2 characters long' })
  @MaxLength(255, { message: 'Product name must not exceed 255 characters' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({
    description: 'Product description',
    example: 'High-quality wireless headphones with noise cancellation and premium sound quality',
    type: String,
    maxLength: 2000,
  })
  @IsOptional()
  @IsString({ message: 'Product description must be a string' })
  @MaxLength(2000, { message: 'Product description must not exceed 2000 characters' })
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiProperty({
    description: 'Product price in USD',
    example: 299.99,
    type: Number,
    minimum: 0.01,
    maximum: 999999.99,
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Price must be a valid number with up to 2 decimal places' },
  )
  @IsPositive({ message: 'Price must be greater than 0' })
  @Min(0.01, { message: 'Price must be at least $0.01' })
  @Max(999999.99, { message: 'Price must not exceed $999,999.99' })
  price: number;

  @ApiProperty({
    description: 'Product SKU (Stock Keeping Unit) - must be unique',
    example: 'PWH-001-BLK',
    type: String,
    minLength: 3,
    maxLength: 100,
  })
  @IsString({ message: 'SKU must be a string' })
  @IsNotEmpty({ message: 'SKU is required' })
  @MinLength(3, { message: 'SKU must be at least 3 characters long' })
  @MaxLength(100, { message: 'SKU must not exceed 100 characters' })
  @Matches(/^[A-Z0-9\-_]+$/, {
    message: 'SKU can only contain uppercase letters, numbers, hyphens, and underscores',
  })
  @Transform(({ value }) => value?.toUpperCase()?.trim())
  sku: string;

  @ApiPropertyOptional({
    description: 'Product brand',
    example: 'AudioTech',
    type: String,
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Brand must be a string' })
  @MaxLength(50, { message: 'Brand must not exceed 50 characters' })
  @Transform(({ value }) => value?.trim())
  brand?: string;

  @ApiPropertyOptional({
    description: 'Product weight in kilograms',
    example: 0.85,
    type: Number,
    minimum: 0,
    maximum: 999.999,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 3 },
    { message: 'Weight must be a valid number with up to 3 decimal places' },
  )
  @Min(0, { message: 'Weight cannot be negative' })
  @Max(999.999, { message: 'Weight must not exceed 999.999 kg' })
  weight?: number;

  @ApiPropertyOptional({
    description: 'Additional product attributes and metadata',
    example: { color: 'Black', connectivity: 'Bluetooth 5.0', batteryLife: '30 hours' },
    type: 'object',
  })
  @IsOptional()
  attributes?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Array of product image URLs',
    example: [
      'https://example.com/images/headphones-front.jpg',
      'https://example.com/images/headphones-side.jpg',
    ],
    type: [String],
    maxItems: 10,
  })
  @IsOptional()
  @IsArray({ message: 'Images must be an array' })
  @ArrayMaxSize(10, { message: 'Maximum 10 images allowed' })
  @IsString({ each: true, message: 'Each image must be a valid URL string' })
  @IsUrl({}, { each: true, message: 'Each image must be a valid URL' })
  images?: string[];

  @ApiPropertyOptional({
    description: 'Search tags for the product',
    example: ['wireless', 'bluetooth', 'headphones', 'audio', 'premium'],
    type: [String],
    maxItems: 20,
  })
  @IsOptional()
  @IsArray({ message: 'Tags must be an array' })
  @ArrayMaxSize(20, { message: 'Maximum 20 tags allowed' })
  @IsString({ each: true, message: 'Each tag must be a string' })
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((tag) => tag?.toLowerCase()?.trim()).filter(Boolean) : value,
  )
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Cost price for margin calculations',
    example: 150.0,
    type: Number,
    minimum: 0,
    maximum: 999999.99,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Cost price must be a valid number with up to 2 decimal places' },
  )
  @Min(0, { message: 'Cost price cannot be negative' })
  @Max(999999.99, { message: 'Cost price must not exceed $999,999.99' })
  costPrice?: number;

  @ApiPropertyOptional({
    description: 'Original price for discount calculations',
    example: 399.99,
    type: Number,
    minimum: 0.01,
    maximum: 999999.99,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Compare at price must be a valid number with up to 2 decimal places' },
  )
  @IsPositive({ message: 'Compare at price must be greater than 0' })
  @Min(0.01, { message: 'Compare at price must be at least $0.01' })
  @Max(999999.99, { message: 'Compare at price must not exceed $999,999.99' })
  compareAtPrice?: number;

  @ApiPropertyOptional({
    description: 'Whether the product is active/visible',
    example: true,
    type: Boolean,
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean value' })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to track inventory for this product',
    example: true,
    type: Boolean,
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'trackInventory must be a boolean value' })
  trackInventory?: boolean;

  @ApiPropertyOptional({
    description: 'Minimum stock level for low stock alerts',
    example: 5,
    type: Number,
    minimum: 0,
    maximum: 999999,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Minimum stock must be a valid number' })
  @Min(0, { message: 'Minimum stock cannot be negative' })
  @Max(999999, { message: 'Minimum stock must not exceed 999,999' })
  minimumStock?: number;
}
