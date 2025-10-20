package repository

import (
	"context"
	"testing"
	"time"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/entity"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/infrastructure/cache"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
)

func setupCachedRepositoryTest(t *testing.T) (*CachedInventoryRepository, *cache.RedisClient, func()) {
	// Setup PostgreSQL container
	db, pgCleanup := setupTestDB(t)

	// Setup Redis container
	ctx := context.Background()
	redisReq := testcontainers.ContainerRequest{
		Image:        "redis:7-alpine",
		ExposedPorts: []string{"6379/tcp"},
		WaitingFor:   wait.ForLog("Ready to accept connections"),
	}

	redisContainer, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: redisReq,
		Started:          true,
	})
	require.NoError(t, err)

	host, err := redisContainer.Host(ctx)
	require.NoError(t, err)

	port, err := redisContainer.MappedPort(ctx, "6379")
	require.NoError(t, err)

	redisConfig := &cache.RedisConfig{
		Host:     host,
		Port:     port.Int(),
		Password: "",
		DB:       0,
	}

	redisClient, err := cache.NewRedisClient(redisConfig, 5*time.Minute)
	require.NoError(t, err)

	// Create base repository
	baseRepo := NewInventoryRepository(db)

	// Create cached repository
	cachedRepo := NewCachedInventoryRepository(baseRepo, redisClient)

	cleanup := func() {
		redisClient.Close()
		redisContainer.Terminate(ctx)
		pgCleanup()
	}

	return cachedRepo, redisClient, cleanup
}

func TestCachedInventoryRepository_FindByID_CacheHit(t *testing.T) {
	repo, redisClient, cleanup := setupCachedRepositoryTest(t)
	defer cleanup()

	ctx := context.Background()

	// Create test item
	item := &entity.InventoryItem{
		ID:        uuid.New(),
		ProductID: uuid.New(),
		Quantity:  100,
		Reserved:  0,
		Version:   1,
	}

	err := repo.Save(ctx, item)
	require.NoError(t, err)

	// First call - cache miss (should fetch from DB and cache)
	result1, err := repo.FindByID(ctx, item.ID)
	assert.NoError(t, err)
	assert.Equal(t, item.ID, result1.ID)
	assert.Equal(t, item.Quantity, result1.Quantity)

	// Verify item is in cache
	cacheKey := "inventory:item:id:" + item.ID.String()
	cached, err := redisClient.Get(ctx, cacheKey)
	assert.NoError(t, err)
	assert.NotEmpty(t, cached)

	// Second call - should hit cache (faster)
	start := time.Now()
	result2, err := repo.FindByID(ctx, item.ID)
	cacheLatency := time.Since(start)

	assert.NoError(t, err)
	assert.Equal(t, item.ID, result2.ID)
	assert.Equal(t, item.Quantity, result2.Quantity)

	// Cache hit should be significantly faster (< 10ms)
	assert.Less(t, cacheLatency, 10*time.Millisecond)
}

func TestCachedInventoryRepository_FindByProductID_CacheHit(t *testing.T) {
	repo, redisClient, cleanup := setupCachedRepositoryTest(t)
	defer cleanup()

	ctx := context.Background()

	// Create test item
	item := &entity.InventoryItem{
		ID:        uuid.New(),
		ProductID: uuid.New(),
		Quantity:  50,
		Reserved:  0,
		Version:   1,
	}

	err := repo.Save(ctx, item)
	require.NoError(t, err)

	// First call - cache miss
	result1, err := repo.FindByProductID(ctx, item.ProductID)
	assert.NoError(t, err)
	assert.Equal(t, item.ProductID, result1.ProductID)

	// Verify item is in cache by product_id
	cacheKey := "inventory:item:product:" + item.ProductID.String()
	cached, err := redisClient.Get(ctx, cacheKey)
	assert.NoError(t, err)
	assert.NotEmpty(t, cached)

	// Second call - should hit cache
	result2, err := repo.FindByProductID(ctx, item.ProductID)
	assert.NoError(t, err)
	assert.Equal(t, item.ProductID, result2.ProductID)
}

func TestCachedInventoryRepository_Update_InvalidatesCache(t *testing.T) {
	repo, redisClient, cleanup := setupCachedRepositoryTest(t)
	defer cleanup()

	ctx := context.Background()

	// Create test item
	item := &entity.InventoryItem{
		ID:        uuid.New(),
		ProductID: uuid.New(),
		Quantity:  100,
		Reserved:  0,
		Version:   1,
	}

	err := repo.Save(ctx, item)
	require.NoError(t, err)

	// Cache the item
	_, err = repo.FindByID(ctx, item.ID)
	require.NoError(t, err)

	// Verify item is cached
	cacheKey := "inventory:item:id:" + item.ID.String()
	cached, err := redisClient.Get(ctx, cacheKey)
	assert.NoError(t, err)
	assert.NotEmpty(t, cached)

	// Update item
	item.Quantity = 200
	err = repo.Update(ctx, item)
	assert.NoError(t, err)

	// Verify cache was invalidated
	cached, err = redisClient.Get(ctx, cacheKey)
	assert.NoError(t, err)
	assert.Empty(t, cached)

	// Next FindByID should fetch from DB with updated value
	result, err := repo.FindByID(ctx, item.ID)
	assert.NoError(t, err)
	assert.Equal(t, 200, result.Quantity)
}

func TestCachedInventoryRepository_Delete_InvalidatesCache(t *testing.T) {
	repo, redisClient, cleanup := setupCachedRepositoryTest(t)
	defer cleanup()

	ctx := context.Background()

	// Create test item
	item := &entity.InventoryItem{
		ID:        uuid.New(),
		ProductID: uuid.New(),
		Quantity:  100,
		Reserved:  0,
		Version:   1,
	}

	err := repo.Save(ctx, item)
	require.NoError(t, err)

	// Cache the item
	_, err = repo.FindByID(ctx, item.ID)
	require.NoError(t, err)

	// Verify item is cached
	cacheKeyID := "inventory:item:id:" + item.ID.String()
	cacheKeyProduct := "inventory:item:product:" + item.ProductID.String()

	cached, err := redisClient.Get(ctx, cacheKeyID)
	assert.NoError(t, err)
	assert.NotEmpty(t, cached)

	// Delete item
	err = repo.Delete(ctx, item.ID)
	assert.NoError(t, err)

	// Verify both caches were invalidated
	cached, err = redisClient.Get(ctx, cacheKeyID)
	assert.NoError(t, err)
	assert.Empty(t, cached)

	cached, err = redisClient.Get(ctx, cacheKeyProduct)
	assert.NoError(t, err)
	assert.Empty(t, cached)
}

func TestCachedInventoryRepository_FindLowStock_CacheHit(t *testing.T) {
	repo, redisClient, cleanup := setupCachedRepositoryTest(t)
	defer cleanup()

	ctx := context.Background()

	// Create test items
	item1 := &entity.InventoryItem{
		ID:        uuid.New(),
		ProductID: uuid.New(),
		Quantity:  5,
		Reserved:  0,
		Version:   1,
	}
	item2 := &entity.InventoryItem{
		ID:        uuid.New(),
		ProductID: uuid.New(),
		Quantity:  3,
		Reserved:  0,
		Version:   1,
	}

	err := repo.Save(ctx, item1)
	require.NoError(t, err)
	err = repo.Save(ctx, item2)
	require.NoError(t, err)

	threshold := 10
	limit := 100

	// First call - cache miss
	results1, err := repo.FindLowStock(ctx, threshold, limit)
	assert.NoError(t, err)
	assert.GreaterOrEqual(t, len(results1), 2)

	// Verify low stock query is cached
	cacheKey := "inventory:lowstock:10:100"
	cached, err := redisClient.Get(ctx, cacheKey)
	assert.NoError(t, err)
	assert.NotEmpty(t, cached)

	// Second call - should hit cache
	results2, err := repo.FindLowStock(ctx, threshold, limit)
	assert.NoError(t, err)
	assert.Equal(t, len(results1), len(results2))
}

func TestCachedInventoryRepository_DualCacheKeys(t *testing.T) {
	repo, _, cleanup := setupCachedRepositoryTest(t)
	defer cleanup()

	ctx := context.Background()

	// Create test item
	item := &entity.InventoryItem{
		ID:        uuid.New(),
		ProductID: uuid.New(),
		Quantity:  100,
		Reserved:  0,
		Version:   1,
	}

	err := repo.Save(ctx, item)
	require.NoError(t, err)

	// Cache via FindByID
	_, err = repo.FindByID(ctx, item.ID)
	require.NoError(t, err)

	// Should also be cached by ProductID
	result, err := repo.FindByProductID(ctx, item.ProductID)
	assert.NoError(t, err)
	assert.Equal(t, item.ProductID, result.ProductID)
}

func TestCachedInventoryRepository_ExistsByProductID_CacheCheck(t *testing.T) {
	repo, redisClient, cleanup := setupCachedRepositoryTest(t)
	defer cleanup()

	ctx := context.Background()

	// Create test item
	item := &entity.InventoryItem{
		ID:        uuid.New(),
		ProductID: uuid.New(),
		Quantity:  100,
		Reserved:  0,
		Version:   1,
	}

	err := repo.Save(ctx, item)
	require.NoError(t, err)

	// Cache the item by product ID
	_, err = repo.FindByProductID(ctx, item.ProductID)
	require.NoError(t, err)

	// Verify cache exists
	cacheKey := "inventory:item:product:" + item.ProductID.String()
	cached, err := redisClient.Get(ctx, cacheKey)
	assert.NoError(t, err)
	assert.NotEmpty(t, cached)

	// ExistsByProductID should find it in cache
	exists, err := repo.ExistsByProductID(ctx, item.ProductID)
	assert.NoError(t, err)
	assert.True(t, exists)
}

func TestCachedInventoryRepository_IncrementVersion_InvalidatesCache(t *testing.T) {
	repo, redisClient, cleanup := setupCachedRepositoryTest(t)
	defer cleanup()

	ctx := context.Background()

	// Create test item
	item := &entity.InventoryItem{
		ID:        uuid.New(),
		ProductID: uuid.New(),
		Quantity:  100,
		Reserved:  0,
		Version:   1,
	}

	err := repo.Save(ctx, item)
	require.NoError(t, err)

	// Cache the item
	_, err = repo.FindByID(ctx, item.ID)
	require.NoError(t, err)

	// Increment version
	newVersion, err := repo.IncrementVersion(ctx, item.ID)
	assert.NoError(t, err)
	assert.Equal(t, 2, newVersion)

	// Verify cache was invalidated
	cacheKey := "inventory:item:id:" + item.ID.String()
	cached, err := redisClient.Get(ctx, cacheKey)
	assert.NoError(t, err)
	assert.Empty(t, cached)
}
