import { ApiProperty } from '@nestjs/swagger';

export enum ReservationStatus {
  ACTIVE = 'ACTIVE',
  RELEASED = 'RELEASED',
  FULFILLED = 'FULFILLED',
  EXPIRED = 'EXPIRED',
}

export class ReservationDetailsDto {
  @ApiProperty({
    description: 'Unique reservation identifier',
    example: 'res-1760285000-abc123',
  })
  reservationId!: string;

  @ApiProperty({
    description: 'Product ID for this reservation',
    example: 'a21ba620-1020-4611-9b54-200811f2448f',
  })
  productId!: string;

  @ApiProperty({
    description: 'Inventory ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  inventoryId!: string;

  @ApiProperty({
    description: 'Reserved quantity',
    example: 5,
  })
  quantity!: number;

  @ApiProperty({
    description: 'Current reservation status',
    enum: ReservationStatus,
    example: ReservationStatus.ACTIVE,
  })
  status!: ReservationStatus;

  @ApiProperty({
    description: 'Expiration timestamp (ISO 8601)',
    example: '2025-10-12T17:30:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  expiresAt!: Date;

  @ApiProperty({
    description: 'Seconds remaining until expiration (negative if expired)',
    example: 1800,
  })
  ttlSeconds!: number;

  @ApiProperty({
    description: 'Whether reservation has expired',
    example: false,
  })
  isExpired!: boolean;

  @ApiProperty({
    description: 'Whether reservation can be released',
    example: true,
  })
  canBeReleased!: boolean;

  @ApiProperty({
    description: 'Whether reservation can be fulfilled',
    example: true,
  })
  canBeFulfilled!: boolean;

  @ApiProperty({
    description: 'Reservation creation timestamp',
    example: '2025-10-12T16:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Order ID associated with this reservation',
    example: 'ord-123456',
    required: false,
  })
  orderId?: string;

  @ApiProperty({
    description: 'Reason for reservation',
    example: 'Order checkout',
    required: false,
  })
  reason?: string;

  @ApiProperty({
    description: 'Storage location',
    example: 'MAIN_WAREHOUSE',
    required: false,
  })
  location?: string;
}
