import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { InventoryService } from './inventory.service';
import { Inventory, InventoryMovement } from './entities/inventory.entity';
import { InventoryReservation } from './entities/inventory-reservation.entity';
import { NotFoundException } from '@nestjs/common';
import { CheckStockDto } from './dto/check-stock.dto';

describe('InventoryService', () => {
  let service: InventoryService;
  let inventoryRepository: jest.Mocked<Repository<Inventory>>;
  let movementRepository: jest.Mocked<Repository<InventoryMovement>>;

  const mockInventory = {
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: getRepositoryToken(Inventory),
          useValue: {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(InventoryMovement),
          useValue: {
            create: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(InventoryReservation),
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: EntityManager,
          useValue: {
            transaction: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    inventoryRepository = module.get(getRepositoryToken(Inventory));
    movementRepository = module.get(getRepositoryToken(InventoryMovement));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkAvailability', () => {
    it('should return stock availability when inventory exists', async () => {
      const checkStockDto: CheckStockDto = {
        productId: '123e4567-e89b-12d3-a456-426614174001',
        quantity: 50,
      };

      inventoryRepository.findOne.mockResolvedValue(mockInventory);

      const result = await service.checkAvailability(checkStockDto);

      expect(result).toEqual({
        productId: mockInventory.productId,
        physicalStock: mockInventory.currentStock,
        reservedStock: mockInventory.reservedStock,
        availableStock: mockInventory.availableStock,
        minimumStock: mockInventory.minimumStock,
        maximumStock: mockInventory.maximumStock,
        reorderPoint: mockInventory.reorderPoint,
        location: mockInventory.location,
        lastUpdated: mockInventory.updatedAt,
        status: mockInventory.stockStatus,
      });
    });

    it('should throw NotFoundException when inventory not found', async () => {
      const checkStockDto: CheckStockDto = {
        productId: '123e4567-e89b-12d3-a456-426614174001',
        quantity: 50,
      };

      inventoryRepository.findOne.mockResolvedValue(null);

      await expect(service.checkAvailability(checkStockDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getInventoryStats', () => {
    it('should return inventory statistics', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockInventory]),
      } as unknown as SelectQueryBuilder<Inventory>;

      inventoryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getInventoryStats();

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
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      } as unknown as SelectQueryBuilder<Inventory>;

      inventoryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getInventoryStats('WAREHOUSE_A');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('inventory.location = :location', {
        location: 'WAREHOUSE_A',
      });
    });

    it('should return statistics with different stock statuses', async () => {
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

      const result = await service.getInventoryStats();

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

  describe('getInventoryByProduct', () => {
    it('should return inventory response for existing product', async () => {
      inventoryRepository.findOne.mockResolvedValue(mockInventory);
      movementRepository.count.mockResolvedValue(5);

      const result = await service.getInventoryByProduct(mockInventory.productId);

      expect(result).toEqual({
        id: mockInventory.id,
        productId: mockInventory.productId,
        physicalStock: mockInventory.currentStock,
        reservedStock: mockInventory.reservedStock,
        availableStock: mockInventory.availableStock,
        minimumStock: mockInventory.minimumStock,
        maximumStock: mockInventory.maximumStock,
        reorderPoint: mockInventory.reorderPoint,
        location: mockInventory.location,
        status: mockInventory.stockStatus,
        product: {
          id: '123e4567-e89b-12d3-a456-426614174001',
          name: 'Test Product',
          sku: 'TEST-001',
          category: undefined,
        },
        movementsCount: 5,
        createdAt: undefined,
        updatedAt: mockInventory.updatedAt,
      });
    });

    it('should throw NotFoundException when inventory not found', async () => {
      inventoryRepository.findOne.mockResolvedValue(null);

      await expect(service.getInventoryByProduct('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
