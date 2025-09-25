import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductResponseDto,
  ProductQueryDto,
  PaginatedProductsResponseDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators';
import { User } from '../users/entities/user.entity';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);

  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new product',
    description: 'Create a new product (admin only)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Product successfully created',
    type: ProductResponseDto,
  })
  @ApiConflictResponse({
    description: 'Product with this SKU already exists',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  async create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() user: User,
  ): Promise<ProductResponseDto> {
    this.logger.log(`Creating new product: ${createProductDto.name} by user: ${user.email}`);
    const product = await this.productsService.create(createProductDto);
    return this.productsService.findOne(product.id);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all products with pagination, filters, and sorting',
    description: 'Retrieve a paginated list of products with optional filtering and sorting',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search term for filtering products',
    type: String,
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by product category',
    type: String,
  })
  @ApiQuery({
    name: 'brand',
    required: false,
    description: 'Filter by product brand',
    type: String,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by product status',
    enum: ['active', 'inactive', 'all'],
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    description: 'Minimum price filter',
    type: Number,
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    description: 'Maximum price filter',
    type: Number,
  })
  @ApiQuery({
    name: 'onSale',
    required: false,
    description: 'Filter products on sale only',
    type: Boolean,
  })
  @ApiQuery({
    name: 'tags',
    required: false,
    description: 'Filter by tags (comma-separated)',
    type: String,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (starts from 1)',
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
    type: Number,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Field to sort by',
    enum: [
      'name',
      'price',
      'createdAt',
      'updatedAt',
      'category',
      'brand',
      'sku',
      'popularity',
      'discountPercentage',
    ],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
  })
  @ApiQuery({
    name: 'includeDeleted',
    required: false,
    description: 'Include soft deleted products',
    type: Boolean,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Products retrieved successfully',
    type: PaginatedProductsResponseDto,
  })
  async findAll(@Query() queryDto: ProductQueryDto): Promise<PaginatedProductsResponseDto> {
    this.logger.log(`Fetching products with filters: ${JSON.stringify(queryDto)}`);
    return this.productsService.findAll(queryDto);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search products by term',
    description: 'Full-text search across product name, description, and tags',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Search term',
    type: String,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of results',
    type: Number,
    example: 10,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search results retrieved successfully',
    type: [ProductResponseDto],
  })
  @ApiBadRequestResponse({
    description: 'Invalid search parameters',
  })
  async search(
    @Query('q') searchTerm: string,
    @Query('limit') limit = 10,
  ): Promise<ProductResponseDto[]> {
    this.logger.log(`Searching products for: "${searchTerm}"`);
    return this.productsService.search(searchTerm, limit);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get product by ID',
    description: 'Retrieve a specific product by their ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Product ID',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product found successfully',
    type: ProductResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Product not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ProductResponseDto> {
    this.logger.log(`Fetching product by ID: ${id}`);
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update product',
    description: 'Update product information (admin only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Product ID',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product updated successfully',
    type: ProductResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Product not found',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user: User,
  ): Promise<ProductResponseDto> {
    this.logger.log(`Updating product: ${id} by user: ${user.email}`);
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft delete product',
    description: 'Deactivate product (soft delete) - admin only',
  })
  @ApiParam({
    name: 'id',
    description: 'Product ID',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Product successfully deleted',
  })
  @ApiNotFoundResponse({
    description: 'Product not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User): Promise<void> {
    this.logger.log(`Soft deleting product: ${id} by user: ${user.email}`);
    return this.productsService.remove(id);
  }

  @Patch(':id/activate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Activate product',
    description: 'Activate a deactivated product (admin only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Product ID',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product activated successfully',
    type: ProductResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Product not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<ProductResponseDto> {
    this.logger.log(`Activating product: ${id} by user: ${user.email}`);
    return this.productsService.activate(id);
  }

  @Patch(':id/deactivate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Deactivate product',
    description: 'Deactivate a product without deleting it (admin only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Product ID',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product deactivated successfully',
    type: ProductResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Product not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<ProductResponseDto> {
    this.logger.log(`Deactivating product: ${id} by user: ${user.email}`);
    return this.productsService.deactivate(id);
  }
}
