/**
 * Product validation constants
 * These constants define the validation rules for product properties
 */

export const PRODUCT_PRICE = {
  MIN: 0.5,
  MAX: 999999.99,
  DECIMAL_PLACES: 2,
} as const;

export const PRODUCT_NAME = {
  MIN_LENGTH: 2,
  MAX_LENGTH: 255,
} as const;

export const PRODUCT_DESCRIPTION = {
  MAX_LENGTH: 2000,
} as const;

export const PRODUCT_SKU = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 100,
  PATTERN: /^[A-Z0-9\-_]+$/,
} as const;

export const PRODUCT_BRAND = {
  MAX_LENGTH: 50,
} as const;

export const PRODUCT_WEIGHT = {
  MIN: 0,
  MAX: 999.999,
  DECIMAL_PLACES: 3,
} as const;

export const PRODUCT_IMAGES = {
  MAX_COUNT: 10,
} as const;

export const PRODUCT_TAGS = {
  MAX_COUNT: 20,
} as const;

export const PRODUCT_STOCK = {
  MAX: 999999,
} as const;
