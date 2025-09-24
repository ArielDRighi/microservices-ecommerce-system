-- Additional Indexes for Performance Optimization (Updated Column Names)
-- This script adds important indexes based on the actual database schema

-- Users table optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_updated ON users(is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at_updated ON users(created_at);

-- Products table optimization  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_updated ON products(name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_active_updated ON products(is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_price_updated ON products(price);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_created_at_updated ON products(created_at);

-- Orders table optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_created_at_updated ON orders(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_created_updated ON orders(status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_status_updated ON orders(user_id, status);

-- Order Items optimization (composite index for better join performance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order_product_updated ON order_items(order_id, product_id);

-- Inventory optimization (based on actual schema)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_quantity ON inventory(quantity);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_reserved ON inventory(reserved_quantity);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_low_stock_updated ON inventory(quantity) WHERE quantity <= 10;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_updated_at ON inventory(updated_at);

-- Saga State optimization (based on actual schema)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saga_current_step ON saga_state(current_step);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saga_completed ON saga_state(completed);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saga_compensated ON saga_state(compensated);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saga_updated_at ON saga_state(updated_at);

-- Composite indexes for frequent query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_date_desc_updated ON orders(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saga_type_status ON saga_state(saga_type, completed, compensated);

-- Performance statistics update
ANALYZE users;
ANALYZE products;
ANALYZE orders;
ANALYZE order_items;
ANALYZE inventory;
ANALYZE outbox_events;
ANALYZE saga_state;