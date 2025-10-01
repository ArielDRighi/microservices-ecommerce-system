import { DomainEvent } from '../interfaces/event.interface';

/**
 * Payment method types
 */
export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  PAYPAL = 'PAYPAL',
  BANK_TRANSFER = 'BANK_TRANSFER',
  WALLET = 'WALLET',
}

/**
 * Payment status types
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  CANCELLED = 'CANCELLED',
}

/**
 * Base interface for payment events
 */
export interface PaymentEvent extends DomainEvent {
  aggregateType: 'Payment';
  paymentId: string;
  orderId: string;
}

/**
 * Event published when a payment is initiated
 */
export interface PaymentInitiatedEvent extends PaymentEvent {
  eventType: 'PaymentInitiated';
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  initiatedAt: Date;
}

/**
 * Event published when a payment is successfully processed
 */
export interface PaymentProcessedEvent extends PaymentEvent {
  eventType: 'PaymentProcessed';
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  transactionId: string;
  processedAt: Date;
}

/**
 * Event published when a payment fails
 */
export interface PaymentFailedEvent extends PaymentEvent {
  eventType: 'PaymentFailed';
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  reason: string;
  errorCode?: string;
  failedAt: Date;
}

/**
 * Event published when a payment is refunded
 */
export interface PaymentRefundedEvent extends PaymentEvent {
  eventType: 'PaymentRefunded';
  originalAmount: number;
  refundAmount: number;
  currency: string;
  reason: string;
  refundId: string;
  refundedAt: Date;
}

/**
 * Event published when a payment is cancelled
 */
export interface PaymentCancelledEvent extends PaymentEvent {
  eventType: 'PaymentCancelled';
  amount: number;
  currency: string;
  reason: string;
  cancelledAt: Date;
}

/**
 * Event published when payment status is updated
 */
export interface PaymentStatusUpdatedEvent extends PaymentEvent {
  eventType: 'PaymentStatusUpdated';
  previousStatus: PaymentStatus;
  newStatus: PaymentStatus;
  reason?: string;
  updatedAt: Date;
}

/**
 * Union type of all payment events
 */
export type PaymentEvents =
  | PaymentInitiatedEvent
  | PaymentProcessedEvent
  | PaymentFailedEvent
  | PaymentRefundedEvent
  | PaymentCancelledEvent
  | PaymentStatusUpdatedEvent;
