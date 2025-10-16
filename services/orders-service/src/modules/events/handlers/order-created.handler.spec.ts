import { Test, TestingModule } from '@nestjs/testing';
import { OrderCreatedHandler } from './order-created.handler';
import { OrderCreatedEvent } from '../types/order.events';

describe('OrderCreatedHandler', () => {
  let handler: OrderCreatedHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderCreatedHandler],
    }).compile();

    handler = module.get<OrderCreatedHandler>(OrderCreatedHandler);
  });

  describe('eventType', () => {
    it('should return OrderCreated', () => {
      expect(handler.eventType).toBe('OrderCreated');
    });
  });

  describe('canHandle', () => {
    it('should handle OrderCreated events', () => {
      expect(handler.canHandle('OrderCreated')).toBe(true);
    });

    it('should not handle other events', () => {
      expect(handler.canHandle('OrderConfirmed')).toBe(false);
    });
  });

  describe('handle', () => {
    it('should process OrderCreated event', async () => {
      const event: OrderCreatedEvent = {
        eventId: 'evt-123',
        eventType: 'OrderCreated',
        aggregateType: 'Order',
        aggregateId: 'order-123',
        orderId: 'order-123',
        userId: 'user-123',
        version: 1,
        timestamp: new Date(),
        items: [
          {
            productId: 'prod-1',
            quantity: 2,
            unitPrice: 100,
            totalPrice: 200,
          },
        ],
        totalAmount: 200,
        currency: 'USD',
      };

      await expect(handler.handle(event)).resolves.toBeUndefined();
    });

    it('should handle event with shipping address', async () => {
      const event: OrderCreatedEvent = {
        eventId: 'evt-124',
        eventType: 'OrderCreated',
        aggregateType: 'Order',
        aggregateId: 'order-124',
        orderId: 'order-124',
        userId: 'user-123',
        version: 1,
        timestamp: new Date(),
        items: [
          {
            productId: 'prod-1',
            quantity: 1,
            unitPrice: 50,
            totalPrice: 50,
          },
        ],
        totalAmount: 50,
        currency: 'EUR',
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          country: 'USA',
          postalCode: '10001',
        },
      };

      await expect(handler.handle(event)).resolves.toBeUndefined();
    });
  });
});
