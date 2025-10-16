import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';
import { createMockUser, setupUsersTestModule } from './helpers/users.test-helpers';

describe('UsersService - Updates & Status Changes', () => {
  let service: UsersService;
  let repository: jest.Mocked<Repository<User>>;

  const mockUser = createMockUser();

  beforeEach(async () => {
    const module = await setupUsersTestModule();
    service = module.service;
    repository = module.repository;
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp when valid user ID provided', async () => {
      // Arrange
      repository.update.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });

      // Act
      await service.updateLastLogin('123e4567-e89b-12d3-a456-426614174000');

      // Assert
      expect(repository.update).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000', {
        lastLoginAt: expect.any(Date),
      });
    });

    it('should not throw error when update fails', async () => {
      // Arrange
      repository.update.mockRejectedValue(new Error('Database error'));

      // Act & Assert - should not throw
      await expect(
        service.updateLastLogin('123e4567-e89b-12d3-a456-426614174000'),
      ).resolves.toBeUndefined();
    });
  });

  describe('markEmailAsVerified', () => {
    it('should mark email as verified with current timestamp', async () => {
      // Arrange
      repository.update.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });

      // Act
      await service.markEmailAsVerified('123e4567-e89b-12d3-a456-426614174000');

      // Assert
      expect(repository.update).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000', {
        emailVerifiedAt: expect.any(Date),
      });
    });

    it('should not throw error when update fails', async () => {
      // Arrange
      repository.update.mockRejectedValue(new Error('Database error'));

      // Act & Assert - should not throw
      await expect(
        service.markEmailAsVerified('123e4567-e89b-12d3-a456-426614174000'),
      ).resolves.toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      // Arrange
      const updateDto = {
        firstName: 'Jane',
        lastName: 'Smith',
      };
      const updatedUser = createMockUser({
        firstName: 'Jane',
        lastName: 'Smith',
      });

      repository.findOne.mockResolvedValueOnce(mockUser).mockResolvedValueOnce(updatedUser);
      repository.update.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });

      // Act
      const result = await service.update('123e4567-e89b-12d3-a456-426614174000', updateDto);

      // Assert
      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
      expect(repository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user does not exist', async () => {
      // Arrange
      repository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update('nonexistent-id', { firstName: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle dateOfBirth conversion', async () => {
      // Arrange
      const updateDto = {
        dateOfBirth: '1995-05-15',
      };
      const updatedUser = createMockUser({
        dateOfBirth: new Date('1995-05-15'),
      });

      repository.findOne.mockResolvedValueOnce(mockUser).mockResolvedValueOnce(updatedUser);
      repository.update.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });

      // Act
      const result = await service.update('123e4567-e89b-12d3-a456-426614174000', updateDto);

      // Assert
      expect(result).toBeDefined();
      expect(repository.update).toHaveBeenCalledWith(
        '123e4567-e89b-12d3-a456-426614174000',
        expect.objectContaining({
          dateOfBirth: expect.any(Date),
        }),
      );
    });

    it('should throw NotFoundException when user is not found before update', async () => {
      // Arrange
      const updateDto = { firstName: 'Jane' };
      repository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update('123e4567-e89b-12d3-a456-426614174000', updateDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update('123e4567-e89b-12d3-a456-426614174000', updateDto),
      ).rejects.toThrow('User with ID 123e4567-e89b-12d3-a456-426614174000 not found');
    });

    it('should throw BadRequestException when database error occurs during update', async () => {
      // Arrange
      const updateDto = { firstName: 'Jane' };
      repository.findOne.mockResolvedValue(mockUser);
      repository.update.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(
        service.update('123e4567-e89b-12d3-a456-426614174000', updateDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update('123e4567-e89b-12d3-a456-426614174000', updateDto),
      ).rejects.toThrow('An unexpected error occurred while updating user');
    });
  });

  describe('remove', () => {
    it('should soft delete user using softDelete method', async () => {
      // Arrange
      const regularUser = { ...mockUser, role: UserRole.USER } as unknown as User;
      repository.findOne.mockResolvedValue(regularUser);
      repository.softDelete.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });

      // Act
      await service.remove('123e4567-e89b-12d3-a456-426614174000');

      // Assert
      expect(repository.softDelete).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should throw ForbiddenException when trying to delete admin user', async () => {
      // Arrange
      const adminUser = { ...mockUser, role: UserRole.ADMIN } as unknown as User;
      repository.findOne.mockResolvedValue(adminUser);

      // Act & Assert
      await expect(service.remove('123e4567-e89b-12d3-a456-426614174000')).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.remove('123e4567-e89b-12d3-a456-426614174000')).rejects.toThrow(
        'Admin users cannot be deleted',
      );
      expect(repository.softDelete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user does not exist', async () => {
      // Arrange
      repository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('nonexistent-id')).rejects.toThrow(NotFoundException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when database error occurs during remove', async () => {
      // Arrange
      const regularUser = { ...mockUser, role: UserRole.USER } as unknown as User;
      repository.findOne.mockResolvedValue(regularUser);
      repository.softDelete.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.remove('123e4567-e89b-12d3-a456-426614174000')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.remove('123e4567-e89b-12d3-a456-426614174000')).rejects.toThrow(
        'An unexpected error occurred while deleting user',
      );
    });
  });

  describe('activate', () => {
    it('should activate user by setting isActive to true', async () => {
      // Arrange
      const inactiveUser = createMockUser({ isActive: false });
      const activatedUser = createMockUser({ isActive: true });

      repository.findOne.mockResolvedValueOnce(inactiveUser).mockResolvedValueOnce(activatedUser);
      repository.update.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });

      // Act
      const result = await service.activate('123e4567-e89b-12d3-a456-426614174000');

      // Assert
      expect(result.isActive).toBe(true);
      expect(repository.update).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000', {
        isActive: true,
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      // Arrange
      repository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.activate('nonexistent-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when user is not found before activation', async () => {
      // Arrange
      repository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.activate('123e4567-e89b-12d3-a456-426614174000')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.activate('123e4567-e89b-12d3-a456-426614174000')).rejects.toThrow(
        'User with ID 123e4567-e89b-12d3-a456-426614174000 not found',
      );
    });

    it('should throw BadRequestException when database error occurs during activation', async () => {
      // Arrange
      repository.findOne.mockResolvedValue(mockUser);
      repository.update.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.activate('123e4567-e89b-12d3-a456-426614174000')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.activate('123e4567-e89b-12d3-a456-426614174000')).rejects.toThrow(
        'An unexpected error occurred while activating user',
      );
    });
  });
});
