import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDeletedAtToUsers1760404000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'deleted_at',
        type: 'timestamptz',
        isNullable: true,
        default: null,
      }),
    );

    // Create index for better query performance on soft-deleted records
    await queryRunner.query(`
      CREATE INDEX "IDX_users_deleted_at" ON "users" ("deleted_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_users_deleted_at"`);
    await queryRunner.dropColumn('users', 'deleted_at');
  }
}
