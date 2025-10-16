import { IsString } from 'class-validator';

export class SendPaymentFailureDto {
  @IsString()
  orderId: string;

  @IsString()
  orderNumber: string;

  @IsString()
  reason: string;
}
