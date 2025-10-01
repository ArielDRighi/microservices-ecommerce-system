import { Test, TestingModule } from '@nestjs/testing';
import { OrderConfirmedHandler } from './order-confirmed.handler';
import { OrderConfirmedEvent } from '../types/order.events';

describe('OrderConfirmedHandler', () => {
  let handler: OrderConfirmedHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderConfirmedHandler],
    }).compile();

    handler = module.get<OrderConfirmedHandler>(OrderConfirmedHandler);
  });

  describe('eventType', () => {
    it('should return OrderConfirmed', () => {
      expect(handler.eventType).toBe('OrderConfirmed');
    });
  });

  describe('canHandle', () => {
    it('should handle OrderConfirmed events', () => {
      expect(handler.canHandle('OrderConfirmed')).toBe(true);
    });

    it('should not handle other events', () => {
      expect(handler.canHandle('OrderCreated')).toBe(false);
    });
  });

  describe('handle', () => {
    it('should process OrderConfirmed event', async () => {
      const event: OrderConfirmedEvent = {
        eventId: 'evt-456',
        eventType: 'OrderConfirmed',
        aggregateType: 'Order',
        aggregateId: 'order-456',
        orderId: 'order-456',
        userId: 'user-456',
        version: 1,
        timestamp: new Date(),
        paymentId: 'pay-789',
        confirmedAt: new Date(),
      };

      await expect(handler.handle(event)).resolves.toBeUndefined();
    });

    it('should handle event with correlation data', async () => {
      const event: OrderConfirmedEvent = {
        eventId: 'evt-457',
        eventType: 'OrderConfirmed',
        aggregateType: 'Order',
        aggregateId: 'order-457',
        orderId: 'order-457',
        userId: 'user-457',
        version: 1,
        timestamp: new Date(),
        correlationId: 'corr-123',
        causationId: 'cause-456',
        paymentId: 'pay-790',
        confirmedAt: new Date(),
      };

      await expect(handler.handle(event)).resolves.toBeUndefined();
    });
  });
});
