import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { ReservationDetailsDto } from './dto/reservation-details.dto';
import { ReservationStatus } from './entities/inventory-reservation.entity';

describe('InventoryController - New Features (Task 5)', () => {
  let controller: InventoryController;
  let service: InventoryService;

  const mockInventoryResponse = {
    id: 'inv-123',
    productId: 'prod-123',
    physicalStock: 100,
    reservedStock: 0,
    availableStock: 100,
    minimumStock: 10,
    maximumStock: 1000,
    reorderPoint: 20,
    location: 'MAIN_WAREHOUSE',
    status: 'IN_STOCK',
    product: {
      id: 'prod-123',
      name: 'Test Product',
      sku: 'SKU-001',
      category: 'Electronics',
    },
    movementsCount: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockReservationDetails: ReservationDetailsDto = {
    reservationId: 'res-123',
    productId: 'prod-123',
    inventoryId: 'inv-123',
    quantity: 5,
    status: ReservationStatus.ACTIVE,
    expiresAt: new Date(Date.now() + 1800000),
    ttlSeconds: 1800,
    isExpired: false,
    canBeReleased: true,
    canBeFulfilled: true,
    createdAt: new Date(),
    orderId: 'order-456',
    reason: 'Test reservation',
    location: 'MAIN_WAREHOUSE',
  };

  const mockInventoryService = {
    createInventory: jest.fn(),
    getReservationDetails: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        {
          provide: InventoryService,
          useValue: mockInventoryService,
        },
      ],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
    service = module.get<InventoryService>(InventoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /inventory - createInventory', () => {
    const createDto: CreateInventoryDto = {
      productId: 'prod-123',
      sku: 'SKU-001',
      initialStock: 100,
      minimumStock: 10,
      maximumStock: 1000,
      reorderPoint: 20,
      reorderQuantity: 50,
      location: 'MAIN_WAREHOUSE',
      notes: 'Initial inventory',
    };

    it('should create inventory successfully', async () => {
      // Arrange
      mockInventoryService.createInventory.mockResolvedValue(mockInventoryResponse);

      // Act
      const result = await controller.createInventory(createDto);

      // Assert
      expect(result).toEqual(mockInventoryResponse);
      expect(service.createInventory).toHaveBeenCalledWith(createDto);
      expect(service.createInventory).toHaveBeenCalledTimes(1);
    });

    it('should create inventory with minimal fields', async () => {
      // Arrange
      const minimalDto: CreateInventoryDto = {
        productId: 'prod-123',
        sku: 'SKU-001',
        initialStock: 100,
      };
      mockInventoryService.createInventory.mockResolvedValue(mockInventoryResponse);

      // Act
      const result = await controller.createInventory(minimalDto);

      // Assert
      expect(result).toBeDefined();
      expect(service.createInventory).toHaveBeenCalledWith(minimalDto);
    });

    it('should pass through service exceptions', async () => {
      // Arrange
      const error = new Error('Product not found');
      mockInventoryService.createInventory.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.createInventory(createDto)).rejects.toThrow(error);
    });

    it('should handle all optional fields', async () => {
      // Arrange
      const completeDto: CreateInventoryDto = {
        productId: 'prod-123',
        sku: 'SKU-001',
        location: 'SECONDARY_WAREHOUSE',
        initialStock: 250,
        minimumStock: 25,
        maximumStock: 2500,
        reorderPoint: 50,
        reorderQuantity: 100,
        notes: 'Complete configuration',
      };
      mockInventoryService.createInventory.mockResolvedValue(mockInventoryResponse);

      // Act
      const result = await controller.createInventory(completeDto);

      // Assert
      expect(result).toBeDefined();
      expect(service.createInventory).toHaveBeenCalledWith(completeDto);
    });
  });

  describe('GET /inventory/reservations/:id - getReservation', () => {
    it('should return reservation details for valid id', async () => {
      // Arrange
      const reservationId = 'res-123';
      mockInventoryService.getReservationDetails.mockResolvedValue(mockReservationDetails);

      // Act
      const result = await controller.getReservation(reservationId);

      // Assert
      expect(result).toEqual(mockReservationDetails);
      expect(service.getReservationDetails).toHaveBeenCalledWith(reservationId);
      expect(service.getReservationDetails).toHaveBeenCalledTimes(1);
    });

    it('should return correct status for active reservation', async () => {
      // Arrange
      const reservationId = 'res-active';
      mockInventoryService.getReservationDetails.mockResolvedValue(mockReservationDetails);

      // Act
      const result = await controller.getReservation(reservationId);

      // Assert
      expect(result.status).toBe(ReservationStatus.ACTIVE);
      expect(result.canBeReleased).toBe(true);
      expect(result.canBeFulfilled).toBe(true);
      expect(result.isExpired).toBe(false);
    });

    it('should return correct status for expired reservation', async () => {
      // Arrange
      const expiredDetails: ReservationDetailsDto = {
        ...mockReservationDetails,
        isExpired: true,
        ttlSeconds: -100,
        canBeReleased: false,
        canBeFulfilled: false,
      };
      mockInventoryService.getReservationDetails.mockResolvedValue(expiredDetails);

      // Act
      const result = await controller.getReservation('res-expired');

      // Assert
      expect(result.isExpired).toBe(true);
      expect(result.canBeReleased).toBe(false);
      expect(result.canBeFulfilled).toBe(false);
    });

    it('should return correct status for released reservation', async () => {
      // Arrange
      const releasedDetails: ReservationDetailsDto = {
        ...mockReservationDetails,
        status: ReservationStatus.RELEASED,
        canBeReleased: false,
        canBeFulfilled: false,
      };
      mockInventoryService.getReservationDetails.mockResolvedValue(releasedDetails);

      // Act
      const result = await controller.getReservation('res-released');

      // Assert
      expect(result.status).toBe(ReservationStatus.RELEASED);
      expect(result.canBeReleased).toBe(false);
      expect(result.canBeFulfilled).toBe(false);
    });

    it('should pass through service exceptions', async () => {
      // Arrange
      const error = new Error('Reservation not found');
      mockInventoryService.getReservationDetails.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getReservation('non-existent')).rejects.toThrow(error);
    });

    it('should handle different reservation IDs', async () => {
      // Arrange
      const reservationIds = ['res-001', 'res-002', 'res-003'];

      for (const id of reservationIds) {
        mockInventoryService.getReservationDetails.mockResolvedValue({
          ...mockReservationDetails,
          reservationId: id,
        });

        // Act
        const result = await controller.getReservation(id);

        // Assert
        expect(result.reservationId).toBe(id);
        expect(service.getReservationDetails).toHaveBeenCalledWith(id);
      }
    });
  });

  describe('Controller Integration', () => {
    it('should have both new endpoints defined', () => {
      expect(controller.createInventory).toBeDefined();
      expect(controller.getReservation).toBeDefined();
    });

    it('should call service methods correctly', async () => {
      // Test createInventory
      const createDto: CreateInventoryDto = {
        productId: 'prod-123',
        sku: 'SKU-001',
        initialStock: 100,
      };
      mockInventoryService.createInventory.mockResolvedValue(mockInventoryResponse);
      await controller.createInventory(createDto);
      expect(service.createInventory).toHaveBeenCalledWith(createDto);

      // Test getReservation
      mockInventoryService.getReservationDetails.mockResolvedValue(mockReservationDetails);
      await controller.getReservation('res-123');
      expect(service.getReservationDetails).toHaveBeenCalledWith('res-123');
    });
  });
});
