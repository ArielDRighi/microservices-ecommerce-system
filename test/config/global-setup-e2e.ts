/**
 * Global Setup for E2E Tests
 * Runs once before all E2E tests
 */

import { DataSource } from 'typeorm';

// Polyfill for crypto in Node 18+ for @nestjs/schedule
import { webcrypto } from 'crypto';
if (!globalThis.crypto) {
  // @ts-expect-error - polyfill for Node 18 compatibility
  globalThis.crypto = webcrypto;
}

export default async () => {
  console.log('🔧 Setting up E2E test environment...');

  // Create test database connection
  // Uses environment variables to support both local dev and CI environments
  // Local dev: port 5433 (docker-compose.dev.yml)
  // CI: port 5432 (GitHub Actions service container)
  const testDataSource = new DataSource({
    type: 'postgres',
    host: process.env['DATABASE_HOST'] || 'localhost',
    port: parseInt(process.env['DATABASE_PORT'] || '5433', 10),
    username: process.env['DATABASE_USERNAME'] || process.env['DATABASE_USER'] || 'postgres',
    password: process.env['DATABASE_PASSWORD'] || 'password',
    database: process.env['DATABASE_NAME'] || 'ecommerce_async_dev_test',
    entities: ['src/**/*.entity{.ts,.js}'],
    synchronize: false, // Use existing schema (migrations handle this)
    dropSchema: false, // Don't drop schema
    logging: false,
  });

  try {
    await testDataSource.initialize();
    console.log('✅ Test database connection established');
    console.log('✅ Database schema created and ready for tests');

    // Close the connection after setup
    await testDataSource.destroy();
    console.log('✅ Setup connection closed');
  } catch (error) {
    console.error('❌ Failed to initialize test database:', error);
    throw error;
  }
};
