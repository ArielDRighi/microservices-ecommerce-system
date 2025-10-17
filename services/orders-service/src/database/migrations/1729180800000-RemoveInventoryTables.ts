import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Remove Inventory Tables
 *
 * Epic 1.6 - Refactoring del Orders Service para Microservicios
 *
 * Contexto:
 * El Orders Service fue diseñado como monolito con lógica de inventario interna.
 * En la arquitectura de microservicios, toda la gestión de stock se delega
 * al Inventory Service (Go). Esta migración elimina las tablas de inventario
 * del Orders Service.
 *
 * Tablas eliminadas:
 * - inventory_movements (con FK a inventory)
 * - inventory (con FK a products)
 * - inventory_movement_type_enum (enum)
 *
 * IMPORTANTE:
 * - Esta migración es IRREVERSIBLE en producción (datos se pierden)
 * - En desarrollo, el rollback recrea las tablas vacías
 * - Ejecutar SOLO después de migrar datos al Inventory Service
 *
 * @author Ariel D. Righi
 * @date 2025-10-17
 */
export class RemoveInventoryTables1729180800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop indexes first (if they exist)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inventory_product_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inventory_movements_inventory_id"`);

    // 2. Drop inventory_movements table (has FK to inventory)
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_movements"`);

    // 3. Drop inventory table (has FK to products)
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory"`);

    // 4. Drop enum type
    await queryRunner.query(`DROP TYPE IF EXISTS "inventory_movement_type_enum"`);

    console.log('✅ [Migration] Inventory tables removed successfully (Epic 1.6)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.warn('⚠️  [Migration Rollback] Recreating inventory tables (EMPTY - data lost)');

    // 1. Recreate enum
    await queryRunner.query(`
      CREATE TYPE "inventory_movement_type_enum" AS ENUM (
        'PURCHASE',
        'SALE',
        'ADJUSTMENT',
        'RETURN',
        'TRANSFER_IN',
        'TRANSFER_OUT',
        'DAMAGE',
        'THEFT'
      )
    `);

    // 2. Recreate inventory table
    await queryRunner.query(`
      CREATE TABLE "inventory" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "product_id" uuid NOT NULL,
        "quantity" integer NOT NULL DEFAULT 0,
        "reserved_quantity" integer NOT NULL DEFAULT 0,
        "available_quantity" integer NOT NULL DEFAULT 0,
        "minimum_stock" integer NOT NULL DEFAULT 0,
        "maximum_stock" integer,
        "reorder_point" integer,
        "reorder_quantity" integer,
        "location" character varying(100) NOT NULL DEFAULT 'DEFAULT',
        "last_stock_check" TIMESTAMP,
        "notes" text,
        "version" integer NOT NULL DEFAULT 1,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_inventory_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_inventory_product_location" UNIQUE ("product_id", "location"),
        CONSTRAINT "FK_inventory_product_id" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // 3. Recreate inventory_movements table
    await queryRunner.query(`
      CREATE TABLE "inventory_movements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "inventory_id" uuid NOT NULL,
        "movement_type" inventory_movement_type_enum NOT NULL,
        "quantity" integer NOT NULL,
        "reference_id" uuid,
        "reference_type" character varying(50),
        "notes" text,
        "performed_by" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_inventory_movements_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_inventory_movements_inventory_id" FOREIGN KEY ("inventory_id") REFERENCES "inventory"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // 4. Recreate indexes
    await queryRunner.query(
      `CREATE INDEX "idx_inventory_product_id" ON "inventory" ("product_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_inventory_movements_inventory_id" ON "inventory_movements" ("inventory_id")`,
    );

    console.log('✅ [Migration Rollback] Inventory tables recreated (EMPTY)');
  }
}
