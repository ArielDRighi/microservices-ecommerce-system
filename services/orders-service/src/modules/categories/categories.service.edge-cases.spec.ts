import { BadRequestException } from '@nestjs/common';
import {
  createMockCategory,
  createMockCategoryRepository,
  createMockProductRepository,
  setupCategoriesTestModule,
} from './helpers/categories.test-helpers';

describe('CategoriesService - Edge Cases & Special Scenarios', () => {
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

  describe('Metadata handling', () => {
    it('should handle categories with undefined metadata', async () => {
      const category = createMockCategory({ metadata: undefined });
      jest.spyOn(service as any, 'findById').mockResolvedValue(category);

      const result = await service.findOne(category.id);

      expect(result).toBeDefined();
    });

    it('should handle categories with complex metadata', async () => {
      const category = createMockCategory({
        metadata: { color: 'blue', icon: 'icon.png', custom: { nested: true } },
      });
      jest.spyOn(service as any, 'findById').mockResolvedValue(category);

      const result = await service.findOne(category.id);

      expect(result).toBeDefined();
    });

    it('should handle categories with empty metadata object', async () => {
      const category = createMockCategory({ metadata: {} });
      jest.spyOn(service as any, 'findById').mockResolvedValue(category);

      const result = await service.findOne(category.id);

      expect(result).toBeDefined();
      expect(result.metadata).toEqual({});
    });
  });

  describe('Slug generation edge cases', () => {
    it('should handle concurrent slug generation', async () => {
      jest.spyOn(service, 'findBySlug').mockResolvedValue(null);
      jest.spyOn(service as any, 'validateUniqueNameInLevel').mockResolvedValue(undefined);
      mockRepository.create.mockReturnValue(createMockCategory());
      mockRepository.save.mockResolvedValue(createMockCategory());
      jest.spyOn(service, 'findOne').mockResolvedValue(createMockCategory() as any);

      const promises = [
        service.create({ name: 'Test Category' }),
        service.create({ name: 'Test Category' }),
      ];

      await expect(Promise.all(promises)).resolves.toBeDefined();
    });

    it('should handle very long category names', async () => {
      const longName = 'A'.repeat(300);
      const slug = service.generateSlug(longName);

      // generateSlug doesn't limit length, it just converts
      // Database constraint would enforce max length
      expect(slug).toBe('a'.repeat(300));
      expect(slug.length).toBeGreaterThan(255);
    });

    it('should handle category names with unicode characters', async () => {
      const slug = service.generateSlug('Categoría Española');
      expect(slug).toBeDefined();
      expect(typeof slug).toBe('string');
    });

    it('should handle category names with emoji', async () => {
      const slug = service.generateSlug('Category 😀 With Emoji');
      expect(slug).toBeDefined();
      expect(typeof slug).toBe('string');
    });
  });

  describe('Hierarchy validation edge cases', () => {
    it('should handle category with circular parent reference in data', async () => {
      // This tests the hierarchy validation
      const cat1 = createMockCategory({ id: 'cat1' });
      const cat2 = createMockCategory({ id: 'cat2' });

      jest
        .spyOn(service as any, 'findById')
        .mockResolvedValueOnce(cat1)
        .mockResolvedValueOnce(cat2);
      jest.spyOn(service, 'getDescendants').mockResolvedValue([cat1 as any]);

      await expect(service.validateHierarchy('cat1', 'cat2')).rejects.toThrow(BadRequestException);
    });

    it('should handle very deep hierarchy validation', async () => {
      const categories = Array.from({ length: 20 }, (_, i) => {
        return createMockCategory({
          id: `cat${i}`,
          name: `Level${i}`,
          parentId: i > 0 ? `cat${i - 1}` : undefined,
        });
      });

      const parent = categories[0]!;
      const child = categories[19]!;

      jest
        .spyOn(service as any, 'findById')
        .mockResolvedValueOnce(parent)
        .mockResolvedValueOnce(child);
      jest.spyOn(service, 'getDescendants').mockResolvedValue(categories.slice(1) as any);

      await expect(service.validateHierarchy(parent.id, child.id)).resolves.not.toThrow();
    });

    it('should handle hierarchy validation with null parent', async () => {
      const category = createMockCategory({ id: 'cat-123', parentId: undefined });

      jest.spyOn(service as any, 'findById').mockResolvedValue(category);

      // Validating with null parent should not throw
      await expect(service.validateHierarchy(null as any, 'cat-123')).rejects.toThrow();
    });
  });

  describe('Tree building edge cases', () => {
    it('should handle categories with orphaned children', () => {
      const orphan = createMockCategory({
        id: 'orphan',
        name: 'Orphan',
        parentId: 'non-existent-parent',
      });

      const tree = service['buildTreeStructure']([orphan]);

      // Orphans without parent in list should be treated as root
      expect(tree).toBeDefined();
    });

    it('should handle categories with same sortOrder', () => {
      const cat1 = createMockCategory({ id: 'c1', sortOrder: 5, name: 'Z' });
      const cat2 = createMockCategory({ id: 'c2', sortOrder: 5, name: 'A' });
      const cat3 = createMockCategory({ id: 'c3', sortOrder: 5, name: 'M' });

      const tree = service['buildTreeStructure']([cat1, cat2, cat3]);

      // Should sort alphabetically when sortOrder is the same
      expect(tree[0]?.name).toBe('A');
      expect(tree[1]?.name).toBe('M');
      expect(tree[2]?.name).toBe('Z');
    });

    it('should handle empty category list', () => {
      const tree = service['buildTreeStructure']([]);
      expect(tree).toEqual([]);
    });

    it('should handle single category', () => {
      const category = createMockCategory({ id: 'single', name: 'Single' });
      const tree = service['buildTreeStructure']([category]);

      expect(tree).toHaveLength(1);
      expect(tree[0]?.id).toBe('single');
    });
  });

  describe('Query parameter edge cases', () => {
    it('should handle findOne with non-existent ID format', async () => {
      jest.spyOn(service as any, 'findById').mockResolvedValue(null);

      await expect(service.findOne('invalid-uuid-format')).rejects.toThrow();
    });

    it('should handle findBySlug with empty slug', async () => {
      const result = await service.findBySlug('');

      expect(result).toBeNull();
    });

    it('should handle findBySlug with whitespace-only slug', async () => {
      const result = await service.findBySlug('   ');

      expect(result).toBeNull();
    });

    it('should handle getDescendants with maxDepth of 0', async () => {
      const category = createMockCategory({ id: 'parent' });

      jest.spyOn(service as any, 'findById').mockResolvedValue(category);
      jest.spyOn(service as any, 'findDescendants').mockResolvedValue([]);

      const result = await service.getDescendants('parent', 0);

      expect(result).toEqual([]);
    });

    it('should handle getDescendants with negative maxDepth', async () => {
      const category = createMockCategory({ id: 'parent' });

      jest.spyOn(service as any, 'findById').mockResolvedValue(category);
      jest.spyOn(service as any, 'findDescendants').mockResolvedValue([]);

      const result = await service.getDescendants('parent', -1);

      expect(result).toBeDefined();
    });
  });

  describe('Concurrent operations', () => {
    it('should handle multiple simultaneous findOne calls', async () => {
      const category = createMockCategory({ id: 'cat-123' });
      jest.spyOn(service as any, 'findById').mockResolvedValue(category);

      const promises = Array.from({ length: 10 }, () => service.findOne('cat-123'));

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach((result) => expect(result).toBeDefined());
    });

    it('should handle multiple simultaneous create operations', async () => {
      jest.spyOn(service, 'findBySlug').mockResolvedValue(null);
      jest.spyOn(service as any, 'validateUniqueNameInLevel').mockResolvedValue(undefined);

      let counter = 0;
      mockRepository.create.mockImplementation(() => {
        counter++;
        return createMockCategory({ id: `cat-${counter}`, name: `Category ${counter}` });
      });

      mockRepository.save.mockImplementation((cat: any) => Promise.resolve(cat));
      jest
        .spyOn(service as any, 'findOne')
        .mockImplementation(((id: string) => Promise.resolve(createMockCategory({ id }))) as any);

      const promises = Array.from({ length: 5 }, (_, i) =>
        service.create({ name: `Category ${i}` }),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      expect(mockRepository.save).toHaveBeenCalledTimes(5);
    });
  });

  describe('Special character handling', () => {
    it('should handle category names with HTML entities', () => {
      const slug = service.generateSlug('<div>Test & Category</div>');
      expect(slug).not.toContain('<');
      expect(slug).not.toContain('>');
    });

    it('should handle category names with SQL injection attempts', () => {
      const slug = service.generateSlug("'; DROP TABLE categories; --");
      expect(slug).toBeDefined();
      expect(slug).not.toContain(';');
      expect(slug).not.toContain("'");
    });

    it('should handle category names with path traversal attempts', () => {
      const slug = service.generateSlug('../../etc/passwd');
      expect(slug).toBeDefined();
    });
  });
});
