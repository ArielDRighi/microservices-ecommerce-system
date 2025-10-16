import { registerAs } from '@nestjs/config';
import { BullModuleOptions } from '@nestjs/bull';
import { RedisOptions } from 'ioredis';

export interface QueueConfig {
  name: string;
  limiter?: {
    max: number;
    duration: number;
  };
  defaultJobOptions?: {
    attempts?: number;
    backoff?: {
      type: 'fixed' | 'exponential';
      delay: number;
    };
    removeOnComplete?: boolean | number;
    removeOnFail?: boolean | number;
  };
}

/**
 * Redis Configuration for caching and general use
 * Optimized for connection pooling and memory management
 */
export const redisConfig = registerAs(
  'redis',
  (): RedisOptions => ({
    host: process.env['REDIS_HOST'] || 'localhost',
    port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
    password: process.env['REDIS_PASSWORD'],
    db: parseInt(process.env['REDIS_DB'] || '0', 10),

    // Connection Management
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 1000, 10000); // Max 10s delay
      return delay;
    },
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000, // 30 seconds
    family: 4, // IPv4

    // Performance & Memory Optimization
    keyPrefix: process.env['REDIS_KEY_PREFIX'] || 'ecommerce:',
    enableOfflineQueue: true,
    enableReadyCheck: true,
    connectionName: 'ecommerce-redis',

    // Timeouts
    connectTimeout: 10000, // 10 seconds
    commandTimeout: 5000, // 5 seconds

    // Cluster support (for production)
    ...(process.env['REDIS_CLUSTER'] === 'true' && {
      enableAutoPipelining: true,
      maxRedirections: 16,
    }),
  }),
);

/**
 * Bull Queue Configuration
 * Optimized for job processing with retry policies and rate limiting
 */
export const bullConfig = registerAs(
  'bull',
  (): BullModuleOptions => ({
    redis: {
      host: process.env['REDIS_HOST'] || 'localhost',
      port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
      password: process.env['REDIS_PASSWORD'],
      db: parseInt(process.env['BULL_REDIS_DB'] || '1', 10), // Separate DB for Bull

      // Connection settings optimized for Bull
      maxRetriesPerRequest: null, // Bull manages retries
      enableReadyCheck: false,
      enableOfflineQueue: true, // Debe estar en true para Bull
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    },

    // Default job options for all queues
    defaultJobOptions: {
      // Retention: Keep completed jobs for debugging
      removeOnComplete: 100, // Keep last 100 completed jobs
      removeOnFail: 50, // Keep last 50 failed jobs

      // Retry configuration with exponential backoff
      attempts: parseInt(process.env['BULL_DEFAULT_ATTEMPTS'] || '3', 10),
      backoff: {
        type: 'exponential',
        delay: 2000, // Start with 2s, then 4s, 8s, etc.
      },

      // Job timeout
      timeout: 60000, // 60 seconds default

      // Stack traces for debugging
      stackTraceLimit: 50,
    },

    // Advanced Bull options
    prefix: process.env['BULL_KEY_PREFIX'] || 'bull',

    // Rate limiter settings (can be overridden per queue)
    limiter: process.env['BULL_RATE_LIMIT']
      ? {
          max: parseInt(process.env['BULL_RATE_LIMIT_MAX'] || '100', 10),
          duration: parseInt(process.env['BULL_RATE_LIMIT_DURATION'] || '1000', 10),
        }
      : undefined,

    settings: {
      // Lock duration for job processing
      lockDuration: 30000, // 30 seconds
      lockRenewTime: 15000, // Renew lock every 15 seconds

      // Stalled job detection
      stalledInterval: 30000, // Check for stalled jobs every 30s
      maxStalledCount: 2, // Max times a job can be recovered

      // Guard against memory leaks
      guardInterval: 5000,
      retryProcessDelay: 5000,
    },
  }),
);

/**
 * Queue-specific configurations
 * Customize settings per queue type
 */
export const queueConfigs: Record<string, QueueConfig> = {
  'order-processing': {
    name: 'order-processing',
    limiter: {
      max: 50, // 50 jobs
      duration: 1000, // per second
    },
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
      removeOnComplete: 200,
      removeOnFail: 100,
    },
  },
  'payment-processing': {
    name: 'payment-processing',
    limiter: {
      max: 20, // More conservative for payments
      duration: 1000,
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000, // Longer delays for payment retries
      },
      removeOnComplete: 500, // Keep more payment records
      removeOnFail: 200,
    },
  },
  'inventory-management': {
    name: 'inventory-management',
    limiter: {
      max: 100, // High throughput for inventory
      duration: 1000,
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  },
  'notification-sending': {
    name: 'notification-sending',
    limiter: {
      max: 200, // High volume for notifications
      duration: 1000,
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'fixed',
        delay: 5000, // Fixed delay for notifications
      },
      removeOnComplete: 50,
      removeOnFail: 100,
    },
  },
};
