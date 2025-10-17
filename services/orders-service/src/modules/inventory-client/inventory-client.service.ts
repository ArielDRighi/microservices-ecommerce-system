import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { firstValueFrom, retry, catchError, throwError as rxThrowError } from 'rxjs';
import {
  IInventoryClient,
  CheckStockRequest,
  CheckStockResponse,
  ReserveStockRequest,
  ReserveStockResponse,
  ConfirmReservationRequest,
  ConfirmReservationResponse,
  ReleaseReservationRequest,
  ReleaseReservationResponse,
} from './interfaces/inventory-client.interface';
import {
  InventoryServiceUnavailableException,
  InventoryServiceTimeoutException,
  InsufficientStockException,
  ReservationNotFoundException,
} from './exceptions/inventory-client.exceptions';

/**
 * InventoryServiceClient
 *
 * Epic 1.6 - Refactoring del Orders Service para Microservicios
 *
 * Cliente HTTP para comunicación con el Inventory Service (Go).
 *
 * Características:
 * - Retry con exponential backoff (3 intentos)
 * - Timeout configurable (default 5000ms)
 * - Manejo de errores de red (connection refused, 5xx, timeouts)
 * - Logging estructurado de todas las llamadas
 * - Excepciones personalizadas
 *
 * Configuración (via .env):
 * - INVENTORY_SERVICE_URL: URL base del servicio (ej: http://inventory-service:8080)
 * - INVENTORY_SERVICE_TIMEOUT: Timeout en ms (default: 5000)
 * - INVENTORY_SERVICE_RETRY_ATTEMPTS: Intentos de retry (default: 3)
 *
 * @author Ariel D. Righi
 * @date 2025-10-17
 */
@Injectable()
export class InventoryServiceClient implements IInventoryClient {
  private readonly logger = new Logger(InventoryServiceClient.name);
  private readonly baseURL: string;
  private readonly timeoutMs: number;
  private readonly retryAttempts: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseURL = this.configService.get<string>(
      'INVENTORY_SERVICE_URL',
      'http://inventory-service:8080',
    );
    this.timeoutMs = this.configService.get<number>('INVENTORY_SERVICE_TIMEOUT', 5000);
    this.retryAttempts = this.configService.get<number>('INVENTORY_SERVICE_RETRY_ATTEMPTS', 3);

    this.logger.log(
      `InventoryServiceClient initialized: ${this.baseURL} (timeout: ${this.timeoutMs}ms, retries: ${this.retryAttempts})`,
    );
  }

  /**
   * Check Stock Availability
   */
  async checkStock(request: CheckStockRequest): Promise<CheckStockResponse> {
    const endpoint = `/api/v1/inventory/check-availability`;
    const startTime = Date.now();

    this.logger.log(
      `[checkStock] Request: productId=${request.productId}, quantity=${request.quantity}`,
    );

    try {
      const response = await this.makeRequest<CheckStockResponse>({
        method: 'POST',
        url: endpoint,
        data: request,
      });

      const duration = Date.now() - startTime;
      this.logger.log(`[checkStock] Success: available=${response.available} (${duration}ms)`);

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[checkStock] Failed after ${duration}ms: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Reserve Stock
   */
  async reserveStock(request: ReserveStockRequest): Promise<ReserveStockResponse> {
    const endpoint = `/api/v1/inventory/reserve`;
    const startTime = Date.now();

    this.logger.log(
      `[reserveStock] Request: productId=${request.productId}, quantity=${request.quantity}, orderId=${request.orderId}`,
    );

    try {
      const response = await this.makeRequest<ReserveStockResponse>({
        method: 'POST',
        url: endpoint,
        data: request,
      });

      const duration = Date.now() - startTime;
      this.logger.log(
        `[reserveStock] Success: reservationId=${response.reservationId} (${duration}ms)`,
      );

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[reserveStock] Failed after ${duration}ms: ${errorMessage}`);

      throw error;
    }
  }

  /**
   * Confirm Reservation
   */
  async confirmReservation(
    request: ConfirmReservationRequest,
  ): Promise<ConfirmReservationResponse> {
    const endpoint = `/api/v1/inventory/confirm/${request.reservationId}`;
    const startTime = Date.now();

    this.logger.log(`[confirmReservation] Request: reservationId=${request.reservationId}`);

    try {
      const response = await this.makeRequest<ConfirmReservationResponse>({
        method: 'POST',
        url: endpoint,
      });

      const duration = Date.now() - startTime;
      this.logger.log(
        `[confirmReservation] Success: confirmed=${response.confirmed} (${duration}ms)`,
      );

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[confirmReservation] Failed after ${duration}ms: ${errorMessage}`);

      throw error;
    }
  }

  /**
   * Release Reservation
   */
  async releaseReservation(
    request: ReleaseReservationRequest,
  ): Promise<ReleaseReservationResponse> {
    const endpoint = `/api/v1/inventory/release/${request.reservationId}`;
    const startTime = Date.now();

    this.logger.log(
      `[releaseReservation] Request: reservationId=${request.reservationId}, reason=${request.reason || 'N/A'}`,
    );

    try {
      const response = await this.makeRequest<ReleaseReservationResponse>({
        method: 'POST',
        url: endpoint,
        data: { reason: request.reason },
      });

      const duration = Date.now() - startTime;
      this.logger.log(
        `[releaseReservation] Success: released=${response.released} (${duration}ms)`,
      );

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[releaseReservation] Failed after ${duration}ms: ${errorMessage}`);

      throw error;
    }
  }

  /**
   * Health Check
   */
  async healthCheck(): Promise<boolean> {
    const endpoint = `/health`;
    const startTime = Date.now();

    try {
      await this.makeRequest<{ status: string }>({
        method: 'GET',
        url: endpoint,
      });

      const duration = Date.now() - startTime;
      this.logger.log(`[healthCheck] Success: Inventory Service is UP (${duration}ms)`);
      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.warn(`[healthCheck] Failed after ${duration}ms: Inventory Service is DOWN`);
      return false;
    }
  }

  /**
   * Make HTTP Request with Retry and Timeout
   *
   * Private helper que:
   * - Aplica timeout configurado
   * - Retry con exponential backoff
   * - Maneja errores de red y convierte a excepciones personalizadas
   *
   * @param config - Axios request config
   * @returns Promise con response data
   * @throws InventoryServiceUnavailableException - Servicio no disponible
   * @throws InventoryServiceTimeoutException - Timeout
   */
  private async makeRequest<T>(config: AxiosRequestConfig): Promise<T> {
    const fullUrl = `${this.baseURL}${config.url}`;

    return firstValueFrom(
      this.httpService
        .request<T>({
          ...config,
          url: fullUrl,
          timeout: this.timeoutMs,
        })
        .pipe(
          // Retry with exponential backoff (3 attempts)
          retry({
            count: this.retryAttempts - 1, // -1 porque el primer intento no cuenta como retry
            delay: (error, retryCount) => {
              // Solo reintentar errores de red o 5xx
              if (this.shouldRetry(error)) {
                const delayMs = Math.pow(2, retryCount) * 1000; // exponential: 1s, 2s, 4s
                this.logger.warn(
                  `[Retry ${retryCount}/${this.retryAttempts - 1}] ${config.method} ${config.url} - Retrying in ${delayMs}ms...`,
                );
                return new Promise((resolve) => setTimeout(resolve, delayMs));
              }
              // No reintentar errores 4xx
              throw error;
            },
          }),

          // Handle errors
          catchError((error: AxiosError) => {
            return rxThrowError(() => this.handleError(error));
          }),
        ),
    ).then((response: AxiosResponse<T>) => response.data);
  }

  /**
   * Should Retry?
   *
   * Determina si un error debe ser reintentado.
   *
   * @param error - Error de Axios
   * @returns true si debe reintentar
   */
  private shouldRetry(error: unknown): boolean {
    // Retry en errores de red (ECONNREFUSED, ETIMEDOUT, etc.)
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT')
    ) {
      return true;
    }

    // Retry en errores 5xx (server errors)
    if (
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      typeof error.response === 'object' &&
      error.response !== null &&
      'status' in error.response &&
      typeof error.response.status === 'number' &&
      error.response.status >= 500
    ) {
      return true;
    }

    // NO retry en errores 4xx (client errors)
    return false;
  }

  /**
   * Handle Error
   *
   * Convierte errores de Axios a excepciones personalizadas.
   *
   * @param error - Error de Axios
   * @returns HttpException personalizada
   */
  private handleError(error: AxiosError): Error {
    // Timeout
    if (error.code === 'ECONNABORTED' || error.name === 'TimeoutError') {
      return new InventoryServiceTimeoutException(this.timeoutMs);
    }

    // Connection refused (servicio no disponible)
    if (error.code === 'ECONNREFUSED') {
      return new InventoryServiceUnavailableException(
        'Cannot connect to Inventory Service (connection refused)',
        error,
      );
    }

    // Network errors
    if (!error.response) {
      return new InventoryServiceUnavailableException(`Network error: ${error.message}`, error);
    }

    // Handle specific HTTP error codes
    const status = error.response.status;

    // 404 Not Found - Reservation not found
    if (status === 404) {
      const reservationId = error.config?.url?.split('/').pop() || 'unknown';
      return new ReservationNotFoundException(reservationId);
    }

    // 409 Conflict - Insufficient stock
    if (status === 409) {
      const errorData = error.response.data as {
        productId?: string;
        requestedQuantity?: number;
        availableQuantity?: number;
      };
      return new InsufficientStockException(
        errorData?.productId || 'unknown',
        errorData?.requestedQuantity || 0,
        errorData?.availableQuantity || 0,
      );
    }

    // Server errors (5xx)
    if (error.response.status >= 500) {
      return new InventoryServiceUnavailableException(
        `Inventory Service returned ${error.response.status}: ${error.response.statusText}`,
        error,
      );
    }

    // Other client errors (4xx) - pass through
    return error;
  }
}
