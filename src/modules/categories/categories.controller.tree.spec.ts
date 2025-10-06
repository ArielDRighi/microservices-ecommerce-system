import { TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import {
  createMockCategoryResponseDto,
  createMockCategoryTreeDto,
  createMockCategoriesService,
  setupCategoriesControllerTestModule,
  TEST_CATEGORY_IDS,
} from './helpers/categories-controller.test-helpers';

describe('CategoriesController - Tree & Hierarchy Operations', () => {
  let controller: CategoriesController;
  let service: CategoriesService;
  let mockCategoriesService: ReturnType<typeof createMockCategoriesService>;

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

  const mockCategoryTree = [
    createMockCategoryTreeDto({
      id: TEST_CATEGORY_IDS.main,
      name: 'Electronics',
      slug: 'electronics',
      sortOrder: 10,
      isActive: true,
      level: 0,
      hasChildren: true,
      children: [
        createMockCategoryTreeDto({
          id: TEST_CATEGORY_IDS.child,
          name: 'Smartphones',
          slug: 'smartphones',
          sortOrder: 5,
          isActive: true,
          level: 1,
          hasChildren: false,
          children: [],
        }),
      ],
    }),
  ];

  beforeEach(async () => {
    mockCategoriesService = createMockCategoriesService();

    const module: TestingModule = await setupCategoriesControllerTestModule(mockCategoriesService);

    controller = module.get<CategoriesController>(CategoriesController);
    service = module.get<CategoriesService>(CategoriesService);

    jest.clearAllMocks();
  });

  describe('getCategoryTree', () => {
    it('should return category tree structure', async () => {
      mockCategoriesService.buildCategoryTree.mockResolvedValue(mockCategoryTree);

      const result = await controller.getCategoryTree();

      expect(result).toEqual(mockCategoryTree);
      expect(result[0]!.children).toBeDefined();
      expect(result[0]!.children).toHaveLength(1);
      expect(service.buildCategoryTree).toHaveBeenCalledWith(false);
    });

    it('should include inactive categories when includeInactive is true', async () => {
      const treeWithInactive = [...mockCategoryTree];
      mockCategoriesService.buildCategoryTree.mockResolvedValue(treeWithInactive);

      const result = await controller.getCategoryTree(true);

      expect(result).toEqual(treeWithInactive);
      expect(service.buildCategoryTree).toHaveBeenCalledWith(true);
    });

    it('should include inactive categories when includeInactive is "true" string', async () => {
      mockCategoriesService.buildCategoryTree.mockResolvedValue(mockCategoryTree);

      const result = await controller.getCategoryTree('true');

      expect(result).toEqual(mockCategoryTree);
      expect(service.buildCategoryTree).toHaveBeenCalledWith(true);
    });

    it('should exclude inactive categories when includeInactive is false', async () => {
      mockCategoriesService.buildCategoryTree.mockResolvedValue(mockCategoryTree);

      const result = await controller.getCategoryTree(false);

      expect(result).toEqual(mockCategoryTree);
      expect(service.buildCategoryTree).toHaveBeenCalledWith(false);
    });

    it('should exclude inactive categories when includeInactive is undefined', async () => {
      mockCategoriesService.buildCategoryTree.mockResolvedValue(mockCategoryTree);

      const result = await controller.getCategoryTree(undefined);

      expect(result).toEqual(mockCategoryTree);
      expect(service.buildCategoryTree).toHaveBeenCalledWith(false);
    });

    it('should return empty array when no categories exist', async () => {
      mockCategoriesService.buildCategoryTree.mockResolvedValue([]);

      const result = await controller.getCategoryTree();

      expect(result).toEqual([]);
      expect(service.buildCategoryTree).toHaveBeenCalledWith(false);
    });
  });

  describe('getDescendants', () => {
    const mockDescendants = [
      mockSubCategoryResponse,
      createMockCategoryResponseDto({
        id: TEST_CATEGORY_IDS.tablet,
        name: 'Tablets',
        slug: 'tablets',
        parentId: TEST_CATEGORY_IDS.main,
      }),
    ];

    it('should return all descendants of a category', async () => {
      mockCategoriesService.getDescendants.mockResolvedValue(mockDescendants);

      const result = await controller.getDescendants(TEST_CATEGORY_IDS.main);

      expect(result).toEqual(mockDescendants);
      expect(result).toHaveLength(2);
      expect(service.getDescendants).toHaveBeenCalledWith(TEST_CATEGORY_IDS.main, undefined);
    });

    it('should return descendants with maxDepth limit', async () => {
      mockCategoriesService.getDescendants.mockResolvedValue([mockSubCategoryResponse]);

      const result = await controller.getDescendants(TEST_CATEGORY_IDS.main, 1);

      expect(result).toEqual([mockSubCategoryResponse]);
      expect(service.getDescendants).toHaveBeenCalledWith(TEST_CATEGORY_IDS.main, 1);
    });

    it('should return empty array when category has no descendants', async () => {
      mockCategoriesService.getDescendants.mockResolvedValue([]);

      const result = await controller.getDescendants(TEST_CATEGORY_IDS.main);

      expect(result).toEqual([]);
      expect(service.getDescendants).toHaveBeenCalledWith(TEST_CATEGORY_IDS.main, undefined);
    });

    it('should handle maxDepth of 0 (only direct children)', async () => {
      mockCategoriesService.getDescendants.mockResolvedValue([mockSubCategoryResponse]);

      const result = await controller.getDescendants(TEST_CATEGORY_IDS.main, 0);

      expect(result).toHaveLength(1);
      expect(service.getDescendants).toHaveBeenCalledWith(TEST_CATEGORY_IDS.main, 0);
    });
  });

  describe('getCategoryPath', () => {
    it('should return path from root to category', async () => {
      const mockPath = ['Electronics', 'Computers', 'Laptops'];
      mockCategoriesService.getCategoryPath.mockResolvedValue(mockPath);

      const result = await controller.getCategoryPath(TEST_CATEGORY_IDS.main);

      expect(result).toEqual(mockPath);
      expect(result).toHaveLength(3);
      expect(service.getCategoryPath).toHaveBeenCalledWith(TEST_CATEGORY_IDS.main);
    });

    it('should return single item path for root category', async () => {
      const rootPath = ['Electronics'];
      mockCategoriesService.getCategoryPath.mockResolvedValue(rootPath);

      const result = await controller.getCategoryPath(TEST_CATEGORY_IDS.main);

      expect(result).toEqual(rootPath);
      expect(result).toHaveLength(1);
      expect(service.getCategoryPath).toHaveBeenCalledWith(TEST_CATEGORY_IDS.main);
    });

    it('should handle deep category hierarchies', async () => {
      const deepPath = ['Electronics', 'Computers', 'Laptops', 'Gaming Laptops', 'High-End Gaming'];
      mockCategoriesService.getCategoryPath.mockResolvedValue(deepPath);

      const result = await controller.getCategoryPath(TEST_CATEGORY_IDS.main);

      expect(result).toEqual(deepPath);
      expect(result).toHaveLength(5);
      expect(service.getCategoryPath).toHaveBeenCalledWith(TEST_CATEGORY_IDS.main);
    });

    it('should pass through NotFoundException when category not found', async () => {
      const error = new NotFoundException('Category not found');
      mockCategoriesService.getCategoryPath.mockRejectedValue(error);

      await expect(controller.getCategoryPath(TEST_CATEGORY_IDS.main)).rejects.toThrow(
        NotFoundException,
      );
      expect(service.getCategoryPath).toHaveBeenCalledWith(TEST_CATEGORY_IDS.main);
    });
  });
});
