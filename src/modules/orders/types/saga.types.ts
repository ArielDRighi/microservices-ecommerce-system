/**
 * Saga Step Definitions
 * Define todos los pasos posibles en el saga de procesamiento de órdenes
 */
export enum SagaStep {
  STARTED = 'STARTED',
  STOCK_VERIFIED = 'STOCK_VERIFIED',
  STOCK_RESERVED = 'STOCK_RESERVED',
  PAYMENT_PROCESSING = 'PAYMENT_PROCESSING',
  PAYMENT_COMPLETED = 'PAYMENT_COMPLETED',
  NOTIFICATION_SENT = 'NOTIFICATION_SENT',
  CONFIRMED = 'CONFIRMED',
}

/**
 * Saga Compensation Actions
 * Acciones de compensación que pueden ejecutarse en caso de fallo
 */
export enum CompensationAction {
  RELEASE_INVENTORY = 'RELEASE_INVENTORY',
  CANCEL_ORDER = 'CANCEL_ORDER',
  REFUND_PAYMENT = 'REFUND_PAYMENT',
  NOTIFY_FAILURE = 'NOTIFY_FAILURE',
}

/**
 * Saga State Data
 * Estructura de datos que se persiste en cada paso del saga
 */
export interface SagaStateData {
  orderId: string;
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  currency: string;
  reservationId?: string;
  paymentId?: string;
  stockVerificationResult?: {
    verified: boolean;
    unavailableProducts?: string[];
  };
  paymentResult?: {
    success: boolean;
    transactionId?: string;
    failureReason?: string;
  };
  notificationResult?: {
    sent: boolean;
    failureReason?: string;
  };
  startedAt: Date;
  lastStepAt?: Date;
  compensationExecuted?: CompensationAction[];
}

/**
 * Saga Step Result
 * Resultado de la ejecución de un step del saga
 */
export interface SagaStepResult {
  success: boolean;
  stepName: SagaStep;
  data?: Record<string, unknown>;
  error?: {
    message: string;
    code?: string;
    retryable: boolean;
  };
  executionTimeMs: number;
}

/**
 * Saga Metrics
 * Métricas de performance para cada step
 */
export interface SagaMetrics {
  sagaId: string;
  orderId: string;
  totalDurationMs: number;
  stepMetrics: Array<{
    step: SagaStep;
    durationMs: number;
    retryCount: number;
    success: boolean;
  }>;
  compensationExecuted: boolean;
  finalStatus: 'COMPLETED' | 'COMPENSATED' | 'FAILED';
}

/**
 * Saga Configuration
 * Configuración para el comportamiento del saga
 */
export interface SagaConfig {
  maxRetries: number;
  timeoutMs: number;
  retryDelayMs: number;
  maxRetryDelayMs: number;
  jitterEnabled: boolean;
  circuitBreakerEnabled: boolean;
  circuitBreakerThreshold: number;
  circuitBreakerResetTimeMs: number;
}

/**
 * Default Saga Configuration
 */
export const DEFAULT_SAGA_CONFIG: SagaConfig = {
  maxRetries: 3,
  timeoutMs: 10 * 60 * 1000, // 10 minutos
  retryDelayMs: 1000, // 1 segundo inicial
  maxRetryDelayMs: 30000, // máximo 30 segundos
  jitterEnabled: true,
  circuitBreakerEnabled: true,
  circuitBreakerThreshold: 5,
  circuitBreakerResetTimeMs: 60000, // 1 minuto
};
