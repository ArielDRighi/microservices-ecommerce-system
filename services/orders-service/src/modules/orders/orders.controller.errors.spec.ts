import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { createMockUser, createMockCreateOrderDto } from './helpers/orders.test-helpers';

describe('OrdersController - Error Handling', () => {
  let controller: OrdersController;
  let ordersService: jest.Mocked<OrdersService>;

  const mockUser = createMockUser();

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

  describe('createOrder - Error Propagation', () => {
    it('should propagate errors from service', async () => {
      const createOrderDto = createMockCreateOrderDto();
      const error = new Error('Product not found');
      ordersService.createOrder.mockRejectedValue(error);

      await expect(controller.createOrder(mockUser, createOrderDto)).rejects.toThrow(
        'Product not found',
      );
    });
  });

  describe('getUserOrders - Error Propagation', () => {
    it('should propagate errors from service', async () => {
      const error = new Error('Database connection failed');
      ordersService.findUserOrders.mockRejectedValue(error);

      await expect(controller.getUserOrders(mockUser)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('getOrderById - Error Propagation', () => {
    const orderId = 'order-123';

    it('should propagate not found errors from service', async () => {
      const error = new Error('Order not found');
      ordersService.findOrderById.mockRejectedValue(error);

      await expect(controller.getOrderById(orderId, mockUser)).rejects.toThrow('Order not found');
    });

    it('should propagate unauthorized access errors', async () => {
      const error = new Error('Order does not belong to user');
      ordersService.findOrderById.mockRejectedValue(error);

      await expect(controller.getOrderById(orderId, mockUser)).rejects.toThrow(
        'Order does not belong to user',
      );
    });
  });

  describe('getOrderStatus - Error Propagation', () => {
    const orderId = 'order-123';

    it('should propagate not found errors from service', async () => {
      const error = new Error('Order not found');
      ordersService.getOrderStatus.mockRejectedValue(error);

      await expect(controller.getOrderStatus(orderId, mockUser)).rejects.toThrow('Order not found');
    });

    it('should propagate unauthorized access errors', async () => {
      const error = new Error('Order does not belong to user');
      ordersService.getOrderStatus.mockRejectedValue(error);

      await expect(controller.getOrderStatus(orderId, mockUser)).rejects.toThrow(
        'Order does not belong to user',
      );
    });
  });
});
