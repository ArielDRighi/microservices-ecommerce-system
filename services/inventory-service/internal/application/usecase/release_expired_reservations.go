package usecase

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/entity"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/events"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/repository"
	"github.com/google/uuid"
)

// ReleaseExpiredReservationsOutput represents the result of releasing expired reservations
type ReleaseExpiredReservationsOutput struct {
	TotalFound              int
	TotalReleased           int
	TotalFailed             int
	ReleasedReservationIDs  []uuid.UUID
	FailedReservations      []FailedReservation
	ExecutionDurationMillis int64
}

// FailedReservation represents a reservation that failed to be released
type FailedReservation struct {
	ReservationID uuid.UUID
	Reason        string
}

// ReleaseExpiredReservationsUseCase handles releasing all expired reservations
// This is typically executed by a cronjob/scheduled task
type ReleaseExpiredReservationsUseCase struct {
	inventoryRepo   repository.InventoryRepository
	reservationRepo repository.ReservationRepository
	publisher       events.Publisher
}

// NewReleaseExpiredReservationsUseCase creates a new instance
func NewReleaseExpiredReservationsUseCase(
	inventoryRepo repository.InventoryRepository,
	reservationRepo repository.ReservationRepository,
	publisher events.Publisher,
) *ReleaseExpiredReservationsUseCase {
	return &ReleaseExpiredReservationsUseCase{
		inventoryRepo:   inventoryRepo,
		reservationRepo: reservationRepo,
		publisher:       publisher,
	}
}

// Execute releases all expired reservations
// This operation:
//  1. Finds all expired reservations (status=pending and expiresAt < now)
//  2. For each expired reservation:
//     a. Releases the reserved stock
//     b. Marks reservation as released
//     c. Publishes StockReleased event with reason="reservation_expired"
//  3. Returns summary of operations (total found, released, failed)
//
// Note: This operation continues processing all reservations even if some fail.
// Individual failures are logged and tracked, but don't stop the batch process.
func (uc *ReleaseExpiredReservationsUseCase) Execute(ctx context.Context) (*ReleaseExpiredReservationsOutput, error) {
	startTime := time.Now()

	log.Printf("[ReleaseExpiredReservations] Starting batch process at %s", startTime.Format(time.RFC3339))

	// Find all expired reservations (limit 1000 to prevent memory issues)
	const batchLimit = 1000
	expiredReservations, err := uc.reservationRepo.FindExpired(ctx, batchLimit)
	if err != nil {
		log.Printf("[ReleaseExpiredReservations] ERROR: Failed to find expired reservations: %v", err)
		return nil, fmt.Errorf("failed to find expired reservations: %w", err)
	}

	totalFound := len(expiredReservations)
	log.Printf("[ReleaseExpiredReservations] Found %d expired reservations", totalFound)

	if totalFound == 0 {
		return &ReleaseExpiredReservationsOutput{
			TotalFound:              0,
			TotalReleased:           0,
			TotalFailed:             0,
			ReleasedReservationIDs:  []uuid.UUID{},
			FailedReservations:      []FailedReservation{},
			ExecutionDurationMillis: time.Since(startTime).Milliseconds(),
		}, nil
	}

	// Process each expired reservation
	var releasedIDs []uuid.UUID
	var failedReservations []FailedReservation

	for _, reservation := range expiredReservations {
		log.Printf("[ReleaseExpiredReservations] Processing reservation %s (order: %s, quantity: %d)",
			reservation.ID, reservation.OrderID, reservation.Quantity)

		if err := uc.releaseReservation(ctx, reservation); err != nil {
			log.Printf("[ReleaseExpiredReservations] ERROR: Failed to release reservation %s: %v",
				reservation.ID, err)
			failedReservations = append(failedReservations, FailedReservation{
				ReservationID: reservation.ID,
				Reason:        err.Error(),
			})
			continue
		}

		log.Printf("[ReleaseExpiredReservations] SUCCESS: Released reservation %s", reservation.ID)
		releasedIDs = append(releasedIDs, reservation.ID)
	}

	executionDuration := time.Since(startTime)
	log.Printf("[ReleaseExpiredReservations] Batch process completed in %dms. Released: %d, Failed: %d",
		executionDuration.Milliseconds(), len(releasedIDs), len(failedReservations))

	return &ReleaseExpiredReservationsOutput{
		TotalFound:              totalFound,
		TotalReleased:           len(releasedIDs),
		TotalFailed:             len(failedReservations),
		ReleasedReservationIDs:  releasedIDs,
		FailedReservations:      failedReservations,
		ExecutionDurationMillis: executionDuration.Milliseconds(),
	}, nil
}

// releaseReservation releases a single expired reservation
func (uc *ReleaseExpiredReservationsUseCase) releaseReservation(
	ctx context.Context,
	reservation *entity.Reservation,
) error {
	// Find inventory item
	item, err := uc.inventoryRepo.FindByID(ctx, reservation.InventoryItemID)
	if err != nil {
		return fmt.Errorf("inventory item not found: %w", err)
	}

	// Release reservation on inventory entity
	if err := item.ReleaseReservation(reservation.Quantity); err != nil {
		return fmt.Errorf("failed to release reservation on inventory: %w", err)
	}

	// Mark reservation as released
	if err := reservation.Release(); err != nil {
		// Rollback in-memory changes
		item.Reserve(reservation.Quantity)
		return fmt.Errorf("failed to mark reservation as released: %w", err)
	}

	// Update inventory with optimistic locking
	if err := uc.inventoryRepo.Update(ctx, item); err != nil {
		return fmt.Errorf("failed to update inventory: %w", err)
	}

	// Update reservation status
	if err := uc.reservationRepo.Update(ctx, reservation); err != nil {
		return fmt.Errorf("failed to update reservation: %w", err)
	}

	// Publish StockReleased event (don't fail if event publication fails)
	stockReleasedEvent := events.StockReleasedEvent{
		BaseEvent: events.BaseEvent{
			EventID:   uuid.New().String(),
			EventType: events.RoutingKeyStockReleased,
			Timestamp: time.Now().Format(time.RFC3339),
			Version:   events.EventVersion,
			Source:    events.SourceInventoryService,
		},
		Payload: events.StockReleasedPayload{
			ReservationID: reservation.ID.String(),
			ProductID:     item.ProductID.String(),
			Quantity:      reservation.Quantity,
			OrderID:       reservation.OrderID.String(),
			UserID:        "", // Not available in expired context
			Reason:        "reservation_expired",
			ReleasedAt:    time.Now(),
		},
	}

	if err := uc.publisher.PublishStockReleased(ctx, stockReleasedEvent); err != nil {
		// Log error but don't fail the release operation
		log.Printf("[ReleaseExpiredReservations] WARNING: Failed to publish StockReleased event for reservation %s: %v",
			reservation.ID, err)
	}

	return nil
}
