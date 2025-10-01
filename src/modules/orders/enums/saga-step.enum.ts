/**
 * Order Processing Saga Steps
 * Represents each step in the order processing workflow
 */
export enum OrderProcessingSagaStep {
  /** Initial state when saga starts */
  STARTED = 'STARTED',

  /** Checking if required stock is available */
  STOCK_VERIFICATION = 'STOCK_VERIFICATION',

  /** Stock verified successfully */
  STOCK_VERIFIED = 'STOCK_VERIFIED',

  /** Reserving stock temporarily */
  STOCK_RESERVATION = 'STOCK_RESERVATION',

  /** Stock reserved successfully */
  STOCK_RESERVED = 'STOCK_RESERVED',

  /** Processing payment */
  PAYMENT_PROCESSING = 'PAYMENT_PROCESSING',

  /** Payment processed successfully */
  PAYMENT_COMPLETED = 'PAYMENT_COMPLETED',

  /** Confirming stock reservation (making it permanent) */
  RESERVATION_CONFIRMATION = 'RESERVATION_CONFIRMATION',

  /** Reservation confirmed */
  RESERVATION_CONFIRMED = 'RESERVATION_CONFIRMED',

  /** Sending order confirmation notification */
  NOTIFICATION_SENDING = 'NOTIFICATION_SENDING',

  /** Notification sent successfully */
  NOTIFICATION_SENT = 'NOTIFICATION_SENT',

  /** Marking order as confirmed */
  ORDER_CONFIRMATION = 'ORDER_CONFIRMATION',

  /** Order confirmed - Final successful state */
  CONFIRMED = 'CONFIRMED',

  /** Order cancelled due to failure */
  CANCELLED = 'CANCELLED',
}

/**
 * Compensation Steps
 * Used when rolling back completed steps
 */
export enum OrderCompensationStep {
  /** Compensating stock reservation */
  RELEASE_STOCK_RESERVATION = 'RELEASE_STOCK_RESERVATION',

  /** Compensating payment */
  REFUND_PAYMENT = 'REFUND_PAYMENT',

  /** Sending failure notification */
  SEND_FAILURE_NOTIFICATION = 'SEND_FAILURE_NOTIFICATION',
}
