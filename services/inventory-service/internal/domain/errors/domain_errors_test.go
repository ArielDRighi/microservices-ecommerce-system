package errors

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestDomainError_Error(t *testing.T) {
	t.Run("should return message without details", func(t *testing.T) {
		err := &DomainError{
			Code:    "TEST_ERROR",
			Message: "test error message",
		}

		assert.Equal(t, "test error message", err.Error())
	})

	t.Run("should return message with details", func(t *testing.T) {
		err := &DomainError{
			Code:    "TEST_ERROR",
			Message: "test error message",
			Details: "additional context",
		}

		assert.Equal(t, "test error message: additional context", err.Error())
	})
}

func TestDomainError_WithDetails(t *testing.T) {
	t.Run("should create new error with details", func(t *testing.T) {
		original := ErrInsufficientStock

		newErr := original.WithDetails("requested: 100, available: 50")

		// Original unchanged
		assert.Equal(t, "", original.Details)
		assert.Equal(t, "not enough stock available", original.Error())

		// New error has details
		assert.Equal(t, "requested: 100, available: 50", newErr.Details)
		assert.Equal(t, "not enough stock available: requested: 100, available: 50", newErr.Error())
		assert.Equal(t, original.Code, newErr.Code)
		assert.Equal(t, original.Message, newErr.Message)
	})
}

func TestDomainError_Is(t *testing.T) {
	t.Run("should match errors with same code", func(t *testing.T) {
		err1 := &DomainError{Code: "TEST_ERROR", Message: "test"}
		err2 := &DomainError{Code: "TEST_ERROR", Message: "different message"}

		assert.True(t, err1.Is(err2))
		assert.True(t, err2.Is(err1))
	})

	t.Run("should not match errors with different codes", func(t *testing.T) {
		err1 := &DomainError{Code: "ERROR_1", Message: "test"}
		err2 := &DomainError{Code: "ERROR_2", Message: "test"}

		assert.False(t, err1.Is(err2))
	})

	t.Run("should not match non-domain errors", func(t *testing.T) {
		domainErr := &DomainError{Code: "TEST", Message: "test"}
		stdErr := errors.New("standard error")

		assert.False(t, domainErr.Is(stdErr))
	})

	t.Run("should work with errors.Is", func(t *testing.T) {
		err := ErrInsufficientStock.WithDetails("test")

		assert.True(t, errors.Is(err, ErrInsufficientStock))
	})
}

func TestInventoryErrors(t *testing.T) {
	t.Run("should have correct codes and messages", func(t *testing.T) {
		tests := []struct {
			name    string
			err     *DomainError
			code    string
			message string
		}{
			{"InvalidQuantity", ErrInvalidQuantity, "INVALID_QUANTITY", "quantity must be positive"},
			{"InsufficientStock", ErrInsufficientStock, "INSUFFICIENT_STOCK", "not enough stock available"},
			{"InvalidReservationRelease", ErrInvalidReservationRelease, "INVALID_RESERVATION_RELEASE", "cannot release more than reserved quantity"},
			{"InvalidReservationConfirm", ErrInvalidReservationConfirm, "INVALID_RESERVATION_CONFIRM", "cannot confirm more than reserved quantity"},
			{"ProductNotFound", ErrProductNotFound, "PRODUCT_NOT_FOUND", "product not found in inventory"},
			{"InventoryItemNotFound", ErrInventoryItemNotFound, "INVENTORY_ITEM_NOT_FOUND", "inventory item not found"},
			{"InventoryItemAlreadyExists", ErrInventoryItemAlreadyExists, "INVENTORY_ITEM_ALREADY_EXISTS", "inventory item already exists for this product"},
			{"OptimisticLockFailure", ErrOptimisticLockFailure, "OPTIMISTIC_LOCK_FAILURE", "the item has been modified by another transaction, please retry"},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				assert.Equal(t, tt.code, tt.err.Code)
				assert.Equal(t, tt.message, tt.err.Message)
				assert.Equal(t, "", tt.err.Details)
			})
		}
	})
}

func TestReservationErrors(t *testing.T) {
	t.Run("should have correct codes and messages", func(t *testing.T) {
		tests := []struct {
			name    string
			err     *DomainError
			code    string
			message string
		}{
			{"InvalidDuration", ErrInvalidDuration, "INVALID_DURATION", "duration must be positive"},
			{"ReservationExpired", ErrReservationExpired, "RESERVATION_EXPIRED", "reservation has expired"},
			{"ReservationNotPending", ErrReservationNotPending, "RESERVATION_NOT_PENDING", "reservation is not in pending status"},
			{"ReservationNotExpired", ErrReservationNotExpired, "RESERVATION_NOT_EXPIRED", "reservation has not expired yet"},
			{"ReservationNotFound", ErrReservationNotFound, "RESERVATION_NOT_FOUND", "reservation not found"},
			{"ReservationAlreadyExists", ErrReservationAlreadyExists, "RESERVATION_ALREADY_EXISTS", "reservation already exists for this order"},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				assert.Equal(t, tt.code, tt.err.Code)
				assert.Equal(t, tt.message, tt.err.Message)
				assert.Equal(t, "", tt.err.Details)
			})
		}
	})
}

func TestValueObjectErrors(t *testing.T) {
	t.Run("should have correct codes and messages", func(t *testing.T) {
		assert.Equal(t, "NEGATIVE_QUANTITY", ErrNegativeQuantity.Code)
		assert.Equal(t, "stock quantity cannot be negative", ErrNegativeQuantity.Message)
	})
}

func TestGenericErrors(t *testing.T) {
	t.Run("should have correct codes and messages", func(t *testing.T) {
		tests := []struct {
			name    string
			err     *DomainError
			code    string
			message string
		}{
			{"NotFound", ErrNotFound, "NOT_FOUND", "resource not found"},
			{"AlreadyExists", ErrAlreadyExists, "ALREADY_EXISTS", "resource already exists"},
			{"InvalidInput", ErrInvalidInput, "INVALID_INPUT", "invalid input provided"},
			{"ConcurrentModification", ErrConcurrentModification, "CONCURRENT_MODIFICATION", "resource was modified concurrently"},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				assert.Equal(t, tt.code, tt.err.Code)
				assert.Equal(t, tt.message, tt.err.Message)
			})
		}
	})
}

func TestGetCategory(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		expected ErrorCategory
	}{
		// Validation errors
		{"InvalidQuantity", ErrInvalidQuantity, CategoryValidation},
		{"InvalidDuration", ErrInvalidDuration, CategoryValidation},
		{"InvalidInput", ErrInvalidInput, CategoryValidation},
		{"NegativeQuantity", ErrNegativeQuantity, CategoryValidation},

		// NotFound errors
		{"ProductNotFound", ErrProductNotFound, CategoryNotFound},
		{"InventoryItemNotFound", ErrInventoryItemNotFound, CategoryNotFound},
		{"ReservationNotFound", ErrReservationNotFound, CategoryNotFound},
		{"NotFound", ErrNotFound, CategoryNotFound},

		// Conflict errors
		{"InventoryItemAlreadyExists", ErrInventoryItemAlreadyExists, CategoryConflict},
		{"ReservationAlreadyExists", ErrReservationAlreadyExists, CategoryConflict},
		{"AlreadyExists", ErrAlreadyExists, CategoryConflict},
		{"OptimisticLockFailure", ErrOptimisticLockFailure, CategoryConflict},
		{"ConcurrentModification", ErrConcurrentModification, CategoryConflict},

		// BusinessRule errors
		{"InsufficientStock", ErrInsufficientStock, CategoryBusinessRule},
		{"InvalidReservationRelease", ErrInvalidReservationRelease, CategoryBusinessRule},
		{"InvalidReservationConfirm", ErrInvalidReservationConfirm, CategoryBusinessRule},
		{"ReservationNotPending", ErrReservationNotPending, CategoryBusinessRule},

		// Expired errors
		{"ReservationExpired", ErrReservationExpired, CategoryExpired},
		{"ReservationNotExpired", ErrReservationNotExpired, CategoryExpired},

		// Non-domain error
		{"StandardError", errors.New("standard error"), ErrorCategory("")},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			category := GetCategory(tt.err)
			assert.Equal(t, tt.expected, category)
		})
	}
}

func TestCategoryCheckers(t *testing.T) {
	t.Run("IsValidationError", func(t *testing.T) {
		assert.True(t, IsValidationError(ErrInvalidQuantity))
		assert.True(t, IsValidationError(ErrInvalidDuration))
		assert.False(t, IsValidationError(ErrInsufficientStock))
		assert.False(t, IsValidationError(ErrProductNotFound))
	})

	t.Run("IsNotFoundError", func(t *testing.T) {
		assert.True(t, IsNotFoundError(ErrProductNotFound))
		assert.True(t, IsNotFoundError(ErrInventoryItemNotFound))
		assert.True(t, IsNotFoundError(ErrReservationNotFound))
		assert.False(t, IsNotFoundError(ErrInvalidQuantity))
	})

	t.Run("IsConflictError", func(t *testing.T) {
		assert.True(t, IsConflictError(ErrOptimisticLockFailure))
		assert.True(t, IsConflictError(ErrInventoryItemAlreadyExists))
		assert.True(t, IsConflictError(ErrReservationAlreadyExists))
		assert.False(t, IsConflictError(ErrInsufficientStock))
	})

	t.Run("IsBusinessRuleError", func(t *testing.T) {
		assert.True(t, IsBusinessRuleError(ErrInsufficientStock))
		assert.True(t, IsBusinessRuleError(ErrInvalidReservationRelease))
		assert.True(t, IsBusinessRuleError(ErrInvalidReservationConfirm))
		assert.False(t, IsBusinessRuleError(ErrInvalidQuantity))
	})

	t.Run("IsExpiredError", func(t *testing.T) {
		assert.True(t, IsExpiredError(ErrReservationExpired))
		assert.True(t, IsExpiredError(ErrReservationNotExpired))
		assert.False(t, IsExpiredError(ErrInsufficientStock))
	})
}

func TestErrorCategories(t *testing.T) {
	t.Run("should have correct category values", func(t *testing.T) {
		assert.Equal(t, ErrorCategory("VALIDATION"), CategoryValidation)
		assert.Equal(t, ErrorCategory("NOT_FOUND"), CategoryNotFound)
		assert.Equal(t, ErrorCategory("CONFLICT"), CategoryConflict)
		assert.Equal(t, ErrorCategory("BUSINESS_RULE"), CategoryBusinessRule)
		assert.Equal(t, ErrorCategory("EXPIRED"), CategoryExpired)
	})
}
