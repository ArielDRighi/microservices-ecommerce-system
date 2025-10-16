import { Test, TestingModule } from '@nestjs/testing';
import { PaymentProcessedHandler } from './payment-processed.handler';
import { PaymentProcessedEvent, PaymentMethod } from '../types/payment.events';

describe('PaymentProcessedHandler', () => {
  let handler: PaymentProcessedHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentProcessedHandler],
    }).compile();

    handler = module.get<PaymentProcessedHandler>(PaymentProcessedHandler);
  });

  describe('eventType', () => {
    it('should return PaymentProcessed', () => {
      expect(handler.eventType).toBe('PaymentProcessed');
    });
  });

  describe('canHandle', () => {
    it('should handle PaymentProcessed events', () => {
      expect(handler.canHandle('PaymentProcessed')).toBe(true);
    });

    it('should not handle other events', () => {
      expect(handler.canHandle('PaymentFailed')).toBe(false);
    });
  });

  describe('handle', () => {
    it('should process PaymentProcessed event with credit card', async () => {
      const event: PaymentProcessedEvent = {
        eventId: 'evt-789',
        eventType: 'PaymentProcessed',
        aggregateType: 'Payment',
        aggregateId: 'pay-123',
        paymentId: 'pay-123',
        orderId: 'order-123',
        userId: 'user-123',
        version: 1,
        timestamp: new Date(),
        amount: 150.5,
        currency: 'USD',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        transactionId: 'txn-abc123',
        processedAt: new Date(),
      };

      await expect(handler.handle(event)).resolves.toBeUndefined();
    });

    it('should process PaymentProcessed event with PayPal', async () => {
      const event: PaymentProcessedEvent = {
        eventId: 'evt-790',
        eventType: 'PaymentProcessed',
        aggregateType: 'Payment',
        aggregateId: 'pay-124',
        paymentId: 'pay-124',
        orderId: 'order-124',
        userId: 'user-124',
        version: 1,
        timestamp: new Date(),
        amount: 99.99,
        currency: 'EUR',
        paymentMethod: PaymentMethod.PAYPAL,
        transactionId: 'txn-xyz789',
        processedAt: new Date(),
      };

      await expect(handler.handle(event)).resolves.toBeUndefined();
    });
  });
});
