import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { Inventory, InventoryMovement } from './entities/inventory.entity';
import { InventoryReservation } from './entities/inventory-reservation.entity';
import { Product } from '../products/entities/product.entity';
import { InventoryMovementType } from './enums/inventory-movement-type.enum';
import {
  mockInventory,
  mockInventoryRepository,
  mockMovementRepository,
  mockReservationRepository,
} from './helpers/inventory.test-helpers';

describe('InventoryService - Stock Movements', () => {
  let service: InventoryService;
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
          provide: getRepositoryToken(Product),
          useValue: {
            findOne: jest.fn(),
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
    movementRepository = module.get(getRepositoryToken(InventoryMovement));
  });

  describe('addStock', () => {
    it('should successfully add stock to inventory', async () => {
      // Arrange
      const movementDto = {
        inventoryId: mockInventory.id,
        quantity: 50,
        movementType: InventoryMovementType.RESTOCK,
        unitCost: 25.5,
        referenceId: 'PO-123',
        referenceType: 'PURCHASE_ORDER',
        reason: 'Stock replenishment',
      };

      const inventoryWithMethods = {
        ...mockInventory,
        addStock: jest.fn(),
      };

      const mockEntityManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(inventoryWithMethods) // First call with lock
          .mockResolvedValueOnce({
            ...inventoryWithMethods,
            product: Promise.resolve({
              id: mockInventory.productId,
            }),
          }), // Second call with relations
        save: jest.fn().mockResolvedValue(inventoryWithMethods),
      };

      movementRepository.create.mockReturnValue({
        inventoryId: mockInventory.id,
        movementType: 'PURCHASE',
        quantity: 50,
      } as unknown as InventoryMovement);

      const transactionCallback = jest.fn(async (callback) => callback(mockEntityManager));
      const entityManager = service['entityManager'];
      entityManager.transaction = transactionCallback;

      // Act
      const result = await service.addStock(movementDto);

      // Assert
      expect(result).toBeDefined();
      expect(inventoryWithMethods.addStock).toHaveBeenCalledWith(50, 25.5);
      expect(mockEntityManager.save).toHaveBeenCalledTimes(2);
    });

    it('should throw BadRequestException when quantity is non-positive', async () => {
      // Arrange
      const movementDto = {
        inventoryId: mockInventory.id,
        quantity: -10,
        movementType: InventoryMovementType.RESTOCK,
      };

      // Act & Assert
      await expect(service.addStock(movementDto)).rejects.toThrow(
        'Add stock quantity must be positive',
      );
    });

    it('should throw NotFoundException when inventory not found', async () => {
      // Arrange
      const movementDto = {
        inventoryId: 'non-existent',
        quantity: 50,
        movementType: InventoryMovementType.RESTOCK,
      };

      const mockEntityManager = {
        findOne: jest.fn().mockResolvedValue(null),
      };

      const transactionCallback = jest.fn(async (callback) => callback(mockEntityManager));
      const entityManager = service['entityManager'];
      entityManager.transaction = transactionCallback;

      // Act & Assert
      await expect(service.addStock(movementDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when addStock operation fails', async () => {
      // Arrange
      const movementDto = {
        inventoryId: mockInventory.id,
        quantity: 50,
        movementType: InventoryMovementType.RESTOCK,
      };

      const inventoryWithMethods = {
        ...mockInventory,
        addStock: jest.fn().mockImplementation(() => {
          throw new Error('Stock addition failed');
        }),
      };

      const mockEntityManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(inventoryWithMethods)
          .mockResolvedValueOnce({
            ...inventoryWithMethods,
            product: Promise.resolve({ id: mockInventory.productId }),
          }),
      };

      const transactionCallback = jest.fn(async (callback) => callback(mockEntityManager));
      const entityManager = service['entityManager'];
      entityManager.transaction = transactionCallback;

      // Act & Assert
      await expect(service.addStock(movementDto)).rejects.toThrow('Stock addition failed');
    });
  });

  describe('removeStock', () => {
    it('should successfully remove stock from inventory', async () => {
      // Arrange
      const movementDto = {
        inventoryId: mockInventory.id,
        quantity: 30,
        movementType: InventoryMovementType.DAMAGE,
        referenceId: 'DMG-123',
        referenceType: 'DAMAGE_REPORT',
        reason: 'Damaged goods',
      };

      const inventoryWithMethods = {
        ...mockInventory,
        removeStock: jest.fn(),
      };

      const mockEntityManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(inventoryWithMethods)
          .mockResolvedValueOnce({
            ...inventoryWithMethods,
            product: Promise.resolve({
              id: mockInventory.productId,
            }),
          }),
        save: jest.fn().mockResolvedValue(inventoryWithMethods),
      };

      movementRepository.create.mockReturnValue({
        inventoryId: mockInventory.id,
        movementType: 'DAMAGE',
        quantity: -30,
      } as unknown as InventoryMovement);

      const transactionCallback = jest.fn(async (callback) => callback(mockEntityManager));
      const entityManager = service['entityManager'];
      entityManager.transaction = transactionCallback;

      // Act
      const result = await service.removeStock(movementDto);

      // Assert
      expect(result).toBeDefined();
      expect(inventoryWithMethods.removeStock).toHaveBeenCalledWith(30);
      expect(mockEntityManager.save).toHaveBeenCalledTimes(2);
    });

    it('should throw BadRequestException when quantity is non-positive', async () => {
      // Arrange
      const movementDto = {
        inventoryId: mockInventory.id,
        quantity: 0,
        movementType: InventoryMovementType.DAMAGE,
      };

      // Act & Assert
      await expect(service.removeStock(movementDto)).rejects.toThrow(
        'Remove stock quantity must be positive',
      );
    });

    it('should throw NotFoundException when inventory not found', async () => {
      // Arrange
      const movementDto = {
        inventoryId: 'non-existent',
        quantity: 30,
        movementType: InventoryMovementType.DAMAGE,
      };

      const mockEntityManager = {
        findOne: jest.fn().mockResolvedValue(null),
      };

      const transactionCallback = jest.fn(async (callback) => callback(mockEntityManager));
      const entityManager = service['entityManager'];
      entityManager.transaction = transactionCallback;

      // Act & Assert
      await expect(service.removeStock(movementDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when removeStock operation fails', async () => {
      // Arrange
      const movementDto = {
        inventoryId: mockInventory.id,
        quantity: 30,
        movementType: InventoryMovementType.DAMAGE,
      };

      const inventoryWithMethods = {
        ...mockInventory,
        removeStock: jest.fn().mockImplementation(() => {
          throw new Error('Insufficient stock for removal');
        }),
      };

      const mockEntityManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(inventoryWithMethods)
          .mockResolvedValueOnce({
            ...inventoryWithMethods,
            product: Promise.resolve({ id: mockInventory.productId }),
          }),
      };

      const transactionCallback = jest.fn(async (callback) => callback(mockEntityManager));
      const entityManager = service['entityManager'];
      entityManager.transaction = transactionCallback;

      // Act & Assert
      await expect(service.removeStock(movementDto)).rejects.toThrow(
        'Insufficient stock for removal',
      );
    });
  });
});
