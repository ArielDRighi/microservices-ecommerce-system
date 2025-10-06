import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import {
  createMockCategory,
  createMockCreateCategoryDto,
  createMockCategoryRepository,
  createMockQueryBuilder,
  setupCategoriesTestModule,
} from './helpers/categories.test-helpers';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto';

describe('CategoriesService - CRUD Operations', () => {
  let service: CategoriesService;
  const mockRepository = createMockCategoryRepository();
  const mockQueryBuilder = createMockQueryBuilder();

  beforeEach(async () => {
    mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    const testModule = await setupCategoriesTestModule(mockRepository);
    service = testModule.service;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have repository injected', () => {
      expect(mockRepository).toBeDefined();
    });
  });

  describe('create', () => {
    const createCategoryDto: CreateCategoryDto = createMockCreateCategoryDto();

    it('should create a category successfully', async () => {
      const newCategory = createMockCategory({
        id: 'new-123',
        name: createCategoryDto.name,
        slug: 'electronics',
        description: createCategoryDto.description,
      });

      jest.spyOn(service, 'findBySlug').mockResolvedValue(null);
      jest.spyOn(service as any, 'validateUniqueNameInLevel').mockResolvedValue(undefined);

      mockRepository.create.mockReturnValue(newCategory);
      mockRepository.save.mockResolvedValue(newCategory);
      jest.spyOn(service, 'findOne').mockResolvedValue(newCategory as any);

      const result = await service.create(createCategoryDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('new-123');
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should generate slug from name if not provided', async () => {
      const category = createMockCategory({ name: 'Test Category!' });

      jest.spyOn(service, 'findBySlug').mockResolvedValue(null);
      jest.spyOn(service as any, 'validateUniqueNameInLevel').mockResolvedValue(undefined);
      mockRepository.create.mockReturnValue(category);
      mockRepository.save.mockResolvedValue(category);
      jest.spyOn(service, 'findOne').mockResolvedValue(category as any);

      await service.create({ name: 'Test Category!' });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'test-category',
        }),
      );
    });

    it('should use provided slug if given', async () => {
      const dto = { name: 'Test', slug: 'custom-slug' };
      const category = createMockCategory({ ...dto });

      jest.spyOn(service, 'findBySlug').mockResolvedValue(null);
      jest.spyOn(service as any, 'validateUniqueNameInLevel').mockResolvedValue(undefined);
      mockRepository.create.mockReturnValue(category);
      mockRepository.save.mockResolvedValue(category);
      jest.spyOn(service, 'findOne').mockResolvedValue(category as any);

      await service.create(dto);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'custom-slug' }),
      );
    });

    it('should throw ConflictException if slug already exists', async () => {
      const existingCategory = createMockCategory({ slug: 'existing-slug' });

      jest.spyOn(service, 'findBySlug').mockResolvedValue(existingCategory as any);

      await expect(service.create({ name: 'Test', slug: 'existing-slug' })).rejects.toThrow(
        ConflictException,
      );

      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should validate parent exists if parentId provided', async () => {
      const parentCategory = createMockCategory({ id: 'parent-123' });
      const dto = { name: 'Child', parentId: 'parent-123' };

      jest.spyOn(service, 'findBySlug').mockResolvedValue(null);
      jest.spyOn(service as any, 'findById').mockResolvedValue(parentCategory);
      jest.spyOn(service as any, 'validateUniqueNameInLevel').mockResolvedValue(undefined);

      const newCategory = createMockCategory({ ...dto });
      mockRepository.create.mockReturnValue(newCategory);
      mockRepository.save.mockResolvedValue(newCategory);
      jest.spyOn(service, 'findOne').mockResolvedValue(newCategory as any);

      await service.create(dto);

      expect(service['findById']).toHaveBeenCalledWith('parent-123', {
        includeInactive: true,
      });
    });

    it('should throw BadRequestException if parent not found', async () => {
      const dto = { name: 'Child', parentId: 'non-existent' };

      jest.spyOn(service, 'findBySlug').mockResolvedValue(null);
      jest.spyOn(service as any, 'findById').mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should validate unique name within same level', async () => {
      const dto = { name: 'Category', parentId: 'parent-123' };

      jest.spyOn(service, 'findBySlug').mockResolvedValue(null);
      jest.spyOn(service as any, 'findById').mockResolvedValue(createMockCategory());
      jest
        .spyOn(service as any, 'validateUniqueNameInLevel')
        .mockRejectedValue(new ConflictException('Name exists at this level'));

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException on database error', async () => {
      jest.spyOn(service, 'findBySlug').mockResolvedValue(null);
      jest.spyOn(service as any, 'validateUniqueNameInLevel').mockResolvedValue(undefined);
      mockRepository.create.mockReturnValue(createMockCategory());
      mockRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.create(createCategoryDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return category with computed properties', async () => {
      const category = createMockCategory({
        id: 'cat-123',
        name: 'Electronics',
      });

      jest.spyOn(service as any, 'findById').mockResolvedValue(category);

      const result = await service.findOne('cat-123');

      expect(result).toBeDefined();
      expect(service['findById']).toHaveBeenCalledWith('cat-123', {
        includeRelations: true,
      });
      expect(category.getLevel).toHaveBeenCalled();
      expect(category.getPath).toHaveBeenCalled();
    });

    it('should throw NotFoundException when category not found', async () => {
      jest.spyOn(service as any, 'findById').mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBySlug', () => {
    it('should handle database errors gracefully', async () => {
      mockQueryBuilder.getOne.mockRejectedValue(new Error('Database error'));

      const result = await service.findBySlug('test-slug');

      expect(result).toBeNull();
    });

    it('should be callable with slug parameter', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const result = await service.findBySlug('test-slug');

      expect(result).toBe(null);
    });
  });
});
