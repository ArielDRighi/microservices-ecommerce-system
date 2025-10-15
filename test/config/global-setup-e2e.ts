/**
 * Global Setup for E2E Tests
 * Runs once before all E2E tests
 */

import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Polyfill for crypto in Node 18+ for @nestjs/schedule
import { webcrypto } from 'crypto';
if (!globalThis.crypto) {
  // @ts-expect-error - polyfill for Node 18 compatibility
  globalThis.crypto = webcrypto;
}

export default async () => {
  console.log('🔧 Setting up E2E test environment...');

  // Load test environment variables
  const envPath = path.resolve(process.cwd(), '.env.test');
  dotenv.config({ path: envPath });

  try {
    // 1. Setup PostgreSQL Database Connection
    await setupDatabase();

    // 2. Setup Redis Cache/Queue Connection
    await setupRedis();

    console.log('✅ E2E test environment setup complete');
  } catch (error) {
    console.error('❌ Failed to setup E2E test environment:', error);
    throw error;
  }
};

/**
 * Setup PostgreSQL database connection and verify it's ready
 */
async function setupDatabase(): Promise<void> {
  console.log('🔌 Setting up PostgreSQL connection...');

  const testDataSource = new DataSource({
    type: 'postgres',
    host: process.env['DATABASE_HOST'] || 'localhost',
    port: parseInt(process.env['DATABASE_PORT'] || '5432', 10), // Match CI default port
    username: process.env['DATABASE_USERNAME'] || process.env['DATABASE_USER'] || 'test_user',
    password: process.env['DATABASE_PASSWORD'] || 'test_password',
    database: process.env['DATABASE_NAME'] || 'test_db', // Match CI service name
    entities: ['src/**/*.entity{.ts,.js}'],
    synchronize: true, // Auto-create schema for tests
    dropSchema: false, // Don't drop schema
    logging: false,
    // Enhanced connection options for E2E tests
    connectTimeoutMS: 10000,
    ssl: false,
    extra: {
      max: 1, // Limit connections for tests
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 10000,
    },
  });

  try {
    await testDataSource.initialize();
    console.log('✅ PostgreSQL connection established');

    // Verify database is accessible
    await testDataSource.query('SELECT 1 as test');
    console.log('✅ Database verification successful');

    // Close the setup connection
    await testDataSource.destroy();
    console.log('✅ Setup connection closed');
  } catch (error) {
    console.error('❌ PostgreSQL setup failed:', error);

    // Enhanced error reporting
    if (error instanceof Error) {
      if (error.message.includes('authentication failed')) {
        console.error(
          '💡 Check that PostgreSQL container is running: docker-compose up -d postgres',
        );
        console.error('💡 Verify credentials in docker-compose.yml match .env.test');
      }
      if (error.message.includes('ECONNREFUSED')) {
        console.error(
          '💡 PostgreSQL server is not accessible. Start it with: docker-compose up -d postgres',
        );
      }
    }

    throw error;
  }
}

/**
 * Setup Redis connection and prepare test database
 */
async function setupRedis(): Promise<void> {
  console.log('🔌 Setting up Redis connection...');

  const redis = new Redis({
    host: process.env['REDIS_HOST'] || 'localhost',
    port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
    db: parseInt(process.env['REDIS_DB'] || '1', 10), // Use DB 1 for tests
    password: process.env['REDIS_PASSWORD'] || undefined,
    connectTimeout: 10000,
    lazyConnect: true,
    maxRetriesPerRequest: 3,
  });

  try {
    await redis.connect();
    console.log('✅ Redis connection established');

    // Clear test database
    await redis.flushdb();
    console.log('✅ Redis test database cleared');

    await redis.quit();
    console.log('✅ Redis setup connection closed');
  } catch (error) {
    console.error('❌ Redis setup failed:', error);

    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        console.error(
          '💡 Redis server is not accessible. Start it with: docker-compose up -d redis',
        );
      }
    }

    throw error;
  }
}
