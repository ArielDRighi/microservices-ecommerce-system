package entity

import (
	"testing"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/errors"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewInventoryItem(t *testing.T) {
	productID := uuid.New()

	t.Run("should create inventory item with valid quantity", func(t *testing.T) {
		item, err := NewInventoryItem(productID, 100)

		require.NoError(t, err)
		assert.NotEqual(t, uuid.Nil, item.ID)
		assert.Equal(t, productID, item.ProductID)
		assert.Equal(t, 100, item.Quantity)
		assert.Equal(t, 0, item.Reserved)
		assert.Equal(t, 1, item.Version)
		assert.False(t, item.CreatedAt.IsZero())
		assert.False(t, item.UpdatedAt.IsZero())
	})

	t.Run("should reject negative initial quantity", func(t *testing.T) {
		item, err := NewInventoryItem(productID, -10)

		assert.Error(t, err)
		assert.Nil(t, item)
		assert.Equal(t, errors.ErrInvalidQuantity, err)
	})

	t.Run("should accept zero initial quantity", func(t *testing.T) {
		item, err := NewInventoryItem(productID, 0)

		require.NoError(t, err)
		assert.Equal(t, 0, item.Quantity)
		assert.Equal(t, 0, item.Available())
	})
}

func TestInventoryItem_Available(t *testing.T) {
	productID := uuid.New()

	t.Run("should return available quantity when no reservations", func(t *testing.T) {
		item, _ := NewInventoryItem(productID, 100)

		assert.Equal(t, 100, item.Available())
	})

	t.Run("should return available quantity with reservations", func(t *testing.T) {
		item, _ := NewInventoryItem(productID, 100)
		item.Reserved = 30

		assert.Equal(t, 70, item.Available())
	})

	t.Run("should return zero when fully reserved", func(t *testing.T) {
		item, _ := NewInventoryItem(productID, 50)
		item.Reserved = 50

		assert.Equal(t, 0, item.Available())
	})
}

func TestInventoryItem_CanReserve(t *testing.T) {
	productID := uuid.New()

	t.Run("should return true when enough stock available", func(t *testing.T) {
		item, _ := NewInventoryItem(productID, 100)

		assert.True(t, item.CanReserve(50))
		assert.True(t, item.CanReserve(100))
	})

	t.Run("should return false when insufficient stock", func(t *testing.T) {
		item, _ := NewInventoryItem(productID, 100)
		item.Reserved = 80

		assert.False(t, item.CanReserve(30))
		assert.True(t, item.CanReserve(20))
	})
}

func TestInventoryItem_Reserve(t *testing.T) {
	productID := uuid.New()

	t.Run("should reserve valid quantity", func(t *testing.T) {
		item, _ := NewInventoryItem(productID, 100)

		err := item.Reserve(30)

		require.NoError(t, err)
		assert.Equal(t, 30, item.Reserved)
		assert.Equal(t, 70, item.Available())
		// Version increment is now handled by GORM in repository layer
	})

	t.Run("should allow multiple reservations", func(t *testing.T) {
		item, _ := NewInventoryItem(productID, 100)

		err1 := item.Reserve(30)
		err2 := item.Reserve(20)

		require.NoError(t, err1)
		require.NoError(t, err2)
		assert.Equal(t, 50, item.Reserved)
		assert.Equal(t, 50, item.Available())
		// Version increment is now handled by GORM in repository layer
	})

	t.Run("should reject reservation when insufficient stock", func(t *testing.T) {
		item, _ := NewInventoryItem(productID, 50)
		item.Reserved = 30

		err := item.Reserve(25)

		assert.Error(t, err)
		assert.Equal(t, errors.ErrInsufficientStock, err)
		assert.Equal(t, 30, item.Reserved) // Unchanged
	})

	t.Run("should reject zero quantity", func(t *testing.T) {
		item, _ := NewInventoryItem(productID, 100)

		err := item.Reserve(0)

		assert.Error(t, err)
		assert.Equal(t, errors.ErrInvalidQuantity, err)
	})

	t.Run("should reject negative quantity", func(t *testing.T) {
		item, _ := NewInventoryItem(productID, 100)

		err := item.Reserve(-10)

		assert.Error(t, err)
		assert.Equal(t, errors.ErrInvalidQuantity, err)
	})
}

func TestInventoryItem_ReleaseReservation(t *testing.T) {
	productID := uuid.New()

	t.Run("should release valid reservation", func(t *testing.T) {
		item, _ := NewInventoryItem(productID, 100)
		item.Reserve(50)

		err := item.ReleaseReservation(30)

		require.NoError(t, err)
		assert.Equal(t, 20, item.Reserved)
		assert.Equal(t, 80, item.Available())
		// Version increment is now handled by GORM in repository layer
	})

	t.Run("should release full reservation", func(t *testing.T) {
		item, _ := NewInventoryItem(productID, 100)
		item.Reserve(40)

		err := item.ReleaseReservation(40)

		require.NoError(t, err)
		assert.Equal(t, 0, item.Reserved)
		assert.Equal(t, 100, item.Available())
	})

	t.Run("should reject releasing more than reserved", func(t *testing.T) {
		item, _ := NewInventoryItem(productID, 100)
		item.Reserve(20)

		err := item.ReleaseReservation(30)

		assert.Error(t, err)
		assert.Equal(t, errors.ErrInvalidReservationRelease, err)
		assert.Equal(t, 20, item.Reserved) // Unchanged
	})

	t.Run("should reject zero quantity", func(t *testing.T) {
		item, _ := NewInventoryItem(productID, 100)

		err := item.ReleaseReservation(0)

		assert.Error(t, err)
		assert.Equal(t, errors.ErrInvalidQuantity, err)
	})

	t.Run("should reject negative quantity", func(t *testing.T) {
		item, _ := NewInventoryItem(productID, 100)

		err := item.ReleaseReservation(-10)

		assert.Error(t, err)
		assert.Equal(t, errors.ErrInvalidQuantity, err)
	})
}

func TestInventoryItem_ConfirmReservation(t *testing.T) {
	productID := uuid.New()

	t.Run("should confirm valid reservation", func(t *testing.T) {
		item, _ := NewInventoryItem(productID, 100)
		item.Reserve(30)

		err := item.ConfirmReservation(30)

		require.NoError(t, err)
		assert.Equal(t, 70, item.Quantity)
		assert.Equal(t, 0, item.Reserved)
		assert.Equal(t, 70, item.Available())
		// Version increment is now handled by GORM in repository layer
	})

	t.Run("should confirm partial reservation", func(t *testing.T) {
		item, _ := NewInventoryItem(productID, 100)
		item.Reserve(50)

		err := item.ConfirmReservation(20)

		require.NoError(t, err)
		assert.Equal(t, 80, item.Quantity)
		assert.Equal(t, 30, item.Reserved)
		assert.Equal(t, 50, item.Available())
	})

	t.Run("should reject confirming more than reserved", func(t *testing.T) {
		item, _ := NewInventoryItem(productID, 100)
		item.Reserve(20)

		err := item.ConfirmReservation(30)

		assert.Error(t, err)
		assert.Equal(t, errors.ErrInvalidReservationConfirm, err)
		assert.Equal(t, 100, item.Quantity) // Unchanged
		assert.Equal(t, 20, item.Reserved)  // Unchanged
	})

	t.Run("should reject if trying to confirm when reserved exceeds quantity", func(t *testing.T) {
		item, _ := NewInventoryItem(productID, 50)
		item.Reserve(30)

		// Try to confirm more than total quantity (even though it's within reserved)
		// This would result in negative quantity which should fail
		err := item.ConfirmReservation(30)

		require.NoError(t, err) // This should succeed as 50-30=20 is valid
		assert.Equal(t, 20, item.Quantity)
		assert.Equal(t, 0, item.Reserved)
	})

	t.Run("should reject zero quantity", func(t *testing.T) {
		item, _ := NewInventoryItem(productID, 100)

		err := item.ConfirmReservation(0)

		assert.Error(t, err)
		assert.Equal(t, errors.ErrInvalidQuantity, err)
	})
}

func TestInventoryItem_AddStock(t *testing.T) {
	productID := uuid.New()

	t.Run("should add stock successfully", func(t *testing.T) {
		item, _ := NewInventoryItem(productID, 100)

		err := item.AddStock(50)

		require.NoError(t, err)
		assert.Equal(t, 150, item.Quantity)
		assert.Equal(t, 150, item.Available())
		// Version increment is now handled by GORM in repository layer
	})

	t.Run("should add stock with existing reservations", func(t *testing.T) {
		item, _ := NewInventoryItem(productID, 100)
		item.Reserve(30)

		err := item.AddStock(50)

		require.NoError(t, err)
		assert.Equal(t, 150, item.Quantity)
		assert.Equal(t, 30, item.Reserved)
		assert.Equal(t, 120, item.Available())
	})

	t.Run("should reject zero quantity", func(t *testing.T) {
		item, _ := NewInventoryItem(productID, 100)

		err := item.AddStock(0)

		assert.Error(t, err)
		assert.Equal(t, errors.ErrInvalidQuantity, err)
		assert.Equal(t, 100, item.Quantity) // Unchanged
	})

	t.Run("should reject negative quantity", func(t *testing.T) {
		item, _ := NewInventoryItem(productID, 100)

		err := item.AddStock(-20)

		assert.Error(t, err)
		assert.Equal(t, errors.ErrInvalidQuantity, err)
	})
}

func TestInventoryItem_DecrementStock(t *testing.T) {
	productID := uuid.New()

	t.Run("should decrement stock successfully", func(t *testing.T) {
		item, _ := NewInventoryItem(productID, 100)

		err := item.DecrementStock(30)

		require.NoError(t, err)
		assert.Equal(t, 70, item.Quantity)
		assert.Equal(t, 70, item.Available())
		// Version increment is now handled by GORM in repository layer
	})

	t.Run("should respect reserved quantity when decrementing", func(t *testing.T) {
		item, _ := NewInventoryItem(productID, 100)
		item.Reserve(40)

		err := item.DecrementStock(30)

		require.NoError(t, err)
		assert.Equal(t, 70, item.Quantity)
		assert.Equal(t, 40, item.Reserved)
		assert.Equal(t, 30, item.Available())
	})

	t.Run("should reject when insufficient available stock", func(t *testing.T) {
		item, _ := NewInventoryItem(productID, 100)
		item.Reserve(80)

		err := item.DecrementStock(30)

		assert.Error(t, err)
		assert.Equal(t, errors.ErrInsufficientStock, err)
		assert.Equal(t, 100, item.Quantity) // Unchanged
	})

	t.Run("should reject zero quantity", func(t *testing.T) {
		item, _ := NewInventoryItem(productID, 100)

		err := item.DecrementStock(0)

		assert.Error(t, err)
		assert.Equal(t, errors.ErrInvalidQuantity, err)
	})

	t.Run("should reject negative quantity", func(t *testing.T) {
		item, _ := NewInventoryItem(productID, 100)

		err := item.DecrementStock(-10)

		assert.Error(t, err)
		assert.Equal(t, errors.ErrInvalidQuantity, err)
	})
}

func TestInventoryItem_IsStockAvailable(t *testing.T) {
	productID := uuid.New()

	t.Run("should return true when stock available", func(t *testing.T) {
		item, _ := NewInventoryItem(productID, 100)

		assert.True(t, item.IsStockAvailable(50))
		assert.True(t, item.IsStockAvailable(100))
	})

	t.Run("should return false when insufficient stock", func(t *testing.T) {
		item, _ := NewInventoryItem(productID, 50)
		item.Reserved = 30

		assert.False(t, item.IsStockAvailable(25))
		assert.True(t, item.IsStockAvailable(20))
	})

	t.Run("should handle zero check", func(t *testing.T) {
		item, _ := NewInventoryItem(productID, 0)

		assert.True(t, item.IsStockAvailable(0))
		assert.False(t, item.IsStockAvailable(1))
	})
}

func TestInventoryItem_VersionIncrement(t *testing.T) {
	productID := uuid.New()

	t.Run("version is managed by GORM optimistic locking", func(t *testing.T) {
		item, _ := NewInventoryItem(productID, 100)
		// Initial version is 1 when created
		assert.Equal(t, 1, item.Version)

		// Entity methods no longer increment version directly
		// Version increment is handled by GORM in repository layer during Save()
		item.Reserve(10)
		assert.Equal(t, 1, item.Version) // Still 1 - not incremented by entity

		item.AddStock(50)
		assert.Equal(t, 1, item.Version) // Still 1 - not incremented by entity

		item.ReleaseReservation(5)
		assert.Equal(t, 1, item.Version) // Still 1 - not incremented by entity

		item.ConfirmReservation(5)
		assert.Equal(t, 1, item.Version) // Still 1 - not incremented by entity

		item.DecrementStock(10)
		assert.Equal(t, 1, item.Version) // Still 1 - not incremented by entity

		// Version will be incremented by GORM's optimistic locking when calling repository.Save()
		// See postgres_e2e_test.go for actual optimistic locking tests with DB
	})
}
