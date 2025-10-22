package usecase

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// DLQMessage represents a message in the Dead Letter Queue
type DLQMessage struct {
	ID            string
	RoutingKey    string
	Body          string
	ErrorReason   string
	FailedAt      time.Time
	RetryCount    int
	OriginalQueue string
}

// ListDLQMessagesOutput represents the output of listing DLQ messages
type ListDLQMessagesOutput struct {
	Messages   []DLQMessage
	TotalCount int
}

// DLQRepository interface for accessing dead letter queue
type DLQRepository interface {
	ListMessages(ctx context.Context, limit int, offset int) ([]DLQMessage, int, error)
	GetMessage(ctx context.Context, messageID string) (*DLQMessage, error)
	DeleteMessage(ctx context.Context, messageID string) error
	RetryMessage(ctx context.Context, messageID string) error
	GetCount(ctx context.Context) (int, error)
}

// ListDLQMessagesUseCase handles listing messages in the Dead Letter Queue
type ListDLQMessagesUseCase struct {
	dlqRepo DLQRepository
}

// NewListDLQMessagesUseCase creates a new instance
func NewListDLQMessagesUseCase(dlqRepo DLQRepository) *ListDLQMessagesUseCase {
	if dlqRepo == nil {
		panic("dlqRepo cannot be nil")
	}

	return &ListDLQMessagesUseCase{
		dlqRepo: dlqRepo,
	}
}

// Execute lists messages from the DLQ with pagination
func (uc *ListDLQMessagesUseCase) Execute(ctx context.Context, limit int, offset int) (*ListDLQMessagesOutput, error) {
	// Validate pagination params
	if limit <= 0 {
		limit = 50 // default
	}
	if limit > 500 {
		limit = 500 // max
	}
	if offset < 0 {
		offset = 0
	}

	messages, total, err := uc.dlqRepo.ListMessages(ctx, limit, offset)
	if err != nil {
		return nil, err
	}

	return &ListDLQMessagesOutput{
		Messages:   messages,
		TotalCount: total,
	}, nil
}

// GetDLQCountUseCase handles getting the count of messages in DLQ
type GetDLQCountUseCase struct {
	dlqRepo DLQRepository
}

// NewGetDLQCountUseCase creates a new instance
func NewGetDLQCountUseCase(dlqRepo DLQRepository) *GetDLQCountUseCase {
	if dlqRepo == nil {
		panic("dlqRepo cannot be nil")
	}

	return &GetDLQCountUseCase{
		dlqRepo: dlqRepo,
	}
}

// Execute returns the current count of messages in DLQ
func (uc *GetDLQCountUseCase) Execute(ctx context.Context) (int, error) {
	return uc.dlqRepo.GetCount(ctx)
}

// RetryDLQMessageInput represents input for retrying a DLQ message
type RetryDLQMessageInput struct {
	MessageID string
}

// RetryDLQMessageOutput represents output after retrying
type RetryDLQMessageOutput struct {
	MessageID string
	Retried   bool
	Message   string
}

// RetryDLQMessageUseCase handles retrying a message from DLQ
type RetryDLQMessageUseCase struct {
	dlqRepo DLQRepository
}

// NewRetryDLQMessageUseCase creates a new instance
func NewRetryDLQMessageUseCase(dlqRepo DLQRepository) *RetryDLQMessageUseCase {
	if dlqRepo == nil {
		panic("dlqRepo cannot be nil")
	}

	return &RetryDLQMessageUseCase{
		dlqRepo: dlqRepo,
	}
}

// Execute retries a specific message from the DLQ
func (uc *RetryDLQMessageUseCase) Execute(ctx context.Context, input RetryDLQMessageInput) (*RetryDLQMessageOutput, error) {
	// Validate message ID is a valid UUID
	if _, err := uuid.Parse(input.MessageID); err != nil {
		return &RetryDLQMessageOutput{
			MessageID: input.MessageID,
			Retried:   false,
			Message:   "Invalid message ID format",
		}, nil
	}

	// Check if message exists
	message, err := uc.dlqRepo.GetMessage(ctx, input.MessageID)
	if err != nil {
		return &RetryDLQMessageOutput{
			MessageID: input.MessageID,
			Retried:   false,
			Message:   "Message not found in DLQ",
		}, nil
	}

	// Retry the message (republish to original queue)
	if err := uc.dlqRepo.RetryMessage(ctx, input.MessageID); err != nil {
		return nil, err
	}

	return &RetryDLQMessageOutput{
		MessageID: message.ID,
		Retried:   true,
		Message:   "Message republished to original queue",
	}, nil
}
