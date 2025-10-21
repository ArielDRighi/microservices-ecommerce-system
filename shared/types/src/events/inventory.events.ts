import { z } from 'zod';

/**
 * Base Event Schema
 * All events extend this base structure for consistency
 */
export const BaseEventSchema = z.object({
  eventId: z.string().uuid().describe('Unique identifier for this event'),
  eventType: z.string().describe('Type of event (routing key)'),
  timestamp: z.string().datetime().describe('ISO 8601 timestamp when event occurred'),
  version: z.string().default('1.0.0').describe('Event schema version'),
  correlationId: z.string().uuid().optional().describe('ID to correlate related events'),
  source: z.string().describe('Service that emitted the event'),
});

export type BaseEvent = z.infer<typeof BaseEventSchema>;

/**
 * Stock Reserved Event
 * Emitted by Inventory Service when stock is successfully reserved
 */
export const StockReservedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('inventory.stock.reserved'),
  source: z.literal('inventory-service'),
  payload: z.object({
    reservationId: z.string().uuid().describe('Unique reservation identifier'),
    productId: z.string().describe('Product identifier'),
    quantity: z.number().int().positive().describe('Quantity reserved'),
    orderId: z.string().uuid().describe('Order that triggered the reservation'),
    userId: z.string().uuid().describe('User who made the reservation'),
    expiresAt: z.string().datetime().describe('When the reservation expires if not confirmed'),
    reservedAt: z.string().datetime().describe('When the reservation was made'),
  }),
});

export type StockReservedEvent = z.infer<typeof StockReservedEventSchema>;

/**
 * Stock Confirmed Event
 * Emitted by Inventory Service when a reservation is confirmed
 */
export const StockConfirmedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('inventory.stock.confirmed'),
  source: z.literal('inventory-service'),
  payload: z.object({
    reservationId: z.string().uuid().describe('Reservation identifier that was confirmed'),
    productId: z.string().describe('Product identifier'),
    quantity: z.number().int().positive().describe('Quantity confirmed'),
    orderId: z.string().uuid().describe('Order that was confirmed'),
    userId: z.string().uuid().describe('User who owns the order'),
    confirmedAt: z.string().datetime().describe('When the confirmation occurred'),
  }),
});

export type StockConfirmedEvent = z.infer<typeof StockConfirmedEventSchema>;

/**
 * Stock Released Event
 * Emitted by Inventory Service when a reservation is released/cancelled
 */
export const StockReleasedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('inventory.stock.released'),
  source: z.literal('inventory-service'),
  payload: z.object({
    reservationId: z.string().uuid().describe('Reservation identifier that was released'),
    productId: z.string().describe('Product identifier'),
    quantity: z.number().int().positive().describe('Quantity released back to stock'),
    orderId: z.string().uuid().describe('Order that triggered the release'),
    userId: z.string().uuid().describe('User who owns the order'),
    reason: z.enum(['order_cancelled', 'reservation_expired', 'manual_release']).describe('Why the stock was released'),
    releasedAt: z.string().datetime().describe('When the release occurred'),
  }),
});

export type StockReleasedEvent = z.infer<typeof StockReleasedEventSchema>;

/**
 * Stock Failed Event
 * Emitted by Inventory Service when a stock operation fails
 */
export const StockFailedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('inventory.stock.failed'),
  source: z.literal('inventory-service'),
  payload: z.object({
    operationType: z.enum(['reserve', 'confirm', 'release']).describe('Which operation failed'),
    productId: z.string().describe('Product identifier'),
    quantity: z.number().int().positive().optional().describe('Quantity involved in the operation'),
    orderId: z.string().uuid().describe('Order that triggered the operation'),
    userId: z.string().uuid().describe('User who owns the order'),
    reservationId: z.string().uuid().optional().describe('Reservation ID if applicable'),
    errorCode: z.string().describe('Error code for troubleshooting'),
    errorMessage: z.string().describe('Human-readable error message'),
    failedAt: z.string().datetime().describe('When the failure occurred'),
  }),
});

export type StockFailedEvent = z.infer<typeof StockFailedEventSchema>;

/**
 * Stock Depleted Event
 * Emitted by Inventory Service when available stock reaches zero
 */
export const StockDepletedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('inventory.stock.depleted'),
  source: z.literal('inventory-service'),
  payload: z.object({
    productId: z.string().describe('Product identifier that is now depleted'),
    orderId: z.string().uuid().describe('Order that caused the depletion'),
    userId: z.string().uuid().describe('User who owns the order'),
    depletedAt: z.string().datetime().describe('When the stock was depleted'),
    lastQuantity: z.number().int().positive().describe('The last quantity that was reserved/confirmed before depletion'),
  }),
});

export type StockDepletedEvent = z.infer<typeof StockDepletedEventSchema>;

/**
 * Union type of all inventory events
 */
export const InventoryEventSchema = z.discriminatedUnion('eventType', [
  StockReservedEventSchema,
  StockConfirmedEventSchema,
  StockReleasedEventSchema,
  StockFailedEventSchema,
  StockDepletedEventSchema,
]);

export type InventoryEvent = z.infer<typeof InventoryEventSchema>;

/**
 * Validation helper function
 */
export function validateInventoryEvent(data: unknown): InventoryEvent {
  return InventoryEventSchema.parse(data);
}

/**
 * Safe validation that returns errors instead of throwing
 */
export function safeValidateInventoryEvent(
  data: unknown
): { success: true; data: InventoryEvent } | { success: false; error: z.ZodError } {
  const result = InventoryEventSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
