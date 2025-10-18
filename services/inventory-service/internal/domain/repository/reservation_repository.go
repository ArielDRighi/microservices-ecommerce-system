package repository

import (
	"context"
	"time"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/entity"
	"github.com/google/uuid"
)

// ReservationRepository defines the contract for reservation persistence operations.
type ReservationRepository interface {
	// FindByID retrieves a reservation by its ID.
	// Returns ErrNotFound if the reservation doesn't exist.
	FindByID(ctx context.Context, id uuid.UUID) (*entity.Reservation, error)

	// FindByOrderID retrieves a reservation by order ID.
	// Returns ErrNotFound if the reservation doesn't exist.
	// Note: An order should have only one active reservation at a time.
	FindByOrderID(ctx context.Context, orderID uuid.UUID) (*entity.Reservation, error)

	// Save creates a new reservation in the repository.
	Save(ctx context.Context, reservation *entity.Reservation) error

	// Update updates an existing reservation.
	// Returns ErrNotFound if the reservation doesn't exist.
	Update(ctx context.Context, reservation *entity.Reservation) error

	// Delete removes a reservation from the repository.
	// Returns ErrNotFound if the reservation doesn't exist.
	Delete(ctx context.Context, id uuid.UUID) error

	// FindByInventoryItemID retrieves all reservations for a specific inventory item.
	// Can optionally filter by status.
	// If status is empty, returns all reservations regardless of status.
	FindByInventoryItemID(ctx context.Context, inventoryItemID uuid.UUID, status entity.ReservationStatus) ([]*entity.Reservation, error)

	// FindExpired retrieves all pending reservations that have passed their expiry time.
	// This is used by background jobs to clean up expired reservations.
	// Limit controls the maximum number of results (0 = no limit).
	FindExpired(ctx context.Context, limit int) ([]*entity.Reservation, error)

	// FindExpiringBetween retrieves pending reservations expiring within a time range.
	// Useful for sending expiry warnings or proactive cleanup.
	FindExpiringBetween(ctx context.Context, start, end time.Time) ([]*entity.Reservation, error)

	// FindActiveByInventoryItemID retrieves all active (pending, non-expired) reservations
	// for a specific inventory item.
	// Active means: Status = Pending AND ExpiresAt > Now
	FindActiveByInventoryItemID(ctx context.Context, inventoryItemID uuid.UUID) ([]*entity.Reservation, error)

	// FindByStatus retrieves all reservations with a specific status.
	// Supports pagination with limit and offset.
	FindByStatus(ctx context.Context, status entity.ReservationStatus, limit, offset int) ([]*entity.Reservation, error)

	// CountByStatus returns the count of reservations by status.
	CountByStatus(ctx context.Context, status entity.ReservationStatus) (int64, error)

	// CountActiveByInventoryItemID returns the count of active reservations for an inventory item.
	CountActiveByInventoryItemID(ctx context.Context, inventoryItemID uuid.UUID) (int64, error)

	// ExistsByOrderID checks if a reservation exists for an order.
	// Returns true if exists, false otherwise.
	ExistsByOrderID(ctx context.Context, orderID uuid.UUID) (bool, error)

	// FindAll retrieves all reservations with optional pagination.
	// If limit is 0, returns all reservations (use with caution).
	FindAll(ctx context.Context, limit, offset int) ([]*entity.Reservation, error)

	// DeleteExpired removes all expired pending reservations from the repository.
	// Returns the number of deleted reservations.
	// This is typically used by cleanup jobs.
	DeleteExpired(ctx context.Context) (int64, error)
}
