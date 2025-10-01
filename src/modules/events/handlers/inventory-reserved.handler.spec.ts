import { Test, TestingModule } from '@nestjs/testing';
import { InventoryReservedHandler } from './inventory-reserved.handler';
import { InventoryReservedEvent } from '../types/inventory.events';

describe('InventoryReservedHandler', () => {
  let handler: InventoryReservedHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InventoryReservedHandler],
    }).compile();

    handler = module.get<InventoryReservedHandler>(InventoryReservedHandler);
  });

  describe('eventType', () => {
    it('should return InventoryReserved', () => {
      expect(handler.eventType).toBe('InventoryReserved');
    });
  });

  describe('canHandle', () => {
    it('should handle InventoryReserved events', () => {
      expect(handler.canHandle('InventoryReserved')).toBe(true);
    });

    it('should not handle other events', () => {
      expect(handler.canHandle('InventoryReleased')).toBe(false);
    });
  });

  describe('handle', () => {
    it('should process InventoryReserved event', async () => {
      const event: InventoryReservedEvent = {
        eventId: 'evt-inv-123',
        eventType: 'InventoryReserved',
        aggregateType: 'Inventory',
        aggregateId: 'prod-456',
        productId: 'prod-456',
        userId: 'user-123',
        version: 1,
        timestamp: new Date(),
        orderId: 'order-789',
        quantity: 5,
        reservationId: 'res-abc123',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      };

      await expect(handler.handle(event)).resolves.toBeUndefined();
    });

    it('should handle event with correlation tracking', async () => {
      const event: InventoryReservedEvent = {
        eventId: 'evt-inv-124',
        eventType: 'InventoryReserved',
        aggregateType: 'Inventory',
        aggregateId: 'prod-457',
        productId: 'prod-457',
        userId: 'user-124',
        version: 1,
        timestamp: new Date(),
        correlationId: 'corr-xyz',
        causationId: 'cause-abc',
        orderId: 'order-790',
        quantity: 10,
        reservationId: 'res-def456',
        expiresAt: new Date(Date.now() + 7200000), // 2 hours from now
      };

      await expect(handler.handle(event)).resolves.toBeUndefined();
    });
  });
});
