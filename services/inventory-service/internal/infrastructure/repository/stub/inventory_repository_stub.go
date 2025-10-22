package stub

import (
	"context"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/entity"
	"github.com/google/uuid"
)

// InventoryRepositoryStub is a stub implementation for development/testing
type InventoryRepositoryStub struct{}

// NewInventoryRepositoryStub creates a new stub instance
func NewInventoryRepositoryStub() *InventoryRepositoryStub {
	return &InventoryRepositoryStub{}
}

// FindByID returns nil (not implemented)
func (r *InventoryRepositoryStub) FindByID(ctx context.Context, id uuid.UUID) (*entity.InventoryItem, error) {
	return nil, nil
}

// FindByProductID returns nil (not implemented)
func (r *InventoryRepositoryStub) FindByProductID(ctx context.Context, productID uuid.UUID) (*entity.InventoryItem, error) {
	return nil, nil
}

// FindAll returns empty slice
func (r *InventoryRepositoryStub) FindAll(ctx context.Context, limit, offset int) ([]*entity.InventoryItem, error) {
	return []*entity.InventoryItem{}, nil
}

// Save does nothing (stub)
func (r *InventoryRepositoryStub) Save(ctx context.Context, item *entity.InventoryItem) error {
	return nil
}

// Update does nothing (stub)
func (r *InventoryRepositoryStub) Update(ctx context.Context, item *entity.InventoryItem) error {
	return nil
}

// UpdateQuantity does nothing (stub)
func (r *InventoryRepositoryStub) UpdateQuantity(ctx context.Context, productID uuid.UUID, delta int) error {
	return nil
}

// Delete does nothing (stub)
func (r *InventoryRepositoryStub) Delete(ctx context.Context, id uuid.UUID) error {
	return nil
}

// Count returns 0
func (r *InventoryRepositoryStub) Count(ctx context.Context) (int64, error) {
	return 0, nil
}

// FindByProductIDs returns empty map (stub)
func (r *InventoryRepositoryStub) FindByProductIDs(ctx context.Context, productIDs []uuid.UUID) (map[uuid.UUID]*entity.InventoryItem, error) {
	return make(map[uuid.UUID]*entity.InventoryItem), nil
}

// ExistsByProductID returns false (stub)
func (r *InventoryRepositoryStub) ExistsByProductID(ctx context.Context, productID uuid.UUID) (bool, error) {
	return false, nil
}

// FindLowStock returns empty slice (stub)
func (r *InventoryRepositoryStub) FindLowStock(ctx context.Context, threshold int, limit int) ([]*entity.InventoryItem, error) {
	return []*entity.InventoryItem{}, nil
}

// IncrementVersion returns 1 (stub)
func (r *InventoryRepositoryStub) IncrementVersion(ctx context.Context, id uuid.UUID) (int, error) {
	return 1, nil
}
