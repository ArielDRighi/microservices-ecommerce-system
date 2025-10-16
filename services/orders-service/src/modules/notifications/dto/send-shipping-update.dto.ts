import { IsString } from 'class-validator';

export class SendShippingUpdateDto {
  @IsString()
  orderId: string;

  @IsString()
  orderNumber: string;

  @IsString()
  trackingNumber: string;

  @IsString()
  carrier: string;
}
