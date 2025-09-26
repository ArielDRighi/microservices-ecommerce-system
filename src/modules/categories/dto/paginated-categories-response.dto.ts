import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CategoryResponseDto } from './category-response.dto';

class PaginationMetaDto {
  @ApiProperty({ description: 'Total number of items', example: 100 })
  @Expose()
  total: number;

  @ApiProperty({ description: 'Current page number', example: 1 })
  @Expose()
  page: number;

  @ApiProperty({ description: 'Number of items per page', example: 10 })
  @Expose()
  limit: number;

  @ApiProperty({ description: 'Total number of pages', example: 10 })
  @Expose()
  totalPages: number;

  @ApiProperty({ description: 'Whether there is a next page', example: true })
  @Expose()
  hasNext: boolean;

  @ApiProperty({ description: 'Whether there is a previous page', example: false })
  @Expose()
  hasPrev: boolean;
}

export class PaginatedCategoriesResponseDto {
  @ApiProperty({
    description: 'Array of categories',
    type: [CategoryResponseDto],
  })
  @Expose()
  @Type(() => CategoryResponseDto)
  data: CategoryResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaDto,
  })
  @Expose()
  @Type(() => PaginationMetaDto)
  meta: PaginationMetaDto;
}
