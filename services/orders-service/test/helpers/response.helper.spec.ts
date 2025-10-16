import { ResponseHelper } from './response.helper';
import { Response } from 'supertest';

describe('ResponseHelper', () => {
  describe('extractData', () => {
    it('should extract data from valid response', () => {
      const mockResponse = {
        body: {
          success: true,
          statusCode: 200,
          data: { id: '123', name: 'Test' },
          timestamp: '2025-10-09T10:00:00Z',
          path: '/api/test',
        },
      } as Response;

      const result = ResponseHelper.extractData(mockResponse);

      expect(result).toEqual({ id: '123', name: 'Test' });
    });

    it('should throw error if body is undefined', () => {
      const mockResponse = {} as Response;

      expect(() => ResponseHelper.extractData(mockResponse)).toThrow('Response body is undefined');
    });

    it('should throw error if data is undefined', () => {
      const mockResponse = {
        body: {
          success: true,
          statusCode: 200,
        },
      } as Response;

      expect(() => ResponseHelper.extractData(mockResponse)).toThrow(
        'Expected response.body.data to be defined',
      );
    });
  });

  describe('extractItems', () => {
    it('should extract items from paginated response', () => {
      const mockResponse = {
        body: {
          success: true,
          statusCode: 200,
          data: {
            items: [
              { id: '1', name: 'Item 1' },
              { id: '2', name: 'Item 2' },
            ],
            meta: {
              page: 1,
              limit: 20,
              total: 2,
              totalPages: 1,
              hasNextPage: false,
              hasPreviousPage: false,
            },
          },
        },
      } as Response;

      const result = ResponseHelper.extractItems(mockResponse);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: '1', name: 'Item 1' });
    });

    it('should throw error if items is not an array', () => {
      const mockResponse = {
        body: {
          success: true,
          data: {
            items: 'not-an-array',
          },
        },
      } as Response;

      expect(() => ResponseHelper.extractItems(mockResponse)).toThrow(
        'Expected data.items to be an array',
      );
    });

    it('should throw error if items is undefined', () => {
      const mockResponse = {
        body: {
          success: true,
          data: {
            meta: {},
          },
        },
      } as Response;

      expect(() => ResponseHelper.extractItems(mockResponse)).toThrow(
        'Expected data.items to be defined',
      );
    });
  });

  describe('extractMeta', () => {
    it('should extract pagination metadata', () => {
      const mockResponse = {
        body: {
          success: true,
          data: {
            items: [],
            meta: {
              page: 2,
              limit: 10,
              total: 50,
              totalPages: 5,
              hasNextPage: true,
              hasPreviousPage: true,
            },
          },
        },
      } as Response;

      const result = ResponseHelper.extractMeta(mockResponse);

      expect(result).toEqual({
        page: 2,
        limit: 10,
        total: 50,
        totalPages: 5,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });

    it('should throw error if meta is undefined', () => {
      const mockResponse = {
        body: {
          success: true,
          data: {
            items: [],
          },
        },
      } as Response;

      expect(() => ResponseHelper.extractMeta(mockResponse)).toThrow(
        'Expected data.meta to be defined',
      );
    });
  });

  describe('extractMetadata', () => {
    it('should extract response metadata', () => {
      const mockResponse = {
        body: {
          success: true,
          statusCode: 201,
          message: 'Created successfully',
          timestamp: '2025-10-09T10:00:00Z',
          path: '/api/test',
          data: {},
        },
      } as Response;

      const result = ResponseHelper.extractMetadata(mockResponse);

      expect(result).toEqual({
        success: true,
        statusCode: 201,
        message: 'Created successfully',
        timestamp: '2025-10-09T10:00:00Z',
        path: '/api/test',
      });
    });

    it('should throw error if body is undefined', () => {
      const mockResponse = {} as Response;

      expect(() => ResponseHelper.extractMetadata(mockResponse)).toThrow(
        'Response body is undefined',
      );
    });
  });

  describe('expectSuccess', () => {
    it('should pass for successful response with default status 200', () => {
      const mockResponse = {
        status: 200,
        body: {
          success: true,
          statusCode: 200,
          data: {},
        },
      } as Response;

      expect(() => ResponseHelper.expectSuccess(mockResponse)).not.toThrow();
    });

    it('should pass for successful response with custom status', () => {
      const mockResponse = {
        status: 201,
        body: {
          success: true,
          statusCode: 201,
          data: {},
        },
      } as Response;

      expect(() => ResponseHelper.expectSuccess(mockResponse, 201)).not.toThrow();
    });

    it('should fail if status code does not match', () => {
      const mockResponse = {
        status: 400,
        body: {
          success: false,
          statusCode: 400,
          data: {},
        },
      } as Response;

      expect(() => ResponseHelper.expectSuccess(mockResponse)).toThrow();
    });
  });

  describe('expectError', () => {
    it('should pass for error response with matching status', () => {
      const mockResponse = {
        status: 404,
        body: {
          success: false,
          statusCode: 404,
          message: 'Not found',
        },
      } as Response;

      expect(() => ResponseHelper.expectError(mockResponse, 404)).not.toThrow();
    });

    it('should pass for error response with matching message', () => {
      const mockResponse = {
        status: 400,
        body: {
          success: false,
          statusCode: 400,
          message: 'Validation failed: email is required',
        },
      } as Response;

      expect(() =>
        ResponseHelper.expectError(mockResponse, 400, 'Validation failed'),
      ).not.toThrow();
    });

    it('should fail if message does not match', () => {
      const mockResponse = {
        status: 400,
        body: {
          success: false,
          statusCode: 400,
          message: 'Different error',
        },
      } as Response;

      expect(() => ResponseHelper.expectError(mockResponse, 400, 'Expected error')).toThrow();
    });
  });

  describe('extractDataLegacy', () => {
    it('should handle single-nested structure (new format)', () => {
      const mockResponse = {
        body: {
          data: { id: '123', name: 'Test' },
        },
      } as Response;

      const result = ResponseHelper.extractDataLegacy(mockResponse);

      expect(result).toEqual({ id: '123', name: 'Test' });
    });

    it('should handle double-nested structure (old format) with warning', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const mockResponse = {
        body: {
          data: {
            data: { id: '123', name: 'Test' },
          },
        },
      } as Response;

      const result = ResponseHelper.extractDataLegacy(mockResponse);

      expect(result).toEqual({ id: '123', name: 'Test' });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Double-nested structure detected'),
      );

      consoleWarnSpy.mockRestore();
    });

    it('should throw error if body is undefined', () => {
      const mockResponse = {} as Response;

      expect(() => ResponseHelper.extractDataLegacy(mockResponse)).toThrow(
        'Response body or data is undefined',
      );
    });
  });
});
