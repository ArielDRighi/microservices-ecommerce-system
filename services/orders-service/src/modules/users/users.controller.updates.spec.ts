import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto';

describe('UsersController - Update Operations', () => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;

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

  describe('update', () => {
    it('should update a user successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const updateDto: UpdateUserDto = {
        firstName: 'UpdatedJohn',
        lastName: 'UpdatedDoe',
      };
      const updatedUser = {
        ...mockUserResponse,
        firstName: 'UpdatedJohn',
        lastName: 'UpdatedDoe',
        fullName: 'UpdatedJohn UpdatedDoe',
        updatedAt: new Date(),
      };
      service.update.mockResolvedValue(updatedUser);

      // Act
      const result = await controller.update(userId, updateDto);

      // Assert
      expect(result).toEqual(updatedUser);
      expect(result.firstName).toBe('UpdatedJohn');
      expect(result.lastName).toBe('UpdatedDoe');
      expect(service.update).toHaveBeenCalledWith(userId, updateDto);
    });

    it('should update multiple user fields', async () => {
      // Arrange
      const userId = 'user-123';
      const updateDto: UpdateUserDto = {
        firstName: 'Multi',
        lastName: 'Update',
        phoneNumber: '+1234567890',
      };
      const updatedUser = {
        ...mockUserResponse,
        firstName: 'Multi',
        lastName: 'Update',
        fullName: 'Multi Update',
        phoneNumber: '+1234567890',
      };
      service.update.mockResolvedValue(updatedUser);

      // Act
      const result = await controller.update(userId, updateDto);

      // Assert
      expect(result.firstName).toBe('Multi');
      expect(result.lastName).toBe('Update');
      expect(result.phoneNumber).toBe('+1234567890');
      expect(service.update).toHaveBeenCalledWith(userId, updateDto);
    });

    it('should handle partial updates', async () => {
      // Arrange
      const userId = 'user-123';
      const updateDto: UpdateUserDto = {
        firstName: 'OnlyFirstName',
      };
      const updatedUser = {
        ...mockUserResponse,
        firstName: 'OnlyFirstName',
        fullName: 'OnlyFirstName Doe',
      };
      service.update.mockResolvedValue(updatedUser);

      // Act
      const result = await controller.update(userId, updateDto);

      // Assert
      expect(result.firstName).toBe('OnlyFirstName');
      expect(result.lastName).toBe(mockUserResponse.lastName);
      expect(service.update).toHaveBeenCalledWith(userId, updateDto);
    });
  });

  describe('remove', () => {
    it('should soft delete a user', async () => {
      // Arrange
      const userId = 'user-123';
      service.remove.mockResolvedValue(undefined);

      // Act
      const result = await controller.remove(userId);

      // Assert
      expect(result).toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith(userId);
    });

    it('should call remove with correct UUID', async () => {
      // Arrange
      const userId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      service.remove.mockResolvedValue(undefined);

      // Act
      await controller.remove(userId);

      // Assert
      expect(service.remove).toHaveBeenCalledWith(userId);
    });
  });

  describe('activate', () => {
    it('should activate a deactivated user', async () => {
      // Arrange
      const userId = 'user-123';
      const activatedUser = {
        ...mockUserResponse,
        isActive: true,
      };
      service.activate.mockResolvedValue(activatedUser);

      // Act
      const result = await controller.activate(userId);

      // Assert
      expect(result).toEqual(activatedUser);
      expect(result.isActive).toBe(true);
      expect(service.activate).toHaveBeenCalledWith(userId);
    });

    it('should call activate with correct UUID', async () => {
      // Arrange
      const userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      service.activate.mockResolvedValue(mockUserResponse);

      // Act
      const result = await controller.activate(userId);

      // Assert
      expect(result).toBeDefined();
      expect(service.activate).toHaveBeenCalledWith(userId);
    });
  });
});
