package errors

import "fmt"

// DomainError represents a domain-level error with a code and message.
// It provides structured error information for better error handling and logging.
type DomainError struct {
	Code    string // Machine-readable error code
	Message string // Human-readable error message
	Details string // Optional additional details
}

// Error implements the error interface.
func (e *DomainError) Error() string {
	if e.Details != "" {
		return fmt.Sprintf("%s: %s", e.Message, e.Details)
	}
	return e.Message
}

// WithDetails returns a new DomainError with additional details.
// This allows adding context without modifying the original error.
func (e *DomainError) WithDetails(details string) *DomainError {
	return &DomainError{
		Code:    e.Code,
		Message: e.Message,
		Details: details,
	}
}

// Is checks if the error is of a specific type (for errors.Is compatibility).
func (e *DomainError) Is(target error) bool {
	t, ok := target.(*DomainError)
	if !ok {
		return false
	}
	return e.Code == t.Code
}

// ============================================================================
// Inventory Errors
// ============================================================================

var (
	// ErrInvalidQuantity is returned when a quantity value is invalid (negative or zero where positive expected).
	ErrInvalidQuantity = &DomainError{
		Code:    "INVALID_QUANTITY",
		Message: "quantity must be positive",
	}

	// ErrInsufficientStock is returned when there's not enough stock available for an operation.
	ErrInsufficientStock = &DomainError{
		Code:    "INSUFFICIENT_STOCK",
		Message: "not enough stock available",
	}

	// ErrInvalidReservationRelease is returned when trying to release more than currently reserved.
	ErrInvalidReservationRelease = &DomainError{
		Code:    "INVALID_RESERVATION_RELEASE",
		Message: "cannot release more than reserved quantity",
	}

	// ErrInvalidReservationConfirm is returned when trying to confirm more than currently reserved.
	ErrInvalidReservationConfirm = &DomainError{
		Code:    "INVALID_RESERVATION_CONFIRM",
		Message: "cannot confirm more than reserved quantity",
	}

	// ErrProductNotFound is returned when a product doesn't exist in inventory.
	ErrProductNotFound = &DomainError{
		Code:    "PRODUCT_NOT_FOUND",
		Message: "product not found in inventory",
	}

	// ErrInventoryItemNotFound is returned when an inventory item doesn't exist.
	ErrInventoryItemNotFound = &DomainError{
		Code:    "INVENTORY_ITEM_NOT_FOUND",
		Message: "inventory item not found",
	}

	// ErrInventoryItemAlreadyExists is returned when trying to create an inventory item for a product that already has one.
	ErrInventoryItemAlreadyExists = &DomainError{
		Code:    "INVENTORY_ITEM_ALREADY_EXISTS",
		Message: "inventory item already exists for this product",
	}

	// ErrOptimisticLockFailure is returned when an optimistic locking conflict occurs.
	// This happens when the Version field has changed since the entity was read.
	ErrOptimisticLockFailure = &DomainError{
		Code:    "OPTIMISTIC_LOCK_FAILURE",
		Message: "the item has been modified by another transaction, please retry",
	}
)

// ============================================================================
// Reservation Errors
// ============================================================================

var (
	// ErrInvalidDuration is returned when a duration value is invalid (negative or zero).
	ErrInvalidDuration = &DomainError{
		Code:    "INVALID_DURATION",
		Message: "duration must be positive",
	}

	// ErrReservationExpired is returned when trying to operate on an expired reservation.
	ErrReservationExpired = &DomainError{
		Code:    "RESERVATION_EXPIRED",
		Message: "reservation has expired",
	}

	// ErrReservationNotPending is returned when trying to perform an operation that requires pending status.
	ErrReservationNotPending = &DomainError{
		Code:    "RESERVATION_NOT_PENDING",
		Message: "reservation is not in pending status",
	}

	// ErrReservationNotExpired is returned when trying to mark as expired a reservation that hasn't expired yet.
	ErrReservationNotExpired = &DomainError{
		Code:    "RESERVATION_NOT_EXPIRED",
		Message: "reservation has not expired yet",
	}

	// ErrReservationNotFound is returned when a reservation doesn't exist.
	ErrReservationNotFound = &DomainError{
		Code:    "RESERVATION_NOT_FOUND",
		Message: "reservation not found",
	}

	// ErrReservationAlreadyExists is returned when trying to create a duplicate reservation.
	ErrReservationAlreadyExists = &DomainError{
		Code:    "RESERVATION_ALREADY_EXISTS",
		Message: "reservation already exists for this order",
	}
)

// ============================================================================
// Value Object Errors
// ============================================================================

var (
	// ErrNegativeQuantity is returned when a StockQuantity value is negative.
	ErrNegativeQuantity = &DomainError{
		Code:    "NEGATIVE_QUANTITY",
		Message: "stock quantity cannot be negative",
	}
)

// ============================================================================
// Generic Domain Errors
// ============================================================================

var (
	// ErrNotFound is a generic not found error.
	ErrNotFound = &DomainError{
		Code:    "NOT_FOUND",
		Message: "resource not found",
	}

	// ErrAlreadyExists is a generic already exists error.
	ErrAlreadyExists = &DomainError{
		Code:    "ALREADY_EXISTS",
		Message: "resource already exists",
	}

	// ErrInvalidInput is returned when input validation fails.
	ErrInvalidInput = &DomainError{
		Code:    "INVALID_INPUT",
		Message: "invalid input provided",
	}

	// ErrConcurrentModification is returned when a concurrent modification is detected.
	ErrConcurrentModification = &DomainError{
		Code:    "CONCURRENT_MODIFICATION",
		Message: "resource was modified concurrently",
	}
)

// ============================================================================
// Error Categories (for grouping and filtering)
// ============================================================================

// ErrorCategory represents the category of a domain error.
type ErrorCategory string

const (
	// CategoryValidation represents validation errors.
	CategoryValidation ErrorCategory = "VALIDATION"

	// CategoryNotFound represents not found errors.
	CategoryNotFound ErrorCategory = "NOT_FOUND"

	// CategoryConflict represents conflict errors (already exists, optimistic locking, etc.).
	CategoryConflict ErrorCategory = "CONFLICT"

	// CategoryBusinessRule represents business rule violations.
	CategoryBusinessRule ErrorCategory = "BUSINESS_RULE"

	// CategoryExpired represents expiration-related errors.
	CategoryExpired ErrorCategory = "EXPIRED"
)

// GetCategory returns the category of a domain error based on its code.
func GetCategory(err error) ErrorCategory {
	de, ok := err.(*DomainError)
	if !ok {
		return ""
	}

	switch de.Code {
	case "INVALID_QUANTITY", "INVALID_DURATION", "INVALID_INPUT", "NEGATIVE_QUANTITY":
		return CategoryValidation
	case "PRODUCT_NOT_FOUND", "INVENTORY_ITEM_NOT_FOUND", "RESERVATION_NOT_FOUND", "NOT_FOUND":
		return CategoryNotFound
	case "INVENTORY_ITEM_ALREADY_EXISTS", "RESERVATION_ALREADY_EXISTS", "ALREADY_EXISTS", "OPTIMISTIC_LOCK_FAILURE", "CONCURRENT_MODIFICATION":
		return CategoryConflict
	case "INSUFFICIENT_STOCK", "INVALID_RESERVATION_RELEASE", "INVALID_RESERVATION_CONFIRM", "RESERVATION_NOT_PENDING":
		return CategoryBusinessRule
	case "RESERVATION_EXPIRED", "RESERVATION_NOT_EXPIRED":
		return CategoryExpired
	default:
		return ""
	}
}

// IsValidationError checks if the error is a validation error.
func IsValidationError(err error) bool {
	return GetCategory(err) == CategoryValidation
}

// IsNotFoundError checks if the error is a not found error.
func IsNotFoundError(err error) bool {
	return GetCategory(err) == CategoryNotFound
}

// IsConflictError checks if the error is a conflict error.
func IsConflictError(err error) bool {
	return GetCategory(err) == CategoryConflict
}

// IsBusinessRuleError checks if the error is a business rule violation.
func IsBusinessRuleError(err error) bool {
	return GetCategory(err) == CategoryBusinessRule
}

// IsExpiredError checks if the error is expiration-related.
func IsExpiredError(err error) bool {
	return GetCategory(err) == CategoryExpired
}
