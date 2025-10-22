import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../logger';

// Initialize Redis client
let redisClient: Redis;

try {
  redisClient = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: config.redis.db,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  redisClient.on('error', (err) => {
    logger.error('Redis connection error:', err);
  });

  redisClient.on('connect', () => {
    logger.info('Redis connected for rate limiting');
  });
} catch (error) {
  logger.error('Failed to initialize Redis client:', error);
}

/**
 * Extract client IP address from request
 */
function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.ip ||
    'unknown'
  );
}

/**
 * Rate limiter middleware
 * Implements token bucket algorithm using Redis
 * - 100 requests per minute per IP
 * - Fail-open if Redis is unavailable
 */
export async function rateLimiterMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const ip = getClientIp(req);
  const key = `ratelimit:${ip}`;
  const limit = config.rateLimit.max;
  const windowMs = config.rateLimit.windowMs;
  const windowSeconds = Math.floor(windowMs / 1000);

  try {
    // Increment request count
    const requests = await redisClient.incr(key);

    // Set expiry on first request in window
    if (requests === 1) {
      await redisClient.expire(key, windowSeconds);
    }

    // Get TTL for reset time
    const ttl = await redisClient.ttl(key);
    const resetTime = Date.now() + ttl * 1000;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - requests).toString());
    res.setHeader('X-RateLimit-Reset', resetTime.toString());

    // Check if limit exceeded
    if (requests > limit) {
      logger.warn(`Rate limit exceeded for IP: ${ip}`, {
        ip,
        requests,
        limit,
        path: req.path,
      });

      res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Maximum ${limit} requests per ${windowSeconds} seconds.`,
        retryAfter: ttl,
      });
      return;
    }

    next();
  } catch (error) {
    // Fail-open: allow request if Redis is unavailable
    logger.error('Rate limiter error:', error);
    logger.warn('Rate limiter bypassed due to Redis error', {
      ip,
      path: req.path,
    });
    next();
  }
}
