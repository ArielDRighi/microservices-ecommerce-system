import { Logger } from '@nestjs/common';

// Test script para validar sistema de logging
const logger = new Logger('LoggingTest');

export function testLoggingLevels() {
  logger.log('=== Testing Logging System ===');

  // Test different log levels
  logger.debug('Debug message - only shown in development');
  logger.log('Info message - general information');
  logger.warn('Warning message - something unexpected happened');
  logger.error('Error message - something went wrong');

  // Test structured logging
  logger.log({
    message: 'Structured log entry',
    userId: '123e4567-e89b-12d3-a456-426614174000',
    action: 'user_login',
    timestamp: new Date().toISOString(),
    metadata: {
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0...',
    },
  });

  // Test error logging with stack trace
  try {
    throw new Error('Test error for logging validation');
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Test error caught:', error.stack);
    }
  }

  logger.log('=== Logging Test Completed ===');
}

// Execute if run directly
if (require.main === module) {
  testLoggingLevels();
}
