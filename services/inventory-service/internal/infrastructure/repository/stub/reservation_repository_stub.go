package stub

import (
	"context"
	"time"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/entity"
	"github.com/google/uuid"
)

// ReservationRepositoryStub is a stub implementation for development/testing
type ReservationRepositoryStub struct{}

// NewReservationRepositoryStub creates a new stub instance
func NewReservationRepositoryStub() *ReservationRepositoryStub {
	return &ReservationRepositoryStub{}
}

// FindByID returns nil (not implemented)
func (r *ReservationRepositoryStub) FindByID(ctx context.Context, reservationID uuid.UUID) (*entity.Reservation, error) {
	return nil, nil
}

// FindByOrderID returns nil (stub)
func (r *ReservationRepositoryStub) FindByOrderID(ctx context.Context, orderID uuid.UUID) (*entity.Reservation, error) {
	return nil, nil
}

// Save does nothing (stub)
func (r *ReservationRepositoryStub) Save(ctx context.Context, reservation *entity.Reservation) error {
	return nil
}

// Update does nothing (stub)
func (r *ReservationRepositoryStub) Update(ctx context.Context, reservation *entity.Reservation) error {
	return nil
}

// Delete does nothing (stub)
func (r *ReservationRepositoryStub) Delete(ctx context.Context, reservationID uuid.UUID) error {
	return nil
}

// FindExpired returns empty slice (no expired reservations in stub)
func (r *ReservationRepositoryStub) FindExpired(ctx context.Context, limit int) ([]*entity.Reservation, error) {
	return []*entity.Reservation{}, nil
}

// UpdateStatus does nothing (stub)
func (r *ReservationRepositoryStub) UpdateStatus(ctx context.Context, reservationID uuid.UUID, status entity.ReservationStatus) error {
	return nil
}

// FindPendingExpiredBefore returns empty slice
func (r *ReservationRepositoryStub) FindPendingExpiredBefore(ctx context.Context, before time.Time, limit int) ([]*entity.Reservation, error) {
	return []*entity.Reservation{}, nil
}

// FindByInventoryItemID returns empty slice (stub)
func (r *ReservationRepositoryStub) FindByInventoryItemID(ctx context.Context, inventoryItemID uuid.UUID, status entity.ReservationStatus) ([]*entity.Reservation, error) {
	return []*entity.Reservation{}, nil
}

// FindExpiringBetween returns empty slice (stub)
func (r *ReservationRepositoryStub) FindExpiringBetween(ctx context.Context, start, end time.Time) ([]*entity.Reservation, error) {
	return []*entity.Reservation{}, nil
}

// FindActiveByInventoryItemID returns empty slice (stub)
func (r *ReservationRepositoryStub) FindActiveByInventoryItemID(ctx context.Context, inventoryItemID uuid.UUID) ([]*entity.Reservation, error) {
	return []*entity.Reservation{}, nil
}

// FindByStatus returns empty slice (stub)
func (r *ReservationRepositoryStub) FindByStatus(ctx context.Context, status entity.ReservationStatus, limit, offset int) ([]*entity.Reservation, error) {
	return []*entity.Reservation{}, nil
}

// CountByStatus returns 0 (stub)
func (r *ReservationRepositoryStub) CountByStatus(ctx context.Context, status entity.ReservationStatus) (int64, error) {
	return 0, nil
}

// CountActiveByInventoryItemID returns 0 (stub)
func (r *ReservationRepositoryStub) CountActiveByInventoryItemID(ctx context.Context, inventoryItemID uuid.UUID) (int64, error) {
	return 0, nil
}

// ExistsByOrderID returns false (stub)
func (r *ReservationRepositoryStub) ExistsByOrderID(ctx context.Context, orderID uuid.UUID) (bool, error) {
	return false, nil
}

// FindAll returns empty slice (stub)
func (r *ReservationRepositoryStub) FindAll(ctx context.Context, limit, offset int) ([]*entity.Reservation, error) {
	return []*entity.Reservation{}, nil
}

// DeleteExpired returns 0 (stub)
func (r *ReservationRepositoryStub) DeleteExpired(ctx context.Context) (int64, error) {
	return 0, nil
}
