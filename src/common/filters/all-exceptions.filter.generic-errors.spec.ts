import { AllExceptionsFilter } from './all-exceptions.filter';
import { HttpStatus } from '@nestjs/common';
import {
  createMockResponse,
  createMockRequest,
  createMockHost,
  createMockLogger,
  MockResponse,
  MockRequest,
} from './helpers/all-exceptions-filter.test-helpers';

describe('AllExceptionsFilter - Generic Error Handling', () => {
  let filter: AllExceptionsFilter;
  let mockResponse: MockResponse;
  let mockRequest: MockRequest;

  beforeEach(() => {
    const mockLogger = createMockLogger();
    filter = new AllExceptionsFilter(mockLogger);
    mockResponse = createMockResponse();
    mockRequest = createMockRequest();
  });

  describe('Standard Error instances', () => {
    it('should handle generic Error instances', () => {
      const error = new Error('Generic application error');
      const mockHost = createMockHost(mockResponse, mockRequest);

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
  });

  describe('Unknown error types', () => {
    it('should handle unknown error types', () => {
      const unknownError = 'String error';
      const mockHost = createMockHost(mockResponse, mockRequest);

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
  });

  describe('Null and undefined errors', () => {
    it('should handle null/undefined errors', () => {
      const mockHost = createMockHost(mockResponse, mockRequest);

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
});
