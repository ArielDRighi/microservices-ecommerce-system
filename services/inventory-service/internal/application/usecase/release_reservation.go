package usecase

import (
	"context"
	"log"
	"time"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/errors"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/events"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/repository"
	"github.com/google/uuid"
)

// ReleaseReservationInput represents the input for releasing a reservation
type ReleaseReservationInput struct {
	ReservationID uuid.UUID
}

// ReleaseReservationOutput represents the result of releasing a reservation
type ReleaseReservationOutput struct {
	ReservationID    uuid.UUID
	InventoryItemID  uuid.UUID
	OrderID          uuid.UUID
	QuantityReleased int
	AvailableStock   int
	ReservedStock    int
}

// ReleaseReservationUseCase handles canceling reservations and releasing stock back to available
// This operation:
// 1. Marks the reservation as released
// 2. Decrements Reserved quantity (making it available again)
// 3. Does NOT decrement actual Quantity (stock remains in inventory)
type ReleaseReservationUseCase struct {
	inventoryRepo   repository.InventoryRepository
	reservationRepo repository.ReservationRepository
	publisher       events.Publisher
}

// NewReleaseReservationUseCase creates a new instance of ReleaseReservationUseCase
func NewReleaseReservationUseCase(
	inventoryRepo repository.InventoryRepository,
	reservationRepo repository.ReservationRepository,
	publisher events.Publisher,
) *ReleaseReservationUseCase {
	return &ReleaseReservationUseCase{
		inventoryRepo:   inventoryRepo,
		reservationRepo: reservationRepo,
		publisher:       publisher,
	}
}

// Execute releases a reservation and makes the stock available again
// This operation should be atomic (wrapped in a transaction in the infrastructure layer)
// Steps:
// 1. Find reservation by ID
// 2. Validate reservation can be released (pending status)
// 3. Find inventory item
// 4. Release reservation on inventory (decrements Reserved only)
// 5. Update reservation status to released
// 6. Update inventory with optimistic locking
// 7. Update reservation
func (uc *ReleaseReservationUseCase) Execute(ctx context.Context, input ReleaseReservationInput) (*ReleaseReservationOutput, error) {
	// Find reservation
	reservation, err := uc.reservationRepo.FindByID(ctx, input.ReservationID)
	if err != nil {
		return nil, errors.ErrReservationNotFound.WithDetails(err.Error())
	}

	// Validate reservation can be released
	if !reservation.CanBeReleased() {
		return nil, errors.ErrReservationNotPending
	}

	// Find inventory item
	item, err := uc.inventoryRepo.FindByID(ctx, reservation.InventoryItemID)
	if err != nil {
		return nil, errors.ErrInventoryItemNotFound.WithDetails(err.Error())
	}

	// Release reservation on inventory entity
	// This decrements Reserved but NOT Quantity
	if err := item.ReleaseReservation(reservation.Quantity); err != nil {
		return nil, err
	}

	// Mark reservation as released
	if err := reservation.Release(); err != nil {
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

	// Publish StockReleased event (don't fail transaction if event publication fails)
	stockReleasedEvent := events.StockReleasedEvent{
		BaseEvent: events.BaseEvent{
			EventID:   uuid.New().String(),
			EventType: "stock_released",
			Timestamp: time.Now().Format(time.RFC3339),
			Version:   events.EventVersion,
			Source:    events.SourceInventoryService,
		},
		Payload: events.StockReleasedPayload{
			ReservationID: reservation.ID.String(),
			ProductID:     item.ProductID.String(),
			Quantity:      reservation.Quantity,
			OrderID:       reservation.OrderID.String(),
			UserID:        "",               // TODO: Get from context when auth is implemented
			Reason:        "manual_release", // TODO: Get actual reason from input
			ReleasedAt:    time.Now(),
		},
	}

	if err := uc.publisher.PublishStockReleased(ctx, stockReleasedEvent); err != nil {
		// Log error but don't fail the release
		log.Printf("Failed to publish StockReleased event: %v", err)
	}

	return &ReleaseReservationOutput{
		ReservationID:    reservation.ID,
		InventoryItemID:  item.ID,
		OrderID:          reservation.OrderID,
		QuantityReleased: reservation.Quantity,
		AvailableStock:   item.Available(),
		ReservedStock:    item.Reserved,
	}, nil
}
