import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager, SelectQueryBuilder } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { Inventory, InventoryMovement } from './entities/inventory.entity';
import { InventoryReservation } from './entities/inventory-reservation.entity';
import {
  mockInventory,
  createCheckStockDto,
  mockInventoryRepository,
  mockMovementRepository,
  mockReservationRepository,
  mockEntityManager,
  expectAvailabilityResponse,
} from './helpers/inventory.test-helpers';

describe('InventoryService - Core Functionality', () => {
  let service: InventoryService;
  let inventoryRepository: ReturnType<typeof mockInventoryRepository>;
  let movementRepository: ReturnType<typeof mockMovementRepository>;

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
    movementRepository = module.get(getRepositoryToken(InventoryMovement));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkAvailability', () => {
    it('should return stock availability when inventory exists', async () => {
      // Arrange
      const checkStockDto = createCheckStockDto(mockInventory.productId, 50);
      inventoryRepository.findOne.mockResolvedValue(mockInventory);

      // Act
      const result = await service.checkAvailability(checkStockDto);

      // Assert
      expectAvailabilityResponse(result, mockInventory);
    });

    it('should throw NotFoundException when inventory not found', async () => {
      // Arrange
      const checkStockDto = createCheckStockDto('non-existent-id', 50);
      inventoryRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.checkAvailability(checkStockDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getInventoryByProduct', () => {
    it('should return inventory response when product exists', async () => {
      // Arrange
      inventoryRepository.findOne.mockResolvedValue(mockInventory);
      movementRepository.count.mockResolvedValue(5);

      // Act
      const result = await service.getInventoryByProduct(mockInventory.productId);

      // Assert
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
      // Arrange
      inventoryRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getInventoryByProduct('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getInventoryList', () => {
    it('should return paginated inventory list when valid params provided', async () => {
      // Arrange
      const params = {
        page: 1,
        limit: 10,
        location: 'MAIN_WAREHOUSE',
      };

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockInventory]),
        getManyAndCount: jest.fn().mockResolvedValue([[mockInventory], 1]),
      } as unknown as SelectQueryBuilder<Inventory>;

      inventoryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      inventoryRepository.count.mockResolvedValue(1);
      movementRepository.count.mockResolvedValue(5);

      // Act
      const result = await service.getInventoryList(params);

      // Assert
      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(result.meta).toHaveProperty('page', 1);
      expect(result.meta).toHaveProperty('limit', 10);
      expect(result.meta).toHaveProperty('total', 1);
      expect(result.meta).toHaveProperty('totalPages', 1);
    });

    it('should apply status filter when provided', async () => {
      // Arrange
      const params = {
        page: 1,
        limit: 10,
        status: 'LOW_STOCK',
      };

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      } as unknown as SelectQueryBuilder<Inventory>;

      inventoryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      inventoryRepository.count.mockResolvedValue(0);

      // Act
      await service.getInventoryList(params);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });
});
