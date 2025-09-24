-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Users table
CREATE TABLE "users" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "email" character varying(255) NOT NULL,
  "password_hash" character varying(255) NOT NULL,
  "first_name" character varying(100) NOT NULL,
  "last_name" character varying(100) NOT NULL,
  "phone" character varying(20),
  "avatar_url" character varying(500),
  "date_of_birth" date,
  "is_active" boolean NOT NULL DEFAULT true,
  "is_verified" boolean NOT NULL DEFAULT false,
  "last_login_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
  "deleted_at" TIMESTAMP,
  CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_users_email" UNIQUE ("email")
);

-- Create Products table
CREATE TABLE "products" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" character varying(255) NOT NULL,
  "description" text,
  "short_description" character varying(500),
  "sku" character varying(100) NOT NULL,
  "price" decimal(10,2) NOT NULL,
  "compare_price" decimal(10,2),
  "cost_price" decimal(10,2),
  "weight" decimal(8,2),
  "dimensions" jsonb,
  "images" jsonb,
  "attributes" jsonb,
  "tags" text[],
  "category_id" uuid,
  "brand" character varying(100),
  "is_active" boolean NOT NULL DEFAULT true,
  "is_featured" boolean NOT NULL DEFAULT false,
  "requires_shipping" boolean NOT NULL DEFAULT true,
  "track_inventory" boolean NOT NULL DEFAULT true,
  "meta_title" character varying(255),
  "meta_description" character varying(500),
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
  "deleted_at" TIMESTAMP,
  CONSTRAINT "PK_products_id" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_products_sku" UNIQUE ("sku")
);

-- Create Orders table
CREATE TABLE "orders" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "order_number" character varying(50) NOT NULL,
  "user_id" uuid NOT NULL,
  "status" character varying(50) NOT NULL DEFAULT 'PENDING',
  "payment_status" character varying(50) NOT NULL DEFAULT 'PENDING',
  "fulfillment_status" character varying(50) NOT NULL DEFAULT 'PENDING',
  "subtotal_amount" decimal(10,2) NOT NULL DEFAULT 0,
  "tax_amount" decimal(10,2) NOT NULL DEFAULT 0,
  "shipping_amount" decimal(10,2) NOT NULL DEFAULT 0,
  "discount_amount" decimal(10,2) NOT NULL DEFAULT 0,
  "total_amount" decimal(10,2) NOT NULL,
  "currency" character varying(3) NOT NULL DEFAULT 'USD',
  "idempotency_key" character varying(255),
  "payment_id" character varying(255),
  "shipping_address" jsonb,
  "billing_address" jsonb,
  "notes" text,
  "processing_started_at" TIMESTAMP,
  "completed_at" TIMESTAMP,
  "cancelled_at" TIMESTAMP,
  "failed_at" TIMESTAMP,
  "failure_reason" text,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_orders_id" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_orders_number" UNIQUE ("order_number"),
  CONSTRAINT "UQ_orders_idempotency_key" UNIQUE ("idempotency_key"),
  CONSTRAINT "FK_orders_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- Create Order Items table
CREATE TABLE "order_items" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "order_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "variant_id" uuid,
  "quantity" integer NOT NULL,
  "unit_price" decimal(10,2) NOT NULL,
  "total_price" decimal(10,2) NOT NULL,
  "product_snapshot" jsonb,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_order_items_id" PRIMARY KEY ("id"),
  CONSTRAINT "FK_order_items_order_id" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "FK_order_items_product_id" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- Create Inventory table
CREATE TABLE "inventory" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "product_id" uuid NOT NULL,
  "location_id" character varying(50) DEFAULT 'main',
  "quantity" integer NOT NULL DEFAULT 0,
  "reserved_quantity" integer NOT NULL DEFAULT 0,
  "committed_quantity" integer NOT NULL DEFAULT 0,
  "available_quantity" integer GENERATED ALWAYS AS (quantity - reserved_quantity - committed_quantity) STORED,
  "reorder_point" integer NOT NULL DEFAULT 0,
  "reorder_quantity" integer NOT NULL DEFAULT 0,
  "cost_per_unit" decimal(10,2),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_inventory_id" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_inventory_product_location" UNIQUE ("product_id", "location_id"),
  CONSTRAINT "FK_inventory_product_id" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- Create Outbox Events table (Outbox Pattern)
CREATE TABLE "outbox_events" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "aggregate_id" uuid NOT NULL,
  "aggregate_type" character varying(100) NOT NULL,
  "event_type" character varying(100) NOT NULL,
  "event_version" character varying(10) NOT NULL DEFAULT '1.0',
  "event_data" jsonb NOT NULL,
  "metadata" jsonb,
  "processed" boolean NOT NULL DEFAULT false,
  "processed_at" TIMESTAMP,
  "retry_count" integer NOT NULL DEFAULT 0,
  "error_message" text,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_outbox_events_id" PRIMARY KEY ("id")
);

-- Create Saga State table
CREATE TABLE "saga_state" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "saga_type" character varying(100) NOT NULL,
  "saga_id" character varying(100) NOT NULL,
  "aggregate_id" uuid NOT NULL,
  "current_step" character varying(100) NOT NULL,
  "status" character varying(50) NOT NULL DEFAULT 'IN_PROGRESS',
  "state_data" jsonb NOT NULL,
  "completed" boolean NOT NULL DEFAULT false,
  "compensated" boolean NOT NULL DEFAULT false,
  "error_message" text,
  "started_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
  "completed_at" TIMESTAMP,
  "expires_at" TIMESTAMP,
  CONSTRAINT "PK_saga_state_id" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_saga_state_saga_id" UNIQUE ("saga_id")
);

-- Create indexes for optimization
CREATE INDEX "IDX_users_email" ON "users" ("email");
CREATE INDEX "IDX_users_active" ON "users" ("is_active");
CREATE INDEX "IDX_users_created_at" ON "users" ("created_at");

CREATE INDEX "IDX_products_sku" ON "products" ("sku");
CREATE INDEX "IDX_products_active" ON "products" ("is_active");
CREATE INDEX "IDX_products_category" ON "products" ("category_id");
CREATE INDEX "IDX_products_brand" ON "products" ("brand");
CREATE INDEX "IDX_products_price" ON "products" ("price");

CREATE INDEX "IDX_orders_user_id" ON "orders" ("user_id");
CREATE INDEX "IDX_orders_status" ON "orders" ("status");
CREATE INDEX "IDX_orders_payment_status" ON "orders" ("payment_status");
CREATE INDEX "IDX_orders_created_at" ON "orders" ("created_at");
CREATE INDEX "IDX_orders_idempotency_key" ON "orders" ("idempotency_key");

CREATE INDEX "IDX_order_items_order_id" ON "order_items" ("order_id");
CREATE INDEX "IDX_order_items_product_id" ON "order_items" ("product_id");

CREATE INDEX "IDX_inventory_product_id" ON "inventory" ("product_id");
CREATE INDEX "IDX_inventory_location" ON "inventory" ("location_id");
CREATE INDEX "IDX_inventory_low_stock" ON "inventory" ("available_quantity", "reorder_point");

CREATE INDEX "IDX_outbox_processed" ON "outbox_events" ("processed");
CREATE INDEX "IDX_outbox_aggregate" ON "outbox_events" ("aggregate_id", "aggregate_type");
CREATE INDEX "IDX_outbox_created_at" ON "outbox_events" ("created_at");

CREATE INDEX "IDX_saga_status" ON "saga_state" ("status");
CREATE INDEX "IDX_saga_type" ON "saga_state" ("saga_type");
CREATE INDEX "IDX_saga_aggregate" ON "saga_state" ("aggregate_id");
CREATE INDEX "IDX_saga_expires_at" ON "saga_state" ("expires_at");