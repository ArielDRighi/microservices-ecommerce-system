import { CreateOrderDto, OrderResponseDto, OrderStatusResponseDto } from '../dto';
import { OrderStatus } from '../enums/order-status.enum';

/**
 * Factory: Mock User for orders testing
 */
export const createMockUser = (id = 'user-123') => ({
  id,
});

/**
 * Factory: Mock Order Response
 */
export const createMockOrderResponse = (
  overrides: Partial<OrderResponseDto> = {},
): OrderResponseDto => ({
  id: 'order-123',
  userId: 'user-123',
  status: OrderStatus.PENDING,
  totalAmount: 2649.97,
  currency: 'USD',
  items: [
    {
      id: 'item-1',
      productId: 'product-1',
      productName: 'Laptop Gaming',
      quantity: 2,
      unitPrice: 1299.99,
      totalPrice: 2599.98,
    },
    {
      id: 'item-2',
      productId: 'product-2',
      productName: 'Mouse',
      quantity: 1,
      unitPrice: 49.99,
      totalPrice: 49.99,
    },
  ],
  idempotencyKey: 'order-2025-10-01-user-123-abc',
  createdAt: new Date('2025-10-01T10:30:00.000Z'),
  updatedAt: new Date('2025-10-01T10:30:00.000Z'),
  ...overrides,
});

/**
 * Factory: Mock Order Status Response
 */
export const createMockOrderStatusResponse = (
  status: OrderStatus = OrderStatus.PROCESSING,
): OrderStatusResponseDto => ({
  orderId: 'order-123',
  status,
});

/**
 * Factory: Create Order DTO
 */
export const createMockCreateOrderDto = (
  overrides: Partial<CreateOrderDto> = {},
): CreateOrderDto => ({
  items: [
    { productId: 'product-1', quantity: 2 },
    { productId: 'product-2', quantity: 1 },
  ],
  idempotencyKey: 'order-2025-10-01-user-123-abc',
  ...overrides,
});

/**
 * Factory: Single Item Order DTO
 */
export const createMockSingleItemOrderDto = (): CreateOrderDto => ({
  items: [{ productId: 'product-1', quantity: 1 }],
  idempotencyKey: 'order-single-item',
});

/**
 * Factory: Multi Item Order DTO
 */
export const createMockMultiItemOrderDto = (): CreateOrderDto => ({
  items: [
    { productId: 'product-1', quantity: 2 },
    { productId: 'product-2', quantity: 1 },
    { productId: 'product-3', quantity: 5 },
  ],
  idempotencyKey: 'order-multi-item',
});

/**
 * Factory: Single Item Order Response
 */
export const createMockSingleItemOrderResponse = (): OrderResponseDto => ({
  id: 'order-123',
  userId: 'user-123',
  status: OrderStatus.PENDING,
  totalAmount: 1299.99,
  currency: 'USD',
  items: [
    {
      id: 'item-1',
      productId: 'product-1',
      productName: 'Laptop Gaming',
      quantity: 1,
      unitPrice: 1299.99,
      totalPrice: 1299.99,
    },
  ],
  idempotencyKey: 'order-single-item',
  createdAt: new Date('2025-10-01T10:30:00.000Z'),
  updatedAt: new Date('2025-10-01T10:30:00.000Z'),
});

/**
 * Factory: Multiple Orders Response
 */
export const createMockMultipleOrdersResponse = (): OrderResponseDto[] => [
  createMockOrderResponse(),
  createMockOrderResponse({
    id: 'order-456',
    status: OrderStatus.CONFIRMED,
  }),
];

/**
 * Assertion Helper: Verify Order Response Structure
 */
export const expectValidOrderResponse = (response: OrderResponseDto) => {
  expect(response).toHaveProperty('id');
  expect(response).toHaveProperty('userId');
  expect(response).toHaveProperty('status');
  expect(response).toHaveProperty('totalAmount');
  expect(response).toHaveProperty('currency');
  expect(response).toHaveProperty('items');
  expect(response).toHaveProperty('idempotencyKey');
  expect(response).toHaveProperty('createdAt');
  expect(response).toHaveProperty('updatedAt');
};

/**
 * Assertion Helper: Verify Order Status Response Structure
 */
export const expectValidOrderStatusResponse = (response: OrderStatusResponseDto) => {
  expect(response).toHaveProperty('orderId');
  expect(response).toHaveProperty('status');
};
