package usecase

import (
	"context"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/errors"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/repository"
	"github.com/google/uuid"
)

// CheckAvailabilityInput represents the input for checking stock availability
type CheckAvailabilityInput struct {
	ProductID uuid.UUID
	Quantity  int
}

// CheckAvailabilityOutput represents the result of availability check
type CheckAvailabilityOutput struct {
	ProductID         uuid.UUID
	IsAvailable       bool
	RequestedQuantity int
	AvailableQuantity int
	TotalStock        int
	ReservedQuantity  int
}

// CheckAvailabilityUseCase handles checking if sufficient stock is available for a product
type CheckAvailabilityUseCase struct {
	inventoryRepo repository.InventoryRepository
}

// NewCheckAvailabilityUseCase creates a new instance of CheckAvailabilityUseCase
func NewCheckAvailabilityUseCase(inventoryRepo repository.InventoryRepository) *CheckAvailabilityUseCase {
	return &CheckAvailabilityUseCase{
		inventoryRepo: inventoryRepo,
	}
}

// Execute checks if the requested quantity is available for the given product
// It considers both total stock and reserved quantities
func (uc *CheckAvailabilityUseCase) Execute(ctx context.Context, input CheckAvailabilityInput) (*CheckAvailabilityOutput, error) {
	// Validate input
	if input.Quantity <= 0 {
		return nil, errors.ErrInvalidQuantity
	}

	// Find inventory item by product ID
	item, err := uc.inventoryRepo.FindByProductID(ctx, input.ProductID)
	if err != nil {
		return nil, errors.ErrInventoryItemNotFound.WithDetails(err.Error())
	}

	// Calculate available quantity (total - reserved)
	availableQty := item.Available()

	// Check if requested quantity is available
	isAvailable := item.CanReserve(input.Quantity)

	return &CheckAvailabilityOutput{
		ProductID:         input.ProductID,
		IsAvailable:       isAvailable,
		RequestedQuantity: input.Quantity,
		AvailableQuantity: availableQty,
		TotalStock:        item.Quantity,
		ReservedQuantity:  item.Reserved,
	}, nil
}
