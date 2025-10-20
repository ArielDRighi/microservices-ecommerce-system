package handler_test

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/application/usecase"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/errors"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/interfaces/http/handler"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockCheckAvailabilityUseCase is a mock of CheckAvailabilityUseCase
type MockCheckAvailabilityUseCase struct {
	mock.Mock
}

func (m *MockCheckAvailabilityUseCase) Execute(ctx interface{}, input usecase.CheckAvailabilityInput) (*usecase.CheckAvailabilityOutput, error) {
	args := m.Called(ctx, input)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*usecase.CheckAvailabilityOutput), args.Error(1)
}

func setupRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return gin.New()
}

func TestGetInventoryByProductID_Success(t *testing.T) {
	// Arrange
	router := setupRouter()
	mockUseCase := new(MockCheckAvailabilityUseCase)
	h := handler.NewInventoryHandler(mockUseCase, nil, nil, nil)

	productID := uuid.New()
	expectedOutput := &usecase.CheckAvailabilityOutput{
		ProductID:         productID,
		IsAvailable:       true,
		RequestedQuantity: 1,
		AvailableQuantity: 100,
		TotalStock:        150,
		ReservedQuantity:  50,
	}

	mockUseCase.On("Execute", mock.Anything, mock.MatchedBy(func(input usecase.CheckAvailabilityInput) bool {
		return input.ProductID == productID && input.Quantity == 1
	})).Return(expectedOutput, nil)

	router.GET("/api/inventory/:productId", h.GetByProductID)

	// Act
	req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/inventory/%s", productID.String()), nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, productID.String(), response["product_id"])
	assert.Equal(t, true, response["is_available"])
	assert.Equal(t, float64(100), response["available_quantity"])
	assert.Equal(t, float64(150), response["total_stock"])
	assert.Equal(t, float64(50), response["reserved_quantity"])

	mockUseCase.AssertExpectations(t)
}

func TestGetInventoryByProductID_InvalidUUID(t *testing.T) {
	// Arrange
	router := setupRouter()
	mockUseCase := new(MockCheckAvailabilityUseCase)
	h := handler.NewInventoryHandler(mockUseCase, nil, nil, nil)

	router.GET("/api/inventory/:productId", h.GetByProductID)

	// Act
	req := httptest.NewRequest(http.MethodGet, "/api/inventory/invalid-uuid", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "invalid_product_id", response["error"])
	assert.Contains(t, response["message"], "Invalid product ID format")
}

func TestGetInventoryByProductID_ProductNotFound(t *testing.T) {
	// Arrange
	router := setupRouter()
	mockUseCase := new(MockCheckAvailabilityUseCase)
	h := handler.NewInventoryHandler(mockUseCase, nil, nil, nil)

	productID := uuid.New()

	mockUseCase.On("Execute", mock.Anything, mock.Anything).Return(nil, errors.ErrInventoryItemNotFound)

	router.GET("/api/inventory/:productId", h.GetByProductID)

	// Act
	req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/inventory/%s", productID.String()), nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert
	assert.Equal(t, http.StatusNotFound, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "product_not_found", response["error"])
	assert.NotEmpty(t, response["message"])

	mockUseCase.AssertExpectations(t)
}

func TestGetInventoryByProductID_InternalError(t *testing.T) {
	// Arrange
	router := setupRouter()
	mockUseCase := new(MockCheckAvailabilityUseCase)
	h := handler.NewInventoryHandler(mockUseCase, nil, nil, nil)

	productID := uuid.New()

	mockUseCase.On("Execute", mock.Anything, mock.Anything).Return(nil, fmt.Errorf("database connection error"))

	router.GET("/api/inventory/:productId", h.GetByProductID)

	// Act
	req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/inventory/%s", productID.String()), nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert
	assert.Equal(t, http.StatusInternalServerError, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "internal_error", response["error"])

	mockUseCase.AssertExpectations(t)
}
