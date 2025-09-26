import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategoryToProducts1727221000000 implements MigrationInterface {
  name = 'AddCategoryToProducts1727221000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add category_id column to products table
    await queryRunner.query(`
      ALTER TABLE "products" 
      ADD COLUMN "category_id" uuid;
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "products" 
      ADD CONSTRAINT "FK_products_category" 
      FOREIGN KEY ("category_id") 
      REFERENCES "categories"("id") 
      ON DELETE SET NULL;
    `);

    // Add index for better query performance
    await queryRunner.query(`
      CREATE INDEX "IDX_products_category_id" 
      ON "products" ("category_id");
    `);

    // Add composite index for category-based product queries
    await queryRunner.query(`
      CREATE INDEX "IDX_products_category_active" 
      ON "products" ("category_id", "is_active");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_category_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_products_category_id"`);

    // Drop foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "FK_products_category"`,
    );

    // Drop column
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "category_id"`);
  }
}
