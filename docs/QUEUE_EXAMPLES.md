# Ejemplos de Uso - Sistema de Colas

Este documento proporciona ejemplos prácticos de cómo usar el sistema de colas en diferentes escenarios.

## 📦 Ejemplo 1: Crear y Procesar una Orden

### Paso 1: Crear la Orden (Controller)

```typescript
// src/modules/orders/orders.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  async createOrder(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.createOrder(createOrderDto);
  }
}
```

### Paso 2: Implementar el Servicio

```typescript
// src/modules/orders/orders.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { QueueService } from '../../queues/queue.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly queueService: QueueService,
  ) {}

  async createOrder(createOrderDto: CreateOrderDto) {
    // 1. Crear orden en DB con estado PENDING
    const order = this.orderRepository.create({
      ...createOrderDto,
      status: 'PENDING',
      total: this.calculateTotal(createOrderDto.items),
    });

    const savedOrder = await this.orderRepository.save(order);

    // 2. Agregar job a la cola de procesamiento
    await this.queueService.addOrderJob('create-order', {
      jobId: `order-${savedOrder.id}`,
      orderId: savedOrder.id,
      userId: createOrderDto.userId,
      items: createOrderDto.items,
      totalAmount: savedOrder.total,
      currency: 'USD',
      shippingAddress: createOrderDto.shippingAddress,
      idempotencyKey: createOrderDto.idempotencyKey,
      createdAt: new Date(),
    });

    // 3. Retornar respuesta inmediata
    return {
      orderId: savedOrder.id,
      status: 'PENDING',
      message: 'Order created successfully and is being processed',
      estimatedProcessingTime: '2-5 minutes',
    };
  }

  private calculateTotal(items: any[]): number {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }
}
```

### Paso 3: El Processor Maneja el Job

```typescript
// El OrderProcessingProcessor ya está implementado y procesará automáticamente:
// 1. Validar orden
// 2. Reservar inventario
// 3. Procesar pago
// 4. Confirmar orden
// 5. Enviar notificaciones
```

## 💳 Ejemplo 2: Procesar un Pago

```typescript
// src/modules/payments/payments.service.ts
import { Injectable } from '@nestjs/common';
import { QueueService } from '../../queues/queue.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly queueService: QueueService) {}

  async authorizePayment(orderId: string, paymentDetails: any) {
    // Agregar job de autorización de pago con prioridad alta
    const job = await this.queueService.addPaymentJob(
      'authorize-payment',
      {
        jobId: `payment-auth-${orderId}`,
        orderId,
        amount: paymentDetails.amount,
        currency: paymentDetails.currency,
        paymentMethod: paymentDetails.method,
        cardToken: paymentDetails.cardToken,
        gatewayConfig: {
          provider: 'stripe',
          merchantId: process.env.STRIPE_MERCHANT_ID,
        },
        createdAt: new Date(),
      },
      {
        priority: 1, // Alta prioridad
        attempts: 3,
      },
    );

    return {
      paymentId: job.id,
      status: 'AUTHORIZING',
      message: 'Payment authorization in progress',
    };
  }

  async capturePayment(orderId: string, authorizationId: string) {
    await this.queueService.addPaymentJob('capture-payment', {
      jobId: `payment-capture-${orderId}`,
      orderId,
      authorizationId,
      createdAt: new Date(),
    });

    return { status: 'CAPTURING' };
  }

  async refundPayment(orderId: string, amount: number, reason: string) {
    await this.queueService.addPaymentJob('refund-payment', {
      jobId: `payment-refund-${orderId}`,
      orderId,
      amount,
      reason,
      createdAt: new Date(),
    });

    return { status: 'REFUND_PENDING' };
  }
}
```

## 📊 Ejemplo 3: Gestión de Inventario

```typescript
// src/modules/inventory/inventory.service.ts
import { Injectable } from '@nestjs/common';
import { QueueService } from '../../queues/queue.service';

@Injectable()
export class InventoryService {
  constructor(private readonly queueService: QueueService) {}

  async reserveInventory(orderId: string, items: any[]) {
    const job = await this.queueService.addInventoryJob('reserve-inventory', {
      jobId: `inventory-reserve-${orderId}`,
      orderId,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        warehouseId: item.warehouseId || 'default',
      })),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutos
      createdAt: new Date(),
    });

    return {
      reservationId: job.id,
      status: 'RESERVING',
      expiresIn: '15 minutes',
    };
  }

  async confirmInventory(orderId: string) {
    await this.queueService.addInventoryJob('confirm-inventory', {
      jobId: `inventory-confirm-${orderId}`,
      orderId,
      createdAt: new Date(),
    });
  }

  async releaseInventory(orderId: string) {
    await this.queueService.addInventoryJob('release-inventory', {
      jobId: `inventory-release-${orderId}`,
      orderId,
      reason: 'ORDER_CANCELLED',
      createdAt: new Date(),
    });
  }

  // Job programado para reponer inventario bajo
  async scheduleInventoryReplenishment(productId: string, quantity: number) {
    await this.queueService.addInventoryJob(
      'replenish-inventory',
      {
        jobId: `inventory-replenish-${productId}-${Date.now()}`,
        productId,
        quantity,
        warehouseId: 'default',
        createdAt: new Date(),
      },
      {
        delay: 60000, // Esperar 1 minuto antes de procesar
      },
    );
  }
}
```

## 📧 Ejemplo 4: Enviar Notificaciones

```typescript
// src/modules/notifications/notifications.service.ts
import { Injectable } from '@nestjs/common';
import { QueueService } from '../../queues/queue.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly queueService: QueueService) {}

  async sendOrderConfirmationEmail(orderId: string, userEmail: string) {
    await this.queueService.addNotificationJob('send-email', {
      jobId: `email-order-confirm-${orderId}`,
      recipient: userEmail,
      type: 'order-confirmation',
      templateId: 'order_confirmation_v1',
      data: {
        orderId,
        orderUrl: `https://yourapp.com/orders/${orderId}`,
      },
      priority: 'high',
      createdAt: new Date(),
    });
  }

  async sendPaymentFailedNotification(orderId: string, userId: string) {
    // Enviar email y push notification en paralelo
    const jobPromises = [
      this.queueService.addNotificationJob('send-email', {
        jobId: `email-payment-failed-${orderId}`,
        recipient: userId,
        type: 'payment-failed',
        templateId: 'payment_failed_v1',
        data: { orderId },
        priority: 'high',
        createdAt: new Date(),
      }),
      this.queueService.addNotificationJob('send-push', {
        jobId: `push-payment-failed-${orderId}`,
        recipient: userId,
        type: 'payment-failed',
        data: { orderId },
        priority: 'high',
        createdAt: new Date(),
      }),
    ];

    await Promise.all(jobPromises);
  }

  async sendBulkPromotionalEmails(
    userIds: string[],
    promotionId: string,
    delayMinutes: number = 0,
  ) {
    const delay = delayMinutes * 60 * 1000;

    // Agregar múltiples jobs con delay
    const jobPromises = userIds.map((userId) =>
      this.queueService.addNotificationJob(
        'send-email',
        {
          jobId: `promo-${promotionId}-${userId}`,
          recipient: userId,
          type: 'promotional',
          templateId: 'promotion_v1',
          data: { promotionId },
          priority: 'low',
          createdAt: new Date(),
        },
        {
          delay,
          priority: 3, // Baja prioridad
        },
      ),
    );

    await Promise.all(jobPromises);

    return {
      totalEmails: userIds.length,
      status: 'SCHEDULED',
      scheduledFor: new Date(Date.now() + delay),
    };
  }
}
```

## 📊 Ejemplo 5: Monitoreo y Métricas

```typescript
// src/modules/admin/queue-monitoring.controller.ts
import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { QueueService } from '../../queues/queue.service';

@Controller('admin/queue-monitoring')
export class QueueMonitoringController {
  constructor(private readonly queueService: QueueService) {}

  @Get('metrics')
  async getMetrics() {
    return this.queueService.getAllQueueMetrics();
  }

  @Get('metrics/:queueName')
  async getQueueMetrics(@Param('queueName') queueName: string) {
    return this.queueService.getQueueMetrics(queueName);
  }

  @Post(':queueName/pause')
  async pauseQueue(@Param('queueName') queueName: string) {
    await this.queueService.pauseQueue(queueName);
    return { message: `Queue ${queueName} paused successfully` };
  }

  @Post(':queueName/resume')
  async resumeQueue(@Param('queueName') queueName: string) {
    await this.queueService.resumeQueue(queueName);
    return { message: `Queue ${queueName} resumed successfully` };
  }

  @Post(':queueName/clean')
  async cleanQueue(@Param('queueName') queueName: string, @Query('grace') grace: number = 3600000) {
    await this.queueService.cleanQueue(queueName, grace);
    return { message: `Queue ${queueName} cleaned` };
  }
}
```

## 🔄 Ejemplo 6: Saga Pattern - Orden Completa

```typescript
// src/modules/orders/order-saga.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { QueueService } from '../../queues/queue.service';

@Injectable()
export class OrderSagaService {
  private readonly logger = new Logger(OrderSagaService.name);

  constructor(private readonly queueService: QueueService) {}

  /**
   * Orquesta el proceso completo de una orden:
   * 1. Reservar inventario
   * 2. Procesar pago
   * 3. Confirmar inventario
   * 4. Enviar notificaciones
   *
   * Si algún paso falla, ejecuta compensación (rollback)
   */
  async processOrderSaga(orderId: string, orderData: any) {
    try {
      // Paso 1: Reservar inventario
      this.logger.log(`Starting order saga for order ${orderId}`);

      await this.queueService.addInventoryJob('reserve-inventory', {
        jobId: `saga-inventory-${orderId}`,
        orderId,
        items: orderData.items,
        correlationId: `saga-${orderId}`,
        createdAt: new Date(),
      });

      // Paso 2: Procesar pago (espera a que inventario esté reservado)
      await this.queueService.addPaymentJob(
        'authorize-payment',
        {
          jobId: `saga-payment-${orderId}`,
          orderId,
          amount: orderData.totalAmount,
          currency: orderData.currency,
          correlationId: `saga-${orderId}`,
          createdAt: new Date(),
        },
        {
          delay: 2000, // Esperar 2 segundos para que inventario se reserve
        },
      );

      // Paso 3: Confirmar inventario (después del pago)
      await this.queueService.addInventoryJob(
        'confirm-inventory',
        {
          jobId: `saga-confirm-${orderId}`,
          orderId,
          correlationId: `saga-${orderId}`,
          createdAt: new Date(),
        },
        {
          delay: 5000, // Esperar 5 segundos
        },
      );

      // Paso 4: Notificaciones de éxito
      await this.queueService.addNotificationJob(
        'send-email',
        {
          jobId: `saga-notification-${orderId}`,
          recipient: orderData.userEmail,
          type: 'order-success',
          data: { orderId },
          correlationId: `saga-${orderId}`,
          createdAt: new Date(),
        },
        {
          delay: 7000, // Esperar 7 segundos
        },
      );

      this.logger.log(`Order saga initiated successfully for order ${orderId}`);
    } catch (error) {
      this.logger.error(`Saga failed for order ${orderId}`, error);
      await this.compensateOrder(orderId);
    }
  }

  /**
   * Compensación: Revertir cambios si algo falla
   */
  private async compensateOrder(orderId: string) {
    this.logger.warn(`Compensating order ${orderId}`);

    // Liberar inventario
    await this.queueService.addInventoryJob('release-inventory', {
      jobId: `compensate-inventory-${orderId}`,
      orderId,
      reason: 'SAGA_FAILED',
      createdAt: new Date(),
    });

    // Reembolsar pago si fue procesado
    await this.queueService.addPaymentJob('refund-payment', {
      jobId: `compensate-payment-${orderId}`,
      orderId,
      reason: 'Order processing failed',
      createdAt: new Date(),
    });

    // Notificar al usuario
    await this.queueService.addNotificationJob('send-email', {
      jobId: `compensate-notification-${orderId}`,
      recipient: 'user-email',
      type: 'order-failed',
      data: { orderId },
      priority: 'high',
      createdAt: new Date(),
    });
  }
}
```

## 🧪 Ejemplo 7: Testing

```typescript
// src/queues/processors/order-processing.processor.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bull';
import { OrderProcessingProcessor } from './order-processing.processor';

describe('OrderProcessingProcessor', () => {
  let processor: OrderProcessingProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderProcessingProcessor],
    }).compile();

    processor = module.get<OrderProcessingProcessor>(OrderProcessingProcessor);
  });

  describe('processJob - create-order', () => {
    it('should process order successfully', async () => {
      const mockJob: Partial<Job> = {
        id: '1',
        name: 'create-order',
        data: {
          jobId: 'order-123',
          orderId: '123',
          userId: 'user-456',
          items: [{ productId: 'prod-1', quantity: 2 }],
          totalAmount: 100,
          currency: 'USD',
          createdAt: new Date(),
        },
        attemptsMade: 0,
        opts: { attempts: 3 },
        progress: jest.fn(),
      };

      const result = await processor.handleJob(mockJob as Job);

      expect(result.success).toBe(true);
      expect(result.data.orderId).toBe('123');
      expect(mockJob.progress).toHaveBeenCalledTimes(4); // 4 pasos de progreso
    });

    it('should handle errors and retry', async () => {
      const mockJob: Partial<Job> = {
        id: '2',
        name: 'create-order',
        data: {
          jobId: 'order-456',
          orderId: '456',
          // ... missing required fields
        },
        attemptsMade: 0,
        opts: { attempts: 3 },
        progress: jest.fn(),
      };

      await expect(processor.handleJob(mockJob as Job)).rejects.toThrow();
    });
  });
});
```

## 🔧 Ejemplo 8: Health Check para Colas

```typescript
// src/health/queue-health.indicator.ts
import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { QueueService } from '../queues/queue.service';

@Injectable()
export class QueueHealthIndicator extends HealthIndicator {
  constructor(private readonly queueService: QueueService) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    try {
      const metrics = await this.queueService.getAllQueueMetrics();

      // Verificar que no haya demasiados jobs fallidos
      const hasIssues = metrics.some((metric) => metric.failed > 50 || metric.waiting > 1000);

      if (hasIssues) {
        throw new HealthCheckError(
          'Queue health check failed',
          this.getStatus('queues', false, { metrics }),
        );
      }

      return this.getStatus('queues', true, { metrics });
    } catch (error) {
      throw new HealthCheckError(
        'Queue health check failed',
        this.getStatus('queues', false, { error: error.message }),
      );
    }
  }
}
```

## 🎯 Tips y Best Practices

### 1. Usar Job IDs Únicos para Idempotencia

```typescript
// ✅ CORRECTO: Job ID único previene duplicados
await queueService.addOrderJob('create-order', data, {
  jobId: `order-${orderId}-${Date.now()}`,
});

// ❌ INCORRECTO: Sin job ID, puede procesar duplicados
await queueService.addOrderJob('create-order', data);
```

### 2. Configurar Prioridades Apropiadas

```typescript
// Pagos = Alta prioridad
await queueService.addPaymentJob('authorize-payment', data, {
  priority: 1,
});

// Notificaciones promocionales = Baja prioridad
await queueService.addNotificationJob('send-email', data, {
  priority: 3,
});
```

### 3. Usar Delays para Coordinación

```typescript
// Procesar inventario primero
await queueService.addInventoryJob('reserve-inventory', data);

// Luego procesar pago (después de 2 segundos)
await queueService.addPaymentJob('authorize-payment', data, {
  delay: 2000,
});
```

### 4. Monitorear Métricas Regularmente

```typescript
// Configurar cron job para revisar métricas cada 5 minutos
@Cron('*/5 * * * *')
async checkQueueHealth() {
  const metrics = await this.queueService.getAllQueueMetrics();

  for (const metric of metrics) {
    if (metric.failed > 100) {
      this.logger.error(`Queue ${metric.queueName} has ${metric.failed} failed jobs`);
      // Enviar alerta
    }
  }
}
```

## 📚 Referencias

- [Documentación de Colas](./QUEUES.md)
- [Bull Documentation](https://optimalbits.github.io/bull/)
- [Saga Pattern Explained](https://microservices.io/patterns/data/saga.html)
