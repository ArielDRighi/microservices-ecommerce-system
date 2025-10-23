package usecase

import (
	"context"
	"testing"
	"time"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/entity"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/errors"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/events"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

// MockPublisher is a mock implementation of events.Publisher
type MockPublisher struct {
	mock.Mock
}

func (m *MockPublisher) PublishStockReserved(ctx context.Context, event events.StockReservedEvent) error {
	args := m.Called(ctx, event)
	return args.Error(0)
}

func (m *MockPublisher) PublishStockConfirmed(ctx context.Context, event events.StockConfirmedEvent) error {
	args := m.Called(ctx, event)
	return args.Error(0)
}

func (m *MockPublisher) PublishStockReleased(ctx context.Context, event events.StockReleasedEvent) error {
	args := m.Called(ctx, event)
	return args.Error(0)
}

func (m *MockPublisher) PublishStockFailed(ctx context.Context, event events.StockFailedEvent) error {
	args := m.Called(ctx, event)
	return args.Error(0)
}

func (m *MockPublisher) PublishStockDepleted(ctx context.Context, event events.StockDepletedEvent) error {
	args := m.Called(ctx, event)
	return args.Error(0)
}

func (m *MockPublisher) Close() error {
	args := m.Called()
	return args.Error(0)
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
	mockPublisher := new(MockPublisher)

	uc := NewReserveStockUseCase(mockInventoryRepo, mockReservationRepo, mockPublisher)

	assert.NotNil(t, uc)
	assert.Equal(t, mockInventoryRepo, uc.inventoryRepo)
	assert.Equal(t, mockReservationRepo, uc.reservationRepo)
	assert.Equal(t, mockPublisher, uc.publisher)
}

func TestReserveStockUseCase_Execute_Success(t *testing.T) {
	t.Run("should reserve stock successfully with default duration", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		mockPublisher := new(MockPublisher)
		uc := NewReserveStockUseCase(mockInventoryRepo, mockReservationRepo, mockPublisher)

		productID := uuid.New()
		orderID := uuid.New()
		item, _ := entity.NewInventoryItem(productID, 100)

		mockReservationRepo.On("ExistsByOrderID", mock.Anything, orderID).Return(false, nil)
		mockInventoryRepo.On("FindByProductID", mock.Anything, productID).Return(item, nil)
		mockInventoryRepo.On("Update", mock.Anything, mock.AnythingOfType("*entity.InventoryItem")).Return(nil)
		mockReservationRepo.On("Save", mock.Anything, mock.AnythingOfType("*entity.Reservation")).Return(nil)
		mockPublisher.On("PublishStockReserved", mock.Anything, mock.AnythingOfType("events.StockReservedEvent")).Return(nil)

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
		mockPublisher := new(MockPublisher)
		uc := NewReserveStockUseCase(mockInventoryRepo, mockReservationRepo, mockPublisher)

		productID := uuid.New()
		orderID := uuid.New()
		item, _ := entity.NewInventoryItem(productID, 100)
		customDuration := 30 * time.Minute

		mockReservationRepo.On("ExistsByOrderID", mock.Anything, orderID).Return(false, nil)
		mockInventoryRepo.On("FindByProductID", mock.Anything, productID).Return(item, nil)
		mockInventoryRepo.On("Update", mock.Anything, mock.AnythingOfType("*entity.InventoryItem")).Return(nil)
		mockReservationRepo.On("Save", mock.Anything, mock.AnythingOfType("*entity.Reservation")).Return(nil)
		mockPublisher.On("PublishStockReserved", mock.Anything, mock.AnythingOfType("events.StockReservedEvent")).Return(nil)

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

	t.Run("should update inventory with optimistic locking (version managed by repository)", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		mockPublisher := new(MockPublisher)
		uc := NewReserveStockUseCase(mockInventoryRepo, mockReservationRepo, mockPublisher)

		productID := uuid.New()
		orderID := uuid.New()
		item, _ := entity.NewInventoryItem(productID, 100)

		mockReservationRepo.On("ExistsByOrderID", mock.Anything, orderID).Return(false, nil)
		mockInventoryRepo.On("FindByProductID", mock.Anything, productID).Return(item, nil)
		// Repository layer is responsible for version increment, not the entity
		// Entity only updates Reserved field
		mockInventoryRepo.On("Update", mock.Anything, mock.MatchedBy(func(i *entity.InventoryItem) bool {
			return i.Reserved == 50 && i.Quantity == 100
		})).Return(nil)
		mockReservationRepo.On("Save", mock.Anything, mock.AnythingOfType("*entity.Reservation")).Return(nil)
		mockPublisher.On("PublishStockReserved", mock.Anything, mock.AnythingOfType("events.StockReservedEvent")).Return(nil)

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
		assert.Equal(t, 50, output.Quantity)
		assert.Equal(t, 50, output.RemainingStock) // 100 - 50 reserved

		mockInventoryRepo.AssertExpectations(t)
		mockReservationRepo.AssertExpectations(t)
	})
}

func TestReserveStockUseCase_Execute_PublishesEvents(t *testing.T) {
	t.Run("should publish StockReserved event on success", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		mockPublisher := new(MockPublisher)
		uc := NewReserveStockUseCase(mockInventoryRepo, mockReservationRepo, mockPublisher)

		productID := uuid.New()
		orderID := uuid.New()
		item, _ := entity.NewInventoryItem(productID, 100)

		mockReservationRepo.On("ExistsByOrderID", mock.Anything, orderID).Return(false, nil)
		mockInventoryRepo.On("FindByProductID", mock.Anything, productID).Return(item, nil)
		mockInventoryRepo.On("Update", mock.Anything, mock.AnythingOfType("*entity.InventoryItem")).Return(nil)
		mockReservationRepo.On("Save", mock.Anything, mock.AnythingOfType("*entity.Reservation")).Return(nil)

		// Expect StockReserved event to be published
		mockPublisher.On("PublishStockReserved", mock.Anything, mock.MatchedBy(func(event events.StockReservedEvent) bool {
			return event.Payload.ProductID == productID.String() &&
				event.Payload.OrderID == orderID.String() &&
				event.Payload.Quantity == 50 &&
				!event.Payload.ReservedAt.IsZero() &&
				!event.Payload.ExpiresAt.IsZero()
		})).Return(nil)

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
		mockPublisher.AssertExpectations(t)
		mockInventoryRepo.AssertExpectations(t)
		mockReservationRepo.AssertExpectations(t)
	})

	t.Run("should publish StockDepleted event when stock reaches zero", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		mockPublisher := new(MockPublisher)
		uc := NewReserveStockUseCase(mockInventoryRepo, mockReservationRepo, mockPublisher)

		productID := uuid.New()
		orderID := uuid.New()
		item, _ := entity.NewInventoryItem(productID, 50) // Exactly 50 in stock

		mockReservationRepo.On("ExistsByOrderID", mock.Anything, orderID).Return(false, nil)
		mockInventoryRepo.On("FindByProductID", mock.Anything, productID).Return(item, nil)
		mockInventoryRepo.On("Update", mock.Anything, mock.AnythingOfType("*entity.InventoryItem")).Return(nil)
		mockReservationRepo.On("Save", mock.Anything, mock.AnythingOfType("*entity.Reservation")).Return(nil)

		// Expect both StockReserved and StockDepleted events
		mockPublisher.On("PublishStockReserved", mock.Anything, mock.AnythingOfType("events.StockReservedEvent")).Return(nil)
		mockPublisher.On("PublishStockDepleted", mock.Anything, mock.MatchedBy(func(event events.StockDepletedEvent) bool {
			return event.Payload.ProductID == productID.String() &&
				event.Payload.OrderID == orderID.String() &&
				event.Payload.LastQuantity == 50 &&
				!event.Payload.DepletedAt.IsZero()
		})).Return(nil)

		input := ReserveStockInput{
			ProductID: productID,
			OrderID:   orderID,
			Quantity:  50, // Reserve all stock
		}

		// Act
		output, err := uc.Execute(context.Background(), input)

		// Assert
		require.NoError(t, err)
		assert.NotNil(t, output)
		assert.Equal(t, 0, output.RemainingStock)
		mockPublisher.AssertExpectations(t)
		mockInventoryRepo.AssertExpectations(t)
		mockReservationRepo.AssertExpectations(t)
	})

	t.Run("should not fail reservation if event publication fails", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		mockPublisher := new(MockPublisher)
		uc := NewReserveStockUseCase(mockInventoryRepo, mockReservationRepo, mockPublisher)

		productID := uuid.New()
		orderID := uuid.New()
		item, _ := entity.NewInventoryItem(productID, 100)

		mockReservationRepo.On("ExistsByOrderID", mock.Anything, orderID).Return(false, nil)
		mockInventoryRepo.On("FindByProductID", mock.Anything, productID).Return(item, nil)
		mockInventoryRepo.On("Update", mock.Anything, mock.AnythingOfType("*entity.InventoryItem")).Return(nil)
		mockReservationRepo.On("Save", mock.Anything, mock.AnythingOfType("*entity.Reservation")).Return(nil)

		// Simulate event publication failure
		mockPublisher.On("PublishStockReserved", mock.Anything, mock.AnythingOfType("events.StockReservedEvent")).
			Return(assert.AnError)

		input := ReserveStockInput{
			ProductID: productID,
			OrderID:   orderID,
			Quantity:  50,
		}

		// Act
		output, err := uc.Execute(context.Background(), input)

		// Assert - Reservation should still succeed even if event publication fails
		require.NoError(t, err)
		assert.NotNil(t, output)
		mockPublisher.AssertExpectations(t)
		mockInventoryRepo.AssertExpectations(t)
		mockReservationRepo.AssertExpectations(t)
	})
}

func TestReserveStockUseCase_Execute_InsufficientStock(t *testing.T) {
	t.Run("should return error when insufficient stock", func(t *testing.T) {
		// Arrange
		mockInventoryRepo := new(MockInventoryRepository)
		mockReservationRepo := new(MockReservationRepository)
		mockPublisher := new(MockPublisher)
		uc := NewReserveStockUseCase(mockInventoryRepo, mockReservationRepo, mockPublisher)

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
		mockPublisher := new(MockPublisher)
		uc := NewReserveStockUseCase(mockInventoryRepo, mockReservationRepo, mockPublisher)

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
		mockPublisher := new(MockPublisher)
		uc := NewReserveStockUseCase(mockInventoryRepo, mockReservationRepo, mockPublisher)

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
		mockPublisher := new(MockPublisher)
		uc := NewReserveStockUseCase(mockInventoryRepo, mockReservationRepo, mockPublisher)

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
		mockPublisher := new(MockPublisher)
		uc := NewReserveStockUseCase(mockInventoryRepo, mockReservationRepo, mockPublisher)

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
		mockPublisher := new(MockPublisher)
		uc := NewReserveStockUseCase(mockInventoryRepo, mockReservationRepo, mockPublisher)

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
		mockPublisher := new(MockPublisher)
		uc := NewReserveStockUseCase(mockInventoryRepo, mockReservationRepo, mockPublisher)

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
