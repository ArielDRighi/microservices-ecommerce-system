import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UserQueryDto } from './dto';
import { UserRole } from './enums/user-role.enum';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    fullName: 'Test User',
    isActive: true,
    role: UserRole.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    activate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto: CreateUserDto = {
        email: 'newuser@example.com',
        passwordHash: 'hashedPassword123',
        firstName: 'New',
        lastName: 'User',
      };

      const createdUser = { ...mockUser, ...createUserDto };
      mockUsersService.create.mockResolvedValue(createdUser);
      mockUsersService.findOne.mockResolvedValue(createdUser);

      const result = await controller.create(createUserDto);

      expect(service.create).toHaveBeenCalledWith(createUserDto);
      expect(service.findOne).toHaveBeenCalledWith(createdUser.id);
      expect(result).toEqual(createdUser);
    });

    it('should handle errors when creating user', async () => {
      const createUserDto: CreateUserDto = {
        email: 'error@example.com',
        passwordHash: 'hashedPassword123',
        firstName: 'Error',
        lastName: 'User',
      };

      mockUsersService.create.mockRejectedValue(new Error('Creation failed'));

      await expect(controller.create(createUserDto)).rejects.toThrow('Creation failed');
      expect(service.create).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const queryDto: UserQueryDto = {
        page: 1,
        limit: 10,
        search: '',
        status: 'all',
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      };

      const paginatedResult = {
        data: [mockUser],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      mockUsersService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(queryDto);

      expect(service.findAll).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual(paginatedResult);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should handle empty results', async () => {
      const queryDto: UserQueryDto = {
        page: 1,
        limit: 10,
        search: 'nonexistent',
        status: 'all',
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      };

      const emptyResult = {
        data: [],
        meta: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };

      mockUsersService.findAll.mockResolvedValue(emptyResult);

      const result = await controller.findAll(queryDto);

      expect(service.findAll).toHaveBeenCalledWith(queryDto);
      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('getProfile', () => {
    it('should return current user profile', async () => {
      const user = { ...mockUser };
      mockUsersService.findOne.mockResolvedValue(user);

      const result = await controller.getProfile(user as any);

      expect(service.findOne).toHaveBeenCalledWith(user.id);
      expect(result).toEqual(user);
    });

    it('should not expose password in profile', async () => {
      const user = { ...mockUser };
      mockUsersService.findOne.mockResolvedValue(user);

      const result = await controller.getProfile(user as any);

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  describe('findOne', () => {
    it('should return a user by ID', async () => {
      const userId = mockUser.id;
      mockUsersService.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne(userId);

      expect(service.findOne).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockUser);
      expect(result.id).toBe(userId);
    });

    it('should throw error for non-existent user', async () => {
      const userId = 'non-existent-id';
      mockUsersService.findOne.mockRejectedValue(new Error('User not found'));

      await expect(controller.findOne(userId)).rejects.toThrow('User not found');
      expect(service.findOne).toHaveBeenCalledWith(userId);
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const userId = mockUser.id;
      const updateUserDto: UpdateUserDto = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      const updatedUser = { ...mockUser, ...updateUserDto };
      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(userId, updateUserDto);

      expect(service.update).toHaveBeenCalledWith(userId, updateUserDto);
      expect(result).toEqual(updatedUser);
      expect(result.firstName).toBe('Updated');
      expect(result.lastName).toBe('Name');
    });

    it('should handle partial updates', async () => {
      const userId = mockUser.id;
      const updateUserDto: UpdateUserDto = {
        firstName: 'OnlyFirstName',
      };

      const updatedUser = { ...mockUser, firstName: 'OnlyFirstName' };
      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(userId, updateUserDto);

      expect(service.update).toHaveBeenCalledWith(userId, updateUserDto);
      expect(result.firstName).toBe('OnlyFirstName');
      expect(result.lastName).toBe(mockUser.lastName);
    });
  });

  describe('remove', () => {
    it('should soft delete a user', async () => {
      const userId = mockUser.id;
      mockUsersService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(userId);

      expect(service.remove).toHaveBeenCalledWith(userId);
      expect(result).toBeUndefined();
    });

    it('should handle errors when deleting user', async () => {
      const userId = 'error-user-id';
      mockUsersService.remove.mockRejectedValue(new Error('Delete failed'));

      await expect(controller.remove(userId)).rejects.toThrow('Delete failed');
      expect(service.remove).toHaveBeenCalledWith(userId);
    });
  });

  describe('activate', () => {
    it('should activate a deactivated user', async () => {
      const userId = mockUser.id;
      const activatedUser = { ...mockUser, isActive: true };
      mockUsersService.activate.mockResolvedValue(activatedUser);

      const result = await controller.activate(userId);

      expect(service.activate).toHaveBeenCalledWith(userId);
      expect(result).toEqual(activatedUser);
      expect(result.isActive).toBe(true);
    });

    it('should handle errors when activating user', async () => {
      const userId = 'error-user-id';
      mockUsersService.activate.mockRejectedValue(new Error('Activation failed'));

      await expect(controller.activate(userId)).rejects.toThrow('Activation failed');
      expect(service.activate).toHaveBeenCalledWith(userId);
    });
  });

  describe('authorization decorators', () => {
    it('should have @Roles decorator on administrative endpoints', () => {
      const createMetadata = Reflect.getMetadata('roles', controller.create);
      const findAllMetadata = Reflect.getMetadata('roles', controller.findAll);
      const findOneMetadata = Reflect.getMetadata('roles', controller.findOne);
      const updateMetadata = Reflect.getMetadata('roles', controller.update);
      const removeMetadata = Reflect.getMetadata('roles', controller.remove);
      const activateMetadata = Reflect.getMetadata('roles', controller.activate);

      // Administrative endpoints should have ADMIN role
      expect(createMetadata).toContain(UserRole.ADMIN);
      expect(findAllMetadata).toContain(UserRole.ADMIN);
      expect(findOneMetadata).toContain(UserRole.ADMIN);
      expect(updateMetadata).toContain(UserRole.ADMIN);
      expect(removeMetadata).toContain(UserRole.ADMIN);
      expect(activateMetadata).toContain(UserRole.ADMIN);
    });

    it('should NOT have @Roles decorator on getProfile endpoint', () => {
      const getProfileMetadata = Reflect.getMetadata('roles', controller.getProfile);

      // getProfile should be accessible to any authenticated user
      expect(getProfileMetadata).toBeUndefined();
    });
  });
});
