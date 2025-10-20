package repository

import (
	"context"
	"testing"
	"time"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/entity"
	domainErrors "github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/errors"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/infrastructure/persistence/model"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// setupTestDB creates a PostgreSQL testcontainer and returns a GORM DB connection
func setupTestDB(t *testing.T) (*gorm.DB, func()) {
	ctx := context.Background()

	// Create PostgreSQL container
	req := testcontainers.ContainerRequest{
		Image:        "postgres:16-alpine",
		ExposedPorts: []string{"5432/tcp"},
		Env: map[string]string{
			"POSTGRES_USER":     "testuser",
			"POSTGRES_PASSWORD": "testpass",
			"POSTGRES_DB":       "testdb",
		},
		WaitingFor: wait.ForLog("database system is ready to accept connections").WithOccurrence(2),
	}

	postgresContainer, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	require.NoError(t, err)

	// Get container host and port
	host, err := postgresContainer.Host(ctx)
	require.NoError(t, err)

	port, err := postgresContainer.MappedPort(ctx, "5432")
	require.NoError(t, err)

	// Create DSN
	dsn := "host=" + host + " user=testuser password=testpass dbname=testdb port=" + port.Port() + " sslmode=disable"

	// Open GORM connection
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	// Auto-migrate the models
	err = db.AutoMigrate(&model.InventoryItemModel{})
	require.NoError(t, err)

	// Cleanup function
	cleanup := func() {
		sqlDB, _ := db.DB()
		if sqlDB != nil {
			sqlDB.Close()
		}
		postgresContainer.Terminate(ctx)
	}

	return db, cleanup
}

func TestInventoryRepositoryImpl_FindByID(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	repo := NewInventoryRepository(db)
	ctx := context.Background()

	// Create test data
	productID := uuid.New()
	item := &entity.InventoryItem{
		ID:        uuid.New(),
		ProductID: productID,
		Quantity:  100,
		Reserved:  10,
		Version:   1,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}

	itemModel := model.NewInventoryItemModelFromEntity(item)
	err := db.Create(itemModel).Error
	require.NoError(t, err)

	// Test: Find existing item
	found, err := repo.FindByID(ctx, item.ID)
	assert.NoError(t, err)
	assert.NotNil(t, found)
	assert.Equal(t, item.ID, found.ID)
	assert.Equal(t, item.ProductID, found.ProductID)
	assert.Equal(t, item.Quantity, found.Quantity)
	assert.Equal(t, item.Reserved, found.Reserved)

	// Test: Find non-existing item
	notFound, err := repo.FindByID(ctx, uuid.New())
	assert.Error(t, err)
	assert.Nil(t, notFound)
	assert.Equal(t, domainErrors.ErrInventoryItemNotFound, err)
}

func TestInventoryRepositoryImpl_FindByProductID(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	repo := NewInventoryRepository(db)
	ctx := context.Background()

	// Create test data
	productID := uuid.New()
	item := &entity.InventoryItem{
		ID:        uuid.New(),
		ProductID: productID,
		Quantity:  50,
		Reserved:  5,
		Version:   1,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}

	itemModel := model.NewInventoryItemModelFromEntity(item)
	err := db.Create(itemModel).Error
	require.NoError(t, err)

	// Test: Find by existing product ID
	found, err := repo.FindByProductID(ctx, productID)
	assert.NoError(t, err)
	assert.NotNil(t, found)
	assert.Equal(t, productID, found.ProductID)

	// Test: Find by non-existing product ID
	notFound, err := repo.FindByProductID(ctx, uuid.New())
	assert.Error(t, err)
	assert.Nil(t, notFound)
	assert.Equal(t, domainErrors.ErrInventoryItemNotFound, err)
}

func TestInventoryRepositoryImpl_Save(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	repo := NewInventoryRepository(db)
	ctx := context.Background()

	// Test: Save new item
	item := &entity.InventoryItem{
		ID:        uuid.New(),
		ProductID: uuid.New(),
		Quantity:  200,
		Reserved:  0,
		Version:   1,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}

	err := repo.Save(ctx, item)
	assert.NoError(t, err)

	// Verify item was saved
	found, err := repo.FindByID(ctx, item.ID)
	assert.NoError(t, err)
	assert.Equal(t, item.Quantity, found.Quantity)

	// Test: Save duplicate product ID (should fail)
	duplicateItem := &entity.InventoryItem{
		ID:        uuid.New(),
		ProductID: item.ProductID, // Same product ID
		Quantity:  100,
		Reserved:  0,
		Version:   1,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}

	err = repo.Save(ctx, duplicateItem)
	assert.Error(t, err)
	assert.Equal(t, domainErrors.ErrInventoryItemAlreadyExists, err)
}

func TestInventoryRepositoryImpl_Update(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	repo := NewInventoryRepository(db)
	ctx := context.Background()

	// Create initial item
	item := &entity.InventoryItem{
		ID:        uuid.New(),
		ProductID: uuid.New(),
		Quantity:  100,
		Reserved:  10,
		Version:   1,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}

	err := repo.Save(ctx, item)
	require.NoError(t, err)

	// Test: Successful update
	item.Quantity = 150
	item.Reserved = 20
	err = repo.Update(ctx, item)
	assert.NoError(t, err)
	assert.Equal(t, 2, item.Version) // Version should be incremented

	// Verify update
	found, err := repo.FindByID(ctx, item.ID)
	assert.NoError(t, err)
	assert.Equal(t, 150, found.Quantity)
	assert.Equal(t, 20, found.Reserved)
	assert.Equal(t, 2, found.Version)

	// Test: Optimistic locking failure
	oldVersionItem := &entity.InventoryItem{
		ID:        item.ID,
		ProductID: item.ProductID,
		Quantity:  200,
		Reserved:  30,
		Version:   1, // Old version
		CreatedAt: item.CreatedAt,
		UpdatedAt: time.Now().UTC(),
	}

	err = repo.Update(ctx, oldVersionItem)
	assert.Error(t, err)
	assert.Equal(t, domainErrors.ErrOptimisticLockFailure, err)

	// Test: Update non-existing item
	nonExistingItem := &entity.InventoryItem{
		ID:        uuid.New(),
		ProductID: uuid.New(),
		Quantity:  100,
		Reserved:  0,
		Version:   1,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}

	err = repo.Update(ctx, nonExistingItem)
	assert.Error(t, err)
	assert.Equal(t, domainErrors.ErrInventoryItemNotFound, err)
}

func TestInventoryRepositoryImpl_Delete(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	repo := NewInventoryRepository(db)
	ctx := context.Background()

	// Create test item
	item := &entity.InventoryItem{
		ID:        uuid.New(),
		ProductID: uuid.New(),
		Quantity:  100,
		Reserved:  0,
		Version:   1,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}

	err := repo.Save(ctx, item)
	require.NoError(t, err)

	// Test: Delete existing item
	err = repo.Delete(ctx, item.ID)
	assert.NoError(t, err)

	// Verify deletion
	found, err := repo.FindByID(ctx, item.ID)
	assert.Error(t, err)
	assert.Nil(t, found)

	// Test: Delete non-existing item
	err = repo.Delete(ctx, uuid.New())
	assert.Error(t, err)
	assert.Equal(t, domainErrors.ErrInventoryItemNotFound, err)
}

func TestInventoryRepositoryImpl_FindAll(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	repo := NewInventoryRepository(db)
	ctx := context.Background()

	// Create multiple test items
	for i := 0; i < 5; i++ {
		item := &entity.InventoryItem{
			ID:        uuid.New(),
			ProductID: uuid.New(),
			Quantity:  100 + i*10,
			Reserved:  i,
			Version:   1,
			CreatedAt: time.Now().UTC(),
			UpdatedAt: time.Now().UTC(),
		}
		err := repo.Save(ctx, item)
		require.NoError(t, err)
	}

	// Test: Find all without pagination
	items, err := repo.FindAll(ctx, 0, 0)
	assert.NoError(t, err)
	assert.Equal(t, 5, len(items))

	// Test: Find all with pagination (limit 3)
	items, err = repo.FindAll(ctx, 3, 0)
	assert.NoError(t, err)
	assert.Equal(t, 3, len(items))

	// Test: Find all with pagination (limit 2, offset 2)
	items, err = repo.FindAll(ctx, 2, 2)
	assert.NoError(t, err)
	assert.Equal(t, 2, len(items))
}

func TestInventoryRepositoryImpl_FindByProductIDs(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	repo := NewInventoryRepository(db)
	ctx := context.Background()

	// Create test items with known product IDs
	productIDs := []uuid.UUID{uuid.New(), uuid.New(), uuid.New()}
	for _, productID := range productIDs {
		item := &entity.InventoryItem{
			ID:        uuid.New(),
			ProductID: productID,
			Quantity:  100,
			Reserved:  10,
			Version:   1,
			CreatedAt: time.Now().UTC(),
			UpdatedAt: time.Now().UTC(),
		}
		err := repo.Save(ctx, item)
		require.NoError(t, err)
	}

	// Test: Find by existing product IDs
	items, err := repo.FindByProductIDs(ctx, productIDs)
	assert.NoError(t, err)
	assert.Equal(t, 3, len(items))
	for _, productID := range productIDs {
		_, exists := items[productID]
		assert.True(t, exists)
	}

	// Test: Find by empty slice
	items, err = repo.FindByProductIDs(ctx, []uuid.UUID{})
	assert.NoError(t, err)
	assert.Equal(t, 0, len(items))

	// Test: Find by non-existing product IDs
	items, err = repo.FindByProductIDs(ctx, []uuid.UUID{uuid.New(), uuid.New()})
	assert.NoError(t, err)
	assert.Equal(t, 0, len(items))
}

func TestInventoryRepositoryImpl_ExistsByProductID(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	repo := NewInventoryRepository(db)
	ctx := context.Background()

	// Create test item
	productID := uuid.New()
	item := &entity.InventoryItem{
		ID:        uuid.New(),
		ProductID: productID,
		Quantity:  100,
		Reserved:  10,
		Version:   1,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}

	err := repo.Save(ctx, item)
	require.NoError(t, err)

	// Test: Exists by existing product ID
	exists, err := repo.ExistsByProductID(ctx, productID)
	assert.NoError(t, err)
	assert.True(t, exists)

	// Test: Exists by non-existing product ID
	exists, err = repo.ExistsByProductID(ctx, uuid.New())
	assert.NoError(t, err)
	assert.False(t, exists)
}

func TestInventoryRepositoryImpl_Count(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	repo := NewInventoryRepository(db)
	ctx := context.Background()

	// Test: Count with empty repository
	count, err := repo.Count(ctx)
	assert.NoError(t, err)
	assert.Equal(t, int64(0), count)

	// Create test items
	for i := 0; i < 7; i++ {
		item := &entity.InventoryItem{
			ID:        uuid.New(),
			ProductID: uuid.New(),
			Quantity:  100,
			Reserved:  10,
			Version:   1,
			CreatedAt: time.Now().UTC(),
			UpdatedAt: time.Now().UTC(),
		}
		err := repo.Save(ctx, item)
		require.NoError(t, err)
	}

	// Test: Count with items
	count, err = repo.Count(ctx)
	assert.NoError(t, err)
	assert.Equal(t, int64(7), count)
}

func TestInventoryRepositoryImpl_FindLowStock(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	repo := NewInventoryRepository(db)
	ctx := context.Background()

	// Create items with different stock levels
	testCases := []struct {
		quantity  int
		reserved  int
		available int
	}{
		{100, 10, 90}, // Available: 90
		{50, 45, 5},   // Available: 5 (LOW STOCK)
		{30, 25, 5},   // Available: 5 (LOW STOCK)
		{20, 18, 2},   // Available: 2 (LOW STOCK)
		{10, 1, 9},    // Available: 9
	}

	for _, tc := range testCases {
		item := &entity.InventoryItem{
			ID:        uuid.New(),
			ProductID: uuid.New(),
			Quantity:  tc.quantity,
			Reserved:  tc.reserved,
			Version:   1,
			CreatedAt: time.Now().UTC(),
			UpdatedAt: time.Now().UTC(),
		}
		err := repo.Save(ctx, item)
		require.NoError(t, err)
	}

	// Test: Find low stock items (threshold = 10)
	lowStockItems, err := repo.FindLowStock(ctx, 10, 0)
	assert.NoError(t, err)
	assert.Equal(t, 4, len(lowStockItems)) // Items with available < 10 (includes 9)

	// Verify they are sorted by available quantity (ASC)
	if len(lowStockItems) >= 2 {
		for i := 0; i < len(lowStockItems)-1; i++ {
			available1 := lowStockItems[i].Quantity - lowStockItems[i].Reserved
			available2 := lowStockItems[i+1].Quantity - lowStockItems[i+1].Reserved
			assert.LessOrEqual(t, available1, available2)
		}
	}

	// Test: Find low stock with limit
	lowStockItems, err = repo.FindLowStock(ctx, 10, 2)
	assert.NoError(t, err)
	assert.Equal(t, 2, len(lowStockItems))
}

func TestInventoryRepositoryImpl_IncrementVersion(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	repo := NewInventoryRepository(db)
	ctx := context.Background()

	// Create test item
	item := &entity.InventoryItem{
		ID:        uuid.New(),
		ProductID: uuid.New(),
		Quantity:  100,
		Reserved:  10,
		Version:   1,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}

	err := repo.Save(ctx, item)
	require.NoError(t, err)

	// Test: Increment version
	newVersion, err := repo.IncrementVersion(ctx, item.ID)
	assert.NoError(t, err)
	assert.Equal(t, 2, newVersion)

	// Verify version was incremented
	found, err := repo.FindByID(ctx, item.ID)
	assert.NoError(t, err)
	assert.Equal(t, 2, found.Version)

	// Test: Increment version again
	newVersion, err = repo.IncrementVersion(ctx, item.ID)
	assert.NoError(t, err)
	assert.Equal(t, 3, newVersion)

	// Test: Increment version of non-existing item
	_, err = repo.IncrementVersion(ctx, uuid.New())
	assert.Error(t, err)
	assert.Equal(t, domainErrors.ErrInventoryItemNotFound, err)
}
