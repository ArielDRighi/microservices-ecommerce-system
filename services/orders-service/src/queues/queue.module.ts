import { Module, Global, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { queueConfigs } from '../config/redis.config';
import {
  OrderProcessingProcessor,
  PaymentProcessingProcessor,
  InventoryProcessor,
  NotificationProcessor,
} from './processors';
import { QueueService } from './queue.service';
import { BullBoardController } from './bull-board.controller';
import { OrdersModule } from '../modules/orders/orders.module';

/**
 * Queue Module
 * Centralized module for managing all Bull queues in the application
 * Provides queue instances and processors for different job types
 */
@Global()
@Module({
  imports: [
    // Import OrdersModule to access OrderProcessingSagaService
    forwardRef(() => OrdersModule),
    // Register all queues with their specific configurations
    BullModule.registerQueueAsync(
      {
        name: 'order-processing',
        useFactory: (configService: ConfigService) => ({
          redis: configService.get('bull.redis'),
          prefix: configService.get('bull.prefix'),
          defaultJobOptions: {
            ...configService.get('bull.defaultJobOptions'),
            ...(queueConfigs['order-processing']?.defaultJobOptions || {}),
          },
          limiter: queueConfigs['order-processing']?.limiter,
          settings: configService.get('bull.settings'),
        }),
        inject: [ConfigService],
      },
      {
        name: 'payment-processing',
        useFactory: (configService: ConfigService) => ({
          redis: configService.get('bull.redis'),
          prefix: configService.get('bull.prefix'),
          defaultJobOptions: {
            ...configService.get('bull.defaultJobOptions'),
            ...(queueConfigs['payment-processing']?.defaultJobOptions || {}),
          },
          limiter: queueConfigs['payment-processing']?.limiter,
          settings: configService.get('bull.settings'),
        }),
        inject: [ConfigService],
      },
      {
        name: 'inventory-management',
        useFactory: (configService: ConfigService) => ({
          redis: configService.get('bull.redis'),
          prefix: configService.get('bull.prefix'),
          defaultJobOptions: {
            ...configService.get('bull.defaultJobOptions'),
            ...(queueConfigs['inventory-management']?.defaultJobOptions || {}),
          },
          limiter: queueConfigs['inventory-management']?.limiter,
          settings: configService.get('bull.settings'),
        }),
        inject: [ConfigService],
      },
      {
        name: 'notification-sending',
        useFactory: (configService: ConfigService) => ({
          redis: configService.get('bull.redis'),
          prefix: configService.get('bull.prefix'),
          defaultJobOptions: {
            ...configService.get('bull.defaultJobOptions'),
            ...(queueConfigs['notification-sending']?.defaultJobOptions || {}),
          },
          limiter: queueConfigs['notification-sending']?.limiter,
          settings: configService.get('bull.settings'),
        }),
        inject: [ConfigService],
      },
    ),
    ConfigModule,
  ],
  controllers: [BullBoardController],
  providers: [
    // Register all processors
    OrderProcessingProcessor,
    PaymentProcessingProcessor,
    InventoryProcessor,
    NotificationProcessor,
    // Queue service for managing queues
    QueueService,
  ],
  exports: [BullModule, QueueService],
})
export class QueueModule {}
