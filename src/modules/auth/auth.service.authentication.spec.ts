import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/entities/user.entity';
import {
  setupAuthTestModule,
  createMockUser,
  createRegisterDto,
  createLoginDto,
} from './helpers/auth.test-helpers';

describe('AuthService - Authentication', () => {
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto = createRegisterDto();

    it('should register new user and return tokens when valid data provided', async () => {
      // Arrange
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser);
      usersService.updateLastLogin.mockResolvedValue(undefined);
      jwtService.signAsync.mockResolvedValue('mock-access-token');

      // Act
      const result = await service.register(registerDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-access-token');
      expect(result.user.email).toBe(mockUser.email);
      expect(result.user.id).toBe(mockUser.id);
      expect(usersService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: registerDto.email,
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
        }),
      );
    });

    it('should throw ConflictException when user email already exists', async () => {
      // Arrange
      usersService.findByEmail.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('should accept email as provided and process registration', async () => {
      // Arrange
      const emailWithUpperCase = createRegisterDto({ email: 'Test@Example.COM' });
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser);
      jwtService.signAsync.mockResolvedValue('mock-token');

      // Act
      await service.register(emailWithUpperCase);

      // Assert
      expect(usersService.findByEmail).toHaveBeenCalledWith(emailWithUpperCase.email);
      expect(usersService.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when registration fails with database error', async () => {
      // Arrange
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(
        'Registration failed. Please try again.',
      );
    });

    it('should preserve ConflictException when user already exists', async () => {
      // Arrange
      usersService.findByEmail.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const loginDto = createLoginDto();

    describe('successful login', () => {
      it('should return tokens and user when valid credentials provided', async () => {
        // Arrange
        mockUser.validatePassword = jest.fn().mockResolvedValue(true);
        usersService.findByEmail.mockResolvedValue(mockUser);
        usersService.updateLastLogin.mockResolvedValue(undefined);
        jwtService.signAsync.mockResolvedValue('mock-access-token');

        // Act
        const result = await service.login(loginDto);

        // Assert
        expect(result).toBeDefined();
        expect(result.accessToken).toBe('mock-access-token');
        expect(result.refreshToken).toBe('mock-access-token');
        expect(result.user.email).toBe(mockUser.email);
        expect(result.user.id).toBe(mockUser.id);
        expect(usersService.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
      });

      it('should update last login timestamp on successful login', async () => {
        // Arrange
        mockUser.validatePassword = jest.fn().mockResolvedValue(true);
        usersService.findByEmail.mockResolvedValue(mockUser);
        usersService.updateLastLogin.mockResolvedValue(undefined);
        jwtService.signAsync.mockResolvedValue('mock-token');

        // Act
        await service.login(loginDto);

        // Assert
        expect(usersService.updateLastLogin).toHaveBeenCalledTimes(1);
        expect(usersService.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
      });
    });

    describe('login errors', () => {
      it('should throw UnauthorizedException when user does not exist', async () => {
        // Arrange
        usersService.findByEmail.mockResolvedValue(null);

        // Act & Assert
        await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
        expect(usersService.updateLastLogin).not.toHaveBeenCalled();
      });

      it('should throw UnauthorizedException when user account is inactive', async () => {
        // Arrange
        const inactiveUser = createMockUser({ isActive: false });
        usersService.findByEmail.mockResolvedValue(inactiveUser);

        // Act & Assert
        await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
        expect(usersService.updateLastLogin).not.toHaveBeenCalled();
      });

      it('should throw UnauthorizedException when password is incorrect', async () => {
        // Arrange
        mockUser.validatePassword = jest.fn().mockResolvedValue(false);
        usersService.findByEmail.mockResolvedValue(mockUser);

        // Act & Assert
        await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
        expect(usersService.updateLastLogin).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when login fails with unexpected error', async () => {
        // Arrange
        usersService.findByEmail.mockRejectedValue(new Error('Unexpected error'));

        // Act & Assert
        await expect(service.login(loginDto)).rejects.toThrow('Login failed. Please try again.');
      });
    });
  });

  describe('validateUser', () => {
    const email = 'test@example.com';
    const password = 'ValidPassword123!';

    it('should return user when credentials are valid', async () => {
      // Arrange
      mockUser.validatePassword = jest.fn().mockResolvedValue(true);
      usersService.findByEmail.mockResolvedValue(mockUser);

      // Act
      const result = await service.validateUser(email, password);

      // Assert
      expect(result).toBe(mockUser);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.id).toBe(mockUser.id);
        expect(result.email).toBe(mockUser.email);
      }
    });

    describe('validation failures', () => {
      it('should return null when user does not exist', async () => {
        // Arrange
        usersService.findByEmail.mockResolvedValue(null);

        // Act
        const result = await service.validateUser('nonexistent@example.com', password);

        // Assert
        expect(result).toBeNull();
      });

      it('should return null when password is incorrect', async () => {
        // Arrange
        mockUser.validatePassword = jest.fn().mockResolvedValue(false);
        usersService.findByEmail.mockResolvedValue(mockUser);

        // Act
        const result = await service.validateUser(email, 'WrongPassword123!');

        // Assert
        expect(result).toBeNull();
      });

      it('should return null when user is inactive', async () => {
        // Arrange
        const inactiveUser = createMockUser({ isActive: false });
        inactiveUser.validatePassword = jest.fn().mockResolvedValue(true);
        usersService.findByEmail.mockResolvedValue(inactiveUser);

        // Act
        const result = await service.validateUser(email, password);

        // Assert
        expect(result).toBeNull();
      });

      it('should return null when validation throws error', async () => {
        // Arrange
        usersService.findByEmail.mockRejectedValue(new Error('Database error'));

        // Act
        const result = await service.validateUser(email, password);

        // Assert
        expect(result).toBeNull();
      });
    });
  });
});
