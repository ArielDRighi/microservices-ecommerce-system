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
  // Connects to ecommerce-postgres-dev container (port 5433)
  // Uses separate test database to avoid corrupting development data
  const testDataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5433, // ecommerce-postgres-dev container
    username: 'postgres',
    password: 'password',
    database: 'ecommerce_async_dev_test', // Separate test database
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
