package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/application/usecase"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockGetInventoryStatsUseCase es un mock del use case
type MockGetInventoryStatsUseCase struct {
	mock.Mock
}

func (m *MockGetInventoryStatsUseCase) Execute(ctx context.Context) (*usecase.InventoryStats, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*usecase.InventoryStats), args.Error(1)
}

func TestGetInventoryStatsHandler_Handle_Success(t *testing.T) {
	// Arrange
	gin.SetMode(gin.TestMode)
	mockUseCase := new(MockGetInventoryStatsUseCase)
	handler := NewGetInventoryStatsHandler(mockUseCase)

	mockStats := &usecase.InventoryStats{
		TotalItems:       100,
		TotalQuantity:    5000,
		TotalReserved:    1200,
		TotalAvailable:   3800,
		LowStockCount:    5,
		AverageAvailable: 38.0,
		ReservationRate:  24.0,
	}

	mockUseCase.On("Execute", mock.Anything).Return(mockStats, nil)

	// Setup request
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/inventory/stats", nil)

	// Act
	handler.Handle(c)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)

	var response GetInventoryStatsResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)

	assert.Equal(t, int64(100), response.TotalItems)
	assert.Equal(t, int64(5000), response.TotalQuantity)
	assert.Equal(t, int64(1200), response.TotalReserved)
	assert.Equal(t, int64(3800), response.TotalAvailable)
	assert.Equal(t, int64(5), response.LowStockCount)
	assert.Equal(t, 38.0, response.AverageAvailable)
	assert.Equal(t, 24.0, response.ReservationRate)

	mockUseCase.AssertExpectations(t)
}

func TestGetInventoryStatsHandler_Handle_InternalError(t *testing.T) {
	// Arrange
	gin.SetMode(gin.TestMode)
	mockUseCase := new(MockGetInventoryStatsUseCase)
	handler := NewGetInventoryStatsHandler(mockUseCase)

	mockUseCase.On("Execute", mock.Anything).Return(nil, errors.New("database error"))

	// Setup request
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/inventory/stats", nil)

	// Act
	handler.Handle(c)

	// Assert
	assert.Equal(t, http.StatusInternalServerError, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Contains(t, response["error"], "Failed to retrieve inventory statistics")

	mockUseCase.AssertExpectations(t)
}

func TestGetInventoryStatsHandler_Handle_EmptyInventory(t *testing.T) {
	// Arrange
	gin.SetMode(gin.TestMode)
	mockUseCase := new(MockGetInventoryStatsUseCase)
	handler := NewGetInventoryStatsHandler(mockUseCase)

	emptyStats := &usecase.InventoryStats{
		TotalItems:       0,
		TotalQuantity:    0,
		TotalReserved:    0,
		TotalAvailable:   0,
		LowStockCount:    0,
		AverageAvailable: 0,
		ReservationRate:  0,
	}

	mockUseCase.On("Execute", mock.Anything).Return(emptyStats, nil)

	// Setup request
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/inventory/stats", nil)

	// Act
	handler.Handle(c)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)

	var response GetInventoryStatsResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)

	assert.Equal(t, int64(0), response.TotalItems)
	assert.Equal(t, int64(0), response.TotalQuantity)

	mockUseCase.AssertExpectations(t)
}
