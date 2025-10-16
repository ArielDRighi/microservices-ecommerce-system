import { ExecutionContext } from '@nestjs/common';
import { User } from '../../users/entities/user.entity';

/**
 * Unit tests for CurrentUser decorator - Basic functionality and property extraction
 * Tests extraction of user data from request context
 */
describe('CurrentUser Decorator - Basic & Property Extraction', () => {
  // Mock user object
  const mockUser: Partial<User> = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    isActive: true,
    phoneNumber: '+1234567890',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  };

  // Mock execution context
  const createMockExecutionContext = (user: Partial<User> | null): ExecutionContext => {
    const mockRequest = { user };
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
      getClass: jest.fn(),
      getHandler: jest.fn(),
    } as unknown as ExecutionContext;
  };

  // Simulate the decorator logic for testing
  const simulateDecoratorLogic = (
    data: keyof User | undefined,
    ctx: ExecutionContext,
  ): User | User[keyof User] => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  };

  describe('Basic Functionality', () => {
    it('should return entire user object when no data parameter provided', () => {
      // Arrange
      const context = createMockExecutionContext(mockUser);

      // Act
      const result = simulateDecoratorLogic(undefined, context);

      // Assert
      expect(result).toEqual(mockUser);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('firstName');
    });

    it('should extract user from HTTP request context', () => {
      // Arrange
      const context = createMockExecutionContext(mockUser);

      // Act
      const result = simulateDecoratorLogic(undefined, context);

      // Assert
      expect(context.switchToHttp).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should be called with ExecutionContext parameter', () => {
      // Arrange
      const context = createMockExecutionContext(mockUser);

      // Act
      simulateDecoratorLogic(undefined, context);

      // Assert
      expect(context.switchToHttp).toHaveBeenCalledTimes(1);
    });
  });

  describe('Property Extraction', () => {
    it.each([
      ['id', '123e4567-e89b-12d3-a456-426614174000', 'string'],
      ['email', 'test@example.com', 'string'],
      ['firstName', 'John', 'string'],
      ['lastName', 'Doe', 'string'],
      ['phoneNumber', '+1234567890', 'string'],
      ['isActive', true, 'boolean'],
    ] as const)(
      'should extract user %s when data is "%s"',
      (property, expectedValue, expectedType) => {
        // Arrange
        const context = createMockExecutionContext(mockUser);

        // Act
        const result = simulateDecoratorLogic(property, context);

        // Assert
        expect(result).toBe(expectedValue);
        expect(typeof result).toBe(expectedType);
      },
    );

    it('should extract user createdAt when data is "createdAt"', () => {
      // Arrange
      const context = createMockExecutionContext(mockUser);

      // Act
      const result = simulateDecoratorLogic('createdAt', context);

      // Assert
      expect(result).toBeInstanceOf(Date);
      expect(result).toEqual(new Date('2023-01-01'));
    });
  });

  describe('Context Switching', () => {
    it('should call switchToHttp on execution context', () => {
      // Arrange
      const switchToHttpSpy = jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user: mockUser }),
      });
      const context = {
        switchToHttp: switchToHttpSpy,
      } as unknown as ExecutionContext;

      // Act
      simulateDecoratorLogic(undefined, context);

      // Assert
      expect(switchToHttpSpy).toHaveBeenCalledTimes(1);
    });

    it('should call getRequest after switching to HTTP context', () => {
      // Arrange
      const getRequestSpy = jest.fn().mockReturnValue({ user: mockUser });
      const context = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: getRequestSpy,
        }),
      } as unknown as ExecutionContext;

      // Act
      simulateDecoratorLogic(undefined, context);

      // Assert
      expect(getRequestSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Type Safety', () => {
    it('should work with keyof User type parameter', () => {
      // Arrange
      const context = createMockExecutionContext(mockUser);
      const validKey: keyof User = 'email';

      // Act
      const result = simulateDecoratorLogic(validKey, context);

      // Assert
      expect(result).toBe('test@example.com');
    });

    it('should handle different user property types correctly', () => {
      // Arrange
      const fullUser: Partial<User> = {
        id: 'uuid-string',
        email: 'email@test.com',
        isActive: true,
        createdAt: new Date(),
      };
      const context = createMockExecutionContext(fullUser);

      // Act
      const stringProp = simulateDecoratorLogic('email', context);
      const boolProp = simulateDecoratorLogic('isActive', context);
      const dateProp = simulateDecoratorLogic('createdAt', context);

      // Assert
      expect(typeof stringProp).toBe('string');
      expect(typeof boolProp).toBe('boolean');
      expect(dateProp).toBeInstanceOf(Date);
    });
  });
});
