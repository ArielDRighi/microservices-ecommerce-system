import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';
import {
  CreateUserDto,
  UpdateUserDto,
  UserResponseDto,
  UserQueryDto,
  PaginatedUsersResponseDto,
} from './dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      // Check if user already exists
      const existingUser = await this.findByEmail(createUserDto.email);
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Create new user
      const user = this.userRepository.create({
        ...createUserDto,
        dateOfBirth: createUserDto.dateOfBirth ? new Date(createUserDto.dateOfBirth) : undefined,
      });

      const savedUser = await this.userRepository.save(user);
      this.logger.log(`User created successfully: ${savedUser.email}`);

      return savedUser;
    } catch (error) {
      // Re-throw known exceptions
      if (error instanceof ConflictException) {
        throw error;
      }

      // Log unexpected errors with stack trace
      this.logger.error(
        `Unexpected error creating user: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('An unexpected error occurred while creating user');
    }
  }

  async findAll(queryDto: UserQueryDto): Promise<PaginatedUsersResponseDto> {
    try {
      const { search, status, page = 1, limit = 10, sortBy, sortOrder } = queryDto;

      const queryBuilder = this.createBaseQuery();

      // Apply filters
      this.applyFilters(queryBuilder, search, status);

      // Apply sorting
      this.applySorting(queryBuilder, sortBy, sortOrder);

      // Get total count before pagination
      const total = await queryBuilder.getCount();

      // Apply pagination
      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      // Execute query
      const users = await queryBuilder.getMany();

      // Transform to response DTOs
      const data = plainToInstance(UserResponseDto, users, {
        excludeExtraneousValues: true,
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages,
          hasNext,
          hasPrev,
        },
      };
    } catch (error) {
      // Log unexpected errors with stack trace
      this.logger.error(
        `Unexpected error fetching users: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('An unexpected error occurred while fetching users');
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      const user = await this.userRepository.findOne({
        where: { id },
      });
      return user || null;
    } catch (error) {
      this.logger.error(
        `Failed to find user by ID ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const user = await this.userRepository.findOne({
        where: { email: normalizedEmail },
      });
      return user || null;
    } catch (error) {
      this.logger.error(
        `Failed to find user by email ${email}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    try {
      const user = await this.findById(id);
      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      // Convert dateOfBirth if provided
      const updateData = {
        ...updateUserDto,
        dateOfBirth: updateUserDto.dateOfBirth
          ? new Date(updateUserDto.dateOfBirth)
          : updateUserDto.dateOfBirth,
      };

      // Update user
      await this.userRepository.update(id, updateData);

      // Fetch updated user
      const updatedUser = await this.findById(id);
      if (!updatedUser) {
        throw new BadRequestException('Failed to update user');
      }

      this.logger.log(`User updated successfully: ${updatedUser.email}`);

      return plainToInstance(UserResponseDto, updatedUser, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      // Re-throw known exceptions
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      // Log unexpected errors with stack trace
      this.logger.error(
        `Unexpected error updating user ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('An unexpected error occurred while updating user');
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const user = await this.findById(id);
      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      // Prevent admin from deleting themselves
      if (user.role === UserRole.ADMIN) {
        throw new ForbiddenException(
          'Admin users cannot be deleted. Please transfer admin role first or contact support.',
        );
      }

      // Soft delete using TypeORM's softDelete method
      await this.userRepository.softDelete(id);

      this.logger.log(`User soft deleted (marked with deletedAt): ${user.email}`);
    } catch (error) {
      // Re-throw known exceptions
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }

      // Log unexpected errors with stack trace
      this.logger.error(
        `Unexpected error deleting user ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('An unexpected error occurred while deleting user');
    }
  }

  async activate(id: string): Promise<UserResponseDto> {
    try {
      const user = await this.findById(id);
      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      await this.userRepository.update(id, { isActive: true });

      const activatedUser = await this.findById(id);
      if (!activatedUser) {
        throw new BadRequestException('Failed to activate user');
      }

      this.logger.log(`User activated: ${activatedUser.email}`);

      return plainToInstance(UserResponseDto, activatedUser, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      // Re-throw known exceptions
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      // Log unexpected errors with stack trace
      this.logger.error(
        `Unexpected error activating user ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('An unexpected error occurred while activating user');
    }
  }

  async updateLastLogin(id: string): Promise<void> {
    try {
      await this.userRepository.update(id, { lastLoginAt: new Date() });
    } catch (error) {
      this.logger.error(
        `Failed to update last login for user ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Don't throw error - this is not critical
    }
  }

  async markEmailAsVerified(id: string): Promise<void> {
    try {
      await this.userRepository.update(id, { emailVerifiedAt: new Date() });
      this.logger.log(`Email marked as verified for user: ${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to mark email as verified for user ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Don't throw error - this is not critical
    }
  }

  private createBaseQuery(): SelectQueryBuilder<User> {
    return this.userRepository.createQueryBuilder('user');
  }

  private applyFilters(
    queryBuilder: SelectQueryBuilder<User>,
    search?: string,
    status?: 'active' | 'inactive' | 'all',
  ): void {
    if (search) {
      const searchTerm = `%${search}%`;
      queryBuilder.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: searchTerm },
      );
    }

    if (status && status !== 'all') {
      const isActive = status === 'active';
      queryBuilder.andWhere('user.isActive = :isActive', { isActive });
    }
  }

  private applySorting(
    queryBuilder: SelectQueryBuilder<User>,
    sortBy?: string,
    sortOrder?: 'ASC' | 'DESC',
  ): void {
    const validSortFields = ['createdAt', 'updatedAt', 'firstName', 'lastName', 'email'];
    const field = validSortFields.includes(sortBy || '') ? sortBy : 'createdAt';
    const order = sortOrder || 'DESC';

    queryBuilder.orderBy(`user.${field}`, order);
  }
}
