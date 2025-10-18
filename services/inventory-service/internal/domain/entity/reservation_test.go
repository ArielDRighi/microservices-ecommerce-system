package entity

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewReservation(t *testing.T) {
	inventoryItemID := uuid.New()
	orderID := uuid.New()

	t.Run("should create reservation with valid quantity", func(t *testing.T) {
		reservation, err := NewReservation(inventoryItemID, orderID, 10)

		require.NoError(t, err)
		assert.NotEqual(t, uuid.Nil, reservation.ID)
		assert.Equal(t, inventoryItemID, reservation.InventoryItemID)
		assert.Equal(t, orderID, reservation.OrderID)
		assert.Equal(t, 10, reservation.Quantity)
		assert.Equal(t, ReservationPending, reservation.Status)
		assert.False(t, reservation.CreatedAt.IsZero())
		assert.False(t, reservation.UpdatedAt.IsZero())
		assert.False(t, reservation.ExpiresAt.IsZero())
		// Should expire in ~15 minutes
		assert.True(t, reservation.ExpiresAt.After(time.Now().Add(14*time.Minute)))
		assert.True(t, reservation.ExpiresAt.Before(time.Now().Add(16*time.Minute)))
	})

	t.Run("should reject zero quantity", func(t *testing.T) {
		reservation, err := NewReservation(inventoryItemID, orderID, 0)

		assert.Error(t, err)
		assert.Nil(t, reservation)
		assert.Equal(t, ErrInvalidQuantity, err)
	})

	t.Run("should reject negative quantity", func(t *testing.T) {
		reservation, err := NewReservation(inventoryItemID, orderID, -5)

		assert.Error(t, err)
		assert.Nil(t, reservation)
		assert.Equal(t, ErrInvalidQuantity, err)
	})
}

func TestNewReservationWithDuration(t *testing.T) {
	inventoryItemID := uuid.New()
	orderID := uuid.New()

	t.Run("should create reservation with custom duration", func(t *testing.T) {
		duration := 30 * time.Minute
		reservation, err := NewReservationWithDuration(inventoryItemID, orderID, 10, duration)

		require.NoError(t, err)
		assert.Equal(t, 10, reservation.Quantity)
		// Should expire in ~30 minutes
		assert.True(t, reservation.ExpiresAt.After(time.Now().Add(29*time.Minute)))
		assert.True(t, reservation.ExpiresAt.Before(time.Now().Add(31*time.Minute)))
	})

	t.Run("should reject zero duration", func(t *testing.T) {
		reservation, err := NewReservationWithDuration(inventoryItemID, orderID, 10, 0)

		assert.Error(t, err)
		assert.Nil(t, reservation)
		assert.Equal(t, ErrInvalidDuration, err)
	})

	t.Run("should reject negative duration", func(t *testing.T) {
		reservation, err := NewReservationWithDuration(inventoryItemID, orderID, 10, -5*time.Minute)

		assert.Error(t, err)
		assert.Nil(t, reservation)
		assert.Equal(t, ErrInvalidDuration, err)
	})
}

func TestReservation_IsExpired(t *testing.T) {
	inventoryItemID := uuid.New()
	orderID := uuid.New()

	t.Run("should return false for new reservation", func(t *testing.T) {
		reservation, _ := NewReservation(inventoryItemID, orderID, 10)

		assert.False(t, reservation.IsExpired())
	})

	t.Run("should return true for expired reservation", func(t *testing.T) {
		reservation, _ := NewReservationWithDuration(inventoryItemID, orderID, 10, 1*time.Millisecond)
		time.Sleep(10 * time.Millisecond)

		assert.True(t, reservation.IsExpired())
	})

	t.Run("should return false when exactly at expiry time", func(t *testing.T) {
		reservation, _ := NewReservation(inventoryItemID, orderID, 10)
		// Manually set expiry to now
		reservation.ExpiresAt = time.Now()
		// Sleep a tiny bit to ensure we're past expiry
		time.Sleep(1 * time.Millisecond)

		assert.True(t, reservation.IsExpired())
	})
}

func TestReservation_StatusChecks(t *testing.T) {
	inventoryItemID := uuid.New()
	orderID := uuid.New()

	t.Run("should correctly identify pending status", func(t *testing.T) {
		reservation, _ := NewReservation(inventoryItemID, orderID, 10)

		assert.True(t, reservation.IsPending())
		assert.False(t, reservation.IsConfirmed())
		assert.False(t, reservation.IsReleased())
	})

	t.Run("should correctly identify confirmed status", func(t *testing.T) {
		reservation, _ := NewReservation(inventoryItemID, orderID, 10)
		reservation.Status = ReservationConfirmed

		assert.False(t, reservation.IsPending())
		assert.True(t, reservation.IsConfirmed())
		assert.False(t, reservation.IsReleased())
	})

	t.Run("should correctly identify released status", func(t *testing.T) {
		reservation, _ := NewReservation(inventoryItemID, orderID, 10)
		reservation.Status = ReservationReleased

		assert.False(t, reservation.IsPending())
		assert.False(t, reservation.IsConfirmed())
		assert.True(t, reservation.IsReleased())
	})
}

func TestReservation_IsActive(t *testing.T) {
	inventoryItemID := uuid.New()
	orderID := uuid.New()

	t.Run("should return true for pending non-expired reservation", func(t *testing.T) {
		reservation, _ := NewReservation(inventoryItemID, orderID, 10)

		assert.True(t, reservation.IsActive())
	})

	t.Run("should return false for expired pending reservation", func(t *testing.T) {
		reservation, _ := NewReservationWithDuration(inventoryItemID, orderID, 10, 1*time.Millisecond)
		time.Sleep(10 * time.Millisecond)

		assert.False(t, reservation.IsActive())
	})

	t.Run("should return false for confirmed reservation", func(t *testing.T) {
		reservation, _ := NewReservation(inventoryItemID, orderID, 10)
		reservation.Status = ReservationConfirmed

		assert.False(t, reservation.IsActive())
	})

	t.Run("should return false for released reservation", func(t *testing.T) {
		reservation, _ := NewReservation(inventoryItemID, orderID, 10)
		reservation.Status = ReservationReleased

		assert.False(t, reservation.IsActive())
	})
}

func TestReservation_CanBeConfirmed(t *testing.T) {
	inventoryItemID := uuid.New()
	orderID := uuid.New()

	t.Run("should return true for active reservation", func(t *testing.T) {
		reservation, _ := NewReservation(inventoryItemID, orderID, 10)

		assert.True(t, reservation.CanBeConfirmed())
	})

	t.Run("should return false for expired reservation", func(t *testing.T) {
		reservation, _ := NewReservationWithDuration(inventoryItemID, orderID, 10, 1*time.Millisecond)
		time.Sleep(10 * time.Millisecond)

		assert.False(t, reservation.CanBeConfirmed())
	})

	t.Run("should return false for already confirmed reservation", func(t *testing.T) {
		reservation, _ := NewReservation(inventoryItemID, orderID, 10)
		reservation.Status = ReservationConfirmed

		assert.False(t, reservation.CanBeConfirmed())
	})
}

func TestReservation_CanBeReleased(t *testing.T) {
	inventoryItemID := uuid.New()
	orderID := uuid.New()

	t.Run("should return true for pending reservation", func(t *testing.T) {
		reservation, _ := NewReservation(inventoryItemID, orderID, 10)

		assert.True(t, reservation.CanBeReleased())
	})

	t.Run("should return true for expired pending reservation", func(t *testing.T) {
		reservation, _ := NewReservationWithDuration(inventoryItemID, orderID, 10, 1*time.Millisecond)
		time.Sleep(10 * time.Millisecond)

		assert.True(t, reservation.CanBeReleased()) // Can still release expired pending
	})

	t.Run("should return false for confirmed reservation", func(t *testing.T) {
		reservation, _ := NewReservation(inventoryItemID, orderID, 10)
		reservation.Status = ReservationConfirmed

		assert.False(t, reservation.CanBeReleased())
	})

	t.Run("should return false for already released reservation", func(t *testing.T) {
		reservation, _ := NewReservation(inventoryItemID, orderID, 10)
		reservation.Status = ReservationReleased

		assert.False(t, reservation.CanBeReleased())
	})
}

func TestReservation_Confirm(t *testing.T) {
	inventoryItemID := uuid.New()
	orderID := uuid.New()

	t.Run("should confirm active reservation", func(t *testing.T) {
		reservation, _ := NewReservation(inventoryItemID, orderID, 10)
		initialUpdatedAt := reservation.UpdatedAt
		time.Sleep(1 * time.Millisecond)

		err := reservation.Confirm()

		require.NoError(t, err)
		assert.Equal(t, ReservationConfirmed, reservation.Status)
		assert.True(t, reservation.UpdatedAt.After(initialUpdatedAt))
	})

	t.Run("should reject confirming expired reservation", func(t *testing.T) {
		reservation, _ := NewReservationWithDuration(inventoryItemID, orderID, 10, 1*time.Millisecond)
		time.Sleep(10 * time.Millisecond)

		err := reservation.Confirm()

		assert.Error(t, err)
		assert.Equal(t, ErrReservationExpired, err)
		assert.Equal(t, ReservationPending, reservation.Status) // Unchanged
	})

	t.Run("should reject confirming already confirmed reservation", func(t *testing.T) {
		reservation, _ := NewReservation(inventoryItemID, orderID, 10)
		reservation.Confirm()

		err := reservation.Confirm()

		assert.Error(t, err)
		assert.Equal(t, ErrReservationNotPending, err)
	})

	t.Run("should reject confirming released reservation", func(t *testing.T) {
		reservation, _ := NewReservation(inventoryItemID, orderID, 10)
		reservation.Release()

		err := reservation.Confirm()

		assert.Error(t, err)
		assert.Equal(t, ErrReservationNotPending, err)
	})
}

func TestReservation_Release(t *testing.T) {
	inventoryItemID := uuid.New()
	orderID := uuid.New()

	t.Run("should release pending reservation", func(t *testing.T) {
		reservation, _ := NewReservation(inventoryItemID, orderID, 10)
		initialUpdatedAt := reservation.UpdatedAt
		time.Sleep(1 * time.Millisecond)

		err := reservation.Release()

		require.NoError(t, err)
		assert.Equal(t, ReservationReleased, reservation.Status)
		assert.True(t, reservation.UpdatedAt.After(initialUpdatedAt))
	})

	t.Run("should release expired pending reservation", func(t *testing.T) {
		reservation, _ := NewReservationWithDuration(inventoryItemID, orderID, 10, 1*time.Millisecond)
		time.Sleep(10 * time.Millisecond)

		err := reservation.Release()

		require.NoError(t, err)
		assert.Equal(t, ReservationReleased, reservation.Status)
	})

	t.Run("should reject releasing confirmed reservation", func(t *testing.T) {
		reservation, _ := NewReservation(inventoryItemID, orderID, 10)
		reservation.Confirm()

		err := reservation.Release()

		assert.Error(t, err)
		assert.Equal(t, ErrReservationNotPending, err)
		assert.Equal(t, ReservationConfirmed, reservation.Status) // Unchanged
	})

	t.Run("should reject releasing already released reservation", func(t *testing.T) {
		reservation, _ := NewReservation(inventoryItemID, orderID, 10)
		reservation.Release()

		err := reservation.Release()

		assert.Error(t, err)
		assert.Equal(t, ErrReservationNotPending, err)
	})
}

func TestReservation_MarkAsExpired(t *testing.T) {
	inventoryItemID := uuid.New()
	orderID := uuid.New()

	t.Run("should mark expired pending reservation as expired", func(t *testing.T) {
		reservation, _ := NewReservationWithDuration(inventoryItemID, orderID, 10, 1*time.Millisecond)
		time.Sleep(10 * time.Millisecond)
		initialUpdatedAt := reservation.UpdatedAt
		time.Sleep(1 * time.Millisecond)

		err := reservation.MarkAsExpired()

		require.NoError(t, err)
		assert.Equal(t, ReservationExpired, reservation.Status)
		assert.True(t, reservation.UpdatedAt.After(initialUpdatedAt))
	})

	t.Run("should reject marking non-expired reservation", func(t *testing.T) {
		reservation, _ := NewReservation(inventoryItemID, orderID, 10)

		err := reservation.MarkAsExpired()

		assert.Error(t, err)
		assert.Equal(t, ErrReservationNotExpired, err)
		assert.Equal(t, ReservationPending, reservation.Status) // Unchanged
	})

	t.Run("should reject marking confirmed reservation", func(t *testing.T) {
		reservation, _ := NewReservationWithDuration(inventoryItemID, orderID, 10, 1*time.Millisecond)
		time.Sleep(10 * time.Millisecond)
		reservation.Status = ReservationConfirmed

		err := reservation.MarkAsExpired()

		assert.Error(t, err)
		assert.Equal(t, ErrReservationNotPending, err)
	})
}

func TestReservation_Extend(t *testing.T) {
	inventoryItemID := uuid.New()
	orderID := uuid.New()

	t.Run("should extend active reservation", func(t *testing.T) {
		reservation, _ := NewReservation(inventoryItemID, orderID, 10)
		originalExpiry := reservation.ExpiresAt
		time.Sleep(1 * time.Millisecond)

		err := reservation.Extend(10 * time.Minute)

		require.NoError(t, err)
		assert.True(t, reservation.ExpiresAt.After(originalExpiry))
		// Should be ~10 minutes after original expiry
		expectedExpiry := originalExpiry.Add(10 * time.Minute)
		assert.True(t, reservation.ExpiresAt.Sub(expectedExpiry) < 100*time.Millisecond)
	})

	t.Run("should reject extending expired reservation", func(t *testing.T) {
		reservation, _ := NewReservationWithDuration(inventoryItemID, orderID, 10, 1*time.Millisecond)
		time.Sleep(10 * time.Millisecond)
		originalExpiry := reservation.ExpiresAt

		err := reservation.Extend(10 * time.Minute)

		assert.Error(t, err)
		assert.Equal(t, ErrReservationExpired, err)
		assert.Equal(t, originalExpiry, reservation.ExpiresAt) // Unchanged
	})

	t.Run("should reject extending with zero duration", func(t *testing.T) {
		reservation, _ := NewReservation(inventoryItemID, orderID, 10)

		err := reservation.Extend(0)

		assert.Error(t, err)
		assert.Equal(t, ErrInvalidDuration, err)
	})

	t.Run("should reject extending with negative duration", func(t *testing.T) {
		reservation, _ := NewReservation(inventoryItemID, orderID, 10)

		err := reservation.Extend(-5 * time.Minute)

		assert.Error(t, err)
		assert.Equal(t, ErrInvalidDuration, err)
	})

	t.Run("should reject extending confirmed reservation", func(t *testing.T) {
		reservation, _ := NewReservation(inventoryItemID, orderID, 10)
		reservation.Confirm()

		err := reservation.Extend(10 * time.Minute)

		assert.Error(t, err)
		assert.Equal(t, ErrReservationNotPending, err)
	})
}

func TestReservation_TimeUntilExpiry(t *testing.T) {
	inventoryItemID := uuid.New()
	orderID := uuid.New()

	t.Run("should return positive duration for active reservation", func(t *testing.T) {
		reservation, _ := NewReservation(inventoryItemID, orderID, 10)

		duration := reservation.TimeUntilExpiry()

		assert.True(t, duration > 0)
		// Should be close to 15 minutes
		assert.True(t, duration > 14*time.Minute)
		assert.True(t, duration < 16*time.Minute)
	})

	t.Run("should return zero for expired reservation", func(t *testing.T) {
		reservation, _ := NewReservationWithDuration(inventoryItemID, orderID, 10, 1*time.Millisecond)
		time.Sleep(10 * time.Millisecond)

		duration := reservation.TimeUntilExpiry()

		assert.Equal(t, time.Duration(0), duration)
	})

	t.Run("should return decreasing duration over time", func(t *testing.T) {
		reservation, _ := NewReservation(inventoryItemID, orderID, 10)

		duration1 := reservation.TimeUntilExpiry()
		time.Sleep(100 * time.Millisecond)
		duration2 := reservation.TimeUntilExpiry()

		assert.True(t, duration2 < duration1)
		assert.True(t, duration1-duration2 >= 100*time.Millisecond)
	})
}

func TestReservationStatus_Constants(t *testing.T) {
	t.Run("should have correct status values", func(t *testing.T) {
		assert.Equal(t, ReservationStatus("pending"), ReservationPending)
		assert.Equal(t, ReservationStatus("confirmed"), ReservationConfirmed)
		assert.Equal(t, ReservationStatus("released"), ReservationReleased)
		assert.Equal(t, ReservationStatus("expired"), ReservationExpired)
	})
}

func TestDefaultReservationDuration(t *testing.T) {
	t.Run("should be 15 minutes", func(t *testing.T) {
		assert.Equal(t, 15*time.Minute, DefaultReservationDuration)
	})
}
