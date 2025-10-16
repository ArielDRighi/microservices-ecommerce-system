/**
 * Data structure for Order Processing Saga
 */
export interface OrderProcessingSagaData {
  /** Order ID being processed */
  orderId: string;

  /** User ID who created the order */
  userId: string;

  /** Total amount of the order */
  totalAmount: number;

  /** Currency of the order */
  currency: string;

  /** Order items with product details */
  items: OrderSagaItem[];

  /** Reservation IDs for each product */
  reservations?: OrderReservation[];

  /** Payment ID if payment was successful */
  paymentId?: string;

  /** Payment transaction ID */
  transactionId?: string;

  /** Timestamp when saga started */
  startedAt: string;

  /** Timestamp when current step started */
  stepStartedAt?: string;

  /** Number of retry attempts for current step */
  retryAttempts?: number;

  /** Errors encountered during processing */
  errors?: SagaError[];

  /** Performance metrics for each step */
  metrics?: Record<string, StepMetric>;
}

export interface OrderSagaItem {
  /** Product ID */
  productId: string;

  /** Product SKU */
  sku: string;

  /** Product name */
  name: string;

  /** Quantity ordered */
  quantity: number;

  /** Unit price at time of order */
  unitPrice: number;

  /** Total price for this item */
  totalPrice: number;
}

export interface OrderReservation {
  /** Product ID */
  productId: string;

  /** Quantity reserved */
  quantity: number;

  /** Reservation ID from inventory system */
  reservationId: string;

  /** Timestamp when reservation was created */
  reservedAt: string;

  /** Timestamp when reservation expires (if not confirmed) */
  expiresAt: string;

  /** Whether reservation has been confirmed */
  confirmed?: boolean;
}

export interface SagaError {
  /** Step where error occurred */
  step: string;

  /** Error message */
  message: string;

  /** Error code if available */
  code?: string;

  /** Full error stack trace */
  stack?: string;

  /** Timestamp when error occurred */
  timestamp: string;

  /** Whether this is a retriable error */
  retriable: boolean;
}

export interface StepMetric {
  /** Step name */
  step: string;

  /** Duration in milliseconds */
  durationMs: number;

  /** Timestamp when step started */
  startedAt: string;

  /** Timestamp when step completed */
  completedAt: string;

  /** Whether step succeeded */
  success: boolean;

  /** Number of retries for this step */
  retries: number;
}

/**
 * Compensation data for rollback operations
 */
export interface OrderCompensationData {
  /** Stock reservations to release */
  reservationsToRelease?: OrderReservation[];

  /** Payment to refund */
  paymentToRefund?: {
    paymentId: string;
    amount: number;
    currency: string;
    transactionId?: string;
  };

  /** Reason for compensation */
  compensationReason?: string;

  /** Steps that were compensated */
  compensatedSteps?: string[];

  /** Compensation started timestamp */
  compensationStartedAt?: string;

  /** Compensation completed timestamp */
  compensationCompletedAt?: string;
}

/**
 * Result of a saga step execution
 */
export interface SagaStepResult<T = unknown> {
  /** Whether step succeeded */
  success: boolean;

  /** Data returned by the step */
  data?: T;

  /** Error if step failed */
  error?: {
    message: string;
    code?: string;
    retriable: boolean;
    stack?: string;
  };

  /** Duration in milliseconds */
  durationMs: number;

  /** Whether this step can be retried */
  canRetry: boolean;

  /** Next step to execute */
  nextStep?: string;
}

/**
 * Context passed to each saga step
 */
export interface SagaStepContext {
  /** Current saga state data */
  sagaData: OrderProcessingSagaData;

  /** Compensation data */
  compensationData?: OrderCompensationData;

  /** Correlation ID for distributed tracing */
  correlationId: string;

  /** Current step name */
  currentStep: string;

  /** Previous step name */
  previousStep?: string;

  /** Retry attempt number */
  retryAttempt: number;

  /** Max retries allowed */
  maxRetries: number;

  /** Timeout for this step in milliseconds */
  stepTimeout: number;

  /** Overall saga timeout timestamp */
  sagaExpiresAt: Date;
}
