import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ProductResponseDto {
  @ApiProperty({
    description: 'Product unique identifier',
    example: 'uuid-v4-string',
    type: String,
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Premium Wireless Headphones',
    type: String,
  })
  @Expose()
  name: string;

  @ApiPropertyOptional({
    description: 'Product description',
    example: 'High-quality wireless headphones with noise cancellation and premium sound quality',
    type: String,
  })
  @Expose()
  description?: string;

  @ApiProperty({
    description: 'Product price in USD',
    example: 299.99,
    type: Number,
  })
  @Expose()
  price: number;

  @ApiProperty({
    description: 'Product SKU (Stock Keeping Unit)',
    example: 'PWH-001-BLK',
    type: String,
  })
  @Expose()
  sku: string;

  @ApiProperty({
    description: 'Whether the product is active/visible',
    example: true,
    type: Boolean,
  })
  @Expose()
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Product category',
    example: 'Electronics',
    type: String,
  })
  @Expose()
  category?: string;

  @ApiPropertyOptional({
    description: 'Product brand',
    example: 'AudioTech',
    type: String,
  })
  @Expose()
  brand?: string;

  @ApiPropertyOptional({
    description: 'Product weight in kilograms',
    example: 0.85,
    type: Number,
  })
  @Expose()
  weight?: number;

  @ApiPropertyOptional({
    description: 'Additional product attributes and metadata',
    example: { color: 'Black', connectivity: 'Bluetooth 5.0', batteryLife: '30 hours' },
    type: 'object',
  })
  @Expose()
  attributes?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Array of product image URLs',
    example: [
      'https://example.com/images/headphones-front.jpg',
      'https://example.com/images/headphones-side.jpg',
    ],
    type: [String],
  })
  @Expose()
  images?: string[];

  @ApiPropertyOptional({
    description: 'Search tags for the product',
    example: ['wireless', 'bluetooth', 'headphones', 'audio', 'premium'],
    type: [String],
  })
  @Expose()
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Cost price for margin calculations',
    example: 150.0,
    type: Number,
  })
  @Expose()
  costPrice?: number;

  @ApiPropertyOptional({
    description: 'Original price for discount calculations',
    example: 399.99,
    type: Number,
  })
  @Expose()
  compareAtPrice?: number;

  @ApiProperty({
    description: 'Whether to track inventory for this product',
    example: true,
    type: Boolean,
  })
  @Expose()
  trackInventory: boolean;

  @ApiProperty({
    description: 'Minimum stock level for low stock alerts',
    example: 5,
    type: Number,
  })
  @Expose()
  minimumStock: number;

  @ApiProperty({
    description: 'Whether the product is currently on sale',
    example: true,
    type: Boolean,
  })
  @Expose()
  isOnSale: boolean;

  @ApiPropertyOptional({
    description: 'Discount percentage if on sale',
    example: 25,
    type: Number,
  })
  @Expose()
  discountPercentage?: number;

  @ApiPropertyOptional({
    description: 'Profit margin percentage',
    example: 50,
    type: Number,
  })
  @Expose()
  profitMargin?: number;

  @ApiProperty({
    description: 'Product creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
    type: Date,
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'Product last update timestamp',
    example: '2024-01-01T00:00:00.000Z',
    type: Date,
  })
  @Expose()
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Product deletion timestamp (for soft deletes)',
    example: '2024-01-01T00:00:00.000Z',
    type: Date,
    nullable: true,
  })
  @Expose()
  deletedAt?: Date;
}
