import express, { Request, Response } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config';
import { logger } from './logger';

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

// HTTP logging
app.use(
  morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  }),
);

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

// Start server
const server = app.listen(config.port, () => {
  logger.info(`API Gateway listening on port ${config.port}`);
  logger.info(`Environment: ${config.env}`);
  logger.info(`Orders Service: ${config.services.orders.url}`);
  logger.info(`Inventory Service: ${config.services.inventory.url}`);
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(() => {
    logger.info('Server closed. Exiting process.');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

export { app };
