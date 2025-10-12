import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { Inventory, InventoryMovement } from './entities/inventory.entity';
import { InventoryReservation, ReservationStatus } from './entities/inventory-reservation.entity';
import { Product } from '../products/entities/product.entity';
import { CreateInventoryDto } from './dto/create-inventory.dto';

describe('InventoryService - New Features (Task 5)', () => {
  let service: InventoryService;
  let inventoryRepository: any;
  let movementRepository: any;
  let reservationRepository: any;
  let productRepository: any;

  const mockProduct = {
    id: 'prod-123',
    name: 'Test Product',
    sku: 'SKU-TEST-001',
    price: 99.99,
    category: Promise.resolve({ name: 'Electronics' }),
  };

  const mockInventory = {
    id: 'inv-123',
    productId: 'prod-123',
    sku: 'SKU-TEST-001',
    location: 'MAIN_WAREHOUSE',
    currentStock: 100,
    reservedStock: 0,
    availableStock: 100,
    minimumStock: 10,
    maximumStock: 1000,
    reorderPoint: 20,
    reorderQuantity: 50,
    isActive: true,
    autoReorderEnabled: false,
    notes: 'Test inventory',
    lastRestockAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    stockStatus: 'IN_STOCK',
    product: Promise.resolve(mockProduct),
  };

  const mockReservation = {
    id: 'res-uuid-123',
    reservationId: 'res-123',
    productId: 'prod-123',
    inventoryId: 'inv-123',
    quantity: 5,
    location: 'MAIN_WAREHOUSE',
    status: ReservationStatus.ACTIVE,
    referenceId: 'order-456',
    reason: 'Test reservation',
    expiresAt: new Date(Date.now() + 1800000), // 30 min from now
    createdAt: new Date(),
    updatedAt: new Date(),
    inventory: Promise.resolve(mockInventory),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: getRepositoryToken(Inventory),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(InventoryMovement),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(InventoryReservation),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
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
          },
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    inventoryRepository = module.get(getRepositoryToken(Inventory));
    movementRepository = module.get(getRepositoryToken(InventoryMovement));
    reservationRepository = module.get(getRepositoryToken(InventoryReservation));
    productRepository = module.get(getRepositoryToken(Product));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createInventory', () => {
    const createDto: CreateInventoryDto = {
      productId: 'prod-123',
      sku: 'SKU-TEST-001',
      initialStock: 100,
      minimumStock: 10,
      maximumStock: 1000,
      reorderPoint: 20,
      reorderQuantity: 50,
      location: 'MAIN_WAREHOUSE',
      notes: 'Initial inventory creation',
    };

    it('should create inventory successfully with all fields', async () => {
      // Arrange
      productRepository.findOne.mockResolvedValue(mockProduct);
      inventoryRepository.findOne.mockResolvedValue(null); // No existing inventory
      inventoryRepository.create.mockReturnValue(mockInventory);
      inventoryRepository.save.mockResolvedValue(mockInventory);
      movementRepository.create.mockReturnValue({});
      movementRepository.save.mockResolvedValue({});

      // Act
      const result = await service.createInventory(createDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(mockInventory.id);
      expect(result.productId).toBe(createDto.productId);
      expect(result.physicalStock).toBe(createDto.initialStock);
      expect(result.reservedStock).toBe(0);
      expect(result.availableStock).toBe(createDto.initialStock);
      expect(productRepository.findOne).toHaveBeenCalledWith({
        where: { id: createDto.productId },
        relations: ['category'],
      });
      expect(inventoryRepository.save).toHaveBeenCalled();
      expect(movementRepository.save).toHaveBeenCalled();
    });

    it('should create inventory with minimal required fields', async () => {
      // Arrange
      const minimalDto: CreateInventoryDto = {
        productId: 'prod-123',
        sku: 'SKU-TEST-001',
        initialStock: 100,
      };

      productRepository.findOne.mockResolvedValue(mockProduct);
      inventoryRepository.findOne.mockResolvedValue(null);
      inventoryRepository.create.mockReturnValue(mockInventory);
      inventoryRepository.save.mockResolvedValue(mockInventory);
      movementRepository.create.mockReturnValue({});
      movementRepository.save.mockResolvedValue({});

      // Act
      const result = await service.createInventory(minimalDto);

      // Assert
      expect(result).toBeDefined();
      expect(productRepository.findOne).toHaveBeenCalled();
      expect(inventoryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: minimalDto.productId,
          sku: minimalDto.sku,
          currentStock: minimalDto.initialStock,
          minimumStock: 10, // Default value
        }),
      );
    });

    it('should throw NotFoundException if product does not exist', async () => {
      // Arrange
      productRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.createInventory(createDto)).rejects.toThrow(NotFoundException);
      await expect(service.createInventory(createDto)).rejects.toThrow(
        /Product with ID .* not found/,
      );
      expect(productRepository.findOne).toHaveBeenCalled();
      expect(inventoryRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if inventory already exists', async () => {
      // Arrange
      productRepository.findOne.mockResolvedValue(mockProduct);
      inventoryRepository.findOne.mockResolvedValue(mockInventory); // Existing inventory

      // Act & Assert
      await expect(service.createInventory(createDto)).rejects.toThrow(ConflictException);
      await expect(service.createInventory(createDto)).rejects.toThrow(
        /Inventory already exists for product/,
      );
      expect(inventoryRepository.save).not.toHaveBeenCalled();
    });

    it('should use default location if not provided', async () => {
      // Arrange
      const dtoWithoutLocation: CreateInventoryDto = {
        productId: 'prod-123',
        sku: 'SKU-TEST-001',
        initialStock: 100,
      };

      productRepository.findOne.mockResolvedValue(mockProduct);
      inventoryRepository.findOne.mockResolvedValue(null);
      inventoryRepository.create.mockReturnValue(mockInventory);
      inventoryRepository.save.mockResolvedValue(mockInventory);
      movementRepository.create.mockReturnValue({});
      movementRepository.save.mockResolvedValue({});

      // Act
      await service.createInventory(dtoWithoutLocation);

      // Assert
      expect(inventoryRepository.findOne).toHaveBeenCalledWith({
        where: {
          productId: dtoWithoutLocation.productId,
          location: 'MAIN_WAREHOUSE', // Default
        },
      });
    });
  });

  describe('getReservationDetails', () => {
    it('should return reservation details for active reservation', async () => {
      // Arrange
      const reservationId = 'res-123';
      reservationRepository.findOne.mockResolvedValue(mockReservation);

      // Act
      const result = await service.getReservationDetails(reservationId);

      // Assert
      expect(result).toBeDefined();
      expect(result.reservationId).toBe(reservationId);
      expect(result.productId).toBe(mockReservation.productId);
      expect(result.quantity).toBe(mockReservation.quantity);
      expect(result.status).toBe(ReservationStatus.ACTIVE);
      expect(result.isExpired).toBe(false);
      expect(result.canBeReleased).toBe(true);
      expect(result.canBeFulfilled).toBe(true);
      expect(result.ttlSeconds).toBeGreaterThan(0);
      expect(reservationRepository.findOne).toHaveBeenCalledWith({
        where: { reservationId },
        relations: ['inventory'],
      });
    });

    it('should indicate expired reservation correctly', async () => {
      // Arrange
      const expiredReservation = {
        ...mockReservation,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      };
      reservationRepository.findOne.mockResolvedValue(expiredReservation);

      // Act
      const result = await service.getReservationDetails('res-expired');

      // Assert
      expect(result.isExpired).toBe(true);
      expect(result.ttlSeconds).toBeLessThan(0);
      expect(result.canBeReleased).toBe(false);
      expect(result.canBeFulfilled).toBe(false);
    });

    it('should indicate released reservation cannot be released again', async () => {
      // Arrange
      const releasedReservation = {
        ...mockReservation,
        status: ReservationStatus.RELEASED,
      };
      reservationRepository.findOne.mockResolvedValue(releasedReservation);

      // Act
      const result = await service.getReservationDetails('res-released');

      // Assert
      expect(result.status).toBe(ReservationStatus.RELEASED);
      expect(result.canBeReleased).toBe(false);
      expect(result.canBeFulfilled).toBe(false);
    });

    it('should indicate fulfilled reservation cannot be operated', async () => {
      // Arrange
      const fulfilledReservation = {
        ...mockReservation,
        status: ReservationStatus.FULFILLED,
      };
      reservationRepository.findOne.mockResolvedValue(fulfilledReservation);

      // Act
      const result = await service.getReservationDetails('res-fulfilled');

      // Assert
      expect(result.status).toBe(ReservationStatus.FULFILLED);
      expect(result.canBeReleased).toBe(false);
      expect(result.canBeFulfilled).toBe(false);
    });

    it('should throw NotFoundException if reservation not found', async () => {
      // Arrange
      reservationRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getReservationDetails('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getReservationDetails('non-existent')).rejects.toThrow(
        /Reservation with ID .* not found/,
      );
    });

    it('should calculate TTL correctly for reservation about to expire', async () => {
      // Arrange
      const soonToExpireReservation = {
        ...mockReservation,
        expiresAt: new Date(Date.now() + 60000), // 1 minute from now
      };
      reservationRepository.findOne.mockResolvedValue(soonToExpireReservation);

      // Act
      const result = await service.getReservationDetails('res-soon-expire');

      // Assert
      expect(result.ttlSeconds).toBeGreaterThan(0);
      expect(result.ttlSeconds).toBeLessThanOrEqual(60);
      expect(result.isExpired).toBe(false);
    });
  });

  describe('Improved Validation Tests', () => {
    it('should validate reservation exists before operations', async () => {
      // This test ensures the service checks reservation existence
      // which is crucial for improved error handling
      reservationRepository.findOne.mockResolvedValue(null);

      await expect(service.getReservationDetails('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should validate product exists before creating inventory', async () => {
      // This test ensures business rules are enforced
      const dto: CreateInventoryDto = {
        productId: 'non-existent-product',
        sku: 'SKU-001',
        initialStock: 100,
      };

      productRepository.findOne.mockResolvedValue(null);

      await expect(service.createInventory(dto)).rejects.toThrow(NotFoundException);
    });

    it('should prevent duplicate inventory creation', async () => {
      // This test ensures ConflictException is thrown for duplicates
      const dto: CreateInventoryDto = {
        productId: 'prod-123',
        sku: 'SKU-001',
        initialStock: 100,
      };

      productRepository.findOne.mockResolvedValue(mockProduct);
      inventoryRepository.findOne.mockResolvedValue(mockInventory);

      await expect(service.createInventory(dto)).rejects.toThrow(ConflictException);
    });
  });
});
