import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../logger';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    logger.warn(`[Auth] No authorization header provided for ${req.method} ${req.url}`);
    res.status(401).json({
      error: 'No token provided',
      message: 'Authorization header is required',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    logger.warn(`[Auth] Invalid authorization header format for ${req.method} ${req.url}`);
    res.status(401).json({
      error: 'Invalid token format',
      message: 'Authorization header must be in format: Bearer <token>',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = decoded;

    // Add user info to headers for downstream services
    req.headers['x-user-id'] = decoded.userId;
    req.headers['x-user-email'] = decoded.email;
    req.headers['x-user-role'] = decoded.role;

    logger.info(`[Auth] User ${decoded.userId} authenticated for ${req.method} ${req.url}`);
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn(`[Auth] Expired token for ${req.method} ${req.url}`);
      res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired. Please login again.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn(`[Auth] Invalid token for ${req.method} ${req.url}: ${error.message}`);
      res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is invalid',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    logger.error(`[Auth] Unexpected error verifying token:`, error);
    res.status(500).json({
      error: 'Authentication error',
      message: 'An unexpected error occurred during authentication',
      timestamp: new Date().toISOString(),
    });
  }
};
