import { z } from 'zod';
import { BaseEventSchema } from './inventory.events';

/**
 * Order Item Schema
 * Represents a single item in an order
 */
export const OrderItemSchema = z.object({
  productId: z.string().describe('Product identifier'),
  quantity: z.number().int().positive().describe('Quantity ordered'),
  price: z.number().positive().describe('Price per unit'),
  subtotal: z.number().positive().describe('Total for this item (quantity * price)'),
});

export type OrderItem = z.infer<typeof OrderItemSchema>;

/**
 * Order Created Event
 * Emitted by Orders Service when a new order is created
 */
export const OrderCreatedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('order.created'),
  source: z.literal('orders-service'),
  payload: z.object({
    orderId: z.string().uuid().describe('Unique order identifier'),
    userId: z.string().uuid().describe('User who created the order'),
    items: z.array(OrderItemSchema).min(1).describe('Items in the order'),
    totalAmount: z.number().positive().describe('Total order amount'),
    currency: z.string().default('USD').describe('Currency code'),
    status: z.literal('pending').describe('Initial order status'),
    createdAt: z.string().datetime().describe('When the order was created'),
    metadata: z
      .object({
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
        referrer: z.string().optional(),
      })
      .optional()
      .describe('Additional metadata'),
  }),
});

export type OrderCreatedEvent = z.infer<typeof OrderCreatedEventSchema>;

/**
 * Order Cancelled Event
 * Emitted by Orders Service when an order is cancelled
 */
export const OrderCancelledEventSchema = BaseEventSchema.extend({
  eventType: z.literal('order.cancelled'),
  source: z.literal('orders-service'),
  payload: z.object({
    orderId: z.string().uuid().describe('Order identifier that was cancelled'),
    userId: z.string().uuid().describe('User who owns the order'),
    items: z.array(OrderItemSchema).describe('Items that need stock release'),
    reason: z
      .enum([
        'user_requested',
        'payment_failed',
        'stock_unavailable',
        'timeout',
        'fraud_detected',
        'system_error',
      ])
      .describe('Why the order was cancelled'),
    cancelledBy: z.enum(['user', 'system', 'admin']).describe('Who cancelled the order'),
    cancelledAt: z.string().datetime().describe('When the cancellation occurred'),
    refundRequired: z.boolean().describe('Whether a refund is required'),
  }),
});

export type OrderCancelledEvent = z.infer<typeof OrderCancelledEventSchema>;

/**
 * Order Failed Event
 * Emitted by Orders Service when order processing fails
 */
export const OrderFailedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('order.failed'),
  source: z.literal('orders-service'),
  payload: z.object({
    orderId: z.string().uuid().describe('Order identifier that failed'),
    userId: z.string().uuid().describe('User who owns the order'),
    items: z.array(OrderItemSchema).describe('Items involved in the failure'),
    failureStage: z
      .enum(['validation', 'stock_reservation', 'payment', 'confirmation', 'unknown'])
      .describe('Which stage failed'),
    errorCode: z.string().describe('Error code for troubleshooting'),
    errorMessage: z.string().describe('Human-readable error message'),
    retryable: z.boolean().describe('Whether the operation can be retried'),
    failedAt: z.string().datetime().describe('When the failure occurred'),
  }),
});

export type OrderFailedEvent = z.infer<typeof OrderFailedEventSchema>;

/**
 * Order Confirmed Event
 * Emitted by Orders Service when an order is successfully confirmed
 * (This event might be consumed by other services like Shipping, Notifications)
 */
export const OrderConfirmedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('order.confirmed'),
  source: z.literal('orders-service'),
  payload: z.object({
    orderId: z.string().uuid().describe('Order identifier that was confirmed'),
    userId: z.string().uuid().describe('User who owns the order'),
    items: z.array(OrderItemSchema).describe('Confirmed items'),
    totalAmount: z.number().positive().describe('Total order amount'),
    currency: z.string().default('USD').describe('Currency code'),
    confirmedAt: z.string().datetime().describe('When the order was confirmed'),
  }),
});

export type OrderConfirmedEvent = z.infer<typeof OrderConfirmedEventSchema>;

/**
 * Union type of all order events
 */
export const OrderEventSchema = z.discriminatedUnion('eventType', [
  OrderCreatedEventSchema,
  OrderCancelledEventSchema,
  OrderFailedEventSchema,
  OrderConfirmedEventSchema,
]);

export type OrderEvent = z.infer<typeof OrderEventSchema>;

/**
 * Validation helper function
 */
export function validateOrderEvent(data: unknown): OrderEvent {
  return OrderEventSchema.parse(data);
}

/**
 * Safe validation that returns errors instead of throwing
 */
export function safeValidateOrderEvent(
  data: unknown
): { success: true; data: OrderEvent } | { success: false; error: z.ZodError } {
  const result = OrderEventSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
