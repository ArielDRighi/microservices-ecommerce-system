import { AllExceptionsFilter } from './all-exceptions.filter';
import { HttpException, HttpStatus } from '@nestjs/common';
import {
  createMockResponse,
  createMockRequest,
  createMockHost,
  createMockLogger,
  MockResponse,
  MockRequest,
} from './helpers/all-exceptions-filter.test-helpers';

describe('AllExceptionsFilter - HttpException Handling', () => {
  let filter: AllExceptionsFilter;
  let mockResponse: MockResponse;
  let mockRequest: MockRequest;

  beforeEach(() => {
    const mockLogger = createMockLogger();
    filter = new AllExceptionsFilter(mockLogger);
    mockResponse = createMockResponse();
    mockRequest = createMockRequest();
  });

  describe('Basic HttpException handling', () => {
    it('should handle HttpException properly', () => {
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);
      const mockHost = createMockHost(mockResponse, mockRequest);

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
  });

  describe('HttpException with complex message', () => {
    it('should handle HttpException with array message', () => {
      const exception = new HttpException(
        { message: ['Error 1', 'Error 2'] },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
      const mockHost = createMockHost(mockResponse, mockRequest);

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
});
