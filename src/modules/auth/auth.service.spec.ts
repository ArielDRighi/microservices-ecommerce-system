import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { RegisterDto, LoginDto } from './dto';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    passwordHash: '$2b$10$hashedpassword',
    isActive: true,
    phoneNumber: '+1234567890',
    dateOfBirth: new Date('1990-01-01'),
    language: 'en',
    timezone: 'UTC',
    emailVerifiedAt: undefined,
    lastLoginAt: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    orders: Promise.resolve([]),
    get fullName() {
      return `${this.firstName} ${this.lastName}`;
    },
    get isEmailVerified() {
      return this.emailVerifiedAt !== null;
    },
    hashPassword: jest.fn(),
    normalizeEmail: jest.fn(),
    normalizeName: jest.fn(),
    validatePassword: jest.fn(),
    markEmailAsVerified: jest.fn(),
    updateLastLogin: jest.fn(),
    deactivate: jest.fn(),
    activate: jest.fn(),
  };

  beforeEach(async () => {
    const mockUsersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateLastLogin: jest.fn(),
    };

    const mockJwtService = {
      signAsync: jest.fn(),
      verify: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);

    // Setup default config values
    configService.get.mockImplementation((key: string) => {
      const config: Record<string, string> = {
        JWT_SECRET: 'test-secret',
        JWT_EXPIRES_IN: '1h',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return config[key];
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      password: 'StrongPassword123!',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should register a new user successfully', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(mockUser);
      usersService.updateLastLogin.mockResolvedValue(undefined);
      jwtService.signAsync.mockResolvedValue('mock-token');

      const result = await service.register(registerDto);

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
      expect(result.user.email).toBe(mockUser.email);
      expect(usersService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(usersService.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if user already exists', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'StrongPassword123!',
    };

    it('should login user successfully', async () => {
      mockUser.validatePassword = jest.fn().mockResolvedValue(true);
      usersService.findByEmail.mockResolvedValue(mockUser);
      usersService.updateLastLogin.mockResolvedValue(undefined);
      jwtService.signAsync.mockResolvedValue('mock-token');

      const result = await service.login(loginDto);

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock-token');
      expect(result.user.email).toBe(mockUser.email);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      usersService.findByEmail.mockResolvedValue(inactiveUser as User);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockUser.validatePassword = jest.fn().mockResolvedValue(false);
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    it('should return user for valid credentials', async () => {
      mockUser.validatePassword = jest.fn().mockResolvedValue(true);
      usersService.findByEmail.mockResolvedValue(mockUser);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toBe(mockUser);
    });

    it('should return null for invalid credentials', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toBeNull();
    });
  });
});
