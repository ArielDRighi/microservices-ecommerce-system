import { Repository } from 'typeorm';
import { Order } from '../../../src/modules/orders/entities/order.entity';
import { OrderItem } from '../../../src/modules/orders/entities/order-item.entity';
import { OrderStatus } from '../../../src/modules/orders/enums/order-status.enum';

/**
 * Factory para crear órdenes de test
 */
export class OrderFactory {
  /**
   * Crea una orden básica
   * @param repository - Repositorio de Order
   * @param userId - ID del usuario
   * @param overrides - Propiedades personalizadas
   */
  static async create(
    repository: Repository<Order>,
    userId: string,
    overrides: Partial<Order> = {},
  ): Promise<Order> {
    const timestamp = Date.now();

    const defaultOrder: Partial<Order> = {
      userId,
      status: OrderStatus.PENDING,
      totalAmount: 100.0,
      currency: 'USD',
      idempotencyKey: `test-order-${timestamp}-${Math.random().toString(36).substring(2, 11)}`,
      subtotalAmount: 90.0,
      taxAmount: 10.0,
      shippingAmount: 0.0,
      discountAmount: 0.0,
      shippingAddress: {
        street: '123 Test Street',
        city: 'Test City',
        state: 'TS',
        postalCode: '12345',
        country: 'US',
        name: 'Test User',
        phone: '+1234567890',
      },
      billingAddress: {
        street: '123 Test Street',
        city: 'Test City',
        state: 'TS',
        postalCode: '12345',
        country: 'US',
        name: 'Test User',
        phone: '+1234567890',
      },
      ...overrides,
    };

    const order = repository.create(defaultOrder);
    return await repository.save(order);
  }

  /**
   * Crea una orden con items
   * @param orderRepository - Repositorio de Order
   * @param itemRepository - Repositorio de OrderItem
   * @param userId - ID del usuario
   * @param items - Array de items con productId, quantity, unitPrice
   */
  static async createWithItems(
    orderRepository: Repository<Order>,
    itemRepository: Repository<OrderItem>,
    userId: string,
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      sku?: string;
      productName?: string;
    }>,
  ): Promise<Order> {
    // Calcular totales
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxAmount = subtotal * 0.1; // 10% de impuestos
    const totalAmount = subtotal + taxAmount;

    // Crear la orden
    const order = await this.create(orderRepository, userId, {
      subtotalAmount: subtotal,
      taxAmount,
      totalAmount,
    });

    // Crear los items
    for (const itemData of items) {
      const orderItem: Partial<OrderItem> = {
        orderId: order.id,
        productId: itemData.productId,
        quantity: itemData.quantity,
        unitPrice: itemData.unitPrice,
        totalPrice: itemData.quantity * itemData.unitPrice,
        sku: itemData.sku || `TEST-SKU-${Date.now()}`,
        productName: itemData.productName || 'Test Product',
        currency: 'USD',
      };

      const item = itemRepository.create(orderItem);
      await itemRepository.save(item);
    }

    return order;
  }

  /**
   * Crea una orden con un estado específico
   * @param repository - Repositorio de Order
   * @param userId - ID del usuario
   * @param status - Estado de la orden
   */
  static async createWithStatus(
    repository: Repository<Order>,
    userId: string,
    status: OrderStatus,
  ): Promise<Order> {
    const overrides: Partial<Order> = { status };

    // Agregar timestamps según el estado
    switch (status) {
      case OrderStatus.PROCESSING:
        overrides.processingStartedAt = new Date();
        break;
      case OrderStatus.CONFIRMED:
        overrides.processingStartedAt = new Date(Date.now() - 60000);
        overrides.completedAt = new Date();
        break;
      case OrderStatus.SHIPPED:
        overrides.processingStartedAt = new Date(Date.now() - 120000);
        overrides.shippedAt = new Date();
        overrides.trackingNumber = `TRACK-${Date.now()}`;
        overrides.shippingCarrier = 'Test Carrier';
        break;
      case OrderStatus.DELIVERED:
        overrides.processingStartedAt = new Date(Date.now() - 180000);
        overrides.shippedAt = new Date(Date.now() - 60000);
        overrides.deliveredAt = new Date();
        overrides.completedAt = new Date();
        break;
      case OrderStatus.CANCELLED:
        overrides.failedAt = new Date();
        overrides.failureReason = 'Test cancellation';
        break;
      case OrderStatus.PAYMENT_FAILED:
        overrides.failedAt = new Date();
        overrides.failureReason = 'Test payment failure';
        break;
    }

    return await this.create(repository, userId, overrides);
  }

  /**
   * Crea múltiples órdenes
   * @param repository - Repositorio de Order
   * @param userId - ID del usuario
   * @param count - Cantidad de órdenes a crear
   */
  static async createMany(
    repository: Repository<Order>,
    userId: string,
    count: number,
  ): Promise<Order[]> {
    const orders: Order[] = [];

    for (let i = 0; i < count; i++) {
      const order = await this.create(repository, userId, {
        totalAmount: 100 + i * 10,
      });
      orders.push(order);
    }

    return orders;
  }

  /**
   * Crea una orden con descuento
   * @param repository - Repositorio de Order
   * @param userId - ID del usuario
   * @param discountAmount - Monto del descuento
   * @param discountCode - Código del descuento
   */
  static async createWithDiscount(
    repository: Repository<Order>,
    userId: string,
    discountAmount: number,
    discountCode?: string,
  ): Promise<Order> {
    return await this.create(repository, userId, {
      discountAmount,
      discountCode: discountCode || 'TEST-DISCOUNT',
      totalAmount: 100 - discountAmount,
    });
  }

  /**
   * Crea una orden con información de pago
   * @param repository - Repositorio de Order
   * @param userId - ID del usuario
   * @param paymentId - ID del pago
   */
  static async createWithPayment(
    repository: Repository<Order>,
    userId: string,
    paymentId: string,
  ): Promise<Order> {
    return await this.create(repository, userId, {
      paymentId,
      status: OrderStatus.PROCESSING,
    });
  }
}
