package main

import (
	"context"
	"fmt"
	"math/rand"
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

// TestSeeder_DatasetLimits verifies correct product limits for each dataset
func TestSeeder_DatasetLimits(t *testing.T) {
	tests := []struct {
		name          string
		dataset       string
		expectedLimit int
	}{
		{"Dev dataset", DatasetDev, 100},
		{"Test dataset", DatasetTest, 20},
		{"Demo dataset", DatasetDemo, 10},
		{"Unknown dataset defaults to dev", "unknown", 100},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			seeder := &Seeder{dataset: tt.dataset}
			limit := seeder.getProductLimit()
			assert.Equal(t, tt.expectedLimit, limit)
		})
	}
}

// TestSeeder_GenerateDevQuantity verifies dev quantity distribution
func TestSeeder_GenerateDevQuantity(t *testing.T) {
	seeder := &Seeder{dataset: DatasetDev}
	rnd := rand.New(rand.NewSource(42)) // Fixed seed for reproducibility

	lowStock := 0
	mediumStock := 0
	highStock := 0

	// Generate 1000 samples to test distribution
	for i := 0; i < 1000; i++ {
		qty := seeder.generateDevQuantity(rnd)
		assert.GreaterOrEqual(t, qty, 1, "Quantity must be at least 1")

		if qty < 10 {
			lowStock++
		} else if qty < 100 {
			mediumStock++
		} else {
			highStock++
		}
	}

	// Verify distribution is roughly 20/60/20 (+/- 10%)
	assert.InDelta(t, 200, lowStock, 100, "Low stock should be ~20%")
	assert.InDelta(t, 600, mediumStock, 100, "Medium stock should be ~60%")
	assert.InDelta(t, 200, highStock, 100, "High stock should be ~20%")
}

// TestSeeder_GenerateDevReserved verifies dev reservation logic
func TestSeeder_GenerateDevReserved(t *testing.T) {
	seeder := &Seeder{dataset: DatasetDev}
	rnd := rand.New(rand.NewSource(42))

	tests := []struct {
		name        string
		quantity    int
		maxExpected int
	}{
		{"Zero quantity", 0, 0},
		{"Low quantity", 10, 3},    // 30% of 10
		{"High quantity", 100, 30}, // 30% of 100
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reserved := seeder.generateDevReserved(rnd, tt.quantity)
			assert.GreaterOrEqual(t, reserved, 0)
			assert.LessOrEqual(t, reserved, tt.maxExpected)
		})
	}
}

// TestSeeder_GenerateTestQuantity verifies test quantity scenarios
func TestSeeder_GenerateTestQuantity(t *testing.T) {
	seeder := &Seeder{dataset: DatasetTest}
	rnd := rand.New(rand.NewSource(42))

	validScenarios := map[int]bool{0: true, 1: true, 5: true, 10: true, 50: true, 100: true}

	// Test 100 samples
	for i := 0; i < 100; i++ {
		qty := seeder.generateTestQuantity(rnd)
		assert.True(t, validScenarios[qty], "Quantity %d is not a valid test scenario", qty)
	}
}

// TestSeeder_GenerateDemoQuantity verifies demo quantity scenarios
func TestSeeder_GenerateDemoQuantity(t *testing.T) {
	seeder := &Seeder{dataset: DatasetDemo}
	rnd := rand.New(rand.NewSource(42))

	validScenarios := map[int]bool{0: true, 1: true, 5: true, 100: true, 1000: true}

	// Test 100 samples
	for i := 0; i < 100; i++ {
		qty := seeder.generateDemoQuantity(rnd)
		assert.True(t, validScenarios[qty], "Quantity %d is not a valid demo scenario", qty)
	}
}

// TestSeeder_GenerateDemoReserved verifies demo reservation logic
func TestSeeder_GenerateDemoReserved(t *testing.T) {
	seeder := &Seeder{dataset: DatasetDemo}
	rnd := rand.New(rand.NewSource(42))

	tests := []struct {
		name           string
		quantity       int
		minExpectedPct float64
		maxExpectedPct float64
	}{
		{"Zero quantity", 0, 0, 0},
		{"Low quantity", 10, 0.3, 0.7},
		{"High quantity", 100, 0.3, 0.7},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reserved := seeder.generateDemoReserved(rnd, tt.quantity)
			assert.GreaterOrEqual(t, reserved, 0)
			assert.LessOrEqual(t, reserved, tt.quantity)

			if tt.quantity > 0 {
				pct := float64(reserved) / float64(tt.quantity)
				assert.GreaterOrEqual(t, pct, tt.minExpectedPct-0.1) // Allow some variance
				assert.LessOrEqual(t, pct, tt.maxExpectedPct+0.1)
			}
		})
	}
}

// TestSeeder_GenerateInventoryItems verifies inventory item generation
func TestSeeder_GenerateInventoryItems(t *testing.T) {
	seeder := &Seeder{dataset: DatasetDev}

	products := []ProductRecord{
		{ID: uuid.New(), Name: "Product 1", SKU: "SKU001", Price: 10.0},
		{ID: uuid.New(), Name: "Product 2", SKU: "SKU002", Price: 20.0},
		{ID: uuid.New(), Name: "Product 3", SKU: "SKU003", Price: 30.0},
	}

	items := seeder.generateInventoryItems(products)

	assert.Len(t, items, 3, "Should generate 3 inventory items")

	for i, item := range items {
		assert.Equal(t, products[i].ID, item.ProductID, "ProductID should match")
		assert.Greater(t, item.Quantity, 0, "Quantity should be positive")
		assert.GreaterOrEqual(t, item.Reserved, 0, "Reserved should be non-negative")
		assert.LessOrEqual(t, item.Reserved, item.Quantity, "Reserved should not exceed quantity")
		assert.Equal(t, 1, item.Version, "Version should start at 1")
		assert.NotEqual(t, uuid.Nil, item.ID, "ID should be generated")
	}
}

// Integration test with Testcontainers
func TestSeeder_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	ctx := context.Background()

	// Start PostgreSQL containers for Orders and Inventory
	ordersContainer, ordersDB := setupPostgresContainer(t, ctx, "orders_test")
	defer ordersContainer.Terminate(ctx)

	inventoryContainer, inventoryDB := setupPostgresContainer(t, ctx, "inventory_test")
	defer inventoryContainer.Terminate(ctx)

	// Setup Orders schema and seed products
	setupOrdersSchema(t, ordersDB)
	seedOrdersProducts(t, ordersDB, 5)

	// Setup Inventory schema
	setupInventorySchema(t, inventoryDB)

	// Run seeder
	seeder := NewSeeder(ordersDB, inventoryDB, DatasetTest)
	err := seeder.Seed(ctx)
	require.NoError(t, err, "Seed should succeed")

	// Verify inventory items were created
	var count int64
	inventoryDB.Model(&model.InventoryItemModel{}).Count(&count)
	assert.Equal(t, int64(5), count, "Should have 5 inventory items")

	// Verify items have correct structure
	var items []model.InventoryItemModel
	inventoryDB.Find(&items)
	for _, item := range items {
		assert.NotEqual(t, uuid.Nil, item.ID)
		assert.NotEqual(t, uuid.Nil, item.ProductID)
		assert.GreaterOrEqual(t, item.Quantity, 0)
		assert.GreaterOrEqual(t, item.Reserved, 0)
		assert.LessOrEqual(t, item.Reserved, item.Quantity)
	}
}

// Helper functions for integration tests

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
	// Create UUID extension
	err := db.Exec("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"").Error
	require.NoError(t, err)

	// Create products table
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
	// Create inventory_items table
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

	// Create reservations table
	err = db.Exec(`
		CREATE TABLE reservations (
			id UUID PRIMARY KEY,
			inventory_item_id UUID NOT NULL,
			order_id UUID NOT NULL UNIQUE,
			quantity INT NOT NULL,
			status VARCHAR(20) NOT NULL DEFAULT 'pending',
			expires_at TIMESTAMP NOT NULL,
			created_at TIMESTAMP NOT NULL,
			updated_at TIMESTAMP NOT NULL
		)
	`).Error
	require.NoError(t, err)
}

func seedOrdersProducts(t *testing.T, db *gorm.DB, count int) {
	for i := 0; i < count; i++ {
		product := ProductRecord{
			ID:    uuid.New(),
			Name:  fmt.Sprintf("Test Product %d", i+1),
			SKU:   fmt.Sprintf("SKU%03d", i+1),
			Price: float64((i + 1) * 10),
		}
		err := db.Create(&product).Error
		require.NoError(t, err)
	}
}
