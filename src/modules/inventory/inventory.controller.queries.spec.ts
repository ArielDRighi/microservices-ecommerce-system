import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryQueryDto } from './dto';
import {
  mockPaginatedResponse,
  mockStats,
  mockInventoryService,
} from './helpers/inventory-controller.test-helpers';

describe('InventoryController - Queries & Statistics', () => {
  let controller: InventoryController;
  let service: jest.Mocked<InventoryService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        {
          provide: InventoryService,
          useValue: mockInventoryService(),
        },
      ],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
    service = module.get(InventoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInventoryByProduct', () => {
    it('should get inventory by product ID', async () => {
      // Arrange
      const productId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const mockResponse = {
        id: 'inv-123',
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
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      service.getInventoryByProduct.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.getInventoryByProduct(productId);

      // Assert
      expect(result).toEqual(mockResponse);
      expect(service.getInventoryByProduct).toHaveBeenCalledWith(productId, undefined);
    });

    it('should get inventory by product ID and location', async () => {
      // Arrange
      const productId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const location = 'WAREHOUSE_B';
      const mockResponse = {
        id: 'inv-123',
        productId: 'prod-123',
        physicalStock: 100,
        reservedStock: 10,
        availableStock: 90,
        minimumStock: 10,
        maximumStock: 500,
        reorderPoint: 20,
        location,
        status: 'IN_STOCK',
        lastUpdated: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      service.getInventoryByProduct.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.getInventoryByProduct(productId, location);

      // Assert
      expect(result.location).toBe(location);
      expect(service.getInventoryByProduct).toHaveBeenCalledWith(productId, location);
    });
  });

  describe('getInventoryList', () => {
    it('should get inventory list with default pagination', async () => {
      // Arrange
      const queryDto: InventoryQueryDto = {
        page: 1,
        limit: 20,
      };
      service.getInventoryList.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.getInventoryList(queryDto);

      // Assert
      expect(result).toEqual(mockPaginatedResponse);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(service.getInventoryList).toHaveBeenCalledWith(queryDto);
    });

    it('should filter by product ID', async () => {
      // Arrange
      const queryDto: InventoryQueryDto = {
        page: 1,
        limit: 20,
        productId: 'prod-123',
      };
      service.getInventoryList.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.getInventoryList(queryDto);

      // Assert
      expect(result).toBeDefined();
      expect(service.getInventoryList).toHaveBeenCalledWith(queryDto);
    });

    it('should filter by location', async () => {
      // Arrange
      const queryDto: InventoryQueryDto = {
        page: 1,
        limit: 20,
        location: 'WAREHOUSE_B',
      };
      service.getInventoryList.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.getInventoryList(queryDto);

      // Assert
      expect(result).toBeDefined();
      expect(service.getInventoryList).toHaveBeenCalledWith(queryDto);
    });

    it('should filter by status', async () => {
      // Arrange
      const queryDto: InventoryQueryDto = {
        page: 1,
        limit: 20,
        status: 'LOW_STOCK',
      };
      service.getInventoryList.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.getInventoryList(queryDto);

      // Assert
      expect(result).toBeDefined();
      expect(service.getInventoryList).toHaveBeenCalledWith(queryDto);
    });

    it('should filter by stock range', async () => {
      // Arrange
      const queryDto: InventoryQueryDto = {
        page: 1,
        limit: 20,
        minStock: 10,
        maxStock: 100,
      };
      service.getInventoryList.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.getInventoryList(queryDto);

      // Assert
      expect(result).toBeDefined();
      expect(service.getInventoryList).toHaveBeenCalledWith(queryDto);
    });
  });

  describe('getLowStockItems', () => {
    it('should get low stock items with defaults', async () => {
      // Arrange
      service.getInventoryList.mockResolvedValue(mockPaginatedResponse);
      const queryParams = { page: 1, limit: 20 };

      // Act
      const result = await controller.getLowStockItems(queryParams);

      // Assert
      expect(result).toEqual(mockPaginatedResponse);
      expect(service.getInventoryList).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        location: undefined,
        status: 'LOW_STOCK',
      });
    });

    it('should get low stock items with custom pagination', async () => {
      // Arrange
      service.getInventoryList.mockResolvedValue(mockPaginatedResponse);
      const queryParams = { page: 2, limit: 50 };

      // Act
      const result = await controller.getLowStockItems(queryParams);

      // Assert
      expect(result).toBeDefined();
      expect(service.getInventoryList).toHaveBeenCalledWith({
        page: 2,
        limit: 50,
        location: undefined,
        status: 'LOW_STOCK',
      });
    });

    it('should filter low stock by location', async () => {
      // Arrange
      const location = 'WAREHOUSE_C';
      service.getInventoryList.mockResolvedValue(mockPaginatedResponse);
      const queryParams = { page: 1, limit: 20, location };

      // Act
      const result = await controller.getLowStockItems(queryParams);

      // Assert
      expect(result).toBeDefined();
      expect(service.getInventoryList).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        location,
        status: 'LOW_STOCK',
      });
    });
  });

  describe('getOutOfStockItems', () => {
    it('should get out of stock items with defaults', async () => {
      // Arrange
      service.getInventoryList.mockResolvedValue(mockPaginatedResponse);
      const queryParams = { page: 1, limit: 20 };

      // Act
      const result = await controller.getOutOfStockItems(queryParams);

      // Assert
      expect(result).toEqual(mockPaginatedResponse);
      expect(service.getInventoryList).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        location: undefined,
        status: 'OUT_OF_STOCK',
      });
    });

    it('should get out of stock items with custom pagination', async () => {
      // Arrange
      service.getInventoryList.mockResolvedValue(mockPaginatedResponse);
      const queryParams = { page: 3, limit: 10 };

      // Act
      const result = await controller.getOutOfStockItems(queryParams);

      // Assert
      expect(result).toBeDefined();
      expect(service.getInventoryList).toHaveBeenCalledWith({
        page: 3,
        limit: 10,
        location: undefined,
        status: 'OUT_OF_STOCK',
      });
    });

    it('should filter out of stock by location', async () => {
      // Arrange
      const location = 'WAREHOUSE_D';
      service.getInventoryList.mockResolvedValue(mockPaginatedResponse);
      const queryParams = { page: 1, limit: 20, location };

      // Act
      const result = await controller.getOutOfStockItems(queryParams);

      // Assert
      expect(result).toBeDefined();
      expect(service.getInventoryList).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        location,
        status: 'OUT_OF_STOCK',
      });
    });
  });

  describe('getInventoryStats', () => {
    it('should get inventory stats without location filter', async () => {
      // Arrange
      service.getInventoryStats.mockResolvedValue(mockStats);

      // Act
      const result = await controller.getInventoryStats();

      // Assert
      expect(result).toEqual(mockStats);
      expect(result.totalItems).toBe(100);
      expect(result.totalValue).toBe(50000);
      expect(result.lowStockCount).toBe(10);
      expect(result.outOfStockCount).toBe(5);
      expect(result.statusBreakdown).toEqual({
        IN_STOCK: 85,
        LOW_STOCK: 10,
        OUT_OF_STOCK: 5,
      });
      expect(service.getInventoryStats).toHaveBeenCalledWith(undefined);
    });

    it('should get inventory stats with location filter', async () => {
      // Arrange
      const location = 'WAREHOUSE_A';
      service.getInventoryStats.mockResolvedValue({
        ...mockStats,
        totalItems: 50,
      });

      // Act
      const result = await controller.getInventoryStats(location);

      // Assert
      expect(result.totalItems).toBe(50);
      expect(service.getInventoryStats).toHaveBeenCalledWith(location);
    });
  });
});
