import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// Global test setup for E2E tests
beforeAll(async () => {
  // Setup global test configuration
  process.env['NODE_ENV'] = 'test';
  process.env['DATABASE_URL'] =
    process.env['TEST_DATABASE_URL'] || 'postgresql://test:test@localhost:5433/test_ecommerce';
  process.env['REDIS_URL'] = process.env['TEST_REDIS_URL'] || 'redis://localhost:6380';
});

afterAll(async () => {
  // Global cleanup
});

// Utility function to create test app
export const createTestApp = async (): Promise<INestApplication> => {
  const moduleFixture = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: ['.env.test', '.env.example'],
      }),
      // Add basic TypeORM configuration for testing
      TypeOrmModule.forRoot({
        type: 'postgres',
        url: process.env['DATABASE_URL'],
        autoLoadEntities: true,
        synchronize: true,
        dropSchema: true,
      }),
    ],
  }).compile();

  const app = moduleFixture.createNestApplication();
  await app.init();
  return app;
};
