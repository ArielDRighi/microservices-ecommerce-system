import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig = registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env['DATABASE_HOST'] || 'localhost',
    port: parseInt(process.env['DATABASE_PORT'] || '5432', 10),
    username: process.env['DATABASE_USERNAME'] || 'postgres',
    password: process.env['DATABASE_PASSWORD'] || 'password',
    database: process.env['DATABASE_NAME'] || 'ecommerce_async',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
    synchronize: process.env['NODE_ENV'] !== 'production',
    logging: process.env['NODE_ENV'] === 'development',
    ssl: process.env['DATABASE_SSL'] === 'true' ? { rejectUnauthorized: false } : false,
    retryAttempts: 3,
    retryDelay: 3000,
    migrationsRun: process.env['RUN_MIGRATIONS'] === 'true',
    migrationsTableName: 'migrations',
    maxQueryExecutionTime: 10000, // Log queries that take more than 10 seconds
  }),
);
