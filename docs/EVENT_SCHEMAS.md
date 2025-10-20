# Event Schemas Documentation

**Epic 2.5 - Task T2.5.2: Definir Schemas de Eventos**

This document provides the complete specification of event schemas used in the microservices-ecommerce-system for asynchronous communication via RabbitMQ.

## Table of Contents

- [Overview](#overview)
- [Base Event Structure](#base-event-structure)
- [Inventory Events](#inventory-events)
  - [Stock Reserved Event](#stock-reserved-event)
  - [Stock Confirmed Event](#stock-confirmed-event)
  - [Stock Released Event](#stock-released-event)
  - [Stock Failed Event](#stock-failed-event)
- [Order Events](#order-events)
  - [Order Created Event](#order-created-event)
  - [Order Cancelled Event](#order-cancelled-event)
  - [Order Failed Event](#order-failed-event)
  - [Order Confirmed Event](#order-confirmed-event)
- [Validation](#validation)
- [Usage Examples](#usage-examples)

---

## Overview

All events follow a standardized structure based on a common `BaseEvent` schema. This ensures consistency across all microservices and simplifies event processing.

**Key Features:**

- ✅ Type-safe with TypeScript
- ✅ Runtime validation with Zod
- ✅ Discriminated unions for pattern matching
- ✅ Correlation IDs for tracing
- ✅ Versioning support

---

## Base Event Structure

All events extend this base structure:

```typescript
{
  eventId: string;          // UUID - Unique identifier for this event
  eventType: string;        // Event type (routing key)
  timestamp: string;        // ISO 8601 datetime
  version: string;          // Schema version (default: "1.0.0")
  correlationId?: string;   // UUID - Optional correlation ID
  source: string;           // Service that emitted the event
  payload: object;          // Event-specific data
}
```

---

## Inventory Events

Events emitted by the **Inventory Service** (Go) and consumed by the **Orders Service** (NestJS).

**Exchange:** `inventory.events` (topic)  
**Queue:** `orders.inventory_events`

---

### Stock Reserved Event

**Routing Key:** `inventory.stock.reserved`

Emitted when stock is successfully reserved for an order.

#### TypeScript Type

```typescript
type StockReservedEvent = {
  eventId: string;
  eventType: "inventory.stock.reserved";
  timestamp: string;
  version: string;
  correlationId?: string;
  source: "inventory-service";
  payload: {
    reservationId: string; // UUID
    productId: string;
    quantity: number; // Positive integer
    orderId: string; // UUID
    userId: string; // UUID
    expiresAt: string; // ISO 8601 datetime
    reservedAt: string; // ISO 8601 datetime
  };
};
```

#### JSON Example

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "eventType": "inventory.stock.reserved",
  "timestamp": "2025-10-20T14:30:00.000Z",
  "version": "1.0.0",
  "correlationId": "660e8400-e29b-41d4-a716-446655440001",
  "source": "inventory-service",
  "payload": {
    "reservationId": "770e8400-e29b-41d4-a716-446655440002",
    "productId": "prod-12345",
    "quantity": 5,
    "orderId": "880e8400-e29b-41d4-a716-446655440003",
    "userId": "990e8400-e29b-41d4-a716-446655440004",
    "expiresAt": "2025-10-20T14:45:00.000Z",
    "reservedAt": "2025-10-20T14:30:00.000Z"
  }
}
```

---

### Stock Confirmed Event

**Routing Key:** `inventory.stock.confirmed`

Emitted when a stock reservation is confirmed (order payment successful).

#### TypeScript Type

```typescript
type StockConfirmedEvent = {
  eventId: string;
  eventType: "inventory.stock.confirmed";
  timestamp: string;
  version: string;
  correlationId?: string;
  source: "inventory-service";
  payload: {
    reservationId: string; // UUID
    productId: string;
    quantity: number; // Positive integer
    orderId: string; // UUID
    userId: string; // UUID
    confirmedAt: string; // ISO 8601 datetime
  };
};
```

#### JSON Example

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440010",
  "eventType": "inventory.stock.confirmed",
  "timestamp": "2025-10-20T14:35:00.000Z",
  "version": "1.0.0",
  "correlationId": "660e8400-e29b-41d4-a716-446655440001",
  "source": "inventory-service",
  "payload": {
    "reservationId": "770e8400-e29b-41d4-a716-446655440002",
    "productId": "prod-12345",
    "quantity": 5,
    "orderId": "880e8400-e29b-41d4-a716-446655440003",
    "userId": "990e8400-e29b-41d4-a716-446655440004",
    "confirmedAt": "2025-10-20T14:35:00.000Z"
  }
}
```

---

### Stock Released Event

**Routing Key:** `inventory.stock.released`

Emitted when a stock reservation is released (order cancelled or expired).

#### TypeScript Type

```typescript
type StockReleasedEvent = {
  eventId: string;
  eventType: "inventory.stock.released";
  timestamp: string;
  version: string;
  correlationId?: string;
  source: "inventory-service";
  payload: {
    reservationId: string; // UUID
    productId: string;
    quantity: number; // Positive integer
    orderId: string; // UUID
    userId: string; // UUID
    reason: "order_cancelled" | "reservation_expired" | "manual_release";
    releasedAt: string; // ISO 8601 datetime
  };
};
```

#### JSON Example

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440020",
  "eventType": "inventory.stock.released",
  "timestamp": "2025-10-20T14:40:00.000Z",
  "version": "1.0.0",
  "correlationId": "660e8400-e29b-41d4-a716-446655440001",
  "source": "inventory-service",
  "payload": {
    "reservationId": "770e8400-e29b-41d4-a716-446655440002",
    "productId": "prod-12345",
    "quantity": 5,
    "orderId": "880e8400-e29b-41d4-a716-446655440003",
    "userId": "990e8400-e29b-41d4-a716-446655440004",
    "reason": "order_cancelled",
    "releasedAt": "2025-10-20T14:40:00.000Z"
  }
}
```

---

### Stock Failed Event

**Routing Key:** `inventory.stock.failed`

Emitted when a stock operation fails (insufficient stock, system error, etc.).

#### TypeScript Type

```typescript
type StockFailedEvent = {
  eventId: string;
  eventType: "inventory.stock.failed";
  timestamp: string;
  version: string;
  correlationId?: string;
  source: "inventory-service";
  payload: {
    operationType: "reserve" | "confirm" | "release";
    productId: string;
    quantity?: number; // Positive integer (optional)
    orderId: string; // UUID
    userId: string; // UUID
    reservationId?: string; // UUID (optional)
    errorCode: string;
    errorMessage: string;
    failedAt: string; // ISO 8601 datetime
  };
};
```

#### JSON Example

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440030",
  "eventType": "inventory.stock.failed",
  "timestamp": "2025-10-20T14:30:05.000Z",
  "version": "1.0.0",
  "correlationId": "660e8400-e29b-41d4-a716-446655440001",
  "source": "inventory-service",
  "payload": {
    "operationType": "reserve",
    "productId": "prod-12345",
    "quantity": 10,
    "orderId": "880e8400-e29b-41d4-a716-446655440003",
    "userId": "990e8400-e29b-41d4-a716-446655440004",
    "errorCode": "INSUFFICIENT_STOCK",
    "errorMessage": "Only 5 units available, requested 10",
    "failedAt": "2025-10-20T14:30:05.000Z"
  }
}
```

---

## Order Events

Events emitted by the **Orders Service** (NestJS) and consumed by the **Inventory Service** (Go).

**Exchange:** `orders.events` (topic)  
**Queue:** `inventory.order_events`

---

### Order Created Event

**Routing Key:** `order.created`

Emitted when a new order is created (triggers stock reservation).

#### TypeScript Type

```typescript
type OrderCreatedEvent = {
  eventId: string;
  eventType: "order.created";
  timestamp: string;
  version: string;
  correlationId?: string;
  source: "orders-service";
  payload: {
    orderId: string; // UUID
    userId: string; // UUID
    items: Array<{
      productId: string;
      quantity: number; // Positive integer
      price: number; // Positive
      subtotal: number; // Positive
    }>;
    totalAmount: number; // Positive
    currency: string; // Default: "USD"
    status: "pending";
    createdAt: string; // ISO 8601 datetime
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
      referrer?: string;
    };
  };
};
```

#### JSON Example

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440100",
  "eventType": "order.created",
  "timestamp": "2025-10-20T14:29:00.000Z",
  "version": "1.0.0",
  "correlationId": "660e8400-e29b-41d4-a716-446655440001",
  "source": "orders-service",
  "payload": {
    "orderId": "880e8400-e29b-41d4-a716-446655440003",
    "userId": "990e8400-e29b-41d4-a716-446655440004",
    "items": [
      {
        "productId": "prod-12345",
        "quantity": 5,
        "price": 29.99,
        "subtotal": 149.95
      }
    ],
    "totalAmount": 149.95,
    "currency": "USD",
    "status": "pending",
    "createdAt": "2025-10-20T14:29:00.000Z",
    "metadata": {
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0..."
    }
  }
}
```

---

### Order Cancelled Event

**Routing Key:** `order.cancelled`

Emitted when an order is cancelled (triggers stock release).

#### TypeScript Type

```typescript
type OrderCancelledEvent = {
  eventId: string;
  eventType: "order.cancelled";
  timestamp: string;
  version: string;
  correlationId?: string;
  source: "orders-service";
  payload: {
    orderId: string; // UUID
    userId: string; // UUID
    items: Array<{
      productId: string;
      quantity: number;
      price: number;
      subtotal: number;
    }>;
    reason: "user_requested" | "payment_failed" | "stock_unavailable" | "timeout" | "fraud_detected" | "system_error";
    cancelledBy: "user" | "system" | "admin";
    cancelledAt: string; // ISO 8601 datetime
    refundRequired: boolean;
  };
};
```

#### JSON Example

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440110",
  "eventType": "order.cancelled",
  "timestamp": "2025-10-20T14:40:00.000Z",
  "version": "1.0.0",
  "correlationId": "660e8400-e29b-41d4-a716-446655440001",
  "source": "orders-service",
  "payload": {
    "orderId": "880e8400-e29b-41d4-a716-446655440003",
    "userId": "990e8400-e29b-41d4-a716-446655440004",
    "items": [
      {
        "productId": "prod-12345",
        "quantity": 5,
        "price": 29.99,
        "subtotal": 149.95
      }
    ],
    "reason": "user_requested",
    "cancelledBy": "user",
    "cancelledAt": "2025-10-20T14:40:00.000Z",
    "refundRequired": true
  }
}
```

---

### Order Failed Event

**Routing Key:** `order.failed`

Emitted when order processing fails.

#### TypeScript Type

```typescript
type OrderFailedEvent = {
  eventId: string;
  eventType: "order.failed";
  timestamp: string;
  version: string;
  correlationId?: string;
  source: "orders-service";
  payload: {
    orderId: string; // UUID
    userId: string; // UUID
    items: Array<{
      productId: string;
      quantity: number;
      price: number;
      subtotal: number;
    }>;
    failureStage: "validation" | "stock_reservation" | "payment" | "confirmation" | "unknown";
    errorCode: string;
    errorMessage: string;
    retryable: boolean;
    failedAt: string; // ISO 8601 datetime
  };
};
```

#### JSON Example

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440120",
  "eventType": "order.failed",
  "timestamp": "2025-10-20T14:30:10.000Z",
  "version": "1.0.0",
  "correlationId": "660e8400-e29b-41d4-a716-446655440001",
  "source": "orders-service",
  "payload": {
    "orderId": "880e8400-e29b-41d4-a716-446655440003",
    "userId": "990e8400-e29b-41d4-a716-446655440004",
    "items": [
      {
        "productId": "prod-12345",
        "quantity": 10,
        "price": 29.99,
        "subtotal": 299.9
      }
    ],
    "failureStage": "stock_reservation",
    "errorCode": "STOCK_UNAVAILABLE",
    "errorMessage": "Insufficient stock for product prod-12345",
    "retryable": false,
    "failedAt": "2025-10-20T14:30:10.000Z"
  }
}
```

---

### Order Confirmed Event

**Routing Key:** `order.confirmed`

Emitted when an order is successfully confirmed (payment processed).

#### TypeScript Type

```typescript
type OrderConfirmedEvent = {
  eventId: string;
  eventType: "order.confirmed";
  timestamp: string;
  version: string;
  correlationId?: string;
  source: "orders-service";
  payload: {
    orderId: string; // UUID
    userId: string; // UUID
    items: Array<{
      productId: string;
      quantity: number;
      price: number;
      subtotal: number;
    }>;
    totalAmount: number; // Positive
    currency: string; // Default: "USD"
    confirmedAt: string; // ISO 8601 datetime
  };
};
```

#### JSON Example

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440130",
  "eventType": "order.confirmed",
  "timestamp": "2025-10-20T14:35:00.000Z",
  "version": "1.0.0",
  "correlationId": "660e8400-e29b-41d4-a716-446655440001",
  "source": "orders-service",
  "payload": {
    "orderId": "880e8400-e29b-41d4-a716-446655440003",
    "userId": "990e8400-e29b-41d4-a716-446655440004",
    "items": [
      {
        "productId": "prod-12345",
        "quantity": 5,
        "price": 29.99,
        "subtotal": 149.95
      }
    ],
    "totalAmount": 149.95,
    "currency": "USD",
    "confirmedAt": "2025-10-20T14:35:00.000Z"
  }
}
```

---

## Validation

### Runtime Validation with Zod

All schemas include Zod validation for runtime type checking:

```typescript
import { validateInventoryEvent, safeValidateInventoryEvent } from "@microservices-ecommerce/shared-types";

// Throws error if invalid
const event = validateInventoryEvent(rawData);

// Returns result object
const result = safeValidateInventoryEvent(rawData);
if (result.success) {
  console.log("Valid event:", result.data);
} else {
  console.error("Validation errors:", result.error);
}
```

### Validation Rules

**All Events:**

- `eventId` must be a valid UUID
- `timestamp` must be ISO 8601 datetime
- `source` must match the emitting service

**Inventory Events:**

- `quantity` must be a positive integer
- `reservationId`, `orderId`, `userId` must be valid UUIDs
- `expiresAt` and timestamps must be ISO 8601 datetime

**Order Events:**

- `totalAmount` and `price` must be positive numbers
- `items` array must have at least one item
- `quantity` must be a positive integer

---

## Usage Examples

### TypeScript (NestJS - Orders Service)

```typescript
import {
  StockReservedEvent,
  validateInventoryEvent,
  INVENTORY_ROUTING_KEYS,
} from "@microservices-ecommerce/shared-types";

@Injectable()
export class InventoryEventConsumer {
  async handleStockReserved(rawMessage: unknown) {
    // Validate event
    const event = validateInventoryEvent(rawMessage) as StockReservedEvent;

    // Type-safe access
    console.log(`Reservation ${event.payload.reservationId} for order ${event.payload.orderId}`);

    // Process event...
  }
}
```

### Go (Inventory Service)

```go
// Event structs match TypeScript types
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

// Publish event
func (p *Publisher) PublishStockReserved(ctx context.Context, event StockReservedEvent) error {
    body, err := json.Marshal(event)
    if err != nil {
        return err
    }

    return p.channel.PublishWithContext(
        ctx,
        "inventory.events",              // exchange
        "inventory.stock.reserved",      // routing key
        false,                           // mandatory
        false,                           // immediate
        amqp.Publishing{
            ContentType: "application/json",
            Body:        body,
        },
    )
}
```

---

## References

- [RABBITMQ_TOPOLOGY.md](./RABBITMQ_TOPOLOGY.md) - Infrastructure setup
- [ADR-029: Message Broker - RabbitMQ vs Redis PubSub](../adr/029-message-broker-rabbitmq-vs-redis-pubsub.md)
- [Zod Documentation](https://zod.dev/)

## Next Steps

- **T2.5.3:** Implement RabbitMQ publisher in Inventory Service (Go)
- **T2.5.4:** Implement RabbitMQ consumer in Orders Service (NestJS)
- **T2.5.5:** End-to-end event flow tests
- **T2.5.6:** Observability and metrics dashboard
