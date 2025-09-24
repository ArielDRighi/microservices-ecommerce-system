import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { WinstonLoggerService } from '../utils/winston-logger.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: WinstonLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request & { correlationId?: string; user?: { id: string } }>();
    const response = ctx.getResponse<Response>();
    const startTime = Date.now();

    // Generate correlation ID if not exists
    if (!request.correlationId) {
      request.correlationId = uuidv4();
      response.set('X-Correlation-ID', request.correlationId);
    }

    // Sanitize request data (remove sensitive information)
    const sanitizedBody = this.sanitizeData(request.body);
    const sanitizedQuery = this.sanitizeData(request.query);
    const sanitizedHeaders = this.sanitizeHeaders(request.headers);

    // Log incoming request
    this.logger.log('Incoming request', 'HTTP', {
      method: request.method,
      url: request.url,
      userAgent: request.get('user-agent'),
      ip: request.ip,
      correlationId: request.correlationId,
      userId: request.user?.id,
      body: sanitizedBody as object,
      query: sanitizedQuery as object,
      headers: sanitizedHeaders,
      timestamp: new Date().toISOString(),
    });

    return next.handle().pipe(
      tap((data) => {
        const responseTime = Date.now() - startTime;

        // Log successful response
        this.logger.log('Outgoing response', 'HTTP', {
          method: request.method,
          url: request.url,
          statusCode: response.statusCode,
          responseTime: `${responseTime}ms`,
          correlationId: request.correlationId,
          userId: request.user?.id,
          responseSize: this.getResponseSize(data),
          timestamp: new Date().toISOString(),
        });
      }),
      catchError((error) => {
        const responseTime = Date.now() - startTime;

        // Log error response
        this.logger.error('Request failed', error.stack, 'HTTP', {
          method: request.method,
          url: request.url,
          statusCode: error.status || 500,
          responseTime: `${responseTime}ms`,
          correlationId: request.correlationId,
          userId: request.user?.id,
          errorName: error.name,
          errorMessage: error.message,
          timestamp: new Date().toISOString(),
        });

        throw error;
      }),
    );
  }

  private sanitizeData(data: unknown): unknown {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = [
      'password',
      'passwordHash',
      'token',
      'accessToken',
      'refreshToken',
      'apiKey',
      'secret',
      'authorization',
      'cookie',
      'x-api-key',
      'creditCard',
      'ssn',
      'socialSecurityNumber',
    ];

    const sanitize = (obj: Record<string, unknown>): Record<string, unknown> => {
      const sanitized: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();

        if (sensitiveFields.some((field) => lowerKey.includes(field))) {
          sanitized[key] = '[REDACTED]';
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
          sanitized[key] = sanitize(value as Record<string, unknown>);
        } else if (Array.isArray(value)) {
          sanitized[key] = value.map((item) =>
            typeof item === 'object' && item !== null
              ? sanitize(item as Record<string, unknown>)
              : item,
          );
        } else {
          sanitized[key] = value;
        }
      }

      return sanitized;
    };

    return sanitize(data as Record<string, unknown>);
  }

  private sanitizeHeaders(headers: Record<string, unknown>): Record<string, unknown> {
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
      'x-access-token',
    ];

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private getResponseSize(data: unknown): string {
    if (!data) return '0 bytes';

    try {
      const jsonString = JSON.stringify(data);
      const bytes = Buffer.byteLength(jsonString, 'utf8');

      if (bytes < 1024) return `${bytes} bytes`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } catch {
      return 'unknown';
    }
  }
}
