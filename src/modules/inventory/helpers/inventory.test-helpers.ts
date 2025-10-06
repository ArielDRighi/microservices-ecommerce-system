import { Repository } from 'typeorm';
import { Inventory, InventoryMovement } from '../entities/inventory.entity';
import { InventoryReservation } from '../entities/inventory-reservation.entity';
import { CheckStockDto } from '../dto/check-stock.dto';
import { InventoryStockDto } from '../dto/inventory-response.dto';

/**
 * Mock inventory data
 */
export const mockInventory: Inventory = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  productId: '123e4567-e89b-12d3-a456-426614174001',
  currentStock: 100,
  reservedStock: 10,
  availableStock: 90,
  minimumStock: 20,
  maximumStock: 200,
  reorderPoint: 30,
  location: 'MAIN_WAREHOUSE',
  updatedAt: new Date(),
  product: Promise.resolve({
    id: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Test Product',
    sku: 'TEST-001',
    price: 99.99,
  }),
  stockStatus: 'NORMAL',
} as Inventory;

/**
 * Create a CheckStockDto
 */
export function createCheckStockDto(productId: string, quantity: number): CheckStockDto {
  return { productId, quantity };
}

/**
 * Mock repository setup helper
 */
export function mockInventoryRepository() {
  return {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    count: jest.fn(),
  } as unknown as jest.Mocked<Repository<Inventory>>;
}

/**
 * Mock movement repository setup helper
 */
export function mockMovementRepository() {
  return {
    create: jest.fn(),
    count: jest.fn(),
  } as unknown as jest.Mocked<Repository<InventoryMovement>>;
}

/**
 * Mock reservation repository setup helper
 */
export function mockReservationRepository() {
  return {
    create: jest.fn(),
  } as unknown as jest.Mocked<Repository<InventoryReservation>>;
}

/**
 * Mock entity manager setup helper
 */
export function mockEntityManager() {
  return {
    transaction: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };
}

/**
 * Assert availability response structure
 */
export function expectAvailabilityResponse(result: InventoryStockDto, inventory: Inventory) {
  expect(result).toEqual({
    productId: inventory.productId,
    physicalStock: inventory.currentStock,
    reservedStock: inventory.reservedStock,
    availableStock: inventory.availableStock,
    minimumStock: inventory.minimumStock,
    maximumStock: inventory.maximumStock,
    reorderPoint: inventory.reorderPoint,
    location: inventory.location,
    lastUpdated: inventory.updatedAt,
    status: inventory.stockStatus,
  });
}
