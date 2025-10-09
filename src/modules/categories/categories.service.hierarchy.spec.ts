import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  createMockCategory,
  createMockCategoryRepository,
  createMockQueryBuilder,
} from './helpers/categories.test-helpers';

describe('CategoriesService - Hierarchy & Tree Operations', () => {
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

  describe('buildCategoryTree', () => {
    it('should build tree structure from flat categories', async () => {
      const parent = createMockCategory({ id: 'p1', name: 'Parent' });
      const child = createMockCategory({
        id: 'c1',
        name: 'Child',
        parentId: 'p1',
      });

      const mockQB = createMockQueryBuilder();
      mockQB['getMany'].mockResolvedValue([parent, child]);
      mockRepository.createQueryBuilder.mockReturnValue(mockQB as any);

      const result = await service.buildCategoryTree();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter by active status by default', async () => {
      const mockQB = createMockQueryBuilder();
      mockQB['getMany'].mockResolvedValue([]);
      mockRepository.createQueryBuilder.mockReturnValue(mockQB as any);

      await service.buildCategoryTree(false);

      expect(mockQB['andWhere']).toHaveBeenCalledWith(
        expect.stringContaining('isActive'),
        expect.objectContaining({ isActive: true }),
      );
    });

    it('should include inactive when specified', async () => {
      const mockQB = createMockQueryBuilder();
      mockQB['getMany'].mockResolvedValue([]);
      mockRepository.createQueryBuilder.mockReturnValue(mockQB as any);

      await service.buildCategoryTree(true);

      // Should NOT add isActive filter
      const calls = mockQB['andWhere'].mock.calls;
      expect(calls.length).toBe(0);
    });

    it('should return empty array when no categories exist', async () => {
      const mockQB = createMockQueryBuilder();
      mockQB['getMany'].mockResolvedValue([]);
      mockRepository.createQueryBuilder.mockReturnValue(mockQB as any);

      const result = await service.buildCategoryTree();

      expect(result).toEqual([]);
    });

    it('should order by sortOrder and name', async () => {
      const mockQB = createMockQueryBuilder();
      mockQB['getMany'].mockResolvedValue([]);
      mockRepository.createQueryBuilder.mockReturnValue(mockQB as any);

      await service.buildCategoryTree();

      expect(mockQB['orderBy']).toHaveBeenCalledWith('category.sortOrder', 'ASC');
      expect(mockQB['addOrderBy']).toHaveBeenCalledWith('category.name', 'ASC');
    });

    it('should throw BadRequestException on error', async () => {
      mockRepository.createQueryBuilder.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(service.buildCategoryTree()).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCategoryPath', () => {
    it('should return path for category', async () => {
      const grandparent = createMockCategory({
        id: 'gp',
        name: 'Grandparent',
      });
      const parent = createMockCategory({
        id: 'p',
        name: 'Parent',
        parentId: 'gp',
        parent: grandparent,
        getAncestors: () => [grandparent],
        getPath: () => ['Grandparent', 'Parent'],
      });
      const category = createMockCategory({
        id: 'c',
        name: 'Child',
        parentId: 'p',
        parent,
        getAncestors: () => [grandparent, parent],
        getPath: () => ['Grandparent', 'Parent', 'Child'],
      });

      // Mock findById to return correct category based on ID
      // This is needed because getCategoryPath now loads parents recursively
      jest.spyOn(service as any, 'findById').mockImplementation((id: unknown) => {
        if (id === 'c') return Promise.resolve(category);
        if (id === 'p') return Promise.resolve(parent);
        if (id === 'gp') return Promise.resolve(grandparent);
        return Promise.resolve(null);
      });

      const result = await service.getCategoryPath('c');

      expect(result).toEqual(['Grandparent', 'Parent', 'Child']);
    });

    it('should throw NotFoundException when category not found', async () => {
      jest.spyOn(service as any, 'findById').mockResolvedValue(null);

      await expect(service.getCategoryPath('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDescendants', () => {
    it('should return all descendants of a category', async () => {
      const category = createMockCategory({ id: 'parent' });
      const child1 = createMockCategory({ id: 'c1', parentId: 'parent' });
      const child2 = createMockCategory({ id: 'c2', parentId: 'parent' });

      jest.spyOn(service as any, 'findById').mockResolvedValue(category);
      jest.spyOn(service as any, 'findDescendants').mockResolvedValue([child1, child2]);

      const result = await service.getDescendants('parent');

      expect(result).toHaveLength(2);
      expect(service['findDescendants']).toHaveBeenCalledWith('parent', undefined);
    });

    it('should respect maxDepth parameter', async () => {
      const category = createMockCategory({ id: 'parent' });
      const child = createMockCategory({ id: 'c1', parentId: 'parent' });

      jest.spyOn(service as any, 'findById').mockResolvedValue(category);
      jest.spyOn(service as any, 'findDescendants').mockResolvedValue([child]);

      await service.getDescendants('parent', 1);

      expect(service['findDescendants']).toHaveBeenCalledWith('parent', 1);
    });

    it('should throw NotFoundException when category not found', async () => {
      jest.spyOn(service as any, 'findById').mockResolvedValue(null);

      await expect(service.getDescendants('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should return empty array when no descendants exist', async () => {
      const category = createMockCategory({ id: 'parent' });

      jest.spyOn(service as any, 'findById').mockResolvedValue(category);
      jest.spyOn(service as any, 'findDescendants').mockResolvedValue([]);

      const result = await service.getDescendants('parent');

      expect(result).toEqual([]);
    });
  });

  describe('validateHierarchy', () => {
    it('should throw if parent equals child', async () => {
      await expect(service.validateHierarchy('same-id', 'same-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if parent not found', async () => {
      jest.spyOn(service as any, 'findById').mockResolvedValueOnce(null); // parent not found

      await expect(service.validateHierarchy('parent-id', 'child-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if child not found', async () => {
      const parent = createMockCategory({ id: 'parent' });

      jest
        .spyOn(service as any, 'findById')
        .mockResolvedValueOnce(parent)
        .mockResolvedValueOnce(null); // child not found

      await expect(service.validateHierarchy('parent', 'child')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if creating circular hierarchy', async () => {
      const parent = createMockCategory({ id: 'p' });
      const child = createMockCategory({ id: 'c' });

      jest
        .spyOn(service as any, 'findById')
        .mockResolvedValueOnce(child) // trying to set child as parent
        .mockResolvedValueOnce(parent);
      jest
        .spyOn(service, 'getDescendants')
        .mockResolvedValue([child as any, { id: 'grandchild' } as any]);

      await expect(service.validateHierarchy('c', 'p')).rejects.toThrow(BadRequestException);
    });

    it('should allow valid parent-child relationship', async () => {
      const parent = createMockCategory({ id: 'parent' });
      const child = createMockCategory({ id: 'child' });

      jest
        .spyOn(service as any, 'findById')
        .mockResolvedValueOnce(parent)
        .mockResolvedValueOnce(child);
      jest.spyOn(service, 'getDescendants').mockResolvedValue([]);

      await expect(service.validateHierarchy('parent', 'child')).resolves.not.toThrow();
    });
  });

  describe('Private helper: buildTreeStructure', () => {
    it('should build tree from flat category list', () => {
      const parent = createMockCategory({ id: 'p1', name: 'Parent', sortOrder: 1 });
      const child1 = createMockCategory({
        id: 'c1',
        name: 'Child1',
        parentId: 'p1',
        sortOrder: 1,
      });
      const child2 = createMockCategory({
        id: 'c2',
        name: 'Child2',
        parentId: 'p1',
        sortOrder: 2,
      });

      const tree = service['buildTreeStructure']([parent, child1, child2]);

      expect(tree).toHaveLength(1);
      expect(tree[0]?.id).toBe('p1');
      expect(tree[0]?.children).toHaveLength(2);
    });

    it('should handle multiple root categories', () => {
      const root1 = createMockCategory({ id: 'r1', name: 'Root1' });
      const root2 = createMockCategory({ id: 'r2', name: 'Root2' });

      const tree = service['buildTreeStructure']([root1, root2]);

      expect(tree).toHaveLength(2);
    });

    it('should respect sortOrder', () => {
      const cat1 = createMockCategory({ id: 'c1', sortOrder: 3, name: 'C' });
      const cat2 = createMockCategory({ id: 'c2', sortOrder: 1, name: 'A' });
      const cat3 = createMockCategory({ id: 'c3', sortOrder: 2, name: 'B' });

      const tree = service['buildTreeStructure']([cat1, cat2, cat3]);

      expect(tree[0]?.id).toBe('c2'); // sortOrder 1
      expect(tree[1]?.id).toBe('c3'); // sortOrder 2
      expect(tree[2]?.id).toBe('c1'); // sortOrder 3
    });

    it('should sort alphabetically when sortOrder is same', () => {
      const cat1 = createMockCategory({ id: 'c1', sortOrder: 1, name: 'Zebra' });
      const cat2 = createMockCategory({ id: 'c2', sortOrder: 1, name: 'Apple' });

      const tree = service['buildTreeStructure']([cat1, cat2]);

      expect(tree[0]?.name).toBe('Apple');
      expect(tree[1]?.name).toBe('Zebra');
    });

    it('should handle deep hierarchies', () => {
      const l1 = createMockCategory({ id: 'l1', name: 'Level1' });
      const l2 = createMockCategory({ id: 'l2', name: 'Level2', parentId: 'l1' });
      const l3 = createMockCategory({ id: 'l3', name: 'Level3', parentId: 'l2' });

      const tree = service['buildTreeStructure']([l1, l2, l3]);

      expect(tree).toHaveLength(1);
      expect(tree[0]?.children).toHaveLength(1);
      expect(tree[0]?.children?.[0]?.children).toHaveLength(1);
    });

    it('should prevent infinite recursion at depth 10', () => {
      const categories = Array.from({ length: 15 }, (_, i) => {
        return createMockCategory({
          id: `l${i}`,
          name: `Level${i}`,
          parentId: i > 0 ? `l${i - 1}` : undefined,
        });
      });

      const tree = service['buildTreeStructure'](categories);

      // Should complete without stack overflow
      expect(tree).toBeDefined();
    });

    it('should set level property correctly', () => {
      const parent = createMockCategory({ id: 'p', name: 'Parent' });
      const child = createMockCategory({ id: 'c', name: 'Child', parentId: 'p' });

      const tree = service['buildTreeStructure']([parent, child]);

      expect(tree[0]?.level).toBe(0);
      expect(tree[0]?.children?.[0]?.level).toBe(1);
    });

    it('should set hasChildren property', () => {
      const parent = createMockCategory({ id: 'p', name: 'Parent' });
      const child = createMockCategory({ id: 'c', name: 'Child', parentId: 'p' });

      const tree = service['buildTreeStructure']([parent, child]);

      expect(tree[0]?.hasChildren).toBe(true);
      expect(tree[0]?.children?.[0]?.hasChildren).toBe(false);
    });
  });

  describe('Private helper: findDescendants', () => {
    it('should find all descendants recursively', async () => {
      const child1 = createMockCategory({ id: 'c1', parentId: 'parent' });
      const child2 = createMockCategory({ id: 'c2', parentId: 'parent' });
      const grandchild = createMockCategory({ id: 'gc1', parentId: 'c1' });

      const mockQB1 = createMockQueryBuilder();
      mockQB1['getMany'].mockResolvedValue([child1, child2]);

      const mockQB2 = createMockQueryBuilder();
      mockQB2['getMany'].mockResolvedValue([grandchild]);

      const mockQB3 = createMockQueryBuilder();
      mockQB3['getMany'].mockResolvedValue([]);

      mockRepository.createQueryBuilder
        .mockReturnValueOnce(mockQB1 as any)
        .mockReturnValueOnce(mockQB2 as any)
        .mockReturnValueOnce(mockQB3 as any);

      const result = await service['findDescendants']('parent');

      expect(result).toHaveLength(3);
      expect(result.map((c) => c.id)).toEqual(['c1', 'c2', 'gc1']);
    });

    it('should respect maxDepth parameter', async () => {
      const child = createMockCategory({ id: 'c1', parentId: 'parent' });

      const mockQB = createMockQueryBuilder();
      mockQB['getMany'].mockResolvedValue([child]);
      mockRepository.createQueryBuilder.mockReturnValue(mockQB as any);

      const result = await service['findDescendants']('parent', 1);

      expect(result).toHaveLength(1);
      // Should only query once (depth 1)
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no descendants exist', async () => {
      const mockQB = createMockQueryBuilder();
      mockQB['getMany'].mockResolvedValue([]);
      mockRepository.createQueryBuilder.mockReturnValue(mockQB as any);

      const result = await service['findDescendants']('parent');

      expect(result).toEqual([]);
    });

    it('should filter out soft-deleted categories', async () => {
      const mockQB = createMockQueryBuilder();
      mockQB['getMany'].mockResolvedValue([]);
      mockRepository.createQueryBuilder.mockReturnValue(mockQB as any);

      await service['findDescendants']('parent');

      expect(mockQB['andWhere']).toHaveBeenCalledWith(expect.stringContaining('deletedAt'));
    });
  });

  describe('Private helper: buildHierarchyForCategories', () => {
    it('should build hierarchy from flat list', async () => {
      const parent = createMockCategory({ id: 'p1', name: 'Parent' });
      const child1 = createMockCategory({ id: 'c1', parentId: 'p1' });
      const child2 = createMockCategory({ id: 'c2', parentId: 'p1' });

      const result = await service['buildHierarchyForCategories']([parent, child1, child2], 3);

      expect(result).toHaveLength(1);
      expect(result[0]?.children).toHaveLength(2);
    });

    it('should return only root categories', async () => {
      const root1 = createMockCategory({ id: 'r1' });
      const root2 = createMockCategory({ id: 'r2' });
      const child = createMockCategory({ id: 'c1', parentId: 'r1' });

      const result = await service['buildHierarchyForCategories']([root1, root2, child], 3);

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe('r1');
      expect(result[1]?.id).toBe('r2');
    });

    it('should handle empty input', async () => {
      const result = await service['buildHierarchyForCategories']([], 3);
      expect(result).toEqual([]);
    });

    it('should initialize children arrays', async () => {
      const category = createMockCategory({ id: 'c1' });
      const result = await service['buildHierarchyForCategories']([category], 3);

      expect(result[0]?.children).toEqual([]);
    });
  });
});
