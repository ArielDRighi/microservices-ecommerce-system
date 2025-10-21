package main

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	testcontainerspostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/infrastructure/persistence/model"
)

// TestSynchronizer_getExistingProductIDs verifies existing product ID retrieval
func TestSynchronizer_getExistingProductIDs(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	ctx := context.Background()
	container, db := setupPostgresContainer(t, ctx, "test_existing")
	defer container.Terminate(ctx)

	setupInventorySchema(t, db)

	// Create test inventory items
	existingIDs := []uuid.UUID{
		uuid.New(),
		uuid.New(),
		uuid.New(),
	}

	for _, id := range existingIDs {
		item := model.InventoryItemModel{
			ID:        uuid.New(),
			ProductID: id,
			Quantity:  100,
			Reserved:  0,
			Version:   1,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
		require.NoError(t, db.Create(&item).Error)
	}

	// Test getExistingProductIDs
	sync := NewSynchronizer(db, db, 100, false)
	productIDs, err := sync.getExistingProductIDs(ctx)

	require.NoError(t, err)
	assert.Len(t, productIDs, 3, "Should find 3 existing product IDs")

	for _, id := range existingIDs {
		assert.True(t, productIDs[id], "Product ID %s should exist", id)
	}
}

// TestSynchronizer_fetchProducts verifies product fetching from Orders DB
func TestSynchronizer_fetchProducts(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	ctx := context.Background()
	container, db := setupPostgresContainer(t, ctx, "test_fetch")
	defer container.Terminate(ctx)

	setupOrdersSchema(t, db)

	// Create test products
	products := []ProductRecord{
		{ID: uuid.New(), Name: "Product 1", SKU: "SKU001", Price: 10.0, IsActive: true},
		{ID: uuid.New(), Name: "Product 2", SKU: "SKU002", Price: 20.0, IsActive: true},
		{ID: uuid.New(), Name: "Product 3", SKU: "SKU003", Price: 30.0, IsActive: false},
	}

	for _, product := range products {
		require.NoError(t, db.Create(&product).Error)
	}

	// Test fetchProducts
	sync := NewSynchronizer(db, db, 100, false)
	fetchedProducts, err := sync.fetchProducts(ctx)

	require.NoError(t, err)
	assert.Len(t, fetchedProducts, 3, "Should fetch all products (including inactive)")
}

// TestSynchronizer_DryRunMode verifies dry-run doesn't make changes
func TestSynchronizer_DryRunMode(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	ctx := context.Background()

	// Setup Orders DB
	ordersContainer, ordersDB := setupPostgresContainer(t, ctx, "orders_dryrun")
	defer ordersContainer.Terminate(ctx)
	setupOrdersSchema(t, ordersDB)

	// Setup Inventory DB
	inventoryContainer, inventoryDB := setupPostgresContainer(t, ctx, "inventory_dryrun")
	defer inventoryContainer.Terminate(ctx)
	setupInventorySchema(t, inventoryDB)

	// Seed Orders with 3 products
	seedOrdersProducts(t, ordersDB, 3)

	// Sync in dry-run mode
	sync := NewSynchronizer(ordersDB, inventoryDB, 100, true)
	result, err := sync.Sync(ctx)

	require.NoError(t, err)
	assert.Equal(t, 3, result.TotalProducts, "Should find 3 products")
	assert.Equal(t, 3, result.NewItems, "Should report 3 new items")

	// Verify NO items were created in inventory DB
	var count int64
	inventoryDB.Model(&model.InventoryItemModel{}).Count(&count)
	assert.Equal(t, int64(0), count, "Dry run should not create any items")
}

// TestSynchronizer_SkipsInactiveProducts verifies inactive products are skipped
func TestSynchronizer_SkipsInactiveProducts(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	ctx := context.Background()

	ordersContainer, ordersDB := setupPostgresContainer(t, ctx, "orders_inactive")
	defer ordersContainer.Terminate(ctx)
	setupOrdersSchema(t, ordersDB)

	inventoryContainer, inventoryDB := setupPostgresContainer(t, ctx, "inventory_inactive")
	defer inventoryContainer.Terminate(ctx)
	setupInventorySchema(t, inventoryDB)

	// Seed 2 active + 2 inactive products
	activeProducts := []ProductRecord{
		{ID: uuid.New(), Name: "Active 1", SKU: "ACT001", Price: 10.0, IsActive: true},
		{ID: uuid.New(), Name: "Active 2", SKU: "ACT002", Price: 20.0, IsActive: true},
	}
	inactiveProducts := []ProductRecord{
		{ID: uuid.New(), Name: "Inactive 1", SKU: "INA001", Price: 10.0, IsActive: false},
		{ID: uuid.New(), Name: "Inactive 2", SKU: "INA002", Price: 20.0, IsActive: false},
	}

	for _, p := range activeProducts {
		require.NoError(t, ordersDB.Create(&p).Error)
	}
	for _, p := range inactiveProducts {
		require.NoError(t, ordersDB.Create(&p).Error)
	}

	// Sync
	sync := NewSynchronizer(ordersDB, inventoryDB, 100, false)
	result, err := sync.Sync(ctx)

	require.NoError(t, err)
	assert.Equal(t, 4, result.TotalProducts, "Should find 4 products total")
	assert.Equal(t, 2, result.NewItems, "Should create 2 inventory items (active only)")
	assert.Equal(t, 2, result.SkippedInactive, "Should skip 2 inactive products")

	// Verify only 2 items in inventory
	var count int64
	inventoryDB.Model(&model.InventoryItemModel{}).Count(&count)
	assert.Equal(t, int64(2), count, "Should have 2 inventory items")
}

// TestSynchronizer_IdempotentSync verifies repeated syncs don't create duplicates
func TestSynchronizer_IdempotentSync(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	ctx := context.Background()

	ordersContainer, ordersDB := setupPostgresContainer(t, ctx, "orders_idempotent")
	defer ordersContainer.Terminate(ctx)
	setupOrdersSchema(t, ordersDB)

	inventoryContainer, inventoryDB := setupPostgresContainer(t, ctx, "inventory_idempotent")
	defer inventoryContainer.Terminate(ctx)
	setupInventorySchema(t, inventoryDB)

	// Seed 3 products
	seedOrdersProducts(t, ordersDB, 3)

	sync := NewSynchronizer(ordersDB, inventoryDB, 100, false)

	// First sync
	result1, err := sync.Sync(ctx)
	require.NoError(t, err)
	assert.Equal(t, 3, result1.NewItems, "First sync should create 3 items")
	assert.Equal(t, 0, result1.ExistingItems, "First sync should have 0 existing")

	// Second sync (should be idempotent)
	result2, err := sync.Sync(ctx)
	require.NoError(t, err)
	assert.Equal(t, 0, result2.NewItems, "Second sync should create 0 new items")
	assert.Equal(t, 3, result2.ExistingItems, "Second sync should find 3 existing")

	// Verify still only 3 items in inventory
	var count int64
	inventoryDB.Model(&model.InventoryItemModel{}).Count(&count)
	assert.Equal(t, int64(3), count, "Should still have exactly 3 inventory items")
}

// TestSynchronizer_ValidateBeforeSync verifies validation checks
func TestSynchronizer_ValidateBeforeSync(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	ctx := context.Background()

	ordersContainer, ordersDB := setupPostgresContainer(t, ctx, "orders_validate")
	defer ordersContainer.Terminate(ctx)
	setupOrdersSchema(t, ordersDB)

	inventoryContainer, inventoryDB := setupPostgresContainer(t, ctx, "inventory_validate")
	defer inventoryContainer.Terminate(ctx)
	setupInventorySchema(t, inventoryDB)

	sync := NewSynchronizer(ordersDB, inventoryDB, 100, false)

	// Validation should pass with correct setup
	err := sync.ValidateBeforeSync(ctx)
	assert.NoError(t, err, "Validation should pass with correct setup")
}

// TestSynchronizer_CustomDefaultQuantity verifies custom default quantities
func TestSynchronizer_CustomDefaultQuantity(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	ctx := context.Background()

	ordersContainer, ordersDB := setupPostgresContainer(t, ctx, "orders_custom_qty")
	defer ordersContainer.Terminate(ctx)
	setupOrdersSchema(t, ordersDB)

	inventoryContainer, inventoryDB := setupPostgresContainer(t, ctx, "inventory_custom_qty")
	defer inventoryContainer.Terminate(ctx)
	setupInventorySchema(t, inventoryDB)

	// Seed 2 products
	seedOrdersProducts(t, ordersDB, 2)

	// Sync with custom default quantity of 50
	sync := NewSynchronizer(ordersDB, inventoryDB, 50, false)
	result, err := sync.Sync(ctx)

	require.NoError(t, err)
	assert.Equal(t, 2, result.NewItems)

	// Verify items have quantity of 50
	var items []model.InventoryItemModel
	inventoryDB.Find(&items)

	for _, item := range items {
		assert.Equal(t, 50, item.Quantity, "Item should have custom default quantity")
		assert.Equal(t, 0, item.Reserved, "Reserved should be 0")
	}
}

// Helper functions

func setupPostgresContainer(t *testing.T, ctx context.Context, dbName string) (*testcontainerspostgres.PostgresContainer, *gorm.DB) {
	container, err := testcontainerspostgres.Run(ctx,
		"postgres:16-alpine",
		testcontainerspostgres.WithDatabase(dbName),
		testcontainerspostgres.WithUsername("test"),
		testcontainerspostgres.WithPassword("test"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(60*time.Second)),
	)
	require.NoError(t, err, "Failed to start PostgreSQL container")

	connStr, err := container.ConnectionString(ctx, "sslmode=disable")
	require.NoError(t, err, "Failed to get connection string")

	db, err := gorm.Open(postgres.Open(connStr), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err, "Failed to connect to database")

	return container, db
}

func setupOrdersSchema(t *testing.T, db *gorm.DB) {
	err := db.Exec("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"").Error
	require.NoError(t, err)

	err = db.Exec(`
		CREATE TABLE products (
			id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
			name VARCHAR(255) NOT NULL,
			sku VARCHAR(100) NOT NULL UNIQUE,
			price DECIMAL(10,2) NOT NULL,
			is_active BOOLEAN NOT NULL DEFAULT true,
			deleted_at TIMESTAMP,
			created_at TIMESTAMP NOT NULL DEFAULT NOW()
		)
	`).Error
	require.NoError(t, err)
}

func setupInventorySchema(t *testing.T, db *gorm.DB) {
	err := db.Exec(`
		CREATE TABLE inventory_items (
			id UUID PRIMARY KEY,
			product_id UUID NOT NULL UNIQUE,
			quantity INT NOT NULL,
			reserved INT NOT NULL DEFAULT 0,
			version INT NOT NULL DEFAULT 1,
			created_at TIMESTAMP NOT NULL,
			updated_at TIMESTAMP NOT NULL,
			CHECK (quantity >= 0),
			CHECK (reserved >= 0),
			CHECK (reserved <= quantity)
		)
	`).Error
	require.NoError(t, err)
}

func seedOrdersProducts(t *testing.T, db *gorm.DB, count int) {
	for i := 0; i < count; i++ {
		product := ProductRecord{
			ID:       uuid.New(),
			Name:     "Test Product " + string(rune('A'+i)),
			SKU:      "SKU" + string(rune('0'+i)),
			Price:    float64((i + 1) * 10),
			IsActive: true,
		}
		err := db.Create(&product).Error
		require.NoError(t, err)
	}
}
