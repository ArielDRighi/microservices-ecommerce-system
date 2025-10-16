import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInventoryReservationsTable1760307900151 implements MigrationInterface {
  name = 'CreateInventoryReservationsTable1760307900151';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create reservation status enum if not exists
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "reservation_status_enum" AS ENUM (
          'ACTIVE', 'RELEASED', 'FULFILLED', 'EXPIRED'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create inventory_reservations table if not exists
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inventory_reservations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "reservation_id" character varying(255) NOT NULL,
        "product_id" uuid NOT NULL,
        "inventory_id" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "location" character varying(100) NOT NULL DEFAULT 'MAIN_WAREHOUSE',
        "status" "reservation_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "reference_id" character varying(255),
        "reason" character varying(500),
        "expires_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inventory_reservations" PRIMARY KEY ("id")
      )
    `);

    // Create unique constraint if not exists
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "inventory_reservations" 
        ADD CONSTRAINT "UQ_inventory_reservations_reservation_id" UNIQUE ("reservation_id");
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create indexes if not exist
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_inventory_reservations_reservation_id" 
      ON "inventory_reservations" ("reservation_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_inventory_reservations_product_location" 
      ON "inventory_reservations" ("product_id", "location")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_inventory_reservations_expires_at" 
      ON "inventory_reservations" ("expires_at")
    `);

    // Add foreign keys if not exist
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "inventory_reservations" 
        ADD CONSTRAINT "FK_inventory_reservations_product" 
        FOREIGN KEY ("product_id") REFERENCES "products"("id") 
        ON DELETE CASCADE ON UPDATE NO ACTION;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "inventory_reservations" 
        ADD CONSTRAINT "FK_inventory_reservations_inventory" 
        FOREIGN KEY ("inventory_id") REFERENCES "inventory"("id") 
        ON DELETE CASCADE ON UPDATE NO ACTION;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.query(`
      ALTER TABLE "inventory_reservations" 
      DROP CONSTRAINT IF EXISTS "FK_inventory_reservations_inventory"
    `);

    await queryRunner.query(`
      ALTER TABLE "inventory_reservations" 
      DROP CONSTRAINT IF EXISTS "FK_inventory_reservations_product"
    `);

    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_inventory_reservations_expires_at"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_inventory_reservations_product_location"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_inventory_reservations_reservation_id"
    `);

    // Drop constraint
    await queryRunner.query(`
      ALTER TABLE "inventory_reservations" 
      DROP CONSTRAINT IF EXISTS "UQ_inventory_reservations_reservation_id"
    `);

    // Drop table
    await queryRunner.query(`
      DROP TABLE IF EXISTS "inventory_reservations"
    `);

    // Drop enum type
    await queryRunner.query(`
      DROP TYPE IF EXISTS "reservation_status_enum"
    `);
  }
}
