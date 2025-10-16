import {
  ProcessPaymentDto,
  PaymentResponseDto,
  RefundPaymentDto,
  RefundResponseDto,
} from '../dto/payment.dto';

/**
 * Payment Provider Interface
 * Defines the contract that all payment providers must implement
 */
export interface PaymentProvider {
  /**
   * Process a payment transaction
   */
  processPayment(dto: ProcessPaymentDto): Promise<PaymentResponseDto>;

  /**
   * Get the status of a payment
   */
  getPaymentStatus(paymentId: string): Promise<PaymentResponseDto>;

  /**
   * Refund a payment (full or partial)
   */
  refundPayment(dto: RefundPaymentDto): Promise<RefundResponseDto>;

  /**
   * Validate payment method
   */
  validatePaymentMethod(paymentMethod: string): boolean;

  /**
   * Get provider name
   */
  getProviderName(): string;
}

/**
 * Payment Webhook Event
 */
export interface PaymentWebhookEvent {
  eventId: string;
  eventType: 'payment.succeeded' | 'payment.failed' | 'payment.refunded' | 'payment.processing';
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Currency Conversion Rate
 */
export interface CurrencyConversionRate {
  from: string;
  to: string;
  rate: number;
  timestamp: Date;
}
