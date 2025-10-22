package usecase

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockDLQRepository is a mock implementation of DLQRepository
type MockDLQRepository struct {
	mock.Mock
}

func (m *MockDLQRepository) ListMessages(ctx context.Context, limit int, offset int) ([]DLQMessage, int, error) {
	args := m.Called(ctx, limit, offset)
	return args.Get(0).([]DLQMessage), args.Int(1), args.Error(2)
}

func (m *MockDLQRepository) GetMessage(ctx context.Context, messageID string) (*DLQMessage, error) {
	args := m.Called(ctx, messageID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*DLQMessage), args.Error(1)
}

func (m *MockDLQRepository) DeleteMessage(ctx context.Context, messageID string) error {
	args := m.Called(ctx, messageID)
	return args.Error(0)
}

func (m *MockDLQRepository) RetryMessage(ctx context.Context, messageID string) error {
	args := m.Called(ctx, messageID)
	return args.Error(0)
}

func (m *MockDLQRepository) GetCount(ctx context.Context) (int, error) {
	args := m.Called(ctx)
	return args.Int(0), args.Error(1)
}

// Tests for ListDLQMessagesUseCase

func TestNewListDLQMessagesUseCase(t *testing.T) {
	mockRepo := new(MockDLQRepository)
	useCase := NewListDLQMessagesUseCase(mockRepo)

	assert.NotNil(t, useCase)
	assert.Equal(t, mockRepo, useCase.dlqRepo)
}

func TestNewListDLQMessagesUseCase_NilRepo_Panics(t *testing.T) {
	assert.Panics(t, func() {
		NewListDLQMessagesUseCase(nil)
	})
}

func TestListDLQMessagesUseCase_Execute_Success(t *testing.T) {
	mockRepo := new(MockDLQRepository)
	useCase := NewListDLQMessagesUseCase(mockRepo)

	messages := []DLQMessage{
		{
			ID:            uuid.New().String(),
			RoutingKey:    "inventory.stock.reserved",
			Body:          `{"product_id":"123"}`,
			ErrorReason:   "Invalid product ID",
			FailedAt:      time.Now(),
			RetryCount:    3,
			OriginalQueue: "inventory.events",
		},
		{
			ID:            uuid.New().String(),
			RoutingKey:    "inventory.stock.confirmed",
			Body:          `{"order_id":"456"}`,
			ErrorReason:   "Database connection timeout",
			FailedAt:      time.Now(),
			RetryCount:    5,
			OriginalQueue: "inventory.events",
		},
	}

	mockRepo.On("ListMessages", mock.Anything, 50, 0).Return(messages, 2, nil)

	output, err := useCase.Execute(context.Background(), 50, 0)

	assert.NoError(t, err)
	assert.NotNil(t, output)
	assert.Equal(t, 2, output.TotalCount)
	assert.Len(t, output.Messages, 2)
	assert.Equal(t, messages[0].ID, output.Messages[0].ID)
	mockRepo.AssertExpectations(t)
}

func TestListDLQMessagesUseCase_Execute_DefaultLimit(t *testing.T) {
	mockRepo := new(MockDLQRepository)
	useCase := NewListDLQMessagesUseCase(mockRepo)

	messages := []DLQMessage{}
	mockRepo.On("ListMessages", mock.Anything, 50, 0).Return(messages, 0, nil)

	// Pass 0 as limit, should default to 50
	output, err := useCase.Execute(context.Background(), 0, 0)

	assert.NoError(t, err)
	assert.NotNil(t, output)
	assert.Equal(t, 0, output.TotalCount)
	mockRepo.AssertExpectations(t)
}

func TestListDLQMessagesUseCase_Execute_MaxLimitCap(t *testing.T) {
	mockRepo := new(MockDLQRepository)
	useCase := NewListDLQMessagesUseCase(mockRepo)

	messages := []DLQMessage{}
	mockRepo.On("ListMessages", mock.Anything, 500, 0).Return(messages, 0, nil)

	// Pass 1000 as limit, should cap to 500
	output, err := useCase.Execute(context.Background(), 1000, 0)

	assert.NoError(t, err)
	assert.NotNil(t, output)
	mockRepo.AssertExpectations(t)
}

func TestListDLQMessagesUseCase_Execute_NegativeOffset(t *testing.T) {
	mockRepo := new(MockDLQRepository)
	useCase := NewListDLQMessagesUseCase(mockRepo)

	messages := []DLQMessage{}
	mockRepo.On("ListMessages", mock.Anything, 50, 0).Return(messages, 0, nil)

	// Pass negative offset, should default to 0
	output, err := useCase.Execute(context.Background(), 50, -10)

	assert.NoError(t, err)
	assert.NotNil(t, output)
	mockRepo.AssertExpectations(t)
}

// Tests for GetDLQCountUseCase

func TestNewGetDLQCountUseCase(t *testing.T) {
	mockRepo := new(MockDLQRepository)
	useCase := NewGetDLQCountUseCase(mockRepo)

	assert.NotNil(t, useCase)
	assert.Equal(t, mockRepo, useCase.dlqRepo)
}

func TestNewGetDLQCountUseCase_NilRepo_Panics(t *testing.T) {
	assert.Panics(t, func() {
		NewGetDLQCountUseCase(nil)
	})
}

func TestGetDLQCountUseCase_Execute_Success(t *testing.T) {
	mockRepo := new(MockDLQRepository)
	useCase := NewGetDLQCountUseCase(mockRepo)

	mockRepo.On("GetCount", mock.Anything).Return(15, nil)

	count, err := useCase.Execute(context.Background())

	assert.NoError(t, err)
	assert.Equal(t, 15, count)
	mockRepo.AssertExpectations(t)
}

func TestGetDLQCountUseCase_Execute_Zero(t *testing.T) {
	mockRepo := new(MockDLQRepository)
	useCase := NewGetDLQCountUseCase(mockRepo)

	mockRepo.On("GetCount", mock.Anything).Return(0, nil)

	count, err := useCase.Execute(context.Background())

	assert.NoError(t, err)
	assert.Equal(t, 0, count)
	mockRepo.AssertExpectations(t)
}

// Tests for RetryDLQMessageUseCase

func TestNewRetryDLQMessageUseCase(t *testing.T) {
	mockRepo := new(MockDLQRepository)
	useCase := NewRetryDLQMessageUseCase(mockRepo)

	assert.NotNil(t, useCase)
	assert.Equal(t, mockRepo, useCase.dlqRepo)
}

func TestNewRetryDLQMessageUseCase_NilRepo_Panics(t *testing.T) {
	assert.Panics(t, func() {
		NewRetryDLQMessageUseCase(nil)
	})
}

func TestRetryDLQMessageUseCase_Execute_Success(t *testing.T) {
	mockRepo := new(MockDLQRepository)
	useCase := NewRetryDLQMessageUseCase(mockRepo)

	messageID := uuid.New().String()
	message := &DLQMessage{
		ID:            messageID,
		RoutingKey:    "inventory.stock.reserved",
		Body:          `{"product_id":"123"}`,
		ErrorReason:   "Temporary network error",
		FailedAt:      time.Now(),
		RetryCount:    2,
		OriginalQueue: "inventory.events",
	}

	mockRepo.On("GetMessage", mock.Anything, messageID).Return(message, nil)
	mockRepo.On("RetryMessage", mock.Anything, messageID).Return(nil)

	input := RetryDLQMessageInput{MessageID: messageID}
	output, err := useCase.Execute(context.Background(), input)

	assert.NoError(t, err)
	assert.NotNil(t, output)
	assert.True(t, output.Retried)
	assert.Equal(t, messageID, output.MessageID)
	assert.Contains(t, output.Message, "republished")
	mockRepo.AssertExpectations(t)
}

func TestRetryDLQMessageUseCase_Execute_InvalidID(t *testing.T) {
	mockRepo := new(MockDLQRepository)
	useCase := NewRetryDLQMessageUseCase(mockRepo)

	input := RetryDLQMessageInput{MessageID: "invalid-uuid"}
	output, err := useCase.Execute(context.Background(), input)

	assert.NoError(t, err)
	assert.NotNil(t, output)
	assert.False(t, output.Retried)
	assert.Contains(t, output.Message, "Invalid message ID")
	mockRepo.AssertNotCalled(t, "GetMessage")
	mockRepo.AssertNotCalled(t, "RetryMessage")
}

func TestRetryDLQMessageUseCase_Execute_MessageNotFound(t *testing.T) {
	mockRepo := new(MockDLQRepository)
	useCase := NewRetryDLQMessageUseCase(mockRepo)

	messageID := uuid.New().String()
	mockRepo.On("GetMessage", mock.Anything, messageID).Return(nil, assert.AnError)

	input := RetryDLQMessageInput{MessageID: messageID}
	output, err := useCase.Execute(context.Background(), input)

	assert.NoError(t, err)
	assert.NotNil(t, output)
	assert.False(t, output.Retried)
	assert.Contains(t, output.Message, "not found")
	mockRepo.AssertExpectations(t)
	mockRepo.AssertNotCalled(t, "RetryMessage")
}
