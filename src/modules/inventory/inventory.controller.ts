import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
  Logger,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { Public } from '../../common/decorators/public.decorator';
import { InventoryService } from './inventory.service';
import {
  CheckStockDto,
  ReserveStockDto,
  ReleaseReservationDto,
  FulfillReservationDto,
  StockMovementDto,
  InventoryResponseDto,
  InventoryStockDto,
  ReservationResponseDto,
  InventoryQueryDto,
  PaginatedResponseDto,
  CreateInventoryDto,
  ReservationDetailsDto,
} from './dto';

// Shared ValidationPipe configuration for consistent parameter handling
const TRANSFORM_VALIDATION_PIPE = new ValidationPipe({ transform: true });

@ApiTags('Inventory')
@Controller('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class InventoryController {
  private readonly logger = new Logger(InventoryController.name);

  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create inventory record',
    description:
      'Create initial inventory record for a product. ' +
      'This endpoint allows creating inventory via API instead of seeds. ' +
      'Product must exist before creating inventory.',
  })
  @ApiResponse({
    status: 201,
    description: 'Inventory created successfully',
    type: InventoryResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Product with ID abc-123 not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Inventory already exists for this product and location',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: {
          type: 'string',
          example: 'Inventory already exists for product abc-123 at MAIN_WAREHOUSE',
        },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  @ApiBody({
    type: CreateInventoryDto,
    examples: {
      basicInventory: {
        summary: 'Basic inventory with minimal fields',
        description: 'Create inventory with only required fields',
        value: {
          productId: 'a21ba620-1020-4611-9b54-200811f2448f',
          sku: 'LAP-GAMING-001',
          initialStock: 100,
        },
      },
      completeInventory: {
        summary: 'Complete inventory with all optional fields',
        description: 'Create inventory with full configuration',
        value: {
          productId: 'a21ba620-1020-4611-9b54-200811f2448f',
          sku: 'LAP-GAMING-001',
          location: 'MAIN_WAREHOUSE',
          initialStock: 100,
          minimumStock: 10,
          maximumStock: 1000,
          reorderPoint: 20,
          reorderQuantity: 50,
          notes: 'Initial inventory for gaming laptop line',
        },
      },
      multiLocationInventory: {
        summary: 'Inventory for different location',
        description: 'Create inventory at a specific warehouse',
        value: {
          productId: 'b32ca730-f23c-5722-a765-557766551111',
          sku: 'MOUSE-WIRELESS-001',
          location: 'SECONDARY_WAREHOUSE',
          initialStock: 250,
          minimumStock: 25,
          reorderPoint: 50,
          notes: 'Peripheral inventory at secondary warehouse',
        },
      },
    },
  })
  async createInventory(
    @Body(ValidationPipe) createDto: CreateInventoryDto,
  ): Promise<InventoryResponseDto> {
    this.logger.log(`Creating inventory for product ${createDto.productId}`);
    return await this.inventoryService.createInventory(createDto);
  }

  @Public()
  @Post('check-availability')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check stock availability',
    description: 'Check if sufficient stock is available for a product at a specific location',
  })
  @ApiResponse({
    status: 200,
    description: 'Stock availability information',
    type: InventoryStockDto,
  })
  @ApiResponse({ status: 404, description: 'Inventory not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiBody({ type: CheckStockDto })
  async checkAvailability(
    @Body(ValidationPipe) checkStockDto: CheckStockDto,
  ): Promise<InventoryStockDto> {
    this.logger.log(`Checking availability for product ${checkStockDto.productId}`);
    return await this.inventoryService.checkAvailability(checkStockDto);
  }

  @Post('reserve')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Reserve stock',
    description: 'Reserve stock for a specific time period with TTL auto-release',
  })
  @ApiResponse({
    status: 201,
    description: 'Stock reserved successfully',
    type: ReservationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Inventory not found' })
  @ApiResponse({ status: 400, description: 'Insufficient stock' })
  @ApiResponse({ status: 409, description: 'Conflict during reservation' })
  @ApiBody({ type: ReserveStockDto })
  async reserveStock(
    @Body(ValidationPipe) reserveStockDto: ReserveStockDto,
  ): Promise<ReservationResponseDto> {
    this.logger.log(`Reserving stock: ${JSON.stringify(reserveStockDto)}`);
    return await this.inventoryService.reserveStock(reserveStockDto);
  }

  @Get('reservations/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get reservation details',
    description:
      'Get current status and detailed information about a stock reservation. ' +
      'Use this endpoint to check if a reservation is still valid before attempting ' +
      'to release or fulfill it.',
  })
  @ApiParam({
    name: 'id',
    description: 'Reservation ID',
    example: 'res-1760285000-abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Reservation details',
    type: ReservationDetailsDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Reservation not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Reservation with ID res-123 not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async getReservation(@Param('id') reservationId: string): Promise<ReservationDetailsDto> {
    this.logger.log(`Fetching reservation details: ${reservationId}`);
    return await this.inventoryService.getReservationDetails(reservationId);
  }

  @Put('release-reservation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Release stock reservation',
    description: 'Release a previously made stock reservation back to available inventory',
  })
  @ApiResponse({
    status: 200,
    description: 'Reservation released successfully',
    type: InventoryStockDto,
  })
  @ApiResponse({ status: 404, description: 'Inventory not found' })
  @ApiResponse({ status: 400, description: 'Invalid release request' })
  @ApiBody({ type: ReleaseReservationDto })
  async releaseReservation(
    @Body(ValidationPipe) releaseDto: ReleaseReservationDto,
  ): Promise<InventoryStockDto> {
    this.logger.log(`Releasing reservation: ${releaseDto.reservationId}`);
    return await this.inventoryService.releaseReservation(releaseDto);
  }

  @Put('fulfill-reservation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Fulfill stock reservation',
    description: 'Convert a stock reservation to actual usage/sale',
  })
  @ApiResponse({
    status: 200,
    description: 'Reservation fulfilled successfully',
    type: InventoryStockDto,
  })
  @ApiResponse({ status: 404, description: 'Inventory not found' })
  @ApiResponse({ status: 400, description: 'Invalid fulfillment request' })
  @ApiBody({ type: FulfillReservationDto })
  async fulfillReservation(
    @Body(ValidationPipe) fulfillDto: FulfillReservationDto,
  ): Promise<InventoryStockDto> {
    this.logger.log(
      `Fulfilling reservation: ${fulfillDto.reservationId} for order ${fulfillDto.orderId}`,
    );
    return await this.inventoryService.fulfillReservation(fulfillDto);
  }

  @Post('add-stock')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Add stock',
    description:
      'Add stock to inventory (restock, purchase, adjustment, etc.). Only administrators and warehouse staff can modify inventory stock. Requires ADMIN role.',
  })
  @ApiResponse({
    status: 200,
    description: 'Stock added successfully',
    type: InventoryStockDto,
  })
  @ApiResponse({ status: 404, description: 'Inventory not found' })
  @ApiResponse({ status: 400, description: 'Invalid stock addition request' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Requires ADMIN role' })
  @ApiBody({ type: StockMovementDto })
  async addStock(@Body(ValidationPipe) movementDto: StockMovementDto): Promise<InventoryStockDto> {
    this.logger.log(`Adding stock: ${JSON.stringify(movementDto)}`);
    return await this.inventoryService.addStock(movementDto);
  }

  @Post('remove-stock')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove stock',
    description:
      'Remove stock from inventory (sale, damage, theft, etc.). Reduce inventory for damage, shrinkage, or other reasons. Requires ADMIN role.',
  })
  @ApiResponse({
    status: 200,
    description: 'Stock removed successfully',
    type: InventoryStockDto,
  })
  @ApiResponse({ status: 404, description: 'Inventory not found' })
  @ApiResponse({ status: 400, description: 'Invalid stock removal request' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Requires ADMIN role' })
  @ApiBody({ type: StockMovementDto })
  async removeStock(
    @Body(ValidationPipe) movementDto: StockMovementDto,
  ): Promise<InventoryStockDto> {
    this.logger.log(`Removing stock: ${JSON.stringify(movementDto)}`);
    return await this.inventoryService.removeStock(movementDto);
  }

  @Public()
  @Get('product/:productId')
  @ApiOperation({
    summary: 'Get inventory by product ID',
    description: 'Retrieve inventory details for a specific product',
  })
  @ApiParam({
    name: 'productId',
    description: 'Product UUID',
    type: 'string',
  })
  @ApiQuery({
    name: 'location',
    description: 'Warehouse/location identifier',
    required: false,
    type: 'string',
    example: 'MAIN_WAREHOUSE',
  })
  @ApiResponse({
    status: 200,
    description: 'Inventory details',
    type: InventoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Inventory not found' })
  async getInventoryByProduct(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query('location') location?: string,
  ): Promise<InventoryResponseDto> {
    this.logger.log(`Getting inventory for product ${productId} at location ${location}`);
    return await this.inventoryService.getInventoryByProduct(productId, location);
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Get inventory list',
    description: 'Retrieve paginated list of inventory items with optional filtering',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (1-based)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
    example: 20,
  })
  @ApiQuery({
    name: 'productId',
    required: false,
    type: String,
    description: 'Filter by product ID',
  })
  @ApiQuery({
    name: 'location',
    required: false,
    type: String,
    description: 'Filter by location',
    example: 'MAIN_WAREHOUSE',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'],
    description: 'Filter by stock status',
  })
  @ApiQuery({
    name: 'minStock',
    required: false,
    type: Number,
    description: 'Minimum available stock filter',
  })
  @ApiQuery({
    name: 'maxStock',
    required: false,
    type: Number,
    description: 'Maximum available stock filter',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by product name or SKU',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated inventory list',
    type: PaginatedResponseDto<InventoryResponseDto>,
  })
  async getInventoryList(
    @Query(TRANSFORM_VALIDATION_PIPE) queryDto: InventoryQueryDto,
  ): Promise<PaginatedResponseDto<InventoryResponseDto>> {
    this.logger.log(`Getting inventory list with filters: ${JSON.stringify(queryDto)}`);
    return await this.inventoryService.getInventoryList(queryDto);
  }

  @Public()
  @Get('low-stock')
  @ApiOperation({
    summary: 'Get low stock items',
    description: 'Retrieve items that are below their reorder point or minimum stock levels',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (1-based)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
    example: 20,
  })
  @ApiQuery({ name: 'location', required: false, type: String, description: 'Filter by location' })
  @ApiResponse({
    status: 200,
    description: 'Paginated low stock items',
    type: PaginatedResponseDto<InventoryResponseDto>,
  })
  async getLowStockItems(
    @Query(TRANSFORM_VALIDATION_PIPE) queryParams: InventoryQueryDto,
  ): Promise<PaginatedResponseDto<InventoryResponseDto>> {
    const queryDto: InventoryQueryDto = {
      ...queryParams,
      status: 'LOW_STOCK',
    };

    this.logger.log(`Getting low stock items with filters: ${JSON.stringify(queryDto)}`);
    return await this.inventoryService.getInventoryList(queryDto);
  }

  @Public()
  @Get('out-of-stock')
  @ApiOperation({
    summary: 'Get out of stock items',
    description: 'Retrieve items that have zero available stock',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (1-based)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
    example: 20,
  })
  @ApiQuery({ name: 'location', required: false, type: String, description: 'Filter by location' })
  @ApiResponse({
    status: 200,
    description: 'Paginated out of stock items',
    type: PaginatedResponseDto<InventoryResponseDto>,
  })
  async getOutOfStockItems(
    @Query(TRANSFORM_VALIDATION_PIPE) queryParams: InventoryQueryDto,
  ): Promise<PaginatedResponseDto<InventoryResponseDto>> {
    const queryDto: InventoryQueryDto = {
      ...queryParams,
      status: 'OUT_OF_STOCK',
    };

    this.logger.log(`Getting out of stock items with filters: ${JSON.stringify(queryDto)}`);
    return await this.inventoryService.getInventoryList(queryDto);
  }

  @Public()
  @Get('stats')
  @ApiOperation({
    summary: 'Get inventory statistics',
    description: 'Get overview statistics about inventory levels and status distribution',
  })
  @ApiQuery({ name: 'location', required: false, type: String, description: 'Filter by location' })
  @ApiResponse({
    status: 200,
    description: 'Inventory statistics',
    schema: {
      type: 'object',
      properties: {
        totalItems: { type: 'number', description: 'Total inventory items' },
        totalValue: { type: 'number', description: 'Total inventory value' },
        lowStockCount: { type: 'number', description: 'Items below reorder point' },
        outOfStockCount: { type: 'number', description: 'Items with zero stock' },
        statusBreakdown: {
          type: 'object',
          properties: {
            IN_STOCK: { type: 'number' },
            LOW_STOCK: { type: 'number' },
            OUT_OF_STOCK: { type: 'number' },
          },
        },
      },
    },
  })
  async getInventoryStats(@Query('location') location?: string): Promise<{
    totalItems: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    statusBreakdown: {
      IN_STOCK: number;
      LOW_STOCK: number;
      OUT_OF_STOCK: number;
    };
  }> {
    this.logger.log(`Getting inventory stats for location: ${location}`);
    return await this.inventoryService.getInventoryStats(location);
  }
}
