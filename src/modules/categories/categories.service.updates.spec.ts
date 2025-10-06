import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UpdateResult } from 'typeorm';
import {
  createMockCategory,
  createMockUpdateCategoryDto,
  createMockCategoryRepository,
} from './helpers/categories.test-helpers';
import { UpdateCategoryDto } from './dto';

describe('CategoriesService - Updates & Status Changes', () => {
  let service: CategoriesService;
  let mockRepository: ReturnType<typeof createMockCategoryRepository>;

  beforeEach(async () => {
    mockRepository = createMockCategoryRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getRepositoryToken(Category),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('update', () => {
    const updateDto: UpdateCategoryDto = {
      name: 'Updated Name',
      description: 'Updated description',
    };

    it('should update category successfully', async () => {
      const existingCategory = createMockCategory({ id: 'cat-123' });
      const updatedCategory = createMockCategory({
        ...existingCategory,
        ...updateDto,
      });

      jest.spyOn(service as any, 'findById').mockResolvedValue(existingCategory);
      jest.spyOn(service as any, 'validateUniqueNameInLevel').mockResolvedValue(undefined);
      mockRepository.save.mockResolvedValue(updatedCategory);
      jest.spyOn(service, 'findOne').mockResolvedValue(updatedCategory as any);

      const result = await service.update('cat-123', updateDto);

      expect(result).toBeDefined();
      expect(mockRepository.merge).toHaveBeenCalledWith(existingCategory, updateDto);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when category not found', async () => {
      jest.spyOn(service as any, 'findById').mockResolvedValue(null);

      await expect(service.update('non-existent', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should validate hierarchy when updating parentId', async () => {
      const category = createMockCategory({ id: 'cat-123' });
      const dto = { parentId: 'new-parent' };

      jest.spyOn(service as any, 'findById').mockResolvedValue(category);
      jest.spyOn(service, 'validateHierarchy').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'validateUniqueNameInLevel').mockResolvedValue(undefined);
      mockRepository.save.mockResolvedValue(category);
      jest.spyOn(service, 'findOne').mockResolvedValue(category as any);

      await service.update('cat-123', dto);

      expect(service.validateHierarchy).toHaveBeenCalledWith('new-parent', 'cat-123');
    });

    it('should validate unique slug when updating', async () => {
      const category = createMockCategory({ id: 'cat-123', slug: 'old-slug' });
      const dto = { slug: 'new-slug' };

      jest.spyOn(service as any, 'findById').mockResolvedValue(category);
      jest.spyOn(service, 'findBySlug').mockResolvedValue(null);
      jest.spyOn(service as any, 'validateUniqueNameInLevel').mockResolvedValue(undefined);
      mockRepository.save.mockResolvedValue(createMockCategory({ ...category, ...dto }));
      jest.spyOn(service, 'findOne').mockResolvedValue({ ...category, ...dto } as any);

      await service.update('cat-123', dto);

      expect(service.findBySlug).toHaveBeenCalledWith('new-slug');
    });

    it('should throw ConflictException if new slug exists', async () => {
      const category = createMockCategory({ id: 'cat-123', slug: 'old-slug' });
      const existingWithSlug = createMockCategory({
        id: 'other-123',
        slug: 'new-slug',
      });

      jest.spyOn(service as any, 'findById').mockResolvedValue(category);
      jest.spyOn(service, 'findBySlug').mockResolvedValue(existingWithSlug as any);

      await expect(service.update('cat-123', { slug: 'new-slug' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should allow same slug for same category', async () => {
      const category = createMockCategory({ id: 'cat-123', slug: 'test-slug' });

      jest.spyOn(service as any, 'findById').mockResolvedValue(category);
      jest.spyOn(service, 'findBySlug').mockResolvedValue(category as any);
      jest.spyOn(service as any, 'validateUniqueNameInLevel').mockResolvedValue(undefined);
      mockRepository.save.mockResolvedValue(category);
      jest.spyOn(service, 'findOne').mockResolvedValue(category as any);

      await expect(service.update('cat-123', { slug: 'test-slug' })).resolves.toBeDefined();
    });

    it('should validate unique name when updating name', async () => {
      const category = createMockCategory({ id: 'cat-123', name: 'Old Name' });
      const dto = { name: 'New Name' };

      jest.spyOn(service as any, 'findById').mockResolvedValue(category);
      jest.spyOn(service as any, 'validateUniqueNameInLevel').mockResolvedValue(undefined);
      mockRepository.save.mockResolvedValue(createMockCategory({ ...category, ...dto }));
      jest.spyOn(service, 'findOne').mockResolvedValue({ ...category, ...dto } as any);

      await service.update('cat-123', dto);

      expect(service['validateUniqueNameInLevel']).toHaveBeenCalledWith(
        'New Name',
        category.parentId,
        'cat-123',
      );
    });

    it('should throw BadRequestException on database error', async () => {
      const category = createMockCategory({ id: 'cat-123' });

      jest.spyOn(service as any, 'findById').mockResolvedValue(category);
      jest.spyOn(service as any, 'validateUniqueNameInLevel').mockResolvedValue(undefined);
      mockRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.update('cat-123', updateDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should soft delete category successfully', async () => {
      const category = createMockCategory({ id: 'cat-123' });

      jest.spyOn(service as any, 'findById').mockResolvedValue(category);
      mockRepository.count.mockResolvedValue(0); // No children
      mockRepository.softDelete.mockResolvedValue({ affected: 1, raw: {} } as any);

      await service.remove('cat-123');

      expect(mockRepository.softDelete).toHaveBeenCalledWith('cat-123');
    });

    it('should throw NotFoundException when category not found', async () => {
      jest.spyOn(service as any, 'findById').mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if category has children', async () => {
      const category = createMockCategory({ id: 'cat-123' });

      jest.spyOn(service as any, 'findById').mockResolvedValue(category);
      mockRepository.count.mockResolvedValue(2); // Has 2 children

      await expect(service.remove('cat-123')).rejects.toThrow(BadRequestException);
      expect(mockRepository.softDelete).not.toHaveBeenCalled();
    });

    it('should check for children before deletion', async () => {
      const category = createMockCategory({ id: 'cat-123' });

      jest.spyOn(service as any, 'findById').mockResolvedValue(category);
      mockRepository.count.mockResolvedValue(0);
      mockRepository.softDelete.mockResolvedValue({ affected: 1, raw: {} } as any);

      await service.remove('cat-123');

      expect(mockRepository.count).toHaveBeenCalledWith({
        where: { parentId: 'cat-123', deletedAt: expect.anything() },
      });
    });

    it('should throw BadRequestException on database error', async () => {
      const category = createMockCategory({ id: 'cat-123' });

      jest.spyOn(service as any, 'findById').mockResolvedValue(category);
      mockRepository.count.mockResolvedValue(0);
      mockRepository.softDelete.mockRejectedValue(new Error('Database error'));

      await expect(service.remove('cat-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('activate', () => {
    it('should activate category successfully', async () => {
      const category = createMockCategory({ id: 'cat-123', isActive: false });
      const activatedCategory = { ...category, isActive: true };

      jest
        .spyOn(service as any, 'findById')
        .mockResolvedValueOnce(category)
        .mockResolvedValueOnce(activatedCategory);
      mockRepository.update.mockResolvedValue({} as UpdateResult);

      const result = await service.activate('cat-123');

      expect(mockRepository.update).toHaveBeenCalledWith('cat-123', {
        isActive: true,
      });
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when category not found', async () => {
      jest.spyOn(service as any, 'findById').mockResolvedValue(null);

      await expect(service.activate('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate', () => {
    it('should deactivate category successfully', async () => {
      const category = createMockCategory({ id: 'cat-123', isActive: true });
      const deactivatedCategory = { ...category, isActive: false };

      jest
        .spyOn(service as any, 'findById')
        .mockResolvedValueOnce(category)
        .mockResolvedValueOnce(deactivatedCategory);
      mockRepository.update.mockResolvedValue({} as UpdateResult);

      const result = await service.deactivate('cat-123');

      expect(mockRepository.update).toHaveBeenCalledWith('cat-123', {
        isActive: false,
      });
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when category not found', async () => {
      jest.spyOn(service as any, 'findById').mockResolvedValue(null);

      await expect(service.deactivate('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
