import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { Inventory, InventoryMovement } from './entities/inventory.entity';
import { InventoryReservation } from './entities/inventory-reservation.entity';
import { Product } from '../products/entities/product.entity';
import {
  mockInventory,
  mockInventoryRepository,
  mockMovementRepository,
  mockReservationRepository,
} from './helpers/inventory.test-helpers';

describe('InventoryService - Reservations', () => {
  let service: InventoryService;
  let movementRepository: ReturnType<typeof mockMovementRepository>;
  let reservationRepository: ReturnType<typeof mockReservationRepository>;

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
    reservationRepository = module.get(getRepositoryToken(InventoryReservation));
  });

  describe('reserveStock', () => {
    it('should successfully reserve stock when sufficient quantity available', async () => {
      // Arrange
      const reserveDto = {
        productId: mockInventory.productId,
        quantity: 20,
        reservationId: 'RES-123',
        location: 'MAIN_WAREHOUSE',
      };

      const inventoryWithMethods = {
        ...mockInventory,
        reserveStock: jest.fn(),
      };

      const mockEntityManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(inventoryWithMethods) // First call with pessimistic lock
          .mockResolvedValueOnce({
            ...inventoryWithMethods,
            product: Promise.resolve({
              id: mockInventory.productId,
              name: 'Test Product',
              sku: 'TEST-001',
            }),
          }), // Second call with relations
        save: jest.fn().mockResolvedValue(inventoryWithMethods),
      };

      movementRepository.create.mockReturnValue({
        inventoryId: mockInventory.id,
        movementType: 'RESERVATION',
        quantity: -20,
      } as unknown as InventoryMovement);

      reservationRepository.create.mockReturnValue({
        id: 'reservation-uuid',
        reservationId: 'RES-123',
        productId: mockInventory.productId,
        inventoryId: mockInventory.id,
        quantity: 20,
        location: 'MAIN_WAREHOUSE',
        status: 'ACTIVE',
      } as unknown as InventoryReservation);

      const transactionCallback = jest.fn(async (callback) => callback(mockEntityManager));
      const entityManager = service['entityManager'];
      entityManager.transaction = transactionCallback;

      // Act
      const result = await service.reserveStock(reserveDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.reservationId).toBe('RES-123');
      expect(result.quantity).toBe(20);
      expect(result.status).toBe('ACTIVE');
      expect(inventoryWithMethods.reserveStock).toHaveBeenCalledWith(20, 'Reservation: RES-123');
      expect(mockEntityManager.findOne).toHaveBeenCalledTimes(2);
      expect(mockEntityManager.save).toHaveBeenCalledTimes(3); // inventory + movement + reservation
    });

    it('should throw NotFoundException when inventory not found', async () => {
      // Arrange
      const reserveDto = {
        productId: 'non-existent',
        quantity: 20,
        reservationId: 'RES-123',
        location: 'MAIN_WAREHOUSE',
      };

      const mockEntityManager = {
        findOne: jest.fn().mockResolvedValue(null),
      };

      const transactionCallback = jest.fn(async (callback) => callback(mockEntityManager));
      const entityManager = service['entityManager'];
      entityManager.transaction = transactionCallback;

      // Act & Assert
      await expect(service.reserveStock(reserveDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when insufficient stock available', async () => {
      // Arrange
      const reserveDto = {
        productId: mockInventory.productId,
        quantity: 150, // More than available (90)
        reservationId: 'RES-123',
        location: 'MAIN_WAREHOUSE',
      };

      const mockEntityManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(mockInventory)
          .mockResolvedValueOnce({
            ...mockInventory,
            product: Promise.resolve({
              id: mockInventory.productId,
            }),
          }),
      };

      const transactionCallback = jest.fn(async (callback) => callback(mockEntityManager));
      const entityManager = service['entityManager'];
      entityManager.transaction = transactionCallback;

      // Act & Assert
      await expect(service.reserveStock(reserveDto)).rejects.toThrow('Insufficient stock');
    });
  });

  describe('releaseReservation', () => {
    it('should successfully release reservation', async () => {
      // Arrange
      const releaseDto = {
        productId: mockInventory.productId,
        quantity: 20,
        reservationId: 'RES-123',
        location: 'MAIN_WAREHOUSE',
      };

      const inventoryWithMethods = {
        ...mockInventory,
        releaseReservedStock: jest.fn(),
      };

      const mockReservation = {
        id: 'RES-123',
        productId: mockInventory.productId,
        quantity: 20,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 3600000),
      };

      const mockEntityManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(mockReservation) // First call for reservation
          .mockResolvedValueOnce(inventoryWithMethods), // Second call for inventory
        save: jest.fn().mockResolvedValue(inventoryWithMethods),
      };

      movementRepository.create.mockReturnValue({
        inventoryId: mockInventory.id,
        movementType: 'RELEASE_RESERVATION',
        quantity: 20,
      } as unknown as InventoryMovement);

      const transactionCallback = jest.fn(async (callback) => callback(mockEntityManager));
      const entityManager = service['entityManager'];
      entityManager.transaction = transactionCallback;

      // Act
      const result = await service.releaseReservation(releaseDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.productId).toBe(mockInventory.productId);
      expect(inventoryWithMethods.releaseReservedStock).toHaveBeenCalledWith(20);
      expect(mockEntityManager.save).toHaveBeenCalledTimes(3); // Saves: reservation + inventory + movement
    });

    it('should throw NotFoundException when inventory not found', async () => {
      // Arrange
      const releaseDto = {
        productId: 'non-existent',
        quantity: 20,
        reservationId: 'RES-123',
        location: 'MAIN_WAREHOUSE',
      };

      const mockEntityManager = {
        findOne: jest.fn().mockResolvedValue(null),
      };

      const transactionCallback = jest.fn(async (callback) => callback(mockEntityManager));
      const entityManager = service['entityManager'];
      entityManager.transaction = transactionCallback;

      // Act & Assert
      await expect(service.releaseReservation(releaseDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when release fails', async () => {
      // Arrange
      const releaseDto = {
        productId: mockInventory.productId,
        quantity: 20,
        reservationId: 'RES-123',
        location: 'MAIN_WAREHOUSE',
      };

      const inventoryWithMethods = {
        ...mockInventory,
        releaseReservedStock: jest.fn().mockImplementation(() => {
          throw new Error('Invalid release amount');
        }),
      };

      const mockReservation = {
        id: 'RES-123',
        productId: mockInventory.productId,
        quantity: 20,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 3600000),
      };

      const mockEntityManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(mockReservation) // First call for reservation
          .mockResolvedValueOnce(inventoryWithMethods), // Second call for inventory
      };

      const transactionCallback = jest.fn(async (callback) => callback(mockEntityManager));
      const entityManager = service['entityManager'];
      entityManager.transaction = transactionCallback;

      // Act & Assert
      await expect(service.releaseReservation(releaseDto)).rejects.toThrow(
        'Invalid release amount',
      );
    });
  });

  describe('fulfillReservation', () => {
    it('should successfully fulfill reservation', async () => {
      // Arrange
      const fulfillDto = {
        productId: mockInventory.productId,
        quantity: 20,
        reservationId: 'RES-123',
        orderId: 'ORD-456',
        location: 'MAIN_WAREHOUSE',
      };

      const inventoryWithMethods = {
        ...mockInventory,
        fulfillReservation: jest.fn(),
      };

      const mockReservation = {
        id: 'RES-123',
        productId: mockInventory.productId,
        quantity: 20,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 3600000),
      };

      const mockEntityManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(mockReservation) // First call for reservation
          .mockResolvedValueOnce(inventoryWithMethods), // Second call for inventory
        save: jest.fn().mockResolvedValue(inventoryWithMethods),
      };

      movementRepository.create.mockReturnValue({
        inventoryId: mockInventory.id,
        movementType: 'SALE',
        quantity: -20,
      } as unknown as InventoryMovement);

      const transactionCallback = jest.fn(async (callback) => callback(mockEntityManager));
      const entityManager = service['entityManager'];
      entityManager.transaction = transactionCallback;

      // Act
      const result = await service.fulfillReservation(fulfillDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.productId).toBe(mockInventory.productId);
      expect(inventoryWithMethods.fulfillReservation).toHaveBeenCalledWith(20);
      expect(mockEntityManager.save).toHaveBeenCalledTimes(3); // Saves: reservation + inventory + movement
    });

    it('should throw NotFoundException when inventory not found', async () => {
      // Arrange
      const fulfillDto = {
        productId: 'non-existent',
        quantity: 20,
        reservationId: 'RES-123',
        orderId: 'ORD-456',
        location: 'MAIN_WAREHOUSE',
      };

      const mockEntityManager = {
        findOne: jest.fn().mockResolvedValue(null),
      };

      const transactionCallback = jest.fn(async (callback) => callback(mockEntityManager));
      const entityManager = service['entityManager'];
      entityManager.transaction = transactionCallback;

      // Act & Assert
      await expect(service.fulfillReservation(fulfillDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when fulfillment fails', async () => {
      // Arrange
      const fulfillDto = {
        productId: mockInventory.productId,
        quantity: 20,
        reservationId: 'RES-123',
        orderId: 'ORD-456',
        location: 'MAIN_WAREHOUSE',
      };

      const inventoryWithMethods = {
        ...mockInventory,
        fulfillReservation: jest.fn().mockImplementation(() => {
          throw new Error('Cannot fulfill reservation');
        }),
      };

      const mockEntityManager = {
        findOne: jest.fn().mockResolvedValue(inventoryWithMethods),
      };

      const transactionCallback = jest.fn(async (callback) => callback(mockEntityManager));
      const entityManager = service['entityManager'];
      entityManager.transaction = transactionCallback;

      // Act & Assert
      await expect(service.fulfillReservation(fulfillDto)).rejects.toThrow(
        'Cannot fulfill reservation',
      );
    });
  });
});
