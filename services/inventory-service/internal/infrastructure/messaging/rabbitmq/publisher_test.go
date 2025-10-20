package rabbitmq_test

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"

	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/domain/events"
	"github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/infrastructure/messaging/rabbitmq"
)

// TestRabbitMQPublisher_Integration tests the RabbitMQ publisher with a real RabbitMQ instance
func TestRabbitMQPublisher_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}

	ctx := context.Background()

	// Start RabbitMQ container
	rabbitmqC, amqpURL := startRabbitMQContainer(t, ctx)
	defer func() {
		if err := rabbitmqC.Terminate(ctx); err != nil {
			t.Logf("failed to terminate container: %s", err)
		}
	}()

	// Create publisher
	config := rabbitmq.PublisherConfig{
		URL:          amqpURL,
		Exchange:     events.ExchangeInventoryEvents,
		ExchangeType: "topic",
		MaxRetries:   3,
		RetryDelay:   100 * time.Millisecond,
	}

	publisher, err := rabbitmq.NewPublisher(config)
	require.NoError(t, err, "Failed to create publisher")
	defer func() {
		err := publisher.Close()
		assert.NoError(t, err, "Failed to close publisher")
	}()

	t.Run("PublishStockReserved", func(t *testing.T) {
		// Setup queue and consumer BEFORE publishing
		queueName := "test-queue-reserved-" + uuid.New().String()
		msgs := setupQueueAndConsumer(t, amqpURL, queueName, events.RoutingKeyStockReserved)

		// Publish event
		event := createStockReservedEvent()
		err := publisher.PublishStockReserved(ctx, event)
		assert.NoError(t, err, "Failed to publish stock reserved event")

		// Consume and verify message
		select {
		case msg := <-msgs:
			var receivedEvent events.StockReservedEvent
			err = json.Unmarshal(msg.Body, &receivedEvent)
			require.NoError(t, err, "Failed to unmarshal event")

			assert.Equal(t, event.EventID, receivedEvent.EventID)
			assert.Equal(t, event.EventType, receivedEvent.EventType)
			assert.Equal(t, event.Payload.ReservationID, receivedEvent.Payload.ReservationID)
			assert.Equal(t, event.Payload.ProductID, receivedEvent.Payload.ProductID)
			assert.Equal(t, event.Payload.Quantity, receivedEvent.Payload.Quantity)
		case <-time.After(5 * time.Second):
			t.Fatal("Message not received within timeout")
		}
	})

	t.Run("PublishStockConfirmed", func(t *testing.T) {
		queueName := "test-queue-confirmed-" + uuid.New().String()
		msgs := setupQueueAndConsumer(t, amqpURL, queueName, events.RoutingKeyStockConfirmed)

		event := createStockConfirmedEvent()
		err := publisher.PublishStockConfirmed(ctx, event)
		assert.NoError(t, err, "Failed to publish stock confirmed event")

		select {
		case msg := <-msgs:
			var receivedEvent events.StockConfirmedEvent
			err = json.Unmarshal(msg.Body, &receivedEvent)
			require.NoError(t, err, "Failed to unmarshal event")

			assert.Equal(t, event.EventID, receivedEvent.EventID)
			assert.Equal(t, event.Payload.ReservationID, receivedEvent.Payload.ReservationID)
		case <-time.After(5 * time.Second):
			t.Fatal("Message not received within timeout")
		}
	})

	t.Run("PublishStockReleased", func(t *testing.T) {
		queueName := "test-queue-released-" + uuid.New().String()
		msgs := setupQueueAndConsumer(t, amqpURL, queueName, events.RoutingKeyStockReleased)

		event := createStockReleasedEvent()
		err := publisher.PublishStockReleased(ctx, event)
		assert.NoError(t, err, "Failed to publish stock released event")

		select {
		case msg := <-msgs:
			var receivedEvent events.StockReleasedEvent
			err = json.Unmarshal(msg.Body, &receivedEvent)
			require.NoError(t, err, "Failed to unmarshal event")

			assert.Equal(t, event.EventID, receivedEvent.EventID)
			assert.Equal(t, event.Payload.Reason, receivedEvent.Payload.Reason)
		case <-time.After(5 * time.Second):
			t.Fatal("Message not received within timeout")
		}
	})

	t.Run("PublishStockFailed", func(t *testing.T) {
		queueName := "test-queue-failed-" + uuid.New().String()
		msgs := setupQueueAndConsumer(t, amqpURL, queueName, events.RoutingKeyStockFailed)

		event := createStockFailedEvent()
		err := publisher.PublishStockFailed(ctx, event)
		assert.NoError(t, err, "Failed to publish stock failed event")

		select {
		case msg := <-msgs:
			var receivedEvent events.StockFailedEvent
			err = json.Unmarshal(msg.Body, &receivedEvent)
			require.NoError(t, err, "Failed to unmarshal event")

			assert.Equal(t, event.EventID, receivedEvent.EventID)
			assert.Equal(t, event.Payload.ErrorCode, receivedEvent.Payload.ErrorCode)
		case <-time.After(5 * time.Second):
			t.Fatal("Message not received within timeout")
		}
	})

	t.Run("PublishWithContextCancellation", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		cancel() // Cancel immediately

		event := createStockReservedEvent()
		err := publisher.PublishStockReserved(ctx, event)

		// Should return error due to cancelled context
		assert.Error(t, err, "Expected error with cancelled context")
	})

	t.Run("Publish_Idempotency", func(t *testing.T) {
		// Publishing same event twice should succeed (idempotency is handled by consumer)
		event := createStockReservedEvent()

		err1 := publisher.PublishStockReserved(ctx, event)
		assert.NoError(t, err1)

		err2 := publisher.PublishStockReserved(ctx, event)
		assert.NoError(t, err2)
	})
}

// Helper functions

func startRabbitMQContainer(t *testing.T, ctx context.Context) (testcontainers.Container, string) {
	t.Helper()

	req := testcontainers.ContainerRequest{
		Image:        "rabbitmq:3.13-management-alpine",
		ExposedPorts: []string{"5672/tcp", "15672/tcp"},
		Env: map[string]string{
			"RABBITMQ_DEFAULT_USER": "test",
			"RABBITMQ_DEFAULT_PASS": "test",
		},
		WaitingFor: wait.ForListeningPort("5672/tcp").WithStartupTimeout(60 * time.Second),
	}

	rabbitmqC, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	require.NoError(t, err, "Failed to start RabbitMQ container")

	host, err := rabbitmqC.Host(ctx)
	require.NoError(t, err, "Failed to get container host")

	port, err := rabbitmqC.MappedPort(ctx, "5672")
	require.NoError(t, err, "Failed to get container port")

	amqpURL := "amqp://test:test@" + host + ":" + port.Port() + "/"

	// Wait a bit for RabbitMQ to be fully ready
	time.Sleep(2 * time.Second)

	return rabbitmqC, amqpURL
}

func setupQueueAndConsumer(t *testing.T, amqpURL, queueName, routingKey string) <-chan amqp.Delivery {
	t.Helper()

	conn, err := amqp.Dial(amqpURL)
	require.NoError(t, err, "Failed to connect to RabbitMQ")

	ch, err := conn.Channel()
	require.NoError(t, err, "Failed to open channel")

	// Declare exchange
	err = ch.ExchangeDeclare(
		events.ExchangeInventoryEvents,
		"topic",
		true,
		false,
		false,
		false,
		nil,
	)
	require.NoError(t, err, "Failed to declare exchange")

	// Declare queue
	q, err := ch.QueueDeclare(
		queueName,
		true,  // durable
		false, // auto-delete
		false, // exclusive
		false, // no-wait
		nil,   // arguments
	)
	require.NoError(t, err, "Failed to declare queue")

	// Bind queue to exchange
	err = ch.QueueBind(
		q.Name,
		routingKey,
		events.ExchangeInventoryEvents,
		false,
		nil,
	)
	require.NoError(t, err, "Failed to bind queue")

	// Start consuming
	msgs, err := ch.Consume(
		q.Name,
		"",
		true,  // auto-ack
		false, // exclusive
		false, // no-local
		false, // no-wait
		nil,   // args
	)
	require.NoError(t, err, "Failed to start consuming")

	return msgs
}

func createStockReservedEvent() events.StockReservedEvent {
	now := time.Now()
	expiresAt := now.Add(15 * time.Minute)

	return events.StockReservedEvent{
		BaseEvent: events.BaseEvent{
			EventID:   uuid.New().String(),
			EventType: events.RoutingKeyStockReserved,
			Timestamp: now.Format(time.RFC3339),
			Version:   events.EventVersion,
			Source:    events.SourceInventoryService,
		},
		Payload: events.StockReservedPayload{
			ReservationID: uuid.New().String(),
			ProductID:     "prod-12345",
			Quantity:      5,
			OrderID:       uuid.New().String(),
			UserID:        uuid.New().String(),
			ExpiresAt:     expiresAt,
			ReservedAt:    now,
		},
	}
}

func createStockConfirmedEvent() events.StockConfirmedEvent {
	now := time.Now()

	return events.StockConfirmedEvent{
		BaseEvent: events.BaseEvent{
			EventID:   uuid.New().String(),
			EventType: events.RoutingKeyStockConfirmed,
			Timestamp: now.Format(time.RFC3339),
			Version:   events.EventVersion,
			Source:    events.SourceInventoryService,
		},
		Payload: events.StockConfirmedPayload{
			ReservationID: uuid.New().String(),
			ProductID:     "prod-12345",
			Quantity:      5,
			OrderID:       uuid.New().String(),
			UserID:        uuid.New().String(),
			ConfirmedAt:   now,
		},
	}
}

func createStockReleasedEvent() events.StockReleasedEvent {
	now := time.Now()

	return events.StockReleasedEvent{
		BaseEvent: events.BaseEvent{
			EventID:   uuid.New().String(),
			EventType: events.RoutingKeyStockReleased,
			Timestamp: now.Format(time.RFC3339),
			Version:   events.EventVersion,
			Source:    events.SourceInventoryService,
		},
		Payload: events.StockReleasedPayload{
			ReservationID: uuid.New().String(),
			ProductID:     "prod-12345",
			Quantity:      5,
			OrderID:       uuid.New().String(),
			UserID:        uuid.New().String(),
			Reason:        "order_cancelled",
			ReleasedAt:    now,
		},
	}
}

func createStockFailedEvent() events.StockFailedEvent {
	now := time.Now()
	quantity := 10

	return events.StockFailedEvent{
		BaseEvent: events.BaseEvent{
			EventID:   uuid.New().String(),
			EventType: events.RoutingKeyStockFailed,
			Timestamp: now.Format(time.RFC3339),
			Version:   events.EventVersion,
			Source:    events.SourceInventoryService,
		},
		Payload: events.StockFailedPayload{
			OperationType: "reserve",
			ProductID:     "prod-12345",
			Quantity:      &quantity,
			OrderID:       uuid.New().String(),
			UserID:        uuid.New().String(),
			ErrorCode:     "INSUFFICIENT_STOCK",
			ErrorMessage:  "Only 5 units available, requested 10",
			FailedAt:      now,
		},
	}
}
