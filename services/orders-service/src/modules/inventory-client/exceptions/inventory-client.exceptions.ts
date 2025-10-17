import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Inventory Service Exceptions
 *
 * Epic 1.6 - Refactoring del Orders Service para Microservicios
 *
 * Excepciones personalizadas para el cliente HTTP del Inventory Service.
 *
 * @author Ariel D. Righi
 * @date 2025-10-17
 */

/**
 * InventoryServiceUnavailableException
 *
 * Lanzada cuando el Inventory Service no está disponible:
 * - Connection refused
 * - 5xx errors
 * - Network errors
 */
export class InventoryServiceUnavailableException extends HttpException {
  constructor(message?: string, originalError?: Error) {
    super(
      {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: message || 'Inventory Service is unavailable',
        error: 'Service Unavailable',
        originalError: originalError?.message,
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

/**
 * InventoryServiceTimeoutException
 *
 * Lanzada cuando el Inventory Service no responde en el tiempo esperado.
 */
export class InventoryServiceTimeoutException extends HttpException {
  constructor(timeout: number) {
    super(
      {
        statusCode: HttpStatus.GATEWAY_TIMEOUT,
        message: `Inventory Service timeout after ${timeout}ms`,
        error: 'Gateway Timeout',
      },
      HttpStatus.GATEWAY_TIMEOUT,
    );
  }
}

/**
 * InsufficientStockException
 *
 * Lanzada cuando no hay stock suficiente para una reserva.
 */
export class InsufficientStockException extends HttpException {
  constructor(productId: string, requested: number, available: number) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message: 'Insufficient stock',
        error: 'Conflict',
        details: {
          productId,
          requestedQuantity: requested,
          availableQuantity: available,
        },
      },
      HttpStatus.CONFLICT,
    );
  }
}

/**
 * ReservationNotFoundException
 *
 * Lanzada cuando una reserva no existe o expiró.
 */
export class ReservationNotFoundException extends HttpException {
  constructor(reservationId: string) {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Reservation not found or expired',
        error: 'Not Found',
        details: {
          reservationId,
        },
      },
      HttpStatus.NOT_FOUND,
    );
  }
}
