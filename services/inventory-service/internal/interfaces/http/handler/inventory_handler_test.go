package handler_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

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

// MockReserveStockUseCase is a mock of ReserveStockUseCase
type MockReserveStockUseCase struct {
	mock.Mock
}

func (m *MockReserveStockUseCase) Execute(ctx interface{}, input usecase.ReserveStockInput) (*usecase.ReserveStockOutput, error) {
	args := m.Called(ctx, input)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*usecase.ReserveStockOutput), args.Error(1)
}

// MockConfirmReservationUseCase is a mock of ConfirmReservationUseCase
type MockConfirmReservationUseCase struct {
	mock.Mock
}

func (m *MockConfirmReservationUseCase) Execute(ctx interface{}, input usecase.ConfirmReservationInput) (*usecase.ConfirmReservationOutput, error) {
	args := m.Called(ctx, input)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*usecase.ConfirmReservationOutput), args.Error(1)
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

// ============================================================================
// POST /api/inventory/reserve
// ============================================================================

func TestReserveStock_Success(t *testing.T) {
	// Arrange
	router := setupRouter()
	mockReserveUseCase := new(MockReserveStockUseCase)
	h := handler.NewInventoryHandler(nil, mockReserveUseCase, nil, nil)

	productID := uuid.New()
	orderID := uuid.New()
	reservationID := uuid.New()
	expiresAt := time.Now().Add(15 * time.Minute)

	expectedOutput := &usecase.ReserveStockOutput{
		ReservationID:        reservationID,
		ProductID:            productID,
		OrderID:              orderID,
		Quantity:             5,
		ExpiresAt:            expiresAt,
		RemainingStock:       95,
		ReservationCreatedAt: time.Now(),
	}

	mockReserveUseCase.On("Execute", mock.Anything, mock.MatchedBy(func(input usecase.ReserveStockInput) bool {
		return input.ProductID == productID && input.OrderID == orderID && input.Quantity == 5
	})).Return(expectedOutput, nil)

	router.POST("/api/inventory/reserve", h.ReserveStock)

	// Act
	requestBody := map[string]interface{}{
		"product_id": productID.String(),
		"order_id":   orderID.String(),
		"quantity":   5,
	}
	bodyBytes, _ := json.Marshal(requestBody)

	req := httptest.NewRequest(http.MethodPost, "/api/inventory/reserve", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert
	assert.Equal(t, http.StatusCreated, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, reservationID.String(), response["reservation_id"])
	assert.Equal(t, productID.String(), response["product_id"])
	assert.Equal(t, orderID.String(), response["order_id"])
	assert.Equal(t, float64(5), response["quantity"])
	assert.Equal(t, float64(95), response["remaining_stock"])
	assert.NotEmpty(t, response["expires_at"])

	mockReserveUseCase.AssertExpectations(t)
}

func TestReserveStock_InvalidJSON(t *testing.T) {
	// Arrange
	router := setupRouter()
	h := handler.NewInventoryHandler(nil, nil, nil, nil)
	router.POST("/api/inventory/reserve", h.ReserveStock)

	// Act
	req := httptest.NewRequest(http.MethodPost, "/api/inventory/reserve", bytes.NewBufferString("invalid json"))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "invalid_request", response["error"])
}

func TestReserveStock_InvalidProductID(t *testing.T) {
	// Arrange
	router := setupRouter()
	h := handler.NewInventoryHandler(nil, nil, nil, nil)
	router.POST("/api/inventory/reserve", h.ReserveStock)

	// Act
	requestBody := map[string]interface{}{
		"product_id": "invalid-uuid",
		"order_id":   uuid.New().String(),
		"quantity":   5,
	}
	bodyBytes, _ := json.Marshal(requestBody)

	req := httptest.NewRequest(http.MethodPost, "/api/inventory/reserve", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "invalid_product_id", response["error"])
}

func TestReserveStock_InvalidQuantity(t *testing.T) {
	// Arrange
	router := setupRouter()
	h := handler.NewInventoryHandler(nil, nil, nil, nil)
	router.POST("/api/inventory/reserve", h.ReserveStock)

	// Act
	requestBody := map[string]interface{}{
		"product_id": uuid.New().String(),
		"order_id":   uuid.New().String(),
		"quantity":   0,
	}
	bodyBytes, _ := json.Marshal(requestBody)

	req := httptest.NewRequest(http.MethodPost, "/api/inventory/reserve", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert - Gin validation catches this as invalid_request (min=1 validation)
	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "invalid_request", response["error"])
	assert.Contains(t, response["message"], "Quantity")
}

func TestReserveStock_InsufficientStock(t *testing.T) {
	// Arrange
	router := setupRouter()
	mockReserveUseCase := new(MockReserveStockUseCase)
	h := handler.NewInventoryHandler(nil, mockReserveUseCase, nil, nil)

	mockReserveUseCase.On("Execute", mock.Anything, mock.Anything).Return(nil, errors.ErrInsufficientStock)

	router.POST("/api/inventory/reserve", h.ReserveStock)

	// Act
	requestBody := map[string]interface{}{
		"product_id": uuid.New().String(),
		"order_id":   uuid.New().String(),
		"quantity":   100,
	}
	bodyBytes, _ := json.Marshal(requestBody)

	req := httptest.NewRequest(http.MethodPost, "/api/inventory/reserve", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert
	assert.Equal(t, http.StatusConflict, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "insufficient_stock", response["error"])

	mockReserveUseCase.AssertExpectations(t)
}

func TestReserveStock_ProductNotFound(t *testing.T) {
	// Arrange
	router := setupRouter()
	mockReserveUseCase := new(MockReserveStockUseCase)
	h := handler.NewInventoryHandler(nil, mockReserveUseCase, nil, nil)

	mockReserveUseCase.On("Execute", mock.Anything, mock.Anything).Return(nil, errors.ErrInventoryItemNotFound)

	router.POST("/api/inventory/reserve", h.ReserveStock)

	// Act
	requestBody := map[string]interface{}{
		"product_id": uuid.New().String(),
		"order_id":   uuid.New().String(),
		"quantity":   5,
	}
	bodyBytes, _ := json.Marshal(requestBody)

	req := httptest.NewRequest(http.MethodPost, "/api/inventory/reserve", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert
	assert.Equal(t, http.StatusNotFound, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "product_not_found", response["error"])

	mockReserveUseCase.AssertExpectations(t)
}

// ============================================================================
// POST /api/inventory/confirm
// ============================================================================

func TestConfirmReservation_Success(t *testing.T) {
	// Arrange
	router := setupRouter()
	mockConfirmUseCase := new(MockConfirmReservationUseCase)
	h := handler.NewInventoryHandler(nil, nil, mockConfirmUseCase, nil)

	reservationID := uuid.New()
	inventoryItemID := uuid.New()
	orderID := uuid.New()

	expectedOutput := &usecase.ConfirmReservationOutput{
		ReservationID:     reservationID,
		InventoryItemID:   inventoryItemID,
		OrderID:           orderID,
		QuantityConfirmed: 5,
		FinalStock:        90,
		ReservedStock:     0,
	}

	mockConfirmUseCase.On("Execute", mock.Anything, mock.MatchedBy(func(input usecase.ConfirmReservationInput) bool {
		return input.ReservationID == reservationID
	})).Return(expectedOutput, nil)

	router.POST("/api/inventory/confirm/:reservationId", h.ConfirmReservation)

	// Act
	req := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/api/inventory/confirm/%s", reservationID.String()), nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, reservationID.String(), response["reservation_id"])
	assert.Equal(t, orderID.String(), response["order_id"])
	assert.Equal(t, float64(5), response["quantity_confirmed"])
	assert.Equal(t, float64(90), response["final_stock"])
	assert.Equal(t, float64(0), response["reserved_stock"])

	mockConfirmUseCase.AssertExpectations(t)
}

func TestConfirmReservation_InvalidReservationID(t *testing.T) {
	// Arrange
	router := setupRouter()
	h := handler.NewInventoryHandler(nil, nil, nil, nil)
	router.POST("/api/inventory/confirm/:reservationId", h.ConfirmReservation)

	// Act
	req := httptest.NewRequest(http.MethodPost, "/api/inventory/confirm/invalid-uuid", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "invalid_reservation_id", response["error"])
}

func TestConfirmReservation_ReservationNotFound(t *testing.T) {
	// Arrange
	router := setupRouter()
	mockConfirmUseCase := new(MockConfirmReservationUseCase)
	h := handler.NewInventoryHandler(nil, nil, mockConfirmUseCase, nil)

	reservationID := uuid.New()

	mockConfirmUseCase.On("Execute", mock.Anything, mock.Anything).Return(nil, errors.ErrReservationNotFound)

	router.POST("/api/inventory/confirm/:reservationId", h.ConfirmReservation)

	// Act
	req := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/api/inventory/confirm/%s", reservationID.String()), nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert
	assert.Equal(t, http.StatusNotFound, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "reservation_not_found", response["error"])

	mockConfirmUseCase.AssertExpectations(t)
}

func TestConfirmReservation_ReservationNotPending(t *testing.T) {
	// Arrange
	router := setupRouter()
	mockConfirmUseCase := new(MockConfirmReservationUseCase)
	h := handler.NewInventoryHandler(nil, nil, mockConfirmUseCase, nil)

	reservationID := uuid.New()

	mockConfirmUseCase.On("Execute", mock.Anything, mock.Anything).Return(nil, errors.ErrReservationNotPending)

	router.POST("/api/inventory/confirm/:reservationId", h.ConfirmReservation)

	// Act
	req := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/api/inventory/confirm/%s", reservationID.String()), nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert
	assert.Equal(t, http.StatusConflict, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "reservation_not_pending", response["error"])

	mockConfirmUseCase.AssertExpectations(t)
}

func TestConfirmReservation_ReservationExpired(t *testing.T) {
	// Arrange
	router := setupRouter()
	mockConfirmUseCase := new(MockConfirmReservationUseCase)
	h := handler.NewInventoryHandler(nil, nil, mockConfirmUseCase, nil)

	reservationID := uuid.New()

	mockConfirmUseCase.On("Execute", mock.Anything, mock.Anything).Return(nil, errors.ErrReservationExpired)

	router.POST("/api/inventory/confirm/:reservationId", h.ConfirmReservation)

	// Act
	req := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/api/inventory/confirm/%s", reservationID.String()), nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Assert
	assert.Equal(t, http.StatusGone, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, "reservation_expired", response["error"])

	mockConfirmUseCase.AssertExpectations(t)
}
