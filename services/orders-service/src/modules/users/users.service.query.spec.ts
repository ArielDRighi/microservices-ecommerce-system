import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import {
  createMockUser,
  setupUsersTestModule,
  createMockQueryBuilder,
} from './helpers/users.test-helpers';

describe('UsersService - Queries & Pagination', () => {
  let service: UsersService;
  let repository: jest.Mocked<Repository<User>>;

  const mockUser = createMockUser();

  beforeEach(async () => {
    const module = await setupUsersTestModule();
    service = module.service;
    repository = module.repository;
  });

  describe('findAll', () => {
    it('should return paginated users with default parameters', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder([mockUser], 1);
      repository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as unknown as ReturnType<typeof repository.createQueryBuilder>,
      );

      // Act
      const result = await service.findAll({ page: 1, limit: 10 });

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(1);
      expect(result.meta.hasNext).toBe(false);
      expect(result.meta.hasPrev).toBe(false);
    });

    it('should apply search filter', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder([mockUser], 1);
      repository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as unknown as ReturnType<typeof repository.createQueryBuilder>,
      );

      // Act
      await service.findAll({ page: 1, limit: 10, search: 'john' });

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('user.firstName ILIKE :search'),
        expect.objectContaining({ search: '%john%' }),
      );
    });

    it('should filter by active status', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder([mockUser], 1);
      repository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as unknown as ReturnType<typeof repository.createQueryBuilder>,
      );

      // Act
      await service.findAll({ page: 1, limit: 10, status: 'active' });

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.isActive = :isActive', {
        isActive: true,
      });
    });

    it('should filter by inactive status', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder([mockUser], 1);
      repository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as unknown as ReturnType<typeof repository.createQueryBuilder>,
      );

      // Act
      await service.findAll({ page: 1, limit: 10, status: 'inactive' });

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.isActive = :isActive', {
        isActive: false,
      });
    });

    it('should apply custom sorting', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder([mockUser], 1);
      repository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as unknown as ReturnType<typeof repository.createQueryBuilder>,
      );

      // Act
      await service.findAll({ page: 1, limit: 10, sortBy: 'firstName', sortOrder: 'ASC' });

      // Assert
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('user.firstName', 'ASC');
    });

    it('should calculate pagination metadata correctly', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder([mockUser], 25);
      repository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as unknown as ReturnType<typeof repository.createQueryBuilder>,
      );

      // Act
      const result = await service.findAll({ page: 2, limit: 10 });

      // Assert
      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.hasNext).toBe(true);
      expect(result.meta.hasPrev).toBe(true);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should throw BadRequestException when database error occurs during findAll', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder([], 0);
      mockQueryBuilder.getCount.mockRejectedValue(new Error('Database connection error'));
      repository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as unknown as ReturnType<typeof repository.createQueryBuilder>,
      );

      // Act & Assert
      await expect(service.findAll({ page: 1, limit: 10 })).rejects.toThrow(BadRequestException);
      await expect(service.findAll({ page: 1, limit: 10 })).rejects.toThrow(
        'An unexpected error occurred while fetching users',
      );
    });
  });
});
