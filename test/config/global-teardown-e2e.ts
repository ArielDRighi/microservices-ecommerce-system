/**
 * Global Teardown for E2E Tests
 * Runs once after all E2E tests
 */

import Redis from 'ioredis';
import * as dotenv from 'dotenv';
import * as path from 'path';

export default async () => {
  console.log('🧹 Cleaning up E2E test environment...');

  // Load test environment variables
  const envPath = path.resolve(process.cwd(), '.env.test');
  dotenv.config({ path: envPath });

  try {
    // 1. Cleanup Redis test data
    await cleanupRedis();

    console.log('✅ E2E test environment cleanup complete');
  } catch (error) {
    console.warn('⚠️ Some cleanup operations failed, but this is not critical:', error);
  }
};

/**
 * Cleanup Redis test database
 */
async function cleanupRedis(): Promise<void> {
  console.log('🧹 Cleaning up Redis test data...');

  const redis = new Redis({
    host: process.env['REDIS_HOST'] || 'localhost',
    port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
    db: parseInt(process.env['REDIS_DB'] || '1', 10), // Use DB 1 for tests
    password: process.env['REDIS_PASSWORD'] || undefined,
    connectTimeout: 5000,
    lazyConnect: true,
    maxRetriesPerRequest: 1, // Don't retry much during cleanup
  });

  try {
    await redis.connect();

    // Clear all test data
    await redis.flushdb();
    console.log('✅ Redis test database cleared');

    await redis.quit();
    console.log('✅ Redis cleanup connection closed');
  } catch (error) {
    console.warn('⚠️ Redis cleanup failed (non-critical):', error);
    try {
      await redis.disconnect();
    } catch {
      // Ignore disconnect errors during cleanup
    }
  }
}
