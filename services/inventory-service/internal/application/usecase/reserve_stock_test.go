package usecase

import (
	"context"
	"testing"
	"time"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/entity"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/errors"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

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

func (m *MockReservationRepository) FindByStatus(ctx context.Context, status entity.ReservationStatus, limit, offset int) ([]*entity.Reservation, error) {
	args := m.Called(ctx, status, limit, offset)
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

func (m *MockReservationRepository) DeleteExpired(ctx context.Context) (int64, error) {
	args := m.Called(ctx)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockReservationRepository) FindActiveByInventoryItemID(ctx context.Context, inventoryItemID uuid.UUID) ([]*entity.Reservation, error) {
	args := m.Called(ctx, inventoryItemID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.Reservation), args.Error(1)
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

func (m *MockReservationRepository) CountByStatus(ctx context.Context, status entity.ReservationStatus) (int64, error) {
	args := m.Called(ctx, status)
	return args.Get(0).(int64), args.Error(1)
}

func TestNewReserveStockUseCase(t *testing.T) {
	mockInventoryRepo := new(MockInventoryRepository)
	mockReservationRepo := new(MockReservationRepository)

	uc := NewReserveStockUseCase(mockInventoryRepo, mockReservationRepo)

	assert.NotNil(t, uc)
	assert.Equal(t, mockInventoryRepo, uc.inventoryRepo)
	assert.Equal(t, mockReservationRepo, uc.reservationRepo)
}

func TestReserveStockUseCase_Execute_Success(t *testing.T) {
	t.Run("should reserve stock successfully with default duration", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		uc := NewReserveStockUseCase(mockInventoryRepo, mockReservationRepo)

		productID := uuid.New()
		orderID := uuid.New()
		item, _ := entity.NewInventoryItem(productID, 100)

		mockReservationRepo.On("ExistsByOrderID", mock.Anything, orderID).Return(false, nil)
		mockInventoryRepo.On("FindByProductID", mock.Anything, productID).Return(item, nil)
		mockInventoryRepo.On("Update", mock.Anything, mock.AnythingOfType("*entity.InventoryItem")).Return(nil)
		mockReservationRepo.On("Save", mock.Anything, mock.AnythingOfType("*entity.Reservation")).Return(nil)

		input := ReserveStockInput{
			ProductID: productID,
			OrderID:   orderID,
			Quantity:  50,
		}

		// Act
		output, err := uc.Execute(context.Background(), input)

		// Assert
		require.NoError(t, err)
		assert.NotNil(t, output)
		assert.NotEqual(t, uuid.Nil, output.ReservationID)
		assert.Equal(t, productID, output.ProductID)
		assert.Equal(t, orderID, output.OrderID)
		assert.Equal(t, 50, output.Quantity)
		assert.Equal(t, 50, output.RemainingStock) // 100 - 50 reserved
		assert.False(t, output.ExpiresAt.IsZero())
		assert.WithinDuration(t, time.Now().Add(15*time.Minute), output.ExpiresAt, 2*time.Second)

		mockInventoryRepo.AssertExpectations(t)
		mockReservationRepo.AssertExpectations(t)
	})

	t.Run("should reserve stock with custom duration", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		uc := NewReserveStockUseCase(mockInventoryRepo, mockReservationRepo)

		productID := uuid.New()
		orderID := uuid.New()
		item, _ := entity.NewInventoryItem(productID, 100)
		customDuration := 30 * time.Minute

		mockReservationRepo.On("ExistsByOrderID", mock.Anything, orderID).Return(false, nil)
		mockInventoryRepo.On("FindByProductID", mock.Anything, productID).Return(item, nil)
		mockInventoryRepo.On("Update", mock.Anything, mock.AnythingOfType("*entity.InventoryItem")).Return(nil)
		mockReservationRepo.On("Save", mock.Anything, mock.AnythingOfType("*entity.Reservation")).Return(nil)

		input := ReserveStockInput{
			ProductID: productID,
			OrderID:   orderID,
			Quantity:  30,
			Duration:  &customDuration,
		}

		// Act
		output, err := uc.Execute(context.Background(), input)

		// Assert
		require.NoError(t, err)
		assert.NotNil(t, output)
		assert.Equal(t, 30, output.Quantity)
		assert.Equal(t, 70, output.RemainingStock) // 100 - 30 reserved
		assert.WithinDuration(t, time.Now().Add(30*time.Minute), output.ExpiresAt, 2*time.Second)

		mockInventoryRepo.AssertExpectations(t)
		mockReservationRepo.AssertExpectations(t)
	})

	t.Run("should update inventory version for optimistic locking", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		uc := NewReserveStockUseCase(mockInventoryRepo, mockReservationRepo)

		productID := uuid.New()
		orderID := uuid.New()
		item, _ := entity.NewInventoryItem(productID, 100)
		initialVersion := item.Version

		mockReservationRepo.On("ExistsByOrderID", mock.Anything, orderID).Return(false, nil)
		mockInventoryRepo.On("FindByProductID", mock.Anything, productID).Return(item, nil)
		mockInventoryRepo.On("Update", mock.Anything, mock.MatchedBy(func(i *entity.InventoryItem) bool {
			// Verify that Reserve() incremented the version
			return i.Version > initialVersion && i.Reserved == 50
		})).Return(nil)
		mockReservationRepo.On("Save", mock.Anything, mock.AnythingOfType("*entity.Reservation")).Return(nil)

		input := ReserveStockInput{
			ProductID: productID,
			OrderID:   orderID,
			Quantity:  50,
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

func TestReserveStockUseCase_Execute_InsufficientStock(t *testing.T) {
	t.Run("should return error when insufficient stock", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		uc := NewReserveStockUseCase(mockInventoryRepo, mockReservationRepo)

		productID := uuid.New()
		orderID := uuid.New()
		item, _ := entity.NewInventoryItem(productID, 30) // Only 30 in stock

		mockReservationRepo.On("ExistsByOrderID", mock.Anything, orderID).Return(false, nil)
		mockInventoryRepo.On("FindByProductID", mock.Anything, productID).Return(item, nil)

		input := ReserveStockInput{
			ProductID: productID,
			OrderID:   orderID,
			Quantity:  50, // Requesting more than available
		}

		// Act
		output, err := uc.Execute(context.Background(), input)

		// Assert
		assert.Error(t, err)
		assert.Nil(t, output)
		assert.Equal(t, errors.ErrInsufficientStock, err)

		mockInventoryRepo.AssertExpectations(t)
		mockReservationRepo.AssertExpectations(t)
	})

	t.Run("should return error when reserved quantity makes stock insufficient", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		uc := NewReserveStockUseCase(mockInventoryRepo, mockReservationRepo)

		productID := uuid.New()
		orderID := uuid.New()
		item, _ := entity.NewInventoryItem(productID, 100)
		item.Reserve(80) // Already 80 reserved, only 20 available

		mockReservationRepo.On("ExistsByOrderID", mock.Anything, orderID).Return(false, nil)
		mockInventoryRepo.On("FindByProductID", mock.Anything, productID).Return(item, nil)

		input := ReserveStockInput{
			ProductID: productID,
			OrderID:   orderID,
			Quantity:  50, // Requesting more than the 20 available
		}

		// Act
		output, err := uc.Execute(context.Background(), input)

		// Assert
		assert.Error(t, err)
		assert.Nil(t, output)
		assert.Equal(t, errors.ErrInsufficientStock, err)

		mockInventoryRepo.AssertExpectations(t)
		mockReservationRepo.AssertExpectations(t)
	})
}

func TestReserveStockUseCase_Execute_ValidationErrors(t *testing.T) {
	t.Run("should return error when quantity is zero", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		uc := NewReserveStockUseCase(mockInventoryRepo, mockReservationRepo)

		input := ReserveStockInput{
			ProductID: uuid.New(),
			OrderID:   uuid.New(),
			Quantity:  0,
		}

		// Act
		output, err := uc.Execute(context.Background(), input)

		// Assert
		assert.Error(t, err)
		assert.Nil(t, output)
		assert.Equal(t, errors.ErrInvalidQuantity, err)
	})

	t.Run("should return error when quantity is negative", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		uc := NewReserveStockUseCase(mockInventoryRepo, mockReservationRepo)

		input := ReserveStockInput{
			ProductID: uuid.New(),
			OrderID:   uuid.New(),
			Quantity:  -10,
		}

		// Act
		output, err := uc.Execute(context.Background(), input)

		// Assert
		assert.Error(t, err)
		assert.Nil(t, output)
		assert.Equal(t, errors.ErrInvalidQuantity, err)
	})

	t.Run("should return error when reservation already exists for order", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		uc := NewReserveStockUseCase(mockInventoryRepo, mockReservationRepo)

		orderID := uuid.New()

		mockReservationRepo.On("ExistsByOrderID", mock.Anything, orderID).Return(true, nil)

		input := ReserveStockInput{
			ProductID: uuid.New(),
			OrderID:   orderID,
			Quantity:  10,
		}

		// Act
		output, err := uc.Execute(context.Background(), input)

		// Assert
		assert.Error(t, err)
		assert.Nil(t, output)
		assert.Contains(t, err.Error(), "reservation already exists")

		mockReservationRepo.AssertExpectations(t)
	})
}

func TestReserveStockUseCase_Execute_RepositoryErrors(t *testing.T) {
	t.Run("should return error when inventory item not found", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		uc := NewReserveStockUseCase(mockInventoryRepo, mockReservationRepo)

		productID := uuid.New()
		orderID := uuid.New()

		mockReservationRepo.On("ExistsByOrderID", mock.Anything, orderID).Return(false, nil)
		mockInventoryRepo.On("FindByProductID", mock.Anything, productID).Return(nil, errors.ErrInventoryItemNotFound)

		input := ReserveStockInput{
			ProductID: productID,
			OrderID:   orderID,
			Quantity:  10,
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

	t.Run("should return error when update fails due to optimistic lock", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		uc := NewReserveStockUseCase(mockInventoryRepo, mockReservationRepo)

		productID := uuid.New()
		orderID := uuid.New()
		item, _ := entity.NewInventoryItem(productID, 100)

		mockReservationRepo.On("ExistsByOrderID", mock.Anything, orderID).Return(false, nil)
		mockInventoryRepo.On("FindByProductID", mock.Anything, productID).Return(item, nil)
		mockInventoryRepo.On("Update", mock.Anything, mock.AnythingOfType("*entity.InventoryItem")).Return(errors.ErrOptimisticLockFailure)

		input := ReserveStockInput{
			ProductID: productID,
			OrderID:   orderID,
			Quantity:  50,
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
