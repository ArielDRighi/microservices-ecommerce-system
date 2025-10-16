import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, RefreshTokenDto } from './dto';
import {
  createMockUser,
  createMockAuthResponse,
  createMockAuthService,
} from './helpers/auth.test-helpers';

describe('AuthController - Authentication', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  const mockUser = createMockUser();
  const mockAuthResponse = createMockAuthResponse(mockUser);

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
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      password: 'StrongPassword123!',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should register new user and return auth response when valid data provided', async () => {
      // Arrange
      authService.register.mockResolvedValue(mockAuthResponse);

      // Act
      const result = await controller.register(registerDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBe(mockAuthResponse.accessToken);
      expect(result.refreshToken).toBe(mockAuthResponse.refreshToken);
      expect(result.user.email).toBe(registerDto.email);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(authService.register).toHaveBeenCalledTimes(1);
    });

    it('should call authService.register with correct parameters when registration attempted', async () => {
      // Arrange
      authService.register.mockResolvedValue(mockAuthResponse);

      // Act
      await controller.register(registerDto);

      // Assert
      expect(authService.register).toHaveBeenCalledWith(
        expect.objectContaining({
          email: registerDto.email,
          password: registerDto.password,
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
        }),
      );
    });

    it('should propagate errors when authService.register throws exception', async () => {
      // Arrange
      const error = new Error('Registration failed');
      authService.register.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.register(registerDto)).rejects.toThrow('Registration failed');
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'StrongPassword123!',
    };

    it('should login user and return auth response when valid credentials provided', async () => {
      // Arrange
      authService.login.mockResolvedValue(mockAuthResponse);

      // Act
      const result = await controller.login(loginDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBe(mockAuthResponse.accessToken);
      expect(result.refreshToken).toBe(mockAuthResponse.refreshToken);
      expect(result.user.email).toBe(mockUser.email);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(authService.login).toHaveBeenCalledTimes(1);
    });

    it('should call authService.login with correct parameters when login attempted', async () => {
      // Arrange
      authService.login.mockResolvedValue(mockAuthResponse);

      // Act
      await controller.login(loginDto);

      // Assert
      expect(authService.login).toHaveBeenCalledWith(
        expect.objectContaining({
          email: loginDto.email,
          password: loginDto.password,
        }),
      );
    });

    it('should propagate errors when authService.login throws exception', async () => {
      // Arrange
      const error = new Error('Invalid credentials');
      authService.login.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.login(loginDto)).rejects.toThrow('Invalid credentials');
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('refreshToken', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refreshToken: 'valid-refresh-token',
    };

    it('should return new tokens when valid refresh token provided', async () => {
      // Arrange
      authService.refreshToken.mockResolvedValue(mockAuthResponse);

      // Act
      const result = await controller.refreshToken(refreshTokenDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBe(mockAuthResponse.accessToken);
      expect(result.refreshToken).toBe(mockAuthResponse.refreshToken);
      expect(authService.refreshToken).toHaveBeenCalledWith(refreshTokenDto);
      expect(authService.refreshToken).toHaveBeenCalledTimes(1);
    });

    it('should call authService.refreshToken with correct parameters when refresh attempted', async () => {
      // Arrange
      authService.refreshToken.mockResolvedValue(mockAuthResponse);

      // Act
      await controller.refreshToken(refreshTokenDto);

      // Assert
      expect(authService.refreshToken).toHaveBeenCalledWith(
        expect.objectContaining({
          refreshToken: refreshTokenDto.refreshToken,
        }),
      );
    });

    it('should propagate errors when authService.refreshToken throws exception', async () => {
      // Arrange
      const error = new Error('Invalid refresh token');
      authService.refreshToken.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.refreshToken(refreshTokenDto)).rejects.toThrow(
        'Invalid refresh token',
      );
      expect(authService.refreshToken).toHaveBeenCalledWith(refreshTokenDto);
    });
  });
});
