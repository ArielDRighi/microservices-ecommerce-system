import { AllExceptionsFilter } from './all-exceptions.filter';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

interface MockResponse {
  status: jest.Mock;
  json: jest.Mock;
}

interface MockRequest {
  url: string;
  method: string;
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockResponse: MockResponse;
  let mockRequest: MockRequest;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new AllExceptionsFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/test',
      method: 'GET',
    };

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  describe('HttpException handling', () => {
    it('should handle HttpException properly', () => {
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Test error',
          error: 'BAD_REQUEST',
          path: '/test',
          method: 'GET',
        }),
      );
    });

    it('should handle HttpException with array message', () => {
      const exception = new HttpException(
        { message: ['Error 1', 'Error 2'] },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          message: ['Error 1', 'Error 2'],
          error: 'UNPROCESSABLE_ENTITY',
        }),
      );
    });
  });

  describe('Database error handling', () => {
    it('should handle unique constraint violations', () => {
      const dbError = new QueryFailedError(
        'INSERT INTO users...',
        [],
        new Error('duplicate key value violates unique constraint "users_email_key"'),
      );

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

    it('should handle foreign key constraint violations', () => {
      const dbError = new QueryFailedError(
        'INSERT INTO orders...',
        [],
        new Error('violates foreign key constraint "orders_user_id_fkey"'),
      );

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

    it('should handle not null constraint violations', () => {
      const dbError = new QueryFailedError(
        'INSERT INTO products...',
        [],
        new Error('violates not-null constraint "products_name"'),
      );

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

    it('should handle check constraint violations', () => {
      const dbError = new QueryFailedError(
        'INSERT INTO products...',
        [],
        new Error('violates check constraint "products_price_positive"'),
      );

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

    it('should handle generic database errors', () => {
      const dbError = new QueryFailedError(
        'SELECT * FROM...',
        [],
        new Error('Some generic database error'),
      );

      filter.catch(dbError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Database error occurred',
          error: 'BAD_REQUEST',
        }),
      );
    });
  });

  describe('Generic error handling', () => {
    it('should handle generic Error instances', () => {
      const error = new Error('Generic application error');

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Generic application error',
          error: 'INTERNAL_SERVER_ERROR',
        }),
      );
    });

    it('should handle unknown error types', () => {
      const unknownError = 'String error';

      filter.catch(unknownError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          error: 'INTERNAL_SERVER_ERROR',
        }),
      );
    });

    it('should handle null/undefined errors', () => {
      filter.catch(null, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          error: 'INTERNAL_SERVER_ERROR',
        }),
      );
    });
  });

  describe('Response format validation', () => {
    it('should always include required response fields', () => {
      const exception = new HttpException('Test', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: expect.any(Number),
          message: expect.any(String),
          error: expect.any(String),
          timestamp: expect.any(String),
          path: expect.any(String),
          method: expect.any(String),
        }),
      );
    });

    it('should include ISO timestamp', () => {
      const exception = new HttpException('Test', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockHost);

      const call = mockResponse.json.mock.calls[0][0];
      expect(call.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});
