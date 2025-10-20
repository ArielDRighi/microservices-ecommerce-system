package model

import (
	"testing"
	"time"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/entity"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReservationModel_TableName(t *testing.T) {
	model := ReservationModel{}
	assert.Equal(t, "reservations", model.TableName())
}

func TestReservationModel_ToEntity(t *testing.T) {
	// Arrange
	now := time.Now().UTC()
	expiresAt := now.Add(15 * time.Minute)
	reservationID := uuid.New()
	inventoryItemID := uuid.New()
	orderID := uuid.New()

	model := &ReservationModel{
		ID:              reservationID,
		InventoryItemID: inventoryItemID,
		OrderID:         orderID,
		Quantity:        50,
		Status:          string(entity.ReservationPending),
		ExpiresAt:       expiresAt,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	// Act
	reservation := model.ToEntity()

	// Assert
	assert.NotNil(t, reservation)
	assert.Equal(t, reservationID, reservation.ID)
	assert.Equal(t, inventoryItemID, reservation.InventoryItemID)
	assert.Equal(t, orderID, reservation.OrderID)
	assert.Equal(t, 50, reservation.Quantity)
	assert.Equal(t, entity.ReservationPending, reservation.Status)
	assert.Equal(t, expiresAt.Unix(), reservation.ExpiresAt.Unix())
	assert.Equal(t, now.Unix(), reservation.CreatedAt.Unix())
	assert.Equal(t, now.Unix(), reservation.UpdatedAt.Unix())
}

func TestReservationModel_FromEntity(t *testing.T) {
	// Arrange
	inventoryItemID := uuid.New()
	orderID := uuid.New()
	reservation, err := entity.NewReservation(inventoryItemID, orderID, 30)
	require.NoError(t, err)

	model := &ReservationModel{}

	// Act
	model.FromEntity(reservation)

	// Assert
	assert.Equal(t, reservation.ID, model.ID)
	assert.Equal(t, reservation.InventoryItemID, model.InventoryItemID)
	assert.Equal(t, reservation.OrderID, model.OrderID)
	assert.Equal(t, reservation.Quantity, model.Quantity)
	assert.Equal(t, string(reservation.Status), model.Status)
	assert.Equal(t, reservation.ExpiresAt.Unix(), model.ExpiresAt.Unix())
	assert.Equal(t, reservation.CreatedAt.Unix(), model.CreatedAt.Unix())
	assert.Equal(t, reservation.UpdatedAt.Unix(), model.UpdatedAt.Unix())
}

func TestNewReservationModelFromEntity(t *testing.T) {
	// Arrange
	inventoryItemID := uuid.New()
	orderID := uuid.New()
	reservation, err := entity.NewReservation(inventoryItemID, orderID, 25)
	require.NoError(t, err)

	// Act
	model := NewReservationModelFromEntity(reservation)

	// Assert
	assert.NotNil(t, model)
	assert.Equal(t, reservation.ID, model.ID)
	assert.Equal(t, reservation.InventoryItemID, model.InventoryItemID)
	assert.Equal(t, reservation.OrderID, model.OrderID)
	assert.Equal(t, reservation.Quantity, model.Quantity)
	assert.Equal(t, string(reservation.Status), model.Status)
}

func TestReservationModel_Conversion_RoundTrip(t *testing.T) {
	t.Run("should preserve all fields in round-trip conversion with pending status", func(t *testing.T) {
		// Arrange
		inventoryItemID := uuid.New()
		orderID := uuid.New()
		originalReservation, err := entity.NewReservation(inventoryItemID, orderID, 40)
		require.NoError(t, err)

		// Act - Convert to model and back
		model := NewReservationModelFromEntity(originalReservation)
		convertedReservation := model.ToEntity()

		// Assert
		assert.Equal(t, originalReservation.ID, convertedReservation.ID)
		assert.Equal(t, originalReservation.InventoryItemID, convertedReservation.InventoryItemID)
		assert.Equal(t, originalReservation.OrderID, convertedReservation.OrderID)
		assert.Equal(t, originalReservation.Quantity, convertedReservation.Quantity)
		assert.Equal(t, originalReservation.Status, convertedReservation.Status)
		assert.Equal(t, originalReservation.ExpiresAt.Unix(), convertedReservation.ExpiresAt.Unix())
	})

	t.Run("should preserve confirmed status in round-trip conversion", func(t *testing.T) {
		// Arrange
		inventoryItemID := uuid.New()
		orderID := uuid.New()
		originalReservation, err := entity.NewReservation(inventoryItemID, orderID, 20)
		require.NoError(t, err)

		// Confirm the reservation
		err = originalReservation.Confirm()
		require.NoError(t, err)

		// Act - Convert to model and back
		model := NewReservationModelFromEntity(originalReservation)
		convertedReservation := model.ToEntity()

		// Assert
		assert.Equal(t, entity.ReservationConfirmed, convertedReservation.Status)
	})

	t.Run("should preserve released status in round-trip conversion", func(t *testing.T) {
		// Arrange
		inventoryItemID := uuid.New()
		orderID := uuid.New()
		originalReservation, err := entity.NewReservation(inventoryItemID, orderID, 15)
		require.NoError(t, err)

		// Release the reservation
		err = originalReservation.Release()
		require.NoError(t, err)

		// Act - Convert to model and back
		model := NewReservationModelFromEntity(originalReservation)
		convertedReservation := model.ToEntity()

		// Assert
		assert.Equal(t, entity.ReservationReleased, convertedReservation.Status)
	})

	t.Run("should preserve expired status in round-trip conversion", func(t *testing.T) {
		// Arrange
		inventoryItemID := uuid.New()
		orderID := uuid.New()
		originalReservation, err := entity.NewReservation(inventoryItemID, orderID, 10)
		require.NoError(t, err)

		// Expire the reservation (make it expired first)
		originalReservation.ExpiresAt = time.Now().Add(-1 * time.Hour)
		err = originalReservation.MarkAsExpired()
		require.NoError(t, err)

		// Act - Convert to model and back
		model := NewReservationModelFromEntity(originalReservation)
		convertedReservation := model.ToEntity()

		// Assert
		assert.Equal(t, entity.ReservationExpired, convertedReservation.Status)
	})
}
