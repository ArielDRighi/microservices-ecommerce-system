# Sistema de Colas con Redis y Bull

Este módulo implementa un sistema robusto de colas asíncronas usando Redis y Bull para procesamiento de tareas en background.

## 📋 Características

- ✅ **4 Colas Especializadas**: Order Processing, Payment Processing, Inventory Management, Notification Sending
- ✅ **Retry Exponencial**: Política de reintentos con backoff exponencial
- ✅ **Dead Letter Queue**: Manejo de jobs fallidos
- ✅ **Rate Limiting**: Control de throughput por cola
- ✅ **Progress Tracking**: Seguimiento de progreso de jobs
- ✅ **Bull Board Dashboard**: UI web para monitoreo
- ✅ **Graceful Shutdown**: Cierre controlado esperando jobs activos
- ✅ **Job Deduplication**: Prevención de jobs duplicados
- ✅ **Métricas y Monitoring**: Logs estructurados y métricas

## 🏗️ Arquitectura

```
src/queues/
├── processors/                 # Procesadores de jobs
│   ├── base.processor.ts      # Clase base con error handling y logging
│   ├── order-processing.processor.ts
│   ├── payment.processor.ts
│   ├── inventory.processor.ts
│   └── notification.processor.ts
├── queue.module.ts            # Módulo centralizado de colas
├── queue.service.ts           # Servicio helper para gestionar colas
└── bull-board.controller.ts   # Controlador del dashboard Bull Board
```

## 🚀 Cómo Usar

### 1. Inyectar QueueService

```typescript
import { Injectable } from '@nestjs/common';
import { QueueService } from './queues/queue.service';

@Injectable()
export class OrderService {
  constructor(private readonly queueService: QueueService) {}

  async createOrder(orderData: CreateOrderDto) {
    // Crear orden en base de datos...

    // Agregar job a la cola de procesamiento
    await this.queueService.addOrderJob('create-order', {
      jobId: `order-${orderId}`,
      orderId,
      userId: orderData.userId,
      items: orderData.items,
      totalAmount: total,
      currency: 'USD',
      idempotencyKey: orderData.idempotencyKey,
      createdAt: new Date(),
    });

    return { orderId, status: 'PENDING' };
  }
}
```

### 2. Opciones Avanzadas de Jobs

```typescript
// Job con prioridad alta
await this.queueService.addPaymentJob('authorize-payment', paymentData, {
  priority: 1, // Menor número = mayor prioridad
  attempts: 5,
});

// Job con delay (procesamiento diferido)
await this.queueService.addNotificationJob('send-email', emailData, {
  delay: 60000, // Esperar 1 minuto antes de procesar
});
```

### 3. Monitorear Colas

```typescript
// Obtener métricas de todas las colas
const metrics = await this.queueService.getAllQueueMetrics();

// Métricas de una cola específica
const orderMetrics = await this.queueService.getQueueMetrics('order-processing');

console.log(orderMetrics);
// {
//   queueName: 'order-processing',
//   waiting: 10,
//   active: 2,
//   completed: 150,
//   failed: 3,
//   delayed: 0,
//   paused: false,
//   timestamp: Date
// }
```

### 4. Gestión de Colas

```typescript
// Pausar una cola
await this.queueService.pauseQueue('payment-processing');

// Reanudar una cola
await this.queueService.resumeQueue('payment-processing');

// Limpiar jobs completados
await this.queueService.cleanQueue('order-processing', 3600000); // 1 hora

// Vaciar completamente una cola
await this.queueService.emptyQueue('notification-sending');
```

## 🎛️ Dashboard Bull Board

Accede al dashboard de monitoreo en:

```
http://localhost:3000/admin/queues
```

El dashboard proporciona:

- Estado en tiempo real de todas las colas
- Detalles de jobs (waiting, active, completed, failed)
- Reintentar jobs fallidos manualmente
- Inspeccionar datos y errores de jobs
- Estadísticas y métricas visuales

## ⚙️ Configuración

### Variables de Entorno

```bash
# Redis Connection
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=ecommerce:

# Bull Configuration
BULL_REDIS_DB=1                    # Usar DB diferente para Bull
BULL_KEY_PREFIX=bull
BULL_DEFAULT_ATTEMPTS=3
BULL_REMOVE_ON_COMPLETE=100
BULL_REMOVE_ON_FAIL=50

# Rate Limiting (opcional)
BULL_RATE_LIMIT=true
BULL_RATE_LIMIT_MAX=100
BULL_RATE_LIMIT_DURATION=1000
```

### Configuración por Cola

Las colas tienen configuraciones específicas en `src/config/redis.config.ts`:

```typescript
export const queueConfigs: Record<string, QueueConfig> = {
  'order-processing': {
    limiter: { max: 50, duration: 1000 }, // 50 jobs/segundo
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 3000 },
    },
  },
  'payment-processing': {
    limiter: { max: 20, duration: 1000 }, // 20 jobs/segundo
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    },
  },
  // ... más configuraciones
};
```

## 🔄 Retry Policy

Los jobs fallidos se reintentan automáticamente con backoff exponencial:

1. **Intento 1**: Inmediato (delay configurado en queue config)
2. **Intento 2**: 2× delay
3. **Intento 3**: 4× delay
4. **Intento 4**: 8× delay
5. **Dead Letter**: Si excede intentos máximos

### Errores Retryables vs No Retryables

Los processors distinguen entre errores temporales y permanentes:

```typescript
// Errores temporales (retryables)
- ECONNRESET, ETIMEDOUT
- NetworkError, TimeoutError
- GATEWAY_TIMEOUT

// Errores permanentes (no retryables)
- Validation errors
- INVALID_RECIPIENT
- INVALID_TEMPLATE
```

## 📊 Progress Tracking

Los jobs pueden reportar su progreso:

```typescript
// En un processor
await this.updateProgress(job, {
  percentage: 50,
  message: 'Processing payment',
  currentStep: 'gateway-communication',
  data: { transactionId: '12345' },
});
```

## 🛡️ Job Deduplication (Idempotencia)

Prevenir jobs duplicados usando job IDs únicos:

```typescript
const jobId = `order-${orderId}`;

await this.queueService.addOrderJob(
  'create-order',
  {
    jobId, // Si ya existe un job con este ID, se ignora
    // ... data
  },
  {
    jobId, // También configurar en options
  },
);
```

## 🔧 Graceful Shutdown

El sistema espera que los jobs activos terminen antes de cerrar:

```typescript
// En tu main.ts
async function shutdown() {
  const queueService = app.get(QueueService);
  await queueService.gracefulShutdown(30000); // Esperar máx 30s
  await app.close();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

## 📝 Logging

Todos los processors heredan logging estructurado:

```typescript
// Logs automáticos
- Job started: { jobId, jobName, attempt, data }
- Job progress: { jobId, percentage, message }
- Job completed: { jobId, duration, result }
- Job failed: { jobId, error, stack, attemptsMade }
- Dead letter: { jobId, error, data }
```

## 🧪 Testing

Ejemplo de test para un processor:

```typescript
import { Test } from '@nestjs/testing';
import { OrderProcessingProcessor } from './processors';

describe('OrderProcessingProcessor', () => {
  let processor: OrderProcessingProcessor;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [OrderProcessingProcessor],
    }).compile();

    processor = module.get(OrderProcessingProcessor);
  });

  it('should process order successfully', async () => {
    const job = {
      id: '1',
      name: 'create-order',
      data: { orderId: '123' /* ... */ },
      attemptsMade: 0,
      opts: { attempts: 3 },
      progress: jest.fn(),
    } as any;

    const result = await processor.handleJob(job);

    expect(result.success).toBe(true);
    expect(result.data.orderId).toBe('123');
  });
});
```

## 📚 Recursos Adicionales

- [Bull Documentation](https://optimalbits.github.io/bull/)
- [Bull Board](https://github.com/felixmosh/bull-board)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)

## 🔐 Seguridad

- ⚠️ **Proteger Bull Board Dashboard**: Implementar autenticación en producción
- ⚠️ **Redis Password**: Siempre usar password en producción
- ⚠️ **Rate Limiting**: Configurar según capacidad del sistema
- ⚠️ **Job Data**: No incluir información sensible en job data (usar referencias)

## 🚀 Próximos Pasos

- [ ] Implementar autenticación para Bull Board dashboard
- [ ] Integrar con Prometheus para métricas
- [ ] Configurar alertas para jobs fallidos
- [ ] Implementar job priority queues
- [ ] Agregar circuit breaker para servicios externos
- [ ] Dead Letter Queue storage en base de datos

## 📞 Soporte

Para problemas o preguntas sobre el sistema de colas:

1. Verificar logs en `logs/` directory
2. Revisar Bull Board dashboard
3. Consultar métricas de Redis
4. Revisar esta documentación
