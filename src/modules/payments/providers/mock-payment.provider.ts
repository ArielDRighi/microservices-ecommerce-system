import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PaymentProvider } from '../interfaces/payment-provider.interface';
import {
  ProcessPaymentDto,
  PaymentResponseDto,
  RefundPaymentDto,
  RefundResponseDto,
  PaymentStatus,
  PaymentMethod,
} from '../dto/payment.dto';

/**
 * Mock Payment Provider
 * Simulates a real payment gateway with realistic scenarios
 */
@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  private readonly logger = new Logger(MockPaymentProvider.name);
  private readonly providerName = 'MockPaymentGateway';

  // In-memory storage
  private payments = new Map<string, PaymentResponseDto>();
  private refunds = new Map<string, RefundResponseDto>();
  private idempotencyKeys = new Map<string, string>();
  private rateLimitMap = new Map<string, { count: number; resetAt: Date }>();

  /**
   * Process a payment
   */
  async processPayment(dto: ProcessPaymentDto): Promise<PaymentResponseDto> {
    this.logger.log(
      `[${this.providerName}] Processing payment for order ${dto.orderId}: ${dto.amount} ${dto.currency}`,
    );

    // Check rate limiting
    await this.checkRateLimit(dto.customerId || dto.orderId);

    // Check idempotency
    if (dto.idempotencyKey && this.idempotencyKeys.has(dto.idempotencyKey)) {
      const existingPaymentId = this.idempotencyKeys.get(dto.idempotencyKey)!;
      const existingPayment = this.payments.get(existingPaymentId);
      if (existingPayment) {
        this.logger.log(
          `[${this.providerName}] Returning existing payment ${existingPaymentId} for idempotency key`,
        );
        return existingPayment;
      }
    }

    // Validate payment method
    if (!this.validatePaymentMethod(dto.paymentMethod)) {
      throw new BadRequestException({
        message: `Payment method ${dto.paymentMethod} not supported by ${this.providerName}`,
        code: 'INVALID_PAYMENT_METHOD',
        retriable: false,
      });
    }

    // Simulate processing delay (100-2000ms)
    await this.simulateDelay(100, 2000);

    // Fraud detection - reject amounts > $10000
    if (dto.amount > 10000) {
      this.logger.warn(`[${this.providerName}] Fraud detection triggered for amount ${dto.amount}`);
      throw new BadRequestException({
        message: 'Payment amount exceeds fraud threshold ($10,000)',
        code: 'FRAUD_DETECTED',
        retriable: false,
      });
    }

    // Simulate payment processing with different outcomes
    const outcome = this.simulatePaymentOutcome();

    const paymentId = randomUUID();
    const transactionId = `${this.providerName.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

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

      this.logger.log(
        `[${this.providerName}] Payment ${paymentId} succeeded for order ${dto.orderId}`,
      );
    } else if (outcome === 'temporary_failure') {
      payment = {
        paymentId,
        transactionId,
        status: PaymentStatus.FAILED,
        orderId: dto.orderId,
        amount: dto.amount,
        currency: dto.currency,
        paymentMethod: dto.paymentMethod,
        failureReason: 'Temporary payment gateway error - please retry',
        failureCode: 'GATEWAY_TIMEOUT',
        createdAt: new Date(),
      };

      this.logger.warn(
        `[${this.providerName}] Payment ${paymentId} temporarily failed (retriable)`,
      );

      // Store the failed payment
      this.payments.set(paymentId, payment);

      throw new Error('Payment gateway temporarily unavailable. Please retry.');
    } else {
      // permanent_failure
      const failureReason = this.getRandomFailureReason();
      const failureCode = this.getRandomFailureCode();

      payment = {
        paymentId,
        transactionId,
        status: PaymentStatus.FAILED,
        orderId: dto.orderId,
        amount: dto.amount,
        currency: dto.currency,
        paymentMethod: dto.paymentMethod,
        failureReason,
        failureCode,
        createdAt: new Date(),
      };

      this.logger.error(
        `[${this.providerName}] Payment ${paymentId} permanently failed: ${failureReason}`,
      );

      // Store the failed payment
      this.payments.set(paymentId, payment);

      throw new BadRequestException({
        message: failureReason,
        code: failureCode,
        retriable: false,
      });
    }

    // Store successful payment
    this.payments.set(paymentId, payment);

    // Store idempotency key
    if (dto.idempotencyKey) {
      this.idempotencyKeys.set(dto.idempotencyKey, paymentId);
    }

    return payment;
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentResponseDto> {
    this.logger.debug(`[${this.providerName}] Getting payment status for ${paymentId}`);

    const payment = this.payments.get(paymentId);

    if (!payment) {
      throw new BadRequestException(`Payment ${paymentId} not found`);
    }

    return payment;
  }

  /**
   * Refund a payment (full or partial)
   */
  async refundPayment(dto: RefundPaymentDto): Promise<RefundResponseDto> {
    this.logger.log(
      `[${this.providerName}] Processing refund for payment ${dto.paymentId}: ${dto.amount}`,
    );

    const payment = this.payments.get(dto.paymentId);

    if (!payment) {
      throw new BadRequestException(`Payment ${dto.paymentId} not found`);
    }

    if (
      payment.status !== PaymentStatus.SUCCEEDED &&
      payment.status !== PaymentStatus.PARTIALLY_REFUNDED
    ) {
      throw new BadRequestException(
        `Cannot refund payment with status ${payment.status}. Only SUCCEEDED or PARTIALLY_REFUNDED payments can be refunded.`,
      );
    }

    // Calculate total refunded amount
    const existingRefunds = Array.from(this.refunds.values()).filter(
      (r) => r.paymentId === dto.paymentId,
    );
    const totalRefunded = existingRefunds.reduce((sum, r) => sum + r.amount, 0);
    const availableForRefund = payment.amount - totalRefunded;

    if (dto.amount > availableForRefund) {
      throw new BadRequestException(
        `Refund amount ${dto.amount} exceeds available amount ${availableForRefund} (original: ${payment.amount}, already refunded: ${totalRefunded})`,
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
      reason: dto.reason || 'Customer requested refund',
      createdAt: new Date(),
    };

    this.refunds.set(refundId, refund);

    // Update payment status
    const newTotalRefunded = totalRefunded + dto.amount;
    if (newTotalRefunded === payment.amount) {
      payment.status = PaymentStatus.REFUNDED;
    } else {
      payment.status = PaymentStatus.PARTIALLY_REFUNDED;
    }

    this.logger.log(`[${this.providerName}] Refund ${refundId} processed successfully`);

    return refund;
  }

  /**
   * Validate payment method
   */
  validatePaymentMethod(paymentMethod: string): boolean {
    const supportedMethods = Object.values(PaymentMethod);
    return supportedMethods.includes(paymentMethod as PaymentMethod);
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return this.providerName;
  }

  /**
   * Check rate limiting (max 10 payments per minute per customer/order)
   */
  private async checkRateLimit(key: string): Promise<void> {
    const now = new Date();
    const limit = this.rateLimitMap.get(key);

    if (!limit || limit.resetAt < now) {
      // Reset or create new limit
      this.rateLimitMap.set(key, {
        count: 1,
        resetAt: new Date(now.getTime() + 60000), // 1 minute
      });
      return;
    }

    if (limit.count >= 10) {
      throw new BadRequestException({
        message: 'Rate limit exceeded. Maximum 10 payment attempts per minute.',
        code: 'RATE_LIMIT_EXCEEDED',
        retriable: true,
      });
    }

    limit.count++;
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
      'Invalid billing address',
      'Card type not accepted',
    ];

    return reasons[Math.floor(Math.random() * reasons.length)]!;
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
      'INVALID_BILLING_ADDRESS',
      'CARD_TYPE_NOT_ACCEPTED',
    ];

    return codes[Math.floor(Math.random() * codes.length)]!;
  }

  /**
   * Clear all data (for testing)
   */
  clearAll(): void {
    this.payments.clear();
    this.refunds.clear();
    this.idempotencyKeys.clear();
    this.rateLimitMap.clear();
    this.logger.warn(`[${this.providerName}] All data cleared`);
  }

  /**
   * Get statistics
   */
  getStats() {
    const payments = Array.from(this.payments.values());
    return {
      provider: this.providerName,
      totalPayments: payments.length,
      totalRefunds: this.refunds.size,
      successfulPayments: payments.filter((p) => p.status === PaymentStatus.SUCCEEDED).length,
      failedPayments: payments.filter((p) => p.status === PaymentStatus.FAILED).length,
      refundedPayments: payments.filter((p) => p.status === PaymentStatus.REFUNDED).length,
      partiallyRefundedPayments: payments.filter(
        (p) => p.status === PaymentStatus.PARTIALLY_REFUNDED,
      ).length,
      totalAmount: payments
        .filter((p) => p.status === PaymentStatus.SUCCEEDED)
        .reduce((sum, p) => sum + p.amount, 0),
      totalRefundedAmount: Array.from(this.refunds.values()).reduce((sum, r) => sum + r.amount, 0),
    };
  }
}
