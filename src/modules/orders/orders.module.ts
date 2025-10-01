import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { EventsModule } from '../events/events.module';

/**
 * Orders Module
 * Handles order creation, retrieval and management
 */
@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, Product]), EventsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
