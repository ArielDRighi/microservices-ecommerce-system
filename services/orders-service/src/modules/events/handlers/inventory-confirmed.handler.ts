import { Injectable } from '@nestjs/common';
import { BaseEventHandler } from './base.event-handler';
import { InventoryReservationConfirmedEvent } from '../types/inventory.events';

/**
 * Handler for InventoryReservationConfirmed events
 * Updates order status when inventory is confirmed
 */
@Injectable()
export class InventoryConfirmedHandler extends BaseEventHandler<InventoryReservationConfirmedEvent> {
  get eventType(): string {
    return 'InventoryReservationConfirmed';
  }

  /**
   * Handle InventoryReservationConfirmed event
   * - Update order status to processing
   * - Trigger payment process
   */
  async handle(event: InventoryReservationConfirmedEvent): Promise<void> {
    this.logger.log(
      `Processing InventoryReservationConfirmed event for reservation ${event.reservationId}, order ${event.orderId}`,
    );

    // TODO: Implement business logic:
    // 1. Update order status to 'processing'
    // 2. Trigger payment service
    // 3. Log confirmation

    this.logger.log(
      `Inventory confirmed for reservation ${event.reservationId} at ${event.confirmedAt}`,
    );
  }
}
