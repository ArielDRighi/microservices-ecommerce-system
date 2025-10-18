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

func (m *MockInventoryRepository) FindLowStock(ctx context.Context, threshold int, limit int) ([]*entity.InventoryItem, error) {
	args := m.Called(ctx, threshold, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*entity.InventoryItem), args.Error(1)
}

func (m *MockInventoryRepository) Count(ctx context.Context) (int64, error) {
	args := m.Called(ctx)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockInventoryRepository) ExistsByProductID(ctx context.Context, productID uuid.UUID) (bool, error) {
	args := m.Called(ctx, productID)
	return args.Bool(0), args.Error(1)
}

func (m *MockInventoryRepository) IncrementVersion(ctx context.Context, id uuid.UUID) (int, error) {
	args := m.Called(ctx, id)
	return args.Int(0), args.Error(1)
}

func TestNewCheckAvailabilityUseCase(t *testing.T) {
	mockRepo := new(MockInventoryRepository)
	uc := NewCheckAvailabilityUseCase(mockRepo)

	assert.NotNil(t, uc)
	assert.Equal(t, mockRepo, uc.inventoryRepo)
}

func TestCheckAvailabilityUseCase_Execute_Success(t *testing.T) {
	t.Run("should return available when sufficient stock exists", func(t *testing.T) {
		// Arrange
		mockRepo := new(MockInventoryRepository)
		uc := NewCheckAvailabilityUseCase(mockRepo)

		productID := uuid.New()
		item, _ := entity.NewInventoryItem(productID, 100)

		mockRepo.On("FindByProductID", mock.Anything, productID).Return(item, nil)

		input := CheckAvailabilityInput{
			ProductID: productID,
			Quantity:  50,
		}

		// Act
		output, err := uc.Execute(context.Background(), input)

		// Assert
		require.NoError(t, err)
		assert.NotNil(t, output)
		assert.True(t, output.IsAvailable)
		assert.Equal(t, productID, output.ProductID)
		assert.Equal(t, 50, output.RequestedQuantity)
		assert.Equal(t, 100, output.AvailableQuantity)
		assert.Equal(t, 100, output.TotalStock)
		assert.Equal(t, 0, output.ReservedQuantity)

		mockRepo.AssertExpectations(t)
	})

	t.Run("should return available when exact stock matches requested", func(t *testing.T) {
		// Arrange
		mockRepo := new(MockInventoryRepository)
		uc := NewCheckAvailabilityUseCase(mockRepo)

		productID := uuid.New()
		item, _ := entity.NewInventoryItem(productID, 50)

		mockRepo.On("FindByProductID", mock.Anything, productID).Return(item, nil)

		input := CheckAvailabilityInput{
			ProductID: productID,
			Quantity:  50,
		}

		// Act
		output, err := uc.Execute(context.Background(), input)

		// Assert
		require.NoError(t, err)
		assert.True(t, output.IsAvailable)
		assert.Equal(t, 50, output.AvailableQuantity)
		mockRepo.AssertExpectations(t)
	})

	t.Run("should consider reserved quantity when checking availability", func(t *testing.T) {
		// Arrange
		mockRepo := new(MockInventoryRepository)
		uc := NewCheckAvailabilityUseCase(mockRepo)

		productID := uuid.New()
		item, _ := entity.NewInventoryItem(productID, 100)
		item.Reserve(30) // Reserve 30 units

		mockRepo.On("FindByProductID", mock.Anything, productID).Return(item, nil)

		input := CheckAvailabilityInput{
			ProductID: productID,
			Quantity:  50,
		}

		// Act
		output, err := uc.Execute(context.Background(), input)

		// Assert
		require.NoError(t, err)
		assert.True(t, output.IsAvailable) // 100 - 30 = 70 available, enough for 50
		assert.Equal(t, 100, output.TotalStock)
		assert.Equal(t, 30, output.ReservedQuantity)
		assert.Equal(t, 70, output.AvailableQuantity)
		mockRepo.AssertExpectations(t)
	})
}

func TestCheckAvailabilityUseCase_Execute_NotAvailable(t *testing.T) {
	t.Run("should return not available when insufficient stock", func(t *testing.T) {
		// Arrange
		mockRepo := new(MockInventoryRepository)
		uc := NewCheckAvailabilityUseCase(mockRepo)

		productID := uuid.New()
		item, _ := entity.NewInventoryItem(productID, 30)

		mockRepo.On("FindByProductID", mock.Anything, productID).Return(item, nil)

		input := CheckAvailabilityInput{
			ProductID: productID,
			Quantity:  50,
		}

		// Act
		output, err := uc.Execute(context.Background(), input)

		// Assert
		require.NoError(t, err)
		assert.False(t, output.IsAvailable)
		assert.Equal(t, 30, output.AvailableQuantity)
		assert.Equal(t, 50, output.RequestedQuantity)
		mockRepo.AssertExpectations(t)
	})

	t.Run("should return not available when reserved quantity makes stock insufficient", func(t *testing.T) {
		// Arrange
		mockRepo := new(MockInventoryRepository)
		uc := NewCheckAvailabilityUseCase(mockRepo)

		productID := uuid.New()
		item, _ := entity.NewInventoryItem(productID, 100)
		item.Reserve(80) // Reserve 80 units, leaving only 20 available

		mockRepo.On("FindByProductID", mock.Anything, productID).Return(item, nil)

		input := CheckAvailabilityInput{
			ProductID: productID,
			Quantity:  50,
		}

		// Act
		output, err := uc.Execute(context.Background(), input)

		// Assert
		require.NoError(t, err)
		assert.False(t, output.IsAvailable)
		assert.Equal(t, 20, output.AvailableQuantity) // 100 - 80 = 20
		assert.Equal(t, 80, output.ReservedQuantity)
		mockRepo.AssertExpectations(t)
	})

	t.Run("should return not available when all stock is reserved", func(t *testing.T) {
		// Arrange
		mockRepo := new(MockInventoryRepository)
		uc := NewCheckAvailabilityUseCase(mockRepo)

		productID := uuid.New()
		item, _ := entity.NewInventoryItem(productID, 100)
		item.Reserve(100) // Reserve all stock

		mockRepo.On("FindByProductID", mock.Anything, productID).Return(item, nil)

		input := CheckAvailabilityInput{
			ProductID: productID,
			Quantity:  10,
		}

		// Act
		output, err := uc.Execute(context.Background(), input)

		// Assert
		require.NoError(t, err)
		assert.False(t, output.IsAvailable)
		assert.Equal(t, 0, output.AvailableQuantity)
		mockRepo.AssertExpectations(t)
	})
}

func TestCheckAvailabilityUseCase_Execute_ValidationErrors(t *testing.T) {
	t.Run("should return error when quantity is zero", func(t *testing.T) {
		// Arrange
		mockRepo := new(MockInventoryRepository)
		uc := NewCheckAvailabilityUseCase(mockRepo)

		input := CheckAvailabilityInput{
			ProductID: uuid.New(),
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
		mockRepo := new(MockInventoryRepository)
		uc := NewCheckAvailabilityUseCase(mockRepo)

		input := CheckAvailabilityInput{
			ProductID: uuid.New(),
			Quantity:  -10,
		}

		// Act
		output, err := uc.Execute(context.Background(), input)

		// Assert
		assert.Error(t, err)
		assert.Nil(t, output)
		assert.Equal(t, errors.ErrInvalidQuantity, err)
	})
}

func TestCheckAvailabilityUseCase_Execute_RepositoryErrors(t *testing.T) {
	t.Run("should return error when inventory item not found", func(t *testing.T) {
		// Arrange
		mockRepo := new(MockInventoryRepository)
		uc := NewCheckAvailabilityUseCase(mockRepo)

		productID := uuid.New()
		mockRepo.On("FindByProductID", mock.Anything, productID).Return(nil, errors.ErrInventoryItemNotFound)

		input := CheckAvailabilityInput{
			ProductID: productID,
			Quantity:  10,
		}

		// Act
		output, err := uc.Execute(context.Background(), input)

		// Assert
		assert.Error(t, err)
		assert.Nil(t, output)
		assert.Contains(t, err.Error(), "inventory item not found")
		mockRepo.AssertExpectations(t)
	})
}
