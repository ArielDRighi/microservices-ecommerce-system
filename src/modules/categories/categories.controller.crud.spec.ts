import { TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, CategoryQueryDto } from './dto';
import {
  createMockCategoryResponseDto,
  createMockPaginatedResponse,
  createMockCategoriesService,
  setupCategoriesControllerTestModule,
  TEST_CATEGORY_IDS,
} from './helpers/categories-controller.test-helpers';

describe('CategoriesController - CRUD & Queries', () => {
  let controller: CategoriesController;
  let service: CategoriesService;
  let mockCategoriesService: ReturnType<typeof createMockCategoriesService>;

  const mockCategoryResponse = createMockCategoryResponseDto();
  const mockSubCategoryResponse = createMockCategoryResponseDto({
    id: TEST_CATEGORY_IDS.child,
    name: 'Smartphones',
    slug: 'smartphones',
    description: 'Mobile phones and accessories',
    parentId: TEST_CATEGORY_IDS.main,
    sortOrder: 5,
    metadata: undefined,
    createdAt: new Date('2024-01-02T00:00:00.000Z'),
    updatedAt: new Date('2024-01-02T00:00:00.000Z'),
  });

  beforeEach(async () => {
    mockCategoriesService = createMockCategoriesService();

    const module: TestingModule = await setupCategoriesControllerTestModule(mockCategoriesService);

    controller = module.get<CategoriesController>(CategoriesController);
    service = module.get<CategoriesService>(CategoriesService);

    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have categoriesService injected', () => {
      expect(service).toBeDefined();
    });
  });

  describe('create', () => {
    const createCategoryDto: CreateCategoryDto = {
      name: 'Electronics',
      description: 'Electronic products and gadgets',
      slug: 'electronics',
      sortOrder: 10,
      metadata: { color: '#FF5722', icon: 'electronics-icon' },
    };

    it('should create a new category successfully', async () => {
      mockCategoriesService.create.mockResolvedValue(mockCategoryResponse);

      const result = await controller.create(createCategoryDto);

      expect(result).toEqual(mockCategoryResponse);
      expect(service.create).toHaveBeenCalledWith(createCategoryDto);
      expect(service.create).toHaveBeenCalledTimes(1);
    });

    it('should create a sub-category with parentId', async () => {
      const subCategoryDto: CreateCategoryDto = {
        name: 'Smartphones',
        description: 'Mobile phones',
        parentId: TEST_CATEGORY_IDS.main,
        sortOrder: 5,
      };
      mockCategoriesService.create.mockResolvedValue(mockSubCategoryResponse);

      const result = await controller.create(subCategoryDto);

      expect(result).toEqual(mockSubCategoryResponse);
      expect(result.parentId).toBe(TEST_CATEGORY_IDS.main);
      expect(service.create).toHaveBeenCalledWith(subCategoryDto);
    });

    it('should create category with minimal data (only required fields)', async () => {
      const minimalDto: CreateCategoryDto = {
        name: 'Minimal Category',
      };
      const minimalResponse = createMockCategoryResponseDto({
        name: 'Minimal Category',
        slug: 'minimal-category',
        description: undefined,
        metadata: undefined,
      });
      mockCategoriesService.create.mockResolvedValue(minimalResponse);

      const result = await controller.create(minimalDto);

      expect(result).toEqual(minimalResponse);
      expect(service.create).toHaveBeenCalledWith(minimalDto);
    });

    it('should pass through service errors when creation fails', async () => {
      const error = new Error('Duplicate category slug');
      mockCategoriesService.create.mockRejectedValue(error);

      await expect(controller.create(createCategoryDto)).rejects.toThrow('Duplicate category slug');
      expect(service.create).toHaveBeenCalledWith(createCategoryDto);
    });
  });

  describe('findAll', () => {
    const mockPaginatedResponse = createMockPaginatedResponse(
      [mockCategoryResponse, mockSubCategoryResponse],
      2,
    );

    it('should return paginated categories with default query', async () => {
      const query: CategoryQueryDto = { page: 1, limit: 10 };
      mockCategoriesService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(query);

      expect(result).toEqual(mockPaginatedResponse);
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should return filtered categories by search term', async () => {
      const query: CategoryQueryDto = { page: 1, limit: 10, search: 'Electronics' };
      const filteredResponse = createMockPaginatedResponse([mockCategoryResponse], 1);
      mockCategoriesService.findAll.mockResolvedValue(filteredResponse);

      const result = await controller.findAll(query);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.name).toContain('Electronics');
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should return categories filtered by parentId', async () => {
      const query: CategoryQueryDto = { page: 1, limit: 10, parentId: TEST_CATEGORY_IDS.main };
      const childrenResponse = createMockPaginatedResponse([mockSubCategoryResponse], 1);
      mockCategoriesService.findAll.mockResolvedValue(childrenResponse);

      const result = await controller.findAll(query);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.parentId).toBe(TEST_CATEGORY_IDS.main);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should return empty result when no categories found', async () => {
      const query: CategoryQueryDto = { page: 1, limit: 10 };
      const emptyResponse = createMockPaginatedResponse([], 0);
      mockCategoriesService.findAll.mockResolvedValue(emptyResponse);

      const result = await controller.findAll(query);

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should handle sorting and ordering in query', async () => {
      const query: CategoryQueryDto = {
        page: 1,
        limit: 10,
        sortBy: 'name',
        sortOrder: 'ASC',
      };
      mockCategoriesService.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(query);

      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findBySlug', () => {
    it('should return category when found by slug', async () => {
      mockCategoriesService.findBySlug.mockResolvedValue(mockCategoryResponse);

      const result = await controller.findBySlug('electronics');

      expect(result).toEqual(mockCategoryResponse);
      expect(result.slug).toBe('electronics');
      expect(service.findBySlug).toHaveBeenCalledWith('electronics');
    });

    it('should throw NotFoundException when category not found by slug', async () => {
      mockCategoriesService.findBySlug.mockResolvedValue(null);

      await expect(controller.findBySlug('non-existent-slug')).rejects.toThrow(NotFoundException);
      await expect(controller.findBySlug('non-existent-slug')).rejects.toThrow(
        "Category with slug 'non-existent-slug' not found",
      );
      expect(service.findBySlug).toHaveBeenCalledWith('non-existent-slug');
    });

    it('should handle slug with hyphens correctly', async () => {
      const categoryWithHyphens = createMockCategoryResponseDto({
        slug: 'consumer-electronics',
        name: 'Consumer Electronics',
      });
      mockCategoriesService.findBySlug.mockResolvedValue(categoryWithHyphens);

      const result = await controller.findBySlug('consumer-electronics');

      expect(result).toEqual(categoryWithHyphens);
      expect(result.slug).toBe('consumer-electronics');
      expect(service.findBySlug).toHaveBeenCalledWith('consumer-electronics');
    });
  });

  describe('findOne', () => {
    it('should return category when found by ID', async () => {
      mockCategoriesService.findOne.mockResolvedValue(mockCategoryResponse);

      const result = await controller.findOne(TEST_CATEGORY_IDS.main);

      expect(result).toEqual(mockCategoryResponse);
      expect(result.id).toBe(TEST_CATEGORY_IDS.main);
      expect(service.findOne).toHaveBeenCalledWith(TEST_CATEGORY_IDS.main);
    });

    it('should pass through NotFoundException from service when category not found', async () => {
      const error = new NotFoundException(`Category with id ${TEST_CATEGORY_IDS.main} not found`);
      mockCategoriesService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(TEST_CATEGORY_IDS.main)).rejects.toThrow(NotFoundException);
      expect(service.findOne).toHaveBeenCalledWith(TEST_CATEGORY_IDS.main);
    });

    it('should call service with the provided UUID', async () => {
      const customCategory = createMockCategoryResponseDto({
        id: TEST_CATEGORY_IDS.custom,
      });
      mockCategoriesService.findOne.mockResolvedValue(customCategory);

      const result = await controller.findOne(TEST_CATEGORY_IDS.custom);

      expect(result.id).toBe(TEST_CATEGORY_IDS.custom);
      expect(service.findOne).toHaveBeenCalledWith(TEST_CATEGORY_IDS.custom);
    });
  });
});
