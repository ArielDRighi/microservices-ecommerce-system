import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from '../categories.controller';
import { CategoriesService } from '../categories.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import {
  CategoryResponseDto,
  CategoryTreeDto,
  PaginatedCategoriesResponseDto,
} from '../dto';

/**
 * Creates a mock CategoryResponseDto with optional overrides
 */
export function createMockCategoryResponseDto(
  overrides: Partial<CategoryResponseDto> = {},
): CategoryResponseDto {
  return {
    id: overrides.id || '550e8400-e29b-41d4-a716-446655440000',
    name: overrides.name || 'Electronics',
    slug: overrides.slug || 'electronics',
    description: overrides.description || 'Electronic products and gadgets',
    parentId: overrides.parentId,
    sortOrder: overrides.sortOrder ?? 10,
    isActive: overrides.isActive ?? true,
    metadata: overrides.metadata ?? { color: '#FF5722', icon: 'electronics-icon' },
    createdAt: overrides.createdAt || new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: overrides.updatedAt || new Date('2024-01-01T00:00:00.000Z'),
  };
}

/**
 * Creates a mock CategoryTreeDto with optional overrides
 */
export function createMockCategoryTreeDto(
  overrides: Partial<CategoryTreeDto> = {},
): CategoryTreeDto {
  return {
    id: overrides.id || '550e8400-e29b-41d4-a716-446655440000',
    name: overrides.name || 'Electronics',
    slug: overrides.slug || 'electronics',
    sortOrder: overrides.sortOrder ?? 10,
    isActive: overrides.isActive ?? true,
    level: overrides.level ?? 0,
    hasChildren: overrides.hasChildren ?? true,
    children: overrides.children || [],
  };
}

/**
 * Creates a mock PaginatedCategoriesResponseDto
 */
export function createMockPaginatedResponse(
  data: CategoryResponseDto[],
  total: number = data.length,
  page: number = 1,
  limit: number = 10,
): PaginatedCategoriesResponseDto {
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Creates a mock CategoriesService
 */
export function createMockCategoriesService() {
  return {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findBySlug: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    activate: jest.fn(),
    deactivate: jest.fn(),
    buildCategoryTree: jest.fn(),
    getDescendants: jest.fn(),
    getCategoryPath: jest.fn(),
  };
}

/**
 * Sets up a test module for Categories Controller with mocked service
 */
export async function setupCategoriesControllerTestModule(
  mockService: ReturnType<typeof createMockCategoriesService>,
): Promise<TestingModule> {
  return await Test.createTestingModule({
    controllers: [CategoriesController],
    providers: [
      {
        provide: CategoriesService,
        useValue: mockService,
      },
    ],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: jest.fn(() => true) })
    .compile();
}

/**
 * Common test IDs
 */
export const TEST_CATEGORY_IDS = {
  main: '550e8400-e29b-41d4-a716-446655440000',
  parent: '550e8400-e29b-41d4-a716-446655440001',
  child: '550e8400-e29b-41d4-a716-446655440002',
  tablet: '550e8400-e29b-41d4-a716-446655440003',
  custom: '650e8400-e29b-41d4-a716-446655440099',
};
