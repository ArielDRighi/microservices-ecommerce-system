import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { UsersService } from '../../users/users.service';
import { User } from '../../users/entities/user.entity';
import { RegisterDto, LoginDto } from '../dto';

/**
 * Factory to create a mock User entity
 */
export const createMockUser = (overrides: Partial<User> = {}): User => {
  const defaultUser: User = {
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
    validatePassword: jest.fn().mockResolvedValue(true),
    markEmailAsVerified: jest.fn(),
    updateLastLogin: jest.fn(),
    deactivate: jest.fn(),
    activate: jest.fn(),
  };

  return { ...defaultUser, ...overrides } as User;
};

/**
 * Factory to create a RegisterDto
 */
export const createRegisterDto = (overrides: Partial<RegisterDto> = {}): RegisterDto => ({
  email: 'test@example.com',
  password: 'StrongPassword123!',
  firstName: 'John',
  lastName: 'Doe',
  ...overrides,
});

/**
 * Factory to create a LoginDto
 */
export const createLoginDto = (overrides: Partial<LoginDto> = {}): LoginDto => ({
  email: 'test@example.com',
  password: 'StrongPassword123!',
  ...overrides,
});

/**
 * Factory to create mock UsersService
 */
export const createMockUsersService = () => ({
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  updateLastLogin: jest.fn(),
});

/**
 * Factory to create mock JwtService
 */
export const createMockJwtService = () => ({
  signAsync: jest.fn(),
  verify: jest.fn(),
});

/**
 * Factory to create mock ConfigService with JWT configuration
 */
export const createMockConfigService = () => {
  const mockConfigService = {
    get: jest.fn(),
  };

  mockConfigService.get.mockImplementation((key: string) => {
    const config: Record<string, string> = {
      JWT_SECRET: 'test-secret',
      JWT_EXPIRES_IN: '1h',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_REFRESH_EXPIRES_IN: '7d',
    };
    return config[key];
  });

  return mockConfigService;
};

/**
 * Setup function to create AuthService test module with all dependencies
 */
export const setupAuthTestModule = async () => {
  const mockUsersService = createMockUsersService();
  const mockJwtService = createMockJwtService();
  const mockConfigService = createMockConfigService();

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

  const service = module.get<AuthService>(AuthService);
  const usersService = module.get(UsersService) as jest.Mocked<UsersService>;
  const jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
  const configService = module.get(ConfigService) as jest.Mocked<ConfigService>;

  return {
    service,
    usersService,
    jwtService,
    configService,
    module,
  };
};

/**
 * Create a mock JWT payload for refresh tokens
 */
export const createMockRefreshPayload = (
  userId: string,
  email: string,
  overrides: Record<string, unknown> = {},
) => ({
  sub: userId,
  email: email,
  firstName: 'John',
  lastName: 'Doe',
  type: 'refresh' as const,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 604800, // 7 days
  ...overrides,
});

/**
 * Create a mock JWT payload for access tokens
 */
export const createMockAccessPayload = (
  userId: string,
  email: string,
  overrides: Record<string, unknown> = {},
) => ({
  sub: userId,
  email: email,
  firstName: 'John',
  lastName: 'Doe',
  type: 'access' as const,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  ...overrides,
});
