import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager, SelectQueryBuilder } from 'typeorm';
import { InventoryService } from './inventory.service';
import { Inventory, InventoryMovement } from './entities/inventory.entity';
import { InventoryReservation } from './entities/inventory-reservation.entity';
import {
  mockInventory,
  mockInventoryRepository,
  mockMovementRepository,
  mockReservationRepository,
  mockEntityManager,
} from './helpers/inventory.test-helpers';

describe('InventoryService - Statistics', () => {
  let service: InventoryService;
  let inventoryRepository: ReturnType<typeof mockInventoryRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: getRepositoryToken(Inventory),
          useValue: mockInventoryRepository(),
        },
        {
          provide: getRepositoryToken(InventoryMovement),
          useValue: mockMovementRepository(),
        },
        {
          provide: getRepositoryToken(InventoryReservation),
          useValue: mockReservationRepository(),
        },
        {
          provide: EntityManager,
          useValue: mockEntityManager(),
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    inventoryRepository = module.get(getRepositoryToken(Inventory));
  });

  describe('getInventoryStats', () => {
    it('should return inventory statistics', async () => {
      // Arrange
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockInventory]),
      } as unknown as SelectQueryBuilder<Inventory>;

      inventoryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.getInventoryStats();

      // Assert
      expect(result).toEqual({
        totalItems: 1,
        totalValue: 9999, // 100 * 99.99 rounded
        lowStockCount: 0,
        outOfStockCount: 0,
        statusBreakdown: {
          IN_STOCK: 1,
          LOW_STOCK: 0,
          OUT_OF_STOCK: 0,
        },
      });
    });

    it('should apply location filter when provided', async () => {
      // Arrange
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      } as unknown as SelectQueryBuilder<Inventory>;

      inventoryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      await service.getInventoryStats('WAREHOUSE_A');

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('inventory.location = :location', {
        location: 'WAREHOUSE_A',
      });
    });

    it('should return statistics with different stock statuses', async () => {
      // Arrange
      const lowStockInventory = {
        ...mockInventory,
        currentStock: 15,
        availableStock: 15,
        stockStatus: 'LOW_STOCK',
        product: Promise.resolve({
          id: '123e4567-e89b-12d3-a456-426614174001',
          name: 'Test Product',
          sku: 'TEST-001',
          price: 99.99,
        }),
      } as Inventory;

      const outOfStockInventory = {
        ...mockInventory,
        id: '456e4567-e89b-12d3-a456-426614174000',
        currentStock: 0,
        availableStock: 0,
        stockStatus: 'OUT_OF_STOCK',
        product: Promise.resolve({
          id: '456e4567-e89b-12d3-a456-426614174001',
          name: 'Out of Stock Product',
          sku: 'OUT-001',
          price: 49.99,
        }),
      } as Inventory;

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([mockInventory, lowStockInventory, outOfStockInventory]),
      } as unknown as SelectQueryBuilder<Inventory>;

      inventoryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.getInventoryStats();

      // Assert
      expect(result).toEqual({
        totalItems: 3,
        totalValue: 11498.85, // (100 * 99.99) + (15 * 99.99) + (0 * 49.99)
        lowStockCount: 1,
        outOfStockCount: 1,
        statusBreakdown: {
          IN_STOCK: 1,
          LOW_STOCK: 1,
          OUT_OF_STOCK: 1,
        },
      });
    });
  });
});
