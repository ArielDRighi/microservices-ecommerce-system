package job

import (
	"context"
	"log"
	"time"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/repository"
	"github.com/google/uuid"
)

// ExpireReservationsJob is responsible for automatically expiring and releasing
// reservations that have passed their expiration time
type ExpireReservationsJob struct {
	inventoryRepo   repository.InventoryRepository
	reservationRepo repository.ReservationRepository
}

// NewExpireReservationsJob creates a new instance of ExpireReservationsJob
func NewExpireReservationsJob(
	inventoryRepo repository.InventoryRepository,
	reservationRepo repository.ReservationRepository,
) *ExpireReservationsJob {
	return &ExpireReservationsJob{
		inventoryRepo:   inventoryRepo,
		reservationRepo: reservationRepo,
	}
}

// Execute runs the job to find and expire all reservations that have passed their expiration time
// This should be called periodically (e.g., every minute) by a scheduler
func (j *ExpireReservationsJob) Execute(ctx context.Context) error {
	startTime := time.Now()

	// Find all expired reservations (limit 0 = no limit)
	expiredReservations, err := j.reservationRepo.FindExpired(ctx, 0)
	if err != nil {
		log.Printf("Error finding expired reservations: %v", err)
		return err
	}

	if len(expiredReservations) == 0 {
		log.Printf("No expired reservations found (checked in %v)", time.Since(startTime))
		return nil
	}

	log.Printf("Found %d expired reservation(s) to process", len(expiredReservations))

	processedCount := 0
	errorCount := 0

	// Process each expired reservation
	for _, reservation := range expiredReservations {
		if err := j.processExpiredReservation(ctx, reservation.ID); err != nil {
			log.Printf("Error processing expired reservation %s: %v", reservation.ID, err)
			errorCount++
			continue
		}
		processedCount++
	}

	duration := time.Since(startTime)
	log.Printf("Expired reservations job completed in %v: %d processed, %d errors",
		duration, processedCount, errorCount)

	return nil
}

// processExpiredReservation handles the expiration of a single reservation
func (j *ExpireReservationsJob) processExpiredReservation(ctx context.Context, reservationID uuid.UUID) error {
	// Find the reservation
	reservation, err := j.reservationRepo.FindByID(ctx, reservationID)
	if err != nil {
		return err
	}

	// Validate that the reservation can be marked as expired (must be pending and expired)
	if !reservation.IsPending() || !reservation.IsExpired() {
		log.Printf("Reservation %s cannot be expired (status: %s, expired: %v)",
			reservation.ID, reservation.Status, reservation.IsExpired())
		return nil
	}

	// Find the associated inventory item
	item, err := j.inventoryRepo.FindByID(ctx, reservation.InventoryItemID)
	if err != nil {
		return err
	}

	// Release the reservation at the entity level
	if err := item.ReleaseReservation(reservation.Quantity); err != nil {
		return err
	}

	// Mark reservation as expired
	if err := reservation.MarkAsExpired(); err != nil {
		// Rollback inventory changes if marking as expired fails
		item.Reserve(reservation.Quantity)
		return err
	}

	// Update inventory item with optimistic locking
	if err := j.inventoryRepo.Update(ctx, item); err != nil {
		// Rollback entity changes
		item.Reserve(reservation.Quantity)
		return err
	}

	// Update reservation status
	if err := j.reservationRepo.Update(ctx, reservation); err != nil {
		// Note: At this point, inventory is already updated in DB
		// This is a potential inconsistency that should be handled by a saga/transaction pattern
		log.Printf("Warning: Inventory updated but reservation update failed for %s: %v",
			reservation.ID, err)
		return err
	}

	log.Printf("Successfully expired reservation %s (order: %s, quantity: %d)",
		reservation.ID, reservation.OrderID, reservation.Quantity)

	return nil
}
