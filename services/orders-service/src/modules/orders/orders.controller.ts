import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto, OrderResponseDto, OrderStatusResponseDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/**
 * Orders Controller
 * Handles order creation and retrieval
 */
@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Create a new order
   * POST /orders
   * Returns 202 Accepted immediately
   */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Create a new order',
    description:
      'Creates a new order with PENDING status and publishes OrderCreatedEvent. ' +
      'Returns 202 Accepted immediately - order will be processed asynchronously. ' +
      'Supports idempotency - sending the same request twice will return the existing order.',
  })
  @ApiBody({
    type: CreateOrderDto,
    description:
      'Order data with items and optional idempotency key. Prices are calculated automatically from product database - do not include price field.',
    examples: {
      singleItem: {
        summary: 'Single item order',
        value: {
          items: [
            {
              productId: '550e8400-e29b-41d4-a716-446655440000',
              quantity: 2,
            },
          ],
          idempotencyKey: 'order-2025-10-11-unique-12345',
        },
      },
      multipleItems: {
        summary: 'Multiple items order',
        value: {
          items: [
            {
              productId: '550e8400-e29b-41d4-a716-446655440000',
              quantity: 2,
            },
            {
              productId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
              quantity: 1,
            },
            {
              productId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
              quantity: 5,
            },
          ],
          idempotencyKey: 'order-2025-10-11-user-john-doe-9876543',
        },
      },
      withoutIdempotencyKey: {
        summary: 'Order without idempotency key (auto-generated)',
        value: {
          items: [
            {
              productId: '550e8400-e29b-41d4-a716-446655440000',
              quantity: 1,
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Order created successfully and is being processed asynchronously',
    type: OrderResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid order data or products not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  async createOrder(
    @CurrentUser() user: { id: string },
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    const userId = user.id;
    this.logger.log(`Creating order for user ${userId} with ${createOrderDto.items.length} items`);
    return this.ordersService.createOrder(userId, createOrderDto);
  }

  /**
   * Get all orders for the authenticated user
   * GET /orders
   */
  @Get()
  @ApiOperation({
    summary: 'Get all orders for authenticated user',
    description:
      'Returns all orders for the currently authenticated user, ordered by creation date (newest first)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of orders',
    type: [OrderResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  async getUserOrders(@CurrentUser() user: { id: string }): Promise<OrderResponseDto[]> {
    const userId = user.id;
    this.logger.log(`Fetching orders for user ${userId}`);
    return this.ordersService.findUserOrders(userId);
  }

  /**
   * Get specific order by ID
   * GET /orders/:id
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get order by ID',
    description:
      'Returns detailed information about a specific order. Only the owner can access their order.',
  })
  @ApiParam({
    name: 'id',
    description: 'Order ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Order details',
    type: OrderResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order not found or does not belong to user',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  async getOrderById(
    @Param('id', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: { id: string },
  ): Promise<OrderResponseDto> {
    const userId = user.id;
    this.logger.log(`Fetching order ${orderId} for user ${userId}`);
    return this.ordersService.findOrderById(orderId, userId);
  }

  /**
   * Get order status only
   * GET /orders/:id/status
   */
  @Get(':id/status')
  @ApiOperation({
    summary: 'Get order status',
    description: 'Returns only the status of an order. Lightweight endpoint for status polling.',
  })
  @ApiParam({
    name: 'id',
    description: 'Order ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Order status',
    type: OrderStatusResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Order not found or does not belong to user',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  async getOrderStatus(
    @Param('id', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: { id: string },
  ): Promise<OrderStatusResponseDto> {
    const userId = user.id;
    this.logger.log(`Fetching status for order ${orderId}`);
    return this.ordersService.getOrderStatus(orderId, userId);
  }
}
