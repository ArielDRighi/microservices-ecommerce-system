import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderStatus } from './enums/order-status.enum';
import {
  createMockUser,
  createMockOrderResponse,
  createMockSingleItemOrderDto,
  createMockMultiItemOrderDto,
  createMockSingleItemOrderResponse,
  createMockOrderStatusResponse,
} from './helpers/orders.test-helpers';

describe('OrdersController - Validations & Different Scenarios', () => {
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

  describe('createOrder - Item Variations', () => {
    it('should handle orders with single item', async () => {
      const singleItemDto = createMockSingleItemOrderDto();
      const singleItemResponse = createMockSingleItemOrderResponse();
      ordersService.createOrder.mockResolvedValue(singleItemResponse);

      const result = await controller.createOrder(mockUser, singleItemDto);

      expect(result.items).toHaveLength(1);
      expect(ordersService.createOrder).toHaveBeenCalledWith(mockUser.id, singleItemDto);
    });

    it('should handle orders with multiple items', async () => {
      const multiItemDto = createMockMultiItemOrderDto();
      const mockOrderResponse = createMockOrderResponse();
      ordersService.createOrder.mockResolvedValue(mockOrderResponse);

      await controller.createOrder(mockUser, multiItemDto);

      expect(ordersService.createOrder).toHaveBeenCalledWith(mockUser.id, multiItemDto);
    });
  });

  describe('getUserOrders - User Variations', () => {
    it('should pass correct user ID from JWT token', async () => {
      const differentUser = createMockUser('user-999');
      ordersService.findUserOrders.mockResolvedValue([]);

      await controller.getUserOrders(differentUser);

      expect(ordersService.findUserOrders).toHaveBeenCalledWith('user-999');
    });
  });

  describe('getOrderById - Status Variations', () => {
    it('should handle different order statuses', async () => {
      const confirmedOrder = createMockOrderResponse({
        status: OrderStatus.CONFIRMED,
      });
      ordersService.findOrderById.mockResolvedValue(confirmedOrder);

      const result = await controller.getOrderById('order-123', mockUser);

      expect(result.status).toBe(OrderStatus.CONFIRMED);
    });
  });

  describe('getOrderStatus - Status Variations', () => {
    const orderId = 'order-123';

    const statusScenarios: Array<[string, OrderStatus]> = [
      ['PENDING', OrderStatus.PENDING],
      ['PROCESSING', OrderStatus.PROCESSING],
      ['CONFIRMED', OrderStatus.CONFIRMED],
      ['CANCELLED', OrderStatus.CANCELLED],
    ];

    test.each(statusScenarios)('should return status for %s order', async (_, status) => {
      const statusResponse = createMockOrderStatusResponse(status);
      ordersService.getOrderStatus.mockResolvedValue(statusResponse);

      const result = await controller.getOrderStatus(orderId, mockUser);

      expect(result.status).toBe(status);
      expect(result.orderId).toBe('order-123');
    });
  });
});
