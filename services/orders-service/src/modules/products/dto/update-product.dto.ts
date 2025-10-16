import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(OmitType(CreateProductDto, ['sku'] as const)) {
  // All fields from CreateProductDto are optional except SKU (which should not be updated)
  // This provides type safety and automatic Swagger documentation
}
