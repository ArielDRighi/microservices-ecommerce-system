import { IsString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  price: number;
}

export class SendOrderConfirmationDto {
  @IsString()
  orderId: string;

  @IsString()
  orderNumber: string;

  @IsNumber()
  totalAmount: number;

  @IsString()
  currency: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
