import { app } from './app';
import { config } from './config';
import { logger } from './logger';

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
