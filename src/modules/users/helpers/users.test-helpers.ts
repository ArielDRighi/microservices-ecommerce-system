import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users.service';
import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dto';

/**
 * Factory to create a mock User entity for testing
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
      return this.emailVerifiedAt !== null && this.emailVerifiedAt !== undefined;
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

  return { ...defaultUser, ...overrides } as User;
};

/**
 * Factory to create a CreateUserDto for testing
 */
export const createMockCreateUserDto = (overrides: Partial<CreateUserDto> = {}): CreateUserDto => ({
  email: 'test@example.com',
  passwordHash: 'StrongPassword123!',
  firstName: 'John',
  lastName: 'Doe',
  ...overrides,
});

/**
 * Factory to create a mock Repository for User entity
 */
export const createMockUserRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
});

/**
 * Factory to create a mock QueryBuilder for testing findAll queries
 */
export const createMockQueryBuilder = (users: User[] = [], count: number = 0) => ({
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getCount: jest.fn().mockResolvedValue(count),
  getMany: jest.fn().mockResolvedValue(users),
});

/**
 * Setup function to create UsersService test module with all dependencies
 */
export const setupUsersTestModule = async () => {
  const mockRepository = createMockUserRepository();

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      UsersService,
      {
        provide: getRepositoryToken(User),
        useValue: mockRepository,
      },
    ],
  }).compile();

  const service = module.get<UsersService>(UsersService);
  const repository = module.get(getRepositoryToken(User)) as jest.Mocked<Repository<User>>;

  return {
    service,
    repository,
    module,
  };
};
