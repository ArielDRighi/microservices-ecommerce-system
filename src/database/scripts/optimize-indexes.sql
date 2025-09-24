-- Additional Indexes for Performance Optimization
-- This script adds important indexes that were missing from the initial schema creation

-- Users table optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login ON users(last_login_at);

-- Products table optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_created_at ON products(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_search ON products USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Orders table optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_payment_id ON orders(payment_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);

-- Order Items optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order_product ON order_items(order_id, product_id);

-- Inventory optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_location ON inventory(location);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_sku ON inventory(sku);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_low_stock ON inventory(current_stock, minimum_stock) WHERE current_stock <= minimum_stock;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_current_stock ON inventory(current_stock);

-- Outbox Events optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outbox_events_event_type ON outbox_events(event_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outbox_events_created_at ON outbox_events(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outbox_events_aggregate_id ON outbox_events(aggregate_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outbox_events_idempotency_key ON outbox_events(idempotency_key);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outbox_events_correlation_id ON outbox_events(correlation_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outbox_events_user_id ON outbox_events(user_id);

-- Saga State optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saga_states_correlation_id ON saga_state(correlation_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saga_states_status ON saga_state(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saga_states_created_at ON saga_state(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saga_states_next_step_at ON saga_state(next_step_at) WHERE next_step_at IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saga_states_initiator_id ON saga_state(initiator_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saga_states_aggregate_id ON saga_state(aggregate_id);

-- Composite indexes for frequent query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_date_desc ON orders(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outbox_unprocessed_date ON outbox_events(processed, created_at) WHERE processed = false;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saga_pending_next_step ON saga_state(status, next_step_at) WHERE status IN ('pending', 'compensating');

-- Performance statistics update
ANALYZE users;
ANALYZE products;
ANALYZE orders;
ANALYZE order_items;
ANALYZE inventory;
ANALYZE outbox_events;
ANALYZE saga_state;