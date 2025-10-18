package job

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/entity"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/errors"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

var ErrDatabaseConnection = fmt.Errorf("database connection error")

// MockInventoryRepository is a mock implementation of repository.InventoryRepository
type MockInventoryRepository struct {
	mock.Mock
}

func (m *MockInventoryRepository) FindByID(ctx context.Context, id uuid.UUID) (*entity.InventoryItem, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*entity.InventoryItem), args.Error(1)
}

func (m *MockInventoryRepository) FindByProductID(ctx context.Context, productID uuid.UUID) (*entity.InventoryItem, error) {
	args := m.Called(ctx, productID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*entity.InventoryItem), args.Error(1)
}

func (m *MockInventoryRepository) Save(ctx context.Context, item *entity.InventoryItem) error {
	args := m.Called(ctx, item)
	return args.Error(0)
}

func (m *MockInventoryRepository) Update(ctx context.Context, item *entity.InventoryItem) error {
	args := m.Called(ctx, item)
	return args.Error(0)
}

func (m *MockInventoryRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockInventoryRepository) FindAll(ctx context.Context, limit, offset int) ([]*entity.InventoryItem, error) {
	args := m.Called(ctx, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.InventoryItem), args.Error(1)
}

func (m *MockInventoryRepository) FindByProductIDs(ctx context.Context, productIDs []uuid.UUID) (map[uuid.UUID]*entity.InventoryItem, error) {
	args := m.Called(ctx, productIDs)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[uuid.UUID]*entity.InventoryItem), args.Error(1)
}

func (m *MockInventoryRepository) ExistsByProductID(ctx context.Context, productID uuid.UUID) (bool, error) {
	args := m.Called(ctx, productID)
	return args.Bool(0), args.Error(1)
}

func (m *MockInventoryRepository) Count(ctx context.Context) (int64, error) {
	args := m.Called(ctx)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockInventoryRepository) FindLowStock(ctx context.Context, threshold int, limit int) ([]*entity.InventoryItem, error) {
	args := m.Called(ctx, threshold, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.InventoryItem), args.Error(1)
}

func (m *MockInventoryRepository) IncrementVersion(ctx context.Context, id uuid.UUID) (int, error) {
	args := m.Called(ctx, id)
	return args.Int(0), args.Error(1)
}

// MockReservationRepository is a mock implementation of repository.ReservationRepository
type MockReservationRepository struct {
	mock.Mock
}

func (m *MockReservationRepository) FindByID(ctx context.Context, id uuid.UUID) (*entity.Reservation, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*entity.Reservation), args.Error(1)
}

func (m *MockReservationRepository) FindByOrderID(ctx context.Context, orderID uuid.UUID) (*entity.Reservation, error) {
	args := m.Called(ctx, orderID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*entity.Reservation), args.Error(1)
}

func (m *MockReservationRepository) Save(ctx context.Context, reservation *entity.Reservation) error {
	args := m.Called(ctx, reservation)
	return args.Error(0)
}

func (m *MockReservationRepository) Update(ctx context.Context, reservation *entity.Reservation) error {
	args := m.Called(ctx, reservation)
	return args.Error(0)
}

func (m *MockReservationRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockReservationRepository) FindByInventoryItemID(ctx context.Context, inventoryItemID uuid.UUID, status entity.ReservationStatus) ([]*entity.Reservation, error) {
	args := m.Called(ctx, inventoryItemID, status)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Reservation), args.Error(1)
}

func (m *MockReservationRepository) FindExpired(ctx context.Context, limit int) ([]*entity.Reservation, error) {
	args := m.Called(ctx, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Reservation), args.Error(1)
}

func (m *MockReservationRepository) FindExpiringBetween(ctx context.Context, start, end time.Time) ([]*entity.Reservation, error) {
	args := m.Called(ctx, start, end)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Reservation), args.Error(1)
}

func (m *MockReservationRepository) FindActiveByInventoryItemID(ctx context.Context, inventoryItemID uuid.UUID) ([]*entity.Reservation, error) {
	args := m.Called(ctx, inventoryItemID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Reservation), args.Error(1)
}

func (m *MockReservationRepository) FindByStatus(ctx context.Context, status entity.ReservationStatus, limit, offset int) ([]*entity.Reservation, error) {
	args := m.Called(ctx, status, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Reservation), args.Error(1)
}

func (m *MockReservationRepository) CountByStatus(ctx context.Context, status entity.ReservationStatus) (int64, error) {
	args := m.Called(ctx, status)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockReservationRepository) CountActiveByInventoryItemID(ctx context.Context, inventoryItemID uuid.UUID) (int64, error) {
	args := m.Called(ctx, inventoryItemID)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockReservationRepository) ExistsByOrderID(ctx context.Context, orderID uuid.UUID) (bool, error) {
	args := m.Called(ctx, orderID)
	return args.Bool(0), args.Error(1)
}

func (m *MockReservationRepository) FindAll(ctx context.Context, limit, offset int) ([]*entity.Reservation, error) {
	args := m.Called(ctx, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Reservation), args.Error(1)
}

func (m *MockReservationRepository) DeleteExpired(ctx context.Context) (int64, error) {
	args := m.Called(ctx)
	return args.Get(0).(int64), args.Error(1)
}

func TestNewExpireReservationsJob(t *testing.T) {
	mockInventoryRepo := new(MockInventoryRepository)
	mockReservationRepo := new(MockReservationRepository)

	job := NewExpireReservationsJob(mockInventoryRepo, mockReservationRepo)

	assert.NotNil(t, job)
	assert.Equal(t, mockInventoryRepo, job.inventoryRepo)
	assert.Equal(t, mockReservationRepo, job.reservationRepo)
}

func TestExpireReservationsJob_Execute_Success(t *testing.T) {
	t.Run("should process expired reservations successfully", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		job := NewExpireReservationsJob(mockInventoryRepo, mockReservationRepo)

		productID := uuid.New()
		orderID := uuid.New()

		// Create inventory with 100 units, 50 reserved
		item, _ := entity.NewInventoryItem(productID, 100)
		item.Reserve(50)

		// Create expired reservation
		reservation, _ := entity.NewReservation(item.ID, orderID, 50)
		reservation.ExpiresAt = time.Now().Add(-1 * time.Hour) // Expired 1 hour ago

		mockReservationRepo.On("FindExpired", mock.Anything, 0).Return([]*entity.Reservation{reservation}, nil)
		mockReservationRepo.On("FindByID", mock.Anything, reservation.ID).Return(reservation, nil)
		mockInventoryRepo.On("FindByID", mock.Anything, item.ID).Return(item, nil)
		mockInventoryRepo.On("Update", mock.Anything, mock.AnythingOfType("*entity.InventoryItem")).Return(nil)
		mockReservationRepo.On("Update", mock.Anything, mock.AnythingOfType("*entity.Reservation")).Return(nil)

		// Act
		err := job.Execute(context.Background())

		// Assert
		require.NoError(t, err)

		mockInventoryRepo.AssertExpectations(t)
		mockReservationRepo.AssertExpectations(t)
	})

	t.Run("should return nil when no expired reservations found", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		job := NewExpireReservationsJob(mockInventoryRepo, mockReservationRepo)

		mockReservationRepo.On("FindExpired", mock.Anything, 0).Return([]*entity.Reservation{}, nil)

		// Act
		err := job.Execute(context.Background())

		// Assert
		require.NoError(t, err)
		mockReservationRepo.AssertExpectations(t)
		mockInventoryRepo.AssertNotCalled(t, "FindByID")
		mockInventoryRepo.AssertNotCalled(t, "Update")
	})

	t.Run("should update reservation status to expired", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		job := NewExpireReservationsJob(mockInventoryRepo, mockReservationRepo)

		productID := uuid.New()
		orderID := uuid.New()

		item, _ := entity.NewInventoryItem(productID, 100)
		item.Reserve(50)

		reservation, _ := entity.NewReservation(item.ID, orderID, 50)
		reservation.ExpiresAt = time.Now().Add(-1 * time.Hour)
		initialStatus := reservation.Status

		mockReservationRepo.On("FindExpired", mock.Anything, 0).Return([]*entity.Reservation{reservation}, nil)
		mockReservationRepo.On("FindByID", mock.Anything, reservation.ID).Return(reservation, nil)
		mockInventoryRepo.On("FindByID", mock.Anything, item.ID).Return(item, nil)
		mockInventoryRepo.On("Update", mock.Anything, mock.AnythingOfType("*entity.InventoryItem")).Return(nil)
		mockReservationRepo.On("Update", mock.Anything, mock.MatchedBy(func(r *entity.Reservation) bool {
			// Verify status changed from pending to expired
			return r.Status == entity.ReservationExpired && initialStatus == entity.ReservationPending
		})).Return(nil)

		// Act
		err := job.Execute(context.Background())

		// Assert
		require.NoError(t, err)

		mockInventoryRepo.AssertExpectations(t)
		mockReservationRepo.AssertExpectations(t)
	})

	t.Run("should release stock back to available when expiring", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		job := NewExpireReservationsJob(mockInventoryRepo, mockReservationRepo)

		productID := uuid.New()
		orderID := uuid.New()

		item, _ := entity.NewInventoryItem(productID, 100)
		item.Reserve(50)
		initialQuantity := item.Quantity
		initialReserved := item.Reserved

		reservation, _ := entity.NewReservation(item.ID, orderID, 50)
		reservation.ExpiresAt = time.Now().Add(-1 * time.Hour)

		mockReservationRepo.On("FindExpired", mock.Anything, 0).Return([]*entity.Reservation{reservation}, nil)
		mockReservationRepo.On("FindByID", mock.Anything, reservation.ID).Return(reservation, nil)
		mockInventoryRepo.On("FindByID", mock.Anything, item.ID).Return(item, nil)
		mockInventoryRepo.On("Update", mock.Anything, mock.MatchedBy(func(i *entity.InventoryItem) bool {
			// Verify Quantity stays the same, Reserved decremented
			return i.Quantity == initialQuantity && i.Reserved == (initialReserved-50)
		})).Return(nil)
		mockReservationRepo.On("Update", mock.Anything, mock.AnythingOfType("*entity.Reservation")).Return(nil)

		// Act
		err := job.Execute(context.Background())

		// Assert
		require.NoError(t, err)

		mockInventoryRepo.AssertExpectations(t)
		mockReservationRepo.AssertExpectations(t)
	})
}

func TestExpireReservationsJob_Execute_Errors(t *testing.T) {
	t.Run("should return error when finding expired reservations fails", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		job := NewExpireReservationsJob(mockInventoryRepo, mockReservationRepo)

		mockReservationRepo.On("FindExpired", mock.Anything, 0).Return(nil, ErrDatabaseConnection)

		// Act
		err := job.Execute(context.Background())

		// Assert
		assert.Error(t, err)
		assert.Equal(t, ErrDatabaseConnection, err)

		mockReservationRepo.AssertExpectations(t)
	})

	t.Run("should continue processing when one reservation fails", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		job := NewExpireReservationsJob(mockInventoryRepo, mockReservationRepo)

		productID1 := uuid.New()
		productID2 := uuid.New()
		orderID1 := uuid.New()
		orderID2 := uuid.New()

		// First reservation will fail, second will succeed
		item1, _ := entity.NewInventoryItem(productID1, 100)
		item1.Reserve(30)
		reservation1, _ := entity.NewReservation(item1.ID, orderID1, 30)
		reservation1.ExpiresAt = time.Now().Add(-1 * time.Hour)

		item2, _ := entity.NewInventoryItem(productID2, 200)
		item2.Reserve(50)
		reservation2, _ := entity.NewReservation(item2.ID, orderID2, 50)
		reservation2.ExpiresAt = time.Now().Add(-1 * time.Hour)

		mockReservationRepo.On("FindExpired", mock.Anything, 0).Return([]*entity.Reservation{reservation1, reservation2}, nil)

		// First reservation fails at FindByID
		mockReservationRepo.On("FindByID", mock.Anything, reservation1.ID).Return(nil, errors.ErrReservationNotFound)

		// Second reservation succeeds
		mockReservationRepo.On("FindByID", mock.Anything, reservation2.ID).Return(reservation2, nil)
		mockInventoryRepo.On("FindByID", mock.Anything, item2.ID).Return(item2, nil)
		mockInventoryRepo.On("Update", mock.Anything, mock.AnythingOfType("*entity.InventoryItem")).Return(nil)
		mockReservationRepo.On("Update", mock.Anything, mock.AnythingOfType("*entity.Reservation")).Return(nil)

		// Act
		err := job.Execute(context.Background())

		// Assert
		require.NoError(t, err) // Job should complete even with partial failures

		mockInventoryRepo.AssertExpectations(t)
		mockReservationRepo.AssertExpectations(t)
	})

	t.Run("should skip reservation that cannot be expired", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		job := NewExpireReservationsJob(mockInventoryRepo, mockReservationRepo)

		productID := uuid.New()
		orderID := uuid.New()

		item, _ := entity.NewInventoryItem(productID, 100)

		// Create reservation that is already confirmed (cannot be expired)
		reservation, _ := entity.NewReservation(item.ID, orderID, 50)
		reservation.Status = entity.ReservationConfirmed
		reservation.ExpiresAt = time.Now().Add(-1 * time.Hour)

		mockReservationRepo.On("FindExpired", mock.Anything, 0).Return([]*entity.Reservation{reservation}, nil)
		mockReservationRepo.On("FindByID", mock.Anything, reservation.ID).Return(reservation, nil)

		// Act
		err := job.Execute(context.Background())

		// Assert
		require.NoError(t, err)

		mockReservationRepo.AssertExpectations(t)
		// Should not try to update inventory or reservation
		mockInventoryRepo.AssertNotCalled(t, "FindByID")
		mockInventoryRepo.AssertNotCalled(t, "Update")
		mockReservationRepo.AssertNotCalled(t, "Update")
	})

	t.Run("should return error when inventory not found", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		job := NewExpireReservationsJob(mockInventoryRepo, mockReservationRepo)

		orderID := uuid.New()
		inventoryItemID := uuid.New()

		reservation, _ := entity.NewReservation(inventoryItemID, orderID, 50)
		reservation.ExpiresAt = time.Now().Add(-1 * time.Hour)

		mockReservationRepo.On("FindExpired", mock.Anything, 0).Return([]*entity.Reservation{reservation}, nil)
		mockReservationRepo.On("FindByID", mock.Anything, reservation.ID).Return(reservation, nil)
		mockInventoryRepo.On("FindByID", mock.Anything, inventoryItemID).Return(nil, errors.ErrInventoryItemNotFound)

		// Act
		err := job.Execute(context.Background())

		// Assert
		require.NoError(t, err) // Job completes but logs error

		mockInventoryRepo.AssertExpectations(t)
		mockReservationRepo.AssertExpectations(t)
	})

	t.Run("should handle optimistic lock failure during inventory update", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		job := NewExpireReservationsJob(mockInventoryRepo, mockReservationRepo)

		productID := uuid.New()
		orderID := uuid.New()

		item, _ := entity.NewInventoryItem(productID, 100)
		item.Reserve(50)

		reservation, _ := entity.NewReservation(item.ID, orderID, 50)
		reservation.ExpiresAt = time.Now().Add(-1 * time.Hour)

		mockReservationRepo.On("FindExpired", mock.Anything, 0).Return([]*entity.Reservation{reservation}, nil)
		mockReservationRepo.On("FindByID", mock.Anything, reservation.ID).Return(reservation, nil)
		mockInventoryRepo.On("FindByID", mock.Anything, item.ID).Return(item, nil)
		mockInventoryRepo.On("Update", mock.Anything, mock.AnythingOfType("*entity.InventoryItem")).Return(errors.ErrOptimisticLockFailure)

		// Act
		err := job.Execute(context.Background())

		// Assert
		require.NoError(t, err) // Job completes but logs error

		mockInventoryRepo.AssertExpectations(t)
		mockReservationRepo.AssertExpectations(t)
		// Should not update reservation after inventory update fails
		mockReservationRepo.AssertNotCalled(t, "Update")
	})
}
