import { Injectable } from '@nestjs/common';
import { BaseEventHandler } from './base.event-handler';
import { PaymentProcessedEvent } from '../types/payment.events';

/**
 * Handler for PaymentProcessed events
 * Processes successful payment completion
 */
@Injectable()
export class PaymentProcessedHandler extends BaseEventHandler<PaymentProcessedEvent> {
  get eventType(): string {
    return 'PaymentProcessed';
  }

  /**
   * Handle PaymentProcessed event
   * - Update order status
   * - Generate invoice
   * - Send payment receipt
   */
  async handle(event: PaymentProcessedEvent): Promise<void> {
    this.logger.log(
      `Processing PaymentProcessed event for payment ${event.paymentId} (order ${event.orderId})`,
    );

    // TODO: Implement business logic:
    // 1. Update order payment status
    // 2. Generate invoice
    // 3. Send payment receipt to customer
    // 4. Update accounting records

    this.logger.log(
      `Payment ${event.paymentId} processed successfully. Amount: ${event.amount} ${event.currency}`,
    );
  }
}
