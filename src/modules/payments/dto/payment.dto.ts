import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  DIGITAL_WALLET = 'DIGITAL_WALLET',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export class ProcessPaymentDto {
  @ApiProperty({ description: 'Order ID' })
  @IsString()
  orderId!: string;

  @ApiProperty({ description: 'Amount to charge', minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ description: 'Currency code', default: 'USD' })
  @IsString()
  currency!: string;

  @ApiProperty({ enum: PaymentMethod, description: 'Payment method' })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({ description: 'Customer ID' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Idempotency key for payment' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class PaymentResponseDto {
  @ApiProperty({ description: 'Payment ID' })
  paymentId!: string;

  @ApiProperty({ description: 'Transaction ID from payment provider' })
  transactionId!: string;

  @ApiProperty({ enum: PaymentStatus, description: 'Payment status' })
  status!: PaymentStatus;

  @ApiProperty({ description: 'Order ID' })
  orderId!: string;

  @ApiProperty({ description: 'Amount charged' })
  amount!: number;

  @ApiProperty({ description: 'Currency' })
  currency!: string;

  @ApiProperty({ description: 'Payment method used' })
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({ description: 'Failure reason if payment failed' })
  failureReason?: string;

  @ApiPropertyOptional({ description: 'Failure code if payment failed' })
  failureCode?: string;

  @ApiProperty({ description: 'Timestamp when payment was created' })
  createdAt!: Date;

  @ApiPropertyOptional({ description: 'Timestamp when payment was processed' })
  processedAt?: Date;
}

export class RefundPaymentDto {
  @ApiProperty({ description: 'Payment ID to refund' })
  @IsString()
  paymentId!: string;

  @ApiProperty({ description: 'Amount to refund', minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({ description: 'Reason for refund' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RefundResponseDto {
  @ApiProperty({ description: 'Refund ID' })
  refundId!: string;

  @ApiProperty({ description: 'Original payment ID' })
  paymentId!: string;

  @ApiProperty({ description: 'Amount refunded' })
  amount!: number;

  @ApiProperty({ description: 'Currency' })
  currency!: string;

  @ApiProperty({ enum: PaymentStatus, description: 'Refund status' })
  status!: PaymentStatus;

  @ApiPropertyOptional({ description: 'Reason for refund' })
  reason?: string;

  @ApiProperty({ description: 'Timestamp when refund was created' })
  createdAt!: Date;
}
