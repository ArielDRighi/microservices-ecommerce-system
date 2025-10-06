import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { createMockUser, createMockAuthService } from './helpers/auth.test-helpers';

describe('AuthController - User Operations', () => {
  let controller: AuthController;
  const mockUser = createMockUser({
    emailVerifiedAt: new Date(),
    lastLoginAt: new Date(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: createMockAuthService(),
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('getProfile', () => {
    it('should return user profile when authenticated user requests profile', async () => {
      // Act
      const result = await controller.getProfile(mockUser);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
      expect(result.firstName).toBe(mockUser.firstName);
      expect(result.lastName).toBe(mockUser.lastName);
      expect(result.fullName).toBe(mockUser.fullName);
      expect(result.phoneNumber).toBe(mockUser.phoneNumber);
      expect(result.dateOfBirth).toBe(mockUser.dateOfBirth);
      expect(result.language).toBe(mockUser.language);
      expect(result.timezone).toBe(mockUser.timezone);
      expect(result.isActive).toBe(mockUser.isActive);
    });

    it('should include all user fields when profile requested', async () => {
      // Act
      const result = await controller.getProfile(mockUser);

      // Assert
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('firstName');
      expect(result).toHaveProperty('lastName');
      expect(result).toHaveProperty('fullName');
      expect(result).toHaveProperty('phoneNumber');
      expect(result).toHaveProperty('dateOfBirth');
      expect(result).toHaveProperty('language');
      expect(result).toHaveProperty('timezone');
      expect(result).toHaveProperty('isActive');
      expect(result).toHaveProperty('emailVerifiedAt');
      expect(result).toHaveProperty('lastLoginAt');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });

    it('should not expose sensitive data when profile requested', async () => {
      // Act
      const result = await controller.getProfile(mockUser);

      // Assert
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('orders');
    });
  });

  describe('logout', () => {
    it('should return success message when authenticated user logs out', async () => {
      // Act
      const result = await controller.logout(mockUser);

      // Assert
      expect(result).toBeDefined();
      expect(result.message).toBe('Successfully logged out. Please discard your tokens.');
      expect(result.success).toBe(true);
    });

    it('should always return success message regardless of user state when logout called', async () => {
      // Arrange
      const inactiveUser = createMockUser({ isActive: false });

      // Act
      const result = await controller.logout(inactiveUser as User);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully logged out');
    });
  });

  describe('getCurrentUser', () => {
    it('should return minimal user information when authenticated user requests it', async () => {
      // Act
      const result = await controller.getCurrentUser(mockUser);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
      expect(result.firstName).toBe(mockUser.firstName);
      expect(result.lastName).toBe(mockUser.lastName);
      expect(result.fullName).toBe(mockUser.fullName);
      expect(result.isActive).toBe(mockUser.isActive);
    });

    it('should return only essential fields when current user requested', async () => {
      // Act
      const result = await controller.getCurrentUser(mockUser);

      // Assert
      expect(Object.keys(result)).toHaveLength(6);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('firstName');
      expect(result).toHaveProperty('lastName');
      expect(result).toHaveProperty('fullName');
      expect(result).toHaveProperty('isActive');
      expect(result).not.toHaveProperty('phoneNumber');
      expect(result).not.toHaveProperty('dateOfBirth');
      expect(result).not.toHaveProperty('passwordHash');
    });
  });
});
