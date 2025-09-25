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
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UserResponseDto,
  UserQueryDto,
  PaginatedUsersResponseDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators';
import { User } from './entities/user.entity';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new user',
    description: 'Create a new user account (admin only)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User successfully created',
    type: UserResponseDto,
  })
  @ApiConflictResponse({
    description: 'User with this email already exists',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    this.logger.log(`Creating new user: ${createUserDto.email}`);
    const user = await this.usersService.create(createUserDto);

    // Use the service's findOne method which returns a properly formatted UserResponseDto
    return this.usersService.findOne(user.id);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all users with pagination and filters',
    description: 'Retrieve a paginated list of users with optional filtering and sorting',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search term for filtering users',
    type: String,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by user status',
    enum: ['active', 'inactive', 'all'],
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
    enum: ['createdAt', 'updatedAt', 'firstName', 'lastName', 'email'],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Users retrieved successfully',
    type: PaginatedUsersResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  async findAll(@Query() queryDto: UserQueryDto): Promise<PaginatedUsersResponseDto> {
    this.logger.log(`Fetching users with filters: ${JSON.stringify(queryDto)}`);
    return this.usersService.findAll(queryDto);
  }

  @Get('profile')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Retrieve the profile of the currently authenticated user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile retrieved successfully',
    type: UserResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  async getProfile(@CurrentUser() user: User): Promise<UserResponseDto> {
    this.logger.log(`Profile request for user: ${user.email}`);
    return this.usersService.findOne(user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieve a specific user by their ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User found successfully',
    type: UserResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    this.logger.log(`Fetching user by ID: ${id}`);
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update user',
    description: 'Update user information',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    this.logger.log(`Updating user: ${id}`);
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft delete user',
    description: 'Deactivate user account (soft delete)',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'User successfully deactivated',
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    this.logger.log(`Soft deleting user: ${id}`);
    return this.usersService.remove(id);
  }

  @Patch(':id/activate')
  @ApiOperation({
    summary: 'Activate user',
    description: 'Activate a deactivated user account',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User activated successfully',
    type: UserResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  async activate(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    this.logger.log(`Activating user: ${id}`);
    return this.usersService.activate(id);
  }
}
