/**
 * @microservices-ecommerce/shared-types
 * 
 * Shared event types and schemas for the microservices-ecommerce-system
 * Epic 2.5 - Task T2.5.2: Event Schema Definitions
 * 
 * This package provides:
 * - TypeScript types for all events
 * - Zod schemas for runtime validation
 * - Validation helper functions
 * - JSON examples for documentation
 */

// Re-export all inventory events
export {
  BaseEventSchema,
  BaseEvent,
  StockReservedEventSchema,
  StockReservedEvent,
  StockConfirmedEventSchema,
  StockConfirmedEvent,
  StockReleasedEventSchema,
  StockReleasedEvent,
  StockFailedEventSchema,
  StockFailedEvent,
  InventoryEventSchema,
  InventoryEvent,
  validateInventoryEvent,
  safeValidateInventoryEvent,
} from './events/inventory.events';

// Re-export all order events
export {
  OrderItemSchema,
  OrderItem,
  OrderCreatedEventSchema,
  OrderCreatedEvent,
  OrderCancelledEventSchema,
  OrderCancelledEvent,
  OrderFailedEventSchema,
  OrderFailedEvent,
  OrderConfirmedEventSchema,
  OrderConfirmedEvent,
  OrderEventSchema,
  OrderEvent,
  validateOrderEvent,
  safeValidateOrderEvent,
} from './events/order.events';

// Export routing keys as constants
export const INVENTORY_ROUTING_KEYS = {
  STOCK_RESERVED: 'inventory.stock.reserved',
  STOCK_CONFIRMED: 'inventory.stock.confirmed',
  STOCK_RELEASED: 'inventory.stock.released',
  STOCK_FAILED: 'inventory.stock.failed',
} as const;

export const ORDER_ROUTING_KEYS = {
  ORDER_CREATED: 'order.created',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_FAILED: 'order.failed',
  ORDER_CONFIRMED: 'order.confirmed',
} as const;

// Export exchange names as constants
export const EXCHANGES = {
  INVENTORY_EVENTS: 'inventory.events',
  ORDERS_EVENTS: 'orders.events',
} as const;

// Export queue names as constants
export const QUEUES = {
  ORDERS_INVENTORY_EVENTS: 'orders.inventory_events',
  INVENTORY_ORDER_EVENTS: 'inventory.order_events',
} as const;

// Export type utilities
export type RoutingKey =
  | typeof INVENTORY_ROUTING_KEYS[keyof typeof INVENTORY_ROUTING_KEYS]
  | typeof ORDER_ROUTING_KEYS[keyof typeof ORDER_ROUTING_KEYS];

export type ExchangeName = typeof EXCHANGES[keyof typeof EXCHANGES];
export type QueueName = typeof QUEUES[keyof typeof QUEUES];
