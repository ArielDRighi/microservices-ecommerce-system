package valueobject

import (
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewStockQuantity(t *testing.T) {
	t.Run("should create with valid positive quantity", func(t *testing.T) {
		sq, err := NewStockQuantity(100)

		require.NoError(t, err)
		assert.Equal(t, 100, sq.Value())
	})

	t.Run("should create with zero quantity", func(t *testing.T) {
		sq, err := NewStockQuantity(0)

		require.NoError(t, err)
		assert.Equal(t, 0, sq.Value())
	})

	t.Run("should reject negative quantity", func(t *testing.T) {
		sq, err := NewStockQuantity(-10)

		assert.Error(t, err)
		assert.Equal(t, errors.ErrNegativeQuantity, err)
		assert.Equal(t, 0, sq.Value()) // Zero value
	})
}

func TestMustNewStockQuantity(t *testing.T) {
	t.Run("should create with valid quantity", func(t *testing.T) {
		sq := MustNewStockQuantity(50)

		assert.Equal(t, 50, sq.Value())
	})

	t.Run("should panic with invalid quantity", func(t *testing.T) {
		assert.Panics(t, func() {
			MustNewStockQuantity(-5)
		})
	})
}

func TestStockQuantity_IsZero(t *testing.T) {
	t.Run("should return true for zero quantity", func(t *testing.T) {
		sq := MustNewStockQuantity(0)

		assert.True(t, sq.IsZero())
	})

	t.Run("should return false for positive quantity", func(t *testing.T) {
		sq := MustNewStockQuantity(10)

		assert.False(t, sq.IsZero())
	})
}

func TestStockQuantity_IsPositive(t *testing.T) {
	t.Run("should return true for positive quantity", func(t *testing.T) {
		sq := MustNewStockQuantity(1)

		assert.True(t, sq.IsPositive())
	})

	t.Run("should return false for zero quantity", func(t *testing.T) {
		sq := MustNewStockQuantity(0)

		assert.False(t, sq.IsPositive())
	})
}

func TestStockQuantity_Add(t *testing.T) {
	t.Run("should add positive amount", func(t *testing.T) {
		sq := MustNewStockQuantity(50)

		result, err := sq.Add(30)

		require.NoError(t, err)
		assert.Equal(t, 80, result.Value())
		assert.Equal(t, 50, sq.Value()) // Original unchanged (immutable)
	})

	t.Run("should add zero", func(t *testing.T) {
		sq := MustNewStockQuantity(50)

		result, err := sq.Add(0)

		require.NoError(t, err)
		assert.Equal(t, 50, result.Value())
	})

	t.Run("should reject adding negative amount resulting in negative", func(t *testing.T) {
		sq := MustNewStockQuantity(10)

		result, err := sq.Add(-20)

		assert.Error(t, err)
		assert.Equal(t, errors.ErrNegativeQuantity, err)
		assert.Equal(t, 0, result.Value()) // Zero value
	})

	t.Run("should allow adding negative if result is non-negative", func(t *testing.T) {
		sq := MustNewStockQuantity(50)

		result, err := sq.Add(-30)

		require.NoError(t, err)
		assert.Equal(t, 20, result.Value())
	})
}

func TestStockQuantity_Subtract(t *testing.T) {
	t.Run("should subtract valid amount", func(t *testing.T) {
		sq := MustNewStockQuantity(100)

		result, err := sq.Subtract(40)

		require.NoError(t, err)
		assert.Equal(t, 60, result.Value())
		assert.Equal(t, 100, sq.Value()) // Original unchanged (immutable)
	})

	t.Run("should subtract to zero", func(t *testing.T) {
		sq := MustNewStockQuantity(50)

		result, err := sq.Subtract(50)

		require.NoError(t, err)
		assert.Equal(t, 0, result.Value())
	})

	t.Run("should reject subtraction resulting in negative", func(t *testing.T) {
		sq := MustNewStockQuantity(30)

		result, err := sq.Subtract(40)

		assert.Error(t, err)
		assert.Equal(t, errors.ErrNegativeQuantity, err)
		assert.Equal(t, 0, result.Value())
	})

	t.Run("should subtract zero", func(t *testing.T) {
		sq := MustNewStockQuantity(50)

		result, err := sq.Subtract(0)

		require.NoError(t, err)
		assert.Equal(t, 50, result.Value())
	})
}

func TestStockQuantity_Comparisons(t *testing.T) {
	sq50 := MustNewStockQuantity(50)
	sq100 := MustNewStockQuantity(100)
	sq50Copy := MustNewStockQuantity(50)

	t.Run("IsGreaterThan", func(t *testing.T) {
		assert.True(t, sq100.IsGreaterThan(sq50))
		assert.False(t, sq50.IsGreaterThan(sq100))
		assert.False(t, sq50.IsGreaterThan(sq50Copy))
	})

	t.Run("IsGreaterThanOrEqual", func(t *testing.T) {
		assert.True(t, sq100.IsGreaterThanOrEqual(sq50))
		assert.True(t, sq50.IsGreaterThanOrEqual(sq50Copy))
		assert.False(t, sq50.IsGreaterThanOrEqual(sq100))
	})

	t.Run("IsLessThan", func(t *testing.T) {
		assert.True(t, sq50.IsLessThan(sq100))
		assert.False(t, sq100.IsLessThan(sq50))
		assert.False(t, sq50.IsLessThan(sq50Copy))
	})

	t.Run("IsLessThanOrEqual", func(t *testing.T) {
		assert.True(t, sq50.IsLessThanOrEqual(sq100))
		assert.True(t, sq50.IsLessThanOrEqual(sq50Copy))
		assert.False(t, sq100.IsLessThanOrEqual(sq50))
	})

	t.Run("Equals", func(t *testing.T) {
		assert.True(t, sq50.Equals(sq50Copy))
		assert.False(t, sq50.Equals(sq100))
	})
}

func TestStockQuantity_String(t *testing.T) {
	t.Run("should return string representation", func(t *testing.T) {
		sq := MustNewStockQuantity(42)

		assert.Equal(t, "42", sq.String())
	})

	t.Run("should return zero as string", func(t *testing.T) {
		sq := MustNewStockQuantity(0)

		assert.Equal(t, "0", sq.String())
	})
}

func TestStockQuantity_Immutability(t *testing.T) {
	t.Run("operations should not modify original", func(t *testing.T) {
		original := MustNewStockQuantity(100)

		original.Add(50)
		assert.Equal(t, 100, original.Value())

		original.Subtract(30)
		assert.Equal(t, 100, original.Value())
	})
}

func TestStockQuantity_ChainedOperations(t *testing.T) {
	t.Run("should support chained operations", func(t *testing.T) {
		sq := MustNewStockQuantity(100)

		result1, _ := sq.Add(50)
		result2, _ := result1.Subtract(30)
		result3, _ := result2.Add(10)

		assert.Equal(t, 100, sq.Value())      // Original unchanged
		assert.Equal(t, 150, result1.Value()) // 100 + 50
		assert.Equal(t, 120, result2.Value()) // 150 - 30
		assert.Equal(t, 130, result3.Value()) // 120 + 10
	})

	t.Run("should fail gracefully in chain", func(t *testing.T) {
		sq := MustNewStockQuantity(50)

		result1, _ := sq.Add(30)
		result2, err := result1.Subtract(100) // Should fail

		assert.Error(t, err)
		assert.Equal(t, 80, result1.Value()) // Previous result is valid
		assert.Equal(t, 0, result2.Value())  // Failed result is zero value
	})
}
