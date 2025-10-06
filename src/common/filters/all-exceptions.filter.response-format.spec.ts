import { AllExceptionsFilter } from './all-exceptions.filter';
import { HttpException, HttpStatus } from '@nestjs/common';
import {
  createMockResponse,
  createMockRequest,
  createMockHost,
  createMockLogger,
  expectRequiredResponseFields,
  expectISOTimestamp,
  MockResponse,
  MockRequest,
} from './helpers/all-exceptions-filter.test-helpers';

describe('AllExceptionsFilter - Response Format Validation', () => {
  let filter: AllExceptionsFilter;
  let mockResponse: MockResponse;
  let mockRequest: MockRequest;

  beforeEach(() => {
    const mockLogger = createMockLogger();
    filter = new AllExceptionsFilter(mockLogger);
    mockResponse = createMockResponse();
    mockRequest = createMockRequest();
  });

  describe('Required response fields', () => {
    it('should always include required response fields', () => {
      const exception = new HttpException('Test', HttpStatus.NOT_FOUND);
      const mockHost = createMockHost(mockResponse, mockRequest);

      filter.catch(exception, mockHost);

      expectRequiredResponseFields(mockResponse);
    });
  });

  describe('Timestamp format', () => {
    it('should include ISO timestamp', () => {
      const exception = new HttpException('Test', HttpStatus.NOT_FOUND);
      const mockHost = createMockHost(mockResponse, mockRequest);

      filter.catch(exception, mockHost);

      expectISOTimestamp(mockResponse);
    });
  });
});
