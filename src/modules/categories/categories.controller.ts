import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Put,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { CategoriesService } from './categories.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto,
  CategoryTreeDto,
  CategoryQueryDto,
  PaginatedCategoriesResponseDto,
} from './dto';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new category (Admin only)',
    description:
      'Creates a new category. Only administrators can create categories in the catalog.',
  })
  @ApiBody({
    type: CreateCategoryDto,
    description: 'Category data',
    examples: {
      rootCategory: {
        summary: 'Root category example',
        value: {
          name: 'Electronics',
          description: 'Electronic products and gadgets',
          slug: 'electronics',
          sortOrder: 10,
          metadata: {
            color: '#FF5722',
            icon: 'electronics-icon',
          },
        },
      },
      subCategory: {
        summary: 'Sub-category example',
        value: {
          name: 'Smartphones',
          description: 'Mobile phones and accessories',
          parentId: '550e8400-e29b-41d4-a716-446655440000',
          sortOrder: 5,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Category created successfully',
    type: CategoryResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - JWT token required' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin role required' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Category with this slug or name already exists' })
  async create(@Body() createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto> {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all categories',
    description: 'Retrieves a paginated list of categories with optional filtering and sorting.',
  })
  @ApiQuery({ type: CategoryQueryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Categories retrieved successfully',
    type: PaginatedCategoriesResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  async findAll(@Query() query: CategoryQueryDto): Promise<PaginatedCategoriesResponseDto> {
    return this.categoriesService.findAll(query);
  }

  @Get('tree')
  @ApiOperation({
    summary: 'Get category tree',
    description: 'Retrieves the complete category hierarchy as a tree structure.',
  })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Include inactive categories in the tree',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category tree retrieved successfully',
    type: [CategoryTreeDto],
  })
  @ApiBadRequestResponse({ description: 'Failed to build category tree' })
  async getCategoryTree(
    @Query('includeInactive') includeInactive?: string | boolean,
  ): Promise<CategoryTreeDto[]> {
    const includeInactiveBoolean = includeInactive === true || includeInactive === 'true';
    return this.categoriesService.buildCategoryTree(includeInactiveBoolean);
  }

  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Get category by slug',
    description: 'Retrieves a category by its URL-friendly slug.',
  })
  @ApiParam({
    name: 'slug',
    description: 'Category slug',
    example: 'electronics',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category found',
    type: CategoryResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Category not found' })
  async findBySlug(@Param('slug') slug: string): Promise<CategoryResponseDto> {
    const category = await this.categoriesService.findBySlug(slug);
    if (!category) {
      throw new NotFoundException(`Category with slug '${slug}' not found`);
    }
    return category;
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get category by ID',
    description: 'Retrieves a specific category by its unique identifier.',
  })
  @ApiParam({
    name: 'id',
    description: 'Category UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category found',
    type: CategoryResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<CategoryResponseDto> {
    return this.categoriesService.findOne(id);
  }

  @Get(':id/descendants')
  @ApiOperation({
    summary: 'Get category descendants',
    description: 'Retrieves all descendant categories of a specific category.',
  })
  @ApiParam({
    name: 'id',
    description: 'Category UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'maxDepth',
    required: false,
    type: Number,
    description: 'Maximum depth to retrieve (unlimited if not specified)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Descendants retrieved successfully',
    type: [CategoryResponseDto],
  })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiBadRequestResponse({ description: 'Invalid UUID format or maxDepth' })
  async getDescendants(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('maxDepth') maxDepth?: number,
  ): Promise<CategoryResponseDto[]> {
    return this.categoriesService.getDescendants(id, maxDepth);
  }

  @Get(':id/path')
  @ApiOperation({
    summary: 'Get category path',
    description: 'Retrieves the complete path from root to the specified category.',
  })
  @ApiParam({
    name: 'id',
    description: 'Category UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category path retrieved successfully',
    schema: {
      type: 'array',
      items: { type: 'string' },
      example: ['Electronics', 'Computers', 'Laptops'],
    },
  })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  async getCategoryPath(@Param('id', ParseUUIDPipe) id: string): Promise<string[]> {
    return this.categoriesService.getCategoryPath(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update category (Admin only)',
    description: 'Updates a category. Only administrators can update categories.',
  })
  @ApiParam({
    name: 'id',
    description: 'Category UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: UpdateCategoryDto,
    description: 'Updated category data',
    examples: {
      updateBasic: {
        summary: 'Update basic info',
        value: {
          name: 'Consumer Electronics',
          description: 'Updated description for consumer electronics',
          sortOrder: 15,
        },
      },
      moveCategory: {
        summary: 'Move to different parent',
        value: {
          parentId: '550e8400-e29b-41d4-a716-446655440001',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category updated successfully',
    type: CategoryResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - JWT token required' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin role required' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data or circular hierarchy' })
  @ApiConflictResponse({ description: 'Category with this slug or name already exists' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Patch(':id/activate')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Activate category (Admin only)',
    description: 'Activates a category. Only administrators can activate categories.',
  })
  @ApiParam({
    name: 'id',
    description: 'Category UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category activated successfully',
    type: CategoryResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - JWT token required' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin role required' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiBadRequestResponse({ description: 'Failed to activate category' })
  async activate(@Param('id', ParseUUIDPipe) id: string): Promise<CategoryResponseDto> {
    return this.categoriesService.activate(id);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Deactivate category (Admin only)',
    description: 'Deactivates a category. Only administrators can deactivate categories.',
  })
  @ApiParam({
    name: 'id',
    description: 'Category UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category deactivated successfully',
    type: CategoryResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - JWT token required' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin role required' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiBadRequestResponse({ description: 'Failed to deactivate category' })
  async deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<CategoryResponseDto> {
    return this.categoriesService.deactivate(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete category (Admin only)',
    description:
      'Soft deletes a category. Only administrators can delete categories. Categories with children or products cannot be deleted.',
  })
  @ApiParam({
    name: 'id',
    description: 'Category UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Category deleted successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - JWT token required' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin role required' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiBadRequestResponse({ description: 'Cannot delete category with children or products' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.categoriesService.remove(id);
  }
}
