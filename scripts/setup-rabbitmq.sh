#!/bin/bash

###############################################################################
# RabbitMQ Topology Setup Script
# Epic 2.5 - Task T2.5.1: Setup Infraestructura RabbitMQ
# 
# This script initializes RabbitMQ exchanges, queues, bindings, and DLQ
# according to ADR-029 (Message Broker: RabbitMQ vs Redis PubSub)
#
# Topology:
# - 2 Topic Exchanges (inventory.events, orders.events)
# - 2 Main Queues with DLQ (orders.inventory_events, inventory.order_events)
# - Bindings with routing keys for event types
###############################################################################

set -e  # Exit on error

# RabbitMQ connection settings
RABBITMQ_HOST="${RABBITMQ_HOST:-localhost}"
RABBITMQ_PORT="${RABBITMQ_PORT:-15672}"
RABBITMQ_USER="${RABBITMQ_USER:-microservices}"
RABBITMQ_PASS="${RABBITMQ_PASS:-microservices_pass_2024}"
RABBITMQ_VHOST="${RABBITMQ_VHOST:-/}"
RABBITMQ_MANAGEMENT_PORT="${RABBITMQ_MANAGEMENT_PORT:-15672}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to wait for RabbitMQ to be ready
wait_for_rabbitmq() {
    print_info "Waiting for RabbitMQ to be ready..."
    
    MAX_ATTEMPTS=30
    ATTEMPT=0
    
    while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
        if curl -s -u "$RABBITMQ_USER:$RABBITMQ_PASS" \
            "http://$RABBITMQ_HOST:$RABBITMQ_MANAGEMENT_PORT/api/overview" > /dev/null 2>&1; then
            print_success "RabbitMQ is ready!"
            return 0
        fi
        
        ATTEMPT=$((ATTEMPT + 1))
        echo -n "."
        sleep 2
    done
    
    print_error "RabbitMQ is not responding after $MAX_ATTEMPTS attempts"
    exit 1
}

# Function to create exchange
create_exchange() {
    local exchange_name=$1
    local exchange_type=$2
    
    print_info "Creating exchange: $exchange_name (type: $exchange_type)"
    
    curl -s -u "$RABBITMQ_USER:$RABBITMQ_PASS" \
        -X PUT \
        -H "content-type: application/json" \
        "http://$RABBITMQ_HOST:$RABBITMQ_MANAGEMENT_PORT/api/exchanges/$RABBITMQ_VHOST/$exchange_name" \
        -d "{
            \"type\": \"$exchange_type\",
            \"durable\": true,
            \"auto_delete\": false,
            \"internal\": false,
            \"arguments\": {}
        }"
    
    print_success "Exchange '$exchange_name' created"
}

# Function to create queue with DLQ configuration
create_queue_with_dlq() {
    local queue_name=$1
    local dlq_name="${queue_name}.dlq"
    local dlx_name="${queue_name}.dlx"
    
    # Create DLX (Dead Letter Exchange)
    print_info "Creating DLX: $dlx_name"
    curl -s -u "$RABBITMQ_USER:$RABBITMQ_PASS" \
        -X PUT \
        -H "content-type: application/json" \
        "http://$RABBITMQ_HOST:$RABBITMQ_MANAGEMENT_PORT/api/exchanges/$RABBITMQ_VHOST/$dlx_name" \
        -d "{
            \"type\": \"direct\",
            \"durable\": true,
            \"auto_delete\": false,
            \"internal\": false,
            \"arguments\": {}
        }"
    print_success "DLX '$dlx_name' created"
    
    # Create DLQ (Dead Letter Queue)
    print_info "Creating DLQ: $dlq_name"
    curl -s -u "$RABBITMQ_USER:$RABBITMQ_PASS" \
        -X PUT \
        -H "content-type: application/json" \
        "http://$RABBITMQ_HOST:$RABBITMQ_MANAGEMENT_PORT/api/queues/$RABBITMQ_VHOST/$dlq_name" \
        -d "{
            \"durable\": true,
            \"auto_delete\": false,
            \"arguments\": {
                \"x-queue-type\": \"classic\",
                \"x-message-ttl\": 604800000
            }
        }"
    print_success "DLQ '$dlq_name' created (TTL: 7 days)"
    
    # Bind DLQ to DLX
    print_info "Binding DLQ to DLX"
    curl -s -u "$RABBITMQ_USER:$RABBITMQ_PASS" \
        -X POST \
        -H "content-type: application/json" \
        "http://$RABBITMQ_HOST:$RABBITMQ_MANAGEMENT_PORT/api/bindings/$RABBITMQ_VHOST/e/$dlx_name/q/$dlq_name" \
        -d "{
            \"routing_key\": \"$queue_name\",
            \"arguments\": {}
        }"
    print_success "DLQ bound to DLX"
    
    # Create main queue with DLX configuration
    print_info "Creating main queue: $queue_name"
    curl -s -u "$RABBITMQ_USER:$RABBITMQ_PASS" \
        -X PUT \
        -H "content-type: application/json" \
        "http://$RABBITMQ_HOST:$RABBITMQ_MANAGEMENT_PORT/api/queues/$RABBITMQ_VHOST/$queue_name" \
        -d "{
            \"durable\": true,
            \"auto_delete\": false,
            \"arguments\": {
                \"x-queue-type\": \"classic\",
                \"x-dead-letter-exchange\": \"$dlx_name\",
                \"x-dead-letter-routing-key\": \"$queue_name\",
                \"x-max-length\": 10000,
                \"x-overflow\": \"reject-publish\"
            }
        }"
    print_success "Queue '$queue_name' created with DLX: $dlx_name"
}

# Function to bind queue to exchange
bind_queue_to_exchange() {
    local exchange_name=$1
    local queue_name=$2
    local routing_key=$3
    
    print_info "Binding queue '$queue_name' to exchange '$exchange_name' with routing key '$routing_key'"
    
    curl -s -u "$RABBITMQ_USER:$RABBITMQ_PASS" \
        -X POST \
        -H "content-type: application/json" \
        "http://$RABBITMQ_HOST:$RABBITMQ_MANAGEMENT_PORT/api/bindings/$RABBITMQ_VHOST/e/$exchange_name/q/$queue_name" \
        -d "{
            \"routing_key\": \"$routing_key\",
            \"arguments\": {}
        }"
    
    print_success "Binding created: $exchange_name -> $queue_name ($routing_key)"
}

# Function to set queue policies
set_queue_policy() {
    local policy_name=$1
    local pattern=$2
    
    print_info "Setting policy: $policy_name"
    
    curl -s -u "$RABBITMQ_USER:$RABBITMQ_PASS" \
        -X PUT \
        -H "content-type: application/json" \
        "http://$RABBITMQ_HOST:$RABBITMQ_MANAGEMENT_PORT/api/policies/$RABBITMQ_VHOST/$policy_name" \
        -d "{
            \"pattern\": \"$pattern\",
            \"definition\": {
                \"ha-mode\": \"exactly\",
                \"ha-params\": 2,
                \"ha-sync-mode\": \"automatic\"
            },
            \"priority\": 0,
            \"apply-to\": \"queues\"
        }"
    
    print_success "Policy '$policy_name' created"
}

# Main setup
main() {
    echo ""
    echo "=========================================="
    echo "  RabbitMQ Topology Setup"
    echo "  Epic 2.5 - Task T2.5.1"
    echo "=========================================="
    echo ""
    
    # Wait for RabbitMQ
    wait_for_rabbitmq
    echo ""
    
    # 1. Create Exchanges
    print_info "Step 1: Creating Topic Exchanges"
    echo "----------------------------------------"
    create_exchange "inventory.events" "topic"
    create_exchange "orders.events" "topic"
    echo ""
    
    # 2. Create Queues with DLQ
    print_info "Step 2: Creating Queues with DLQ"
    echo "----------------------------------------"
    create_queue_with_dlq "orders.inventory_events"
    echo ""
    create_queue_with_dlq "inventory.order_events"
    echo ""
    
    # 3. Create Bindings
    print_info "Step 3: Creating Bindings"
    echo "----------------------------------------"
    
    # Orders Service consumes inventory events
    bind_queue_to_exchange "inventory.events" "orders.inventory_events" "inventory.stock.reserved"
    bind_queue_to_exchange "inventory.events" "orders.inventory_events" "inventory.stock.confirmed"
    bind_queue_to_exchange "inventory.events" "orders.inventory_events" "inventory.stock.released"
    bind_queue_to_exchange "inventory.events" "orders.inventory_events" "inventory.stock.failed"
    echo ""
    
    # Inventory Service consumes order events
    bind_queue_to_exchange "orders.events" "inventory.order_events" "order.created"
    bind_queue_to_exchange "orders.events" "inventory.order_events" "order.cancelled"
    bind_queue_to_exchange "orders.events" "inventory.order_events" "order.failed"
    echo ""
    
    # 4. Set HA Policies (optional, for production)
    # Uncomment the following lines if you want HA in production
    # print_info "Step 4: Setting HA Policies"
    # echo "----------------------------------------"
    # set_queue_policy "ha-inventory-queues" "^inventory\\."
    # set_queue_policy "ha-orders-queues" "^orders\\."
    # echo ""
    
    echo ""
    echo "=========================================="
    print_success "RabbitMQ Topology Setup Completed!"
    echo "=========================================="
    echo ""
    echo "Management UI: http://$RABBITMQ_HOST:$RABBITMQ_MANAGEMENT_PORT"
    echo "Username: $RABBITMQ_USER"
    echo "Password: $RABBITMQ_PASS"
    echo ""
    echo "Topology Summary:"
    echo "  ✓ 2 Topic Exchanges: inventory.events, orders.events"
    echo "  ✓ 2 Main Queues: orders.inventory_events, inventory.order_events"
    echo "  ✓ 2 DLQ Exchanges: orders.inventory_events.dlx, inventory.order_events.dlx"
    echo "  ✓ 2 DLQ Queues: orders.inventory_events.dlq, inventory.order_events.dlq"
    echo "  ✓ 7 Bindings configured with routing keys"
    echo ""
}

# Run main function
main
