package usecase

import (
	"context"
	"errors"
	"testing"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/entity"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

// TestGetInventoryStats_Success verifies that statistics are calculated correctly
func TestGetInventoryStats_Success(t *testing.T) {
	// Arrange
	mockRepo := new(MockInventoryRepository)
	uc := NewGetInventoryStatsUseCase(mockRepo)
	ctx := context.Background()

	// Mock all inventory items
	items := []*entity.InventoryItem{
		{
			ID:        uuid.New(),
			ProductID: uuid.New(),
			Quantity:  100,
			Reserved:  10,
			Version:   1,
		},
		{
			ID:        uuid.New(),
			ProductID: uuid.New(),
			Quantity:  50,
			Reserved:  30,
			Version:   1,
		},
		{
			ID:        uuid.New(),
			ProductID: uuid.New(),
			Quantity:  5, // Low stock
			Reserved:  2,
			Version:   1,
		},
	}

	mockRepo.On("FindAll", ctx, 0, 0).Return(items, nil)

	// Act
	stats, err := uc.Execute(ctx)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, stats)
	assert.Equal(t, int64(3), stats.TotalItems)
	assert.Equal(t, int64(155), stats.TotalQuantity)      // 100 + 50 + 5
	assert.Equal(t, int64(42), stats.TotalReserved)       // 10 + 30 + 2
	assert.Equal(t, int64(113), stats.TotalAvailable)     // (100-10) + (50-30) + (5-2) = 90 + 20 + 3 = 113
	assert.Equal(t, int64(1), stats.LowStockCount)        // Only 1 item with available < 10 (item 3: 3 available)
	assert.InDelta(t, 37.67, stats.AverageAvailable, 0.1) // 113 / 3 ≈ 37.67
	assert.InDelta(t, 27.1, stats.ReservationRate, 0.1)   // (42 / 155) * 100 ≈ 27.1%

	mockRepo.AssertExpectations(t)
}

// TestGetInventoryStats_EmptyInventory verifies empty inventory handling
func TestGetInventoryStats_EmptyInventory(t *testing.T) {
	// Arrange
	mockRepo := new(MockInventoryRepository)
	uc := NewGetInventoryStatsUseCase(mockRepo)
	ctx := context.Background()

	mockRepo.On("FindAll", ctx, 0, 0).Return([]*entity.InventoryItem{}, nil)

	// Act
	stats, err := uc.Execute(ctx)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, stats)
	assert.Equal(t, int64(0), stats.TotalItems)
	assert.Equal(t, int64(0), stats.TotalQuantity)
	assert.Equal(t, int64(0), stats.TotalReserved)
	assert.Equal(t, int64(0), stats.TotalAvailable)
	assert.Equal(t, int64(0), stats.LowStockCount)
	assert.Equal(t, float64(0), stats.AverageAvailable)
	assert.Equal(t, float64(0), stats.ReservationRate)

	mockRepo.AssertExpectations(t)
}

// TestGetInventoryStats_RepositoryError verifies repository error handling
func TestGetInventoryStats_RepositoryError(t *testing.T) {
	// Arrange
	mockRepo := new(MockInventoryRepository)
	uc := NewGetInventoryStatsUseCase(mockRepo)
	ctx := context.Background()

	expectedError := errors.New("database connection failed")
	mockRepo.On("FindAll", ctx, 0, 0).Return(nil, expectedError)

	// Act
	stats, err := uc.Execute(ctx)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, stats)
	assert.Contains(t, err.Error(), "failed to fetch inventory items")

	mockRepo.AssertExpectations(t)
}

// TestGetInventoryStats_AllLowStock verifies when all inventory is low stock
func TestGetInventoryStats_AllLowStock(t *testing.T) {
	// Arrange
	mockRepo := new(MockInventoryRepository)
	uc := NewGetInventoryStatsUseCase(mockRepo)
	ctx := context.Background()

	items := []*entity.InventoryItem{
		{
			ID:        uuid.New(),
			ProductID: uuid.New(),
			Quantity:  5,
			Reserved:  2,
			Version:   1,
		},
		{
			ID:        uuid.New(),
			ProductID: uuid.New(),
			Quantity:  3,
			Reserved:  1,
			Version:   1,
		},
	}

	mockRepo.On("FindAll", ctx, 0, 0).Return(items, nil)

	// Act
	stats, err := uc.Execute(ctx)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, stats)
	assert.Equal(t, int64(2), stats.LowStockCount)      // Both items < 10
	assert.InDelta(t, 37.5, stats.ReservationRate, 0.1) // (3 / 8) * 100

	mockRepo.AssertExpectations(t)
}

// TestGetInventoryStats_HighReservationRate verifies high reservation rate
func TestGetInventoryStats_HighReservationRate(t *testing.T) {
	// Arrange
	mockRepo := new(MockInventoryRepository)
	uc := NewGetInventoryStatsUseCase(mockRepo)
	ctx := context.Background()

	items := []*entity.InventoryItem{
		{
			ID:        uuid.New(),
			ProductID: uuid.New(),
			Quantity:  100,
			Reserved:  95, // 95% reserved
			Version:   1,
		},
	}

	mockRepo.On("FindAll", ctx, 0, 0).Return(items, nil)

	// Act
	stats, err := uc.Execute(ctx)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, stats)
	assert.Equal(t, float64(95.0), stats.ReservationRate)

	mockRepo.AssertExpectations(t)
}
