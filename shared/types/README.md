# @microservices-ecommerce/shared-types

Shared event types and schemas for the microservices-ecommerce-system project.

**Epic 2.5 - Task T2.5.2: Event Schema Definitions**

## 📦 Installation

```bash
# From shared/types directory
npm install

# Build the package
npm run build
```

## 🎯 Purpose

This package provides:
- ✅ **TypeScript types** for all events (compile-time safety)
- ✅ **Zod schemas** for runtime validation
- ✅ **Validation helpers** for safe parsing
- ✅ **Constants** for routing keys, exchanges, and queues
- ✅ **Documentation** with JSON examples

## 📚 Documentation

See [EVENT_SCHEMAS.md](../../docs/EVENT_SCHEMAS.md) for complete documentation with JSON examples.

## 🚀 Usage

### TypeScript/NestJS

```typescript
import {
  StockReservedEvent,
  validateInventoryEvent,
  INVENTORY_ROUTING_KEYS,
  EXCHANGES,
} from '@microservices-ecommerce/shared-types';

// Validate incoming event
const event = validateInventoryEvent(rawData) as StockReservedEvent;

// Type-safe access
console.log(event.payload.reservationId);

// Use routing key constants
console.log(INVENTORY_ROUTING_KEYS.STOCK_RESERVED); // "inventory.stock.reserved"
```

### Safe Validation

```typescript
import { safeValidateInventoryEvent } from '@microservices-ecommerce/shared-types';

const result = safeValidateInventoryEvent(rawData);

if (result.success) {
  // Event is valid
  console.log('Valid event:', result.data);
} else {
  // Event is invalid
  console.error('Validation errors:', result.error.errors);
}
```

### Go

```go
// Define matching structs in Go
type StockReservedEvent struct {
    EventID       string    `json:"eventId"`
    EventType     string    `json:"eventType"`
    Timestamp     time.Time `json:"timestamp"`
    Version       string    `json:"version"`
    CorrelationID *string   `json:"correlationId,omitempty"`
    Source        string    `json:"source"`
    Payload       struct {
        ReservationID string    `json:"reservationId"`
        ProductID     string    `json:"productId"`
        Quantity      int       `json:"quantity"`
        OrderID       string    `json:"orderId"`
        UserID        string    `json:"userId"`
        ExpiresAt     time.Time `json:"expiresAt"`
        ReservedAt    time.Time `json:"reservedAt"`
    } `json:"payload"`
}

// Unmarshal JSON
var event StockReservedEvent
err := json.Unmarshal(body, &event)
```

## 📋 Available Types

### Inventory Events

- `StockReservedEvent` - Stock successfully reserved
- `StockConfirmedEvent` - Reservation confirmed
- `StockReleasedEvent` - Reservation released/cancelled
- `StockFailedEvent` - Stock operation failed

### Order Events

- `OrderCreatedEvent` - New order created
- `OrderCancelledEvent` - Order cancelled
- `OrderFailedEvent` - Order processing failed
- `OrderConfirmedEvent` - Order successfully confirmed

## 🔑 Constants

```typescript
// Routing Keys
INVENTORY_ROUTING_KEYS.STOCK_RESERVED    // "inventory.stock.reserved"
INVENTORY_ROUTING_KEYS.STOCK_CONFIRMED   // "inventory.stock.confirmed"
INVENTORY_ROUTING_KEYS.STOCK_RELEASED    // "inventory.stock.released"
INVENTORY_ROUTING_KEYS.STOCK_FAILED      // "inventory.stock.failed"

ORDER_ROUTING_KEYS.ORDER_CREATED         // "order.created"
ORDER_ROUTING_KEYS.ORDER_CANCELLED       // "order.cancelled"
ORDER_ROUTING_KEYS.ORDER_FAILED          // "order.failed"
ORDER_ROUTING_KEYS.ORDER_CONFIRMED       // "order.confirmed"

// Exchanges
EXCHANGES.INVENTORY_EVENTS               // "inventory.events"
EXCHANGES.ORDERS_EVENTS                  // "orders.events"

// Queues
QUEUES.ORDERS_INVENTORY_EVENTS           // "orders.inventory_events"
QUEUES.INVENTORY_ORDER_EVENTS            // "inventory.order_events"
```

## 🧪 Testing

```bash
npm test
```

## 🔧 Development

```bash
# Build
npm run build

# Lint
npm run lint

# Format
npm run format
```

## 📖 References

- [EVENT_SCHEMAS.md](../../docs/EVENT_SCHEMAS.md) - Complete schema documentation
- [RABBITMQ_TOPOLOGY.md](../../docs/RABBITMQ_TOPOLOGY.md) - Infrastructure setup
- [ADR-029](../../docs/adr/029-message-broker-rabbitmq-vs-redis-pubsub.md) - Architecture decision

## 📝 License

MIT
