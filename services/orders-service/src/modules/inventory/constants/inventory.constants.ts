/**
 * Inventory Module Constants
 *
 * Central location for all magic numbers and default values
 * used in the inventory management system.
 */

/**
 * Default minimum stock level before reorder alert
 */
export const DEFAULT_MINIMUM_STOCK = 10;

/**
 * Default reorder point offset above minimum stock
 * Reorder point = minimum stock + this offset
 */
export const DEFAULT_REORDER_POINT_OFFSET = 10;

/**
 * Default maximum stock multiplier based on initial stock
 * Maximum stock = initial stock * this multiplier
 */
export const DEFAULT_MAXIMUM_STOCK_MULTIPLIER = 10;

/**
 * Default warehouse location for inventory records
 */
export const DEFAULT_WAREHOUSE_LOCATION = 'MAIN_WAREHOUSE';

/**
 * Reservation ID prefix for consistent formatting
 */
export const RESERVATION_ID_PREFIX = 'res';
