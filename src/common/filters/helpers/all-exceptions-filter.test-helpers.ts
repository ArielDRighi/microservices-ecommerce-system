import { ArgumentsHost } from '@nestjs/common';
import { WinstonLoggerService } from '../../utils/winston-logger.service';

/**
 * Mock response object for testing
 */
export interface MockResponse {
  status: jest.Mock;
  json: jest.Mock;
}

/**
 * Mock request object for testing
 */
export interface MockRequest {
  url: string;
  method: string;
}

/**
 * Creates a mock response object with chained methods
 */
export function createMockResponse(): MockResponse {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

/**
 * Creates a mock request object with default values
 */
export function createMockRequest(overrides: Partial<MockRequest> = {}): MockRequest {
  return {
    url: '/test',
    method: 'GET',
    ...overrides,
  };
}

/**
 * Creates a mock ArgumentsHost for testing
 */
export function createMockHost(response: MockResponse, request: MockRequest): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;
}

/**
 * Creates a mock WinstonLoggerService
 */
export function createMockLogger(): WinstonLoggerService {
  return {
    error: jest.fn(),
    warn: jest.fn(),
  } as Partial<WinstonLoggerService> as WinstonLoggerService;
}

/**
 * Validates that response has all required fields
 */
export function expectRequiredResponseFields(mockResponse: MockResponse): void {
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
}

/**
 * Validates that timestamp is in ISO format
 */
export function expectISOTimestamp(mockResponse: MockResponse): void {
  const call = mockResponse.json.mock.calls[0][0];
  expect(call.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
}
