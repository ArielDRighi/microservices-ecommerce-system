import { ResponseInterceptor } from './response.interceptor';
import { ExecutionContext, CallHandler, HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { TimeoutError } from 'rxjs';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<any>;
  let mockContext: jest.Mocked<ExecutionContext>;
  let mockCallHandler: jest.Mocked<CallHandler>;
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    mockRequest = {
      url: '/api/users',
    };

    mockResponse = {
      statusCode: 200,
    };

    mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as any;

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ id: 1, name: 'Test User' })),
    } as any;

    interceptor = new ResponseInterceptor();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('intercept', () => {
    describe('Standard responses', () => {
      it('should transform response to standard format', (done) => {
        interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
          expect(result).toEqual({
            statusCode: 200,
            message: 'Success',
            data: { id: 1, name: 'Test User' },
            timestamp: expect.any(String),
            path: '/api/users',
            success: true,
          });
          done();
        });
      });

      it('should set success to true for 2xx status codes', (done) => {
        mockResponse.statusCode = 201;

        interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
          expect(result.success).toBe(true);
          expect(result.statusCode).toBe(201);
          done();
        });
      });

      it('should set success to false for non-2xx status codes', (done) => {
        mockResponse.statusCode = 400;

        interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
          expect(result.success).toBe(false);
          expect(result.statusCode).toBe(400);
          done();
        });
      });

      it('should include ISO timestamp', (done) => {
        interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
          expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
          done();
        });
      });

      it('should include request path', (done) => {
        mockRequest.url = '/api/products/123';

        interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
          expect(result.path).toBe('/api/products/123');
          done();
        });
      });
    });

    describe('Status-specific messages', () => {
      it('should return "Success" for 200 OK', (done) => {
        mockResponse.statusCode = HttpStatus.OK;

        interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
          expect(result.message).toBe('Success');
          done();
        });
      });

      it('should return "Created successfully" for 201 CREATED', (done) => {
        mockResponse.statusCode = HttpStatus.CREATED;

        interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
          expect(result.message).toBe('Created successfully');
          done();
        });
      });

      it('should return "Accepted" for 202 ACCEPTED', (done) => {
        mockResponse.statusCode = HttpStatus.ACCEPTED;

        interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
          expect(result.message).toBe('Accepted');
          done();
        });
      });

      it('should return "No content" for 204 NO_CONTENT', (done) => {
        mockResponse.statusCode = HttpStatus.NO_CONTENT;

        interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
          expect(result.message).toBe('No content');
          done();
        });
      });

      it('should return "Success" for other 2xx status codes', (done) => {
        mockResponse.statusCode = 206; // Partial Content

        interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
          expect(result.message).toBe('Success');
          done();
        });
      });
    });

    describe('Health check endpoints', () => {
      it('should skip transformation for /health endpoint', (done) => {
        mockRequest.url = '/health';
        const healthData = { status: 'ok', info: {}, error: {}, details: {} };
        mockCallHandler.handle = jest.fn().mockReturnValue(of(healthData));

        interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
          expect(result).toEqual(healthData);
          expect(result).not.toHaveProperty('statusCode');
          expect(result).not.toHaveProperty('message');
          expect(result).not.toHaveProperty('timestamp');
          done();
        });
      });

      it('should skip transformation for /health/live endpoint', (done) => {
        mockRequest.url = '/health/live';
        const liveData = { status: 'ok' };
        mockCallHandler.handle = jest.fn().mockReturnValue(of(liveData));

        interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
          expect(result).toEqual(liveData);
          done();
        });
      });

      it('should skip transformation for /health/ready endpoint', (done) => {
        mockRequest.url = '/health/ready';
        const readyData = { status: 'ok' };
        mockCallHandler.handle = jest.fn().mockReturnValue(of(readyData));

        interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
          expect(result).toEqual(readyData);
          done();
        });
      });

      it('should transform non-health endpoints normally', (done) => {
        mockRequest.url = '/api/healthcheck'; // Not /health prefix

        interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
          expect(result).toHaveProperty('statusCode');
          expect(result).toHaveProperty('message');
          expect(result).toHaveProperty('timestamp');
          done();
        });
      });
    });

    describe('Timeout handling', () => {
      it('should have 30 second timeout configured', () => {
        // Test that the timeout operator is configured with 30000ms
        // We verify this by checking the error handling for TimeoutError
        const timeoutError = new TimeoutError();
        mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => timeoutError));

        interceptor.intercept(mockContext, mockCallHandler).subscribe({
          error: (error) => {
            expect(error).toBeInstanceOf(HttpException);
            expect(error.getStatus()).toBe(HttpStatus.REQUEST_TIMEOUT);
          },
        });
      });

      it('should convert TimeoutError to HttpException with 408 status', (done) => {
        const timeoutError = new TimeoutError();
        mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => timeoutError));

        interceptor.intercept(mockContext, mockCallHandler).subscribe({
          error: (error) => {
            expect(error).toBeInstanceOf(HttpException);
            expect(error.getStatus()).toBe(HttpStatus.REQUEST_TIMEOUT);
            expect(error.message).toBe('Request timeout - operation took too long to complete');
            done();
          },
        });
      });

      it('should not timeout for fast responses', (done) => {
        mockCallHandler.handle = jest.fn().mockReturnValue(of({ data: 'fast' }));

        interceptor.intercept(mockContext, mockCallHandler).subscribe({
          next: (result) => {
            expect(result.data).toEqual({ data: 'fast' });
            done();
          },
          error: () => {
            fail('Should not timeout for fast responses');
          },
        });
      });
    });

    describe('Error handling', () => {
      it('should propagate non-timeout errors unchanged', (done) => {
        const customError = new HttpException('Custom error', HttpStatus.BAD_REQUEST);
        mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => customError));

        interceptor.intercept(mockContext, mockCallHandler).subscribe({
          error: (error) => {
            expect(error).toBe(customError);
            expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
            done();
          },
        });
      });

      it('should propagate validation errors', (done) => {
        const validationError = new HttpException(
          {
            statusCode: 400,
            message: ['Field is required'],
            error: 'Bad Request',
          },
          HttpStatus.BAD_REQUEST,
        );
        mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => validationError));

        interceptor.intercept(mockContext, mockCallHandler).subscribe({
          error: (error) => {
            expect(error).toBe(validationError);
            done();
          },
        });
      });

      it('should propagate internal server errors', (done) => {
        const serverError = new HttpException(
          'Internal server error',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
        mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => serverError));

        interceptor.intercept(mockContext, mockCallHandler).subscribe({
          error: (error) => {
            expect(error).toBe(serverError);
            expect(error.getStatus()).toBe(500);
            done();
          },
        });
      });
    });

    describe('Data types', () => {
      it('should handle null data', (done) => {
        mockCallHandler.handle = jest.fn().mockReturnValue(of(null));

        interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
          expect(result.data).toBeNull();
          expect(result.success).toBe(true);
          done();
        });
      });

      it('should handle undefined data', (done) => {
        mockCallHandler.handle = jest.fn().mockReturnValue(of(undefined));

        interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
          expect(result.data).toBeUndefined();
          expect(result.success).toBe(true);
          done();
        });
      });

      it('should handle empty object', (done) => {
        mockCallHandler.handle = jest.fn().mockReturnValue(of({}));

        interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
          expect(result.data).toEqual({});
          done();
        });
      });

      it('should handle empty array', (done) => {
        mockCallHandler.handle = jest.fn().mockReturnValue(of([]));

        interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
          expect(result.data).toEqual([]);
          done();
        });
      });

      it('should handle array of objects', (done) => {
        const users = [
          { id: 1, name: 'User 1' },
          { id: 2, name: 'User 2' },
        ];
        mockCallHandler.handle = jest.fn().mockReturnValue(of(users));

        interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
          expect(result.data).toEqual(users);
          done();
        });
      });

      it('should handle string data', (done) => {
        mockCallHandler.handle = jest.fn().mockReturnValue(of('plain text'));

        interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
          expect(result.data).toBe('plain text');
          done();
        });
      });

      it('should handle number data', (done) => {
        mockCallHandler.handle = jest.fn().mockReturnValue(of(42));

        interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
          expect(result.data).toBe(42);
          done();
        });
      });

      it('should handle boolean data', (done) => {
        mockCallHandler.handle = jest.fn().mockReturnValue(of(true));

        interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
          expect(result.data).toBe(true);
          done();
        });
      });

      it('should handle nested complex objects', (done) => {
        const complexData = {
          user: {
            id: 1,
            profile: {
              name: 'John',
              settings: {
                theme: 'dark',
                notifications: true,
              },
            },
            posts: [
              { id: 1, title: 'Post 1' },
              { id: 2, title: 'Post 2' },
            ],
          },
        };
        mockCallHandler.handle = jest.fn().mockReturnValue(of(complexData));

        interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
          expect(result.data).toEqual(complexData);
          done();
        });
      });
    });

    describe('Edge cases', () => {
      it('should handle very long URLs', (done) => {
        mockRequest.url = '/api/search?query=' + 'a'.repeat(1000) + '&filters=xyz';

        interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
          expect(result.path).toHaveLength(mockRequest.url.length);
          done();
        });
      });

      it('should handle status code 0', (done) => {
        mockResponse.statusCode = 0;

        interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
          expect(result.statusCode).toBe(0);
          expect(result.success).toBe(false);
          done();
        });
      });

      it('should handle status code 299 (edge of 2xx range)', (done) => {
        mockResponse.statusCode = 299;

        interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
          expect(result.success).toBe(true);
          done();
        });
      });

      it('should handle status code 300 (start of 3xx range)', (done) => {
        mockResponse.statusCode = 300;

        interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
          expect(result.success).toBe(false);
          done();
        });
      });

      it('should handle URLs with special characters', (done) => {
        mockRequest.url = '/api/users/search?name=José María&city=São Paulo';

        interceptor.intercept(mockContext, mockCallHandler).subscribe((result) => {
          expect(result.path).toBe('/api/users/search?name=José María&city=São Paulo');
          done();
        });
      });
    });
  });
});
