import { Repository } from 'typeorm';
import { Inventory } from '../../../src/modules/inventory/entities/inventory.entity';

/**
 * Factory para crear registros de inventario de test
 */
export class InventoryFactory {
  /**
   * Crea un registro de inventario básico
   * @param repository - Repositorio de Inventory
   * @param overrides - Propiedades personalizadas
   */
  static async create(
    repository: Repository<Inventory>,
    overrides: Partial<Inventory> = {},
  ): Promise<Inventory> {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 10000);

    const defaultInventory: Partial<Inventory> = {
      sku: `INV-TEST-${timestamp}-${randomSuffix}`,
      location: 'MAIN_WAREHOUSE',
      currentStock: 100,
      reservedStock: 0,
      minimumStock: 10,
      maximumStock: 1000,
      reorderPoint: 20,
      reorderQuantity: 100,
      isActive: true,
      ...overrides,
    };

    const inventory = repository.create(defaultInventory);
    return await repository.save(inventory);
  }

  /**
   * Crea un inventario con stock específico
   * @param repository - Repositorio de Inventory
   * @param productId - ID del producto
   * @param quantity - Cantidad en stock
   */
  static async createWithStock(
    repository: Repository<Inventory>,
    productId: string,
    quantity: number,
  ): Promise<Inventory> {
    return await this.create(repository, {
      productId,
      currentStock: quantity,
      sku: `SKU-${productId.slice(-8)}-${Date.now()}`,
    });
  }

  /**
   * Crea un inventario con stock bajo
   * @param repository - Repositorio de Inventory
   * @param productId - ID del producto
   */
  static async createLowStock(
    repository: Repository<Inventory>,
    productId: string,
  ): Promise<Inventory> {
    return await this.create(repository, {
      productId,
      currentStock: 1,
      minimumStock: 5,
      sku: `LOW-${productId.slice(-8)}-${Date.now()}`,
    });
  }

  /**
   * Crea un inventario sin stock
   * @param repository - Repositorio de Inventory
   * @param productId - ID del producto
   */
  static async createOutOfStock(
    repository: Repository<Inventory>,
    productId: string,
  ): Promise<Inventory> {
    return await this.create(repository, {
      productId,
      currentStock: 0,
      reservedStock: 0,
      sku: `OOS-${productId.slice(-8)}-${Date.now()}`,
    });
  }

  /**
   * Crea múltiples inventarios
   * @param repository - Repositorio de Inventory
   * @param productIds - Array de IDs de productos
   * @param baseQuantity - Cantidad base para cada inventario
   */
  static async createMany(
    repository: Repository<Inventory>,
    productIds: string[],
    baseQuantity: number = 100,
  ): Promise<Inventory[]> {
    const inventories: Inventory[] = [];

    for (let i = 0; i < productIds.length; i++) {
      const productId = productIds[i];
      if (!productId) continue;

      const inventory = await this.create(repository, {
        productId: productId,
        currentStock: baseQuantity + i * 10,
        sku: `BULK-${productId.slice(-8)}-${Date.now()}-${i}`,
      });
      inventories.push(inventory);
    }

    return inventories;
  }
}
