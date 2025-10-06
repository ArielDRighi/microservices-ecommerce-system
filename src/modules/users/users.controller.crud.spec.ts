import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateUserDto, UserQueryDto } from './dto';
import { User } from './entities/user.entity';

describe('UsersController - CRUD & Query Operations', () => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;

  const mockUser: Partial<User> = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockUserResponse = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe',
    isActive: true,
    emailVerifiedAt: null,
    lastLoginAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    passwordHash: '',
    orders: undefined,
  };

  const mockPaginatedResponse = {
    data: [mockUserResponse],
    meta: {
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      activate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      // Arrange
      const createDto: CreateUserDto = {
        email: 'newuser@example.com',
        passwordHash: 'SecurePass123!',
        firstName: 'Jane',
        lastName: 'Smith',
      };
      const createdUser = { ...mockUser, id: 'new-user-id', email: createDto.email };

      service.create.mockResolvedValue(createdUser as User);
      service.findOne.mockResolvedValue({
        ...mockUserResponse,
        id: 'new-user-id',
        email: createDto.email,
        firstName: createDto.firstName,
        lastName: createDto.lastName,
        fullName: `${createDto.firstName} ${createDto.lastName}`,
      });

      // Act
      const result = await controller.create(createDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.email).toBe(createDto.email);
      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(service.findOne).toHaveBeenCalledWith('new-user-id');
    });

    it('should call create with correct parameters', async () => {
      // Arrange
      const createDto: CreateUserDto = {
        email: 'admin@example.com',
        passwordHash: 'AdminPass123!',
        firstName: 'Admin',
        lastName: 'User',
      };

      service.create.mockResolvedValue(mockUser as User);
      service.findOne.mockResolvedValue(mockUserResponse);

      // Act
      await controller.create(createDto);

      // Assert
      expect(service.create).toHaveBeenCalledTimes(1);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return paginated users with default parameters', async () => {
      // Arrange
      const queryDto: UserQueryDto = {
        page: 1,
        limit: 10,
      };
      service.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.findAll(queryDto);

      // Assert
      expect(result).toEqual(mockPaginatedResponse);
      expect(result.data).toHaveLength(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(service.findAll).toHaveBeenCalledWith(queryDto);
    });

    it.each([
      ['search', { page: 1, limit: 10, search: 'john' }],
      ['status', { page: 1, limit: 10, status: 'active' as const }],
      ['sorting', { page: 1, limit: 10, sortBy: 'firstName', sortOrder: 'ASC' as const }],
    ])('should apply %s filter correctly', async (_, queryDto) => {
      // Arrange
      service.findAll.mockResolvedValue(mockPaginatedResponse);

      // Act
      const result = await controller.findAll(queryDto);

      // Assert
      expect(result).toBeDefined();
      expect(service.findAll).toHaveBeenCalledWith(queryDto);
    });

    it('should handle custom pagination parameters', async () => {
      // Arrange
      const queryDto: UserQueryDto = {
        page: 3,
        limit: 25,
      };
      const customPaginatedResponse = {
        ...mockPaginatedResponse,
        meta: {
          total: 100,
          page: 3,
          limit: 25,
          totalPages: 4,
          hasNext: true,
          hasPrev: true,
        },
      };
      service.findAll.mockResolvedValue(customPaginatedResponse);

      // Act
      const result = await controller.findAll(queryDto);

      // Assert
      expect(result.meta.page).toBe(3);
      expect(result.meta.limit).toBe(25);
      expect(result.meta.hasNext).toBe(true);
      expect(result.meta.hasPrev).toBe(true);
    });
  });

  describe('getProfile', () => {
    it('should return current user profile', async () => {
      // Arrange
      service.findOne.mockResolvedValue(mockUserResponse);

      // Act
      const result = await controller.getProfile(mockUser as User);

      // Assert
      expect(result).toEqual(mockUserResponse);
      expect(service.findOne).toHaveBeenCalledWith(mockUser.id);
    });

    it('should use authenticated user ID', async () => {
      // Arrange
      const authenticatedUser: Partial<User> = {
        id: 'auth-user-456',
        email: 'authenticated@example.com',
        firstName: 'Auth',
        lastName: 'User',
      };
      service.findOne.mockResolvedValue({
        ...mockUserResponse,
        id: 'auth-user-456',
      });

      // Act
      const result = await controller.getProfile(authenticatedUser as User);

      // Assert
      expect(result.id).toBe('auth-user-456');
      expect(service.findOne).toHaveBeenCalledWith('auth-user-456');
    });
  });

  describe('findOne', () => {
    it('should return a user by ID', async () => {
      // Arrange
      const userId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      service.findOne.mockResolvedValue(mockUserResponse);

      // Act
      const result = await controller.findOne(userId);

      // Assert
      expect(result).toEqual(mockUserResponse);
      expect(service.findOne).toHaveBeenCalledWith(userId);
    });

    it('should validate UUID format', async () => {
      // Arrange
      const validUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      service.findOne.mockResolvedValue(mockUserResponse);

      // Act
      const result = await controller.findOne(validUuid);

      // Assert
      expect(result).toBeDefined();
      expect(service.findOne).toHaveBeenCalledWith(validUuid);
    });
  });
});
