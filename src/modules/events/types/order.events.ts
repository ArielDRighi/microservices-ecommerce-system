import { DomainEvent } from '../interfaces/event.interface';

/**
 * Order item for order events
 */
export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

/**
 * Base interface for order events
 */
export interface OrderEvent extends DomainEvent {
  aggregateType: 'Order';
  orderId: string;
  userId: string;
}

/**
 * Event published when an order is created
 */
export interface OrderCreatedEvent extends OrderEvent {
  eventType: 'OrderCreated';
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  shippingAddress?: {
    street: string;
    city: string;
    state?: string;
    country: string;
    postalCode?: string;
  };
}

/**
 * Event published when an order is confirmed (payment successful)
 */
export interface OrderConfirmedEvent extends OrderEvent {
  eventType: 'OrderConfirmed';
  paymentId: string;
  confirmedAt: Date;
}

/**
 * Event published when an order fails
 */
export interface OrderFailedEvent extends OrderEvent {
  eventType: 'OrderFailed';
  reason: string;
  failureCode?: string;
  failedAt: Date;
}

/**
 * Event published when an order is cancelled
 */
export interface OrderCancelledEvent extends OrderEvent {
  eventType: 'OrderCancelled';
  reason: string;
  cancelledBy: string;
  cancelledAt: Date;
}

/**
 * Event published when an order is shipped
 */
export interface OrderShippedEvent extends OrderEvent {
  eventType: 'OrderShipped';
  trackingNumber?: string;
  carrier?: string;
  shippedAt: Date;
}

/**
 * Event published when an order is delivered
 */
export interface OrderDeliveredEvent extends OrderEvent {
  eventType: 'OrderDelivered';
  deliveredAt: Date;
  signedBy?: string;
}

/**
 * Union type of all order events
 */
export type OrderEvents =
  | OrderCreatedEvent
  | OrderConfirmedEvent
  | OrderFailedEvent
  | OrderCancelledEvent
  | OrderShippedEvent
  | OrderDeliveredEvent;
