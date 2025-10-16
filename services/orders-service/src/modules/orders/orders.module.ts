import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { EventsModule } from '../events/events.module';
import { SagaStateEntity } from '../../database/entities/saga-state.entity';
import { OrderProcessingSagaService } from './services/order-processing-saga.service';
import { InventoryModule } from '../inventory/inventory.module';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * Orders Module
 * Handles order creation, retrieval and management with Saga Pattern
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Product, SagaStateEntity]),
    BullModule.registerQueue({
      name: 'order-processing',
    }),
    EventsModule,
    InventoryModule,
    PaymentsModule,
    NotificationsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrderProcessingSagaService],
  exports: [OrdersService, OrderProcessingSagaService],
})
export class OrdersModule {}
