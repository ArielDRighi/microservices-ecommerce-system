package usecase

import (
	"context"
	"time"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/entity"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/errors"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/repository"
	"github.com/google/uuid"
)

// ReserveStockInput represents the input for reserving stock
type ReserveStockInput struct {
	ProductID uuid.UUID
	OrderID   uuid.UUID
	Quantity  int
	Duration  *time.Duration // Optional: if nil, uses default 15 minutes
}

// ReserveStockOutput represents the result of stock reservation
type ReserveStockOutput struct {
	ReservationID        uuid.UUID
	ProductID            uuid.UUID
	OrderID              uuid.UUID
	Quantity             int
	ExpiresAt            time.Time
	RemainingStock       int
	ReservationCreatedAt time.Time
}

// ReserveStockUseCase handles creating temporary stock reservations
type ReserveStockUseCase struct {
	inventoryRepo   repository.InventoryRepository
	reservationRepo repository.ReservationRepository
}

// NewReserveStockUseCase creates a new instance of ReserveStockUseCase
func NewReserveStockUseCase(
	inventoryRepo repository.InventoryRepository,
	reservationRepo repository.ReservationRepository,
) *ReserveStockUseCase {
	return &ReserveStockUseCase{
		inventoryRepo:   inventoryRepo,
		reservationRepo: reservationRepo,
	}
}

// Execute creates a temporary stock reservation with optimistic locking
// It performs the following steps:
// 1. Validates input
// 2. Finds inventory item by product ID
// 3. Checks if sufficient stock is available
// 4. Reserves stock (increments Reserved field)
// 5. Creates reservation entity
// 6. Updates inventory with optimistic locking (Version check)
// 7. Saves reservation
func (uc *ReserveStockUseCase) Execute(ctx context.Context, input ReserveStockInput) (*ReserveStockOutput, error) {
	// Validate input
	if input.Quantity <= 0 {
		return nil, errors.ErrInvalidQuantity
	}

	// Check if reservation already exists for this order
	exists, err := uc.reservationRepo.ExistsByOrderID(ctx, input.OrderID)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.ErrReservationAlreadyExists.WithDetails("order_id: " + input.OrderID.String())
	}

	// Find inventory item by product ID
	item, err := uc.inventoryRepo.FindByProductID(ctx, input.ProductID)
	if err != nil {
		return nil, errors.ErrInventoryItemNotFound.WithDetails(err.Error())
	}

	// Reserve stock (this checks availability and updates Reserved field)
	if err := item.Reserve(input.Quantity); err != nil {
		return nil, err
	}

	// Create reservation entity
	var reservation *entity.Reservation
	if input.Duration != nil {
		reservation, err = entity.NewReservationWithDuration(
			item.ID,
			input.OrderID,
			input.Quantity,
			*input.Duration,
		)
	} else {
		reservation, err = entity.NewReservation(
			item.ID,
			input.OrderID,
			input.Quantity,
		)
	}
	if err != nil {
		// Rollback the reservation in memory (domain entity)
		item.ReleaseReservation(input.Quantity)
		return nil, err
	}

	// Update inventory with optimistic locking
	// The Update method should check Version field and increment it
	if err := uc.inventoryRepo.Update(ctx, item); err != nil {
		return nil, err
	}

	// Save reservation
	if err := uc.reservationRepo.Save(ctx, reservation); err != nil {
		// Note: In a real system, this should be wrapped in a transaction
		// or use compensating actions to rollback the inventory update
		return nil, err
	}

	return &ReserveStockOutput{
		ReservationID:        reservation.ID,
		ProductID:            input.ProductID,
		OrderID:              input.OrderID,
		Quantity:             input.Quantity,
		ExpiresAt:            reservation.ExpiresAt,
		RemainingStock:       item.Available(),
		ReservationCreatedAt: reservation.CreatedAt,
	}, nil
}
