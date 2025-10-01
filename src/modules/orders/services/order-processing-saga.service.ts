import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SagaStateEntity,
  SagaStatus,
  SagaType,
} from '../../../database/entities/saga-state.entity';
import { Order } from '../entities/order.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { InventoryService } from '../../inventory/inventory.service';
import { PaymentsService } from '../../payments/payments.service';
import { PaymentMethod, PaymentStatus } from '../../payments/dto/payment.dto';
import { NotificationsService } from '../../notifications/notifications.service';
import {
  SagaStep,
  SagaStateData,
  SagaStepResult,
  SagaMetrics,
  SagaConfig,
  DEFAULT_SAGA_CONFIG,
  CompensationAction,
} from '../types/saga.types';
import { CircuitBreaker, CircuitBreakerConfig } from '../../../common/utils/circuit-breaker.util';

/**
 * Order Processing Saga Service
 * Orquesta el flujo completo de procesamiento de órdenes con compensación
 */
@Injectable()
export class OrderProcessingSagaService {
  private readonly logger = new Logger(OrderProcessingSagaService.name);
  private readonly config: SagaConfig;
  private readonly paymentCircuitBreaker: CircuitBreaker;
  private readonly inventoryCircuitBreaker: CircuitBreaker;
  private readonly notificationCircuitBreaker: CircuitBreaker;

  constructor(
    @InjectRepository(SagaStateEntity)
    private readonly sagaStateRepository: Repository<SagaStateEntity>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly inventoryService: InventoryService,
    private readonly paymentsService: PaymentsService,
    private readonly notificationsService: NotificationsService,
  ) {
    this.config = DEFAULT_SAGA_CONFIG;

    // Initialize circuit breakers for external services
    const circuitBreakerConfig: Omit<CircuitBreakerConfig, 'name'> = {
      failureThreshold: this.config.circuitBreakerThreshold,
      successThreshold: 3,
      recoveryTimeout: this.config.circuitBreakerResetTimeMs,
      timeout: 30000, // 30 seconds per operation
    };

    this.paymentCircuitBreaker = new CircuitBreaker({
      ...circuitBreakerConfig,
      name: 'PaymentService',
    });

    this.inventoryCircuitBreaker = new CircuitBreaker({
      ...circuitBreakerConfig,
      name: 'InventoryService',
    });

    this.notificationCircuitBreaker = new CircuitBreaker({
      ...circuitBreakerConfig,
      name: 'NotificationService',
    });
  }

  /**
   * Inicia el procesamiento de una orden
   */
  async startOrderProcessing(order: Order): Promise<SagaStateEntity> {
    this.logger.log(`Starting saga for order ${order.id}`);

    // Load items relation
    const items = await order.items;

    const stateData: SagaStateData = {
      orderId: order.id,
      userId: order.userId,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: Number(item.unitPrice),
      })),
      totalAmount: Number(order.totalAmount),
      currency: order.currency,
      startedAt: new Date(),
    };

    const sagaState = this.sagaStateRepository.create({
      sagaType: SagaType.ORDER_PROCESSING,
      aggregateId: order.id,
      correlationId: `saga-${order.id}-${Date.now()}`,
      currentStep: SagaStep.STARTED,
      status: SagaStatus.STARTED,
      stateData: stateData as unknown as Record<string, unknown>,
      retryCount: 0,
    });

    return await this.sagaStateRepository.save(sagaState);
  }

  /**
   * Ejecuta el saga completo step by step
   */
  async executeSaga(sagaId: string): Promise<SagaMetrics> {
    const startTime = Date.now();
    const stepMetrics: SagaMetrics['stepMetrics'] = [];
    const sagaState = await this.sagaStateRepository.findOne({
      where: { id: sagaId },
    });

    if (!sagaState) {
      throw new Error(`Saga state not found: ${sagaId}`);
    }

    this.logger.log(`Executing saga ${sagaId} for order ${sagaState.aggregateId}`);

    try {
      // Update saga status to RUNNING
      sagaState.status = SagaStatus.RUNNING;
      await this.sagaStateRepository.save(sagaState);

      // Step 1: Verify Stock
      const stockVerificationResult = await this.executeStep(
        sagaState,
        SagaStep.STOCK_VERIFIED,
        () => this.verifyStock(sagaState!),
      );
      stepMetrics.push(stockVerificationResult);

      if (!stockVerificationResult.success) {
        await this.compensate(sagaState, CompensationAction.CANCEL_ORDER);
        return this.buildMetrics(sagaState, stepMetrics, startTime, 'COMPENSATED');
      }

      // Step 2: Reserve Inventory
      const reservationResult = await this.executeStep(sagaState, SagaStep.STOCK_RESERVED, () =>
        this.reserveInventory(sagaState!),
      );
      stepMetrics.push(reservationResult);

      if (!reservationResult.success) {
        await this.compensate(sagaState, CompensationAction.CANCEL_ORDER);
        return this.buildMetrics(sagaState, stepMetrics, startTime, 'COMPENSATED');
      }

      // Step 3: Process Payment
      const paymentResult = await this.executeStep(sagaState, SagaStep.PAYMENT_PROCESSING, () =>
        this.processPayment(sagaState!),
      );
      stepMetrics.push(paymentResult);

      if (!paymentResult.success) {
        await this.compensate(sagaState, CompensationAction.RELEASE_INVENTORY);
        await this.compensate(sagaState, CompensationAction.CANCEL_ORDER);
        return this.buildMetrics(sagaState, stepMetrics, startTime, 'COMPENSATED');
      }

      // Step 4: Mark payment as completed
      sagaState.currentStep = SagaStep.PAYMENT_COMPLETED;
      await this.sagaStateRepository.save(sagaState);

      // Step 5: Send Notification (non-critical, don't fail saga if it fails)
      const notificationResult = await this.executeStep(sagaState, SagaStep.NOTIFICATION_SENT, () =>
        this.sendNotification(sagaState!),
      );
      stepMetrics.push(notificationResult);

      // Step 6: Confirm Order
      const confirmResult = await this.executeStep(sagaState, SagaStep.CONFIRMED, () =>
        this.confirmOrder(sagaState!),
      );
      stepMetrics.push(confirmResult);

      // Mark saga as completed
      sagaState.status = SagaStatus.COMPLETED;
      sagaState.completedAt = new Date();
      await this.sagaStateRepository.save(sagaState);

      this.logger.log(`Saga ${sagaId} completed successfully`);

      return this.buildMetrics(sagaState, stepMetrics, startTime, 'COMPLETED');
    } catch (error) {
      this.logger.error(`Saga ${sagaId} failed with error:`, error);

      sagaState.status = SagaStatus.FAILED;
      sagaState.failedAt = new Date();
      sagaState.errorDetails =
        error instanceof Error ? `${error.message}\n${error.stack || ''}` : String(error);
      await this.sagaStateRepository.save(sagaState);

      return this.buildMetrics(sagaState, stepMetrics, startTime, 'FAILED');
    }
  }

  /**
   * Ejecuta un step del saga con retry y timeout
   */
  private async executeStep(
    sagaState: SagaStateEntity,
    step: SagaStep,
    fn: () => Promise<SagaStepResult>,
  ): Promise<SagaMetrics['stepMetrics'][0]> {
    const stepStartTime = Date.now();
    let retryCount = 0;
    let lastError: Error | null = null;

    this.logger.debug(`Executing step ${step} for saga ${sagaState.id}`);

    while (retryCount <= this.config.maxRetries) {
      try {
        const result = await this.executeWithTimeout(fn, this.config.timeoutMs);

        if (result.success) {
          // Update saga state
          sagaState.currentStep = step;
          const stateData = sagaState.stateData as unknown as SagaStateData;
          stateData.lastStepAt = new Date();
          sagaState.stateData = stateData as unknown as Record<string, unknown>;

          // Merge step result data into state
          if (result.data) {
            Object.assign(sagaState.stateData, result.data);
          }

          await this.sagaStateRepository.save(sagaState);

          return {
            step,
            durationMs: Date.now() - stepStartTime,
            retryCount,
            success: true,
          };
        }

        // Step failed but might be retryable
        if (!result.error?.retryable || retryCount >= this.config.maxRetries) {
          this.logger.error(`Step ${step} failed permanently: ${result.error?.message}`);
          return {
            step,
            durationMs: Date.now() - stepStartTime,
            retryCount,
            success: false,
          };
        }

        // Retry with exponential backoff
        lastError = new Error(result.error.message);
        retryCount++;
        const delayMs = this.calculateRetryDelay(retryCount);
        this.logger.warn(
          `Step ${step} failed, retrying in ${delayMs}ms (attempt ${retryCount}/${this.config.maxRetries})`,
        );
        await this.sleep(delayMs);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        retryCount++;

        if (retryCount > this.config.maxRetries) {
          this.logger.error(`Step ${step} failed after ${retryCount} retries`, error);
          return {
            step,
            durationMs: Date.now() - stepStartTime,
            retryCount: retryCount - 1,
            success: false,
          };
        }

        const delayMs = this.calculateRetryDelay(retryCount);
        this.logger.warn(
          `Step ${step} threw error, retrying in ${delayMs}ms (attempt ${retryCount}/${this.config.maxRetries})`,
        );
        await this.sleep(delayMs);
      }
    }

    throw lastError || new Error(`Step ${step} failed after retries`);
  }

  /**
   * Verifica disponibilidad de stock
   */
  private async verifyStock(sagaState: SagaStateEntity): Promise<SagaStepResult> {
    const startTime = Date.now();
    const stateData = sagaState.stateData as unknown as SagaStateData;

    try {
      const result = await this.inventoryCircuitBreaker.execute(async () => {
        for (const item of stateData.items) {
          const stockInfo = await this.inventoryService.checkAvailability({
            productId: item.productId,
            quantity: item.quantity,
          });

          if (stockInfo.availableStock < item.quantity) {
            return {
              verified: false,
              unavailableProducts: [item.productId],
            };
          }
        }

        return { verified: true };
      });

      if (!result.verified) {
        this.logger.warn(
          `Stock verification failed for order ${stateData.orderId}: ` +
            `products ${result.unavailableProducts?.join(', ')} not available`,
        );

        return {
          success: false,
          stepName: SagaStep.STOCK_VERIFIED,
          error: {
            message: 'Insufficient stock',
            code: 'INSUFFICIENT_STOCK',
            retryable: false,
          },
          executionTimeMs: Date.now() - startTime,
        };
      }

      return {
        success: true,
        stepName: SagaStep.STOCK_VERIFIED,
        data: { stockVerificationResult: result },
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        stepName: SagaStep.STOCK_VERIFIED,
        error: {
          message: error instanceof Error ? error.message : String(error),
          retryable: true,
        },
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Reserva inventario temporalmente
   */
  private async reserveInventory(sagaState: SagaStateEntity): Promise<SagaStepResult> {
    const startTime = Date.now();
    const stateData = sagaState.stateData as unknown as SagaStateData;

    try {
      const reservationId = await this.inventoryCircuitBreaker.execute(async () => {
        const id = `res-${stateData.orderId}-${Date.now()}`;

        for (const item of stateData.items) {
          await this.inventoryService.reserveStock({
            productId: item.productId,
            quantity: item.quantity,
            reservationId: id,
            referenceId: stateData.orderId,
            reason: 'Order processing',
            ttlMinutes: 30,
          });
        }

        return id;
      });

      this.logger.log(`Inventory reserved for order ${stateData.orderId}: ${reservationId}`);

      return {
        success: true,
        stepName: SagaStep.STOCK_RESERVED,
        data: { reservationId },
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        stepName: SagaStep.STOCK_RESERVED,
        error: {
          message: error instanceof Error ? error.message : String(error),
          retryable: true,
        },
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Procesa el pago
   */
  private async processPayment(sagaState: SagaStateEntity): Promise<SagaStepResult> {
    const startTime = Date.now();
    const stateData = sagaState.stateData as unknown as SagaStateData;

    try {
      const paymentResult = await this.paymentCircuitBreaker.execute(async () => {
        return await this.paymentsService.processPayment({
          orderId: stateData.orderId,
          amount: stateData.totalAmount,
          currency: stateData.currency,
          paymentMethod: PaymentMethod.CREDIT_CARD,
        });
      });

      if (paymentResult.status !== PaymentStatus.SUCCEEDED) {
        this.logger.warn(`Payment failed for order ${stateData.orderId}: ${paymentResult.status}`);

        return {
          success: false,
          stepName: SagaStep.PAYMENT_PROCESSING,
          error: {
            message: `Payment failed: ${paymentResult.status}`,
            code: 'PAYMENT_FAILED',
            retryable: false,
          },
          data: {
            paymentResult: {
              success: false,
              failureReason: paymentResult.status,
            },
          },
          executionTimeMs: Date.now() - startTime,
        };
      }

      this.logger.log(
        `Payment processed successfully for order ${stateData.orderId}: ${paymentResult.paymentId}`,
      );

      return {
        success: true,
        stepName: SagaStep.PAYMENT_PROCESSING,
        data: {
          paymentId: paymentResult.paymentId,
          paymentResult: {
            success: true,
            transactionId: paymentResult.transactionId,
          },
        },
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        stepName: SagaStep.PAYMENT_PROCESSING,
        error: {
          message: error instanceof Error ? error.message : String(error),
          retryable: true,
        },
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Envía notificación de confirmación
   */
  private async sendNotification(sagaState: SagaStateEntity): Promise<SagaStepResult> {
    const startTime = Date.now();
    const stateData = sagaState.stateData as unknown as SagaStateData;

    try {
      await this.notificationCircuitBreaker.execute(async () => {
        await this.notificationsService.sendOrderConfirmation(stateData.userId, {
          orderId: stateData.orderId,
          orderNumber: stateData.orderId,
          totalAmount: stateData.totalAmount,
          currency: stateData.currency,
          items: stateData.items,
        });
      });

      this.logger.log(`Notification sent for order ${stateData.orderId}`);

      return {
        success: true,
        stepName: SagaStep.NOTIFICATION_SENT,
        data: {
          notificationResult: { sent: true },
        },
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      // Notification failure is non-critical, log and continue
      this.logger.warn(
        `Notification failed for order ${stateData.orderId}, but continuing saga`,
        error,
      );

      return {
        success: true, // Don't fail saga due to notification
        stepName: SagaStep.NOTIFICATION_SENT,
        data: {
          notificationResult: {
            sent: false,
            failureReason: error instanceof Error ? error.message : String(error),
          },
        },
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Confirma la orden
   */
  private async confirmOrder(sagaState: SagaStateEntity): Promise<SagaStepResult> {
    const startTime = Date.now();
    const stateData = sagaState.stateData as unknown as SagaStateData;

    try {
      const order = await this.orderRepository.findOne({
        where: { id: stateData.orderId },
      });

      if (!order) {
        throw new Error(`Order not found: ${stateData.orderId}`);
      }

      order.status = OrderStatus.CONFIRMED;
      order.completedAt = new Date();
      order.paymentId = stateData.paymentId;
      await this.orderRepository.save(order);

      this.logger.log(`Order ${stateData.orderId} confirmed successfully`);

      return {
        success: true,
        stepName: SagaStep.CONFIRMED,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        stepName: SagaStep.CONFIRMED,
        error: {
          message: error instanceof Error ? error.message : String(error),
          retryable: true,
        },
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Ejecuta compensación en caso de fallo
   */
  private async compensate(sagaState: SagaStateEntity, action: CompensationAction): Promise<void> {
    const stateData = sagaState.stateData as unknown as SagaStateData;

    this.logger.warn(`Executing compensation ${action} for saga ${sagaState.id}`);

    try {
      switch (action) {
        case CompensationAction.RELEASE_INVENTORY:
          if (stateData.reservationId) {
            for (const item of stateData.items) {
              await this.inventoryService.releaseReservation({
                reservationId: stateData.reservationId,
                productId: item.productId,
                quantity: item.quantity,
              });
            }
            this.logger.log(`Released inventory reservation ${stateData.reservationId}`);
          }
          break;

        case CompensationAction.CANCEL_ORDER:
          const order = await this.orderRepository.findOne({
            where: { id: stateData.orderId },
          });
          if (order) {
            order.status = OrderStatus.CANCELLED;
            order.failedAt = new Date();
            order.failureReason = 'Order processing failed during saga';
            await this.orderRepository.save(order);
            this.logger.log(`Order ${stateData.orderId} cancelled`);
          }
          break;

        case CompensationAction.REFUND_PAYMENT:
          if (stateData.paymentId) {
            await this.paymentsService.refundPayment({
              paymentId: stateData.paymentId,
              amount: stateData.totalAmount,
              reason: 'Order processing failed',
            });
            this.logger.log(`Refunded payment ${stateData.paymentId}`);
          }
          break;

        case CompensationAction.NOTIFY_FAILURE:
          await this.notificationsService.sendPaymentFailure(stateData.userId, {
            orderId: stateData.orderId,
            orderNumber: stateData.orderId,
            reason: 'Order processing failed',
          });
          this.logger.log(`Sent failure notification for order ${stateData.orderId}`);
          break;
      }

      // Track compensation
      if (!stateData.compensationExecuted) {
        stateData.compensationExecuted = [];
      }
      stateData.compensationExecuted.push(action);
      sagaState.stateData = stateData as unknown as Record<string, unknown>;

      sagaState.status = SagaStatus.COMPENSATED;
      // Note: compensatedAt field doesn't exist in saga_states table
      await this.sagaStateRepository.save(sagaState);
    } catch (error) {
      this.logger.error(`Compensation ${action} failed for saga ${sagaState.id}`, error);
      // Don't throw, log and continue
    }
  }

  /**
   * Construye métricas del saga
   */
  private buildMetrics(
    sagaState: SagaStateEntity,
    stepMetrics: SagaMetrics['stepMetrics'],
    startTime: number,
    finalStatus: SagaMetrics['finalStatus'],
  ): SagaMetrics {
    const stateData = sagaState.stateData as unknown as SagaStateData;

    return {
      sagaId: sagaState.id,
      orderId: stateData.orderId,
      totalDurationMs: Date.now() - startTime,
      stepMetrics,
      compensationExecuted: !!stateData.compensationExecuted?.length,
      finalStatus,
    };
  }

  /**
   * Ejecuta función con timeout
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs),
      ),
    ]);
  }

  /**
   * Calcula delay para retry con exponential backoff y jitter
   */
  private calculateRetryDelay(retryCount: number): number {
    const exponentialDelay = this.config.retryDelayMs * Math.pow(2, retryCount - 1);
    const cappedDelay = Math.min(exponentialDelay, this.config.maxRetryDelayMs);

    if (this.config.jitterEnabled) {
      // Add random jitter (0-50% of delay)
      const jitter = Math.random() * cappedDelay * 0.5;
      return cappedDelay + jitter;
    }

    return cappedDelay;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get circuit breaker stats
   */
  getCircuitBreakerStats() {
    return {
      payment: this.paymentCircuitBreaker.getStats(),
      inventory: this.inventoryCircuitBreaker.getStats(),
      notification: this.notificationCircuitBreaker.getStats(),
    };
  }
}
