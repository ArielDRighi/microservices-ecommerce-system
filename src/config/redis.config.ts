import { registerAs } from '@nestjs/config';
import { BullModuleOptions } from '@nestjs/bull';

export const redisConfig = registerAs('redis', () => ({
  host: process.env['REDIS_HOST'] || 'localhost',
  port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
  password: process.env['REDIS_PASSWORD'],
  db: parseInt(process.env['REDIS_DB'] || '0', 10),
  retryAttempts: 3,
  retryDelay: 3000,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  family: 4, // 4 (IPv4) or 6 (IPv6)
  keyPrefix: process.env['REDIS_KEY_PREFIX'] || 'ecommerce:',
}));

export const bullConfig = registerAs(
  'bull',
  (): BullModuleOptions => ({
    redis: {
      host: process.env['REDIS_HOST'] || 'localhost',
      port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
      password: process.env['REDIS_PASSWORD'],
      db: parseInt(process.env['REDIS_DB'] || '0', 10),
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: true,
    },
    defaultJobOptions: {
      removeOnComplete: parseInt(process.env['BULL_REMOVE_ON_COMPLETE'] || '100', 10),
      removeOnFail: parseInt(process.env['BULL_REMOVE_ON_FAIL'] || '50', 10),
      attempts: parseInt(process.env['BULL_ATTEMPTS'] || '3', 10),
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  }),
);
