-- Migration: Rollback create reservations table
-- Description: Drops the reservations table and its indexes
-- Version: 002
-- Date: 2025-10-20

-- Drop indexes first
DROP INDEX IF EXISTS idx_reservations_active;
DROP INDEX IF EXISTS idx_reservations_expires_at;
DROP INDEX IF EXISTS idx_reservations_status;
DROP INDEX IF EXISTS idx_reservations_inventory_item;
DROP INDEX IF EXISTS idx_reservations_order;

-- Drop table
DROP TABLE IF EXISTS reservations;
