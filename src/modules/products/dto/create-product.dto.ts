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
import {
  PRODUCT_PRICE,
  PRODUCT_NAME,
  PRODUCT_DESCRIPTION,
  PRODUCT_SKU,
  PRODUCT_BRAND,
  PRODUCT_WEIGHT,
  PRODUCT_IMAGES,
  PRODUCT_TAGS,
  PRODUCT_STOCK,
} from '../constants/product-validation.constants';

export class CreateProductDto {
  @ApiProperty({
    description: 'Product name',
    example: 'Premium Wireless Headphones',
    type: String,
    minLength: PRODUCT_NAME.MIN_LENGTH,
    maxLength: PRODUCT_NAME.MAX_LENGTH,
  })
  @IsString({ message: 'Product name must be a string' })
  @IsNotEmpty({ message: 'Product name is required' })
  @MinLength(PRODUCT_NAME.MIN_LENGTH, {
    message: `Product name must be at least ${PRODUCT_NAME.MIN_LENGTH} characters long`,
  })
  @MaxLength(PRODUCT_NAME.MAX_LENGTH, {
    message: `Product name must not exceed ${PRODUCT_NAME.MAX_LENGTH} characters`,
  })
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({
    description: 'Product description',
    example: 'High-quality wireless headphones with noise cancellation and premium sound quality',
    type: String,
    maxLength: PRODUCT_DESCRIPTION.MAX_LENGTH,
  })
  @IsOptional()
  @IsString({ message: 'Product description must be a string' })
  @MaxLength(PRODUCT_DESCRIPTION.MAX_LENGTH, {
    message: `Product description must not exceed ${PRODUCT_DESCRIPTION.MAX_LENGTH} characters`,
  })
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiProperty({
    description: 'Product price in USD',
    example: 299.99,
    type: Number,
    minimum: PRODUCT_PRICE.MIN,
    maximum: PRODUCT_PRICE.MAX,
  })
  @IsNumber(
    { maxDecimalPlaces: PRODUCT_PRICE.DECIMAL_PLACES },
    {
      message: `Price must be a valid number with up to ${PRODUCT_PRICE.DECIMAL_PLACES} decimal places`,
    },
  )
  @IsPositive({ message: 'Price must be greater than 0' })
  @Min(PRODUCT_PRICE.MIN, { message: `Price must be at least $${PRODUCT_PRICE.MIN.toFixed(2)}` })
  @Max(PRODUCT_PRICE.MAX, {
    message: `Price must not exceed $${PRODUCT_PRICE.MAX.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
  })
  price: number;

  @ApiProperty({
    description: 'Product SKU (Stock Keeping Unit) - must be unique',
    example: 'PWH-001-BLK',
    type: String,
    minLength: PRODUCT_SKU.MIN_LENGTH,
    maxLength: PRODUCT_SKU.MAX_LENGTH,
  })
  @IsString({ message: 'SKU must be a string' })
  @IsNotEmpty({ message: 'SKU is required' })
  @MinLength(PRODUCT_SKU.MIN_LENGTH, {
    message: `SKU must be at least ${PRODUCT_SKU.MIN_LENGTH} characters long`,
  })
  @MaxLength(PRODUCT_SKU.MAX_LENGTH, {
    message: `SKU must not exceed ${PRODUCT_SKU.MAX_LENGTH} characters`,
  })
  @Matches(PRODUCT_SKU.PATTERN, {
    message: 'SKU can only contain uppercase letters, numbers, hyphens, and underscores',
  })
  @Transform(({ value }) => value?.toUpperCase()?.trim())
  sku: string;

  @ApiPropertyOptional({
    description: 'Product brand',
    example: 'AudioTech',
    type: String,
    maxLength: PRODUCT_BRAND.MAX_LENGTH,
  })
  @IsOptional()
  @IsString({ message: 'Brand must be a string' })
  @MaxLength(PRODUCT_BRAND.MAX_LENGTH, {
    message: `Brand must not exceed ${PRODUCT_BRAND.MAX_LENGTH} characters`,
  })
  @Transform(({ value }) => value?.trim())
  brand?: string;

  @ApiPropertyOptional({
    description: 'Product weight in kilograms',
    example: 0.85,
    type: Number,
    minimum: PRODUCT_WEIGHT.MIN,
    maximum: PRODUCT_WEIGHT.MAX,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: PRODUCT_WEIGHT.DECIMAL_PLACES },
    {
      message: `Weight must be a valid number with up to ${PRODUCT_WEIGHT.DECIMAL_PLACES} decimal places`,
    },
  )
  @Min(PRODUCT_WEIGHT.MIN, { message: 'Weight cannot be negative' })
  @Max(PRODUCT_WEIGHT.MAX, { message: `Weight must not exceed ${PRODUCT_WEIGHT.MAX} kg` })
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
    maxItems: PRODUCT_IMAGES.MAX_COUNT,
  })
  @IsOptional()
  @IsArray({ message: 'Images must be an array' })
  @ArrayMaxSize(PRODUCT_IMAGES.MAX_COUNT, {
    message: `Maximum ${PRODUCT_IMAGES.MAX_COUNT} images allowed`,
  })
  @IsString({ each: true, message: 'Each image must be a valid URL string' })
  @IsUrl({}, { each: true, message: 'Each image must be a valid URL' })
  images?: string[];

  @ApiPropertyOptional({
    description: 'Search tags for the product',
    example: ['wireless', 'bluetooth', 'headphones', 'audio', 'premium'],
    type: [String],
    maxItems: PRODUCT_TAGS.MAX_COUNT,
  })
  @IsOptional()
  @IsArray({ message: 'Tags must be an array' })
  @ArrayMaxSize(PRODUCT_TAGS.MAX_COUNT, {
    message: `Maximum ${PRODUCT_TAGS.MAX_COUNT} tags allowed`,
  })
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
    maximum: PRODUCT_PRICE.MAX,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: PRODUCT_PRICE.DECIMAL_PLACES },
    {
      message: `Cost price must be a valid number with up to ${PRODUCT_PRICE.DECIMAL_PLACES} decimal places`,
    },
  )
  @Min(0, { message: 'Cost price cannot be negative' })
  @Max(PRODUCT_PRICE.MAX, {
    message: `Cost price must not exceed $${PRODUCT_PRICE.MAX.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
  })
  costPrice?: number;

  @ApiPropertyOptional({
    description: 'Original price for discount calculations',
    example: 399.99,
    type: Number,
    minimum: PRODUCT_PRICE.MIN,
    maximum: PRODUCT_PRICE.MAX,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: PRODUCT_PRICE.DECIMAL_PLACES },
    {
      message: `Compare at price must be a valid number with up to ${PRODUCT_PRICE.DECIMAL_PLACES} decimal places`,
    },
  )
  @IsPositive({ message: 'Compare at price must be greater than 0' })
  @Min(PRODUCT_PRICE.MIN, {
    message: `Compare at price must be at least $${PRODUCT_PRICE.MIN.toFixed(2)}`,
  })
  @Max(PRODUCT_PRICE.MAX, {
    message: `Compare at price must not exceed $${PRODUCT_PRICE.MAX.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
  })
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
    maximum: PRODUCT_STOCK.MAX,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Minimum stock must be a valid number' })
  @Min(0, { message: 'Minimum stock cannot be negative' })
  @Max(PRODUCT_STOCK.MAX, {
    message: `Minimum stock must not exceed ${PRODUCT_STOCK.MAX.toLocaleString()}`,
  })
  minimumStock?: number;
}
