package entity

import (
	"time"

	"github.com/google/uuid"
)

// InventoryItem represents a product inventory record in the system.
// It tracks the total quantity, reserved quantity, and computed available quantity.
// Uses optimistic locking via Version field to handle concurrent updates safely.
type InventoryItem struct {
	ID        uuid.UUID `json:"id"`
	ProductID uuid.UUID `json:"product_id"`
	Quantity  int       `json:"quantity"` // Total quantity in stock
	Reserved  int       `json:"reserved"` // Quantity temporarily reserved for pending orders
	Version   int       `json:"version"`  // Optimistic locking version
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// NewInventoryItem creates a new inventory item for a product with initial quantity.
// Returns an error if the initial quantity is negative.
func NewInventoryItem(productID uuid.UUID, initialQuantity int) (*InventoryItem, error) {
	if initialQuantity < 0 {
		return nil, ErrInvalidQuantity
	}

	now := time.Now()
	return &InventoryItem{
		ID:        uuid.New(),
		ProductID: productID,
		Quantity:  initialQuantity,
		Reserved:  0,
		Version:   1,
		CreatedAt: now,
		UpdatedAt: now,
	}, nil
}

// Available returns the quantity available for reservation.
// It's computed as: Quantity - Reserved
func (i *InventoryItem) Available() int {
	return i.Quantity - i.Reserved
}

// CanReserve checks if the requested quantity can be reserved.
// Returns true if Available() >= quantity.
func (i *InventoryItem) CanReserve(quantity int) bool {
	return i.Available() >= quantity
}

// Reserve reserves a quantity for a pending order.
// Returns an error if:
// - quantity is negative or zero
// - insufficient stock available
// Updates Reserved field and Version for optimistic locking.
func (i *InventoryItem) Reserve(quantity int) error {
	if quantity <= 0 {
		return ErrInvalidQuantity
	}

	if !i.CanReserve(quantity) {
		return ErrInsufficientStock
	}

	i.Reserved += quantity
	i.Version++
	i.UpdatedAt = time.Now()
	return nil
}

// ReleaseReservation releases a previously reserved quantity back to available.
// Used when an order is cancelled or a reservation expires.
// Returns an error if:
// - quantity is negative or zero
// - trying to release more than currently reserved
func (i *InventoryItem) ReleaseReservation(quantity int) error {
	if quantity <= 0 {
		return ErrInvalidQuantity
	}

	if i.Reserved < quantity {
		return ErrInvalidReservationRelease
	}

	i.Reserved -= quantity
	i.Version++
	i.UpdatedAt = time.Now()
	return nil
}

// ConfirmReservation confirms a reservation and decrements actual stock.
// This is called when an order is confirmed/paid.
// The quantity moves from Reserved to permanent deduction from Quantity.
// Returns an error if:
// - quantity is negative or zero
// - trying to confirm more than currently reserved
// - resulting Quantity would be negative
func (i *InventoryItem) ConfirmReservation(quantity int) error {
	if quantity <= 0 {
		return ErrInvalidQuantity
	}

	if i.Reserved < quantity {
		return ErrInvalidReservationConfirm
	}

	if i.Quantity < quantity {
		return ErrInsufficientStock
	}

	i.Reserved -= quantity
	i.Quantity -= quantity
	i.Version++
	i.UpdatedAt = time.Now()
	return nil
}

// AddStock increases the total quantity of inventory.
// Used for restocking operations.
// Returns an error if quantity is negative or zero.
func (i *InventoryItem) AddStock(quantity int) error {
	if quantity <= 0 {
		return ErrInvalidQuantity
	}

	i.Quantity += quantity
	i.Version++
	i.UpdatedAt = time.Now()
	return nil
}

// DecrementStock directly decrements the quantity without reservation.
// Used for direct sales or manual adjustments.
// Returns an error if:
// - quantity is negative or zero
// - insufficient available stock
func (i *InventoryItem) DecrementStock(quantity int) error {
	if quantity <= 0 {
		return ErrInvalidQuantity
	}

	if !i.CanReserve(quantity) {
		return ErrInsufficientStock
	}

	i.Quantity -= quantity
	i.Version++
	i.UpdatedAt = time.Now()
	return nil
}

// IsStockAvailable checks if at least the minimum quantity is available.
// Helper method for quick stock checks.
func (i *InventoryItem) IsStockAvailable(minQuantity int) bool {
	return i.Available() >= minQuantity
}

// Domain errors
var (
	ErrInvalidQuantity           = &DomainError{Code: "INVALID_QUANTITY", Message: "quantity must be positive"}
	ErrInsufficientStock         = &DomainError{Code: "INSUFFICIENT_STOCK", Message: "not enough stock available"}
	ErrInvalidReservationRelease = &DomainError{Code: "INVALID_RESERVATION_RELEASE", Message: "cannot release more than reserved quantity"}
	ErrInvalidReservationConfirm = &DomainError{Code: "INVALID_RESERVATION_CONFIRM", Message: "cannot confirm more than reserved quantity"}
)

// DomainError represents a domain-level error
type DomainError struct {
	Code    string
	Message string
}

func (e *DomainError) Error() string {
	return e.Message
}
