import express, { Request, Response } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config';
import { logger } from './logger';
import { ordersProxy, inventoryProxy } from './middleware/proxy';
import { authMiddleware } from './middleware/auth';
import { rateLimiterMiddleware } from './middleware/rateLimiter';
import { requestLoggingMiddleware } from './middleware/requestLogging';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
  }),
);

// Compression
app.use(compression());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request/Response logging with correlation IDs
app.use(requestLoggingMiddleware);

// HTTP logging
app.use(
  morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  }),
);

// Rate limiting (applied globally)
app.use(rateLimiterMiddleware);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'api-gateway',
    uptime: process.uptime(),
  });
});

// Readiness check (for K8s)
app.get('/ready', (_req: Request, res: Response) => {
  // TODO: Add checks for downstream services
  res.status(200).json({
    status: 'READY',
    timestamp: new Date().toISOString(),
  });
});

// Proxy routes (protected with JWT authentication)
app.use('/api/orders', authMiddleware, ordersProxy);
app.use('/api/inventory', authMiddleware, inventoryProxy);

export { app };
