package entity

import (
	"time"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/errors"
	"github.com/google/uuid"
)

// ReservationStatus represents the status of a stock reservation
type ReservationStatus string

const (
	// ReservationPending indicates the reservation is active and waiting for confirmation
	ReservationPending ReservationStatus = "pending"
	// ReservationConfirmed indicates the reservation has been confirmed and stock decremented
	ReservationConfirmed ReservationStatus = "confirmed"
	// ReservationReleased indicates the reservation was cancelled and stock released
	ReservationReleased ReservationStatus = "released"
	// ReservationExpired indicates the reservation expired due to timeout
	ReservationExpired ReservationStatus = "expired"
)

// DefaultReservationDuration is the default time a reservation remains valid (15 minutes)
const DefaultReservationDuration = 15 * time.Minute

// Reservation represents a temporary stock reservation for an order.
// Reservations have a TTL (Time To Live) and can be in different statuses.
type Reservation struct {
	ID              uuid.UUID         `json:"id"`
	InventoryItemID uuid.UUID         `json:"inventory_item_id"`
	OrderID         uuid.UUID         `json:"order_id"`
	Quantity        int               `json:"quantity"`
	Status          ReservationStatus `json:"status"`
	ExpiresAt       time.Time         `json:"expires_at"`
	CreatedAt       time.Time         `json:"created_at"`
	UpdatedAt       time.Time         `json:"updated_at"`
}

// NewReservation creates a new pending reservation for an order.
// The reservation will expire after the default duration (15 minutes).
// Returns an error if the quantity is invalid.
func NewReservation(inventoryItemID, orderID uuid.UUID, quantity int) (*Reservation, error) {
	return NewReservationWithDuration(inventoryItemID, orderID, quantity, DefaultReservationDuration)
}

// NewReservationWithDuration creates a new pending reservation with a custom expiration duration.
// Returns an error if the quantity is invalid (negative or zero).
func NewReservationWithDuration(inventoryItemID, orderID uuid.UUID, quantity int, duration time.Duration) (*Reservation, error) {
	if quantity <= 0 {
		return nil, errors.ErrInvalidQuantity
	}

	if duration <= 0 {
		return nil, errors.ErrInvalidDuration
	}

	now := time.Now()
	return &Reservation{
		ID:              uuid.New(),
		InventoryItemID: inventoryItemID,
		OrderID:         orderID,
		Quantity:        quantity,
		Status:          ReservationPending,
		ExpiresAt:       now.Add(duration),
		CreatedAt:       now,
		UpdatedAt:       now,
	}, nil
}

// IsExpired checks if the reservation has passed its expiration time.
// Only checks the timestamp, does not consider the status.
func (r *Reservation) IsExpired() bool {
	return time.Now().After(r.ExpiresAt)
}

// IsPending returns true if the reservation is in pending status.
func (r *Reservation) IsPending() bool {
	return r.Status == ReservationPending
}

// IsConfirmed returns true if the reservation has been confirmed.
func (r *Reservation) IsConfirmed() bool {
	return r.Status == ReservationConfirmed
}

// IsReleased returns true if the reservation has been released/cancelled.
func (r *Reservation) IsReleased() bool {
	return r.Status == ReservationReleased
}

// IsActive returns true if the reservation is pending and not yet expired.
// This is the main method to check if a reservation is still valid.
func (r *Reservation) IsActive() bool {
	return r.IsPending() && !r.IsExpired()
}

// CanBeConfirmed returns true if the reservation can be confirmed.
// A reservation can be confirmed if it's pending and not expired.
func (r *Reservation) CanBeConfirmed() bool {
	return r.IsActive()
}

// CanBeReleased returns true if the reservation can be released.
// A reservation can be released if it's pending (expired or not).
func (r *Reservation) CanBeReleased() bool {
	return r.IsPending()
}

// Confirm marks the reservation as confirmed.
// Should be called when the order is confirmed/paid.
// Returns an error if the reservation cannot be confirmed (not pending or expired).
func (r *Reservation) Confirm() error {
	if !r.CanBeConfirmed() {
		if r.IsExpired() {
			return errors.ErrReservationExpired
		}
		return errors.ErrReservationNotPending
	}

	r.Status = ReservationConfirmed
	r.UpdatedAt = time.Now()
	return nil
}

// Release marks the reservation as released/cancelled.
// Should be called when an order is cancelled.
// Returns an error if the reservation is not in pending status.
func (r *Reservation) Release() error {
	if !r.CanBeReleased() {
		return errors.ErrReservationNotPending
	}

	r.Status = ReservationReleased
	r.UpdatedAt = time.Now()
	return nil
}

// MarkAsExpired marks the reservation as expired.
// Should be called by a background job that cleans up expired reservations.
// Returns an error if the reservation is not pending or not actually expired.
func (r *Reservation) MarkAsExpired() error {
	if !r.IsPending() {
		return errors.ErrReservationNotPending
	}

	if !r.IsExpired() {
		return errors.ErrReservationNotExpired
	}

	r.Status = ReservationExpired
	r.UpdatedAt = time.Now()
	return nil
}

// Extend prolongs the reservation by the specified duration.
// Can only extend pending reservations that haven't expired yet.
// Returns an error if the reservation cannot be extended.
func (r *Reservation) Extend(duration time.Duration) error {
	if duration <= 0 {
		return errors.ErrInvalidDuration
	}

	if !r.IsActive() {
		if r.IsExpired() {
			return errors.ErrReservationExpired
		}
		return errors.ErrReservationNotPending
	}

	r.ExpiresAt = r.ExpiresAt.Add(duration)
	r.UpdatedAt = time.Now()
	return nil
}

// TimeUntilExpiry returns the duration until the reservation expires.
// Returns 0 if already expired.
func (r *Reservation) TimeUntilExpiry() time.Duration {
	if r.IsExpired() {
		return 0
	}
	return time.Until(r.ExpiresAt)
}
