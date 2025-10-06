import { BadRequestException } from '@nestjs/common';
import {
  createMockProduct,
  createMockProductRepository,
  createMockQueryBuilder,
  setupProductsTestModule,
  setupQueryBuilderMocks,
} from './helpers/products.test-helpers';
import { ProductsService } from './products.service';
import { ProductQueryDto } from './dto';

describe('ProductsService - Search & Filtering', () => {
  let service: ProductsService;
  const mockRepository = createMockProductRepository();
  const mockQueryBuilder = createMockQueryBuilder();
  const mockProduct = createMockProduct();

  beforeEach(async () => {
    setupQueryBuilderMocks(mockRepository, mockQueryBuilder);
    const testModule = await setupProductsTestModule(mockRepository);
    service = testModule.service;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    const queryDto: ProductQueryDto = {
      page: 1,
      limit: 10,
      search: 'test',
    };

    it('should return paginated results when valid query provided', async () => {
      const products = [mockProduct];
      const total = 1;
      mockQueryBuilder.getCount.mockResolvedValue(total);
      mockQueryBuilder.getMany.mockResolvedValue(products);

      const result = await service.findAll(queryDto);

      expect(result).toEqual({
        data: expect.any(Array),
        meta: {
          total,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });
    });

    it('should apply search filters when search term provided', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.any(Object),
      );
    });
  });

  describe('search', () => {
    const searchTerm = 'wireless';
    const limit = 10;

    it('should return search results when search term provided', async () => {
      const products = [mockProduct];
      mockQueryBuilder.getMany.mockResolvedValue(products);

      const result = await service.search(searchTerm, limit);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(limit);
    });
  });

  describe('findAll - advanced filtering', () => {
    it('should filter by brand when brand provided', async () => {
      const queryDto: ProductQueryDto = {
        page: 1,
        limit: 10,
        brand: 'TestBrand',
      };
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.brand ILIKE :brand',
        expect.objectContaining({ brand: '%TestBrand%' }),
      );
    });

    it('should filter by status when status is active', async () => {
      const queryDto: ProductQueryDto = {
        page: 1,
        limit: 10,
        status: 'active',
      };
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('product.isActive = :isActive', {
        isActive: true,
      });
    });

    it('should filter by status when status is inactive', async () => {
      const queryDto: ProductQueryDto = {
        page: 1,
        limit: 10,
        status: 'inactive',
      };
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('product.isActive = :isActive', {
        isActive: false,
      });
    });

    it('should not filter by status when status is all', async () => {
      const queryDto: ProductQueryDto = {
        page: 1,
        limit: 10,
        status: 'all',
      };
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(queryDto);

      const statusCalls = (mockQueryBuilder.andWhere as jest.Mock).mock.calls.filter((call) =>
        call[0]?.includes('isActive'),
      );
      expect(statusCalls.length).toBe(0);
    });

    it('should filter by min and max price when both provided', async () => {
      const queryDto: ProductQueryDto = {
        page: 1,
        limit: 10,
        minPrice: 50,
        maxPrice: 200,
      };
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.price BETWEEN :minPrice AND :maxPrice',
        { minPrice: 50, maxPrice: 200 },
      );
    });

    it('should filter by minPrice only when only minPrice provided', async () => {
      const queryDto: ProductQueryDto = {
        page: 1,
        limit: 10,
        minPrice: 50,
      };
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('product.price >= :minPrice', {
        minPrice: 50,
      });
    });

    it('should filter by maxPrice only when only maxPrice provided', async () => {
      const queryDto: ProductQueryDto = {
        page: 1,
        limit: 10,
        maxPrice: 200,
      };
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('product.price <= :maxPrice', {
        maxPrice: 200,
      });
    });

    it('should filter by onSale when onSale is true', async () => {
      const queryDto: ProductQueryDto = {
        page: 1,
        limit: 10,
        onSale: true,
      };
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'product.compareAtPrice > product.price',
      );
    });

    it('should filter by onSale when onSale is false', async () => {
      const queryDto: ProductQueryDto = {
        page: 1,
        limit: 10,
        onSale: false,
      };
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(product.compareAtPrice IS NULL OR product.compareAtPrice <= product.price)',
      );
    });

    it('should filter by tags when tags array provided', async () => {
      const queryDto: ProductQueryDto = {
        page: 1,
        limit: 10,
        tags: ['electronics', 'gaming'],
      };
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(queryDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('product.tags && :tags', {
        tags: ['electronics', 'gaming'],
      });
    });

    it('should sort by popularity when sortBy is popularity', async () => {
      const queryDto: ProductQueryDto = {
        page: 1,
        limit: 10,
        sortBy: 'popularity',
      };
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(queryDto);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('product.createdAt', 'DESC');
    });

    it('should sort by discountPercentage when sortBy is discountPercentage', async () => {
      const queryDto: ProductQueryDto = {
        page: 1,
        limit: 10,
        sortBy: 'discountPercentage',
        sortOrder: 'ASC',
      };
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(queryDto);

      expect(mockQueryBuilder.addSelect).toHaveBeenCalled();
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('discount_percentage', 'ASC');
    });

    it('should sort by valid field when sortBy is provided', async () => {
      const queryDto: ProductQueryDto = {
        page: 1,
        limit: 10,
        sortBy: 'price',
        sortOrder: 'ASC',
      };
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(queryDto);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('product.price', 'ASC');
    });

    it('should default to createdAt DESC when no sortBy provided', async () => {
      const queryDto: ProductQueryDto = {
        page: 1,
        limit: 10,
      };
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(queryDto);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('product.createdAt', 'DESC');
    });

    it('should include deleted products when includeDeleted is true', async () => {
      const queryDto: ProductQueryDto = {
        page: 1,
        limit: 10,
        includeDeleted: true,
      };
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.findAll(queryDto);

      const deletedAtCalls = (mockRepository.createQueryBuilder as jest.Mock).mock.calls;
      expect(deletedAtCalls.length).toBeGreaterThan(0);
    });

    it('should throw BadRequestException when database error occurs', async () => {
      const queryDto: ProductQueryDto = {
        page: 1,
        limit: 10,
      };
      mockQueryBuilder.getCount.mockRejectedValue(new Error('Database error'));

      await expect(service.findAll(queryDto)).rejects.toThrow(BadRequestException);
    });
  });
});
