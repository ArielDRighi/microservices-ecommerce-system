/**
 * Base interface for all job data in the queue system
 * Ensures consistent structure across different job types
 */
export interface BaseJobData {
  /**
   * Unique identifier for the job
   * Used for idempotency and tracking
   */
  jobId: string;

  /**
   * Timestamp when the job was created
   */
  createdAt: Date;

  /**
   * Optional correlation ID for distributed tracing
   */
  correlationId?: string;

  /**
   * User ID who initiated the action (if applicable)
   */
  userId?: string;

  /**
   * Additional metadata for the job
   */
  metadata?: Record<string, unknown>;
}

/**
 * Order Processing Job Data
 */
export interface OrderProcessingJobData extends BaseJobData {
  orderId: string;
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  totalAmount: number;
  currency: string;
  idempotencyKey: string;
}

/**
 * Payment Processing Job Data
 */
export interface PaymentProcessingJobData extends BaseJobData {
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
  paymentMethod: 'credit_card' | 'debit_card' | 'bank_transfer' | 'paypal';
  customerId: string;
}

/**
 * Inventory Management Job Data
 */
export interface InventoryManagementJobData extends BaseJobData {
  action: 'reserve' | 'release' | 'confirm' | 'replenish';
  productId: string;
  quantity: number;
  orderId?: string;
  reservationId?: string;
  reason?: string;
}

/**
 * Notification Sending Job Data
 */
export interface NotificationSendingJobData extends BaseJobData {
  type: 'email' | 'sms' | 'push';
  recipient: string;
  template: string;
  subject?: string;
  data: Record<string, unknown>;
  priority?: 'high' | 'normal' | 'low';
}

/**
 * Job Result interface for consistent job completion responses
 */
export interface JobResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
  processedAt: Date;
  duration: number; // milliseconds
  attemptsMade: number;
}

/**
 * Job Progress interface for tracking long-running jobs
 */
export interface JobProgress {
  percentage: number; // 0-100
  currentStep?: string;
  totalSteps?: number;
  completedSteps?: number;
  message?: string;
  data?: Record<string, unknown>;
}

/**
 * Queue Metrics interface for monitoring
 */
export interface QueueMetrics {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  timestamp: Date;
}

/**
 * Dead Letter Queue Entry
 */
export interface DeadLetterEntry<T extends BaseJobData = BaseJobData> {
  originalJobId: string;
  queueName: string;
  jobData: T;
  error: {
    message: string;
    stack?: string;
    code?: string;
  };
  attemptsMade: number;
  firstFailedAt: Date;
  lastFailedAt: Date;
  movedToDeadLetterAt: Date;
}
