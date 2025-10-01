import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ProcessPaymentDto,
  PaymentResponseDto,
  RefundPaymentDto,
  RefundResponseDto,
  PaymentStatus,
} from './dto/payment.dto';

/**
 * Mock Payments Service
 * Simulates a payment gateway with realistic scenarios:
 * - 80% success rate
 * - 15% temporary failures (retriable)
 * - 5% permanent failures
 * - Random latency simulation
 * - Fraud detection for high amounts
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  // In-memory storage for payments (for mock purposes)
  private payments = new Map<string, PaymentResponseDto>();
  private refunds = new Map<string, RefundResponseDto>();
  private idempotencyKeys = new Map<string, string>(); // key -> paymentId

  /**
   * Process a payment
   */
  async processPayment(dto: ProcessPaymentDto): Promise<PaymentResponseDto> {
    this.logger.log(`Processing payment for order ${dto.orderId}: ${dto.amount} ${dto.currency}`);

    // Check idempotency
    if (dto.idempotencyKey && this.idempotencyKeys.has(dto.idempotencyKey)) {
      const existingPaymentId = this.idempotencyKeys.get(dto.idempotencyKey)!;
      const existingPayment = this.payments.get(existingPaymentId);
      if (existingPayment) {
        this.logger.log(
          `Returning existing payment ${existingPaymentId} for idempotency key ${dto.idempotencyKey}`,
        );
        return existingPayment;
      }
    }

    // Simulate processing delay (100-2000ms)
    await this.simulateDelay(100, 2000);

    // Fraud detection - reject amounts > $10000
    if (dto.amount > 10000) {
      this.logger.warn(`Fraud detection triggered for amount ${dto.amount}`);
      throw new BadRequestException({
        message: 'Payment amount exceeds fraud threshold',
        code: 'FRAUD_DETECTED',
        retriable: false,
      });
    }

    // Simulate payment processing with different outcomes
    const outcome = this.simulatePaymentOutcome();

    const paymentId = randomUUID();
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    let payment: PaymentResponseDto;

    if (outcome === 'success') {
      payment = {
        paymentId,
        transactionId,
        status: PaymentStatus.SUCCEEDED,
        orderId: dto.orderId,
        amount: dto.amount,
        currency: dto.currency,
        paymentMethod: dto.paymentMethod,
        createdAt: new Date(),
        processedAt: new Date(),
      };

      this.logger.log(`Payment ${paymentId} succeeded for order ${dto.orderId}`);
    } else if (outcome === 'temporary_failure') {
      payment = {
        paymentId,
        transactionId,
        status: PaymentStatus.FAILED,
        orderId: dto.orderId,
        amount: dto.amount,
        currency: dto.currency,
        paymentMethod: dto.paymentMethod,
        failureReason: 'Temporary payment gateway error',
        failureCode: 'GATEWAY_TIMEOUT',
        createdAt: new Date(),
      };

      this.logger.warn(`Payment ${paymentId} temporarily failed (retriable)`);

      throw new Error('Payment gateway temporarily unavailable. Please retry.');
    } else {
      // permanent_failure
      payment = {
        paymentId,
        transactionId,
        status: PaymentStatus.FAILED,
        orderId: dto.orderId,
        amount: dto.amount,
        currency: dto.currency,
        paymentMethod: dto.paymentMethod,
        failureReason: this.getRandomFailureReason(),
        failureCode: this.getRandomFailureCode(),
        createdAt: new Date(),
      };

      this.logger.error(`Payment ${paymentId} permanently failed: ${payment.failureReason}`);

      throw new BadRequestException({
        message: payment.failureReason,
        code: payment.failureCode,
        retriable: false,
      });
    }

    // Store payment
    this.payments.set(paymentId, payment);

    // Store idempotency key
    if (dto.idempotencyKey) {
      this.idempotencyKeys.set(dto.idempotencyKey, paymentId);
    }

    return payment;
  }

  /**
   * Get payment status by ID
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentResponseDto> {
    this.logger.debug(`Getting payment status for ${paymentId}`);

    const payment = this.payments.get(paymentId);

    if (!payment) {
      throw new BadRequestException(`Payment ${paymentId} not found`);
    }

    return payment;
  }

  /**
   * Refund a payment
   */
  async refundPayment(dto: RefundPaymentDto): Promise<RefundResponseDto> {
    this.logger.log(`Processing refund for payment ${dto.paymentId}: ${dto.amount}`);

    const payment = this.payments.get(dto.paymentId);

    if (!payment) {
      throw new BadRequestException(`Payment ${dto.paymentId} not found`);
    }

    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new BadRequestException(`Cannot refund payment with status ${payment.status}`);
    }

    if (dto.amount > payment.amount) {
      throw new BadRequestException(
        `Refund amount ${dto.amount} exceeds payment amount ${payment.amount}`,
      );
    }

    // Simulate processing delay
    await this.simulateDelay(100, 1000);

    const refundId = randomUUID();

    const refund: RefundResponseDto = {
      refundId,
      paymentId: dto.paymentId,
      amount: dto.amount,
      currency: payment.currency,
      status: PaymentStatus.REFUNDED,
      reason: dto.reason,
      createdAt: new Date(),
    };

    this.refunds.set(refundId, refund);

    // Update payment status
    if (dto.amount === payment.amount) {
      payment.status = PaymentStatus.REFUNDED;
    } else {
      payment.status = PaymentStatus.PARTIALLY_REFUNDED;
    }

    this.logger.log(`Refund ${refundId} processed successfully`);

    return refund;
  }

  /**
   * Simulate payment processing delay
   */
  private async simulateDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Simulate payment outcome
   * - 80% success
   * - 15% temporary failure (retriable)
   * - 5% permanent failure
   */
  private simulatePaymentOutcome(): 'success' | 'temporary_failure' | 'permanent_failure' {
    const random = Math.random() * 100;

    if (random < 80) {
      return 'success';
    } else if (random < 95) {
      return 'temporary_failure';
    } else {
      return 'permanent_failure';
    }
  }

  /**
   * Get random failure reason for permanent failures
   */
  private getRandomFailureReason(): string {
    const reasons = [
      'Insufficient funds',
      'Card expired',
      'Card declined by issuer',
      'Invalid card number',
      'CVV verification failed',
      'Card reported stolen',
      'Daily transaction limit exceeded',
      'Card not activated',
    ];

    return reasons[Math.floor(Math.random() * reasons.length)] || reasons[0] || 'Payment failed';
  }

  /**
   * Get random failure code
   */
  private getRandomFailureCode(): string {
    const codes = [
      'INSUFFICIENT_FUNDS',
      'CARD_EXPIRED',
      'CARD_DECLINED',
      'INVALID_CARD',
      'CVV_FAILED',
      'CARD_STOLEN',
      'LIMIT_EXCEEDED',
      'CARD_NOT_ACTIVATED',
    ];

    return codes[Math.floor(Math.random() * codes.length)] || codes[0] || 'PAYMENT_FAILED';
  }

  /**
   * Clear all payments (for testing)
   */
  clearAll(): void {
    this.payments.clear();
    this.refunds.clear();
    this.idempotencyKeys.clear();
    this.logger.warn('All payments and refunds cleared');
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalPayments: this.payments.size,
      totalRefunds: this.refunds.size,
      successfulPayments: Array.from(this.payments.values()).filter(
        (p) => p.status === PaymentStatus.SUCCEEDED,
      ).length,
      failedPayments: Array.from(this.payments.values()).filter(
        (p) => p.status === PaymentStatus.FAILED,
      ).length,
    };
  }
}
