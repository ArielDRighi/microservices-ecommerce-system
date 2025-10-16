import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialSchema1727215000000 implements MigrationInterface {
  name = 'CreateInitialSchema1727215000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Create custom types for enums
    await queryRunner.query(`
      CREATE TYPE "order_status_enum" AS ENUM (
        'PENDING', 'PROCESSING', 'PAYMENT_PENDING', 'PAYMENT_FAILED', 
        'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "saga_status_enum" AS ENUM (
        'STARTED', 'RUNNING', 'COMPLETED', 'FAILED', 'RETRYING', 
        'COMPENSATING', 'COMPENSATED', 'COMPENSATION_FAILED', 
        'CANCELLED', 'TIMEOUT'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "inventory_movement_type_enum" AS ENUM (
        'RESTOCK', 'SALE', 'RETURN', 'ADJUSTMENT', 'RESERVATION', 
        'RELEASE_RESERVATION', 'DAMAGE', 'THEFT', 'TRANSFER_IN', 
        'TRANSFER_OUT', 'EXPIRED', 'QUALITY_CONTROL', 
        'MANUAL_CORRECTION', 'SYSTEM_CORRECTION'
      )
    `);

    // Create Users table (aligned with User entity)
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying(255) NOT NULL,
        "password_hash" character varying(255) NOT NULL,
        "first_name" character varying(100) NOT NULL,
        "last_name" character varying(100) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "phone_number" character varying(20),
        "date_of_birth" date,
        "language" character varying(10) DEFAULT 'en',
        "timezone" character varying(10) DEFAULT 'UTC',
        "email_verified_at" timestamptz,
        "last_login_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);

    // Create Products table (aligned with Product entity, no category)
    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "description" text,
        "price" decimal(10,2) NOT NULL,
        "sku" character varying(100) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "brand" character varying(50),
        "weight" decimal(8,3),
        "attributes" jsonb,
        "images" character varying[],
        "tags" character varying[],
        "cost_price" decimal(10,2),
        "compare_at_price" decimal(10,2),
        "track_inventory" boolean NOT NULL DEFAULT true,
        "minimum_stock" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "PK_products_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_products_sku" UNIQUE ("sku")
      )
    `);

    // Create Orders table (aligned with Order entity)
    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "status" order_status_enum NOT NULL DEFAULT 'PENDING',
        "total_amount" decimal(10,2) NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'USD',
        "idempotency_key" character varying(255),
        "payment_id" character varying(255),
        "subtotal_amount" decimal(10,2),
        "tax_amount" decimal(10,2),
        "shipping_amount" decimal(10,2),
        "discount_amount" decimal(10,2),
        "discount_code" character varying(100),
        "shipping_address" jsonb,
        "billing_address" jsonb,
        "notes" text,
        "processing_started_at" timestamptz,
        "completed_at" timestamptz,
        "failed_at" timestamptz,
        "failure_reason" text,
        "tracking_number" character varying(100),
        "shipping_carrier" character varying(100),
        "shipped_at" timestamptz,
        "delivered_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_orders_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_orders_idempotency_key" UNIQUE ("idempotency_key"),
        CONSTRAINT "FK_orders_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    // Create Order Items table (aligned with OrderItem entity)
    await queryRunner.query(`
      CREATE TABLE "order_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL,
        "product_id" uuid NOT NULL,
        "sku" character varying(100) NOT NULL,
        "product_name" character varying(255) NOT NULL,
        "quantity" integer NOT NULL DEFAULT 1,
        "unit_price" decimal(10,2) NOT NULL,
        "total_price" decimal(10,2) NOT NULL,
        "original_price" decimal(10,2),
        "discount_amount" decimal(10,2),
        "discount_percentage" decimal(5,2),
        "discount_code" character varying(100),
        "currency" character varying(3) NOT NULL DEFAULT 'USD',
        "product_attributes" jsonb,
        "notes" text,
        "is_refunded" boolean NOT NULL DEFAULT false,
        "refunded_amount" decimal(10,2),
        "refunded_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_order_items_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_order_items_order_product" UNIQUE ("order_id", "product_id"),
        CONSTRAINT "FK_order_items_order_id" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_order_items_product_id" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    // Create Inventory table (aligned with Inventory entity)
    await queryRunner.query(`
      CREATE TABLE "inventory" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "product_id" uuid NOT NULL,
        "sku" character varying(100) NOT NULL,
        "location" character varying(100) NOT NULL DEFAULT 'MAIN_WAREHOUSE',
        "current_stock" integer NOT NULL DEFAULT 0,
        "reserved_stock" integer NOT NULL DEFAULT 0,
        "minimum_stock" integer NOT NULL DEFAULT 0,
        "maximum_stock" integer,
        "reorder_point" integer,
        "reorder_quantity" integer,
        "average_cost" decimal(10,2),
        "last_cost" decimal(10,2),
        "currency" character varying(3) NOT NULL DEFAULT 'USD',
        "last_movement_at" timestamptz,
        "last_restock_at" timestamptz,
        "next_expected_restock" timestamptz,
        "is_active" boolean NOT NULL DEFAULT true,
        "auto_reorder_enabled" boolean NOT NULL DEFAULT false,
        "metadata" jsonb,
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inventory_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_inventory_product_location" UNIQUE ("product_id", "location"),
        CONSTRAINT "FK_inventory_product_id" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // Create Inventory Movements table (aligned with InventoryMovement entity)
    await queryRunner.query(`
      CREATE TABLE "inventory_movements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "inventory_id" uuid NOT NULL,
        "movement_type" inventory_movement_type_enum NOT NULL,
        "quantity" integer NOT NULL,
        "stock_before" integer NOT NULL,
        "stock_after" integer NOT NULL,
        "unit_cost" decimal(10,2),
        "reference_id" character varying(255),
        "reference_type" character varying(100),
        "reason" text,
        "performed_by" character varying(100),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inventory_movements_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_inventory_movements_inventory_id" FOREIGN KEY ("inventory_id") REFERENCES "inventory"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    // Create Saga States table (aligned with SagaState entity)
    await queryRunner.query(`
      CREATE TABLE "saga_states" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "saga_type" character varying(255) NOT NULL,
        "correlation_id" character varying(255) NOT NULL,
        "status" saga_status_enum NOT NULL DEFAULT 'STARTED',
        "current_step" character varying(255) NOT NULL,
        "step_sequence" integer NOT NULL DEFAULT 0,
        "saga_data" jsonb NOT NULL,
        "compensation_data" jsonb,
        "completed_steps" text[] DEFAULT '{}',
        "failed_steps" text[] DEFAULT '{}',
        "compensated_steps" text[] DEFAULT '{}',
        "retry_count" integer NOT NULL DEFAULT 0,
        "max_retries" integer NOT NULL DEFAULT 3,
        "next_step_at" timestamptz,
        "started_at" timestamptz,
        "completed_at" timestamptz,
        "failed_at" timestamptz,
        "failure_reason" text,
        "last_error" text,
        "initiator_id" character varying(100),
        "aggregate_id" character varying(100),
        "aggregate_type" character varying(100),
        "metadata" jsonb,
        "expires_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_saga_states_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_saga_states_correlation_id" UNIQUE ("correlation_id")
      )
    `);

    // Create Outbox Events table (aligned with OutboxEvent entity)
    await queryRunner.query(`
      CREATE TABLE "outbox_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "aggregate_type" character varying(255) NOT NULL,
        "aggregate_id" uuid NOT NULL,
        "event_type" character varying(255) NOT NULL,
        "event_data" jsonb NOT NULL,
        "event_metadata" jsonb,
        "sequence_number" bigint NOT NULL,
        "idempotency_key" character varying(255) NOT NULL,
        "processed" boolean NOT NULL DEFAULT false,
        "processed_at" timestamptz,
        "retry_count" integer NOT NULL DEFAULT 0,
        "max_retries" integer NOT NULL DEFAULT 5,
        "next_retry_at" timestamptz,
        "last_error" text,
        "correlation_id" character varying(100),
        "causation_id" character varying(100),
        "user_id" character varying(100),
        "priority" character varying(50) NOT NULL DEFAULT 'low',
        "scheduled_for" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_outbox_events_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_outbox_events_idempotency_key" UNIQUE ("idempotency_key")
      )
    `);

    // Create indexes for Users
    await queryRunner.query('CREATE INDEX "idx_users_email" ON "users" ("email")');
    await queryRunner.query('CREATE INDEX "idx_users_active" ON "users" ("is_active")');
    await queryRunner.query('CREATE INDEX "idx_users_created_at" ON "users" ("created_at")');
    await queryRunner.query('CREATE UNIQUE INDEX "idx_users_email_btree" ON "users" ("email")');
    await queryRunner.query('CREATE INDEX "idx_users_is_active" ON "users" ("is_active")');

    // Create indexes for Products
    await queryRunner.query('CREATE UNIQUE INDEX "idx_products_sku" ON "products" ("sku")');
    await queryRunner.query('CREATE INDEX "idx_products_name" ON "products" ("name")');
    await queryRunner.query('CREATE INDEX "idx_products_active" ON "products" ("is_active")');
    await queryRunner.query('CREATE INDEX "idx_products_price" ON "products" ("price")');
    await queryRunner.query('CREATE INDEX "idx_products_created_at" ON "products" ("created_at")');
    await queryRunner.query(
      'CREATE INDEX "idx_products_name_description" ON "products" USING GIN (to_tsvector(\'english\', "name" || \' \' || COALESCE("description", \'\')))',
    );
    await queryRunner.query('CREATE INDEX "idx_products_name_btree" ON "products" ("name")');
    await queryRunner.query('CREATE UNIQUE INDEX "idx_products_sku_btree" ON "products" ("sku")');
    await queryRunner.query('CREATE INDEX "idx_products_price_btree" ON "products" ("price")');

    // Create indexes for Orders
    await queryRunner.query('CREATE INDEX "idx_orders_user_id" ON "orders" ("user_id")');
    await queryRunner.query('CREATE INDEX "idx_orders_status" ON "orders" ("status")');
    await queryRunner.query(
      'CREATE UNIQUE INDEX "idx_orders_idempotency_key" ON "orders" ("idempotency_key") WHERE "idempotency_key" IS NOT NULL',
    );
    await queryRunner.query('CREATE INDEX "idx_orders_created_at" ON "orders" ("created_at")');
    await queryRunner.query(
      'CREATE INDEX "idx_orders_payment_id" ON "orders" ("payment_id") WHERE "payment_id" IS NOT NULL',
    );
    await queryRunner.query('CREATE INDEX "idx_orders_user_id_btree" ON "orders" ("user_id")');
    await queryRunner.query('CREATE INDEX "idx_orders_status_btree" ON "orders" ("status")');
    await queryRunner.query(
      'CREATE UNIQUE INDEX "idx_orders_idempotency_key_btree" ON "orders" ("idempotency_key") WHERE "idempotency_key" IS NOT NULL',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_orders_payment_id_btree" ON "orders" ("payment_id") WHERE "payment_id" IS NOT NULL',
    );

    // Create indexes for Order Items
    await queryRunner.query(
      'CREATE INDEX "idx_order_items_order_id" ON "order_items" ("order_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_order_items_product_id" ON "order_items" ("product_id")',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "idx_order_items_order_product" ON "order_items" ("order_id", "product_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_order_items_order_id_btree" ON "order_items" ("order_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_order_items_product_id_btree" ON "order_items" ("product_id")',
    );

    // Create indexes for Inventory
    await queryRunner.query(
      'CREATE INDEX "idx_inventory_product_id" ON "inventory" ("product_id")',
    );
    await queryRunner.query('CREATE INDEX "idx_inventory_location" ON "inventory" ("location")');
    await queryRunner.query('CREATE INDEX "idx_inventory_sku" ON "inventory" ("sku")');
    await queryRunner.query(
      'CREATE INDEX "idx_inventory_low_stock" ON "inventory" ("current_stock", "minimum_stock")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_inventory_product_id_btree" ON "inventory" ("product_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_inventory_location_btree" ON "inventory" ("location")',
    );
    await queryRunner.query('CREATE INDEX "idx_inventory_sku_btree" ON "inventory" ("sku")');
    await queryRunner.query(
      'CREATE INDEX "idx_inventory_current_stock" ON "inventory" ("current_stock")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_inventory_minimum_stock" ON "inventory" ("minimum_stock")',
    );

    // Create indexes for Inventory Movements
    await queryRunner.query(
      'CREATE INDEX "idx_inventory_movements_inventory_id" ON "inventory_movements" ("inventory_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_inventory_movements_type" ON "inventory_movements" ("movement_type")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_inventory_movements_created_at" ON "inventory_movements" ("created_at")',
    );

    // Create indexes for Saga States
    await queryRunner.query(
      'CREATE INDEX "idx_saga_states_saga_type" ON "saga_states" ("saga_type")',
    );
    await queryRunner.query('CREATE INDEX "idx_saga_states_status" ON "saga_states" ("status")');
    await queryRunner.query(
      'CREATE UNIQUE INDEX "idx_saga_states_correlation_id" ON "saga_states" ("correlation_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_saga_states_created_at" ON "saga_states" ("created_at")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_saga_states_next_step_at" ON "saga_states" ("next_step_at") WHERE "next_step_at" IS NOT NULL',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_saga_states_saga_type_btree" ON "saga_states" ("saga_type")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_saga_states_status_btree" ON "saga_states" ("status")',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "idx_saga_states_correlation_id_btree" ON "saga_states" ("correlation_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_saga_states_next_step_at_btree" ON "saga_states" ("next_step_at") WHERE "next_step_at" IS NOT NULL',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_saga_states_initiator_id" ON "saga_states" ("initiator_id") WHERE "initiator_id" IS NOT NULL',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_saga_states_aggregate_id" ON "saga_states" ("aggregate_id") WHERE "aggregate_id" IS NOT NULL',
    );

    // Create indexes for Outbox Events
    await queryRunner.query(
      'CREATE INDEX "idx_outbox_events_processed" ON "outbox_events" ("processed")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_outbox_events_event_type" ON "outbox_events" ("event_type")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_outbox_events_created_at" ON "outbox_events" ("created_at")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_outbox_events_aggregate_id" ON "outbox_events" ("aggregate_id")',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "idx_outbox_events_idempotency_key" ON "outbox_events" ("idempotency_key")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_outbox_events_aggregate_type" ON "outbox_events" ("aggregate_type")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_outbox_events_aggregate_id_btree" ON "outbox_events" ("aggregate_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_outbox_events_event_type_btree" ON "outbox_events" ("event_type")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_outbox_events_processed_btree" ON "outbox_events" ("processed")',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "idx_outbox_events_idempotency_key_btree" ON "outbox_events" ("idempotency_key")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_outbox_events_sequence" ON "outbox_events" ("sequence_number")',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_outbox_events_correlation_id" ON "outbox_events" ("correlation_id") WHERE "correlation_id" IS NOT NULL',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_outbox_events_user_id" ON "outbox_events" ("user_id") WHERE "user_id" IS NOT NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order to handle foreign key constraints
    await queryRunner.query('DROP TABLE IF EXISTS "outbox_events"');
    await queryRunner.query('DROP TABLE IF EXISTS "saga_states"');
    await queryRunner.query('DROP TABLE IF EXISTS "inventory_movements"');
    await queryRunner.query('DROP TABLE IF EXISTS "inventory"');
    await queryRunner.query('DROP TABLE IF EXISTS "order_items"');
    await queryRunner.query('DROP TABLE IF EXISTS "orders"');
    await queryRunner.query('DROP TABLE IF EXISTS "products"');
    await queryRunner.query('DROP TABLE IF EXISTS "users"');

    // Drop custom types
    await queryRunner.query('DROP TYPE IF EXISTS "inventory_movement_type_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "saga_status_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "order_status_enum"');

    // Drop extension
    await queryRunner.query('DROP EXTENSION IF EXISTS "uuid-ossp"');
  }
}
