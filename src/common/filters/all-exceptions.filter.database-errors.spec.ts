import { AllExceptionsFilter } from './all-exceptions.filter';
import { HttpStatus } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import {
  createMockResponse,
  createMockRequest,
  createMockHost,
  createMockLogger,
  MockResponse,
  MockRequest,
} from './helpers/all-exceptions-filter.test-helpers';

describe('AllExceptionsFilter - Database Error Handling', () => {
  let filter: AllExceptionsFilter;
  let mockResponse: MockResponse;
  let mockRequest: MockRequest;

  beforeEach(() => {
    const mockLogger = createMockLogger();
    filter = new AllExceptionsFilter(mockLogger);
    mockResponse = createMockResponse();
    mockRequest = createMockRequest();
  });

  describe('Unique constraint violations', () => {
    it('should handle unique constraint violations', () => {
      const dbError = new QueryFailedError(
        'INSERT INTO users...',
        [],
        new Error('duplicate key value violates unique constraint "users_email_key"'),
      );
      const mockHost = createMockHost(mockResponse, mockRequest);

      filter.catch(dbError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Resource already exists',
          error: 'BAD_REQUEST',
        }),
      );
    });
  });

  describe('Foreign key constraint violations', () => {
    it('should handle foreign key constraint violations', () => {
      const dbError = new QueryFailedError(
        'INSERT INTO orders...',
        [],
        new Error('violates foreign key constraint "orders_user_id_fkey"'),
      );
      const mockHost = createMockHost(mockResponse, mockRequest);

      filter.catch(dbError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Referenced resource does not exist',
          error: 'BAD_REQUEST',
        }),
      );
    });
  });

  describe('Not null constraint violations', () => {
    it('should handle not null constraint violations', () => {
      const dbError = new QueryFailedError(
        'INSERT INTO products...',
        [],
        new Error('violates not-null constraint "products_name"'),
      );
      const mockHost = createMockHost(mockResponse, mockRequest);

      filter.catch(dbError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Required field is missing',
          error: 'BAD_REQUEST',
        }),
      );
    });
  });

  describe('Check constraint violations', () => {
    it('should handle check constraint violations', () => {
      const dbError = new QueryFailedError(
        'INSERT INTO products...',
        [],
        new Error('violates check constraint "products_price_positive"'),
      );
      const mockHost = createMockHost(mockResponse, mockRequest);

      filter.catch(dbError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Invalid data provided',
          error: 'BAD_REQUEST',
        }),
      );
    });
  });

  describe('Generic database errors', () => {
    it('should handle generic database errors', () => {
      const dbError = new QueryFailedError(
        'SELECT * FROM...',
        [],
        new Error('Some generic database error'),
      );
      const mockHost = createMockHost(mockResponse, mockRequest);

      filter.catch(dbError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Database operation failed',
          error: 'BAD_REQUEST',
        }),
      );
    });
  });
});
