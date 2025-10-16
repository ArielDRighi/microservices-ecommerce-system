import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/entities/user.entity';
import {
  setupAuthTestModule,
  createMockUser,
  createMockRefreshPayload,
  createMockAccessPayload,
  createRegisterDto,
  createLoginDto,
} from './helpers/auth.test-helpers';

describe('AuthService - Tokens & Security', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let mockUser: User;

  beforeEach(async () => {
    const setup = await setupAuthTestModule();
    service = setup.service;
    usersService = setup.usersService;
    jwtService = setup.jwtService;
    mockUser = createMockUser();
  });

  describe('refreshToken', () => {
    const validRefreshToken = 'valid-refresh-token';
    let mockRefreshPayload: ReturnType<typeof createMockRefreshPayload>;

    beforeEach(() => {
      mockRefreshPayload = createMockRefreshPayload(mockUser.id, mockUser.email);
    });

    describe('successful token refresh', () => {
      it('should return new tokens when valid refresh token provided', async () => {
        // Arrange
        jwtService.verify.mockReturnValue(mockRefreshPayload);
        usersService.findById.mockResolvedValue(mockUser);
        jwtService.signAsync.mockResolvedValue('new-token');

        // Act
        const result = await service.refreshToken({ refreshToken: validRefreshToken });

        // Assert
        expect(result).toBeDefined();
        expect(result.accessToken).toBe('new-token');
        expect(result.refreshToken).toBe('new-token');
        expect(result.tokenType).toBe('Bearer');
        expect(result.user.id).toBe(mockUser.id);
        expect(jwtService.verify).toHaveBeenCalledWith(validRefreshToken, {
          secret: 'test-refresh-secret',
        });
      });

      it('should generate new access and refresh tokens on successful refresh', async () => {
        // Arrange
        jwtService.verify.mockReturnValue(mockRefreshPayload);
        usersService.findById.mockResolvedValue(mockUser);
        jwtService.signAsync
          .mockResolvedValueOnce('new-access-token')
          .mockResolvedValueOnce('new-refresh-token');

        // Act
        const result = await service.refreshToken({ refreshToken: validRefreshToken });

        // Assert
        expect(result.accessToken).toBe('new-access-token');
        expect(result.refreshToken).toBe('new-refresh-token');
        expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
        expect(jwtService.signAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            sub: mockUser.id,
            email: mockUser.email,
            type: 'access',
          }),
          expect.objectContaining({
            secret: 'test-secret',
            expiresIn: '1h',
          }),
        );
      });

      it('should verify refresh token with correct secret', async () => {
        // Arrange
        jwtService.verify.mockReturnValue(mockRefreshPayload);
        usersService.findById.mockResolvedValue(mockUser);
        jwtService.signAsync.mockResolvedValue('new-token');

        // Act
        await service.refreshToken({ refreshToken: validRefreshToken });

        // Assert
        expect(jwtService.verify).toHaveBeenCalledWith(validRefreshToken, {
          secret: 'test-refresh-secret',
        });
      });

      it('should include all user fields in response when token refreshed', async () => {
        // Arrange
        jwtService.verify.mockReturnValue(mockRefreshPayload);
        usersService.findById.mockResolvedValue(mockUser);
        jwtService.signAsync.mockResolvedValue('new-token');

        // Act
        const result = await service.refreshToken({ refreshToken: validRefreshToken });

        // Assert
        expect(result.user).toHaveProperty('id');
        expect(result.user).toHaveProperty('email');
        expect(result.user).toHaveProperty('firstName');
        expect(result.user).toHaveProperty('lastName');
        expect(result.user).toHaveProperty('fullName');
        expect(result.user).toHaveProperty('isActive');
        expect(result.user).toHaveProperty('createdAt');
      });
    });

    describe('refresh token errors', () => {
      it('should throw UnauthorizedException when token type is not refresh', async () => {
        // Arrange
        const accessPayload = createMockAccessPayload(mockUser.id, mockUser.email);
        jwtService.verify.mockReturnValue(accessPayload);

        // Act & Assert
        await expect(service.refreshToken({ refreshToken: validRefreshToken })).rejects.toThrow(
          UnauthorizedException,
        );
        await expect(service.refreshToken({ refreshToken: validRefreshToken })).rejects.toThrow(
          'Invalid token type',
        );
        expect(usersService.findById).not.toHaveBeenCalled();
      });

      it('should throw UnauthorizedException when user not found', async () => {
        // Arrange
        jwtService.verify.mockReturnValue(mockRefreshPayload);
        usersService.findById.mockResolvedValue(null);

        // Act & Assert
        await expect(service.refreshToken({ refreshToken: validRefreshToken })).rejects.toThrow(
          UnauthorizedException,
        );
        await expect(service.refreshToken({ refreshToken: validRefreshToken })).rejects.toThrow(
          'User not found',
        );
      });

      it('should throw UnauthorizedException when user account is disabled', async () => {
        // Arrange
        const inactiveUser = createMockUser({ isActive: false });
        jwtService.verify.mockReturnValue(mockRefreshPayload);
        usersService.findById.mockResolvedValue(inactiveUser);

        // Act & Assert
        await expect(service.refreshToken({ refreshToken: validRefreshToken })).rejects.toThrow(
          UnauthorizedException,
        );
        await expect(service.refreshToken({ refreshToken: validRefreshToken })).rejects.toThrow(
          'Account is disabled',
        );
      });

      it('should throw UnauthorizedException when token is expired', async () => {
        // Arrange
        jwtService.verify.mockImplementation(() => {
          throw new Error('TokenExpiredError');
        });

        // Act & Assert
        await expect(service.refreshToken({ refreshToken: validRefreshToken })).rejects.toThrow(
          UnauthorizedException,
        );
        await expect(service.refreshToken({ refreshToken: validRefreshToken })).rejects.toThrow(
          'Invalid or expired refresh token',
        );
      });

      it('should throw UnauthorizedException when token is invalid', async () => {
        // Arrange
        jwtService.verify.mockImplementation(() => {
          throw new Error('JsonWebTokenError');
        });

        // Act & Assert
        await expect(service.refreshToken({ refreshToken: 'invalid-token' })).rejects.toThrow(
          UnauthorizedException,
        );
      });
    });
  });

  describe('Token Generation and Sanitization', () => {
    describe('token generation', () => {
      it('should generate tokens with correct expiration time', async () => {
        // Arrange
        const registerDto = createRegisterDto({ email: 'new@example.com' });
        usersService.findByEmail.mockResolvedValue(null);
        usersService.create.mockResolvedValue(mockUser);
        jwtService.signAsync.mockResolvedValue('token');

        // Act
        const result = await service.register(registerDto);

        // Assert
        expect(result.expiresIn).toBe(3600); // 1 hour in seconds
        expect(result.tokenType).toBe('Bearer');
      });
    });

    describe('user data sanitization', () => {
      it('should sanitize user data and not include sensitive information', async () => {
        // Arrange
        const loginDto = createLoginDto();
        mockUser.validatePassword = jest.fn().mockResolvedValue(true);
        usersService.findByEmail.mockResolvedValue(mockUser);
        jwtService.signAsync.mockResolvedValue('token');

        // Act
        const result = await service.login(loginDto);

        // Assert
        expect(result.user).not.toHaveProperty('passwordHash');
        expect(result.user).not.toHaveProperty('orders');
        expect(result.user).not.toHaveProperty('validatePassword');
        expect(result.user).toHaveProperty('fullName');
      });

      it('should handle null emailVerifiedAt when sanitizing user', async () => {
        // Arrange
        const loginDto = createLoginDto();
        const userWithNullFields = createMockUser({
          emailVerifiedAt: undefined,
        });
        userWithNullFields.validatePassword = jest.fn().mockResolvedValue(true);

        usersService.findByEmail.mockResolvedValue(userWithNullFields);
        usersService.updateLastLogin.mockResolvedValue(undefined);
        jwtService.signAsync.mockResolvedValue('token');

        // Act
        const result = await service.login(loginDto);

        // Assert
        expect(result.user.emailVerifiedAt).toBeNull();
        expect(result.user).toHaveProperty('createdAt');
      });
    });
  });
});
