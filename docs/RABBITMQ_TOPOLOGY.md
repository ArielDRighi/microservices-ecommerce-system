# RabbitMQ Topology Configuration

**Epic 2.5 - Task T2.5.1: Setup Infraestructura RabbitMQ**

This document describes the RabbitMQ topology for the microservices-ecommerce-system project, implementing event-driven communication between Inventory Service (Go) and Orders Service (NestJS).

## Architecture Decision

See [ADR-029: Message Broker - RabbitMQ vs Redis PubSub](../adr/029-message-broker-rabbitmq-vs-redis-pubsub.md) for the rationale behind choosing RabbitMQ.

## Topology Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     RabbitMQ Message Broker                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                          EXCHANGES                               │
├─────────────────────────────────────────────────────────────────┤
│  1. inventory.events (topic, durable)                           │
│  2. orders.events (topic, durable)                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      MAIN QUEUES                                 │
├─────────────────────────────────────────────────────────────────┤
│  1. orders.inventory_events                                      │
│     - Consumes: inventory.events                                │
│     - Consumer: Orders Service (NestJS)                         │
│     - DLX: orders.inventory_events.dlx                          │
│     - Max Length: 10,000 messages                               │
│                                                                  │
│  2. inventory.order_events                                       │
│     - Consumes: orders.events                                   │
│     - Consumer: Inventory Service (Go)                          │
│     - DLX: inventory.order_events.dlx                           │
│     - Max Length: 10,000 messages                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  DEAD LETTER QUEUES (DLQ)                        │
├─────────────────────────────────────────────────────────────────┤
│  1. orders.inventory_events.dlq                                  │
│     - TTL: 7 days (604,800,000 ms)                              │
│     - Exchange: orders.inventory_events.dlx (direct)            │
│                                                                  │
│  2. inventory.order_events.dlq                                   │
│     - TTL: 7 days (604,800,000 ms)                              │
│     - Exchange: inventory.order_events.dlx (direct)             │
└─────────────────────────────────────────────────────────────────┘
```

## Event Flow

### 1. Inventory Service → Orders Service

**Publisher:** Inventory Service (Go)  
**Consumer:** Orders Service (NestJS)  
**Exchange:** `inventory.events` (topic)  
**Queue:** `orders.inventory_events`

**Routing Keys:**

- `inventory.stock.reserved` - Stock successfully reserved
- `inventory.stock.confirmed` - Reservation confirmed
- `inventory.stock.released` - Reservation released/cancelled
- `inventory.stock.failed` - Stock operation failed

**Event Flow:**

```
Inventory Service (Publisher)
    ↓ publishes event
inventory.events Exchange
    ↓ routes by routing key
orders.inventory_events Queue
    ↓ consumes
Orders Service (Consumer)
```

### 2. Orders Service → Inventory Service

**Publisher:** Orders Service (NestJS)  
**Consumer:** Inventory Service (Go)  
**Exchange:** `orders.events` (topic)  
**Queue:** `inventory.order_events`

**Routing Keys:**

- `order.created` - New order created (trigger stock reservation)
- `order.cancelled` - Order cancelled (release reservation)
- `order.failed` - Order processing failed

**Event Flow:**

```
Orders Service (Publisher)
    ↓ publishes event
orders.events Exchange
    ↓ routes by routing key
inventory.order_events Queue
    ↓ consumes
Inventory Service (Consumer)
```

## Bindings Configuration

### orders.inventory_events Queue

| Exchange         | Queue                   | Routing Key               |
| ---------------- | ----------------------- | ------------------------- |
| inventory.events | orders.inventory_events | inventory.stock.reserved  |
| inventory.events | orders.inventory_events | inventory.stock.confirmed |
| inventory.events | orders.inventory_events | inventory.stock.released  |
| inventory.events | orders.inventory_events | inventory.stock.failed    |

### inventory.order_events Queue

| Exchange      | Queue                  | Routing Key     |
| ------------- | ---------------------- | --------------- |
| orders.events | inventory.order_events | order.created   |
| orders.events | inventory.order_events | order.cancelled |
| orders.events | inventory.order_events | order.failed    |

## Queue Properties

### Main Queues

```json
{
  "durable": true,
  "auto_delete": false,
  "arguments": {
    "x-queue-type": "classic",
    "x-dead-letter-exchange": "<queue_name>.dlx",
    "x-dead-letter-routing-key": "<queue_name>",
    "x-max-length": 10000,
    "x-overflow": "reject-publish"
  }
}
```

**Properties Explanation:**

- `durable: true` - Queue survives broker restart
- `x-queue-type: classic` - Classic queue type (better for this use case)
- `x-dead-letter-exchange` - DLX for failed messages
- `x-max-length: 10000` - Maximum queue length
- `x-overflow: reject-publish` - Reject new messages when queue is full

### Dead Letter Queues

```json
{
  "durable": true,
  "auto_delete": false,
  "arguments": {
    "x-queue-type": "classic",
    "x-message-ttl": 604800000
  }
}
```

**Properties Explanation:**

- `x-message-ttl: 604800000` - Messages expire after 7 days

## Setup Script

The topology is created using the automated setup script:

```bash
./scripts/setup-rabbitmq.sh
```

**Environment Variables (optional):**

```bash
export RABBITMQ_HOST=localhost
export RABBITMQ_PORT=15672
export RABBITMQ_USER=microservices
export RABBITMQ_PASS=microservices_pass_2024
export RABBITMQ_VHOST=/
```

**Default Values:**

- Host: `localhost`
- Management Port: `15672`
- User: `microservices`
- Password: `microservices_pass_2024`
- Virtual Host: `/`

## Verification

### 1. Start RabbitMQ

```bash
docker-compose up -d rabbitmq
```

Wait for RabbitMQ to be ready (approximately 10-15 seconds).

### 2. Run Setup Script

```bash
chmod +x scripts/setup-rabbitmq.sh
./scripts/setup-rabbitmq.sh
```

**Expected Output:**

```
==========================================
  RabbitMQ Topology Setup
  Epic 2.5 - Task T2.5.1
==========================================

✓ RabbitMQ is ready!

Step 1: Creating Topic Exchanges
----------------------------------------
✓ Exchange 'inventory.events' created
✓ Exchange 'orders.events' created

Step 2: Creating Queues with DLQ
----------------------------------------
✓ DLX 'orders.inventory_events.dlx' created
✓ DLQ 'orders.inventory_events.dlq' created (TTL: 7 days)
✓ DLQ bound to DLX
✓ Queue 'orders.inventory_events' created with DLX: orders.inventory_events.dlx

...

==========================================
✓ RabbitMQ Topology Setup Completed!
==========================================
```

### 3. Verify in Management UI

Open the RabbitMQ Management UI:

**URL:** http://localhost:15672  
**Username:** microservices  
**Password:** microservices_pass_2024

**Check:**

1. **Exchanges Tab:**

   - ✓ `inventory.events` (type: topic, durable)
   - ✓ `orders.events` (type: topic, durable)
   - ✓ `orders.inventory_events.dlx` (type: direct, durable)
   - ✓ `inventory.order_events.dlx` (type: direct, durable)

2. **Queues Tab:**

   - ✓ `orders.inventory_events` (Features: D, DLX)
   - ✓ `inventory.order_events` (Features: D, DLX)
   - ✓ `orders.inventory_events.dlq` (Features: D, TTL: 7d)
   - ✓ `inventory.order_events.dlq` (Features: D, TTL: 7d)

3. **Bindings:**
   - Click on `inventory.events` exchange → See 4 bindings to `orders.inventory_events`
   - Click on `orders.events` exchange → See 3 bindings to `inventory.order_events`

### 4. Manual Verification with curl

**List Exchanges:**

```bash
curl -u microservices:microservices_pass_2024 \
  http://localhost:15672/api/exchanges/%2F
```

**List Queues:**

```bash
curl -u microservices:microservices_pass_2024 \
  http://localhost:15672/api/queues/%2F
```

**List Bindings:**

```bash
curl -u microservices:microservices_pass_2024 \
  http://localhost:15672/api/bindings/%2F
```

## Message Flow Example

### Scenario: Reserve Stock

```
1. Orders Service creates order
   ↓
2. Orders Service publishes: order.created
   → Exchange: orders.events
   → Routing Key: order.created
   ↓
3. Message routed to: inventory.order_events queue
   ↓
4. Inventory Service consumes event
   ↓
5. Inventory Service reserves stock
   ↓
6. Inventory Service publishes: inventory.stock.reserved
   → Exchange: inventory.events
   → Routing Key: inventory.stock.reserved
   ↓
7. Message routed to: orders.inventory_events queue
   ↓
8. Orders Service consumes event
   ↓
9. Orders Service updates order status
```

## Error Handling

### Dead Letter Queue (DLQ) Scenarios

Messages are sent to DLQ when:

1. **Consumer Rejection:**

   - Consumer sends NACK with `requeue=false`
   - Example: Invalid event schema, business logic error

2. **Consumer Exception:**

   - Unhandled exception in consumer
   - Automatic NACK by client library

3. **Message TTL Expiration:**

   - Message not consumed within TTL (if configured)

4. **Max Delivery Attempts:**
   - After N failed retries (application-level)

### DLQ Monitoring

**Check DLQ Messages:**

```bash
curl -u microservices:microservices_pass_2024 \
  http://localhost:15672/api/queues/%2F/orders.inventory_events.dlq
```

**Manual Message Recovery:**

1. Open Management UI
2. Navigate to Queues → `orders.inventory_events.dlq`
3. Click "Get messages"
4. Review message payload and headers
5. Fix root cause
6. Manually re-publish to main queue (if needed)

## Prometheus Metrics

The following metrics will be exposed by RabbitMQ exporter:

- `rabbitmq_queue_messages` - Messages in queue
- `rabbitmq_queue_messages_ready` - Messages ready to consume
- `rabbitmq_queue_messages_unacknowledged` - Messages waiting for ACK
- `rabbitmq_queue_consumers` - Number of consumers
- `rabbitmq_queue_publish_rate` - Message publish rate
- `rabbitmq_queue_deliver_rate` - Message delivery rate

## Production Considerations

### High Availability (HA)

For production, enable HA policies:

```bash
# Uncomment lines in setup-rabbitmq.sh:
set_queue_policy "ha-inventory-queues" "^inventory\\."
set_queue_policy "ha-orders-queues" "^orders\\."
```

**HA Policy:**

- `ha-mode: exactly` - Replicate to exactly 2 nodes
- `ha-sync-mode: automatic` - Automatic synchronization

### Performance Tuning

**Queue Length Limits:**

- Current: 10,000 messages
- Increase for high-volume scenarios: 50,000 - 100,000

**Prefetch Count:**

- Inventory Service (Go): 10 messages
- Orders Service (NestJS): 10 messages

**Connection Pooling:**

- Inventory Service: 5 connections
- Orders Service: 5 connections

### Monitoring Alerts

**Recommended Alerts:**

1. **High Queue Depth:** `queue_messages > 5000`
2. **DLQ Growth:** `dlq_messages > 100`
3. **Consumer Lag:** `messages_unacknowledged > 1000`
4. **No Consumers:** `queue_consumers == 0`
5. **Publish Errors:** `publish_errors > 10/min`

## References

- [ADR-029: Message Broker - RabbitMQ vs Redis PubSub](../adr/029-message-broker-rabbitmq-vs-redis-pubsub.md)
- [RabbitMQ Topic Exchange Tutorial](https://www.rabbitmq.com/tutorials/tutorial-five-javascript.html)
- [RabbitMQ Dead Letter Exchanges](https://www.rabbitmq.com/dlx.html)
- [RabbitMQ Management HTTP API](https://www.rabbitmq.com/management.html#http-api)

## Next Steps

- **T2.5.2:** Define event schemas with TypeScript/Zod validation
- **T2.5.3:** Implement RabbitMQ publisher in Inventory Service (Go)
- **T2.5.4:** Implement RabbitMQ consumer in Orders Service (NestJS)
- **T2.5.5:** End-to-end event flow tests
- **T2.5.6:** Observability and metrics dashboard
