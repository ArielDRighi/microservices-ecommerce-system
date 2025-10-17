/**
 * Inventory Client Interface
 *
 * Epic 1.6 - Refactoring del Orders Service para Microservicios
 *
 * Interface para el cliente HTTP del Inventory Service (Go).
 * Define los métodos disponibles para gestión de stock vía REST API.
 *
 * @author Ariel D. Righi
 * @date 2025-10-17
 */

export interface CheckStockRequest {
  productId: string;
  quantity: number;
}

export interface CheckStockResponse {
  available: boolean;
  productId: string;
  requestedQuantity: number;
  availableQuantity: number;
  message?: string;
}

export interface ReserveStockRequest {
  productId: string;
  quantity: number;
  orderId: string;
  expiresAt?: Date;
}

export interface ReserveStockResponse {
  reservationId: string;
  productId: string;
  quantity: number;
  orderId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface ConfirmReservationRequest {
  reservationId: string;
}

export interface ConfirmReservationResponse {
  reservationId: string;
  confirmed: boolean;
  message?: string;
}

export interface ReleaseReservationRequest {
  reservationId: string;
  reason?: string;
}

export interface ReleaseReservationResponse {
  reservationId: string;
  released: boolean;
  message?: string;
}

/**
 * IInventoryClient
 *
 * Contrato para comunicación con el Inventory Service (Go).
 * Implementaciones deben manejar:
 * - Retries con exponential backoff
 * - Timeouts configurables
 * - Errores de red (connection refused, timeouts, 5xx)
 * - Logging estructurado de todas las llamadas
 */
export interface IInventoryClient {
  /**
   * Check Stock Availability
   *
   * Verifica si hay stock disponible para un producto.
   *
   * @param request - Datos de consulta (productId, quantity)
   * @returns Promise con disponibilidad de stock
   * @throws InventoryServiceUnavailableException - Servicio no disponible
   * @throws InventoryServiceTimeoutException - Timeout en la llamada
   */
  checkStock(request: CheckStockRequest): Promise<CheckStockResponse>;

  /**
   * Reserve Stock
   *
   * Reserva stock para una orden. La reserva expira automáticamente
   * si no se confirma en el tiempo establecido.
   *
   * @param request - Datos de reserva (productId, quantity, orderId)
   * @returns Promise con detalles de la reserva
   * @throws InsufficientStockException - Stock insuficiente
   * @throws InventoryServiceUnavailableException - Servicio no disponible
   */
  reserveStock(request: ReserveStockRequest): Promise<ReserveStockResponse>;

  /**
   * Confirm Reservation
   *
   * Confirma una reserva, descontando el stock definitivamente.
   *
   * @param request - ID de la reserva
   * @returns Promise con confirmación
   * @throws ReservationNotFoundException - Reserva no existe o expiró
   * @throws InventoryServiceUnavailableException - Servicio no disponible
   */
  confirmReservation(request: ConfirmReservationRequest): Promise<ConfirmReservationResponse>;

  /**
   * Release Reservation
   *
   * Libera una reserva, devolviendo el stock al inventario.
   *
   * @param request - ID de la reserva y razón (opcional)
   * @returns Promise con confirmación de liberación
   * @throws ReservationNotFoundException - Reserva no existe
   * @throws InventoryServiceUnavailableException - Servicio no disponible
   */
  releaseReservation(request: ReleaseReservationRequest): Promise<ReleaseReservationResponse>;

  /**
   * Health Check
   *
   * Verifica si el Inventory Service está disponible.
   *
   * @returns Promise<boolean> - true si el servicio está UP
   */
  healthCheck(): Promise<boolean>;
}
