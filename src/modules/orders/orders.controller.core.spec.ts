import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderStatus } from './enums/order-status.enum';
import {
  createMockUser,
  createMockOrderResponse,
  createMockCreateOrderDto,
  createMockOrderStatusResponse,
  expectValidOrderResponse,
  expectValidOrderStatusResponse,
} from './helpers/orders.test-helpers';

describe('OrdersController - Core Functionality', () => {
  let controller: OrdersController;
  let ordersService: jest.Mocked<OrdersService>;

  const mockUser = createMockUser();
  const mockOrderResponse = createMockOrderResponse();
  const mockOrderStatusResponse = createMockOrderStatusResponse();

  beforeEach(async () => {
    const mockOrdersService = {
      createOrder: jest.fn(),
      findUserOrders: jest.fn(),
      findOrderById: jest.fn(),
      getOrderStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    ordersService = module.get(OrdersService) as jest.Mocked<OrdersService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Definition', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('createOrder', () => {
    it('should create an order and return order response', async () => {
      const createOrderDto = createMockCreateOrderDto();
      ordersService.createOrder.mockResolvedValue(mockOrderResponse);

      const result = await controller.createOrder(mockUser, createOrderDto);

      expect(result).toEqual(mockOrderResponse);
      expectValidOrderResponse(result);
      expect(ordersService.createOrder).toHaveBeenCalledWith(mockUser.id, createOrderDto);
      expect(ordersService.createOrder).toHaveBeenCalledTimes(1);
    });

    it('should pass user ID from JWT token to service', async () => {
      const createOrderDto = createMockCreateOrderDto();
      ordersService.createOrder.mockResolvedValue(mockOrderResponse);

      await controller.createOrder(mockUser, createOrderDto);

      expect(ordersService.createOrder).toHaveBeenCalledWith('user-123', createOrderDto);
    });
  });

  describe('getUserOrders', () => {
    it('should return all orders for authenticated user', async () => {
      const mockOrders = [
        mockOrderResponse,
        createMockOrderResponse({
          id: 'order-456',
          status: OrderStatus.CONFIRMED,
        }),
      ];
      ordersService.findUserOrders.mockResolvedValue(mockOrders);

      const result = await controller.getUserOrders(mockUser);

      expect(result).toEqual(mockOrders);
      expect(result).toHaveLength(2);
      expect(ordersService.findUserOrders).toHaveBeenCalledWith(mockUser.id);
      expect(ordersService.findUserOrders).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when user has no orders', async () => {
      ordersService.findUserOrders.mockResolvedValue([]);

      const result = await controller.getUserOrders(mockUser);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
      expect(ordersService.findUserOrders).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('getOrderById', () => {
    const orderId = 'order-123';

    it('should return order details by ID', async () => {
      ordersService.findOrderById.mockResolvedValue(mockOrderResponse);

      const result = await controller.getOrderById(orderId, mockUser);

      expect(result).toEqual(mockOrderResponse);
      expectValidOrderResponse(result);
      expect(ordersService.findOrderById).toHaveBeenCalledWith(orderId, mockUser.id);
      expect(ordersService.findOrderById).toHaveBeenCalledTimes(1);
    });

    it('should pass both order ID and user ID to service', async () => {
      ordersService.findOrderById.mockResolvedValue(mockOrderResponse);

      await controller.getOrderById('order-999', mockUser);

      expect(ordersService.findOrderById).toHaveBeenCalledWith('order-999', 'user-123');
    });
  });

  describe('getOrderStatus', () => {
    const orderId = 'order-123';

    it('should return order status by ID', async () => {
      ordersService.getOrderStatus.mockResolvedValue(mockOrderStatusResponse);

      const result = await controller.getOrderStatus(orderId, mockUser);

      expect(result).toEqual(mockOrderStatusResponse);
      expectValidOrderStatusResponse(result);
      expect(ordersService.getOrderStatus).toHaveBeenCalledWith(orderId, mockUser.id);
      expect(ordersService.getOrderStatus).toHaveBeenCalledTimes(1);
    });

    it('should pass both order ID and user ID to service', async () => {
      ordersService.getOrderStatus.mockResolvedValue(mockOrderStatusResponse);

      await controller.getOrderStatus('order-999', mockUser);

      expect(ordersService.getOrderStatus).toHaveBeenCalledWith('order-999', 'user-123');
    });
  });
});
