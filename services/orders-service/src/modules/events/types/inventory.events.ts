import { DomainEvent } from '../interfaces/event.interface';

/**
 * Base interface for inventory events
 */
export interface InventoryEvent extends DomainEvent {
  aggregateType: 'Inventory';
  productId: string;
}

/**
 * Event published when inventory is reserved for an order
 */
export interface InventoryReservedEvent extends InventoryEvent {
  eventType: 'InventoryReserved';
  orderId: string;
  quantity: number;
  reservationId: string;
  expiresAt: Date;
}

/**
 * Event published when inventory reservation is confirmed
 */
export interface InventoryReservationConfirmedEvent extends InventoryEvent {
  eventType: 'InventoryReservationConfirmed';
  orderId: string;
  reservationId: string;
  confirmedAt: Date;
}

/**
 * Event published when inventory reservation is released
 */
export interface InventoryReservationReleasedEvent extends InventoryEvent {
  eventType: 'InventoryReservationReleased';
  orderId: string;
  reservationId: string;
  quantity: number;
  reason: string;
  releasedAt: Date;
}

/**
 * Event published when inventory reservation expires
 */
export interface InventoryReservationExpiredEvent extends InventoryEvent {
  eventType: 'InventoryReservationExpired';
  orderId: string;
  reservationId: string;
  quantity: number;
  expiredAt: Date;
}

/**
 * Event published when inventory stock is updated
 */
export interface InventoryStockUpdatedEvent extends InventoryEvent {
  eventType: 'InventoryStockUpdated';
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  updatedAt: Date;
}

/**
 * Event published when inventory is below threshold (low stock alert)
 */
export interface InventoryLowStockEvent extends InventoryEvent {
  eventType: 'InventoryLowStock';
  currentQuantity: number;
  threshold: number;
  detectedAt: Date;
}

/**
 * Event published when inventory stock reaches zero (depleted)
 */
export interface InventoryStockDepletedEvent extends InventoryEvent {
  eventType: 'InventoryStockDepleted';
  orderId: string;
  userId: string;
  lastQuantity: number;
  depletedAt: Date;
}

/**
 * Union type of all inventory events
 */
export type InventoryEvents =
  | InventoryReservedEvent
  | InventoryReservationConfirmedEvent
  | InventoryReservationReleasedEvent
  | InventoryReservationExpiredEvent
  | InventoryStockUpdatedEvent
  | InventoryLowStockEvent
  | InventoryStockDepletedEvent;
