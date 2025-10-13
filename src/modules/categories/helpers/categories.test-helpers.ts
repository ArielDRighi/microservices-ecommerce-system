import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CategoriesService } from '../categories.service';
import { Category } from '../entities/category.entity';
import { Product } from '../../products/entities/product.entity';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto';

/**
 * Creates a mock Category entity with optional overrides
 */
export function createMockCategory(overrides: Partial<Category> = {}): Category {
  const now = new Date();
  return {
    id: 'cat-123',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Electronic devices',
    parentId: null,
    isActive: true,
    sortOrder: 0,
    metadata: {},
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    children: [],
    isRoot: jest.fn(() => !overrides.parentId),
    hasChildren: jest.fn(() => Boolean(overrides.children?.length)),
    isDescendantOf: jest.fn(),
    getAncestors: jest.fn(() => []),
    getLevel: jest.fn(() => 0),
    getPath: jest.fn(() => [overrides.name || 'Electronics']),
    generateSlugIfEmpty: jest.fn(),
    ...overrides,
  } as Category;
}

/**
 * Creates a mock CreateCategoryDto with optional overrides
 */
export function createMockCreateCategoryDto(
  overrides: Partial<CreateCategoryDto> = {},
): CreateCategoryDto {
  return {
    name: 'Electronics',
    description: 'Electronic devices',
    parentId: null,
    sortOrder: 0,
    metadata: {},
    ...overrides,
  } as CreateCategoryDto;
}

/**
 * Creates a mock UpdateCategoryDto with optional overrides
 */
export function createMockUpdateCategoryDto(
  overrides: Partial<UpdateCategoryDto> = {},
): UpdateCategoryDto {
  return {
    name: 'Updated Electronics',
    description: 'Updated description',
    ...overrides,
  } as UpdateCategoryDto;
}

/**
 * Creates a mock Category Repository with common methods
 */
export function createMockCategoryRepository() {
  return {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    count: jest.fn(),
    merge: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
}

/**
 * Creates a mock QueryBuilder for Categories
 */
export function createMockQueryBuilder() {
  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
    getCount: jest.fn(),
  };
  return mockQueryBuilder as unknown as jest.Mocked<SelectQueryBuilder<Category>>;
}

/**
 * Creates a mock Product Repository with common methods
 */
export function createMockProductRepository() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
}

/**
 * Sets up the Categories test module with mocks
 */
export async function setupCategoriesTestModule(
  mockRepository: Record<string, unknown>,
  mockProductRepository?: Record<string, unknown>,
) {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      CategoriesService,
      {
        provide: getRepositoryToken(Category),
        useValue: mockRepository,
      },
      {
        provide: getRepositoryToken(Product),
        useValue: mockProductRepository || createMockProductRepository(),
      },
    ],
  }).compile();

  const service = module.get<CategoriesService>(CategoriesService);
  const repository = module.get<Repository<Category>>(getRepositoryToken(Category));
  const productRepository = module.get<Repository<Product>>(getRepositoryToken(Product));

  return { service, repository, productRepository, module };
}

/**
 * Helper to setup QueryBuilder mocks with proper chaining
 */
export function setupQueryBuilderMocks(
  mockRepository: Record<string, unknown>,
  mockQueryBuilder: Record<string, unknown>,
) {
  mockQueryBuilder['where'] = jest.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder['andWhere'] = jest.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder['orWhere'] = jest.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder['leftJoinAndSelect'] = jest.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder['orderBy'] = jest.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder['addOrderBy'] = jest.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder['skip'] = jest.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder['take'] = jest.fn().mockReturnValue(mockQueryBuilder);
  mockRepository['createQueryBuilder'] = jest.fn().mockReturnValue(mockQueryBuilder);
}
