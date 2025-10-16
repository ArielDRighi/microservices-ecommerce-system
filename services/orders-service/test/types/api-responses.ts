/**
 * Common API Response Types for E2E Tests
 *
 * These interfaces define the expected structure of API responses
 * to provide type safety in E2E tests.
 */

/**
 * Authentication Response
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
  };
}

/**
 * User Profile Response
 */
export interface UserProfileResponse {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Product Response
 */
export interface ProductResponse {
  id: string;
  name: string;
  description?: string;
  price: string | number;
  sku?: string;
  categoryId?: string;
  isActive?: boolean;
  stock?: number;
  tags?: string[];
  images?: string[];
  attributes?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Category Response
 */
export interface CategoryResponse {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  parentId?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  children?: CategoryResponse[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Order Response
 */
export interface OrderResponse {
  id: string;
  userId?: string;
  status: string;
  totalAmount: string | number;
  items: OrderItemResponse[];
  idempotencyKey?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Order Item Response
 */
export interface OrderItemResponse {
  id?: string;
  productId: string;
  productName?: string;
  quantity: number;
  unitPrice: string | number;
  totalPrice: string | number;
}

/**
 * Inventory Response
 */
export interface InventoryResponse {
  id: string;
  productId: string;
  physicalStock?: number;
  reservedStock?: number;
  availableStock?: number;
  available?: boolean;
  minimumStock?: number;
  status?: string;
  location?: string;
  product?: {
    id: string;
    name: string;
    sku?: string;
    category?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * Logout Response
 */
export interface LogoutResponse {
  success: boolean;
  message: string;
}

/**
 * Inventory Stats Response
 */
export interface InventoryStatsResponse {
  total: number;
  totalValue: number;
  lowStockCount?: number;
  outOfStockCount?: number;
  statusBreakdown?: {
    IN_STOCK?: number;
    LOW_STOCK?: number;
    OUT_OF_STOCK?: number;
  };
}
