/**
 * Interfaces para comunicación HTTP con Inventory Service
 * Siguiendo ADR-028: REST Synchronous Communication Strategy
 */

/**
 * Respuesta de verificación de stock disponible
 * Endpoint: GET /api/inventory/:productId
 */
export interface CheckStockResponse {
  product_id: string;
  is_available: boolean;
  requested_quantity: number;
  available_quantity: number;
  total_stock: number;
  reserved_quantity: number;
}

/**
 * Request para reservar stock
 * Endpoint: POST /api/inventory/reserve
 */
export interface ReserveStockRequest {
  product_id: string;
  order_id: string;
  quantity: number;
}

/**
 * Respuesta de reserva de stock
 */
export interface ReserveStockResponse {
  reservation_id: string;
  product_id: string;
  order_id: string;
  quantity: number;
  expires_at: string;
  remaining_stock: number;
  reserved_quantity: number;
}

/**
 * Request para confirmar reserva
 * Endpoint: POST /api/inventory/confirm/:reservationId
 */
export interface ConfirmReservationRequest {
  reservation_id: string;
}

/**
 * Respuesta de confirmación de reserva
 */
export interface ConfirmReservationResponse {
  reservation_id: string;
  inventory_item_id: string;
  order_id: string;
  quantity_confirmed: number;
  final_stock: number;
  reserved_stock: number;
}

/**
 * Request para liberar reserva (compensación)
 * Endpoint: DELETE /api/inventory/reserve/:reservationId
 */
export interface ReleaseReservationRequest {
  reservation_id: string;
}

/**
 * Respuesta de liberación de reserva
 */
export interface ReleaseReservationResponse {
  reservation_id: string;
  inventory_item_id: string;
  order_id: string;
  quantity_released: number;
  available_stock: number;
  reserved_stock: number;
}

/**
 * Errores específicos del Inventory Service
 */
export class InventoryServiceException extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly response?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'InventoryServiceException';
  }
}

export class InventoryServiceUnavailableException extends InventoryServiceException {
  constructor(message = 'Inventory service is temporarily unavailable') {
    super(message, 503);
    this.name = 'InventoryServiceUnavailableException';
  }
}

export class InventoryServiceTimeoutException extends InventoryServiceException {
  constructor(message = 'Inventory service request timed out') {
    super(message, 504);
    this.name = 'InventoryServiceTimeoutException';
  }
}

export class InsufficientStockException extends InventoryServiceException {
  constructor(
    message = 'Insufficient stock available',
    public readonly availableQuantity: number = 0,
  ) {
    super(message, 409);
    this.name = 'InsufficientStockException';
  }
}

export class ReservationNotFoundException extends InventoryServiceException {
  constructor(message = 'Reservation not found') {
    super(message, 404);
    this.name = 'ReservationNotFoundException';
  }
}
