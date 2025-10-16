import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  createMockProduct,
  createMockProductRepository,
  createMockQueryBuilder,
  setupProductsTestModule,
  setupQueryBuilderMocks,
} from './helpers/products.test-helpers';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto';

describe('ProductsService - Edge Cases', () => {
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

  describe('activate - edge cases', () => {
    const productId = '123e4567-e89b-12d3-a456-426614174000';

    it('should throw NotFoundException when product does not exist', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);

      await expect(service.activate(productId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when activation fails to return product', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockProduct).mockResolvedValueOnce(null);
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await expect(service.activate(productId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when database error occurs', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockProduct);
      mockRepository.update.mockRejectedValue(new Error('Database error'));

      await expect(service.activate(productId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('deactivate - edge cases', () => {
    const productId = '123e4567-e89b-12d3-a456-426614174000';

    it('should throw NotFoundException when product does not exist', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);

      await expect(service.deactivate(productId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when deactivation fails to return product', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockProduct).mockResolvedValueOnce(null);
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await expect(service.deactivate(productId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when database error occurs', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockProduct);
      mockRepository.update.mockRejectedValue(new Error('Database error'));

      await expect(service.deactivate(productId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove - edge cases', () => {
    const productId = '123e4567-e89b-12d3-a456-426614174000';

    it('should throw BadRequestException when database error occurs', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockProduct);
      mockRepository.softDelete.mockRejectedValue(new Error('Database error'));

      await expect(service.remove(productId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findById - edge cases', () => {
    const productId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return null when database error occurs', async () => {
      mockQueryBuilder.getOne.mockRejectedValue(new Error('Database error'));

      const result = await service.findById(productId);

      expect(result).toBeNull();
    });

    it('should include deleted products when includeDeleted is true', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockProduct);

      await service.findById(productId, true);

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith('product.deletedAt IS NULL');
    });
  });

  describe('search - edge cases', () => {
    it('should throw BadRequestException when database error occurs', async () => {
      const searchTerm = 'test';
      mockQueryBuilder.getMany.mockRejectedValue(new Error('Database error'));

      await expect(service.search(searchTerm)).rejects.toThrow(BadRequestException);
    });
  });

  describe('create - price validations', () => {
    it('should throw BadRequestException when price is null', async () => {
      const createDto: CreateProductDto = {
        name: 'Test Product',
        description: 'Test',
        price: null as unknown as number,
        sku: 'TEST-NEW',
        brand: 'TestBrand',
      };
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when price is undefined', async () => {
      const createDto: CreateProductDto = {
        name: 'Test Product',
        description: 'Test',
        price: undefined as unknown as number,
        sku: 'TEST-NEW',
        brand: 'TestBrand',
      };
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when price is not a number', async () => {
      const createDto: CreateProductDto = {
        name: 'Test Product',
        description: 'Test',
        price: 'not-a-number' as unknown as number,
        sku: 'TEST-NEW',
        brand: 'TestBrand',
      };
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when price is NaN', async () => {
      const createDto: CreateProductDto = {
        name: 'Test Product',
        description: 'Test',
        price: NaN,
        sku: 'TEST-NEW',
        brand: 'TestBrand',
      };
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when price is zero', async () => {
      const createDto: CreateProductDto = {
        name: 'Test Product',
        description: 'Test',
        price: 0,
        sku: 'TEST-NEW',
        brand: 'TestBrand',
      };
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when price is negative', async () => {
      const createDto: CreateProductDto = {
        name: 'Test Product',
        description: 'Test',
        price: -10,
        sku: 'TEST-NEW',
        brand: 'TestBrand',
      };
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when costPrice is not a number', async () => {
      const createDto: CreateProductDto = {
        name: 'Test Product',
        description: 'Test',
        price: 100,
        costPrice: 'invalid' as unknown as number,
        sku: 'TEST-NEW',
        brand: 'TestBrand',
      };
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when costPrice is negative', async () => {
      const createDto: CreateProductDto = {
        name: 'Test Product',
        description: 'Test',
        price: 100,
        costPrice: -50,
        sku: 'TEST-NEW',
        brand: 'TestBrand',
      };
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when compareAtPrice is not a number', async () => {
      const createDto: CreateProductDto = {
        name: 'Test Product',
        description: 'Test',
        price: 100,
        compareAtPrice: 'invalid' as unknown as number,
        sku: 'TEST-NEW',
        brand: 'TestBrand',
      };
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when compareAtPrice is less than or equal to price', async () => {
      const createDto: CreateProductDto = {
        name: 'Test Product',
        description: 'Test',
        price: 100,
        compareAtPrice: 90,
        sku: 'TEST-NEW',
        brand: 'TestBrand',
      };
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });
  });
});
