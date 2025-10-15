/**
 * Setup E2E Testing Environment
 * Runs once before all E2E tests
 */

import { DataSource } from 'typeorm';

// Polyfill for crypto in Node 18+ for @nestjs/schedule
import { webcrypto } from 'crypto';
if (!globalThis.crypto) {
  // @ts-expect-error - polyfill for Node 18 compatibility
  globalThis.crypto = webcrypto;
}

// Set default timeout for all E2E tests
jest.setTimeout(60000);

// Global test database connection
let testDataSource: DataSource;

/**
 * Setup function that runs before all tests
 */
beforeAll(async () => {
  console.log('🔧 Setting up E2E test environment...');

  // Create test database connection
  testDataSource = new DataSource({
    type: 'postgres',
    host: process.env['DATABASE_HOST'] || 'localhost',
    port: parseInt(process.env['DATABASE_PORT'] || '5432', 10),
    username: process.env['DATABASE_USER'] || 'postgres',
    password: process.env['DATABASE_PASSWORD'] || 'postgres',
    database: process.env['DATABASE_NAME'] || 'ecommerce_async_test',
    entities: ['src/**/*.entity{.ts,.js}'],
    synchronize: true, // Auto-create schema for tests
    dropSchema: true, // Drop and recreate schema for clean slate
    logging: false,
  });

  try {
    await testDataSource.initialize();
    console.log('✅ Test database connection established');

    // Clean all tables before tests
    const entities = testDataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = testDataSource.getRepository(entity.name);
      await repository.query(`TRUNCATE TABLE "${entity.tableName}" CASCADE;`);
    }
    console.log('✅ Database tables cleaned');
  } catch (error) {
    console.error('❌ Failed to initialize test database:', error);
    throw error;
  }
});

/**
 * Cleanup function that runs after all tests
 */
afterAll(async () => {
  console.log('🧹 Cleaning up E2E test environment...');

  if (testDataSource && testDataSource.isInitialized) {
    await testDataSource.destroy();
    console.log('✅ Test database connection closed');
  }
});

/**
 * Export test data source for use in tests
 */
export { testDataSource };
