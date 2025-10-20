package events

import "time"

// BaseEvent represents the common structure for all events
type BaseEvent struct {
	EventID       string  `json:"eventId"`
	EventType     string  `json:"eventType"`
	Timestamp     string  `json:"timestamp"`
	Version       string  `json:"version"`
	CorrelationID *string `json:"correlationId,omitempty"`
	Source        string  `json:"source"`
}

// StockReservedPayload contains the data for a stock reserved event
type StockReservedPayload struct {
	ReservationID string    `json:"reservationId"`
	ProductID     string    `json:"productId"`
	Quantity      int       `json:"quantity"`
	OrderID       string    `json:"orderId"`
	UserID        string    `json:"userId"`
	ExpiresAt     time.Time `json:"expiresAt"`
	ReservedAt    time.Time `json:"reservedAt"`
}

// StockReservedEvent represents a stock reservation event
type StockReservedEvent struct {
	BaseEvent
	Payload StockReservedPayload `json:"payload"`
}

// StockConfirmedPayload contains the data for a stock confirmed event
type StockConfirmedPayload struct {
	ReservationID string    `json:"reservationId"`
	ProductID     string    `json:"productId"`
	Quantity      int       `json:"quantity"`
	OrderID       string    `json:"orderId"`
	UserID        string    `json:"userId"`
	ConfirmedAt   time.Time `json:"confirmedAt"`
}

// StockConfirmedEvent represents a stock confirmation event
type StockConfirmedEvent struct {
	BaseEvent
	Payload StockConfirmedPayload `json:"payload"`
}

// StockReleasedPayload contains the data for a stock released event
type StockReleasedPayload struct {
	ReservationID string    `json:"reservationId"`
	ProductID     string    `json:"productId"`
	Quantity      int       `json:"quantity"`
	OrderID       string    `json:"orderId"`
	UserID        string    `json:"userId"`
	Reason        string    `json:"reason"` // "order_cancelled", "reservation_expired", "manual_release"
	ReleasedAt    time.Time `json:"releasedAt"`
}

// StockReleasedEvent represents a stock release event
type StockReleasedEvent struct {
	BaseEvent
	Payload StockReleasedPayload `json:"payload"`
}

// StockFailedPayload contains the data for a stock operation failure event
type StockFailedPayload struct {
	OperationType string    `json:"operationType"` // "reserve", "confirm", "release"
	ProductID     string    `json:"productId"`
	Quantity      *int      `json:"quantity,omitempty"`
	OrderID       string    `json:"orderId"`
	UserID        string    `json:"userId"`
	ReservationID *string   `json:"reservationId,omitempty"`
	ErrorCode     string    `json:"errorCode"`
	ErrorMessage  string    `json:"errorMessage"`
	FailedAt      time.Time `json:"failedAt"`
}

// StockFailedEvent represents a stock operation failure event
type StockFailedEvent struct {
	BaseEvent
	Payload StockFailedPayload `json:"payload"`
}

// Event routing keys
const (
	RoutingKeyStockReserved  = "inventory.stock.reserved"
	RoutingKeyStockConfirmed = "inventory.stock.confirmed"
	RoutingKeyStockReleased  = "inventory.stock.released"
	RoutingKeyStockFailed    = "inventory.stock.failed"
)

// Exchange name
const ExchangeInventoryEvents = "inventory.events"

// Event source
const SourceInventoryService = "inventory-service"

// Event version
const EventVersion = "1.0.0"
