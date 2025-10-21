# Inventory Seeder

Database seeding tool for Inventory Service that synchronizes product data from Orders Service and generates inventory items with realistic stock levels.

## Overview

The seeder connects to both Orders and Inventory Service databases, fetches active products, and creates corresponding inventory items with configurable stock levels and reservations based on the selected dataset type.

## Features

- ✅ **Multi-Dataset Support**: dev, test, demo datasets with different characteristics
- ✅ **Database Synchronization**: Automatically syncs product IDs from Orders to Inventory
- ✅ **Configurable Stock Levels**: Different distribution strategies per dataset
- ✅ **Realistic Reservations**: Simulates pending orders with reserved quantities
- ✅ **Batch Processing**: Efficient batch inserts for large datasets
- ✅ **Idempotent**: Clears existing data before seeding (safe re-runs)
- ✅ **Environment-Based Config**: Configurable via environment variables
- ✅ **Comprehensive Testing**: Unit + integration tests with Testcontainers

## Datasets

### Dev Dataset (default)

Seeds 100 products with balanced, realistic stock levels:

- **20% low stock** (1-9 items) - Critical stock situations
- **60% medium stock** (10-100 items) - Normal operation
- **20% high stock** (100-500 items) - Popular/bulk products
- **Reservations**: 0-30% of quantity (realistic pending orders)

**Use Case**: Local development, manual testing, demos

### Test Dataset

Seeds 20 products with predictable, reproducible scenarios:

- **Quantities**: Fixed values (0, 1, 5, 10, 50, 100)
- **Reservations**: None (clean state for testing)
- **Reproducibility**: Fixed seed for consistent results

**Use Case**: Automated testing, CI/CD pipelines

### Demo Dataset

Seeds 10 products with extreme edge cases:

- **Scenarios**:
  - Out of stock (0)
  - Last item (1)
  - Very low stock (5)
  - Medium stock (100)
  - High stock (1000)
- **Reservations**: High rate (30-70%) for demonstration

**Use Case**: Feature demos, presentations, edge case validation

## Installation

```bash
cd services/inventory-service
go build -o bin/seeder ./cmd/seeder
```

## Usage

### Basic Usage

```bash
# Seed dev dataset (default, 100 products)
go run cmd/seeder/main.go

# Or using compiled binary
./bin/seeder
```

### With Specific Dataset

```bash
# Seed test dataset (20 products, predictable)
go run cmd/seeder/main.go -dataset=test

# Seed demo dataset (10 products, extreme scenarios)
go run cmd/seeder/main.go -dataset=demo
```

### With Custom Database Configuration

```bash
# Using environment variables
ORDERS_DB_HOST=localhost \
ORDERS_DB_PORT=5433 \
ORDERS_DB_NAME=microservices_orders \
INVENTORY_DB_HOST=localhost \
INVENTORY_DB_PORT=5433 \
INVENTORY_DB_NAME=microservices_inventory \
go run cmd/seeder/main.go -dataset=dev
```

### Help

```bash
go run cmd/seeder/main.go -help
```

## Configuration

### Environment Variables

#### Orders Service Database

| Variable             | Default                   | Description          |
| -------------------- | ------------------------- | -------------------- |
| `ORDERS_DB_HOST`     | `localhost`               | Orders database host |
| `ORDERS_DB_PORT`     | `5433`                    | Orders database port |
| `ORDERS_DB_USER`     | `microservices_user`      | Database user        |
| `ORDERS_DB_PASSWORD` | `microservices_pass_2024` | Database password    |
| `ORDERS_DB_NAME`     | `microservices_orders`    | Database name        |

#### Inventory Service Database

| Variable                | Default                   | Description             |
| ----------------------- | ------------------------- | ----------------------- |
| `INVENTORY_DB_HOST`     | `localhost`               | Inventory database host |
| `INVENTORY_DB_PORT`     | `5433`                    | Inventory database port |
| `INVENTORY_DB_USER`     | `microservices_user`      | Database user           |
| `INVENTORY_DB_PASSWORD` | `microservices_pass_2024` | Database password       |
| `INVENTORY_DB_NAME`     | `microservices_inventory` | Database name           |

### Command-Line Flags

| Flag       | Type   | Default | Description                   |
| ---------- | ------ | ------- | ----------------------------- |
| `-dataset` | string | `dev`   | Dataset type: dev, test, demo |
| `-help`    | bool   | `false` | Show help message             |

## Development

### Prerequisites

- Go 1.25+
- PostgreSQL 16+ (for both Orders and Inventory databases)
- Access to both database instances

### Running Tests

```bash
# Run unit tests only (fast)
go test -v ./cmd/seeder/... -short

# Run all tests including integration (uses Testcontainers)
go test -v ./cmd/seeder/...

# Run specific test
go test -v ./cmd/seeder/... -run TestSeeder_Integration

# With coverage
go test -v ./cmd/seeder/... -coverprofile=coverage.out
go tool cover -html=coverage.out
```

### Code Quality

```bash
# Format code
gofmt -w ./cmd/seeder/

# Lint code
go vet ./cmd/seeder/...

# Build
go build -o bin/seeder ./cmd/seeder
```

## Architecture

```
┌─────────────────────────┐
│   Orders Service DB     │
│  (microservices_orders) │
│                         │
│  ┌─────────────┐       │
│  │  products   │       │
│  │  - id (UUID)│       │
│  │  - name     │       │
│  │  - sku      │       │
│  │  - price    │       │
│  └─────────────┘       │
└───────────┬─────────────┘
            │
            │ Fetch active products
            │
            ▼
    ┌───────────────┐
    │    Seeder     │
    │               │
    │ - Fetch       │
    │ - Generate    │
    │ - Insert      │
    └───────┬───────┘
            │
            │ Sync inventory items
            │
            ▼
┌─────────────────────────┐
│ Inventory Service DB    │
│ (microservices_inventory│
│                         │
│  ┌──────────────────┐  │
│  │ inventory_items  │  │
│  │ - id (UUID)      │  │
│  │ - product_id     │  │
│  │ - quantity       │  │
│  │ - reserved       │  │
│  │ - version        │  │
│  └──────────────────┘  │
└─────────────────────────┘
```

## Dataset Characteristics Comparison

| Characteristic         | Dev                 | Test        | Demo    |
| ---------------------- | ------------------- | ----------- | ------- |
| **Products**           | 100                 | 20          | 10      |
| **Stock Distribution** | Balanced (20/60/20) | Predictable | Extreme |
| **Quantity Range**     | 1-500               | 0-100       | 0-1000  |
| **Reservations**       | 0-30%               | None        | 30-70%  |
| **Use Case**           | Development         | Testing     | Demos   |
| **Reproducibility**    | Random              | Fixed       | Random  |

## Troubleshooting

### Error: "no products found in Orders Service database"

**Cause**: Orders Service database is empty or has no active products.

**Solution**:

1. Verify Orders Service database has products:
   ```sql
   SELECT COUNT(*) FROM products WHERE is_active = true AND deleted_at IS NULL;
   ```
2. Seed Orders Service first if needed
3. Check database connection credentials

### Error: "failed to connect to database"

**Cause**: Database connection parameters are incorrect.

**Solution**:

1. Verify database is running: `docker ps | grep postgres`
2. Check connection parameters (host, port, user, password)
3. Test connection manually:
   ```bash
   psql -h localhost -p 5433 -U microservices_user -d microservices_inventory
   ```

### Error: "foreign key constraint violation"

**Cause**: Migrations not applied to Inventory database.

**Solution**:

```bash
cd services/inventory-service/migrations
psql -U microservices_user -d microservices_inventory \
  -f 001_create_inventory_items_table.up.sql
psql -U microservices_user -d microservices_inventory \
  -f 002_create_reservations_table.up.sql
```

## Integration with CI/CD

Example GitHub Actions workflow:

```yaml
- name: Seed test data
  env:
    ORDERS_DB_HOST: localhost
    ORDERS_DB_PORT: 5432
    INVENTORY_DB_HOST: localhost
    INVENTORY_DB_PORT: 5432
  run: |
    cd services/inventory-service
    go run cmd/seeder/main.go -dataset=test
```

## Examples

### Seed Dev Dataset for Local Development

```bash
# Start databases
docker-compose up -d ecommerce-postgres-dev

# Run seeder
cd services/inventory-service
go run cmd/seeder/main.go -dataset=dev

# Verify
psql -U microservices_user -d microservices_inventory -c \
  "SELECT COUNT(*), SUM(quantity), SUM(reserved) FROM inventory_items;"
```

### Seed Test Dataset for CI/CD

```bash
# In CI pipeline
go run cmd/seeder/main.go -dataset=test

# Run integration tests
go test ./tests/integration/...
```

### Seed Demo Dataset for Presentation

```bash
# Seed extreme scenarios
go run cmd/seeder/main.go -dataset=demo

# Start API server
go run cmd/api/main.go

# Demo API calls
curl http://localhost:8080/api/inventory/stats
```

## Performance

- **Dev dataset (100 products)**: ~500ms
- **Test dataset (20 products)**: ~200ms
- **Demo dataset (10 products)**: ~150ms

Performance measured on:

- PostgreSQL 16 (local)
- Go 1.25
- Batch size: 50 items/batch

## Maintenance

### Adding New Datasets

1. Define new constant in `main.go`:

   ```go
   const DatasetProduction = "prod"
   ```

2. Add to `getProductLimit()`:

   ```go
   case DatasetProduction:
       return 1000
   ```

3. Implement generator functions:

   ```go
   func (s *Seeder) generateProductionQuantity(rnd *rand.Rand) int {
       // Your logic
   }
   ```

4. Add to `generateInventoryItems()` switch case

5. Update tests and documentation

## License

Part of microservices-ecommerce-system project.

## Support

For issues or questions:

- Check [Troubleshooting](#troubleshooting) section
- Review integration tests in `main_test.go`
- Contact backend team
