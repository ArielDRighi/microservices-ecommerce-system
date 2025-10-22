package stub

import (
	"context"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/application/usecase"
)

// DLQRepositoryStub is a stub implementation for development/testing
type DLQRepositoryStub struct{}

// NewDLQRepositoryStub creates a new stub instance
func NewDLQRepositoryStub() *DLQRepositoryStub {
	return &DLQRepositoryStub{}
}

// ListMessages returns empty list (stub)
func (r *DLQRepositoryStub) ListMessages(ctx context.Context, limit int, offset int) ([]usecase.DLQMessage, int, error) {
	return []usecase.DLQMessage{}, 0, nil
}

// GetMessage returns nil (not found in stub)
func (r *DLQRepositoryStub) GetMessage(ctx context.Context, messageID string) (*usecase.DLQMessage, error) {
	return nil, nil
}

// DeleteMessage does nothing (stub)
func (r *DLQRepositoryStub) DeleteMessage(ctx context.Context, messageID string) error {
	return nil
}

// RetryMessage does nothing (stub)
func (r *DLQRepositoryStub) RetryMessage(ctx context.Context, messageID string) error {
	return nil
}

// GetCount returns 0 (stub)
func (r *DLQRepositoryStub) GetCount(ctx context.Context) (int, error) {
	return 0, nil
}
