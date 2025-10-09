import { Repository } from 'typeorm';
import { Product } from '../../../src/modules/products/entities/product.entity';

/**
 * Factory para crear productos de test
 */
export class ProductFactory {
  /**
   * Crea un producto básico
   * @param repository - Repositorio de Product
   * @param overrides - Propiedades personalizadas
   */
  static async create(
    repository: Repository<Product>,
    overrides: Partial<Product> = {},
  ): Promise<Product> {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 10000);

    const defaultProduct: Partial<Product> = {
      name: `Test Product ${timestamp}`,
      description: 'Product created for testing purposes',
      price: 99.99,
      sku: `TEST-SKU-${timestamp}-${randomSuffix}`,
      brand: 'Test Brand',
      weight: 1.0,
      costPrice: 50.0,
      compareAtPrice: 129.99,
      trackInventory: true,
      minimumStock: 10,
      images: ['https://example.com/test-product.jpg'],
      tags: ['test', 'sample'],
      attributes: { color: 'blue', size: 'medium' },
      isActive: true,
      ...overrides,
    };

    const product = repository.create(defaultProduct);
    return await repository.save(product);
  }

  /**
   * Crea múltiples productos
   * @param repository - Repositorio de Product
   * @param count - Cantidad de productos a crear
   */
  static async createMany(repository: Repository<Product>, count: number): Promise<Product[]> {
    const products: Product[] = [];

    for (let i = 0; i < count; i++) {
      const product = await this.create(repository, {
        name: `Test Product ${i}`,
        sku: `TEST-SKU-${Date.now()}-${i}`,
        price: 50 + i * 10,
      });
      products.push(product);
    }

    return products;
  }

  /**
   * Crea un producto con precio específico
   * @param repository - Repositorio de Product
   * @param price - Precio del producto
   */
  static async createWithPrice(repository: Repository<Product>, price: number): Promise<Product> {
    return await this.create(repository, {
      price,
      costPrice: price * 0.5,
      compareAtPrice: price * 1.3,
    });
  }

  /**
   * Crea un producto con SKU específico
   * @param repository - Repositorio de Product
   * @param sku - SKU del producto
   */
  static async createWithSku(repository: Repository<Product>, sku: string): Promise<Product> {
    return await this.create(repository, { sku });
  }

  /**
   * Crea un producto inactivo
   * @param repository - Repositorio de Product
   */
  static async createInactive(repository: Repository<Product>): Promise<Product> {
    return await this.create(repository, { isActive: false });
  }

  /**
   * Crea un producto asociado a una categoría
   * @param repository - Repositorio de Product
   * @param categoryId - ID de la categoría
   */
  static async createWithCategory(
    repository: Repository<Product>,
    categoryId: string,
  ): Promise<Product> {
    return await this.create(repository, { categoryId });
  }
}
