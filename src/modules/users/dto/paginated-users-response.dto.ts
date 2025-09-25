import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';

export class PaginatedUsersResponseDto {
  @ApiProperty({
    description: 'Array of users',
    type: [UserResponseDto],
  })
  data: UserResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: Object,
    properties: {
      total: {
        type: 'number',
        description: 'Total number of users',
        example: 100,
      },
      page: {
        type: 'number',
        description: 'Current page number',
        example: 1,
      },
      limit: {
        type: 'number',
        description: 'Number of items per page',
        example: 10,
      },
      totalPages: {
        type: 'number',
        description: 'Total number of pages',
        example: 10,
      },
      hasNext: {
        type: 'boolean',
        description: 'Whether there are more pages',
        example: true,
      },
      hasPrev: {
        type: 'boolean',
        description: 'Whether there are previous pages',
        example: false,
      },
    },
  })
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
