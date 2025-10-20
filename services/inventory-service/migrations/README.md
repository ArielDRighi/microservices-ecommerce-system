# Database Migrations - Inventory Service

This directory contains SQL migration files for the Inventory Service database schema.

## Migration Files Structure

Migrations follow the naming convention: `{version}_{description}.{direction}.sql`

- **version**: Sequential number (001, 002, etc.)
- **description**: Brief description of the migration
- **direction**: `up` (apply) or `down` (rollback)

## Available Migrations

### 001 - Create inventory_items table

- **File**: `001_create_inventory_items_table.up.sql`
- **Rollback**: `001_create_inventory_items_table.down.sql`
- **Description**: Creates the `inventory_items` table with optimistic locking support
- **Schema**:
  ```sql
  CREATE TABLE inventory_items (
      id UUID PRIMARY KEY,
      product_id UUID NOT NULL UNIQUE,
      quantity INT NOT NULL CHECK (quantity >= 0),
      reserved INT NOT NULL DEFAULT 0 CHECK (reserved >= 0),
      version INT NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
  );
  ```
- **Indexes**:
  - `idx_inventory_product`: Unique index on `product_id`
  - `idx_inventory_product_lookup`: Index on `product_id` for lookups
  - `idx_inventory_stock_levels`: Composite index on `(quantity, reserved)` for low stock queries

### 002 - Create reservations table

- **File**: `002_create_reservations_table.up.sql`
- **Rollback**: `002_create_reservations_table.down.sql`
- **Description**: Creates the `reservations` table for temporary stock reservations
- **Schema**:
  ```sql
  CREATE TABLE reservations (
      id UUID PRIMARY KEY,
      inventory_item_id UUID NOT NULL,
      order_id UUID NOT NULL UNIQUE,
      quantity INT NOT NULL CHECK (quantity > 0),
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
  );
  ```
- **Indexes**:
  - `idx_reservations_order`: Unique index on `order_id`
  - `idx_reservations_inventory_item`: Index on `inventory_item_id`
  - `idx_reservations_status`: Index on `status`
  - `idx_reservations_expires_at`: Index on `expires_at`
  - `idx_reservations_active`: Composite index on `(inventory_item_id, status, expires_at)` for active reservations

## Running Migrations

### Option 1: Using golang-migrate CLI

Install golang-migrate:

```bash
# macOS
brew install golang-migrate

# Linux
curl -L https://github.com/golang-migrate/migrate/releases/download/v4.16.2/migrate.linux-amd64.tar.gz | tar xvz
sudo mv migrate /usr/local/bin/

# Windows
choco install migrate
```

Run migrations:

```bash
# Apply all pending migrations
migrate -path ./migrations -database "postgresql://user:password@localhost:5432/inventory_db?sslmode=disable" up

# Rollback last migration
migrate -path ./migrations -database "postgresql://user:password@localhost:5432/inventory_db?sslmode=disable" down 1

# Force version (use with caution)
migrate -path ./migrations -database "postgresql://user:password@localhost:5432/inventory_db?sslmode=disable" force 2
```

### Option 2: Using psql (PostgreSQL CLI)

Apply migrations manually:

```bash
# Apply migration
psql -U user -d inventory_db -f migrations/001_create_inventory_items_table.up.sql
psql -U user -d inventory_db -f migrations/002_create_reservations_table.up.sql

# Rollback migration
psql -U user -d inventory_db -f migrations/002_create_reservations_table.down.sql
psql -U user -d inventory_db -f migrations/001_create_inventory_items_table.down.sql
```

### Option 3: Using GORM AutoMigrate (Development Only)

In your application code:

```go
import (
    "github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/infrastructure/persistence/model"
)

// Auto-migrate models (development only)
db.AutoMigrate(
    &model.InventoryItemModel{},
    &model.ReservationModel{},
)
```

**⚠️ Warning**: AutoMigrate should only be used in development. Use explicit SQL migrations for production.

## Migration Best Practices

1. **Never modify existing migrations** - Create a new migration instead
2. **Always test rollback** - Ensure `.down.sql` files work correctly
3. **Keep migrations atomic** - One logical change per migration
4. **Include comments** - Document what each migration does
5. **Version control** - Commit migrations with code changes
6. **Backup before migrating** - Always backup production database

## Verifying Migrations

After applying migrations, verify the schema:

```bash
# PostgreSQL
psql -U user -d inventory_db -c "\d inventory_items"
psql -U user -d inventory_db -c "\d reservations"

# Check indexes
psql -U user -d inventory_db -c "\di"
```

## Troubleshooting

### Migration version mismatch

```bash
# Check current version
migrate -path ./migrations -database "..." version

# Force to specific version (use with caution)
migrate -path ./migrations -database "..." force 1
```

### Dirty database state

If a migration fails midway:

```bash
# Fix manually, then force version
migrate -path ./migrations -database "..." force <version>
```

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
- name: Run database migrations
  run: |
    migrate -path ./services/inventory-service/migrations \
            -database "${{ secrets.DATABASE_URL }}" \
            up
```

## Schema Diagram

```
┌─────────────────────┐
│  inventory_items    │
├─────────────────────┤
│ id (PK)            │
│ product_id (UNIQUE)│
│ quantity           │
│ reserved           │
│ version            │
│ created_at         │
│ updated_at         │
└─────────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────────┐
│   reservations      │
├─────────────────────┤
│ id (PK)            │
│ inventory_item_id  │
│ order_id (UNIQUE)  │
│ quantity           │
│ status             │
│ expires_at         │
│ created_at         │
│ updated_at         │
└─────────────────────┘
```

## Support

For issues or questions about migrations, contact the backend team.
