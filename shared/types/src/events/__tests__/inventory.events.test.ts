import {
  StockReservedEventSchema,
  StockConfirmedEventSchema,
  StockReleasedEventSchema,
  StockFailedEventSchema,
  validateInventoryEvent,
  safeValidateInventoryEvent,
} from '../inventory.events';

describe('Inventory Events - Stock Reserved', () => {
  const validStockReservedEvent = {
    eventId: '550e8400-e29b-41d4-a716-446655440000',
    eventType: 'inventory.stock.reserved' as const,
    timestamp: '2025-10-20T14:30:00.000Z',
    version: '1.0.0',
    correlationId: '660e8400-e29b-41d4-a716-446655440001',
    source: 'inventory-service' as const,
    payload: {
      reservationId: '770e8400-e29b-41d4-a716-446655440002',
      productId: 'prod-12345',
      quantity: 5,
      orderId: '880e8400-e29b-41d4-a716-446655440003',
      userId: '990e8400-e29b-41d4-a716-446655440004',
      expiresAt: '2025-10-20T14:45:00.000Z',
      reservedAt: '2025-10-20T14:30:00.000Z',
    },
  };

  it('should validate a correct StockReservedEvent', () => {
    const result = StockReservedEventSchema.safeParse(validStockReservedEvent);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.eventType).toBe('inventory.stock.reserved');
      expect(result.data.payload.quantity).toBe(5);
    }
  });

  it('should reject invalid UUID for eventId', () => {
    const invalidEvent = { ...validStockReservedEvent, eventId: 'not-a-uuid' };
    const result = StockReservedEventSchema.safeParse(invalidEvent);
    expect(result.success).toBe(false);
  });

  it('should reject negative quantity', () => {
    const invalidEvent = {
      ...validStockReservedEvent,
      payload: { ...validStockReservedEvent.payload, quantity: -5 },
    };
    const result = StockReservedEventSchema.safeParse(invalidEvent);
    expect(result.success).toBe(false);
  });

  it('should reject zero quantity', () => {
    const invalidEvent = {
      ...validStockReservedEvent,
      payload: { ...validStockReservedEvent.payload, quantity: 0 },
    };
    const result = StockReservedEventSchema.safeParse(invalidEvent);
    expect(result.success).toBe(false);
  });

  it('should reject wrong eventType', () => {
    const invalidEvent = { ...validStockReservedEvent, eventType: 'wrong.type' };
    const result = StockReservedEventSchema.safeParse(invalidEvent);
    expect(result.success).toBe(false);
  });

  it('should work with validateInventoryEvent helper', () => {
    expect(() => validateInventoryEvent(validStockReservedEvent)).not.toThrow();
  });

  it('should work with safeValidateInventoryEvent helper', () => {
    const result = safeValidateInventoryEvent(validStockReservedEvent);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.eventType).toBe('inventory.stock.reserved');
    }
  });
});

describe('Inventory Events - Stock Confirmed', () => {
  const validStockConfirmedEvent = {
    eventId: '550e8400-e29b-41d4-a716-446655440010',
    eventType: 'inventory.stock.confirmed' as const,
    timestamp: '2025-10-20T14:35:00.000Z',
    version: '1.0.0',
    source: 'inventory-service' as const,
    payload: {
      reservationId: '770e8400-e29b-41d4-a716-446655440002',
      productId: 'prod-12345',
      quantity: 5,
      orderId: '880e8400-e29b-41d4-a716-446655440003',
      userId: '990e8400-e29b-41d4-a716-446655440004',
      confirmedAt: '2025-10-20T14:35:00.000Z',
    },
  };

  it('should validate a correct StockConfirmedEvent', () => {
    const result = StockConfirmedEventSchema.safeParse(validStockConfirmedEvent);
    expect(result.success).toBe(true);
  });

  it('should reject missing required fields', () => {
    const { confirmedAt, ...invalidPayload } = validStockConfirmedEvent.payload;
    const invalidEvent = {
      ...validStockConfirmedEvent,
      payload: invalidPayload,
    };
    const result = StockConfirmedEventSchema.safeParse(invalidEvent);
    expect(result.success).toBe(false);
  });
});

describe('Inventory Events - Stock Released', () => {
  const validStockReleasedEvent = {
    eventId: '550e8400-e29b-41d4-a716-446655440020',
    eventType: 'inventory.stock.released' as const,
    timestamp: '2025-10-20T14:40:00.000Z',
    version: '1.0.0',
    source: 'inventory-service' as const,
    payload: {
      reservationId: '770e8400-e29b-41d4-a716-446655440002',
      productId: 'prod-12345',
      quantity: 5,
      orderId: '880e8400-e29b-41d4-a716-446655440003',
      userId: '990e8400-e29b-41d4-a716-446655440004',
      reason: 'order_cancelled' as const,
      releasedAt: '2025-10-20T14:40:00.000Z',
    },
  };

  it('should validate a correct StockReleasedEvent', () => {
    const result = StockReleasedEventSchema.safeParse(validStockReleasedEvent);
    expect(result.success).toBe(true);
  });

  it('should accept valid reason values', () => {
    const reasons = ['order_cancelled', 'reservation_expired', 'manual_release'] as const;
    reasons.forEach((reason) => {
      const event = {
        ...validStockReleasedEvent,
        payload: { ...validStockReleasedEvent.payload, reason },
      };
      const result = StockReleasedEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid reason values', () => {
    const invalidEvent = {
      ...validStockReleasedEvent,
      payload: { ...validStockReleasedEvent.payload, reason: 'invalid_reason' },
    };
    const result = StockReleasedEventSchema.safeParse(invalidEvent);
    expect(result.success).toBe(false);
  });
});

describe('Inventory Events - Stock Failed', () => {
  const validStockFailedEvent = {
    eventId: '550e8400-e29b-41d4-a716-446655440030',
    eventType: 'inventory.stock.failed' as const,
    timestamp: '2025-10-20T14:30:05.000Z',
    version: '1.0.0',
    source: 'inventory-service' as const,
    payload: {
      operationType: 'reserve' as const,
      productId: 'prod-12345',
      quantity: 10,
      orderId: '880e8400-e29b-41d4-a716-446655440003',
      userId: '990e8400-e29b-41d4-a716-446655440004',
      errorCode: 'INSUFFICIENT_STOCK',
      errorMessage: 'Only 5 units available, requested 10',
      failedAt: '2025-10-20T14:30:05.000Z',
    },
  };

  it('should validate a correct StockFailedEvent', () => {
    const result = StockFailedEventSchema.safeParse(validStockFailedEvent);
    expect(result.success).toBe(true);
  });

  it('should accept valid operationType values', () => {
    const operations = ['reserve', 'confirm', 'release'] as const;
    operations.forEach((operationType) => {
      const event = {
        ...validStockFailedEvent,
        payload: { ...validStockFailedEvent.payload, operationType },
      };
      const result = StockFailedEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });
  });

  it('should allow optional quantity field', () => {
    const { quantity, ...payloadWithoutQuantity } = validStockFailedEvent.payload;
    const event = {
      ...validStockFailedEvent,
      payload: payloadWithoutQuantity,
    };
    const result = StockFailedEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });
});
