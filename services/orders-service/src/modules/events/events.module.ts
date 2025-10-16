import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { OutboxEvent } from './entities/outbox-event.entity';
import { EventPublisher } from './publishers/event.publisher';
import { OutboxProcessor } from './processors/outbox.processor';
import {
  OrderCreatedHandler,
  OrderConfirmedHandler,
  PaymentProcessedHandler,
  InventoryReservedHandler,
} from './handlers';

/**
 * Events Module
 * Provides event-driven architecture with Outbox Pattern
 */
@Module({
  imports: [
    // TypeORM for outbox table
    TypeOrmModule.forFeature([OutboxEvent]),

    // Bull queues for async processing
    BullModule.registerQueue(
      { name: 'order-processing' },
      { name: 'inventory-processing' },
      { name: 'payment-processing' },
    ),

    // Schedule module for cron jobs
    ScheduleModule.forRoot(),
  ],
  providers: [
    // Publishers
    EventPublisher,

    // Processors
    OutboxProcessor,

    // Event Handlers
    OrderCreatedHandler,
    OrderConfirmedHandler,
    PaymentProcessedHandler,
    InventoryReservedHandler,
  ],
  exports: [
    EventPublisher,
    OutboxProcessor,
    OrderCreatedHandler,
    OrderConfirmedHandler,
    PaymentProcessedHandler,
    InventoryReservedHandler,
  ],
})
export class EventsModule {}
