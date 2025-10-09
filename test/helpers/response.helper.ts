import { Response } from 'supertest';

/**
 * Response Helper for E2E Tests
 *
 * Provides utility methods to extract data from API responses
 * that are wrapped by the global ResponseInterceptor.
 *
 * @example
 * ```typescript
 * const authData = ResponseHelper.extractData<AuthResponseDto>(response);
 * const products = ResponseHelper.extractItems<ProductDto>(response);
 * const meta = ResponseHelper.extractMeta(response);
 * ```
 */
export class ResponseHelper {
  /**
   * Extract actual data from API response
   *
   * API responses are wrapped by ResponseInterceptor in the following format:
   * ```json
   * {
   *   "success": true,
   *   "statusCode": 200,
   *   "message": "Success",
   *   "data": { ...actual data... },
   *   "timestamp": "2025-10-09T...",
   *   "path": "/api/endpoint"
   * }
   * ```
   *
   * This method extracts the `data` property from the response body.
   *
   * **TEMPORARY WORKAROUND:** Some responses have double-nested data structure
   * (response.body.data.data) due to legacy wrapping. This method handles both cases.
   *
   * @param response - Supertest response object
   * @returns Actual data from response
   *
   * @example
   * ```typescript
   * const authData = ResponseHelper.extractData<AuthResponseDto>(response);
   * expect(authData.accessToken).toBeDefined();
   * ```
   *
   * @see docs/refactor/double-nested-response-issue.md - Full documentation
   * @todo Remove double-nesting workaround when backend refactoring is complete
   */
  static extractData<T = any>(response: Response): T {
    if (!response.body) {
      throw new Error('Response body is undefined');
    }

    if (!response.body.data) {
      throw new Error(
        `Expected response.body.data to be defined. Got: ${JSON.stringify(response.body)}`,
      );
    }

    const data = response.body.data;

    // TEMPORARY WORKAROUND: Handle double-nested data structure
    // If data has its own 'data' property, it means we have double nesting
    // This happens when services return {data: ..., meta: ...} and ResponseInterceptor wraps it again
    if (
      data &&
      typeof data === 'object' &&
      'data' in data &&
      data.data !== undefined &&
      data.data !== null
    ) {
      // Double-nested case: return data.data
      return data.data as T;
    }

    // Normal case: return data directly
    return data as T;
  }

  /**
   * Extract items array from paginated API response
   *
   * Paginated responses have the following structure:
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "items": [...],
   *     "meta": { page: 1, limit: 20, total: 100, ... }
   *   }
   * }
   * ```
   *
   * This method extracts the `items` array from paginated responses.
   *
   * @param response - Supertest response object
   * @returns Array of items
   *
   * @example
   * ```typescript
   * const products = ResponseHelper.extractItems<ProductDto>(response);
   * expect(products).toHaveLength(10);
   * ```
   */
  static extractItems<T = any>(response: Response): T[] {
    const data = this.extractData<{ items: T[] }>(response);

    if (!data.items) {
      throw new Error(`Expected data.items to be defined. Got: ${JSON.stringify(data)}`);
    }

    if (!Array.isArray(data.items)) {
      throw new Error(`Expected data.items to be an array. Got: ${typeof data.items}`);
    }

    return data.items;
  }

  /**
   * Extract pagination metadata from API response
   *
   * @param response - Supertest response object
   * @returns Pagination metadata
   *
   * @example
   * ```typescript
   * const meta = ResponseHelper.extractMeta(response);
   * expect(meta.page).toBe(1);
   * expect(meta.limit).toBe(20);
   * expect(meta.total).toBe(100);
   * expect(meta.totalPages).toBe(5);
   * ```
   */
  static extractMeta(response: Response): PaginationMeta {
    const data = this.extractData<{ meta: PaginationMeta }>(response);

    if (!data.meta) {
      throw new Error(`Expected data.meta to be defined. Got: ${JSON.stringify(data)}`);
    }

    return data.meta;
  }

  /**
   * Extract response metadata (success, statusCode, message, etc.)
   *
   * @param response - Supertest response object
   * @returns Response metadata
   *
   * @example
   * ```typescript
   * const metadata = ResponseHelper.extractMetadata(response);
   * expect(metadata.success).toBe(true);
   * expect(metadata.statusCode).toBe(200);
   * ```
   */
  static extractMetadata(response: Response): ResponseMetadata {
    if (!response.body) {
      throw new Error('Response body is undefined');
    }

    return {
      success: response.body.success,
      statusCode: response.body.statusCode,
      message: response.body.message,
      timestamp: response.body.timestamp,
      path: response.body.path,
    };
  }

  /**
   * Assert that response is successful with expected status code
   *
   * @param response - Supertest response object
   * @param expectedStatusCode - Expected HTTP status code (default: 200)
   *
   * @example
   * ```typescript
   * ResponseHelper.expectSuccess(response, 201);
   * ```
   */
  static expectSuccess(response: Response, expectedStatusCode = 200): void {
    expect(response.status).toBe(expectedStatusCode);
    expect(response.body.success).toBe(true);
    expect(response.body.statusCode).toBe(expectedStatusCode);
    expect(response.body.data).toBeDefined();
  }

  /**
   * Assert that response is an error with expected status code
   *
   * @param response - Supertest response object
   * @param expectedStatusCode - Expected HTTP status code
   * @param expectedMessage - Optional expected error message (partial match)
   *
   * @example
   * ```typescript
   * ResponseHelper.expectError(response, 404, 'Not found');
   * ```
   */
  static expectError(
    response: Response,
    expectedStatusCode: number,
    expectedMessage?: string,
  ): void {
    expect(response.status).toBe(expectedStatusCode);
    expect(response.body.success).toBe(false);
    expect(response.body.statusCode).toBe(expectedStatusCode);

    if (expectedMessage) {
      expect(response.body.message).toContain(expectedMessage);
    }
  }

  /**
   * Legacy support: Extract data with fallback for old double-nesting
   *
   * @deprecated Use extractData() instead. This is only for migration support.
   *
   * @param response - Supertest response object
   * @returns Extracted data
   */
  static extractDataLegacy<T = any>(response: Response): T {
    if (!response.body || !response.body.data) {
      throw new Error('Response body or data is undefined');
    }

    // Check if it's the old double-nested structure
    const data = response.body.data;
    if (data.data !== undefined) {
      console.warn(
        '[ResponseHelper] Double-nested structure detected. Consider updating the code.',
      );
      return data.data as T;
    }

    return data as T;
  }
}

/**
 * Pagination metadata interface
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Response metadata interface
 */
export interface ResponseMetadata {
  success: boolean;
  statusCode: number;
  message: string;
  timestamp: string;
  path: string;
}
