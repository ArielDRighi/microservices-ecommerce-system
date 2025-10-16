import { LoggingInterceptor } from './logging.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { WinstonLoggerService } from '../utils/winston-logger.service';
import { of, throwError } from 'rxjs';
import { Request, Response } from 'express';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockLogger: jest.Mocked<WinstonLoggerService>;
  let mockContext: jest.Mocked<ExecutionContext>;
  let mockCallHandler: jest.Mocked<CallHandler>;
  let mockRequest: Partial<Request & { correlationId?: string; user?: { id: string } }>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Mock logger
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as any;

    // Mock request
    mockRequest = {
      method: 'POST',
      url: '/api/users',
      ip: '127.0.0.1',
      body: { username: 'testuser', password: 'secret123' },
      query: { page: '1', limit: '10' },
      headers: {
        'user-agent': 'Mozilla/5.0',
        authorization: 'Bearer token123',
        'content-type': 'application/json',
      } as any,
      get: jest.fn((header: string): string | undefined => {
        if (header === 'user-agent') return 'Mozilla/5.0';
        if (header === 'set-cookie') return undefined;
        return undefined;
      }) as any,
    };

    // Mock response
    mockResponse = {
      statusCode: 200,
      set: jest.fn(),
    };

    // Mock context
    mockContext = {
      getType: jest.fn().mockReturnValue('http'),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as any;

    // Mock call handler
    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ id: 1, username: 'testuser' })),
    } as any;

    interceptor = new LoggingInterceptor(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('intercept', () => {
    describe('HTTP requests', () => {
      it('should generate correlation ID if not exists', (done) => {
        interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
          expect(mockRequest.correlationId).toBeDefined();
          expect(mockRequest.correlationId).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
          );
          expect(mockResponse.set).toHaveBeenCalledWith(
            'X-Correlation-ID',
            mockRequest.correlationId,
          );
          done();
        });
      });

      it('should not override existing correlation ID', (done) => {
        const existingId = 'existing-correlation-id';
        mockRequest.correlationId = existingId;

        interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
          expect(mockRequest.correlationId).toBe(existingId);
          done();
        });
      });

      it('should log incoming request with sanitized data', (done) => {
        interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
          expect(mockLogger.log).toHaveBeenCalledWith(
            'Incoming request',
            'HTTP',
            expect.objectContaining({
              method: 'POST',
              url: '/api/users',
              userAgent: 'Mozilla/5.0',
              ip: '127.0.0.1',
              correlationId: expect.any(String),
              body: expect.objectContaining({
                username: 'testuser',
                password: '[REDACTED]',
              }),
              query: { page: '1', limit: '10' },
              headers: expect.objectContaining({
                authorization: '[REDACTED]',
                'content-type': 'application/json',
              }),
              timestamp: expect.any(String),
            }),
          );
          done();
        });
      });

      it('should log outgoing response with response time', (done) => {
        interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
          expect(mockLogger.log).toHaveBeenCalledWith(
            'Outgoing response',
            'HTTP',
            expect.objectContaining({
              method: 'POST',
              url: '/api/users',
              statusCode: 200,
              responseTime: expect.stringMatching(/^\d+ms$/),
              correlationId: expect.any(String),
              responseSize: expect.any(String),
              timestamp: expect.any(String),
            }),
          );
          done();
        });
      });

      it('should include user ID in logs when user is authenticated', (done) => {
        mockRequest.user = { id: 'user-123' };

        interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
          expect(mockLogger.log).toHaveBeenCalledWith(
            'Incoming request',
            'HTTP',
            expect.objectContaining({
              userId: 'user-123',
            }),
          );
          expect(mockLogger.log).toHaveBeenCalledWith(
            'Outgoing response',
            'HTTP',
            expect.objectContaining({
              userId: 'user-123',
            }),
          );
          done();
        });
      });

      it('should log error when request fails', (done) => {
        const error = new Error('Test error');
        (error as any).status = 400;
        (error as any).stack = 'Error stack trace';

        mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => error));

        interceptor.intercept(mockContext, mockCallHandler).subscribe({
          error: (err) => {
            expect(mockLogger.error).toHaveBeenCalledWith(
              'Request failed',
              'Error stack trace',
              'HTTP',
              expect.objectContaining({
                method: 'POST',
                url: '/api/users',
                statusCode: 400,
                responseTime: expect.stringMatching(/^\d+ms$/),
                errorName: 'Error',
                errorMessage: 'Test error',
              }),
            );
            expect(err).toBe(error);
            done();
          },
        });
      });

      it('should use status 500 when error has no status', (done) => {
        const error = new Error('Unexpected error');
        mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => error));

        interceptor.intercept(mockContext, mockCallHandler).subscribe({
          error: () => {
            expect(mockLogger.error).toHaveBeenCalledWith(
              'Request failed',
              expect.any(String),
              'HTTP',
              expect.objectContaining({
                statusCode: 500,
              }),
            );
            done();
          },
        });
      });
    });

    describe('Non-HTTP contexts', () => {
      it('should skip logging for non-HTTP contexts', (done) => {
        mockContext.getType = jest.fn().mockReturnValue('ws');

        interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
          expect(mockLogger.log).not.toHaveBeenCalled();
          expect(mockResponse.set).not.toHaveBeenCalled();
          done();
        });
      });

      it('should skip logging for RPC contexts', (done) => {
        mockContext.getType = jest.fn().mockReturnValue('rpc');

        interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
          expect(mockLogger.log).not.toHaveBeenCalled();
          done();
        });
      });
    });
  });

  describe('sanitizeData', () => {
    it('should redact password field', (done) => {
      mockRequest.body = { username: 'test', password: 'secret' };

      interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Incoming request',
          'HTTP',
          expect.objectContaining({
            body: { username: 'test', password: '[REDACTED]' },
          }),
        );
        done();
      });
    });

    it('should redact token fields', (done) => {
      mockRequest.body = {
        accessToken: 'token123',
        refreshToken: 'refresh456',
        apiKey: 'key789',
      };

      interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Incoming request',
          'HTTP',
          expect.objectContaining({
            body: {
              accessToken: '[REDACTED]',
              refreshToken: '[REDACTED]',
              apiKey: '[REDACTED]',
            },
          }),
        );
        done();
      });
    });

    it('should redact sensitive fields in nested objects', (done) => {
      mockRequest.body = {
        user: {
          name: 'John',
          password: 'secret',
          credentials: {
            token: 'token123',
          },
        },
      };

      interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Incoming request',
          'HTTP',
          expect.objectContaining({
            body: {
              user: {
                name: 'John',
                password: '[REDACTED]',
                credentials: {
                  token: '[REDACTED]',
                },
              },
            },
          }),
        );
        done();
      });
    });

    it('should redact sensitive fields in arrays', (done) => {
      mockRequest.body = {
        users: [
          { name: 'User1', password: 'pass1' },
          { name: 'User2', password: 'pass2' },
        ],
      };

      interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Incoming request',
          'HTTP',
          expect.objectContaining({
            body: {
              users: [
                { name: 'User1', password: '[REDACTED]' },
                { name: 'User2', password: '[REDACTED]' },
              ],
            },
          }),
        );
        done();
      });
    });

    it('should handle primitive values without error', (done) => {
      mockRequest.body = 'string value';

      interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Incoming request',
          'HTTP',
          expect.objectContaining({
            body: 'string value',
          }),
        );
        done();
      });
    });

    it('should handle null values without error', (done) => {
      mockRequest.body = null;

      interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Incoming request',
          'HTTP',
          expect.objectContaining({
            body: null,
          }),
        );
        done();
      });
    });

    it('should handle undefined values without error', (done) => {
      mockRequest.body = undefined;

      interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Incoming request',
          'HTTP',
          expect.objectContaining({
            body: undefined,
          }),
        );
        done();
      });
    });

    it('should handle arrays as body', (done) => {
      mockRequest.body = [1, 2, 3];

      interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Incoming request',
          'HTTP',
          expect.objectContaining({
            body: [1, 2, 3],
          }),
        );
        done();
      });
    });

    it('should redact creditCard field', (done) => {
      mockRequest.body = {
        payment: {
          creditCard: '4111111111111111',
          cvv: '123',
        },
      };

      interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Incoming request',
          'HTTP',
          expect.objectContaining({
            body: {
              payment: {
                creditCard: '[REDACTED]',
                cvv: '123',
              },
            },
          }),
        );
        done();
      });
    });

    it('should redact ssn and socialSecurityNumber fields', (done) => {
      mockRequest.body = {
        ssn: '123-45-6789',
        socialSecurityNumber: '987-65-4321',
      };

      interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Incoming request',
          'HTTP',
          expect.objectContaining({
            body: {
              ssn: '[REDACTED]',
              socialSecurityNumber: '[REDACTED]',
            },
          }),
        );
        done();
      });
    });
  });

  describe('sanitizeHeaders', () => {
    it('should redact authorization header', (done) => {
      mockRequest.headers = {
        authorization: 'Bearer token123',
        'content-type': 'application/json',
      } as any;

      interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Incoming request',
          'HTTP',
          expect.objectContaining({
            headers: {
              authorization: '[REDACTED]',
              'content-type': 'application/json',
            },
          }),
        );
        done();
      });
    });

    it('should redact cookie header', (done) => {
      mockRequest.headers = {
        cookie: 'session=abc123',
        'user-agent': 'Mozilla/5.0',
      } as any;

      interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Incoming request',
          'HTTP',
          expect.objectContaining({
            headers: {
              cookie: '[REDACTED]',
              'user-agent': 'Mozilla/5.0',
            },
          }),
        );
        done();
      });
    });

    it('should redact x-api-key header', (done) => {
      mockRequest.headers = {
        'x-api-key': 'key123',
        accept: 'application/json',
      } as any;

      interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Incoming request',
          'HTTP',
          expect.objectContaining({
            headers: {
              'x-api-key': '[REDACTED]',
              accept: 'application/json',
            },
          }),
        );
        done();
      });
    });

    it('should redact x-auth-token and x-access-token headers', (done) => {
      mockRequest.headers = {
        'x-auth-token': 'auth123',
        'x-access-token': 'access456',
      } as any;

      interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Incoming request',
          'HTTP',
          expect.objectContaining({
            headers: {
              'x-auth-token': '[REDACTED]',
              'x-access-token': '[REDACTED]',
            },
          }),
        );
        done();
      });
    });
  });

  describe('getResponseSize', () => {
    it('should calculate size in bytes for small responses', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of({ message: 'ok' }));

      interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
        const logCall = mockLogger.log.mock.calls.find((call) => call[0] === 'Outgoing response');
        if (!logCall) {
          fail('Log call not found');
          return;
        }
        const logData = logCall[2] as any;
        expect(logData['responseSize']).toMatch(/^\d+ bytes$/);
        done();
      });
    });

    it('should calculate size in KB for medium responses', (done) => {
      const largeData = { data: 'x'.repeat(2048) };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(largeData));

      interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
        const logCall = mockLogger.log.mock.calls.find((call) => call[0] === 'Outgoing response');
        if (!logCall) {
          fail('Log call not found');
          return;
        }
        const logData = logCall[2] as any;
        expect(logData['responseSize']).toMatch(/^\d+\.\d+ KB$/);
        done();
      });
    });

    it('should calculate size in MB for large responses', (done) => {
      const largeData = { data: 'x'.repeat(1024 * 1024 * 2) };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(largeData));

      interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
        const logCall = mockLogger.log.mock.calls.find((call) => call[0] === 'Outgoing response');
        if (!logCall) {
          fail('Log call not found');
          return;
        }
        const logData = logCall[2] as any;
        expect(logData['responseSize']).toMatch(/^\d+\.\d+ MB$/);
        done();
      });
    });

    it('should return "0 bytes" for null response', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of(null));

      interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
        const logCall = mockLogger.log.mock.calls.find((call) => call[0] === 'Outgoing response');
        if (!logCall) {
          fail('Log call not found');
          return;
        }
        const logData = logCall[2] as any;
        expect(logData['responseSize']).toBe('0 bytes');
        done();
      });
    });

    it('should return "0 bytes" for undefined response', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of(undefined));

      interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
        const logCall = mockLogger.log.mock.calls.find((call) => call[0] === 'Outgoing response');
        if (!logCall) {
          fail('Log call not found');
          return;
        }
        const logData = logCall[2] as any;
        expect(logData['responseSize']).toBe('0 bytes');
        done();
      });
    });

    it('should return "unknown" for circular reference objects', (done) => {
      const circular: any = { name: 'test' };
      circular.self = circular;
      mockCallHandler.handle = jest.fn().mockReturnValue(of(circular));

      interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
        const logCall = mockLogger.log.mock.calls.find((call) => call[0] === 'Outgoing response');
        if (!logCall) {
          fail('Log call not found');
          return;
        }
        const logData = logCall[2] as any;
        expect(logData['responseSize']).toBe('unknown');
        done();
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle requests without body', (done) => {
      mockRequest.body = undefined;

      interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Incoming request',
          'HTTP',
          expect.objectContaining({
            body: undefined,
          }),
        );
        done();
      });
    });

    it('should handle requests without query', (done) => {
      mockRequest.query = {};

      interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Incoming request',
          'HTTP',
          expect.objectContaining({
            query: {},
          }),
        );
        done();
      });
    });

    it('should handle requests without user-agent', (done) => {
      mockRequest.get = jest.fn().mockReturnValue(undefined);

      interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          'Incoming request',
          'HTTP',
          expect.objectContaining({
            userAgent: undefined,
          }),
        );
        done();
      });
    });

    it('should handle errors without stack trace', (done) => {
      const error = new Error('Error without stack');
      delete error.stack;
      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => error));

      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        error: () => {
          expect(mockLogger.error).toHaveBeenCalledWith(
            'Request failed',
            undefined,
            'HTTP',
            expect.any(Object),
          );
          done();
        },
      });
    });
  });
});
