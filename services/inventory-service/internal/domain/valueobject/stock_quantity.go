package valueobject

import "fmt"

// StockQuantity represents a valid stock quantity value.
// It enforces the invariant that stock quantities must be non-negative.
type StockQuantity struct {
	value int
}

// NewStockQuantity creates a new StockQuantity value object.
// Returns an error if the quantity is negative.
func NewStockQuantity(value int) (StockQuantity, error) {
	if value < 0 {
		return StockQuantity{}, ErrNegativeQuantity
	}
	return StockQuantity{value: value}, nil
}

// MustNewStockQuantity creates a StockQuantity and panics if invalid.
// Should only be used in scenarios where the value is known to be valid (e.g., constants).
func MustNewStockQuantity(value int) StockQuantity {
	sq, err := NewStockQuantity(value)
	if err != nil {
		panic(fmt.Sprintf("invalid stock quantity: %d", value))
	}
	return sq
}

// Value returns the underlying integer value.
func (sq StockQuantity) Value() int {
	return sq.value
}

// IsZero returns true if the quantity is zero.
func (sq StockQuantity) IsZero() bool {
	return sq.value == 0
}

// IsPositive returns true if the quantity is greater than zero.
func (sq StockQuantity) IsPositive() bool {
	return sq.value > 0
}

// Add returns a new StockQuantity with the given amount added.
// Returns an error if the result would be negative.
func (sq StockQuantity) Add(amount int) (StockQuantity, error) {
	newValue := sq.value + amount
	return NewStockQuantity(newValue)
}

// Subtract returns a new StockQuantity with the given amount subtracted.
// Returns an error if the result would be negative.
func (sq StockQuantity) Subtract(amount int) (StockQuantity, error) {
	newValue := sq.value - amount
	return NewStockQuantity(newValue)
}

// IsGreaterThan returns true if this quantity is greater than the other.
func (sq StockQuantity) IsGreaterThan(other StockQuantity) bool {
	return sq.value > other.value
}

// IsGreaterThanOrEqual returns true if this quantity is greater than or equal to the other.
func (sq StockQuantity) IsGreaterThanOrEqual(other StockQuantity) bool {
	return sq.value >= other.value
}

// IsLessThan returns true if this quantity is less than the other.
func (sq StockQuantity) IsLessThan(other StockQuantity) bool {
	return sq.value < other.value
}

// IsLessThanOrEqual returns true if this quantity is less than or equal to the other.
func (sq StockQuantity) IsLessThanOrEqual(other StockQuantity) bool {
	return sq.value <= other.value
}

// Equals returns true if this quantity equals the other.
func (sq StockQuantity) Equals(other StockQuantity) bool {
	return sq.value == other.value
}

// String returns the string representation of the quantity.
func (sq StockQuantity) String() string {
	return fmt.Sprintf("%d", sq.value)
}

// Domain error for StockQuantity
var (
	ErrNegativeQuantity = &DomainError{
		Code:    "NEGATIVE_QUANTITY",
		Message: "stock quantity cannot be negative",
	}
)

// DomainError represents a domain-level error for value objects
type DomainError struct {
	Code    string
	Message string
}

func (e *DomainError) Error() string {
	return e.Message
}
