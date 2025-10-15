import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables - try .env.{NODE_ENV} first, fallback to .env
const envFile = `.env.${process.env['NODE_ENV'] || 'development'}`;
config({ path: envFile });
// Fallback to .env if specific env file doesn't exist
config({ path: '.env' });

export default new DataSource({
  type: 'postgres',
  host: process.env['DATABASE_HOST'] || 'localhost',
  port: parseInt(process.env['DATABASE_PORT'] || '5432', 10),
  username: process.env['DATABASE_USERNAME'] || process.env['DATABASE_USER'] || 'postgres',
  password: process.env['DATABASE_PASSWORD'] || 'password',
  database: process.env['DATABASE_NAME'] || 'ecommerce_async',

  entities: [
    join(__dirname, '..', 'modules', '**', 'entities', '*.entity{.ts,.js}'),
    join(__dirname, '..', 'modules', '**', '*.entity{.ts,.js}'),
  ],
  migrations: [join(__dirname, '..', 'database', 'migrations', '*{.ts,.js}')],

  synchronize: false, // Never use synchronize in production
  logging: process.env['NODE_ENV'] === 'development',
  migrationsTableName: 'migrations_history',

  ssl:
    process.env['DATABASE_SSL'] === 'true'
      ? {
          rejectUnauthorized: false,
        }
      : false,
});
