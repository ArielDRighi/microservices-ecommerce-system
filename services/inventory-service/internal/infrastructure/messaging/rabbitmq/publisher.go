package rabbitmq

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/events"
)

// PublisherConfig holds the configuration for the RabbitMQ publisher
type PublisherConfig struct {
	URL          string        // RabbitMQ connection URL
	Exchange     string        // Exchange name
	ExchangeType string        // Exchange type (topic, fanout, direct)
	MaxRetries   int           // Maximum number of retry attempts
	RetryDelay   time.Duration // Delay between retries
}

// Publisher implements the events.Publisher interface for RabbitMQ
type Publisher struct {
	config  PublisherConfig
	conn    *amqp.Connection
	ch      *amqp.Channel
	metrics *Metrics
}

// NewPublisher creates a new RabbitMQ publisher
func NewPublisher(config PublisherConfig) (*Publisher, error) {
	// Set defaults
	if config.MaxRetries == 0 {
		config.MaxRetries = 3
	}
	if config.RetryDelay == 0 {
		config.RetryDelay = 1 * time.Second
	}
	if config.ExchangeType == "" {
		config.ExchangeType = "topic"
	}

	// Connect to RabbitMQ
	conn, err := amqp.Dial(config.URL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}

	// Open a channel
	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to open channel: %w", err)
	}

	// Declare exchange
	err = ch.ExchangeDeclare(
		config.Exchange,     // name
		config.ExchangeType, // type
		true,                // durable
		false,               // auto-deleted
		false,               // internal
		false,               // no-wait
		nil,                 // arguments
	)
	if err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("failed to declare exchange: %w", err)
	}

	publisher := &Publisher{
		config:  config,
		conn:    conn,
		ch:      ch,
		metrics: NewMetrics(),
	}

	return publisher, nil
}

// PublishStockReserved publishes a stock reserved event
func (p *Publisher) PublishStockReserved(ctx context.Context, event events.StockReservedEvent) error {
	return p.publish(ctx, events.RoutingKeyStockReserved, event)
}

// PublishStockConfirmed publishes a stock confirmed event
func (p *Publisher) PublishStockConfirmed(ctx context.Context, event events.StockConfirmedEvent) error {
	return p.publish(ctx, events.RoutingKeyStockConfirmed, event)
}

// PublishStockReleased publishes a stock released event
func (p *Publisher) PublishStockReleased(ctx context.Context, event events.StockReleasedEvent) error {
	return p.publish(ctx, events.RoutingKeyStockReleased, event)
}

// PublishStockFailed publishes a stock operation failure event
func (p *Publisher) PublishStockFailed(ctx context.Context, event events.StockFailedEvent) error {
	return p.publish(ctx, events.RoutingKeyStockFailed, event)
}

// publish is the internal method that handles the actual publishing with retry logic
func (p *Publisher) publish(ctx context.Context, routingKey string, event interface{}) error {
	startTime := time.Now()
	eventType := getEventType(event)

	// Defer duration recording
	defer func() {
		duration := time.Since(startTime).Seconds()
		p.metrics.PublishDuration.WithLabelValues(eventType, routingKey).Observe(duration)
	}()

	// Marshal event to JSON
	body, err := json.Marshal(event)
	if err != nil {
		p.metrics.PublishErrorsTotal.WithLabelValues(eventType, routingKey, "marshal_error").Inc()
		p.metrics.EventsPublishedTotal.WithLabelValues(eventType, routingKey, "failed").Inc()
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	// Prepare AMQP message
	msg := amqp.Publishing{
		ContentType:  "application/json",
		Body:         body,
		DeliveryMode: amqp.Persistent, // Persist messages to disk
		Timestamp:    time.Now(),
	}

	// Publish with retry logic
	var lastErr error
	for attempt := 0; attempt <= p.config.MaxRetries; attempt++ {
		// Check context cancellation before each attempt
		select {
		case <-ctx.Done():
			p.metrics.PublishErrorsTotal.WithLabelValues(eventType, routingKey, "context_cancelled").Inc()
			p.metrics.EventsPublishedTotal.WithLabelValues(eventType, routingKey, "failed").Inc()
			return fmt.Errorf("publish cancelled: %w", ctx.Err())
		default:
		}

		// Record retry attempt if not first attempt
		if attempt > 0 {
			p.metrics.PublishRetriesTotal.WithLabelValues(eventType, routingKey, fmt.Sprintf("%d", attempt)).Inc()
		}

		// Attempt to publish
		err := p.ch.PublishWithContext(
			ctx,
			p.config.Exchange, // exchange
			routingKey,        // routing key
			false,             // mandatory
			false,             // immediate
			msg,
		)

		if err == nil {
			// Success - record metrics
			p.metrics.EventsPublishedTotal.WithLabelValues(eventType, routingKey, "success").Inc()
			return nil
		}

		lastErr = err

		// Don't retry on last attempt
		if attempt < p.config.MaxRetries {
			// Wait before retrying
			select {
			case <-time.After(p.config.RetryDelay):
				// Continue to next attempt
			case <-ctx.Done():
				p.metrics.PublishErrorsTotal.WithLabelValues(eventType, routingKey, "context_cancelled").Inc()
				p.metrics.EventsPublishedTotal.WithLabelValues(eventType, routingKey, "failed").Inc()
				return fmt.Errorf("publish cancelled during retry: %w", ctx.Err())
			}
		}
	}

	// All retries failed - record final error
	p.metrics.PublishErrorsTotal.WithLabelValues(eventType, routingKey, "max_retries_exceeded").Inc()
	p.metrics.EventsPublishedTotal.WithLabelValues(eventType, routingKey, "failed").Inc()
	return fmt.Errorf("failed to publish after %d attempts: %w", p.config.MaxRetries+1, lastErr)
}

// getEventType extracts the event type name from the event struct
func getEventType(event interface{}) string {
	switch event.(type) {
	case events.StockReservedEvent:
		return "stock_reserved"
	case events.StockConfirmedEvent:
		return "stock_confirmed"
	case events.StockReleasedEvent:
		return "stock_released"
	case events.StockFailedEvent:
		return "stock_failed"
	default:
		return "unknown"
	}
}

// Close closes the publisher and releases resources
func (p *Publisher) Close() error {
	var errs []error

	if p.ch != nil {
		if err := p.ch.Close(); err != nil {
			errs = append(errs, fmt.Errorf("failed to close channel: %w", err))
		}
	}

	if p.conn != nil {
		if err := p.conn.Close(); err != nil {
			errs = append(errs, fmt.Errorf("failed to close connection: %w", err))
		}
	}

	if len(errs) > 0 {
		return fmt.Errorf("errors closing publisher: %v", errs)
	}

	return nil
}
