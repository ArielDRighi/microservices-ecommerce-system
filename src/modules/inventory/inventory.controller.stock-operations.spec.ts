import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import {
  CheckStockDto,
  ReserveStockDto,
  ReleaseReservationDto,
  FulfillReservationDto,
} from './dto';
import {
  mockInventoryStock,
  mockReservationResponse,
  mockInventoryService,
} from './helpers/inventory-controller.test-helpers';

describe('InventoryController - Stock Operations', () => {
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

  describe('checkAvailability', () => {
    it('should check stock availability successfully', async () => {
      // Arrange
      const checkDto: CheckStockDto = {
        productId: 'prod-123',
        quantity: 5,
        location: 'MAIN_WAREHOUSE',
      };
      service.checkAvailability.mockResolvedValue(mockInventoryStock);

      // Act
      const result = await controller.checkAvailability(checkDto);

      // Assert
      expect(result).toEqual(mockInventoryStock);
      expect(service.checkAvailability).toHaveBeenCalledWith(checkDto);
      expect(service.checkAvailability).toHaveBeenCalledTimes(1);
    });

    it('should handle availability check for different locations', async () => {
      // Arrange
      const checkDto: CheckStockDto = {
        productId: 'prod-123',
        quantity: 10,
        location: 'WAREHOUSE_B',
      };
      service.checkAvailability.mockResolvedValue({
        ...mockInventoryStock,
        location: 'WAREHOUSE_B',
      });

      // Act
      const result = await controller.checkAvailability(checkDto);

      // Assert
      expect(result.location).toBe('WAREHOUSE_B');
      expect(service.checkAvailability).toHaveBeenCalledWith(checkDto);
    });
  });

  describe('reserveStock', () => {
    it('should reserve stock successfully', async () => {
      // Arrange
      const reserveDto: ReserveStockDto = {
        productId: 'prod-123',
        quantity: 5,
        reservationId: 'res-123',
        location: 'MAIN_WAREHOUSE',
        referenceId: 'order-123',
        ttlMinutes: 60,
      };
      service.reserveStock.mockResolvedValue(mockReservationResponse);

      // Act
      const result = await controller.reserveStock(reserveDto);

      // Assert
      expect(result).toEqual(mockReservationResponse);
      expect(service.reserveStock).toHaveBeenCalledWith(reserveDto);
    });

    it('should handle reservation with custom TTL', async () => {
      // Arrange
      const reserveDto: ReserveStockDto = {
        productId: 'prod-123',
        quantity: 3,
        reservationId: 'res-456',
        location: 'MAIN_WAREHOUSE',
        referenceId: 'order-456',
        ttlMinutes: 120,
      };
      service.reserveStock.mockResolvedValue({
        ...mockReservationResponse,
        reservationId: 'res-456',
      });

      // Act
      const result = await controller.reserveStock(reserveDto);

      // Assert
      expect(result.reservationId).toBe('res-456');
      expect(service.reserveStock).toHaveBeenCalledWith(reserveDto);
    });
  });

  describe('releaseReservation', () => {
    it('should release reservation successfully', async () => {
      // Arrange
      const releaseDto: ReleaseReservationDto = {
        productId: 'prod-123',
        quantity: 5,
        reservationId: 'res-123',
        reason: 'Order cancelled',
      };
      service.releaseReservation.mockResolvedValue(mockInventoryStock);

      // Act
      const result = await controller.releaseReservation(releaseDto);

      // Assert
      expect(result).toEqual(mockInventoryStock);
      expect(service.releaseReservation).toHaveBeenCalledWith(releaseDto);
    });

    it('should release reservation with location', async () => {
      // Arrange
      const releaseDto: ReleaseReservationDto = {
        productId: 'prod-123',
        quantity: 3,
        reservationId: 'res-456',
        location: 'WAREHOUSE_B',
      };
      service.releaseReservation.mockResolvedValue(mockInventoryStock);

      // Act
      const result = await controller.releaseReservation(releaseDto);

      // Assert
      expect(result).toEqual(mockInventoryStock);
      expect(service.releaseReservation).toHaveBeenCalledWith(releaseDto);
    });
  });

  describe('fulfillReservation', () => {
    it('should fulfill reservation successfully', async () => {
      // Arrange
      const fulfillDto: FulfillReservationDto = {
        productId: 'prod-123',
        quantity: 5,
        reservationId: 'res-123',
        orderId: 'order-123',
      };
      service.fulfillReservation.mockResolvedValue(mockInventoryStock);

      // Act
      const result = await controller.fulfillReservation(fulfillDto);

      // Assert
      expect(result).toEqual(mockInventoryStock);
      expect(service.fulfillReservation).toHaveBeenCalledWith(fulfillDto);
    });

    it('should fulfill reservation with notes', async () => {
      // Arrange
      const fulfillDto: FulfillReservationDto = {
        productId: 'prod-123',
        quantity: 2,
        reservationId: 'res-789',
        orderId: 'order-789',
        notes: 'Express shipping',
      };
      service.fulfillReservation.mockResolvedValue({
        ...mockInventoryStock,
        availableStock: 88,
      });

      // Act
      const result = await controller.fulfillReservation(fulfillDto);

      // Assert
      expect(result.availableStock).toBe(88);
      expect(service.fulfillReservation).toHaveBeenCalledWith(fulfillDto);
    });
  });
});
