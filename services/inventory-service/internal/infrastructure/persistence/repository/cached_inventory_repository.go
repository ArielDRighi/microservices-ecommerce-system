package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/entity"
	domainRepository "github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/repository"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/infrastructure/cache"
	"github.com/google/uuid"
)

// CachedInventoryRepository is a decorator that adds caching to InventoryRepository
// using the cache-aside pattern
type CachedInventoryRepository struct {
	repo  domainRepository.InventoryRepository
	cache *cache.RedisClient
}

// NewCachedInventoryRepository creates a new cached repository decorator
func NewCachedInventoryRepository(repo domainRepository.InventoryRepository, cacheClient *cache.RedisClient) *CachedInventoryRepository {
	return &CachedInventoryRepository{
		repo:  repo,
		cache: cacheClient,
	}
}

// Cache key patterns
const (
	cacheKeyByID        = "inventory:item:id:%s"
	cacheKeyByProductID = "inventory:item:product:%s"
	cacheKeyLowStock    = "inventory:lowstock:%d:%d"
	cachePatternAll     = "inventory:*"
)

// FindByID implements cache-aside pattern for FindByID
func (r *CachedInventoryRepository) FindByID(ctx context.Context, id uuid.UUID) (*entity.InventoryItem, error) {
	cacheKey := fmt.Sprintf(cacheKeyByID, id.String())

	// 1. Try to get from cache
	cached, err := r.cache.Get(ctx, cacheKey)
	if err == nil && cached != "" {
		var item entity.InventoryItem
		if err := json.Unmarshal([]byte(cached), &item); err == nil {
			return &item, nil
		}
		// If unmarshal fails, continue to DB
	}

	// 2. Cache miss - fetch from database
	item, err := r.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// 3. Store in cache (fire and forget)
	if data, err := json.Marshal(item); err == nil {
		r.cache.Set(ctx, cacheKey, string(data))
		// Also cache by product_id for dual access pattern
		r.cache.Set(ctx, fmt.Sprintf(cacheKeyByProductID, item.ProductID.String()), string(data))
	}

	return item, nil
}

// FindByProductID implements cache-aside pattern for FindByProductID
func (r *CachedInventoryRepository) FindByProductID(ctx context.Context, productID uuid.UUID) (*entity.InventoryItem, error) {
	cacheKey := fmt.Sprintf(cacheKeyByProductID, productID.String())

	// 1. Try to get from cache
	cached, err := r.cache.Get(ctx, cacheKey)
	if err == nil && cached != "" {
		var item entity.InventoryItem
		if err := json.Unmarshal([]byte(cached), &item); err == nil {
			return &item, nil
		}
	}

	// 2. Cache miss - fetch from database
	item, err := r.repo.FindByProductID(ctx, productID)
	if err != nil {
		return nil, err
	}

	// 3. Store in cache with both keys
	if data, err := json.Marshal(item); err == nil {
		r.cache.Set(ctx, cacheKey, string(data))
		r.cache.Set(ctx, fmt.Sprintf(cacheKeyByID, item.ID.String()), string(data))
	}

	return item, nil
}

// FindByProductIDs bypasses cache (bulk operations typically not cached)
func (r *CachedInventoryRepository) FindByProductIDs(ctx context.Context, productIDs []uuid.UUID) (map[uuid.UUID]*entity.InventoryItem, error) {
	return r.repo.FindByProductIDs(ctx, productIDs)
}

// FindAll bypasses cache (large result sets not cached)
func (r *CachedInventoryRepository) FindAll(ctx context.Context, limit, offset int) ([]*entity.InventoryItem, error) {
	return r.repo.FindAll(ctx, limit, offset)
}

// FindLowStock uses separate cache key with TTL
func (r *CachedInventoryRepository) FindLowStock(ctx context.Context, threshold int, limit int) ([]*entity.InventoryItem, error) {
	cacheKey := fmt.Sprintf(cacheKeyLowStock, threshold, limit)

	// 1. Try to get from cache
	cached, err := r.cache.Get(ctx, cacheKey)
	if err == nil && cached != "" {
		var items []*entity.InventoryItem
		if err := json.Unmarshal([]byte(cached), &items); err == nil {
			return items, nil
		}
	}

	// 2. Cache miss - fetch from database
	items, err := r.repo.FindLowStock(ctx, threshold, limit)
	if err != nil {
		return nil, err
	}

	// 3. Store in cache with shorter TTL (1 minute for low stock queries)
	if data, err := json.Marshal(items); err == nil {
		r.cache.SetWithTTL(ctx, cacheKey, string(data), 1*time.Minute)
	}

	return items, nil
}

// ExistsByProductID implements cache-aside pattern
func (r *CachedInventoryRepository) ExistsByProductID(ctx context.Context, productID uuid.UUID) (bool, error) {
	// Check if item is in cache first
	cacheKey := fmt.Sprintf(cacheKeyByProductID, productID.String())
	cached, err := r.cache.Get(ctx, cacheKey)
	if err == nil && cached != "" {
		return true, nil
	}

	// Fallback to database
	return r.repo.ExistsByProductID(ctx, productID)
}

// Count bypasses cache (aggregate queries change frequently)
func (r *CachedInventoryRepository) Count(ctx context.Context) (int64, error) {
	return r.repo.Count(ctx)
}

// Save invalidates cache and stores new item
func (r *CachedInventoryRepository) Save(ctx context.Context, item *entity.InventoryItem) error {
	if err := r.repo.Save(ctx, item); err != nil {
		return err
	}

	// Cache the newly created item
	if data, err := json.Marshal(item); err == nil {
		r.cache.Set(ctx, fmt.Sprintf(cacheKeyByID, item.ID.String()), string(data))
		r.cache.Set(ctx, fmt.Sprintf(cacheKeyByProductID, item.ProductID.String()), string(data))
	}

	return nil
}

// Update invalidates cache for the updated item
func (r *CachedInventoryRepository) Update(ctx context.Context, item *entity.InventoryItem) error {
	if err := r.repo.Update(ctx, item); err != nil {
		return err
	}

	// Invalidate cache for both ID and ProductID
	r.cache.Delete(ctx,
		fmt.Sprintf(cacheKeyByID, item.ID.String()),
		fmt.Sprintf(cacheKeyByProductID, item.ProductID.String()),
	)

	// Invalidate low stock cache (any threshold)
	r.cache.DeletePattern(ctx, "inventory:lowstock:*")

	return nil
}

// Delete invalidates cache for the deleted item
func (r *CachedInventoryRepository) Delete(ctx context.Context, id uuid.UUID) error {
	// Fetch item first to get ProductID
	item, err := r.repo.FindByID(ctx, id)
	if err != nil {
		return err
	}

	if err := r.repo.Delete(ctx, id); err != nil {
		return err
	}

	// Invalidate cache
	r.cache.Delete(ctx,
		fmt.Sprintf(cacheKeyByID, id.String()),
		fmt.Sprintf(cacheKeyByProductID, item.ProductID.String()),
	)

	// Invalidate low stock cache
	r.cache.DeletePattern(ctx, "inventory:lowstock:*")

	return nil
}

// IncrementVersion bypasses cache (version management is not cached)
func (r *CachedInventoryRepository) IncrementVersion(ctx context.Context, id uuid.UUID) (int, error) {
	// Invalidate cache since version changed
	r.cache.Delete(ctx, fmt.Sprintf(cacheKeyByID, id.String()))

	return r.repo.IncrementVersion(ctx, id)
}
