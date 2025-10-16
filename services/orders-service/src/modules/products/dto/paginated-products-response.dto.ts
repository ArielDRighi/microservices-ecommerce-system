import { ApiProperty } from '@nestjs/swagger';
import { ProductResponseDto } from './product-response.dto';

class PaginationMetaDto {
  @ApiProperty({
    description: 'Total number of products',
    example: 150,
    type: Number,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
    type: Number,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    type: Number,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 15,
    type: Number,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
    type: Boolean,
  })
  hasNext: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
    type: Boolean,
  })
  hasPrev: boolean;
}

export class PaginatedProductsResponseDto {
  @ApiProperty({
    description: 'Array of products',
    type: [ProductResponseDto],
  })
  data: ProductResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;
}
