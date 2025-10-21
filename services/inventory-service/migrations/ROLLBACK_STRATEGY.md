# Migration Rollback Strategy

This document describes the comprehensive rollback strategy for Inventory Service database migrations.

## Overview

The Inventory Service uses a dual-migration system where every `.up.sql` migration has a corresponding `.down.sql` rollback migration. This ensures safe reversibility of all schema changes.

## Available Rollback Migrations

### 002 - Rollback Reservations Table

**File:** `002_create_reservations_table.down.sql`

```sql
DROP TABLE IF EXISTS reservations CASCADE;
```

**What it does:**

- Drops the `reservations` table completely
- Cascades to dependent objects (if any)
- ⚠️ **Data Loss**: All reservation records will be deleted

**When to use:**

- Need to remove reservation functionality
- Migration to a different reservation model
- Critical schema error in reservations table

### 001 - Rollback Inventory Items Table

**File:** `001_create_inventory_items_table.down.sql`

```sql
DROP TABLE IF EXISTS inventory_items CASCADE;
```

**What it does:**

- Drops the `inventory_items` table completely
- Cascades to dependent tables (reservations via FK)
- ⚠️ **Data Loss**: All inventory data will be deleted

**When to use:**

- Complete reset of inventory schema
- Major schema redesign
- Critical database corruption

## Rollback Execution Methods

### Method 1: Using golang-migrate CLI (Recommended)

#### Rollback Last Migration

```bash
migrate -path ./migrations \
        -database "postgresql://user:password@localhost:5432/inventory_db?sslmode=disable" \
        down 1
```

#### Rollback to Specific Version

```bash
# Rollback to version 1 (removes migration 002)
migrate -path ./migrations \
        -database "postgresql://user:password@localhost:5432/inventory_db?sslmode=disable" \
        force 1
```

#### Rollback All Migrations

```bash
migrate -path ./migrations \
        -database "postgresql://user:password@localhost:5432/inventory_db?sslmode=disable" \
        down
```

### Method 2: Using psql Directly

#### Rollback in Correct Order (Important!)

```bash
# IMPORTANT: Rollback in reverse order (002, then 001)

# Step 1: Rollback reservations (002)
psql -U microservices_user -d microservices_inventory \
     -f migrations/002_create_reservations_table.down.sql

# Step 2: Rollback inventory_items (001)
psql -U microservices_user -d microservices_inventory \
     -f migrations/001_create_inventory_items_table.down.sql
```

### Method 3: Using Rollback Script

A convenience script is provided in `scripts/rollback-migrations.sh`:

```bash
# Rollback last migration
./scripts/rollback-migrations.sh --steps 1

# Rollback to specific version
./scripts/rollback-migrations.sh --to-version 1

# Rollback all migrations
./scripts/rollback-migrations.sh --all
```

## Rollback Scenarios

### Scenario 1: Bug in Latest Migration (002)

**Problem:** Migration 002 introduced a bug in reservations schema.

**Solution:**

```bash
# Rollback migration 002
migrate -database $DB_URL down 1

# Fix the bug in 002_create_reservations_table.up.sql

# Re-apply migration
migrate -database $DB_URL up 1
```

**Result:** Reservations table removed and recreated with fix.

### Scenario 2: Need to Redesign Entire Schema

**Problem:** Complete schema redesign required.

**Solution:**

```bash
# Backup current data
pg_dump -U microservices_user microservices_inventory > backup.sql

# Rollback all migrations
migrate -database $DB_URL down

# Update migration files with new schema

# Apply new migrations
migrate -database $DB_URL up

# Migrate data if needed (custom script)
```

### Scenario 3: Dirty Migration State

**Problem:** Migration failed midway, database in inconsistent state.

**Symptoms:**

```
error: Dirty database version 2. Fix and force version.
```

**Solution:**

```bash
# Check current state
migrate -database $DB_URL version
# Output: 2/d (dirty)

# Manually fix database (inspect what failed)
psql -U microservices_user -d microservices_inventory

# Check schema state
\dt  # List tables
\d+ inventory_items  # Describe table

# Force clean state after manual fix
migrate -database $DB_URL force 1

# Re-apply migration
migrate -database $DB_URL up
```

### Scenario 4: Prod Rollback with Zero Downtime

**Problem:** Production migration caused issues, need immediate rollback.

**Procedure:**

1. **Prepare** (before rollback):

   ```bash
   # Take full backup
   pg_dump -U user -d inventory_db > prod_backup_$(date +%Y%m%d_%H%M%S).sql

   # Verify backup
   pg_restore --list prod_backup_*.sql | head
   ```

2. **Execute Rollback** (maintenance window):

   ```bash
   # Stop application servers (prevent writes)
   docker-compose stop inventory-service

   # Rollback migration
   migrate -database $PROD_DB_URL down 1

   # Verify schema
   psql $PROD_DB_URL -c "\dt"

   # Restart with previous application version
   docker-compose up -d inventory-service
   ```

3. **Validate** (post-rollback):

   ```bash
   # Health check
   curl http://inventory-service/health

   # Smoke tests
   curl http://inventory-service/api/inventory/:productId

   # Monitor logs
   docker-compose logs -f inventory-service
   ```

4. **Document**:
   - Record rollback time and reason
   - Update incident report
   - Plan fix deployment

## Pre-Rollback Checklist

Before rolling back any migration:

- [ ] **Backup Database**

  ```bash
  pg_dump -U microservices_user microservices_inventory \
          -f backup_before_rollback_$(date +%Y%m%d).sql
  ```

- [ ] **Identify Dependencies**

  ```sql
  -- Check for dependent objects
  SELECT * FROM pg_depend WHERE refobjid = 'inventory_items'::regclass;
  ```

- [ ] **Notify Team**

  - Alert developers of planned rollback
  - Schedule maintenance window if production
  - Coordinate with ops team

- [ ] **Stop Application**

  ```bash
  docker-compose stop inventory-service
  ```

- [ ] **Verify Rollback Script**

  ```bash
  # Dry run on test database first
  psql -U test -d test_inventory -f migrations/002_*.down.sql
  ```

- [ ] **Prepare Monitoring**
  - Set up alerts for errors
  - Monitor application logs
  - Watch database performance metrics

## Post-Rollback Verification

After rollback, verify database state:

### 1. Check Schema

```bash
psql -U microservices_user -d microservices_inventory
```

```sql
-- List all tables
\dt

-- Check specific table structure
\d+ inventory_items

-- Verify indexes
\di

-- Check constraints
SELECT conname, contype FROM pg_constraint WHERE conrelid = 'inventory_items'::regclass;
```

### 2. Verify Data Integrity

```sql
-- Count records
SELECT COUNT(*) FROM inventory_items;

-- Check for orphaned records (if rolling back only 002)
SELECT i.* FROM inventory_items i
LEFT JOIN reservations r ON i.id = r.inventory_item_id
WHERE r.id IS NOT NULL;
-- Should be 0 if 002 was rolled back
```

### 3. Test Application

```bash
# Start service
docker-compose up -d inventory-service

# Run health check
curl http://localhost:8080/health

# Test API endpoints
curl http://localhost:8080/api/inventory/:productId
```

### 4. Run Integration Tests

```bash
cd services/inventory-service
go test ./tests/integration/...
```

## Common Rollback Errors

### Error 1: Foreign Key Constraint Violation

**Error:**

```
ERROR: cannot drop table inventory_items because other objects depend on it
DETAIL: constraint fk_reservations_inventory_item on table reservations depends on table inventory_items
```

**Solution:**

```sql
-- Use CASCADE to drop dependent objects
DROP TABLE inventory_items CASCADE;
```

### Error 2: Table Does Not Exist

**Error:**

```
ERROR: table "reservations" does not exist
```

**Solution:**

- Table already dropped or never created
- Check migration history
- Safe to ignore if table should not exist

### Error 3: Permission Denied

**Error:**

```
ERROR: permission denied for table inventory_items
```

**Solution:**

```bash
# Use superuser or table owner
psql -U postgres -d microservices_inventory -f migrations/001_*.down.sql
```

## Testing Rollbacks

### Test Rollback in Development

```bash
# 1. Apply migrations
migrate -database $DEV_DB_URL up

# 2. Seed test data
go run cmd/seeder/main.go -dataset=test

# 3. Verify data exists
psql $DEV_DB_URL -c "SELECT COUNT(*) FROM inventory_items;"

# 4. Rollback
migrate -database $DEV_DB_URL down 1

# 5. Verify table is gone
psql $DEV_DB_URL -c "\dt"

# 6. Re-apply
migrate -database $DEV_DB_URL up
```

### Automated Rollback Tests

```bash
cd services/inventory-service
go test ./migrations/... -run TestMigration_RollbackIdempotent
```

## Rollback Decision Matrix

| Scenario                | Rollback Strategy          | Risk Level | Recommended Action              |
| ----------------------- | -------------------------- | ---------- | ------------------------------- |
| Bug in latest migration | Rollback last (down 1)     | Low        | Safe to proceed                 |
| Data corruption         | Full backup + rollback     | Medium     | Test in staging first           |
| Schema redesign         | Rollback all               | High       | Plan migration strategy         |
| Production issue        | Targeted rollback          | High       | Full backup, maintenance window |
| Dirty migration state   | Force version + manual fix | Medium     | Inspect schema carefully        |

## Best Practices

1. **Always Backup First**

   - Take full backup before any rollback
   - Store backups with timestamps
   - Verify backup integrity

2. **Test in Lower Environments**

   - Never rollback in production first
   - Test in dev → staging → production
   - Document results at each stage

3. **Use Version Control**

   - Track all migration changes in git
   - Tag migration versions
   - Document breaking changes

4. **Coordinate with Team**

   - Notify team before rollback
   - Schedule maintenance windows
   - Have rollback plan reviewed

5. **Monitor After Rollback**

   - Watch application logs
   - Monitor database performance
   - Run smoke tests

6. **Document Everything**
   - Record reason for rollback
   - Document steps taken
   - Note any issues encountered

## Rollback Script

Location: `services/inventory-service/scripts/rollback-migrations.sh`

```bash
#!/bin/bash
# Usage: ./scripts/rollback-migrations.sh [--steps N | --to-version N | --all]

# See script for full implementation
```

## Emergency Contacts

For rollback assistance:

- **Database Team**: db-team@company.com
- **DevOps**: devops@company.com
- **On-Call Engineer**: Check PagerDuty

## Further Reading

- [golang-migrate Documentation](https://github.com/golang-migrate/migrate)
- [PostgreSQL Backup/Restore](https://www.postgresql.org/docs/current/backup.html)
- [Migration Best Practices](../MIGRATION_BEST_PRACTICES.md)

## Changelog

- **2025-10-20**: Initial rollback strategy document created
- **Epic 2.3.4**: Migrations 001 and 002 created with rollback support
- **Epic 2.7.4**: Comprehensive rollback documentation added
