import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  createMockProduct,
  createMockCreateProductDto,
  createMockProductRepository,
  createMockQueryBuilder,
  setupProductsTestModule,
  setupQueryBuilderMocks,
} from './helpers/products.test-helpers';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto';

describe('ProductsService - CRUD Operations', () => {
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createProductDto: CreateProductDto = createMockCreateProductDto();

    it('should create product and return saved entity when valid data provided', async () => {
      const newProduct = { ...mockProduct, ...createProductDto };
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);
      mockRepository.create.mockReturnValue(newProduct);
      mockRepository.save.mockResolvedValue(newProduct);

      const result = await service.create(createProductDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(createProductDto.name);
      expect(result.sku).toBe(createProductDto.sku);
      expect(mockRepository.create).toHaveBeenCalledWith(createProductDto);
      expect(mockRepository.save).toHaveBeenCalledWith(newProduct);
    });

    it('should throw ConflictException when SKU already exists', async () => {
      mockQueryBuilder.getOne.mockResolvedValueOnce(mockProduct);

      await expect(service.create(createProductDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when validation error occurs', async () => {
      const invalidDto = { ...createProductDto, price: -10 };
      mockQueryBuilder.getOne.mockResolvedValueOnce(null);
      mockRepository.create.mockReturnValue({ ...mockProduct, price: -10 });
      mockRepository.save.mockRejectedValue(new Error('Product price must be greater than 0'));

      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findById', () => {
    const productId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return product when valid ID provided', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockProduct);

      const result = await service.findById(productId);

      expect(result).toEqual(mockProduct);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('product.id = :id', { id: productId });
    });

    it('should return null when product not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const result = await service.findById(productId);

      expect(result).toBeNull();
    });
  });

  describe('findOne', () => {
    const productId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return product response DTO when product exists', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockProduct);

      const result = await service.findOne(productId);

      expect(result).toBeDefined();
      expect(result.id).toEqual(mockProduct.id);
    });

    it('should throw NotFoundException when product not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.findOne(productId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBySku', () => {
    const sku = 'TEST-001';

    it('should return product when valid SKU provided', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockProduct);

      const result = await service.findBySku(sku);

      expect(result).toEqual(mockProduct);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('product.sku = :sku', {
        sku: sku.toUpperCase(),
      });
    });

    it('should return null when product not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const result = await service.findBySku(sku);

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully when finding by SKU', async () => {
      mockQueryBuilder.getOne.mockRejectedValue(new Error('Database connection error'));

      const result = await service.findBySku(sku);

      expect(result).toBeNull();
    });

    it('should include deleted products when includeDeleted is true', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockProduct);

      await service.findBySku(sku, true);

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith('product.deletedAt IS NULL');
    });

    it('should normalize SKU to uppercase', async () => {
      const lowerCaseSku = 'test-001';
      mockQueryBuilder.getOne.mockResolvedValue(mockProduct);

      await service.findBySku(lowerCaseSku);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('product.sku = :sku', {
        sku: 'TEST-001',
      });
    });
  });
});
