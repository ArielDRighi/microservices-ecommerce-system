package repository

import (
	"context"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/entity"
	"github.com/google/uuid"
)

// InventoryRepository defines the contract for inventory persistence operations.
// Implementations should handle optimistic locking using the Version field.
type InventoryRepository interface {
	// FindByID retrieves an inventory item by its ID.
	// Returns ErrNotFound if the item doesn't exist.
	FindByID(ctx context.Context, id uuid.UUID) (*entity.InventoryItem, error)

	// FindByProductID retrieves an inventory item by product ID.
	// Returns ErrNotFound if the item doesn't exist.
	FindByProductID(ctx context.Context, productID uuid.UUID) (*entity.InventoryItem, error)

	// Save creates a new inventory item in the repository.
	// Returns an error if an item with the same ProductID already exists.
	Save(ctx context.Context, item *entity.InventoryItem) error

	// Update updates an existing inventory item using optimistic locking.
	// Returns ErrOptimisticLockFailure if the version has changed since last read.
	// Returns ErrNotFound if the item doesn't exist.
	// The Version field must match the current database version.
	Update(ctx context.Context, item *entity.InventoryItem) error

	// Delete removes an inventory item from the repository.
	// Returns ErrNotFound if the item doesn't exist.
	Delete(ctx context.Context, id uuid.UUID) error

	// FindAll retrieves all inventory items with optional pagination.
	// If limit is 0, returns all items (use with caution).
	// Offset is the number of items to skip.
	FindAll(ctx context.Context, limit, offset int) ([]*entity.InventoryItem, error)

	// FindByProductIDs retrieves multiple inventory items by their product IDs.
	// Returns a map of productID -> InventoryItem.
	// Missing items are simply not included in the result map.
	FindByProductIDs(ctx context.Context, productIDs []uuid.UUID) (map[uuid.UUID]*entity.InventoryItem, error)

	// ExistsByProductID checks if an inventory item exists for a product.
	// Returns true if exists, false otherwise.
	ExistsByProductID(ctx context.Context, productID uuid.UUID) (bool, error)

	// Count returns the total number of inventory items in the repository.
	Count(ctx context.Context) (int64, error)

	// FindLowStock retrieves inventory items where available quantity is below threshold.
	// Available is calculated as: Quantity - Reserved
	FindLowStock(ctx context.Context, threshold int, limit int) ([]*entity.InventoryItem, error)

	// IncrementVersion increments the version of an inventory item for optimistic locking.
	// This is typically called after a successful update within a transaction.
	// Returns the new version number.
	IncrementVersion(ctx context.Context, id uuid.UUID) (int, error)
}
