import { InventoryService } from '../inventory.service';

/**
 * Mock inventory stock response
 */
export const mockInventoryStock = {
  productId: 'prod-123',
  physicalStock: 100,
  reservedStock: 10,
  availableStock: 90,
  minimumStock: 10,
  maximumStock: 500,
  reorderPoint: 20,
  location: 'MAIN_WAREHOUSE',
  status: 'IN_STOCK',
  lastUpdated: new Date('2024-01-01'),
};

/**
 * Mock reservation response
 */
export const mockReservationResponse = {
  reservationId: 'res-123',
  productId: 'prod-123',
  quantity: 5,
  expiresAt: new Date(Date.now() + 3600000),
  location: 'MAIN_WAREHOUSE',
  reference: 'order-123',
  createdAt: new Date(),
  status: 'ACTIVE',
};

/**
 * Mock paginated response
 */
export const mockPaginatedResponse = {
  data: [
    {
      id: 'inv-123',
      ...mockInventoryStock,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  ],
  meta: {
    currentPage: 1,
    itemsPerPage: 20,
    totalItems: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

/**
 * Mock inventory stats
 */
export const mockStats = {
  totalItems: 100,
  totalValue: 50000,
  lowStockCount: 10,
  outOfStockCount: 5,
  statusBreakdown: {
    IN_STOCK: 85,
    LOW_STOCK: 10,
    OUT_OF_STOCK: 5,
  },
};

/**
 * Create mock service for InventoryController tests
 */
export function mockInventoryService(): jest.Mocked<InventoryService> {
  return {
    checkAvailability: jest.fn(),
    reserveStock: jest.fn(),
    releaseReservation: jest.fn(),
    fulfillReservation: jest.fn(),
    addStock: jest.fn(),
    removeStock: jest.fn(),
    getInventoryByProduct: jest.fn(),
    getInventoryList: jest.fn(),
    getInventoryStats: jest.fn(),
  } as unknown as jest.Mocked<InventoryService>;
}
