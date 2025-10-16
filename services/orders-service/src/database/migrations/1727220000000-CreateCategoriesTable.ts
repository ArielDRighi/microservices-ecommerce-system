import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCategoriesTable1727220000000 implements MigrationInterface {
  name = 'CreateCategoriesTable1727220000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create categories table
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(255) NOT NULL,
        "description" text,
        "slug" character varying(255) NOT NULL,
        "parentId" uuid,
        "isActive" boolean NOT NULL DEFAULT true,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "metadata" jsonb,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        CONSTRAINT "PK_categories" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_categories_slug" UNIQUE ("slug"),
        CONSTRAINT "FK_categories_parent" FOREIGN KEY ("parentId") 
          REFERENCES "categories"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    await queryRunner.query(`
      CREATE INDEX "IDX_categories_name" ON "categories" ("name")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_categories_parentId" ON "categories" ("parentId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_categories_isActive" ON "categories" ("isActive")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_categories_sortOrder" ON "categories" ("sortOrder")
    `);

    // Composite index for hierarchical queries
    await queryRunner.query(`
      CREATE INDEX "IDX_categories_parent_active" ON "categories" ("parentId", "isActive")
    `);

    // Composite index for sorting within same level
    await queryRunner.query(`
      CREATE INDEX "IDX_categories_sort_name" ON "categories" ("sortOrder", "name")
    `);

    // Index for soft delete queries
    await queryRunner.query(`
      CREATE INDEX "IDX_categories_deletedAt" ON "categories" ("deletedAt")
    `);

    // Create trigger to auto-update updatedAt timestamp
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_categories_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW."updatedAt" = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_categories_updated_at 
      BEFORE UPDATE ON "categories" 
      FOR EACH ROW 
      EXECUTE FUNCTION update_categories_updated_at()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger and function
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_categories_updated_at ON "categories"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_categories_updated_at()`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_categories_deletedAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_categories_sort_name"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_categories_parent_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_categories_sortOrder"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_categories_isActive"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_categories_parentId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_categories_name"`);

    // Drop table (this will also drop the foreign key constraint)
    await queryRunner.query(`DROP TABLE IF EXISTS "categories"`);
  }
}
