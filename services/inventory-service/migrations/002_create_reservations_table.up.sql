-- Migration: Create reservations table
-- Description: Table to store temporary stock reservations for orders
-- Version: 002
-- Date: 2025-10-20

CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY,
    inventory_item_id UUID NOT NULL,
    order_id UUID NOT NULL,
    quantity INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    
    -- Constraints
    CONSTRAINT chk_reservation_quantity_positive CHECK (quantity > 0),
    CONSTRAINT chk_reservation_status CHECK (status IN ('pending', 'confirmed', 'released', 'expired'))
);

-- Unique index on order_id to ensure one reservation per order
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_order ON reservations(order_id);

-- Index on inventory_item_id for finding all reservations for an item
CREATE INDEX IF NOT EXISTS idx_reservations_inventory_item ON reservations(inventory_item_id);

-- Index on status for filtering by reservation status
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);

-- Index on expires_at for finding expired reservations
CREATE INDEX IF NOT EXISTS idx_reservations_expires_at ON reservations(expires_at);

-- Composite index for finding active reservations (pending + not expired)
CREATE INDEX IF NOT EXISTS idx_reservations_active ON reservations(inventory_item_id, status, expires_at);

-- Comment on table
COMMENT ON TABLE reservations IS 'Stores temporary stock reservations for orders with expiration time';

-- Comments on columns
COMMENT ON COLUMN reservations.id IS 'Primary key UUID';
COMMENT ON COLUMN reservations.inventory_item_id IS 'Reference to inventory_items table';
COMMENT ON COLUMN reservations.order_id IS 'Reference to order (unique)';
COMMENT ON COLUMN reservations.quantity IS 'Quantity reserved';
COMMENT ON COLUMN reservations.status IS 'Reservation status: pending, confirmed, released, expired';
COMMENT ON COLUMN reservations.expires_at IS 'Timestamp when reservation expires';
COMMENT ON COLUMN reservations.created_at IS 'Timestamp when record was created';
COMMENT ON COLUMN reservations.updated_at IS 'Timestamp when record was last updated';
