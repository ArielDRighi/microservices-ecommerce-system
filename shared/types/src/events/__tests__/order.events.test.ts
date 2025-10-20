import {
  OrderCreatedEventSchema,
  OrderCancelledEventSchema,
  OrderFailedEventSchema,
  OrderConfirmedEventSchema,
  validateOrderEvent,
  safeValidateOrderEvent,
} from '../order.events';

describe('Order Events - Order Created', () => {
  const validOrderCreatedEvent = {
    eventId: '550e8400-e29b-41d4-a716-446655440100',
    eventType: 'order.created' as const,
    timestamp: '2025-10-20T14:29:00.000Z',
    version: '1.0.0',
    correlationId: '660e8400-e29b-41d4-a716-446655440001',
    source: 'orders-service' as const,
    payload: {
      orderId: '880e8400-e29b-41d4-a716-446655440003',
      userId: '990e8400-e29b-41d4-a716-446655440004',
      items: [
        {
          productId: 'prod-12345',
          quantity: 5,
          price: 29.99,
          subtotal: 149.95,
        },
      ],
      totalAmount: 149.95,
      currency: 'USD',
      status: 'pending' as const,
      createdAt: '2025-10-20T14:29:00.000Z',
    },
  };

  it('should validate a correct OrderCreatedEvent', () => {
    const result = OrderCreatedEventSchema.safeParse(validOrderCreatedEvent);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.eventType).toBe('order.created');
      expect(result.data.payload.items).toHaveLength(1);
    }
  });

  it('should reject empty items array', () => {
    const invalidEvent = {
      ...validOrderCreatedEvent,
      payload: { ...validOrderCreatedEvent.payload, items: [] },
    };
    const result = OrderCreatedEventSchema.safeParse(invalidEvent);
    expect(result.success).toBe(false);
  });

  it('should reject negative totalAmount', () => {
    const invalidEvent = {
      ...validOrderCreatedEvent,
      payload: { ...validOrderCreatedEvent.payload, totalAmount: -100 },
    };
    const result = OrderCreatedEventSchema.safeParse(invalidEvent);
    expect(result.success).toBe(false);
  });

  it('should reject zero totalAmount', () => {
    const invalidEvent = {
      ...validOrderCreatedEvent,
      payload: { ...validOrderCreatedEvent.payload, totalAmount: 0 },
    };
    const result = OrderCreatedEventSchema.safeParse(invalidEvent);
    expect(result.success).toBe(false);
  });

  it('should accept optional metadata', () => {
    const eventWithMetadata = {
      ...validOrderCreatedEvent,
      payload: {
        ...validOrderCreatedEvent.payload,
        metadata: {
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
          referrer: 'https://example.com',
        },
      },
    };
    const result = OrderCreatedEventSchema.safeParse(eventWithMetadata);
    expect(result.success).toBe(true);
  });

  it('should work with validateOrderEvent helper', () => {
    expect(() => validateOrderEvent(validOrderCreatedEvent)).not.toThrow();
  });

  it('should work with safeValidateOrderEvent helper', () => {
    const result = safeValidateOrderEvent(validOrderCreatedEvent);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.eventType).toBe('order.created');
    }
  });
});

describe('Order Events - Order Cancelled', () => {
  const validOrderCancelledEvent = {
    eventId: '550e8400-e29b-41d4-a716-446655440110',
    eventType: 'order.cancelled' as const,
    timestamp: '2025-10-20T14:40:00.000Z',
    version: '1.0.0',
    source: 'orders-service' as const,
    payload: {
      orderId: '880e8400-e29b-41d4-a716-446655440003',
      userId: '990e8400-e29b-41d4-a716-446655440004',
      items: [
        {
          productId: 'prod-12345',
          quantity: 5,
          price: 29.99,
          subtotal: 149.95,
        },
      ],
      reason: 'user_requested' as const,
      cancelledBy: 'user' as const,
      cancelledAt: '2025-10-20T14:40:00.000Z',
      refundRequired: true,
    },
  };

  it('should validate a correct OrderCancelledEvent', () => {
    const result = OrderCancelledEventSchema.safeParse(validOrderCancelledEvent);
    expect(result.success).toBe(true);
  });

  it('should accept valid reason values', () => {
    const reasons = [
      'user_requested',
      'payment_failed',
      'stock_unavailable',
      'timeout',
      'fraud_detected',
      'system_error',
    ] as const;
    reasons.forEach((reason) => {
      const event = {
        ...validOrderCancelledEvent,
        payload: { ...validOrderCancelledEvent.payload, reason },
      };
      const result = OrderCancelledEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });
  });

  it('should accept valid cancelledBy values', () => {
    const cancelledByValues = ['user', 'system', 'admin'] as const;
    cancelledByValues.forEach((cancelledBy) => {
      const event = {
        ...validOrderCancelledEvent,
        payload: { ...validOrderCancelledEvent.payload, cancelledBy },
      };
      const result = OrderCancelledEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid reason', () => {
    const invalidEvent = {
      ...validOrderCancelledEvent,
      payload: { ...validOrderCancelledEvent.payload, reason: 'invalid_reason' },
    };
    const result = OrderCancelledEventSchema.safeParse(invalidEvent);
    expect(result.success).toBe(false);
  });
});

describe('Order Events - Order Failed', () => {
  const validOrderFailedEvent = {
    eventId: '550e8400-e29b-41d4-a716-446655440120',
    eventType: 'order.failed' as const,
    timestamp: '2025-10-20T14:30:10.000Z',
    version: '1.0.0',
    source: 'orders-service' as const,
    payload: {
      orderId: '880e8400-e29b-41d4-a716-446655440003',
      userId: '990e8400-e29b-41d4-a716-446655440004',
      items: [
        {
          productId: 'prod-12345',
          quantity: 10,
          price: 29.99,
          subtotal: 299.9,
        },
      ],
      failureStage: 'stock_reservation' as const,
      errorCode: 'STOCK_UNAVAILABLE',
      errorMessage: 'Insufficient stock for product prod-12345',
      retryable: false,
      failedAt: '2025-10-20T14:30:10.000Z',
    },
  };

  it('should validate a correct OrderFailedEvent', () => {
    const result = OrderFailedEventSchema.safeParse(validOrderFailedEvent);
    expect(result.success).toBe(true);
  });

  it('should accept valid failureStage values', () => {
    const stages = ['validation', 'stock_reservation', 'payment', 'confirmation', 'unknown'] as const;
    stages.forEach((failureStage) => {
      const event = {
        ...validOrderFailedEvent,
        payload: { ...validOrderFailedEvent.payload, failureStage },
      };
      const result = OrderFailedEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid failureStage', () => {
    const invalidEvent = {
      ...validOrderFailedEvent,
      payload: { ...validOrderFailedEvent.payload, failureStage: 'invalid_stage' },
    };
    const result = OrderFailedEventSchema.safeParse(invalidEvent);
    expect(result.success).toBe(false);
  });

  it('should require retryable boolean', () => {
    const { retryable, ...payloadWithoutRetryable } = validOrderFailedEvent.payload;
    const invalidEvent = {
      ...validOrderFailedEvent,
      payload: payloadWithoutRetryable,
    };
    const result = OrderFailedEventSchema.safeParse(invalidEvent);
    expect(result.success).toBe(false);
  });
});

describe('Order Events - Order Confirmed', () => {
  const validOrderConfirmedEvent = {
    eventId: '550e8400-e29b-41d4-a716-446655440130',
    eventType: 'order.confirmed' as const,
    timestamp: '2025-10-20T14:35:00.000Z',
    version: '1.0.0',
    source: 'orders-service' as const,
    payload: {
      orderId: '880e8400-e29b-41d4-a716-446655440003',
      userId: '990e8400-e29b-41d4-a716-446655440004',
      items: [
        {
          productId: 'prod-12345',
          quantity: 5,
          price: 29.99,
          subtotal: 149.95,
        },
      ],
      totalAmount: 149.95,
      currency: 'USD',
      confirmedAt: '2025-10-20T14:35:00.000Z',
    },
  };

  it('should validate a correct OrderConfirmedEvent', () => {
    const result = OrderConfirmedEventSchema.safeParse(validOrderConfirmedEvent);
    expect(result.success).toBe(true);
  });

  it('should reject negative price in items', () => {
    const invalidEvent = {
      ...validOrderConfirmedEvent,
      payload: {
        ...validOrderConfirmedEvent.payload,
        items: [
          {
            productId: 'prod-12345',
            quantity: 5,
            price: -29.99,
            subtotal: 149.95,
          },
        ],
      },
    };
    const result = OrderConfirmedEventSchema.safeParse(invalidEvent);
    expect(result.success).toBe(false);
  });

  it('should reject zero quantity in items', () => {
    const invalidEvent = {
      ...validOrderConfirmedEvent,
      payload: {
        ...validOrderConfirmedEvent.payload,
        items: [
          {
            productId: 'prod-12345',
            quantity: 0,
            price: 29.99,
            subtotal: 0,
          },
        ],
      },
    };
    const result = OrderConfirmedEventSchema.safeParse(invalidEvent);
    expect(result.success).toBe(false);
  });
});
