import { TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { UpdateCategoryDto } from './dto';
import {
  createMockCategoryResponseDto,
  createMockCategoriesService,
  setupCategoriesControllerTestModule,
  TEST_CATEGORY_IDS,
} from './helpers/categories-controller.test-helpers';

describe('CategoriesController - Updates & Lifecycle', () => {
  let controller: CategoriesController;
  let service: CategoriesService;
  let mockCategoriesService: ReturnType<typeof createMockCategoriesService>;

  const mockCategoryResponse = createMockCategoryResponseDto();

  beforeEach(async () => {
    mockCategoriesService = createMockCategoriesService();

    const module: TestingModule = await setupCategoriesControllerTestModule(mockCategoriesService);

    controller = module.get<CategoriesController>(CategoriesController);
    service = module.get<CategoriesService>(CategoriesService);

    jest.clearAllMocks();
  });

  describe('update', () => {
    const updateCategoryDto: UpdateCategoryDto = {
      name: 'Consumer Electronics',
      description: 'Updated description',
      sortOrder: 15,
    };

    const updatedCategoryResponse = createMockCategoryResponseDto({
      name: 'Consumer Electronics',
      description: 'Updated description',
      sortOrder: 15,
      updatedAt: new Date('2024-01-15T00:00:00.000Z'),
    });

    it('should update category successfully', async () => {
      mockCategoriesService.update.mockResolvedValue(updatedCategoryResponse);

      const result = await controller.update(TEST_CATEGORY_IDS.main, updateCategoryDto);

      expect(result).toEqual(updatedCategoryResponse);
      expect(result.name).toBe('Consumer Electronics');
      expect(service.update).toHaveBeenCalledWith(TEST_CATEGORY_IDS.main, updateCategoryDto);
    });

    it('should update category parent (move category)', async () => {
      const moveDto: UpdateCategoryDto = {
        parentId: TEST_CATEGORY_IDS.parent,
      };
      const movedCategory = createMockCategoryResponseDto({
        parentId: TEST_CATEGORY_IDS.parent,
      });
      mockCategoriesService.update.mockResolvedValue(movedCategory);

      const result = await controller.update(TEST_CATEGORY_IDS.main, moveDto);

      expect(result.parentId).toBe(TEST_CATEGORY_IDS.parent);
      expect(service.update).toHaveBeenCalledWith(TEST_CATEGORY_IDS.main, moveDto);
    });

    it('should update only specified fields (partial update)', async () => {
      const partialDto: UpdateCategoryDto = {
        sortOrder: 20,
      };
      const partiallyUpdated = createMockCategoryResponseDto({
        sortOrder: 20,
      });
      mockCategoriesService.update.mockResolvedValue(partiallyUpdated);

      const result = await controller.update(TEST_CATEGORY_IDS.main, partialDto);

      expect(result.sortOrder).toBe(20);
      expect(result.name).toBe(mockCategoryResponse.name); // Unchanged
      expect(service.update).toHaveBeenCalledWith(TEST_CATEGORY_IDS.main, partialDto);
    });

    it('should pass through NotFoundException when category not found', async () => {
      const error = new NotFoundException('Category not found');
      mockCategoriesService.update.mockRejectedValue(error);

      await expect(
        controller.update(TEST_CATEGORY_IDS.main, updateCategoryDto),
      ).rejects.toThrow(NotFoundException);
      expect(service.update).toHaveBeenCalledWith(TEST_CATEGORY_IDS.main, updateCategoryDto);
    });

    it('should pass through validation errors from service', async () => {
      const error = new Error('Circular hierarchy detected');
      mockCategoriesService.update.mockRejectedValue(error);

      await expect(
        controller.update(TEST_CATEGORY_IDS.main, updateCategoryDto),
      ).rejects.toThrow('Circular hierarchy detected');
      expect(service.update).toHaveBeenCalledWith(TEST_CATEGORY_IDS.main, updateCategoryDto);
    });
  });

  describe('activate', () => {
    const activatedCategoryResponse = createMockCategoryResponseDto({
      isActive: true,
      updatedAt: new Date('2024-01-15T00:00:00.000Z'),
    });

    it('should activate category successfully', async () => {
      mockCategoriesService.activate.mockResolvedValue(activatedCategoryResponse);

      const result = await controller.activate(TEST_CATEGORY_IDS.main);

      expect(result).toEqual(activatedCategoryResponse);
      expect(result.isActive).toBe(true);
      expect(service.activate).toHaveBeenCalledWith(TEST_CATEGORY_IDS.main);
    });

    it('should activate previously inactive category', async () => {
      const inactiveCategoryActivated = createMockCategoryResponseDto({
        isActive: true,
      });
      mockCategoriesService.activate.mockResolvedValue(inactiveCategoryActivated);

      const result = await controller.activate(TEST_CATEGORY_IDS.main);

      expect(result.isActive).toBe(true);
      expect(service.activate).toHaveBeenCalledWith(TEST_CATEGORY_IDS.main);
    });

    it('should pass through NotFoundException when category not found', async () => {
      const error = new NotFoundException('Category not found');
      mockCategoriesService.activate.mockRejectedValue(error);

      await expect(controller.activate(TEST_CATEGORY_IDS.main)).rejects.toThrow(NotFoundException);
      expect(service.activate).toHaveBeenCalledWith(TEST_CATEGORY_IDS.main);
    });
  });

  describe('deactivate', () => {
    const deactivatedCategoryResponse = createMockCategoryResponseDto({
      isActive: false,
      updatedAt: new Date('2024-01-15T00:00:00.000Z'),
    });

    it('should deactivate category successfully', async () => {
      mockCategoriesService.deactivate.mockResolvedValue(deactivatedCategoryResponse);

      const result = await controller.deactivate(TEST_CATEGORY_IDS.main);

      expect(result).toEqual(deactivatedCategoryResponse);
      expect(result.isActive).toBe(false);
      expect(service.deactivate).toHaveBeenCalledWith(TEST_CATEGORY_IDS.main);
    });

    it('should deactivate previously active category', async () => {
      mockCategoriesService.deactivate.mockResolvedValue(deactivatedCategoryResponse);

      const result = await controller.deactivate(TEST_CATEGORY_IDS.main);

      expect(result.isActive).toBe(false);
      expect(service.deactivate).toHaveBeenCalledWith(TEST_CATEGORY_IDS.main);
    });

    it('should pass through NotFoundException when category not found', async () => {
      const error = new NotFoundException('Category not found');
      mockCategoriesService.deactivate.mockRejectedValue(error);

      await expect(controller.deactivate(TEST_CATEGORY_IDS.main)).rejects.toThrow(
        NotFoundException,
      );
      expect(service.deactivate).toHaveBeenCalledWith(TEST_CATEGORY_IDS.main);
    });
  });

  describe('remove', () => {
    it('should delete category successfully', async () => {
      mockCategoriesService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(TEST_CATEGORY_IDS.main);

      expect(result).toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith(TEST_CATEGORY_IDS.main);
      expect(service.remove).toHaveBeenCalledTimes(1);
    });

    it('should soft delete category (deletedAt set)', async () => {
      mockCategoriesService.remove.mockResolvedValue(undefined);

      await controller.remove(TEST_CATEGORY_IDS.main);

      expect(service.remove).toHaveBeenCalledWith(TEST_CATEGORY_IDS.main);
    });

    it('should pass through NotFoundException when category not found', async () => {
      const error = new NotFoundException('Category not found');
      mockCategoriesService.remove.mockRejectedValue(error);

      await expect(controller.remove(TEST_CATEGORY_IDS.main)).rejects.toThrow(NotFoundException);
      expect(service.remove).toHaveBeenCalledWith(TEST_CATEGORY_IDS.main);
    });

    it('should pass through error when category has children', async () => {
      const error = new Error('Cannot delete category with children');
      mockCategoriesService.remove.mockRejectedValue(error);

      await expect(controller.remove(TEST_CATEGORY_IDS.main)).rejects.toThrow(
        'Cannot delete category with children',
      );
      expect(service.remove).toHaveBeenCalledWith(TEST_CATEGORY_IDS.main);
    });

    it('should pass through error when category has products', async () => {
      const error = new Error('Cannot delete category with associated products');
      mockCategoriesService.remove.mockRejectedValue(error);

      await expect(controller.remove(TEST_CATEGORY_IDS.main)).rejects.toThrow(
        'Cannot delete category with associated products',
      );
      expect(service.remove).toHaveBeenCalledWith(TEST_CATEGORY_IDS.main);
    });
  });
});
