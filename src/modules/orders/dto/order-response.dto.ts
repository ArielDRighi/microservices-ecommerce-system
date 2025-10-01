import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../enums/order-status.enum';

/**
 * DTO for order item in responses
 */
export class OrderItemResponseDto {
  @ApiProperty({
    description: 'Order item ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Product ID',
    example: '987e6543-e89b-12d3-a456-426614174999',
  })
  productId: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Laptop Gaming',
  })
  productName: string;

  @ApiProperty({
    description: 'Quantity ordered',
    example: 2,
  })
  quantity: number;

  @ApiProperty({
    description: 'Unit price at time of order',
    example: 1299.99,
  })
  unitPrice: number;

  @ApiProperty({
    description: 'Total price for this item (quantity × unitPrice)',
    example: 2599.98,
  })
  totalPrice: number;
}

/**
 * DTO for order responses
 * Used by GET /orders and POST /orders endpoints
 */
export class OrderResponseDto {
  @ApiProperty({
    description: 'Order ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User ID who placed the order',
    example: '987e6543-e89b-12d3-a456-426614174999',
  })
  userId: string;

  @ApiProperty({
    description: 'Order status',
    enum: OrderStatus,
    example: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @ApiProperty({
    description: 'Total amount of the order',
    example: 2649.97,
  })
  totalAmount: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'USD',
  })
  currency: string;

  @ApiProperty({
    description: 'Order items',
    type: [OrderItemResponseDto],
  })
  items: OrderItemResponseDto[];

  @ApiProperty({
    description: 'Idempotency key for duplicate prevention',
    example: 'order-2025-10-01-user-123-abc',
  })
  idempotencyKey: string;

  @ApiProperty({
    description: 'Order creation timestamp',
    example: '2025-10-01T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Order last update timestamp',
    example: '2025-10-01T10:30:00.000Z',
  })
  updatedAt: Date;
}

/**
 * DTO for order status only response
 * Used by GET /orders/:id/status endpoint
 */
export class OrderStatusResponseDto {
  @ApiProperty({
    description: 'Order ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  orderId: string;

  @ApiProperty({
    description: 'Current order status',
    enum: OrderStatus,
    example: OrderStatus.PROCESSING,
  })
  status: OrderStatus;
}
