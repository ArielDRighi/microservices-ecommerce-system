import { Injectable } from '@nestjs/common';
import { BaseEventHandler } from './base.event-handler';
import { OrderCreatedEvent } from '../types/order.events';

/**
 * Handler for OrderCreated events
 * Logs order creation - actual processing is done by OrderProcessingProcessor via Bull queue
 */
@Injectable()
export class OrderCreatedHandler extends BaseEventHandler<OrderCreatedEvent> {
  get eventType(): string {
    return 'OrderCreated';
  }

  /**
   * Handle OrderCreated event
   * Note: The actual order processing (Saga execution) is handled by the
   * OrderProcessingProcessor via Bull queue for better scalability and retry logic
   */
  async handle(event: OrderCreatedEvent): Promise<void> {
    this.logger.log(
      `OrderCreated event received for order ${event.orderId} with ${event.items.length} items. ` +
        `Total: ${event.totalAmount} ${event.currency}`,
    );

    // The Saga execution is handled by OrderProcessingProcessor via Bull queue
    // This handler just acknowledges the event was published successfully
  }
}
