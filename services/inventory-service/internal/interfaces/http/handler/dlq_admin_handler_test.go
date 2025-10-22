package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/application/usecase"
)

// MockListDLQMessagesUseCase mocks the list DLQ use case
type MockListDLQMessagesUseCase struct {
	mock.Mock
}

func (m *MockListDLQMessagesUseCase) Execute(ctx context.Context, limit int, offset int) (*usecase.ListDLQMessagesOutput, error) {
	args := m.Called(ctx, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*usecase.ListDLQMessagesOutput), args.Error(1)
}

// MockGetDLQCountUseCase mocks the get DLQ count use case
type MockGetDLQCountUseCase struct {
	mock.Mock
}

func (m *MockGetDLQCountUseCase) Execute(ctx context.Context) (int, error) {
	args := m.Called(ctx)
	return args.Int(0), args.Error(1)
}

// MockRetryDLQMessageUseCase mocks the retry DLQ message use case
type MockRetryDLQMessageUseCase struct {
	mock.Mock
}

func (m *MockRetryDLQMessageUseCase) Execute(ctx context.Context, input usecase.RetryDLQMessageInput) (*usecase.RetryDLQMessageOutput, error) {
	args := m.Called(ctx, input)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*usecase.RetryDLQMessageOutput), args.Error(1)
}

func TestNewDLQAdminHandler(t *testing.T) {
	mockListUC := new(MockListDLQMessagesUseCase)
	mockCountUC := new(MockGetDLQCountUseCase)
	mockRetryUC := new(MockRetryDLQMessageUseCase)

	handler := NewDLQAdminHandler(mockListUC, mockCountUC, mockRetryUC)

	assert.NotNil(t, handler)
}

func TestNewDLQAdminHandler_NilUseCases_Panics(t *testing.T) {
	mockListUC := new(MockListDLQMessagesUseCase)
	mockCountUC := new(MockGetDLQCountUseCase)
	mockRetryUC := new(MockRetryDLQMessageUseCase)

	assert.Panics(t, func() {
		NewDLQAdminHandler(nil, mockCountUC, mockRetryUC)
	})

	assert.Panics(t, func() {
		NewDLQAdminHandler(mockListUC, nil, mockRetryUC)
	})

	assert.Panics(t, func() {
		NewDLQAdminHandler(mockListUC, mockCountUC, nil)
	})
}

func TestDLQAdminHandler_ListDLQMessages_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockListUC := new(MockListDLQMessagesUseCase)
	mockCountUC := new(MockGetDLQCountUseCase)
	mockRetryUC := new(MockRetryDLQMessageUseCase)

	handler := NewDLQAdminHandler(mockListUC, mockCountUC, mockRetryUC)

	messages := []usecase.DLQMessage{
		{
			ID:            uuid.New().String(),
			RoutingKey:    "inventory.stock.reserved",
			Body:          `{"product_id":"123"}`,
			ErrorReason:   "Invalid product",
			FailedAt:      time.Now(),
			RetryCount:    3,
			OriginalQueue: "inventory.events",
		},
	}

	output := &usecase.ListDLQMessagesOutput{
		Messages:   messages,
		TotalCount: 1,
	}

	mockListUC.On("Execute", mock.Anything, 50, 0).Return(output, nil)

	router := gin.Default()
	router.GET("/admin/dlq", handler.ListDLQMessages)

	req, _ := http.NewRequest(http.MethodGet, "/admin/dlq", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response ListDLQMessagesResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, 1, response.TotalCount)
	assert.Len(t, response.Messages, 1)
	assert.Equal(t, messages[0].ID, response.Messages[0].ID)

	mockListUC.AssertExpectations(t)
}

func TestDLQAdminHandler_ListDLQMessages_WithPagination(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockListUC := new(MockListDLQMessagesUseCase)
	mockCountUC := new(MockGetDLQCountUseCase)
	mockRetryUC := new(MockRetryDLQMessageUseCase)

	handler := NewDLQAdminHandler(mockListUC, mockCountUC, mockRetryUC)

	output := &usecase.ListDLQMessagesOutput{
		Messages:   []usecase.DLQMessage{},
		TotalCount: 0,
	}

	mockListUC.On("Execute", mock.Anything, 100, 20).Return(output, nil)

	router := gin.Default()
	router.GET("/admin/dlq", handler.ListDLQMessages)

	req, _ := http.NewRequest(http.MethodGet, "/admin/dlq?limit=100&offset=20", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response ListDLQMessagesResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, 100, response.Limit)
	assert.Equal(t, 20, response.Offset)

	mockListUC.AssertExpectations(t)
}

func TestDLQAdminHandler_GetDLQCount_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockListUC := new(MockListDLQMessagesUseCase)
	mockCountUC := new(MockGetDLQCountUseCase)
	mockRetryUC := new(MockRetryDLQMessageUseCase)

	handler := NewDLQAdminHandler(mockListUC, mockCountUC, mockRetryUC)

	mockCountUC.On("Execute", mock.Anything).Return(5, nil)

	router := gin.Default()
	router.GET("/admin/dlq/count", handler.GetDLQCount)

	req, _ := http.NewRequest(http.MethodGet, "/admin/dlq/count", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response GetDLQCountResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, 5, response.Count)
	assert.False(t, response.HasWarning)

	mockCountUC.AssertExpectations(t)
}

func TestDLQAdminHandler_GetDLQCount_WithWarning(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockListUC := new(MockListDLQMessagesUseCase)
	mockCountUC := new(MockGetDLQCountUseCase)
	mockRetryUC := new(MockRetryDLQMessageUseCase)

	handler := NewDLQAdminHandler(mockListUC, mockCountUC, mockRetryUC)

	mockCountUC.On("Execute", mock.Anything).Return(15, nil)

	router := gin.Default()
	router.GET("/admin/dlq/count", handler.GetDLQCount)

	req, _ := http.NewRequest(http.MethodGet, "/admin/dlq/count", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response GetDLQCountResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, 15, response.Count)
	assert.True(t, response.HasWarning)
	assert.NotEmpty(t, response.WarningMessage)

	mockCountUC.AssertExpectations(t)
}

func TestDLQAdminHandler_RetryMessage_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockListUC := new(MockListDLQMessagesUseCase)
	mockCountUC := new(MockGetDLQCountUseCase)
	mockRetryUC := new(MockRetryDLQMessageUseCase)

	handler := NewDLQAdminHandler(mockListUC, mockCountUC, mockRetryUC)

	messageID := uuid.New().String()
	output := &usecase.RetryDLQMessageOutput{
		MessageID: messageID,
		Retried:   true,
		Message:   "Message republished",
	}

	mockRetryUC.On("Execute", mock.Anything, usecase.RetryDLQMessageInput{MessageID: messageID}).Return(output, nil)

	router := gin.Default()
	router.POST("/admin/dlq/:id/retry", handler.RetryMessage)

	req, _ := http.NewRequest(http.MethodPost, "/admin/dlq/"+messageID+"/retry", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response RetryMessageResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.True(t, response.Success)
	assert.Equal(t, messageID, response.MessageID)

	mockRetryUC.AssertExpectations(t)
}

func TestDLQAdminHandler_RetryMessage_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockListUC := new(MockListDLQMessagesUseCase)
	mockCountUC := new(MockGetDLQCountUseCase)
	mockRetryUC := new(MockRetryDLQMessageUseCase)

	handler := NewDLQAdminHandler(mockListUC, mockCountUC, mockRetryUC)

	output := &usecase.RetryDLQMessageOutput{
		MessageID: "invalid-id",
		Retried:   false,
		Message:   "Invalid message ID format",
	}

	mockRetryUC.On("Execute", mock.Anything, usecase.RetryDLQMessageInput{MessageID: "invalid-id"}).Return(output, nil)

	router := gin.Default()
	router.POST("/admin/dlq/:id/retry", handler.RetryMessage)

	req, _ := http.NewRequest(http.MethodPost, "/admin/dlq/invalid-id/retry", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response RetryMessageResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.False(t, response.Success)

	mockRetryUC.AssertExpectations(t)
}
