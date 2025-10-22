import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../logger';

/**
 * Request/Response Logging Middleware
 * - Generates or preserves correlation IDs
 * - Logs response times
 * - Logs request/response metadata
 * - Enhances debugging and tracing
 */
export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Generate or preserve correlation ID
  const correlationId = (req.headers['x-correlation-id'] as string) || randomUUID();
  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);

  // Extract request metadata
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.ip ||
    'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  // Log request
  logger.info('[Request] Incoming request', {
    correlationId,
    method: req.method,
    path: req.path,
    ip,
    userAgent,
  });

  // Override res.send to capture response
  const originalSend = res.send;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  res.send = function (data: any): Response {
    const responseTime = Date.now() - startTime;
    res.setHeader('X-Response-Time', `${responseTime}ms`);

    // Log response
    logger.info('[Response] Outgoing response', {
      correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
    });

    // Call original send
    return originalSend.call(this, data);
  };

  next();
}
