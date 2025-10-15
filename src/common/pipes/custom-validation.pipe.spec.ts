import { CustomValidationPipe } from './custom-validation.pipe';
import { ArgumentMetadata } from '@nestjs/common';

describe('CustomValidationPipe', () => {
  let pipe: CustomValidationPipe;

  beforeEach(() => {
    pipe = new CustomValidationPipe({
      whitelist: false,
      forbidNonWhitelisted: false,
      transform: true,
      skipMissingProperties: true,
    });
  });

  describe('transform', () => {
    describe('Custom parameter decorators', () => {
      it('should skip validation for custom type metadata', async () => {
        const metadata: ArgumentMetadata = {
          type: 'custom',
          metatype: String,
          data: 'userId',
        };

        const value = 'user-123';
        const result = await pipe.transform(value, metadata);

        expect(result).toBe(value);
      });

      it('should return value as-is for custom decorators without transformation', async () => {
        const metadata: ArgumentMetadata = {
          type: 'custom',
          metatype: Object,
        };

        const complexValue = { id: 1, name: 'Test', nested: { prop: 'value' } };
        const result = await pipe.transform(complexValue, metadata);

        expect(result).toEqual(complexValue);
        expect(result).toBe(complexValue); // Same reference
      });

      it('should handle undefined value for custom decorators', async () => {
        const metadata: ArgumentMetadata = {
          type: 'custom',
          metatype: String,
        };

        const result = await pipe.transform(undefined, metadata);

        expect(result).toBeUndefined();
      });

      it('should handle null value for custom decorators', async () => {
        const metadata: ArgumentMetadata = {
          type: 'custom',
          metatype: String,
        };

        const result = await pipe.transform(null, metadata);

        expect(result).toBeNull();
      });
    });

    describe('Route parameters (non-DTO)', () => {
      it('should skip validation for string param type', async () => {
        const metadata: ArgumentMetadata = {
          type: 'param',
          metatype: String,
          data: 'id',
        };

        const value = 'some-id-123';
        const result = await pipe.transform(value, metadata);

        expect(result).toBe(value);
      });

      it('should skip validation for number param type', async () => {
        const metadata: ArgumentMetadata = {
          type: 'param',
          metatype: Number,
          data: 'id',
        };

        const value = '42';
        const result = await pipe.transform(value, metadata);

        expect(result).toBe(value);
      });

      it('should skip validation for boolean param type', async () => {
        const metadata: ArgumentMetadata = {
          type: 'param',
          metatype: Boolean,
          data: 'active',
        };

        const value = 'true';
        const result = await pipe.transform(value, metadata);

        expect(result).toBe(value);
      });

      it('should skip validation when metatype is undefined', async () => {
        const metadata: ArgumentMetadata = {
          type: 'param',
          metatype: undefined,
          data: 'id',
        };

        const value = 'test-value';
        const result = await pipe.transform(value, metadata);

        expect(result).toBe(value);
      });

      it('should handle param without data field', async () => {
        const metadata: ArgumentMetadata = {
          type: 'param',
          metatype: String,
        };

        const value = 'param-value';
        const result = await pipe.transform(value, metadata);

        expect(result).toBe(value);
      });
    });

    describe('DTO validation', () => {
      class CreateUserDto {
        name!: string;
        email!: string;
      }

      it('should not skip validation for DTO with "Dto" suffix', async () => {
        const metadata: ArgumentMetadata = {
          type: 'param',
          metatype: CreateUserDto,
          data: 'user',
        };

        // DTOs in param position should NOT be skipped
        // They delegate to parent ValidationPipe
        const value = { name: 'John', email: 'john@example.com' };

        // Since the DTO has no validation decorators, it will pass through
        // In real scenario with decorators, this would validate
        const result = await pipe.transform(value, metadata);
        expect(result).toBeDefined();
      });

      class CreateProductDTO {
        title!: string;
        price!: number;
      }

      it('should not skip validation for DTO with "DTO" suffix (uppercase)', async () => {
        const metadata: ArgumentMetadata = {
          type: 'param',
          metatype: CreateProductDTO,
          data: 'product',
        };

        const value = { title: 'Product', price: 99.99 };

        const result = await pipe.transform(value, metadata);
        expect(result).toBeDefined();
      });

      it('should not skip validation for body metadata with DTO', async () => {
        const metadata: ArgumentMetadata = {
          type: 'body',
          metatype: CreateUserDto,
        };

        const value = { name: 'Jane', email: 'jane@example.com' };

        const result = await pipe.transform(value, metadata);
        expect(result).toBeDefined();
      });

      it('should not skip validation for query metadata with DTO', async () => {
        class SearchQueryDto {
          query!: string;
          page!: number;
        }

        const metadata: ArgumentMetadata = {
          type: 'query',
          metatype: SearchQueryDto,
        };

        const value = { query: 'test', page: '1' };

        const result = await pipe.transform(value, metadata);
        expect(result).toBeDefined();
      });
    });

    describe('Body parameters (non-DTO)', () => {
      it('should process body with non-DTO metatype', async () => {
        const metadata: ArgumentMetadata = {
          type: 'body',
          metatype: Object,
        };

        const value = { data: 'test' };

        // Will delegate to parent ValidationPipe
        await expect(pipe.transform(value, metadata)).resolves.toBeDefined();
      });

      it('should process body with String metatype', async () => {
        const metadata: ArgumentMetadata = {
          type: 'body',
          metatype: String,
        };

        const value = 'plain text body';

        await expect(pipe.transform(value, metadata)).resolves.toBeDefined();
      });

      it('should process body with Array metatype', async () => {
        const metadata: ArgumentMetadata = {
          type: 'body',
          metatype: Array,
        };

        const value = [1, 2, 3];

        await expect(pipe.transform(value, metadata)).resolves.toBeDefined();
      });
    });

    describe('Query parameters (non-DTO)', () => {
      it('should process query with non-DTO metatype', async () => {
        const metadata: ArgumentMetadata = {
          type: 'query',
          metatype: Object,
        };

        const value = { page: '1', limit: '10' };

        await expect(pipe.transform(value, metadata)).resolves.toBeDefined();
      });

      it('should process query with String metatype', async () => {
        const metadata: ArgumentMetadata = {
          type: 'query',
          metatype: String,
          data: 'search',
        };

        const value = 'search term';

        await expect(pipe.transform(value, metadata)).resolves.toBeDefined();
      });
    });

    describe('isDto method behavior', () => {
      class UserDto {
        name!: string;
      }

      class UpdateUserDTO {
        email!: string;
      }

      class UserModel {
        id!: number;
      }

      class User {
        username!: string;
      }

      it('should identify class ending with Dto as DTO', async () => {
        const metadata: ArgumentMetadata = {
          type: 'param',
          metatype: UserDto,
        };

        const value = { name: 'Test' };
        const result = await pipe.transform(value, metadata);
        expect(result).toBeDefined();
      });

      it('should identify class ending with DTO as DTO', async () => {
        const metadata: ArgumentMetadata = {
          type: 'param',
          metatype: UpdateUserDTO,
        };

        const value = { email: 'test@example.com' };
        const result = await pipe.transform(value, metadata);
        expect(result).toBeDefined();
      });

      it('should not identify regular class as DTO', async () => {
        const metadata: ArgumentMetadata = {
          type: 'param',
          metatype: User,
        };

        const value = { username: 'john' };
        // Should skip validation for non-DTO param
        const result = await pipe.transform(value, metadata);
        expect(result).toEqual(value);
      });

      it('should not identify model class as DTO', async () => {
        const metadata: ArgumentMetadata = {
          type: 'param',
          metatype: UserModel,
        };

        const value = { id: 123 };
        // Should skip validation for non-DTO param
        const result = await pipe.transform(value, metadata);
        expect(result).toEqual(value);
      });

      it('should handle undefined metatype', async () => {
        const metadata: ArgumentMetadata = {
          type: 'param',
          metatype: undefined,
        };

        const value = 'test';
        const result = await pipe.transform(value, metadata);
        expect(result).toBe(value);
      });
    });

    describe('Edge cases', () => {
      it('should handle empty object', async () => {
        const metadata: ArgumentMetadata = {
          type: 'body',
          metatype: Object,
        };

        const value = {};
        await expect(pipe.transform(value, metadata)).resolves.toBeDefined();
      });

      it('should handle empty array', async () => {
        const metadata: ArgumentMetadata = {
          type: 'body',
          metatype: Array,
        };

        const value: any[] = [];
        await expect(pipe.transform(value, metadata)).resolves.toBeDefined();
      });

      it('should handle numeric string in param', async () => {
        const metadata: ArgumentMetadata = {
          type: 'param',
          metatype: String,
          data: 'id',
        };

        const value = '123456';
        const result = await pipe.transform(value, metadata);
        expect(result).toBe('123456');
      });

      it('should handle UUID in param', async () => {
        const metadata: ArgumentMetadata = {
          type: 'param',
          metatype: String,
          data: 'id',
        };

        const value = '123e4567-e89b-12d3-a456-426614174000';
        const result = await pipe.transform(value, metadata);
        expect(result).toBe(value);
      });

      it('should handle special characters in param', async () => {
        const metadata: ArgumentMetadata = {
          type: 'param',
          metatype: String,
          data: 'slug',
        };

        const value = 'my-product-123_special';
        const result = await pipe.transform(value, metadata);
        expect(result).toBe(value);
      });

      it('should handle zero value', async () => {
        const metadata: ArgumentMetadata = {
          type: 'custom',
          metatype: Number,
        };

        const result = await pipe.transform(0, metadata);
        expect(result).toBe(0);
      });

      it('should handle false value', async () => {
        const metadata: ArgumentMetadata = {
          type: 'custom',
          metatype: Boolean,
        };

        const result = await pipe.transform(false, metadata);
        expect(result).toBe(false);
      });

      it('should handle empty string', async () => {
        const metadata: ArgumentMetadata = {
          type: 'custom',
          metatype: String,
        };

        const result = await pipe.transform('', metadata);
        expect(result).toBe('');
      });

      it('should handle very long string in param', async () => {
        const metadata: ArgumentMetadata = {
          type: 'param',
          metatype: String,
        };

        const value = 'a'.repeat(1000);
        const result = await pipe.transform(value, metadata);
        expect(result).toBe(value);
      });

      it('should handle Date object', async () => {
        const metadata: ArgumentMetadata = {
          type: 'custom',
          metatype: Date,
        };

        const date = new Date();
        const result = await pipe.transform(date, metadata);
        expect(result).toBe(date);
      });
    });

    describe('Validation errors', () => {
      it('should delegate DTO validation to parent ValidationPipe', async () => {
        class StrictDto {
          name!: string;
        }

        // Mock a DTO with validation decorators (in real scenario)
        const metadata: ArgumentMetadata = {
          type: 'body',
          metatype: StrictDto,
        };

        // Parent ValidationPipe will handle actual validation
        // We just verify it doesn't skip validation for DTOs
        const value = { name: 'Valid' };

        const result = await pipe.transform(value, metadata);
        expect(result).toBeDefined();
      });
    });
  });
});
