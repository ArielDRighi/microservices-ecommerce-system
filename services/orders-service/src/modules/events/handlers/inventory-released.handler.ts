import { Injectable } from '@nestjs/common';
import { BaseEventHandler } from './base.event-handler';
import { InventoryReservationReleasedEvent } from '../types/inventory.events';

/**
 * Handler for InventoryReservationReleased events
 * Updates order when inventory reservation is released/cancelled
 */
@Injectable()
export class InventoryReleasedHandler extends BaseEventHandler<InventoryReservationReleasedEvent> {
  get eventType(): string {
    return 'InventoryReservationReleased';
  }

  /**
   * Handle InventoryReservationReleased event
   * - Update order status based on release reason
   * - Release any associated resources
   */
  async handle(event: InventoryReservationReleasedEvent): Promise<void> {
    this.logger.log(
      `Processing InventoryReservationReleased event for reservation ${event.reservationId}, order ${event.orderId}, reason: ${event.reason}`,
    );

    // TODO: Implement business logic:
    // 1. Update order status (cancelled/failed based on reason)
    // 2. Notify user of cancellation
    // 3. Refund if payment was already processed

    this.logger.log(
      `Inventory released: ${event.quantity} units for reservation ${event.reservationId} at ${event.releasedAt}`,
    );
  }
}
