package usecase

import (
	"context"
	"testing"
	"time"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/entity"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/events"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// Test: Constructor
func TestNewReleaseExpiredReservationsUseCase(t *testing.T) {
	mockInventoryRepo := new(MockInventoryRepository)
	mockReservationRepo := new(MockReservationRepository)
	mockPublisher := new(MockPublisher)

	uc := NewReleaseExpiredReservationsUseCase(mockInventoryRepo, mockReservationRepo, mockPublisher)

	assert.NotNil(t, uc)
	assert.Equal(t, mockInventoryRepo, uc.inventoryRepo)
	assert.Equal(t, mockReservationRepo, uc.reservationRepo)
	assert.Equal(t, mockPublisher, uc.publisher)
}

// Test: Execute - No expired reservations
func TestReleaseExpiredReservationsUseCase_Execute_NoExpiredReservations(t *testing.T) {
	t.Run("should return zero released when no expired reservations exist", func(t *testing.T) {
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		mockPublisher := new(MockPublisher)

		uc := NewReleaseExpiredReservationsUseCase(mockInventoryRepo, mockReservationRepo, mockPublisher)

		// Setup: no expired reservations
		mockReservationRepo.On("FindExpired", mock.Anything, mock.Anything).
			Return([]*entity.Reservation{}, nil)

		// Execute
		ctx := context.Background()
		output, err := uc.Execute(ctx)

		// Assert
		assert.NoError(t, err)
		assert.NotNil(t, output)
		assert.Equal(t, 0, output.TotalFound)
		assert.Equal(t, 0, output.TotalReleased)
		assert.Equal(t, 0, output.TotalFailed)
		assert.Empty(t, output.ReleasedReservationIDs)
		assert.Empty(t, output.FailedReservations)

		mockReservationRepo.AssertExpectations(t)
	})
}

// Test: Execute - Release single expired reservation successfully
func TestReleaseExpiredReservationsUseCase_Execute_SingleReservation(t *testing.T) {
	t.Run("should release single expired reservation successfully", func(t *testing.T) {
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		mockPublisher := new(MockPublisher)

		uc := NewReleaseExpiredReservationsUseCase(mockInventoryRepo, mockReservationRepo, mockPublisher)

		// Setup expired reservation
		reservationID := uuid.New()
		itemID := uuid.New()
		productID := uuid.New()
		orderID := uuid.New()
		quantity := 5

		expiredReservation := &entity.Reservation{
			ID:              reservationID,
			InventoryItemID: itemID,
			OrderID:         orderID,
			Quantity:        quantity,
			Status:          "pending",
			ExpiresAt:       time.Now().Add(-1 * time.Minute), // expired 1 minute ago
			CreatedAt:       time.Now().Add(-16 * time.Minute),
		}

		inventoryItem := &entity.InventoryItem{
			ID:        itemID,
			ProductID: productID,
			Quantity:  100,
			Reserved:  quantity,
			Version:   1,
		}

		// Mock expectations
		mockReservationRepo.On("FindExpired", mock.Anything, mock.Anything).
			Return([]*entity.Reservation{expiredReservation}, nil)

		mockInventoryRepo.On("FindByID", mock.Anything, itemID).
			Return(inventoryItem, nil)

		mockInventoryRepo.On("Update", mock.Anything, mock.MatchedBy(func(item *entity.InventoryItem) bool {
			return item.Reserved == 0 && item.Quantity == 100
		})).Return(nil)

		mockReservationRepo.On("Update", mock.Anything, mock.MatchedBy(func(res *entity.Reservation) bool {
			return res.Status == "released"
		})).Return(nil)

		mockPublisher.On("PublishStockReleased", mock.Anything, mock.MatchedBy(func(event events.StockReleasedEvent) bool {
			return event.Payload.ReservationID == reservationID.String() &&
				event.Payload.Reason == "reservation_expired"
		})).Return(nil)

		// Execute
		ctx := context.Background()
		output, err := uc.Execute(ctx)

		// Assert
		assert.NoError(t, err)
		assert.NotNil(t, output)
		assert.Equal(t, 1, output.TotalFound)
		assert.Equal(t, 1, output.TotalReleased)
		assert.Equal(t, 0, output.TotalFailed)
		assert.Len(t, output.ReleasedReservationIDs, 1)
		assert.Equal(t, reservationID, output.ReleasedReservationIDs[0])
		assert.Empty(t, output.FailedReservations)

		mockReservationRepo.AssertExpectations(t)
		mockInventoryRepo.AssertExpectations(t)
		mockPublisher.AssertExpectations(t)
	})
}

// Test: Execute - Release multiple expired reservations
func TestReleaseExpiredReservationsUseCase_Execute_MultipleReservations(t *testing.T) {
	t.Run("should release multiple expired reservations successfully", func(t *testing.T) {
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		mockPublisher := new(MockPublisher)

		uc := NewReleaseExpiredReservationsUseCase(mockInventoryRepo, mockReservationRepo, mockPublisher)

		// Setup 3 expired reservations
		reservation1 := createExpiredReservation(uuid.New(), uuid.New(), uuid.New(), 5)
		reservation2 := createExpiredReservation(uuid.New(), uuid.New(), uuid.New(), 3)
		reservation3 := createExpiredReservation(uuid.New(), uuid.New(), uuid.New(), 7)

		expiredReservations := []*entity.Reservation{reservation1, reservation2, reservation3}

		// Mock expectations
		mockReservationRepo.On("FindExpired", mock.Anything, mock.Anything).
			Return(expiredReservations, nil)

		for _, res := range expiredReservations {
			item := &entity.InventoryItem{
				ID:        res.InventoryItemID,
				ProductID: uuid.New(),
				Quantity:  100,
				Reserved:  res.Quantity,
				Version:   1,
			}

			mockInventoryRepo.On("FindByID", mock.Anything, res.InventoryItemID).
				Return(item, nil)

			mockInventoryRepo.On("Update", mock.Anything, mock.AnythingOfType("*entity.InventoryItem")).
				Return(nil)

			mockReservationRepo.On("Update", mock.Anything, mock.AnythingOfType("*entity.Reservation")).
				Return(nil)

			mockPublisher.On("PublishStockReleased", mock.Anything, mock.AnythingOfType("events.StockReleasedEvent")).
				Return(nil)
		}

		// Execute
		ctx := context.Background()
		output, err := uc.Execute(ctx)

		// Assert
		assert.NoError(t, err)
		assert.NotNil(t, output)
		assert.Equal(t, 3, output.TotalFound)
		assert.Equal(t, 3, output.TotalReleased)
		assert.Equal(t, 0, output.TotalFailed)
		assert.Len(t, output.ReleasedReservationIDs, 3)
		assert.Empty(t, output.FailedReservations)

		mockReservationRepo.AssertExpectations(t)
		mockInventoryRepo.AssertExpectations(t)
		mockPublisher.AssertExpectations(t)
	})
}

// Test: Execute - Partial failure (some succeed, some fail)
func TestReleaseExpiredReservationsUseCase_Execute_PartialFailure(t *testing.T) {
	t.Run("should continue processing after individual failures", func(t *testing.T) {
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		mockPublisher := new(MockPublisher)

		uc := NewReleaseExpiredReservationsUseCase(mockInventoryRepo, mockReservationRepo, mockPublisher)

		// Setup 3 expired reservations
		reservation1 := createExpiredReservation(uuid.New(), uuid.New(), uuid.New(), 5)
		reservation2 := createExpiredReservation(uuid.New(), uuid.New(), uuid.New(), 3)
		reservation3 := createExpiredReservation(uuid.New(), uuid.New(), uuid.New(), 7)

		expiredReservations := []*entity.Reservation{reservation1, reservation2, reservation3}

		// Mock expectations
		mockReservationRepo.On("FindExpired", mock.Anything, mock.Anything).
			Return(expiredReservations, nil)

		// Reservation 1: success
		item1 := &entity.InventoryItem{
			ID:        reservation1.InventoryItemID,
			ProductID: uuid.New(),
			Quantity:  100,
			Reserved:  reservation1.Quantity,
			Version:   1,
		}
		mockInventoryRepo.On("FindByID", mock.Anything, reservation1.InventoryItemID).
			Return(item1, nil).Once()
		mockInventoryRepo.On("Update", mock.Anything, mock.AnythingOfType("*entity.InventoryItem")).
			Return(nil).Once()
		mockReservationRepo.On("Update", mock.Anything, mock.AnythingOfType("*entity.Reservation")).
			Return(nil).Once()
		mockPublisher.On("PublishStockReleased", mock.Anything, mock.AnythingOfType("events.StockReleasedEvent")).
			Return(nil).Once()

		// Reservation 2: failure (inventory not found)
		mockInventoryRepo.On("FindByID", mock.Anything, reservation2.InventoryItemID).
			Return(nil, assert.AnError).Once()

		// Reservation 3: success
		item3 := &entity.InventoryItem{
			ID:        reservation3.InventoryItemID,
			ProductID: uuid.New(),
			Quantity:  100,
			Reserved:  reservation3.Quantity,
			Version:   1,
		}
		mockInventoryRepo.On("FindByID", mock.Anything, reservation3.InventoryItemID).
			Return(item3, nil).Once()
		mockInventoryRepo.On("Update", mock.Anything, mock.AnythingOfType("*entity.InventoryItem")).
			Return(nil).Once()
		mockReservationRepo.On("Update", mock.Anything, mock.AnythingOfType("*entity.Reservation")).
			Return(nil).Once()
		mockPublisher.On("PublishStockReleased", mock.Anything, mock.AnythingOfType("events.StockReleasedEvent")).
			Return(nil).Once()

		// Execute
		ctx := context.Background()
		output, err := uc.Execute(ctx)

		// Assert
		assert.NoError(t, err) // Should not return error, just log failures
		assert.NotNil(t, output)
		assert.Equal(t, 3, output.TotalFound)
		assert.Equal(t, 2, output.TotalReleased)
		assert.Equal(t, 1, output.TotalFailed)
		assert.Len(t, output.ReleasedReservationIDs, 2)
		assert.Len(t, output.FailedReservations, 1)
		assert.Equal(t, reservation2.ID, output.FailedReservations[0].ReservationID)
		assert.Contains(t, output.FailedReservations[0].Reason, "assert.AnError")

		mockReservationRepo.AssertExpectations(t)
		mockInventoryRepo.AssertExpectations(t)
		mockPublisher.AssertExpectations(t)
	})
}

// Test: Execute - Event publication failure should not prevent release
func TestReleaseExpiredReservationsUseCase_Execute_EventPublicationFailure(t *testing.T) {
	t.Run("should complete release even if event publication fails", func(t *testing.T) {
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		mockPublisher := new(MockPublisher)

		uc := NewReleaseExpiredReservationsUseCase(mockInventoryRepo, mockReservationRepo, mockPublisher)

		reservation := createExpiredReservation(uuid.New(), uuid.New(), uuid.New(), 5)

		mockReservationRepo.On("FindExpired", mock.Anything, mock.Anything).
			Return([]*entity.Reservation{reservation}, nil)

		item := &entity.InventoryItem{
			ID:        reservation.InventoryItemID,
			ProductID: uuid.New(),
			Quantity:  100,
			Reserved:  reservation.Quantity,
			Version:   1,
		}

		mockInventoryRepo.On("FindByID", mock.Anything, reservation.InventoryItemID).
			Return(item, nil)
		mockInventoryRepo.On("Update", mock.Anything, mock.AnythingOfType("*entity.InventoryItem")).
			Return(nil)
		mockReservationRepo.On("Update", mock.Anything, mock.AnythingOfType("*entity.Reservation")).
			Return(nil)

		// Event publication fails
		mockPublisher.On("PublishStockReleased", mock.Anything, mock.AnythingOfType("events.StockReleasedEvent")).
			Return(assert.AnError)

		// Execute
		ctx := context.Background()
		output, err := uc.Execute(ctx)

		// Assert: should still succeed despite event failure
		assert.NoError(t, err)
		assert.NotNil(t, output)
		assert.Equal(t, 1, output.TotalFound)
		assert.Equal(t, 1, output.TotalReleased)
		assert.Equal(t, 0, output.TotalFailed)

		mockPublisher.AssertExpectations(t)
	})
}

// Test: Execute - FindExpired returns error
func TestReleaseExpiredReservationsUseCase_Execute_FindExpiredError(t *testing.T) {
	t.Run("should return error when FindExpired fails", func(t *testing.T) {
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		mockPublisher := new(MockPublisher)

		uc := NewReleaseExpiredReservationsUseCase(mockInventoryRepo, mockReservationRepo, mockPublisher)

		mockReservationRepo.On("FindExpired", mock.Anything, mock.Anything).
			Return(nil, assert.AnError)

		// Execute
		ctx := context.Background()
		output, err := uc.Execute(ctx)

		// Assert
		assert.Error(t, err)
		assert.Nil(t, output)

		mockReservationRepo.AssertExpectations(t)
	})
}

// Helper function to create expired reservation
func createExpiredReservation(reservationID, itemID, orderID uuid.UUID, quantity int) *entity.Reservation {
	return &entity.Reservation{
		ID:              reservationID,
		InventoryItemID: itemID,
		OrderID:         orderID,
		Quantity:        quantity,
		Status:          "pending",
		ExpiresAt:       time.Now().Add(-1 * time.Minute),
		CreatedAt:       time.Now().Add(-16 * time.Minute),
	}
}
