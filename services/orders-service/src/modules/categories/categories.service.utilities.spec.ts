import { ConflictException } from '@nestjs/common';
import {
  createMockCategory,
  createMockCategoryRepository,
  createMockProductRepository,
  createMockQueryBuilder,
  setupCategoriesTestModule,
} from './helpers/categories.test-helpers';

describe('CategoriesService - Utilities & Helpers', () => {
  let service: any;
  let mockRepository: ReturnType<typeof createMockCategoryRepository>;
  let mockProductRepository: ReturnType<typeof createMockProductRepository>;

  beforeEach(async () => {
    mockRepository = createMockCategoryRepository();
    mockProductRepository = createMockProductRepository();

    const testModule = await setupCategoriesTestModule(mockRepository, mockProductRepository);
    service = testModule.service;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSlug', () => {
    it('should convert name to lowercase slug', () => {
      const slug = service.generateSlug('Test Category');
      expect(slug).toBe('test-category');
    });

    it('should replace spaces with hyphens', () => {
      const slug = service.generateSlug('Multiple Word Category');
      expect(slug).toBe('multiple-word-category');
    });

    it('should remove special characters', () => {
      const slug = service.generateSlug('Category! With @ Special # Characters');
      expect(slug).toBe('category-with-special-characters');
    });

    it('should handle underscores', () => {
      const slug = service.generateSlug('category_with_underscores');
      expect(slug).toBe('category-with-underscores');
    });

    it('should remove leading and trailing hyphens', () => {
      const slug = service.generateSlug('  --test--  ');
      expect(slug).toBe('test');
    });

    it('should handle multiple consecutive hyphens', () => {
      const slug = service.generateSlug('test---category');
      expect(slug).toBe('test-category');
    });

    it('should handle empty string', () => {
      const slug = service.generateSlug('');
      expect(slug).toBe('');
    });

    it('should handle string with only special characters', () => {
      const slug = service.generateSlug('!@#$%');
      expect(slug).toBe('');
    });
  });

  describe('Private helper: findById', () => {
    it('should find category by ID with default options', async () => {
      const category = createMockCategory({ id: 'cat-123' });
      const mockQB = createMockQueryBuilder();
      mockQB['getOne'].mockResolvedValue(category);
      mockRepository.createQueryBuilder.mockReturnValue(mockQB as any);

      const result = await service['findById']('cat-123');

      expect(mockQB['where']).toHaveBeenCalledWith('category.id = :id', {
        id: 'cat-123',
      });
      expect(mockQB['andWhere']).toHaveBeenCalledWith(expect.stringContaining('deletedAt'));
      expect(result).toBe(category);
    });

    it('should include relations when specified', async () => {
      const mockQB = createMockQueryBuilder();
      mockQB['getOne'].mockResolvedValue(createMockCategory());
      mockRepository.createQueryBuilder.mockReturnValue(mockQB as any);

      await service['findById']('cat-123', { includeRelations: true });

      expect(mockQB['leftJoinAndSelect']).toHaveBeenCalledWith('category.parent', 'parent');
      expect(mockQB['leftJoinAndSelect']).toHaveBeenCalledWith('category.children', 'children');
    });

    it('should include inactive when specified', async () => {
      const mockQB = createMockQueryBuilder();
      mockQB['getOne'].mockResolvedValue(createMockCategory());
      mockRepository.createQueryBuilder.mockReturnValue(mockQB as any);

      await service['findById']('cat-123', { includeInactive: true });

      const calls = mockQB['andWhere'].mock.calls.map((call) => call[0]);
      const hasActiveFilter = calls.some(
        (call) => typeof call === 'string' && call.includes('isActive'),
      );
      expect(hasActiveFilter).toBe(false);
    });

    it('should include deleted when specified', async () => {
      const mockQB = createMockQueryBuilder();
      mockQB['getOne'].mockResolvedValue(createMockCategory());
      mockRepository.createQueryBuilder.mockReturnValue(mockQB as any);

      await service['findById']('cat-123', { includeDeleted: true });

      const calls = mockQB['andWhere'].mock.calls.map((call) => call[0]);
      const hasDeletedFilter = calls.some(
        (call) => typeof call === 'string' && call.includes('deletedAt'),
      );
      expect(hasDeletedFilter).toBe(false);
    });
  });

  describe('Private helper: validateUniqueNameInLevel', () => {
    it('should pass when name is unique at level', async () => {
      const mockQB = createMockQueryBuilder();
      mockQB['getOne'].mockResolvedValue(null); // No existing category
      mockRepository.createQueryBuilder.mockReturnValue(mockQB as any);

      await expect(
        service['validateUniqueNameInLevel']('Unique Name', undefined),
      ).resolves.not.toThrow();
    });

    it('should throw ConflictException when name exists at same level', async () => {
      const existing = createMockCategory({ name: 'Duplicate' });
      const mockQB = createMockQueryBuilder();
      mockQB['getOne'].mockResolvedValue(existing);
      mockRepository.createQueryBuilder.mockReturnValue(mockQB as any);

      await expect(service['validateUniqueNameInLevel']('Duplicate', undefined)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should check root level when parentId is null', async () => {
      const mockQB = createMockQueryBuilder();
      mockQB['getOne'].mockResolvedValue(null);
      mockRepository.createQueryBuilder.mockReturnValue(mockQB as any);

      await service['validateUniqueNameInLevel']('Test', undefined);

      expect(mockQB['andWhere']).toHaveBeenCalledWith(expect.stringContaining('parentId IS NULL'));
    });

    it('should check specific parent level when parentId provided', async () => {
      const mockQB = createMockQueryBuilder();
      mockQB['getOne'].mockResolvedValue(null);
      mockRepository.createQueryBuilder.mockReturnValue(mockQB as any);

      await service['validateUniqueNameInLevel']('Test', 'parent-123');

      expect(mockQB['andWhere']).toHaveBeenCalledWith(
        expect.stringContaining('parentId'),
        expect.objectContaining({ parentId: 'parent-123' }),
      );
    });

    it('should exclude specific category ID when provided', async () => {
      const mockQB = createMockQueryBuilder();
      mockQB['getOne'].mockResolvedValue(null);
      mockRepository.createQueryBuilder.mockReturnValue(mockQB as any);

      await service['validateUniqueNameInLevel']('Test', undefined, 'exclude-123');

      expect(mockQB['andWhere']).toHaveBeenCalledWith(
        expect.stringContaining('id !='),
        expect.objectContaining({ excludeId: 'exclude-123' }),
      );
    });
  });
});
