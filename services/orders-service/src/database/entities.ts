// Central entity exports for TypeORM configuration
export * from '../modules/users/entities';
export * from '../modules/products/entities';
export * from '../modules/orders/entities';
// ✅ Epic 1.6 - T1.6.1: Removed Inventory module (now external service)
// export * from '../modules/inventory/entities';
export * from '../modules/events/entities';

// Re-export entities for easy importing
export { User } from '../modules/users/entities/user.entity';
export { Product } from '../modules/products/entities/product.entity';
export { Order } from '../modules/orders/entities/order.entity';
export { OrderItem } from '../modules/orders/entities/order-item.entity';
// ✅ Epic 1.6 - T1.6.1: Removed Inventory entity (now external service)
// export { Inventory } from '../modules/inventory/entities/inventory.entity';
export { OutboxEvent } from '../modules/events/entities/outbox-event.entity';
export { SagaState } from '../modules/events/entities/saga-state.entity';
export { SagaStateEntity } from './entities/saga-state.entity';
