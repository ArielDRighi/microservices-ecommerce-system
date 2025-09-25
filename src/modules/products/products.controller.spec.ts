import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreateProductDto, ProductQueryDto, UpdateProductDto, ProductResponseDto } from './dto';
import { User } from '../users/entities/user.entity';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: ProductsService;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
  } as unknown as User;

  const mockProductResponse: ProductResponseDto = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Product',
    description: 'Test Description',
    price: 99.99,
    sku: 'TEST-001',
    isActive: true,
    category: 'Electronics',
    brand: 'TestBrand',
    weight: 1.0,
    attributes: { color: 'red' },
    images: ['http://example.com/image.jpg'],
    tags: ['test', 'product'],
    costPrice: 50.0,
    compareAtPrice: 120.0,
    trackInventory: true,
    minimumStock: 5,
    isOnSale: true,
    discountPercentage: 17,
    profitMargin: 50,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProductsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    search: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    activate: jest.fn(),
    deactivate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get<ProductsService>(ProductsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createProductDto: CreateProductDto = {
      name: 'Test Product',
      description: 'Test Description',
      price: 99.99,
      sku: 'TEST-001',
      category: 'Electronics',
      brand: 'TestBrand',
    };

    it('should create a product successfully', async () => {
      const createdProduct = { id: mockProductResponse.id };
      mockProductsService.create.mockResolvedValue(createdProduct);
      mockProductsService.findOne.mockResolvedValue(mockProductResponse);

      const result = await controller.create(createProductDto, mockUser);

      expect(result).toEqual(mockProductResponse);
      expect(service.create).toHaveBeenCalledWith(createProductDto);
      expect(service.findOne).toHaveBeenCalledWith(createdProduct.id);
    });

    it('should handle ConflictException from service', async () => {
      mockProductsService.create.mockRejectedValue(new ConflictException('SKU already exists'));

      await expect(controller.create(createProductDto, mockUser)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    const queryDto: ProductQueryDto = {
      page: 1,
      limit: 10,
      search: 'test',
      category: 'Electronics',
    };

    const paginatedResponse = {
      data: [mockProductResponse],
      meta: {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    };

    it('should return paginated products', async () => {
      mockProductsService.findAll.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(queryDto);

      expect(result).toEqual(paginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith(queryDto);
    });

    it('should handle empty query parameters', async () => {
      const emptyQuery = {};
      mockProductsService.findAll.mockResolvedValue(paginatedResponse);

      await controller.findAll(emptyQuery);

      expect(service.findAll).toHaveBeenCalledWith(emptyQuery);
    });
  });

  describe('findOne', () => {
    const productId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return a product by ID', async () => {
      mockProductsService.findOne.mockResolvedValue(mockProductResponse);

      const result = await controller.findOne(productId);

      expect(result).toEqual(mockProductResponse);
      expect(service.findOne).toHaveBeenCalledWith(productId);
    });

    it('should handle NotFoundException from service', async () => {
      mockProductsService.findOne.mockRejectedValue(new NotFoundException('Product not found'));

      await expect(controller.findOne(productId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('search', () => {
    const searchTerm = 'wireless';
    const limit = 5;

    const searchResults = [mockProductResponse];

    it('should return search results', async () => {
      mockProductsService.search.mockResolvedValue(searchResults);

      const result = await controller.search(searchTerm, limit);

      expect(result).toEqual(searchResults);
      expect(service.search).toHaveBeenCalledWith(searchTerm, limit);
    });

    it('should use default limit when not provided', async () => {
      mockProductsService.search.mockResolvedValue(searchResults);

      await controller.search(searchTerm);

      expect(service.search).toHaveBeenCalledWith(searchTerm, 10);
    });
  });

  describe('update', () => {
    const productId = '123e4567-e89b-12d3-a456-426614174000';
    const updateProductDto: UpdateProductDto = {
      name: 'Updated Product',
      price: 199.99,
    };

    it('should update a product successfully', async () => {
      const updatedProduct = { ...mockProductResponse, ...updateProductDto };
      mockProductsService.update.mockResolvedValue(updatedProduct);

      const result = await controller.update(productId, updateProductDto, mockUser);

      expect(result).toEqual(updatedProduct);
      expect(service.update).toHaveBeenCalledWith(productId, updateProductDto);
    });

    it('should handle NotFoundException from service', async () => {
      mockProductsService.update.mockRejectedValue(new NotFoundException('Product not found'));

      await expect(controller.update(productId, updateProductDto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    const productId = '123e4567-e89b-12d3-a456-426614174000';

    it('should remove a product successfully', async () => {
      mockProductsService.remove.mockResolvedValue(undefined);

      await controller.remove(productId, mockUser);

      expect(service.remove).toHaveBeenCalledWith(productId);
    });

    it('should handle NotFoundException from service', async () => {
      mockProductsService.remove.mockRejectedValue(new NotFoundException('Product not found'));

      await expect(controller.remove(productId, mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('activate', () => {
    const productId = '123e4567-e89b-12d3-a456-426614174000';

    it('should activate a product successfully', async () => {
      const activatedProduct = { ...mockProductResponse, isActive: true };
      mockProductsService.activate.mockResolvedValue(activatedProduct);

      const result = await controller.activate(productId, mockUser);

      expect(result).toEqual(activatedProduct);
      expect(service.activate).toHaveBeenCalledWith(productId);
    });

    it('should handle NotFoundException from service', async () => {
      mockProductsService.activate.mockRejectedValue(new NotFoundException('Product not found'));

      await expect(controller.activate(productId, mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate', () => {
    const productId = '123e4567-e89b-12d3-a456-426614174000';

    it('should deactivate a product successfully', async () => {
      const deactivatedProduct = { ...mockProductResponse, isActive: false };
      mockProductsService.deactivate.mockResolvedValue(deactivatedProduct);

      const result = await controller.deactivate(productId, mockUser);

      expect(result).toEqual(deactivatedProduct);
      expect(service.deactivate).toHaveBeenCalledWith(productId);
    });

    it('should handle NotFoundException from service', async () => {
      mockProductsService.deactivate.mockRejectedValue(new NotFoundException('Product not found'));

      await expect(controller.deactivate(productId, mockUser)).rejects.toThrow(NotFoundException);
    });
  });
});
