import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { StockMovementDto } from './dto';
import { InventoryMovementType } from './enums/inventory-movement-type.enum';
import {
  mockInventoryStock,
  mockInventoryService,
} from './helpers/inventory-controller.test-helpers';

describe('InventoryController - Stock Movements', () => {
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

  describe('addStock', () => {
    it('should add stock successfully', async () => {
      // Arrange
      const movementDto: StockMovementDto = {
        inventoryId: 'inv-123',
        movementType: InventoryMovementType.RESTOCK,
        quantity: 50,
        reason: 'Monthly restock',
      };
      service.addStock.mockResolvedValue({
        ...mockInventoryStock,
        physicalStock: 150,
        availableStock: 140,
      });

      // Act
      const result = await controller.addStock(movementDto);

      // Assert
      expect(result.physicalStock).toBe(150);
      expect(result.availableStock).toBe(140);
      expect(service.addStock).toHaveBeenCalledWith(movementDto);
    });

    it('should add stock with unit cost', async () => {
      // Arrange
      const movementDto: StockMovementDto = {
        inventoryId: 'inv-123',
        movementType: InventoryMovementType.RESTOCK,
        quantity: 25,
        unitCost: 15.99,
        referenceId: 'PO-12345',
        referenceType: 'PURCHASE_ORDER',
      };
      service.addStock.mockResolvedValue({
        ...mockInventoryStock,
        physicalStock: 125,
      });

      // Act
      const result = await controller.addStock(movementDto);

      // Assert
      expect(result).toBeDefined();
      expect(service.addStock).toHaveBeenCalledWith(movementDto);
    });
  });

  describe('removeStock', () => {
    it('should remove stock successfully', async () => {
      // Arrange
      const movementDto: StockMovementDto = {
        inventoryId: 'inv-123',
        movementType: InventoryMovementType.SALE,
        quantity: -10,
        reason: 'Order fulfillment',
      };
      service.removeStock.mockResolvedValue({
        ...mockInventoryStock,
        physicalStock: 90,
        availableStock: 80,
      });

      // Act
      const result = await controller.removeStock(movementDto);

      // Assert
      expect(result.physicalStock).toBe(90);
      expect(result.availableStock).toBe(80);
      expect(service.removeStock).toHaveBeenCalledWith(movementDto);
    });

    it('should remove stock for damage', async () => {
      // Arrange
      const movementDto: StockMovementDto = {
        inventoryId: 'inv-123',
        movementType: InventoryMovementType.ADJUSTMENT,
        quantity: -5,
        reason: 'Damaged during inspection',
        performedBy: 'admin@example.com',
      };
      service.removeStock.mockResolvedValue({
        ...mockInventoryStock,
        physicalStock: 95,
      });

      // Act
      const result = await controller.removeStock(movementDto);

      // Assert
      expect(result).toBeDefined();
      expect(service.removeStock).toHaveBeenCalledWith(movementDto);
    });
  });
});
