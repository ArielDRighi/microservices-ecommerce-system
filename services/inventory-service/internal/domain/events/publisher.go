package events

import "context"

// Publisher defines the interface for publishing inventory events to RabbitMQ.
// This interface is defined on the consumer side (domain layer) following Go best practices.
type Publisher interface {
	// PublishStockReserved publishes a stock reserved event
	PublishStockReserved(ctx context.Context, event StockReservedEvent) error

	// PublishStockConfirmed publishes a stock confirmed event
	PublishStockConfirmed(ctx context.Context, event StockConfirmedEvent) error

	// PublishStockReleased publishes a stock released event
	PublishStockReleased(ctx context.Context, event StockReleasedEvent) error

	// PublishStockFailed publishes a stock operation failure event
	PublishStockFailed(ctx context.Context, event StockFailedEvent) error

	// PublishStockDepleted publishes a stock depleted event (when quantity reaches 0)
	PublishStockDepleted(ctx context.Context, event StockDepletedEvent) error

	// Close closes the publisher and releases resources
	Close() error
}
