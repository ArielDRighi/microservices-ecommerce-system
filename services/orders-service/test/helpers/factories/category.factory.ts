import { Repository } from 'typeorm';
import { Category } from '../../../src/modules/categories/entities/category.entity';

/**
 * Factory para crear categorías de test
 */
export class CategoryFactory {
  /**
   * Crea una categoría básica
   * @param repository - Repositorio de Category
   * @param overrides - Propiedades personalizadas
   */
  static async create(
    repository: Repository<Category>,
    overrides: Partial<Category> = {},
  ): Promise<Category> {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 10000);

    const defaultCategory: Partial<Category> = {
      name: `Test Category ${timestamp}`,
      description: 'Category created for testing purposes',
      slug: `test-category-${timestamp}-${randomSuffix}`,
      isActive: true,
      sortOrder: 0,
      metadata: { testCategory: true },
      ...overrides,
    };

    const category = repository.create(defaultCategory);
    return await repository.save(category);
  }

  /**
   * Crea múltiples categorías
   * @param repository - Repositorio de Category
   * @param count - Cantidad de categorías a crear
   */
  static async createMany(repository: Repository<Category>, count: number): Promise<Category[]> {
    const categories: Category[] = [];

    for (let i = 0; i < count; i++) {
      const category = await this.create(repository, {
        name: `Test Category ${i}`,
        slug: `test-category-${Date.now()}-${i}`,
        sortOrder: i,
      });
      categories.push(category);
    }

    return categories;
  }

  /**
   * Crea una categoría con padre específico
   * @param repository - Repositorio de Category
   * @param parentId - ID de la categoría padre
   */
  static async createWithParent(
    repository: Repository<Category>,
    parentId: string,
  ): Promise<Category> {
    return await this.create(repository, { parentId });
  }

  /**
   * Crea un árbol de categorías (padre con hijos)
   * @param repository - Repositorio de Category
   * @param depth - Profundidad del árbol (niveles)
   * @param childrenPerLevel - Cantidad de hijos por nivel
   */
  static async createTree(
    repository: Repository<Category>,
    depth: number,
    childrenPerLevel: number = 2,
  ): Promise<Category> {
    const rootCategory = await this.create(repository, {
      name: 'Root Category',
      slug: `root-${Date.now()}`,
    });

    if (depth <= 1) {
      return rootCategory;
    }

    await this.createTreeRecursive(repository, rootCategory.id, depth - 1, childrenPerLevel, 1);

    return rootCategory;
  }

  /**
   * Método auxiliar recursivo para crear árbol de categorías
   */
  private static async createTreeRecursive(
    repository: Repository<Category>,
    parentId: string,
    remainingDepth: number,
    childrenPerLevel: number,
    currentLevel: number,
  ): Promise<void> {
    if (remainingDepth <= 0) {
      return;
    }

    for (let i = 0; i < childrenPerLevel; i++) {
      const child = await this.createWithParent(repository, parentId);
      child.name = `Category Level ${currentLevel} - ${i}`;
      child.slug = `category-level-${currentLevel}-${i}-${Date.now()}-${i}`;
      await repository.save(child);

      if (remainingDepth > 1) {
        await this.createTreeRecursive(
          repository,
          child.id,
          remainingDepth - 1,
          childrenPerLevel,
          currentLevel + 1,
        );
      }
    }
  }

  /**
   * Crea una categoría inactiva
   * @param repository - Repositorio de Category
   */
  static async createInactive(repository: Repository<Category>): Promise<Category> {
    return await this.create(repository, { isActive: false });
  }

  /**
   * Crea una categoría raíz (sin padre)
   * @param repository - Repositorio de Category
   */
  static async createRoot(repository: Repository<Category>): Promise<Category> {
    return await this.create(repository, {
      name: `Root Category ${Date.now()}`,
      slug: `root-${Date.now()}`,
      parentId: undefined,
    });
  }
}
