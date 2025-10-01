import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner, EntityManager } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { EventPublisher } from '../events/publishers/event.publisher';
import { OrderStatus } from './enums/order-status.enum';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepository: jest.Mocked<Repository<Order>>;
  let orderItemRepository: jest.Mocked<Repository<OrderItem>>;
  let productRepository: jest.Mocked<Repository<Product>>;
  let dataSource: jest.Mocked<DataSource>;
  let eventPublisher: jest.Mocked<EventPublisher>;
  let queryRunner: jest.Mocked<QueryRunner>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockProductId = '987e6543-e89b-12d3-a456-426614174999';
  const mockOrderId = 'abc12345-e89b-12d3-a456-426614174888';

  beforeEach(async () => {
    // Mock QueryRunner
    queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        save: jest.fn(),
        getRepository: jest.fn(),
      } as unknown as EntityManager,
    } as unknown as jest.Mocked<QueryRunner>;

    // Mock DataSource
    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    } as unknown as jest.Mocked<DataSource>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Product),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: EventPublisher,
          useValue: {
            publish: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepository = module.get(getRepositoryToken(Order));
    orderItemRepository = module.get(getRepositoryToken(OrderItem));
    productRepository = module.get(getRepositoryToken(Product));
    eventPublisher = module.get(EventPublisher);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    const createOrderDto = {
      items: [{ productId: mockProductId, quantity: 2 }],
    };

    const mockProduct = {
      id: mockProductId,
      name: 'Test Product',
      price: 99.99,
      isActive: true,
    } as Product;

    const mockOrder = {
      id: mockOrderId,
      userId: mockUserId,
      status: OrderStatus.PENDING,
      totalAmount: 199.98,
      currency: 'USD',
      idempotencyKey: 'test-key',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Order;

    const mockOrderItem = {
      id: 'item-123',
      orderId: mockOrderId,
      productId: mockProductId,
      quantity: 2,
      unitPrice: 99.99,
      totalPrice: 199.98,
    } as OrderItem;

    beforeEach(() => {
      // Mock product query builder
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockProduct]),
      };
      productRepository.createQueryBuilder.mockReturnValue(queryBuilder as never);

      // Mock repository operations
      orderRepository.findOne.mockResolvedValue(null);
      orderRepository.create.mockReturnValue(mockOrder);
      orderItemRepository.create.mockReturnValue(mockOrderItem);

      // Mock transaction manager
      (queryRunner.manager.save as jest.Mock).mockImplementation((entity, _data) => {
        if (entity === Order) {
          return Promise.resolve(mockOrder);
        }
        return Promise.resolve([mockOrderItem]);
      });

      // Mock event publisher
      eventPublisher.publish.mockResolvedValue();
    });

    it('should create order successfully', async () => {
      const result = await service.createOrder(mockUserId, createOrderDto);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockOrderId);
      expect(result.userId).toBe(mockUserId);
      expect(result.status).toBe(OrderStatus.PENDING);
      expect(result.totalAmount).toBe(199.98);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.quantity).toBe(2);

      // Verify transaction was used
      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();

      // Verify event was published
      expect(eventPublisher.publish).toHaveBeenCalled();
    });

    it('should return existing order if idempotency key exists', async () => {
      const existingOrder = {
        ...mockOrder,
        items: Promise.resolve([mockOrderItem]),
      } as Order;

      orderRepository.findOne.mockResolvedValue(existingOrder);

      const result = await service.createOrder(mockUserId, {
        ...createOrderDto,
        idempotencyKey: 'existing-key',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(mockOrderId);

      // Should not start transaction
      expect(queryRunner.connect).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if product not found', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]), // No products found
      };
      productRepository.createQueryBuilder.mockReturnValue(queryBuilder as never);

      await expect(service.createOrder(mockUserId, createOrderDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should rollback transaction on error', async () => {
      const error = new Error('Database error');
      (queryRunner.manager.save as jest.Mock).mockRejectedValue(error);

      await expect(service.createOrder(mockUserId, createOrderDto)).rejects.toThrow(error);

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  describe('findUserOrders', () => {
    it('should return list of orders for user', async () => {
      const mockOrders = [
        {
          id: mockOrderId,
          userId: mockUserId,
          status: OrderStatus.PENDING,
          totalAmount: 199.98,
          currency: 'USD',
          idempotencyKey: 'key-1',
          items: Promise.resolve([]),
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown,
      ] as Order[];

      orderRepository.find.mockResolvedValue(mockOrders);

      const result = await service.findUserOrders(mockUserId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(orderRepository.find).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        relations: ['items', 'items.product'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findOrderById', () => {
    const mockOrder = {
      id: mockOrderId,
      userId: mockUserId,
      status: OrderStatus.PENDING,
      totalAmount: 199.98,
      currency: 'USD',
      idempotencyKey: 'key-1',
      items: Promise.resolve([]),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Order;

    it('should return order by id', async () => {
      orderRepository.findOne.mockResolvedValue(mockOrder);

      const result = await service.findOrderById(mockOrderId, mockUserId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockOrderId);
    });

    it('should throw NotFoundException if order not found', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(service.findOrderById('non-existent-id', mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if order belongs to different user', async () => {
      const differentUserOrder = { ...mockOrder, userId: 'different-user-id' };
      orderRepository.findOne.mockResolvedValue(differentUserOrder as Order);

      await expect(service.findOrderById(mockOrderId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getOrderStatus', () => {
    const mockOrder = {
      id: mockOrderId,
      userId: mockUserId,
      status: OrderStatus.PROCESSING,
    } as unknown as Order;

    it('should return order status', async () => {
      orderRepository.findOne.mockResolvedValue(mockOrder);

      const result = await service.getOrderStatus(mockOrderId, mockUserId);

      expect(result).toBeDefined();
      expect(result.orderId).toBe(mockOrderId);
      expect(result.status).toBe(OrderStatus.PROCESSING);
    });

    it('should throw NotFoundException if order not found', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(service.getOrderStatus('non-existent-id', mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
