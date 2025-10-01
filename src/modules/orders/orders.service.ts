import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Repository, DataSource } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { OrderStatus } from './enums/order-status.enum';
import { EventPublisher } from '../events/publishers/event.publisher';
import { OrderCreatedEvent } from '../events/types/order.events';
import { OrderProcessingSagaService } from './services/order-processing-saga.service';
import {
  CreateOrderDto,
  OrderResponseDto,
  OrderItemResponseDto,
  OrderStatusResponseDto,
} from './dto';
import { randomUUID, createHash } from 'crypto';

/**
 * Orders Service
 * Handles order creation, retrieval, and management with Saga Pattern
 */
@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly dataSource: DataSource,
    private readonly eventPublisher: EventPublisher,
    private readonly sagaService: OrderProcessingSagaService,
    @InjectQueue('order-processing')
    private readonly orderProcessingQueue: Queue,
  ) {}

  /**
   * Create a new order
   * - Validates products exist and are active
   * - Calculates totals automatically
   * - Creates order with PENDING status
   * - Publishes OrderCreatedEvent to Outbox
   * - Returns 202 Accepted immediately
   */
  async createOrder(userId: string, createOrderDto: CreateOrderDto): Promise<OrderResponseDto> {
    const startTime = Date.now();
    const idempotencyKey =
      createOrderDto.idempotencyKey || this.generateIdempotencyKey(userId, createOrderDto);

    this.logger.log(`Creating order for user ${userId} with idempotency key: ${idempotencyKey}`);

    // Check for existing order with same idempotency key
    const existingOrder = await this.orderRepository.findOne({
      where: { idempotencyKey },
      relations: ['items', 'items.product'],
    });

    if (existingOrder) {
      this.logger.warn(
        `Order with idempotency key ${idempotencyKey} already exists: ${existingOrder.id}`,
      );
      return this.mapToResponseDto(existingOrder);
    }

    // Validate all products exist and are active
    const productIds = createOrderDto.items.map((item) => item.productId);
    const products = await this.productRepository
      .createQueryBuilder('product')
      .where('product.id IN (:...productIds)', { productIds })
      .andWhere('product.isActive = :isActive', { isActive: true })
      .andWhere('product.deletedAt IS NULL')
      .getMany();

    if (products.length !== productIds.length) {
      const foundIds = products.map((p) => p.id);
      const missingIds = productIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(`Products not found or inactive: ${missingIds.join(', ')}`);
    }

    // Create product map for easy lookup
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Calculate totals
    let totalAmount = 0;
    const orderItemsData = createOrderDto.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new BadRequestException(`Product ${item.productId} not found or inactive`);
      }

      const unitPrice = product.price;
      const totalPrice = unitPrice * item.quantity;
      totalAmount += totalPrice;

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        sku: product.sku,
        productName: product.name,
        product,
      };
    });

    // Use transaction to ensure atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create order
      const order = this.orderRepository.create({
        userId,
        status: OrderStatus.PENDING,
        totalAmount,
        currency: 'USD',
        idempotencyKey,
      });

      const savedOrder = await queryRunner.manager.save(Order, order);
      this.logger.log(`Order created with ID: ${savedOrder.id}`);

      // Create order items
      const orderItems = orderItemsData.map((itemData) => {
        return this.orderItemRepository.create({
          orderId: savedOrder.id,
          productId: itemData.productId,
          sku: itemData.sku,
          productName: itemData.productName,
          quantity: itemData.quantity,
          unitPrice: itemData.unitPrice,
          totalPrice: itemData.totalPrice,
        });
      });

      const savedItems = await queryRunner.manager.save(OrderItem, orderItems);

      // Publish OrderCreatedEvent via Outbox Pattern
      const orderCreatedEvent: OrderCreatedEvent = {
        eventId: randomUUID(),
        eventType: 'OrderCreated',
        aggregateId: savedOrder.id,
        aggregateType: 'Order',
        version: 1,
        timestamp: new Date(),
        orderId: savedOrder.id,
        userId: savedOrder.userId,
        items: savedItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
        totalAmount: savedOrder.totalAmount,
        currency: savedOrder.currency,
      };

      await this.eventPublisher.publish(orderCreatedEvent, undefined, queryRunner.manager);
      this.logger.log(`OrderCreatedEvent published for order ${savedOrder.id}`);

      // Initialize saga for order processing
      savedOrder.items = Promise.resolve(savedItems);
      const sagaState = await this.sagaService.startOrderProcessing(savedOrder);
      this.logger.log(`Saga ${sagaState.id} initiated for order ${savedOrder.id}`);

      // Commit transaction
      await queryRunner.commitTransaction();

      // Enqueue saga processing job (non-blocking)
      await this.orderProcessingQueue.add(
        'create-order',
        {
          sagaId: sagaState.id,
          orderId: savedOrder.id,
          userId: savedOrder.userId,
          items: orderItemsData.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: false, // Keep failed jobs for analysis
        },
      );

      this.logger.log(`Order processing job queued for order ${savedOrder.id}`);

      const duration = Date.now() - startTime;
      this.logger.log(`Order ${savedOrder.id} created successfully in ${duration}ms`);

      // For new order, create a simple response without loading lazy relations
      return {
        id: savedOrder.id,
        userId: savedOrder.userId,
        status: savedOrder.status,
        totalAmount: savedOrder.totalAmount,
        currency: savedOrder.currency,
        idempotencyKey: savedOrder.idempotencyKey || '',
        items: savedItems.map((item) => {
          const productData = orderItemsData.find((data) => data.productId === item.productId);
          return {
            id: item.id,
            productId: item.productId,
            productName: productData?.product.name || 'Unknown Product',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          };
        }),
        createdAt: savedOrder.createdAt,
        updatedAt: savedOrder.updatedAt,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      const { message, stack } = this.extractErrorInfo(error);
      this.logger.error(`Failed to create order: ${message}`, stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get all orders for a specific user
   */
  async findUserOrders(userId: string): Promise<OrderResponseDto[]> {
    this.logger.log(`Fetching orders for user ${userId}`);

    const orders = await this.orderRepository.find({
      where: { userId },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
    });

    return Promise.all(orders.map((order) => this.mapToResponseDto(order)));
  }

  /**
   * Get a specific order by ID
   * Validates that the order belongs to the requesting user
   */
  async findOrderById(orderId: string, userId: string): Promise<OrderResponseDto> {
    this.logger.log(`Fetching order ${orderId} for user ${userId}`);

    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.userId !== userId) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    return this.mapToResponseDto(order);
  }

  /**
   * Get order status only
   */
  async getOrderStatus(orderId: string, userId: string): Promise<OrderStatusResponseDto> {
    this.logger.log(`Fetching status for order ${orderId}`);

    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      select: ['id', 'userId', 'status'],
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.userId !== userId) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    return {
      orderId: order.id,
      status: order.status,
    };
  }

  /**
   * Generate idempotency key from user and order data
   */
  private generateIdempotencyKey(userId: string, createOrderDto: CreateOrderDto): string {
    const timestamp = new Date().toISOString().substring(0, 10); // YYYY-MM-DD
    const itemsHash = createOrderDto.items
      .map((item) => `${item.productId}-${item.quantity}`)
      .sort()
      .join('|');

    // Use SHA-256 hash for idempotency key to prevent collisions
    const hash = createHash('sha256').update(itemsHash).digest('hex').substring(0, 8);

    return `order-${timestamp}-${userId.substring(0, 8)}-${hash}`;
  }

  /**
   * Map Order entity to OrderResponseDto
   */
  private async mapToResponseDto(order: Order): Promise<OrderResponseDto> {
    const items = await order.items;
    const mappedItems = await Promise.all(items.map((item) => this.mapItemToResponseDto(item)));

    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      totalAmount: order.totalAmount,
      currency: order.currency,
      idempotencyKey: order.idempotencyKey || '',
      items: mappedItems,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  /**
   * Map OrderItem entity to OrderItemResponseDto
   */
  private async mapItemToResponseDto(item: OrderItem): Promise<OrderItemResponseDto> {
    const product = await item.product;

    return {
      id: item.id,
      productId: item.productId,
      productName: product?.name || 'Unknown Product',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    };
  }

  /**
   * Extract error information consistently
   * Helper function to reduce error handling duplication
   */
  private extractErrorInfo(error: unknown): { message: string; stack?: string } {
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
      };
    }
    return {
      message: 'Unknown error',
      stack: undefined,
    };
  }
}
