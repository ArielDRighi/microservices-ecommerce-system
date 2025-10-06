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
import { OrderProcessingSagaService } from './services/order-processing-saga.service';

describe('OrdersService - Error Handling', () => {
  let service: OrdersService;
  let orderRepository: jest.Mocked<Repository<Order>>;
  let productRepository: jest.Mocked<Repository<Product>>;
  let dataSource: jest.Mocked<DataSource>;
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

    const mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-123' }),
    };

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
        {
          provide: OrderProcessingSagaService,
          useValue: {
            startOrderProcessing: jest.fn().mockResolvedValue({
              id: 'saga-123',
              aggregateId: mockOrderId,
            }),
          },
        },
        {
          provide: 'BullQueue_order-processing',
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepository = module.get(getRepositoryToken(Order));
    productRepository = module.get(getRepositoryToken(Product));
  });

  describe('createOrder - Error Cases', () => {
    const createOrderDto = {
      items: [{ productId: mockProductId, quantity: 2 }],
    };

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
      const mockProduct = {
        id: mockProductId,
        name: 'Test Product',
        price: 99.99,
        isActive: true,
      } as Product;

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockProduct]),
      };
      productRepository.createQueryBuilder.mockReturnValue(queryBuilder as never);

      orderRepository.findOne.mockResolvedValue(null);

      const error = new Error('Database error');
      (queryRunner.manager.save as jest.Mock).mockRejectedValue(error);

      await expect(service.createOrder(mockUserId, createOrderDto)).rejects.toThrow(error);

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  describe('findOrderById - Error Cases', () => {
    const mockOrderId = 'test-order-id';

    it('should throw NotFoundException if order not found', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(service.findOrderById('non-existent-id', mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if order belongs to different user', async () => {
      const mockOrder = {
        id: mockOrderId,
        userId: 'different-user-id',
        status: OrderStatus.PENDING,
        totalAmount: 199.98,
        currency: 'USD',
        idempotencyKey: 'key-1',
        items: Promise.resolve([]),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Order;

      orderRepository.findOne.mockResolvedValue(mockOrder);

      await expect(service.findOrderById(mockOrderId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getOrderStatus - Error Cases', () => {
    it('should throw NotFoundException if order not found', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(service.getOrderStatus('non-existent-id', mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
