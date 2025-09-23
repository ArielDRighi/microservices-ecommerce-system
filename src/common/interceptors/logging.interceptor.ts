import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, body, query, params, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const ip = request.ip || request.connection.remoteAddress;

    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // Add request ID to response headers
    response.setHeader('X-Request-ID', requestId);

    // Log incoming request
    this.logger.log(
      JSON.stringify({
        type: 'REQUEST',
        requestId,
        method,
        url,
        ip,
        userAgent,
        body: this.sanitizeBody(body),
        query,
        params,
        timestamp: new Date().toISOString(),
      }),
    );

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          this.logger.log(
            JSON.stringify({
              type: 'RESPONSE',
              requestId,
              method,
              url,
              statusCode: response.statusCode,
              duration: `${duration}ms`,
              timestamp: new Date().toISOString(),
              responseSize: JSON.stringify(data).length,
            }),
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            JSON.stringify({
              type: 'ERROR',
              requestId,
              method,
              url,
              duration: `${duration}ms`,
              error: error.message,
              stack: error.stack,
              timestamp: new Date().toISOString(),
            }),
          );
        },
      }),
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }
}
