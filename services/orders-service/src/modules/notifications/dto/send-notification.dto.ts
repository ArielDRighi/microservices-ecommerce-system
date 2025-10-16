import { IsString, IsUUID, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendOrderConfirmationDto {
  @ApiProperty({ description: 'Order ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  orderId: string;

  @ApiProperty({ description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ description: 'Additional data' })
  @IsOptional()
  @IsObject()
  additionalData?: Record<string, unknown>;
}

export class SendPaymentFailureDto {
  @ApiProperty({ description: 'Order ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  orderId: string;

  @ApiProperty({ description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Failure reason', example: 'Insufficient funds' })
  @IsString()
  reason: string;
}

export class SendShippingUpdateDto {
  @ApiProperty({ description: 'Order ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  orderId: string;

  @ApiProperty({ description: 'Tracking number', example: 'TRACK123456789' })
  @IsString()
  trackingNumber: string;

  @ApiPropertyOptional({ description: 'User ID' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class SendWelcomeEmailDto {
  @ApiProperty({ description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ description: 'User name', example: 'John Doe' })
  @IsOptional()
  @IsString()
  userName?: string;
}
