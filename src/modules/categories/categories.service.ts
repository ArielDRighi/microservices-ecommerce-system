import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, IsNull } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { Category } from './entities/category.entity';
import { Product } from '../products/entities/product.entity';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto,
  CategoryTreeDto,
  CategoryQueryDto,
  PaginatedCategoriesResponseDto,
} from './dto';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto> {
    try {
      // Generate slug if not provided
      let slug = createCategoryDto.slug;
      if (!slug) {
        slug = this.generateSlug(createCategoryDto.name);
      }

      // Check for unique slug
      const existingBySlug = await this.findBySlug(slug);
      if (existingBySlug) {
        throw new ConflictException(`Category with slug '${slug}' already exists`);
      }

      // Validate parent category if provided
      if (createCategoryDto.parentId) {
        const foundParent = await this.categoryRepository.findOne({
          where: { id: createCategoryDto.parentId, deletedAt: IsNull() },
        });
        if (!foundParent) {
          throw new BadRequestException('Parent ID must be a valid UUID');
        }
      }

      // Check for unique name within the same level (same parent)
      await this.validateUniqueNameInLevel(createCategoryDto.name, createCategoryDto.parentId);

      // Create the category
      const category = this.categoryRepository.create({
        ...createCategoryDto,
        slug,
      });

      const savedCategory = await this.categoryRepository.save(category);

      this.logger.log(
        `Category created successfully: ${savedCategory.name} (ID: ${savedCategory.id})`,
      );

      return await this.findOne(savedCategory.id);
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Failed to create category: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new BadRequestException('Failed to create category');
    }
  }

  async findAll(queryDto: CategoryQueryDto): Promise<PaginatedCategoriesResponseDto> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        parentId,
        isActive,
        includeInactive = false,
        includeDeleted = false,
        sortBy = 'sortOrder',
        sortOrder = 'ASC',
        includeProductCount = false,
        maxDepth = 0,
      } = queryDto;

      const queryBuilder = this.createBaseQuery({ includeDeleted });

      // Apply filters
      this.applyFilters(queryBuilder, {
        search,
        parentId,
        isActive,
        includeInactive,
      });

      // Apply sorting
      this.applySorting(queryBuilder, sortBy, sortOrder);

      // Get total count before pagination
      const total = await queryBuilder.getCount();

      // Apply pagination
      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      // Execute query
      const categories = await queryBuilder.getMany();

      // Build hierarchical structure if maxDepth > 0
      let processedCategories = categories;
      if (maxDepth > 0) {
        processedCategories = await this.buildHierarchyForCategories(categories, maxDepth);
      }

      // Add product count if requested
      if (includeProductCount) {
        // TODO: Implement product count when Product entity is integrated
        processedCategories.forEach((category) => {
          category.productCount = 0; // Placeholder
        });
      }

      // Transform to response DTOs
      const data = plainToInstance(CategoryResponseDto, processedCategories, {
        excludeExtraneousValues: true,
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages,
          hasNext,
          hasPrev,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch categories: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new BadRequestException('Failed to fetch categories');
    }
  }

  async findOne(id: string): Promise<CategoryResponseDto> {
    const category = await this.findById(id, {
      includeRelations: true,
      includeInactive: true, // Include inactive categories in direct ID lookups
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Add computed properties
    category.level = category.getLevel();
    category.path = category.getPath();

    return plainToInstance(CategoryResponseDto, category, {
      excludeExtraneousValues: true,
    });
  }

  async findBySlug(slug: string): Promise<CategoryResponseDto | null> {
    const category = await this.categoryRepository.findOne({
      where: {
        slug,
        deletedAt: IsNull(),
        // Note: We include inactive categories in slug lookups
        // Filtering by isActive should only happen in list endpoints
      },
      relations: ['parent', 'children'],
    });

    if (!category) {
      return null;
    }

    // Add computed properties
    category.level = category.getLevel();
    category.path = category.getPath();

    return plainToInstance(CategoryResponseDto, category, {
      excludeExtraneousValues: true,
    });
  }

  async buildCategoryTree(includeInactive = false): Promise<CategoryTreeDto[]> {
    try {
      this.logger.debug(`Building category tree, includeInactive: ${includeInactive}`);

      const queryBuilder = this.categoryRepository
        .createQueryBuilder('category')
        .where('category.deletedAt IS NULL')
        .orderBy('category.sortOrder', 'ASC')
        .addOrderBy('category.name', 'ASC');

      if (!includeInactive) {
        queryBuilder.andWhere('category.isActive = :isActive', { isActive: true });
      }

      const categories = await queryBuilder.getMany();

      this.logger.debug(`Found ${categories.length} categories to build tree`);

      if (categories.length === 0) {
        return [];
      }

      const tree = this.buildTreeStructure(categories);

      this.logger.debug(`Built tree with ${tree.length} root categories`);

      return tree;
    } catch (error) {
      this.logger.error(
        `Failed to build category tree: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('Failed to build category tree');
    }
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    try {
      const category = await this.findById(id, { includeInactive: true });
      if (!category) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }

      // Validate hierarchy to prevent cycles
      if (updateCategoryDto.parentId) {
        await this.validateHierarchy(updateCategoryDto.parentId, id);
      }

      // Check for unique slug if being updated
      if (updateCategoryDto.slug && updateCategoryDto.slug !== category.slug) {
        const existingBySlug = await this.findBySlug(updateCategoryDto.slug);
        if (existingBySlug && existingBySlug.id !== id) {
          throw new ConflictException(
            `Category with slug '${updateCategoryDto.slug}' already exists`,
          );
        }
      }

      // Check for unique name within the same level if name or parent is being updated
      if (updateCategoryDto.name || updateCategoryDto.parentId) {
        const name = updateCategoryDto.name || category.name;
        const parentId =
          updateCategoryDto.parentId !== undefined ? updateCategoryDto.parentId : category.parentId;
        await this.validateUniqueNameInLevel(name, parentId, id);
      }

      // Update the category using merge and save to handle JSONB properly
      this.categoryRepository.merge(category, updateCategoryDto);
      await this.categoryRepository.save(category);
      this.logger.log(`Category updated successfully: ${category.name} (ID: ${id})`);

      return await this.findOne(id);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to update category ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new BadRequestException('Failed to update category');
    }
  }

  async remove(id: string): Promise<void> {
    try {
      // Check if category exists first without relations
      const category = await this.findById(id, { includeInactive: true });
      if (!category) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }

      // Check if category has active children (not soft-deleted)
      const childrenCount = await this.categoryRepository.count({
        where: {
          parentId: id,
          deletedAt: IsNull(),
        },
      });

      if (childrenCount > 0) {
        throw new BadRequestException(
          'Cannot delete category that has child categories. Delete children first.',
        );
      }

      // Check if category has active products (not soft-deleted)
      const productCount = await this.productRepository.count({
        where: {
          categoryId: id,
          deletedAt: IsNull(),
        },
      });

      if (productCount > 0) {
        throw new BadRequestException(
          `Cannot delete category with ${productCount} product(s). Please reassign or delete products first.`,
        );
      }

      // Soft delete the category
      await this.categoryRepository.softDelete(id);

      this.logger.log(`Category soft deleted: ${category.name} (ID: ${id})`);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Failed to delete category ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new BadRequestException('Failed to delete category');
    }
  }

  async activate(id: string): Promise<CategoryResponseDto> {
    return this.updateStatus(id, true);
  }

  async deactivate(id: string): Promise<CategoryResponseDto> {
    return this.updateStatus(id, false);
  }

  // Utility functions
  async getCategoryPath(categoryId: string): Promise<string[]> {
    const category = await this.findById(categoryId);
    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    // Build path by recursively loading parents
    const path: string[] = [];
    let current: Category | null = category;

    // Load all ancestors recursively
    while (current) {
      path.unshift(current.name);
      if (current.parentId) {
        current = await this.findById(current.parentId);
      } else {
        break;
      }
    }

    return path;
  }

  async getDescendants(categoryId: string, maxDepth?: number): Promise<CategoryResponseDto[]> {
    const category = await this.findById(categoryId);
    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    const descendants = await this.findDescendants(categoryId, maxDepth);
    return plainToInstance(CategoryResponseDto, descendants, {
      excludeExtraneousValues: true,
    });
  }

  async validateHierarchy(parentId: string, childId: string): Promise<void> {
    if (parentId === childId) {
      throw new BadRequestException('Category cannot be its own parent');
    }

    const parentCategory = await this.findById(parentId, { includeInactive: true });
    if (!parentCategory) {
      throw new BadRequestException(`Parent category with ID ${parentId} not found`);
    }

    const childCategory = await this.findById(childId, { includeInactive: true });
    if (!childCategory) {
      throw new BadRequestException(`Child category with ID ${childId} not found`);
    }

    // Check if parentCategory is a descendant of childCategory by traversing the hierarchy
    const descendants = await this.getDescendants(childId);
    const descendantIds = descendants.map((d) => d.id);

    if (descendantIds.includes(parentId)) {
      throw new BadRequestException(
        'Cannot create circular hierarchy: parent cannot be a descendant of child',
      );
    }
  }

  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, and hyphens with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  // Private helper methods
  private async findById(
    id: string,
    options: {
      includeInactive?: boolean;
      includeDeleted?: boolean;
      includeRelations?: boolean;
    } = {},
  ): Promise<Category | null> {
    const queryBuilder = this.categoryRepository.createQueryBuilder('category');
    queryBuilder.where('category.id = :id', { id });

    if (options.includeRelations) {
      queryBuilder
        .leftJoinAndSelect('category.parent', 'parent')
        .leftJoinAndSelect('category.children', 'children');
    }

    if (!options.includeDeleted) {
      queryBuilder.andWhere('category.deletedAt IS NULL');
    }

    if (!options.includeInactive) {
      queryBuilder.andWhere('category.isActive = :isActive', { isActive: true });
    }

    return await queryBuilder.getOne();
  }

  private createBaseQuery(
    options: { includeDeleted?: boolean } = {},
  ): SelectQueryBuilder<Category> {
    const queryBuilder = this.categoryRepository.createQueryBuilder('category');

    if (!options.includeDeleted) {
      queryBuilder.where('category.deletedAt IS NULL');
    }

    return queryBuilder;
  }

  private applyFilters(
    queryBuilder: SelectQueryBuilder<Category>,
    filters: {
      search?: string;
      parentId?: string | null;
      isActive?: boolean;
      includeInactive?: boolean;
    },
  ): void {
    const { search, parentId, isActive, includeInactive } = filters;

    // Search filter
    if (search) {
      queryBuilder.andWhere('(category.name ILIKE :search OR category.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    // Parent filter
    if (parentId !== undefined) {
      if (parentId === null) {
        // Filter root categories (parentId IS NULL)
        queryBuilder.andWhere('category.parentId IS NULL');
      } else if (parentId) {
        // Filter by specific parent ID
        queryBuilder.andWhere('category.parentId = :parentId', { parentId });
      }
    }

    // Active status filter
    if (!includeInactive && isActive !== undefined) {
      queryBuilder.andWhere('category.isActive = :isActive', { isActive });
    } else if (!includeInactive) {
      queryBuilder.andWhere('category.isActive = :isActive', { isActive: true });
    }
  }

  private applySorting(
    queryBuilder: SelectQueryBuilder<Category>,
    sortBy: string,
    sortOrder: 'ASC' | 'DESC',
  ): void {
    const validSortFields = ['name', 'createdAt', 'updatedAt', 'sortOrder'];
    const field = validSortFields.includes(sortBy) ? sortBy : 'sortOrder';

    queryBuilder.orderBy(`category.${field}`, sortOrder);

    // Always add secondary sort for consistency
    if (field !== 'name') {
      queryBuilder.addOrderBy('category.name', 'ASC');
    }
    queryBuilder.addOrderBy('category.id', 'ASC');
  }

  private async validateUniqueNameInLevel(
    name: string,
    parentId?: string | null,
    excludeId?: string,
  ): Promise<void> {
    const queryBuilder = this.categoryRepository
      .createQueryBuilder('category')
      .where('category.name = :name', { name })
      .andWhere('category.deletedAt IS NULL');

    if (parentId) {
      queryBuilder.andWhere('category.parentId = :parentId', { parentId });
    } else {
      queryBuilder.andWhere('category.parentId IS NULL');
    }

    if (excludeId) {
      queryBuilder.andWhere('category.id != :excludeId', { excludeId });
    }

    const existing = await queryBuilder.getOne();
    if (existing) {
      const levelDescription = parentId ? `under the same parent` : `at the root level`;
      throw new ConflictException(
        `Category with name '${name}' already exists ${levelDescription}`,
      );
    }
  }

  private async updateStatus(id: string, isActive: boolean): Promise<CategoryResponseDto> {
    try {
      const category = await this.findById(id, { includeInactive: true });
      if (!category) {
        throw new NotFoundException(`Category with ID ${id} not found`);
      }

      await this.categoryRepository.update(id, { isActive });

      const action = isActive ? 'activated' : 'deactivated';
      this.logger.log(`Category ${action}: ${category.name} (ID: ${id})`);

      // Get the updated category with proper options
      return await this.findById(id, { includeRelations: true, includeInactive: true }).then(
        (updatedCategory) => {
          if (!updatedCategory) {
            throw new NotFoundException(`Category with ID ${id} not found after update`);
          }

          // Add computed properties
          updatedCategory.level = updatedCategory.getLevel();
          updatedCategory.path = updatedCategory.getPath();

          return plainToInstance(CategoryResponseDto, updatedCategory, {
            excludeExtraneousValues: true,
          });
        },
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to update category status ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new BadRequestException('Failed to update category status');
    }
  }

  private async buildHierarchyForCategories(
    categories: Category[],
    _maxDepth: number,
  ): Promise<Category[]> {
    const categoryMap = new Map<string, Category>();
    const rootCategories: Category[] = [];

    // Create a map for quick lookup
    categories.forEach((category) => {
      categoryMap.set(category.id, category);
      category.children = [];
      if (!category.parentId) {
        rootCategories.push(category);
      }
    });

    // Build hierarchy
    categories.forEach((category) => {
      if (category.parentId && categoryMap.has(category.parentId)) {
        const parent = categoryMap.get(category.parentId)!;
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(category);
      }
    });

    return rootCategories;
  }

  private buildTreeStructure(
    categories: Category[],
    parentId?: string,
    currentDepth = 0,
  ): CategoryTreeDto[] {
    // Protection against infinite recursion
    if (currentDepth > 10) {
      this.logger.warn(`Maximum depth reached (${currentDepth}) for parentId: ${parentId}`);
      return [];
    }

    const tree: CategoryTreeDto[] = [];

    const filteredCategories = categories.filter((cat) => {
      // Ensure we're comparing the right values
      if (parentId === undefined) {
        return cat.parentId === null || cat.parentId === undefined;
      }
      return cat.parentId === parentId;
    });

    filteredCategories
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }
        return a.name.localeCompare(b.name);
      })
      .forEach((category) => {
        const treeNode = plainToInstance(CategoryTreeDto, category, {
          excludeExtraneousValues: true,
        });

        treeNode.level = currentDepth;
        treeNode.children = this.buildTreeStructure(categories, category.id, currentDepth + 1);
        treeNode.hasChildren = treeNode.children.length > 0;

        tree.push(treeNode);
      });

    return tree;
  }

  private async findDescendants(categoryId: string, maxDepth?: number): Promise<Category[]> {
    // Build a recursive query to find all descendants
    let currentParentIds = [categoryId];
    const allDescendants: Category[] = [];
    let depth = 0;

    while (currentParentIds.length > 0) {
      // Check depth limit BEFORE querying
      if (maxDepth !== undefined && depth >= maxDepth) {
        break;
      }

      const descendants = await this.categoryRepository
        .createQueryBuilder('category')
        .where('category.parentId IN (:...parentIds)', { parentIds: currentParentIds })
        .andWhere('category.deletedAt IS NULL')
        .getMany();

      if (descendants.length === 0) {
        break;
      }

      allDescendants.push(...descendants);
      currentParentIds = descendants.map((d) => d.id);
      depth++;
    }

    return allDescendants;
  }
}
