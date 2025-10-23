package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/entity"
	domainErrors "github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/errors"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/infrastructure/persistence/model"
	"github.com/google/uuid"
	"github.com/jackc/pgconn"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// InventoryRepositoryImpl is the GORM implementation of InventoryRepository
type InventoryRepositoryImpl struct {
	db *gorm.DB
}

// NewInventoryRepository creates a new instance of InventoryRepositoryImpl
func NewInventoryRepository(db *gorm.DB) *InventoryRepositoryImpl {
	return &InventoryRepositoryImpl{
		db: db,
	}
}

// FindByID retrieves an inventory item by its ID
func (r *InventoryRepositoryImpl) FindByID(ctx context.Context, id uuid.UUID) (*entity.InventoryItem, error) {
	var itemModel model.InventoryItemModel

	result := r.db.WithContext(ctx).Where("id = ?", id).First(&itemModel)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, domainErrors.ErrInventoryItemNotFound
		}
		return nil, fmt.Errorf("failed to find inventory item by ID: %w", result.Error)
	}

	return itemModel.ToEntity(), nil
}

// FindByProductID retrieves an inventory item by product ID
func (r *InventoryRepositoryImpl) FindByProductID(ctx context.Context, productID uuid.UUID) (*entity.InventoryItem, error) {
	var itemModel model.InventoryItemModel

	result := r.db.WithContext(ctx).Where("product_id = ?", productID).First(&itemModel)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, domainErrors.ErrInventoryItemNotFound
		}
		return nil, fmt.Errorf("failed to find inventory item by product ID: %w", result.Error)
	}

	return itemModel.ToEntity(), nil
}

// Save creates a new inventory item in the repository
func (r *InventoryRepositoryImpl) Save(ctx context.Context, item *entity.InventoryItem) error {
	itemModel := model.NewInventoryItemModelFromEntity(item)

	result := r.db.WithContext(ctx).Create(itemModel)
	if result.Error != nil {
		// Check for unique constraint violation on product_id (PostgreSQL error code 23505)
		var pgErr *pgconn.PgError
		if errors.As(result.Error, &pgErr) && pgErr.Code == "23505" {
			return domainErrors.ErrInventoryItemAlreadyExists
		}
		// Also check for GORM wrapping by checking error string
		if errMsg := result.Error.Error(); errMsg != "" {
			if pgErr != nil || containsConstraintViolation(errMsg) {
				return domainErrors.ErrInventoryItemAlreadyExists
			}
		}
		return fmt.Errorf("failed to save inventory item: %w", result.Error)
	}

	return nil
}

// containsConstraintViolation checks if error message contains PostgreSQL duplicate key constraint
func containsConstraintViolation(errMsg string) bool {
	return strings.Contains(errMsg, "duplicate key value violates unique constraint") ||
		strings.Contains(errMsg, "idx_inventory_product") ||
		strings.Contains(errMsg, "SQLSTATE 23505")
}

// Update updates an existing inventory item using optimistic locking
func (r *InventoryRepositoryImpl) Update(ctx context.Context, item *entity.InventoryItem) error {
	itemModel := model.NewInventoryItemModelFromEntity(item)

	// Optimistic locking: update only if version matches
	// Increment version in the same query
	result := r.db.WithContext(ctx).
		Model(&model.InventoryItemModel{}).
		Where("id = ? AND version = ?", item.ID, item.Version).
		Updates(map[string]interface{}{
			"product_id": itemModel.ProductID,
			"quantity":   itemModel.Quantity,
			"reserved":   itemModel.Reserved,
			"version":    gorm.Expr("version + 1"),
			"updated_at": itemModel.UpdatedAt,
		})

	if result.Error != nil {
		return fmt.Errorf("failed to update inventory item: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		// Either item doesn't exist or version has changed
		var exists int64
		r.db.WithContext(ctx).Model(&model.InventoryItemModel{}).Where("id = ?", item.ID).Count(&exists)
		if exists == 0 {
			return domainErrors.ErrInventoryItemNotFound
		}
		return domainErrors.ErrOptimisticLockFailure
	}

	// Update the entity's version to reflect the new version
	item.Version++

	return nil
}

// Delete removes an inventory item from the repository
func (r *InventoryRepositoryImpl) Delete(ctx context.Context, id uuid.UUID) error {
	result := r.db.WithContext(ctx).Where("id = ?", id).Delete(&model.InventoryItemModel{})

	if result.Error != nil {
		return fmt.Errorf("failed to delete inventory item: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return domainErrors.ErrInventoryItemNotFound
	}

	return nil
}

// FindAll retrieves all inventory items with optional pagination
func (r *InventoryRepositoryImpl) FindAll(ctx context.Context, limit, offset int) ([]*entity.InventoryItem, error) {
	var itemModels []model.InventoryItemModel

	query := r.db.WithContext(ctx)

	if limit > 0 {
		query = query.Limit(limit).Offset(offset)
	}

	result := query.Find(&itemModels)
	if result.Error != nil {
		return nil, fmt.Errorf("failed to find all inventory items: %w", result.Error)
	}

	items := make([]*entity.InventoryItem, len(itemModels))
	for i, itemModel := range itemModels {
		items[i] = itemModel.ToEntity()
	}

	return items, nil
}

// FindByProductIDs retrieves multiple inventory items by their product IDs
func (r *InventoryRepositoryImpl) FindByProductIDs(ctx context.Context, productIDs []uuid.UUID) (map[uuid.UUID]*entity.InventoryItem, error) {
	if len(productIDs) == 0 {
		return make(map[uuid.UUID]*entity.InventoryItem), nil
	}

	var itemModels []model.InventoryItemModel

	result := r.db.WithContext(ctx).Where("product_id IN ?", productIDs).Find(&itemModels)
	if result.Error != nil {
		return nil, fmt.Errorf("failed to find inventory items by product IDs: %w", result.Error)
	}

	items := make(map[uuid.UUID]*entity.InventoryItem, len(itemModels))
	for _, itemModel := range itemModels {
		item := itemModel.ToEntity()
		items[item.ProductID] = item
	}

	return items, nil
}

// ExistsByProductID checks if an inventory item exists for a product
func (r *InventoryRepositoryImpl) ExistsByProductID(ctx context.Context, productID uuid.UUID) (bool, error) {
	var count int64

	result := r.db.WithContext(ctx).
		Model(&model.InventoryItemModel{}).
		Where("product_id = ?", productID).
		Count(&count)

	if result.Error != nil {
		return false, fmt.Errorf("failed to check if inventory item exists: %w", result.Error)
	}

	return count > 0, nil
}

// Count returns the total number of inventory items in the repository
func (r *InventoryRepositoryImpl) Count(ctx context.Context) (int64, error) {
	var count int64

	result := r.db.WithContext(ctx).Model(&model.InventoryItemModel{}).Count(&count)
	if result.Error != nil {
		return 0, fmt.Errorf("failed to count inventory items: %w", result.Error)
	}

	return count, nil
}

// FindLowStock retrieves inventory items where available quantity is below threshold
func (r *InventoryRepositoryImpl) FindLowStock(ctx context.Context, threshold int, limit int) ([]*entity.InventoryItem, error) {
	var itemModels []model.InventoryItemModel

	query := r.db.WithContext(ctx).
		Where("quantity - reserved < ?", threshold).
		Order("quantity - reserved ASC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	result := query.Find(&itemModels)
	if result.Error != nil {
		return nil, fmt.Errorf("failed to find low stock items: %w", result.Error)
	}

	items := make([]*entity.InventoryItem, len(itemModels))
	for i, itemModel := range itemModels {
		items[i] = itemModel.ToEntity()
	}

	return items, nil
}

// IncrementVersion increments the version of an inventory item for optimistic locking
func (r *InventoryRepositoryImpl) IncrementVersion(ctx context.Context, id uuid.UUID) (int, error) {
	var itemModel model.InventoryItemModel

	// Use transaction to ensure atomicity
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Lock the row for update
		result := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", id).First(&itemModel)
		if result.Error != nil {
			if errors.Is(result.Error, gorm.ErrRecordNotFound) {
				return domainErrors.ErrInventoryItemNotFound
			}
			return result.Error
		}

		// Increment version
		result = tx.Model(&itemModel).Update("version", gorm.Expr("version + 1"))
		if result.Error != nil {
			return result.Error
		}

		// Reload to get new version
		result = tx.Where("id = ?", id).First(&itemModel)
		if result.Error != nil {
			return result.Error
		}

		return nil
	})

	if err != nil {
		// Return domain errors directly without wrapping
		if errors.Is(err, domainErrors.ErrInventoryItemNotFound) {
			return 0, domainErrors.ErrInventoryItemNotFound
		}
		return 0, fmt.Errorf("failed to increment version: %w", err)
	}

	return itemModel.Version, nil
}
