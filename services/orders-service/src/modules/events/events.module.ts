import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { OutboxEvent } from './entities/outbox-event.entity';
import { EventPublisher } from './publishers/event.publisher';
import { OutboxProcessor } from './processors/outbox.processor';
import { RabbitMQConsumerService } from './consumers/rabbitmq-consumer.service';
import { RabbitMQMetricsService } from './metrics/rabbitmq-metrics.service';
import {
  OrderCreatedHandler,
  OrderConfirmedHandler,
  PaymentProcessedHandler,
  InventoryReservedHandler,
  InventoryConfirmedHandler,
  InventoryReleasedHandler,
  InventoryFailedHandler,
} from './handlers';

/**
 * Events Module
 * Provides event-driven architecture with Outbox Pattern + RabbitMQ Consumer
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

    // RabbitMQ Consumer
    RabbitMQConsumerService,

    // Metrics
    RabbitMQMetricsService,

    // Event Handlers
    OrderCreatedHandler,
    OrderConfirmedHandler,
    PaymentProcessedHandler,
    InventoryReservedHandler,
    InventoryConfirmedHandler,
    InventoryReleasedHandler,
    InventoryFailedHandler,

    // Provider for INVENTORY_HANDLERS injection token
    {
      provide: 'INVENTORY_HANDLERS',
      useFactory: (
        reserved: InventoryReservedHandler,
        confirmed: InventoryConfirmedHandler,
        released: InventoryReleasedHandler,
        failed: InventoryFailedHandler,
      ) => [reserved, confirmed, released, failed],
      inject: [
        InventoryReservedHandler,
        InventoryConfirmedHandler,
        InventoryReleasedHandler,
        InventoryFailedHandler,
      ],
    },
  ],
  exports: [
    EventPublisher,
    OutboxProcessor,
    RabbitMQConsumerService,
    OrderCreatedHandler,
    OrderConfirmedHandler,
    PaymentProcessedHandler,
    InventoryReservedHandler,
    InventoryConfirmedHandler,
    InventoryReleasedHandler,
    InventoryFailedHandler,
  ],
})
export class EventsModule {}
