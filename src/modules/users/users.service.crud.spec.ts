import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import {
  createMockUser,
  createMockCreateUserDto,
  setupUsersTestModule,
} from './helpers/users.test-helpers';

describe('UsersService - CRUD Operations', () => {
  let service: UsersService;
  let repository: jest.Mocked<Repository<User>>;

  const mockUser = createMockUser();

  beforeEach(async () => {
    const module = await setupUsersTestModule();
    service = module.service;
    repository = module.repository;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createUserDto = createMockCreateUserDto();

    it('should create user and return saved entity when valid data provided', async () => {
      // Arrange
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockUser);
      repository.save.mockResolvedValue(mockUser);

      // Act
      const result = await service.create(createUserDto);

      // Assert
      expect(result).toBe(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      });
      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalledWith(mockUser);
    });

    it('should throw ConflictException when user already exists', async () => {
      // Arrange
      repository.findOne.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when database error occurs during create', async () => {
      // Arrange
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockUser);
      repository.save.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.create(createUserDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createUserDto)).rejects.toThrow('Failed to create user');
    });
  });

  describe('findByEmail', () => {
    it('should return user when valid email provided', async () => {
      // Arrange
      repository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.findByEmail('test@example.com');

      // Assert
      expect(result).toBe(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null when user not found', async () => {
      // Arrange
      repository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findByEmail('nonexistent@example.com');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return user when valid ID provided', async () => {
      // Arrange
      repository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.findById('123e4567-e89b-12d3-a456-426614174000');

      // Assert
      expect(result).toBe(mockUser);
    });

    it('should return null when user not found', async () => {
      // Arrange
      repository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findById('nonexistent-id');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when database error occurs during findById', async () => {
      // Arrange
      repository.findOne.mockRejectedValue(new Error('Database connection error'));

      // Act
      const result = await service.findById('123e4567-e89b-12d3-a456-426614174000');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should return user response DTO when user exists', async () => {
      // Arrange
      repository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.findOne('123e4567-e89b-12d3-a456-426614174000');

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      repository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });
});
