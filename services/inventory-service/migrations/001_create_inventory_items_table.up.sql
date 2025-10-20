-- Migration: Create inventory_items table
-- Description: Table to store inventory items with optimistic locking support
-- Version: 001
-- Date: 2025-10-20

CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY,
    product_id UUID NOT NULL,
    quantity INT NOT NULL,
    reserved INT NOT NULL DEFAULT 0,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    
    -- Constraints
    CONSTRAINT chk_quantity_positive CHECK (quantity >= 0),
    CONSTRAINT chk_reserved_positive CHECK (reserved >= 0),
    CONSTRAINT chk_reserved_not_exceed CHECK (reserved <= quantity)
);

-- Unique index on product_id to ensure one inventory item per product
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_product ON inventory_items(product_id);

-- Index on quantity and reserved for low stock queries
CREATE INDEX IF NOT EXISTS idx_inventory_stock_levels ON inventory_items(quantity, reserved);

-- Comment on table
COMMENT ON TABLE inventory_items IS 'Stores inventory quantities for products with optimistic locking support';

-- Comments on columns
COMMENT ON COLUMN inventory_items.id IS 'Primary key UUID';
COMMENT ON COLUMN inventory_items.product_id IS 'Reference to product (unique)';
COMMENT ON COLUMN inventory_items.quantity IS 'Total quantity in stock';
COMMENT ON COLUMN inventory_items.reserved IS 'Quantity reserved for pending orders';
COMMENT ON COLUMN inventory_items.version IS 'Version number for optimistic locking';
COMMENT ON COLUMN inventory_items.created_at IS 'Timestamp when record was created';
COMMENT ON COLUMN inventory_items.updated_at IS 'Timestamp when record was last updated';
