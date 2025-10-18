package usecase

import (
	"context"
	"testing"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/entity"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/errors"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestNewReleaseReservationUseCase(t *testing.T) {
	mockInventoryRepo := new(MockInventoryRepository)
	mockReservationRepo := new(MockReservationRepository)

	uc := NewReleaseReservationUseCase(mockInventoryRepo, mockReservationRepo)

	assert.NotNil(t, uc)
	assert.Equal(t, mockInventoryRepo, uc.inventoryRepo)
	assert.Equal(t, mockReservationRepo, uc.reservationRepo)
}

func TestReleaseReservationUseCase_Execute_Success(t *testing.T) {
	t.Run("should release reservation and free stock successfully", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		uc := NewReleaseReservationUseCase(mockInventoryRepo, mockReservationRepo)

		productID := uuid.New()
		orderID := uuid.New()

		// Create inventory item with 100 units, 50 reserved
		item, _ := entity.NewInventoryItem(productID, 100)
		item.Reserve(50)

		// Create pending reservation for 50 units
		reservation, _ := entity.NewReservation(item.ID, orderID, 50)

		mockReservationRepo.On("FindByID", mock.Anything, reservation.ID).Return(reservation, nil)
		mockInventoryRepo.On("FindByID", mock.Anything, item.ID).Return(item, nil)
		mockInventoryRepo.On("Update", mock.Anything, mock.AnythingOfType("*entity.InventoryItem")).Return(nil)
		mockReservationRepo.On("Update", mock.Anything, mock.AnythingOfType("*entity.Reservation")).Return(nil)

		input := ReleaseReservationInput{
			ReservationID: reservation.ID,
		}

		// Act
		output, err := uc.Execute(context.Background(), input)

		// Assert
		require.NoError(t, err)
		assert.NotNil(t, output)
		assert.Equal(t, reservation.ID, output.ReservationID)
		assert.Equal(t, item.ID, output.InventoryItemID)
		assert.Equal(t, orderID, output.OrderID)
		assert.Equal(t, 50, output.QuantityReleased)
		assert.Equal(t, 100, output.AvailableStock) // 100 total - 0 reserved = 100 available
		assert.Equal(t, 0, output.ReservedStock)    // 50 - 50 = 0

		mockInventoryRepo.AssertExpectations(t)
		mockReservationRepo.AssertExpectations(t)
	})

	t.Run("should handle partial reservation release", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		uc := NewReleaseReservationUseCase(mockInventoryRepo, mockReservationRepo)

		productID := uuid.New()
		orderID := uuid.New()

		// Create inventory with 100 units, 80 reserved
		item, _ := entity.NewInventoryItem(productID, 100)
		item.Reserve(80)

		// Create pending reservation for only 30 units
		reservation, _ := entity.NewReservation(item.ID, orderID, 30)

		mockReservationRepo.On("FindByID", mock.Anything, reservation.ID).Return(reservation, nil)
		mockInventoryRepo.On("FindByID", mock.Anything, item.ID).Return(item, nil)
		mockInventoryRepo.On("Update", mock.Anything, mock.AnythingOfType("*entity.InventoryItem")).Return(nil)
		mockReservationRepo.On("Update", mock.Anything, mock.AnythingOfType("*entity.Reservation")).Return(nil)

		input := ReleaseReservationInput{
			ReservationID: reservation.ID,
		}

		// Act
		output, err := uc.Execute(context.Background(), input)

		// Assert
		require.NoError(t, err)
		assert.Equal(t, 30, output.QuantityReleased)
		assert.Equal(t, 50, output.AvailableStock) // 100 total - 50 reserved = 50 available
		assert.Equal(t, 50, output.ReservedStock)  // 80 - 30 = 50

		mockInventoryRepo.AssertExpectations(t)
		mockReservationRepo.AssertExpectations(t)
	})

	t.Run("should update reservation status to released", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		uc := NewReleaseReservationUseCase(mockInventoryRepo, mockReservationRepo)

		productID := uuid.New()
		orderID := uuid.New()

		item, _ := entity.NewInventoryItem(productID, 100)
		item.Reserve(50)

		reservation, _ := entity.NewReservation(item.ID, orderID, 50)
		initialStatus := reservation.Status

		mockReservationRepo.On("FindByID", mock.Anything, reservation.ID).Return(reservation, nil)
		mockInventoryRepo.On("FindByID", mock.Anything, item.ID).Return(item, nil)
		mockInventoryRepo.On("Update", mock.Anything, mock.AnythingOfType("*entity.InventoryItem")).Return(nil)
		mockReservationRepo.On("Update", mock.Anything, mock.MatchedBy(func(r *entity.Reservation) bool {
			// Verify status changed from pending to released
			return r.Status == entity.ReservationReleased && initialStatus == entity.ReservationPending
		})).Return(nil)

		input := ReleaseReservationInput{
			ReservationID: reservation.ID,
		}

		// Act
		output, err := uc.Execute(context.Background(), input)

		// Assert
		require.NoError(t, err)
		assert.NotNil(t, output)

		mockInventoryRepo.AssertExpectations(t)
		mockReservationRepo.AssertExpectations(t)
	})

	t.Run("should not decrement actual quantity when releasing", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		uc := NewReleaseReservationUseCase(mockInventoryRepo, mockReservationRepo)

		productID := uuid.New()
		orderID := uuid.New()

		item, _ := entity.NewInventoryItem(productID, 100)
		item.Reserve(50)
		initialQuantity := item.Quantity

		reservation, _ := entity.NewReservation(item.ID, orderID, 50)

		mockReservationRepo.On("FindByID", mock.Anything, reservation.ID).Return(reservation, nil)
		mockInventoryRepo.On("FindByID", mock.Anything, item.ID).Return(item, nil)
		mockInventoryRepo.On("Update", mock.Anything, mock.MatchedBy(func(i *entity.InventoryItem) bool {
			// Verify Quantity stays the same, only Reserved changes
			return i.Quantity == initialQuantity && i.Reserved == 0
		})).Return(nil)
		mockReservationRepo.On("Update", mock.Anything, mock.AnythingOfType("*entity.Reservation")).Return(nil)

		input := ReleaseReservationInput{
			ReservationID: reservation.ID,
		}

		// Act
		output, err := uc.Execute(context.Background(), input)

		// Assert
		require.NoError(t, err)
		assert.NotNil(t, output)

		mockInventoryRepo.AssertExpectations(t)
		mockReservationRepo.AssertExpectations(t)
	})
}

func TestReleaseReservationUseCase_Execute_ReservationErrors(t *testing.T) {
	t.Run("should return error when reservation not found", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		uc := NewReleaseReservationUseCase(mockInventoryRepo, mockReservationRepo)

		reservationID := uuid.New()

		mockReservationRepo.On("FindByID", mock.Anything, reservationID).Return(nil, errors.ErrReservationNotFound)

		input := ReleaseReservationInput{
			ReservationID: reservationID,
		}

		// Act
		output, err := uc.Execute(context.Background(), input)

		// Assert
		assert.Error(t, err)
		assert.Nil(t, output)
		assert.Contains(t, err.Error(), "reservation not found")

		mockReservationRepo.AssertExpectations(t)
	})

	t.Run("should return error when reservation is not pending", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		uc := NewReleaseReservationUseCase(mockInventoryRepo, mockReservationRepo)

		productID := uuid.New()
		orderID := uuid.New()

		item, _ := entity.NewInventoryItem(productID, 100)

		// Create reservation and mark as already confirmed
		reservation, _ := entity.NewReservation(item.ID, orderID, 50)
		reservation.Status = entity.ReservationConfirmed

		mockReservationRepo.On("FindByID", mock.Anything, reservation.ID).Return(reservation, nil)

		input := ReleaseReservationInput{
			ReservationID: reservation.ID,
		}

		// Act
		output, err := uc.Execute(context.Background(), input)

		// Assert
		assert.Error(t, err)
		assert.Nil(t, output)
		assert.Equal(t, errors.ErrReservationNotPending, err)

		mockReservationRepo.AssertExpectations(t)
	})

	t.Run("should return error when reservation is already released", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		uc := NewReleaseReservationUseCase(mockInventoryRepo, mockReservationRepo)

		productID := uuid.New()
		orderID := uuid.New()

		item, _ := entity.NewInventoryItem(productID, 100)

		// Create reservation and mark as already released
		reservation, _ := entity.NewReservation(item.ID, orderID, 50)
		reservation.Status = entity.ReservationReleased

		mockReservationRepo.On("FindByID", mock.Anything, reservation.ID).Return(reservation, nil)

		input := ReleaseReservationInput{
			ReservationID: reservation.ID,
		}

		// Act
		output, err := uc.Execute(context.Background(), input)

		// Assert
		assert.Error(t, err)
		assert.Nil(t, output)
		assert.Equal(t, errors.ErrReservationNotPending, err)

		mockReservationRepo.AssertExpectations(t)
	})
}

func TestReleaseReservationUseCase_Execute_InventoryErrors(t *testing.T) {
	t.Run("should return error when inventory item not found", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		uc := NewReleaseReservationUseCase(mockInventoryRepo, mockReservationRepo)

		orderID := uuid.New()
		inventoryItemID := uuid.New()

		reservation, _ := entity.NewReservation(inventoryItemID, orderID, 50)

		mockReservationRepo.On("FindByID", mock.Anything, reservation.ID).Return(reservation, nil)
		mockInventoryRepo.On("FindByID", mock.Anything, inventoryItemID).Return(nil, errors.ErrInventoryItemNotFound)

		input := ReleaseReservationInput{
			ReservationID: reservation.ID,
		}

		// Act
		output, err := uc.Execute(context.Background(), input)

		// Assert
		assert.Error(t, err)
		assert.Nil(t, output)
		assert.Contains(t, err.Error(), "inventory item not found")

		mockInventoryRepo.AssertExpectations(t)
		mockReservationRepo.AssertExpectations(t)
	})

	t.Run("should return error when releasing more than reserved", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		uc := NewReleaseReservationUseCase(mockInventoryRepo, mockReservationRepo)

		productID := uuid.New()
		orderID := uuid.New()

		// Create inventory with only 30 reserved but trying to release 50
		item, _ := entity.NewInventoryItem(productID, 100)
		item.Reserve(30)

		reservation, _ := entity.NewReservation(item.ID, orderID, 50)

		mockReservationRepo.On("FindByID", mock.Anything, reservation.ID).Return(reservation, nil)
		mockInventoryRepo.On("FindByID", mock.Anything, item.ID).Return(item, nil)

		input := ReleaseReservationInput{
			ReservationID: reservation.ID,
		}

		// Act
		output, err := uc.Execute(context.Background(), input)

		// Assert
		assert.Error(t, err)
		assert.Nil(t, output)
		assert.Equal(t, errors.ErrInvalidReservationRelease, err)

		mockInventoryRepo.AssertExpectations(t)
		mockReservationRepo.AssertExpectations(t)
	})

	t.Run("should return error when inventory update fails due to optimistic lock", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		uc := NewReleaseReservationUseCase(mockInventoryRepo, mockReservationRepo)

		productID := uuid.New()
		orderID := uuid.New()

		item, _ := entity.NewInventoryItem(productID, 100)
		item.Reserve(50)

		reservation, _ := entity.NewReservation(item.ID, orderID, 50)

		mockReservationRepo.On("FindByID", mock.Anything, reservation.ID).Return(reservation, nil)
		mockInventoryRepo.On("FindByID", mock.Anything, item.ID).Return(item, nil)
		mockInventoryRepo.On("Update", mock.Anything, mock.AnythingOfType("*entity.InventoryItem")).Return(errors.ErrOptimisticLockFailure)

		input := ReleaseReservationInput{
			ReservationID: reservation.ID,
		}

		// Act
		output, err := uc.Execute(context.Background(), input)

		// Assert
		assert.Error(t, err)
		assert.Nil(t, output)
		assert.Equal(t, errors.ErrOptimisticLockFailure, err)

		mockInventoryRepo.AssertExpectations(t)
		mockReservationRepo.AssertExpectations(t)
	})
}
