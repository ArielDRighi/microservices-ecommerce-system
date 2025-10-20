-- Migration: Rollback create inventory_items table
-- Description: Drops the inventory_items table and its indexes
-- Version: 001
-- Date: 2025-10-20

-- Drop indexes first
DROP INDEX IF EXISTS idx_inventory_stock_levels;
DROP INDEX IF EXISTS idx_inventory_product_lookup;
DROP INDEX IF EXISTS idx_inventory_product;

-- Drop table
DROP TABLE IF EXISTS inventory_items;
