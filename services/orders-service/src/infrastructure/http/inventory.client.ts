import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import CircuitBreaker from 'opossum';
import axiosRetry from 'axios-retry';
import { Counter, Histogram, Gauge, Registry } from 'prom-client';
import {
  CheckStockResponse,
  ReserveStockRequest,
  ReserveStockResponse,
  ConfirmReservationRequest,
  ConfirmReservationResponse,
  ReleaseReservationRequest,
  ReleaseReservationResponse,
  InventoryServiceUnavailableException,
  InventoryServiceTimeoutException,
  InsufficientStockException,
  ReservationNotFoundException,
} from './inventory.interface';

/**
 * Cliente HTTP para Inventory Service
 * Implementa ADR-028: REST Synchronous Communication Strategy
 *
 * Características:
 * - Timeouts dinámicos: 5s (read), 10s (write), 15s (critical)
 * - Retry automático: 3 intentos con exponential backoff (1s, 2s, 4s)
 * - Circuit breaker: fail-fast cuando servicio está caído
 * - Logging estructurado con Winston
 * - Métricas de Prometheus para observabilidad
 */
@Injectable()
export class InventoryHttpClient {
  private readonly logger = new Logger(InventoryHttpClient.name);
  private readonly checkStockBreaker: CircuitBreaker<[string], CheckStockResponse>;
  private readonly reserveStockBreaker: CircuitBreaker<[ReserveStockRequest], ReserveStockResponse>;

  // Métricas de Prometheus
  private readonly registry: Registry;
  private readonly httpCallsCounter: Counter;
  private readonly httpCallDuration: Histogram;
  private readonly circuitBreakerStateGauge: Gauge;

  // Timeouts por tipo de operación (según ADR-028)
  private readonly DEFAULT_TIMEOUT = 5000; // Read operations
  private readonly WRITE_TIMEOUT = 10000; // Write operations
  private readonly CRITICAL_TIMEOUT = 15000; // Critical operations

  constructor(private readonly httpService: HttpService) {
    // Usar registry privado para evitar conflictos en tests
    this.registry = new Registry();

    // Inicializar métricas de Prometheus
    this.httpCallsCounter = new Counter({
      name: 'inventory_http_calls_total',
      help: 'Total number of HTTP calls to Inventory Service',
      labelNames: ['method', 'endpoint', 'status'],
      registers: [this.registry],
    });

    this.httpCallDuration = new Histogram({
      name: 'inventory_http_call_duration_seconds',
      help: 'Duration of HTTP calls to Inventory Service',
      labelNames: ['method', 'endpoint'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10], // 10ms to 10s
      registers: [this.registry],
    });

    this.circuitBreakerStateGauge = new Gauge({
      name: 'inventory_circuit_breaker_state',
      help: 'Circuit breaker state (0=closed, 1=half-open, 2=open)',
      labelNames: ['operation'],
      registers: [this.registry],
    });
    // Configurar axios-retry con exponential backoff
    axiosRetry(this.httpService.axiosRef, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay, // 1s, 2s, 4s
      retryCondition: (error) => {
        // Retry solo en errores transitorios
        return (
          axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          (error.response?.status !== undefined && [503, 429].includes(error.response.status))
        );
      },
      onRetry: (retryCount, error, requestConfig) => {
        this.logger.warn(`Retry attempt ${retryCount} for ${requestConfig.url}`, {
          retryCount,
          url: requestConfig.url,
          method: requestConfig.method,
          error: error.message,
        });
      },
    });

    // Circuit breaker para checkStock
    this.checkStockBreaker = new CircuitBreaker(this.checkStockInternal.bind(this), {
      timeout: this.DEFAULT_TIMEOUT,
      errorThresholdPercentage: 50, // Abrir si >50% errores
      resetTimeout: 30000, // Reintentar después de 30s
      name: 'inventory-check-stock',
      rollingCountTimeout: 10000, // Ventana de 10s para calcular %
      volumeThreshold: 10, // Mínimo 10 requests para activar
    });

    // Circuit breaker para reserveStock
    this.reserveStockBreaker = new CircuitBreaker(this.reserveStockInternal.bind(this), {
      timeout: this.WRITE_TIMEOUT,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      name: 'inventory-reserve-stock',
      rollingCountTimeout: 10000,
      volumeThreshold: 10,
    });

    // Logging de eventos del circuit breaker y métricas
    this.checkStockBreaker.on('open', () => {
      this.circuitBreakerStateGauge.set({ operation: 'check-stock' }, 2); // 2 = open
      this.logger.error('Circuit breaker OPEN: inventory-check-stock', {
        breaker: 'check-stock',
        state: 'open',
      });
    });

    this.checkStockBreaker.on('halfOpen', () => {
      this.circuitBreakerStateGauge.set({ operation: 'check-stock' }, 1); // 1 = half-open
      this.logger.warn('Circuit breaker HALF_OPEN: inventory-check-stock', {
        breaker: 'check-stock',
        state: 'half-open',
      });
    });

    this.checkStockBreaker.on('close', () => {
      this.circuitBreakerStateGauge.set({ operation: 'check-stock' }, 0); // 0 = closed
      this.logger.log('Circuit breaker CLOSED: inventory-check-stock', {
        breaker: 'check-stock',
        state: 'closed',
      });
    });

    this.reserveStockBreaker.on('open', () => {
      this.circuitBreakerStateGauge.set({ operation: 'reserve-stock' }, 2); // 2 = open
      this.logger.error('Circuit breaker OPEN: inventory-reserve-stock', {
        breaker: 'reserve-stock',
        state: 'open',
      });
    });

    this.reserveStockBreaker.on('halfOpen', () => {
      this.circuitBreakerStateGauge.set({ operation: 'reserve-stock' }, 1); // 1 = half-open
      this.logger.warn('Circuit breaker HALF_OPEN: inventory-reserve-stock', {
        breaker: 'reserve-stock',
        state: 'half-open',
      });
    });

    this.reserveStockBreaker.on('close', () => {
      this.circuitBreakerStateGauge.set({ operation: 'reserve-stock' }, 0); // 0 = closed
      this.logger.log('Circuit breaker CLOSED: inventory-reserve-stock', {
        breaker: 'reserve-stock',
        state: 'closed',
      });
    });

    // Inicializar gauges en estado cerrado
    this.circuitBreakerStateGauge.set({ operation: 'check-stock' }, 0);
    this.circuitBreakerStateGauge.set({ operation: 'reserve-stock' }, 0);
  }

  /**
   * Verifica disponibilidad de stock para un producto
   * - Timeout: 5s
   * - Retry: 3 intentos con exponential backoff
   * - Circuit breaker: Sí
   *
   * @param productId UUID del producto
   * @returns Información de stock disponible
   * @throws InventoryServiceUnavailableException si circuit breaker está abierto
   * @throws InventoryServiceTimeoutException si timeout
   */
  async checkStock(productId: string): Promise<CheckStockResponse> {
    try {
      return await this.checkStockBreaker.fire(productId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Failed to check stock for product ${productId}`, {
        productId,
        error: errorMessage,
        stack: errorStack,
      });

      // Si circuit breaker está abierto, lanzar excepción específica
      if (errorMessage?.includes('Circuit breaker is open')) {
        throw new InventoryServiceUnavailableException(
          'Inventory service is temporarily unavailable',
        );
      }

      throw error;
    }
  }

  /**
   * Método interno para verificar stock (llamado por circuit breaker)
   */
  private async checkStockInternal(productId: string): Promise<CheckStockResponse> {
    const startTime = Date.now();
    try {
      const response = await firstValueFrom(
        this.httpService.get(`/api/inventory/${productId}`, {
          timeout: this.DEFAULT_TIMEOUT,
        }),
      );
      const duration = Date.now() - startTime;

      // Registrar métricas exitosas
      this.recordMetrics('GET', '/api/inventory/:productId', 'success', duration);

      this.logger.log(`Check stock successful for product ${productId}`, {
        productId,
        duration: `${duration}ms`,
        status: response.status,
        isAvailable: response.data.is_available,
      });

      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      // Registrar métricas de error
      this.recordMetrics('GET', '/api/inventory/:productId', 'error', duration);

      this.handleHttpError(error, 'checkStock', productId);
    }
  }

  /**
   * Reserva stock para una orden
   * - Timeout: 10s (operación con lock)
   * - Retry: 3 intentos (solo en errores de red, no 409 Conflict)
   * - Circuit breaker: Sí
   *
   * @param request Datos de la reserva
   * @returns Información de la reserva creada
   * @throws InsufficientStockException si no hay stock suficiente
   * @throws InventoryServiceUnavailableException si circuit breaker está abierto
   */
  async reserveStock(request: ReserveStockRequest): Promise<ReserveStockResponse> {
    try {
      return await this.reserveStockBreaker.fire(request);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`Failed to reserve stock for product ${request.product_id}`, {
        productId: request.product_id,
        orderId: request.order_id,
        quantity: request.quantity,
        error: errorMessage,
      });

      if (errorMessage?.includes('Circuit breaker is open')) {
        throw new InventoryServiceUnavailableException();
      }

      throw error;
    }
  }

  /**
   * Método interno para reservar stock (llamado por circuit breaker)
   */
  private async reserveStockInternal(request: ReserveStockRequest): Promise<ReserveStockResponse> {
    const startTime = Date.now();
    try {
      const response = await firstValueFrom(
        this.httpService.post('/api/inventory/reserve', request, {
          timeout: this.WRITE_TIMEOUT,
        }),
      );
      const duration = Date.now() - startTime;

      // Registrar métricas exitosas
      this.recordMetrics('POST', '/api/inventory/reserve', 'success', duration);

      this.logger.log(`Reserve stock successful for product ${request.product_id}`, {
        productId: request.product_id,
        orderId: request.order_id,
        quantity: request.quantity,
        reservationId: response.data.reservation_id,
        duration: `${duration}ms`,
      });

      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      // Registrar métricas de error
      this.recordMetrics('POST', '/api/inventory/reserve', 'error', duration);

      this.handleHttpError(error, 'reserveStock', request.product_id);
    }
  }

  /**
   * Confirma una reserva (hace el commit final del stock)
   * - Timeout: 10s (operación con lock)
   * - Retry: 3 intentos
   * - Sin circuit breaker (operación idempotente)
   *
   * @param request Datos de confirmación
   * @returns Información de la confirmación
   * @throws ReservationNotFoundException si reserva no existe
   */
  async confirmReservation(
    request: ConfirmReservationRequest,
  ): Promise<ConfirmReservationResponse> {
    const startTime = Date.now();
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `/api/inventory/confirm/${request.reservation_id}`,
          {},
          {
            timeout: this.WRITE_TIMEOUT,
          },
        ),
      );
      const duration = Date.now() - startTime;

      // Registrar métricas exitosas
      this.recordMetrics('POST', '/api/inventory/confirm/:reservationId', 'success', duration);

      this.logger.log(`Confirm reservation successful: ${request.reservation_id}`, {
        reservationId: request.reservation_id,
        duration: `${duration}ms`,
      });

      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Registrar métricas de error
      this.recordMetrics('POST', '/api/inventory/confirm/:reservationId', 'error', duration);

      this.logger.error(`Failed to confirm reservation ${request.reservation_id}`, {
        reservationId: request.reservation_id,
        error: errorMessage,
      });

      this.handleHttpError(error, 'confirmReservation', request.reservation_id);
    }
  } /**
   * Libera una reserva (compensación)
   * - Timeout: 10s
   * - Retry: 3 intentos
   * - Best-effort (no lanza excepciones)
   *
   * @param request Datos de liberación
   * @returns Información de la liberación o null si falla
   */
  async releaseReservation(
    request: ReleaseReservationRequest,
  ): Promise<ReleaseReservationResponse | null> {
    const startTime = Date.now();
    try {
      const response = await firstValueFrom(
        this.httpService.delete(`/api/inventory/reserve/${request.reservation_id}`, {
          timeout: this.WRITE_TIMEOUT,
        }),
      );
      const duration = Date.now() - startTime;

      // Registrar métricas exitosas
      this.recordMetrics('DELETE', '/api/inventory/reserve/:reservationId', 'success', duration);

      this.logger.log(`Release reservation successful: ${request.reservation_id}`, {
        reservationId: request.reservation_id,
        duration: `${duration}ms`,
      });

      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Registrar métricas de error
      this.recordMetrics('DELETE', '/api/inventory/reserve/:reservationId', 'error', duration);

      // Release es best-effort, no propagamos el error
      this.logger.error(
        `Failed to release reservation ${request.reservation_id} (best-effort, continuing)`,
        {
          reservationId: request.reservation_id,
          error: errorMessage,
        },
      );

      return null;
    }
  }

  /**
   * Health check del Inventory Service
   * - Timeout: 3s
   * - Sin retry
   * - Sin circuit breaker
   *
   * @returns true si servicio está disponible
   */
  async healthCheck(): Promise<boolean> {
    const startTime = Date.now();
    try {
      const response = await firstValueFrom(this.httpService.get('/health', { timeout: 3000 }));
      const duration = Date.now() - startTime;

      // Registrar métricas exitosas
      this.recordMetrics('GET', '/health', 'success', duration);

      return response.status === 200;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Registrar métricas de error
      this.recordMetrics('GET', '/health', 'error', duration);

      this.logger.warn('Inventory service health check failed', {
        error: errorMessage,
      });
      return false;
    }
  }

  /**
   * Obtiene las métricas en formato Prometheus
   * @returns Métricas en texto plano para ser expuestas en /metrics
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Registra métricas de HTTP call
   */
  private recordMetrics(
    method: string,
    endpoint: string,
    status: 'success' | 'error',
    durationMs: number,
  ): void {
    const durationSeconds = durationMs / 1000;

    // Incrementar contador de llamadas
    this.httpCallsCounter.inc({
      method,
      endpoint,
      status,
    });

    // Registrar duración
    this.httpCallDuration.observe(
      {
        method,
        endpoint,
      },
      durationSeconds,
    );
  }

  /**
   * Maneja errores HTTP y los convierte a excepciones específicas
   */
  private handleHttpError(error: unknown, operation: string, _identifier: string): never {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any;

    // Timeout
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      throw new InventoryServiceTimeoutException(`${operation} request timed out`);
    }

    // Network errors
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
      throw new InventoryServiceUnavailableException(
        `Cannot connect to inventory service: ${err.message}`,
      );
    }

    // HTTP errors
    if (err.response) {
      const status = err.response.status;
      const data = err.response.data;

      switch (status) {
        case 404:
          throw new ReservationNotFoundException(data?.message || 'Resource not found');

        case 409:
          // Conflict - Insufficient stock o optimistic lock failure
          throw new InsufficientStockException(
            data?.message || 'Insufficient stock',
            data?.available_quantity || 0,
          );

        case 503:
          throw new InventoryServiceUnavailableException(
            data?.message || 'Service temporarily unavailable',
          );

        default:
          throw new InventoryServiceUnavailableException(
            `Unexpected error from inventory service: ${status}`,
          );
      }
    }

    // Error desconocido
    throw error;
  }
}
