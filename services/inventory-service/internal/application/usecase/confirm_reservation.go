package usecase

import (
	"context"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/errors"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/repository"
	"github.com/google/uuid"
)

// ConfirmReservationInput represents the input for confirming a reservation
type ConfirmReservationInput struct {
	ReservationID uuid.UUID
}

// ConfirmReservationOutput represents the result of confirming a reservation
type ConfirmReservationOutput struct {
	ReservationID     uuid.UUID
	InventoryItemID   uuid.UUID
	OrderID           uuid.UUID
	QuantityConfirmed int
	FinalStock        int
	ReservedStock     int
}

// ConfirmReservationUseCase handles confirming reservations and decrementing actual stock
// This is a transactional operation that:
// 1. Confirms the reservation (status = confirmed)
// 2. Decrements Reserved quantity
// 3. Decrements actual Quantity
type ConfirmReservationUseCase struct {
	inventoryRepo   repository.InventoryRepository
	reservationRepo repository.ReservationRepository
}

// NewConfirmReservationUseCase creates a new instance of ConfirmReservationUseCase
func NewConfirmReservationUseCase(
	inventoryRepo repository.InventoryRepository,
	reservationRepo repository.ReservationRepository,
) *ConfirmReservationUseCase {
	return &ConfirmReservationUseCase{
		inventoryRepo:   inventoryRepo,
		reservationRepo: reservationRepo,
	}
}

// Execute confirms a reservation and decrements stock
// This operation should be atomic (wrapped in a transaction in the infrastructure layer)
// Steps:
// 1. Find reservation by ID
// 2. Validate reservation can be confirmed (pending, not expired)
// 3. Find inventory item
// 4. Confirm reservation on inventory (decrements Reserved and Quantity)
// 5. Update reservation status to confirmed
// 6. Update inventory with optimistic locking
// 7. Update reservation
func (uc *ConfirmReservationUseCase) Execute(ctx context.Context, input ConfirmReservationInput) (*ConfirmReservationOutput, error) {
	// Find reservation
	reservation, err := uc.reservationRepo.FindByID(ctx, input.ReservationID)
	if err != nil {
		return nil, errors.ErrReservationNotFound.WithDetails(err.Error())
	}

	// Validate reservation can be confirmed
	if !reservation.CanBeConfirmed() {
		if reservation.IsExpired() {
			return nil, errors.ErrReservationExpired
		}
		return nil, errors.ErrReservationNotPending
	}

	// Find inventory item
	item, err := uc.inventoryRepo.FindByID(ctx, reservation.InventoryItemID)
	if err != nil {
		return nil, errors.ErrInventoryItemNotFound.WithDetails(err.Error())
	}

	// Confirm reservation on inventory entity
	// This decrements both Reserved and Quantity
	if err := item.ConfirmReservation(reservation.Quantity); err != nil {
		return nil, err
	}

	// Mark reservation as confirmed
	if err := reservation.Confirm(); err != nil {
		// Rollback in-memory changes
		item.Reserve(reservation.Quantity)
		return nil, err
	}

	// Update inventory with optimistic locking
	if err := uc.inventoryRepo.Update(ctx, item); err != nil {
		return nil, err
	}

	// Update reservation status
	if err := uc.reservationRepo.Update(ctx, reservation); err != nil {
		// Note: In a real system, this should be wrapped in a database transaction
		// to ensure atomicity. If reservation update fails, the inventory update
		// should also be rolled back.
		return nil, err
	}

	return &ConfirmReservationOutput{
		ReservationID:     reservation.ID,
		InventoryItemID:   item.ID,
		OrderID:           reservation.OrderID,
		QuantityConfirmed: reservation.Quantity,
		FinalStock:        item.Quantity,
		ReservedStock:     item.Reserved,
	}, nil
}
