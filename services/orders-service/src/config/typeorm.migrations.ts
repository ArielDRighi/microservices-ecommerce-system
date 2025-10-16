import { DataSource } from 'typeorm';
import { join } from 'path';

export default new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'password',
  database: 'ecommerce_async',

  entities: [join(__dirname, '..', 'modules', '**', 'entities', '*.entity.ts')],
  migrations: [join(__dirname, '..', 'database', 'migrations', '*.ts')],

  synchronize: false,
  logging: true,
  migrationsTableName: 'migrations_history',
});
