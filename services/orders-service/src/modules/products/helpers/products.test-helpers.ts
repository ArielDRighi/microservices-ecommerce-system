import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductsService } from '../products.service';
import { Product } from '../entities/product.entity';
import { CreateProductDto, UpdateProductDto } from '../dto';

/**
 * Creates a mock Product entity with optional overrides
 */
export function createMockProduct(overrides: Partial<Product> = {}): Product {
  const defaultProduct: Product = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Product',
    description: 'Test Description',
    price: 99.99,
    sku: 'TEST-001',
    isActive: true,
    brand: 'TestBrand',
    weight: 1.0,
    attributes: { color: 'red' },
    images: ['http://example.com/image.jpg'],
    tags: ['test', 'product'],
    costPrice: 50.0,
    compareAtPrice: 150.0,
    trackInventory: true,
    minimumStock: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: undefined,
    orderItems: Promise.resolve([]),
    // ✅ Epic 1.6 - T1.6.1: Removed inventory relation (now external service)
    // inventory: Promise.resolve({} as Product['inventory']),
    get isOnSale() {
      return (
        this.compareAtPrice !== null &&
        this.compareAtPrice !== undefined &&
        this.compareAtPrice > this.price
      );
    },
    get discountPercentage() {
      if (!this.isOnSale || !this.compareAtPrice) return 0;
      return Math.round(((this.compareAtPrice - this.price) / this.compareAtPrice) * 100);
    },
    get profitMargin() {
      if (!this.costPrice) return 0;
      return Math.round(((this.price - this.costPrice) / this.price) * 100);
    },
    validatePricing: jest.fn(),
    normalizeData: jest.fn(),
    activate: jest.fn(),
    deactivate: jest.fn(),
    updatePrice: jest.fn(),
    addTag: jest.fn(),
    removeTag: jest.fn(),
    addImage: jest.fn(),
    removeImage: jest.fn(),
    ...overrides,
  };

  return defaultProduct;
}

/**
 * Creates a mock CreateProductDto with optional overrides
 */
export function createMockCreateProductDto(
  overrides: Partial<CreateProductDto> = {},
): CreateProductDto {
  return {
    name: 'Test Product',
    description: 'Test Description',
    price: 99.99,
    sku: 'TEST-001',
    brand: 'TestBrand',
    weight: 1.0,
    attributes: { color: 'red' },
    images: ['http://example.com/image.jpg'],
    tags: ['test', 'product'],
    costPrice: 50.0,
    compareAtPrice: 150.0,
    trackInventory: true,
    minimumStock: 5,
    ...overrides,
  } as CreateProductDto;
}

/**
 * Creates a mock UpdateProductDto with optional overrides
 */
export function createMockUpdateProductDto(
  overrides: Partial<UpdateProductDto> = {},
): UpdateProductDto {
  return {
    name: 'Updated Product',
    price: 129.99,
    ...overrides,
  } as UpdateProductDto;
}

/**
 * Creates a mock Product Repository with common methods
 */
export function createMockProductRepository() {
  return {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
}

/**
 * Creates a mock QueryBuilder for complex queries
 */
export function createMockQueryBuilder() {
  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
    getOne: jest.fn(),
    getMany: jest.fn(),
  };

  return mockQueryBuilder;
}

/**
 * Sets up the Products test module with mocks
 */
export async function setupProductsTestModule(mockRepository: Record<string, unknown>) {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      ProductsService,
      {
        provide: getRepositoryToken(Product),
        useValue: mockRepository,
      },
    ],
  }).compile();

  const service = module.get<ProductsService>(ProductsService);
  const repository = module.get<Repository<Product>>(getRepositoryToken(Product));

  return { service, repository, module };
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
  mockQueryBuilder['orderBy'] = jest.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder['addOrderBy'] = jest.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder['addSelect'] = jest.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder['skip'] = jest.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder['take'] = jest.fn().mockReturnValue(mockQueryBuilder);
  mockQueryBuilder['limit'] = jest.fn().mockReturnValue(mockQueryBuilder);
  mockRepository['createQueryBuilder'] = jest.fn().mockReturnValue(mockQueryBuilder);
}
