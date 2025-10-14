import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddRoleToUsers1728843437000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create enum type for user roles
    await queryRunner.query(`
      CREATE TYPE user_role_enum AS ENUM ('ADMIN', 'USER');
    `);

    // 2. Add role column to users table with default value 'USER'
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'role',
        type: 'user_role_enum',
        default: "'USER'",
        isNullable: false,
      }),
    );

    // 3. Create index on role column for query optimization
    await queryRunner.query(`
      CREATE INDEX "idx_users_role" ON "users" ("role");
    `);

    // 4. Update admin@test.com user to ADMIN role (if exists)
    await queryRunner.query(`
      UPDATE users 
      SET role = 'ADMIN' 
      WHERE email = 'admin@test.com';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop the index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_users_role";
    `);

    // 2. Drop the role column
    await queryRunner.dropColumn('users', 'role');

    // 3. Drop the enum type
    await queryRunner.query(`
      DROP TYPE IF EXISTS user_role_enum;
    `);
  }
}
