# ADR-028: Estrategia de Comunicación Síncrona REST entre Microservicios

**Status:** ✅ ACEPTADO  
**Fecha:** 2025-10-17  
**Contexto:** Spike T0.1.3 - Estrategia de Comunicación Síncrona  
**Decisores:** Ariel D. Righi  
**Relacionado con:** ADR-026 (API Gateway), ADR-010 (Circuit Breaker), ADR-009 (Retry Pattern)

---

## 📋 Contexto y Problema

El **Orders Service** (NestJS/TypeScript) necesita comunicarse **síncronamente** con el **Inventory Service** (Go/Gin) para:

1. **Verificar disponibilidad** de stock antes de crear orden
2. **Reservar stock** al confirmar orden
3. **Liberar reserva** si la orden falla o se cancela

### Flujo de Comunicación

```
┌─────────────────┐         REST/HTTP          ┌──────────────────┐
│                 │  ─────────────────────────> │                  │
│  Orders Service │   GET /inventory/:id       │ Inventory Service│
│    (NestJS)     │   POST /inventory/reserve  │    (Go/Gin)      │
│                 │  <───────────────────────── │                  │
└─────────────────┘         JSON Response       └──────────────────┘
```

### Preguntas a Resolver

1. **¿Cliente HTTP?** `@nestjs/axios` (wrapper de Axios) vs librería custom?
2. **¿Timeout strategy?** 5s, 10s, o dinámico por endpoint?
3. **¿Retry automático?** Sí/No, cuántos intentos, qué errores?
4. **¿Circuit breaker?** A nivel de cliente (Orders) o gateway (API Gateway)?
5. **¿Service discovery?** Configuración estática vs dinámica (Consul/Eureka)?

---

## 🎯 Objetivos del Portfolio

**Prioridad 1 - Demostración de Skills:**

- ✅ Resiliencia (retry, circuit breaker, timeout)
- ✅ Observabilidad (logging, tracing, métricas)
- ✅ Manejo de errores (graceful degradation)
- ✅ Balance pragmático (no sobreingeniería)

**Prioridad 2 - Simplicidad:**

- ✅ Fácil de implementar (<1 día)
- ✅ Fácil de testear (mocks, integration tests)
- ✅ Fácil de mantener (código claro)

**Prioridad 3 - Escalabilidad Futura:**

- ⚠️ Preparado para service discovery (sin implementarlo aún)
- ⚠️ Preparado para tracing distribuido (OpenTelemetry futuro)

---

## 🔍 Opciones Evaluadas

### Decisión 1: Cliente HTTP

#### Opción 1.1: **@nestjs/axios** (Axios wrapper oficial)

**Descripción:**  
Wrapper oficial de NestJS sobre Axios con integración a RxJS.

```typescript
// orders-service/src/infrastructure/http/inventory.client.ts
import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { firstValueFrom } from "rxjs";

@Injectable()
export class InventoryHttpClient {
  private readonly logger = new Logger(InventoryHttpClient.name);
  private readonly baseURL = process.env.INVENTORY_SERVICE_URL;

  constructor(private readonly httpService: HttpService) {}

  async checkStock(productId: number): Promise<{ available: number }> {
    try {
      const response = await firstValueFrom(this.httpService.get(`${this.baseURL}/inventory/${productId}`));
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to check stock for product ${productId}`, error);
      throw error;
    }
  }

  async reserveStock(productId: number, quantity: number): Promise<void> {
    const response = await firstValueFrom(
      this.httpService.post(`${this.baseURL}/inventory/reserve`, {
        productId,
        quantity,
      })
    );
    return response.data;
  }
}
```

#### ✅ Pros

| **Criterio**     | **Beneficio**                                                 |
| ---------------- | ------------------------------------------------------------- |
| **Oficial**      | Mantenido por NestJS core team (actualizaciones garantizadas) |
| **Integración**  | Se integra con módulo de configuración, DI, interceptors      |
| **RxJS**         | Soporta streams (útil para polling, SSE futuro)               |
| **Testing**      | Fácil de mockear con `jest.mock('@nestjs/axios')`             |
| **Interceptors** | Permite añadir logging, tracing, métricas globalmente         |
| **Familiar**     | Axios es estándar de la industria (conocido por todo dev JS)  |

#### ❌ Contras

| **Criterio**           | **Limitación**                                                  |
| ---------------------- | --------------------------------------------------------------- |
| **RxJS overhead**      | Requiere `firstValueFrom()` para convertir Observable → Promise |
| **Axios bajo el capó** | Si Axios tiene bugs, @nestjs/axios los hereda                   |
| **Verbosidad**         | Más código que fetch nativo                                     |

---

#### Opción 1.2: **Axios directo** (sin wrapper NestJS)

```typescript
import axios, { AxiosInstance } from "axios";

export class InventoryHttpClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.INVENTORY_SERVICE_URL,
      timeout: 5000,
      headers: { "Content-Type": "application/json" },
    });
  }

  async checkStock(productId: number) {
    const { data } = await this.client.get(`/inventory/${productId}`);
    return data;
  }
}
```

#### ✅ Pros

- Menos verboso (no RxJS)
- Axios features completos (interceptors, cancelation)

#### ❌ Contras

- No integración con DI de NestJS
- No aprovecha interceptors globales de NestJS
- Menos "idiomático" en NestJS

---

#### Opción 1.3: **Node fetch** (nativo, sin dependencias)

```typescript
export class InventoryHttpClient {
  async checkStock(productId: number) {
    const response = await fetch(`${process.env.INVENTORY_SERVICE_URL}/inventory/${productId}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
}
```

#### ✅ Pros

- Sin dependencias externas (Node 18+)
- Lightweight
- API estándar (mismo en browser y Node)

#### ❌ Contras

- No integración con NestJS
- Menos features (no interceptors nativos)
- Manejo de errores manual

---

### 🏆 Decisión Cliente HTTP: **@nestjs/axios**

**Razón:**

1. ✅ **Integración nativa** con NestJS (DI, config, interceptors)
2. ✅ **Testing fácil** con mocks de NestJS
3. ✅ **Interceptors globales** (logging, tracing, retry)
4. ✅ **Estándar de la industria** (Axios es lo más usado)
5. ✅ **Portfolio-friendly** (demuestra conocimiento de NestJS idiomático)

**Trade-off aceptado:** Verbosidad de RxJS (mitigado con `firstValueFrom()`)

---

## Decisión 2: Timeout Strategy

### Contexto

Diferentes endpoints tienen diferentes SLAs:

- `GET /inventory/:id` (lectura) → Rápido (1-2s esperado)
- `POST /inventory/reserve` (escritura con lock) → Más lento (3-5s posible)

### Opciones

#### Opción 2.1: Timeout Fijo Global (5s)

```typescript
HttpModule.register({
  timeout: 5000, // Todas las requests
});
```

#### ✅ Pros: Simple, predecible

#### ❌ Contras: No flexible, puede ser muy corto para escrituras

---

#### Opción 2.2: Timeout por Endpoint

```typescript
// Lectura: 3s
await firstValueFrom(this.httpService.get("/inventory/123", { timeout: 3000 }));

// Escritura: 10s
await firstValueFrom(this.httpService.post("/inventory/reserve", data, { timeout: 10000 }));
```

#### ✅ Pros: Flexible, optimizado por caso de uso

#### ❌ Contras: Más código, fácil olvidar especificar

---

#### Opción 2.3: Timeout Dinámico con Defaults

```typescript
@Injectable()
export class InventoryHttpClient {
  private readonly DEFAULT_TIMEOUT = 5000;
  private readonly WRITE_TIMEOUT = 10000;

  async checkStock(productId: number) {
    return firstValueFrom(
      this.httpService.get(`/inventory/${productId}`, {
        timeout: this.DEFAULT_TIMEOUT,
      })
    );
  }

  async reserveStock(productId: number, quantity: number) {
    return firstValueFrom(
      this.httpService.post("/inventory/reserve", data, {
        timeout: this.WRITE_TIMEOUT, // Más tiempo para operaciones críticas
      })
    );
  }
}
```

#### ✅ Pros: Balance perfecto (defaults + customización)

#### ✅ Pros: Código documentado (constantes con nombres claros)

---

### 🏆 Decisión Timeout: **Dinámico con Defaults**

**Configuración:**

- `DEFAULT_TIMEOUT: 5s` (lecturas, health checks)
- `WRITE_TIMEOUT: 10s` (escrituras con locks, reservas)
- `CRITICAL_TIMEOUT: 15s` (operaciones críticas futuras)

**Razón:**

1. ✅ Balance entre simplicidad y flexibilidad
2. ✅ Documentación clara (constantes nombradas)
3. ✅ Fácil ajustar en producción (env vars futuro)

---

## Decisión 3: Retry Strategy

### Contexto

**¿Cuándo retrying tiene sentido?**

- ✅ Errores transitorios (network blips, 503 Service Unavailable)
- ✅ Timeouts cortos (puede que service esté lento, no muerto)
- ❌ Errores lógicos (400 Bad Request, 404 Not Found)
- ❌ Operaciones no idempotentes (sin idempotency key)

### Opciones

#### Opción 3.1: Retry Manual (por endpoint)

```typescript
async checkStock(productId: number, retries = 3): Promise<Stock> {
  for (let i = 0; i < retries; i++) {
    try {
      return await this.httpService.get(`/inventory/${productId}`);
    } catch (error) {
      if (i === retries - 1) throw error;
      await this.sleep(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
}
```

#### ✅ Pros: Control total, fácil de entender

#### ❌ Contras: Código duplicado, fácil olvidar aplicar

---

#### Opción 3.2: Axios Interceptor con `axios-retry`

```typescript
import axiosRetry from "axios-retry";

const client = axios.create({ baseURL: "http://inventory" });

axiosRetry(client, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    // Retry solo en errores de red o 5xx
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status >= 500;
  },
});
```

#### ✅ Pros: Automático, configuración centralizada

#### ✅ Pros: Exponential backoff built-in

#### ❌ Contras: Dependencia extra, menos control granular

---

#### Opción 3.3: NestJS Interceptor Custom

```typescript
// interceptors/retry.interceptor.ts
@Injectable()
export class RetryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      retry({
        count: 3,
        delay: (error, retryCount) => {
          // Retry solo errores 5xx o network
          if (this.isRetryableError(error)) {
            return timer(1000 * Math.pow(2, retryCount)); // Exponential backoff
          }
          throw error;
        },
      })
    );
  }

  private isRetryableError(error: any): boolean {
    return error.response?.status >= 500 || error.code === "ECONNREFUSED";
  }
}
```

#### ✅ Pros: Integración NestJS, aplicable globalmente

#### ✅ Pros: Aprovecha RxJS operators

#### ❌ Contras: Más complejo de testear

---

### 🏆 Decisión Retry: **Axios Interceptor con `axios-retry`**

**Configuración:**

```typescript
// inventory-http.module.ts
HttpModule.register({
  timeout: 5000,
  maxRedirects: 5,
});

// En el cliente
axiosRetry(httpService.axiosRef, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay, // 1s, 2s, 4s
  retryCondition: (error) => {
    // Retry solo:
    // - Network errors (ECONNREFUSED, ETIMEDOUT)
    // - 503 Service Unavailable
    // - 429 Too Many Requests
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || [503, 429].includes(error.response?.status);
  },
});
```

**NO retrying en:**

- ❌ 400 Bad Request (error del cliente)
- ❌ 404 Not Found (recurso no existe)
- ❌ 409 Conflict (optimistic lock failure)
- ❌ POST sin idempotency key

**Razón:**

1. ✅ Automático y centralizado
2. ✅ Exponential backoff built-in (1s → 2s → 4s)
3. ✅ Librería battle-tested (usado en producción por miles)
4. ✅ Fácil de configurar y mantener

---

## Decisión 4: Circuit Breaker

### Contexto

**¿Dónde colocar el circuit breaker?**

- **Opción A:** Cliente (Orders Service) - Protege al cliente de llamar a servicio caído
- **Opción B:** Gateway (API Gateway) - Protege a todos los clientes globalmente

### Opciones

#### Opción 4.1: Circuit Breaker en Cliente (Orders Service)

```typescript
// Usando @nestjs/terminus + opossum
import CircuitBreaker from "opossum";

@Injectable()
export class InventoryHttpClient {
  private breaker: CircuitBreaker;

  constructor(private httpService: HttpService) {
    this.breaker = new CircuitBreaker(this.makeRequest.bind(this), {
      timeout: 5000,
      errorThresholdPercentage: 50, // Abrir si >50% errores
      resetTimeout: 30000, // Intentar cerrar después de 30s
    });

    this.breaker.on("open", () => {
      this.logger.warn("Circuit breaker OPEN - Inventory Service down");
    });
  }

  async checkStock(productId: number) {
    return this.breaker.fire(productId);
  }

  private async makeRequest(productId: number) {
    const response = await firstValueFrom(this.httpService.get(`/inventory/${productId}`));
    return response.data;
  }
}
```

#### ✅ Pros

- Control granular por servicio
- Rápido fail-fast (no espera timeout)
- Métricas específicas (% errores por servicio)

#### ❌ Contras

- Código en cada cliente
- No protege gateway
- Duplicación si múltiples servicios llaman Inventory

---

#### Opción 4.2: Circuit Breaker en API Gateway

```typescript
// api-gateway/src/middleware/circuit-breaker.middleware.ts
import CircuitBreaker from "opossum";

const inventoryBreaker = new CircuitBreaker(proxyToInventory, {
  timeout: 5000,
  errorThresholdPercentage: 50,
});

app.use("/api/inventory", (req, res, next) => {
  inventoryBreaker
    .fire(req, res)
    .then(() => next())
    .catch((err) => {
      res.status(503).json({
        error: "Service Unavailable",
        message: "Inventory Service is temporarily unavailable",
      });
    });
});
```

#### ✅ Pros

- Centralizado (un solo lugar)
- Protege a TODOS los clientes (web, mobile, internos)
- Fácil de monitorear (un solo breaker)

#### ❌ Contras

- Gateway como SPOF (single point of failure)
- Menos granularidad (mismo breaker para read/write)

---

#### Opción 4.3: **Híbrido** (Circuit Breaker en ambos)

**Gateway:** Circuit breaker global (protege infraestructura)  
**Cliente:** Circuit breaker específico (protege lógica de negocio)

#### ✅ Pros: Defense in depth (doble protección)

#### ❌ Contras: Complejidad (dos breakers que coordinar)

---

### 🏆 Decisión Circuit Breaker: **Cliente (Orders Service)**

**Razón para Portfolio:**

1. ✅ **Demuestra más skills:** Implementación de resiliencia a nivel de servicio
2. ✅ **Granularidad:** Circuit breaker específico para Inventory (futuro: Payment, Shipping)
3. ✅ **No SPOF:** Gateway sigue siendo stateless
4. ✅ **Testeable:** Más fácil testear circuit breaker en cliente que en gateway

**Configuración:**

```typescript
// orders-service/src/infrastructure/http/inventory.breaker.ts
{
  timeout: 5000,
  errorThresholdPercentage: 50,  // Abrir si >50% errores
  resetTimeout: 30000,            // Reintentar después de 30s
  rollingCountTimeout: 10000,     // Ventana de 10s para calcular %
  volumeThreshold: 10,            // Mínimo 10 requests para activar
}
```

**Estados:**

- **CLOSED** (normal): Todas las requests pasan
- **OPEN** (circuito abierto): Fast-fail, no llamar a Inventory
- **HALF_OPEN** (probando): Permitir 1 request para testear recuperación

---

## Decisión 5: Service Discovery

### Contexto

**¿Cómo Orders Service encuentra la URL de Inventory Service?**

### Opciones

#### Opción 5.1: **Configuración Estática** (Environment Variables)

```typescript
// orders-service/.env
INVENTORY_SERVICE_URL=http://inventory-service:8080

// config.ts
export const inventoryConfig = {
  baseURL: process.env.INVENTORY_SERVICE_URL,
};
```

#### ✅ Pros

- Simplicidad extrema
- Sin dependencias externas
- Fácil de testear (override en tests)

#### ❌ Contras

- No dinámico (restart si cambia URL)
- No balanceo de carga automático
- No health checks

---

#### Opción 5.2: Service Discovery con Consul/Eureka

```typescript
// Usando @nestjs/consul
const inventoryURL = await this.consul.getService("inventory-service");
```

#### ✅ Pros: Dinámico, health checks, load balancing

#### ❌ Contras: Complejidad alta, otra infraestructura que mantener

---

### 🏆 Decisión Service Discovery: **Configuración Estática (Fase 0)**

**Razón:**

1. ✅ **Pragmatismo:** Para 2-3 servicios, service discovery es overkill
2. ✅ **Simplicidad:** Environment variables funcionan perfectamente
3. ✅ **Docker Compose:** Service names resuelven a IPs automáticamente
4. ✅ **Kubernetes ready:** En K8s, service names también funcionan

**Configuración:**

```yaml
# docker-compose.yml
services:
  orders-service:
    environment:
      - INVENTORY_SERVICE_URL=http://inventory-service:8080

  inventory-service:
    ports:
      - "8080:8080"
```

**Futuro (Fase 4):** Si escalamos a 10+ servicios, reconsiderar Consul/Envoy

---

## 🎯 Decisiones Finales (Resumen)

| **Aspecto**           | **Decisión**                            | **Razón**                                 |
| --------------------- | --------------------------------------- | ----------------------------------------- |
| **Cliente HTTP**      | `@nestjs/axios`                         | Integración NestJS, interceptors, testing |
| **Timeout**           | Dinámico (5s read, 10s write)           | Balance simplicidad/flexibilidad          |
| **Retry**             | `axios-retry` (3 intentos, exponential) | Automático, battle-tested                 |
| **Circuit Breaker**   | Cliente (Orders) con `opossum`          | Granularidad, skills demo                 |
| **Service Discovery** | Estático (env vars)                     | Pragmático para 2-3 servicios             |

---

## 📦 Stack Tecnológico

```json
// orders-service/package.json
{
  "dependencies": {
    "@nestjs/axios": "^3.0.0", // Cliente HTTP oficial
    "axios": "^1.6.0", // HTTP client
    "axios-retry": "^4.0.0", // Retry automático
    "opossum": "^8.1.0", // Circuit breaker
    "rxjs": "^7.8.0" // RxJS (requerido por @nestjs/axios)
  }
}
```

---

## 🔧 Implementación Propuesta

### Estructura de Archivos

```
orders-service/
├── src/
│   ├── infrastructure/
│   │   ├── http/
│   │   │   ├── inventory-http.module.ts     # Módulo HTTP config
│   │   │   ├── inventory.client.ts          # Cliente con circuit breaker
│   │   │   ├── inventory.interface.ts       # Tipos TypeScript
│   │   │   └── interceptors/
│   │   │       ├── logging.interceptor.ts   # Log requests/responses
│   │   │       └── timeout.interceptor.ts   # Timeouts por endpoint
│   │   └── resilience/
│   │       └── circuit-breaker.factory.ts   # Factory para opossum
│   └── application/
│       └── use-cases/
│           └── create-order.use-case.ts     # Usa InventoryClient
```

### Código de Ejemplo

#### 1. Módulo HTTP

```typescript
// inventory-http.module.ts
import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { InventoryHttpClient } from "./inventory.client";

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        baseURL: config.get("INVENTORY_SERVICE_URL"),
        timeout: 5000,
        maxRedirects: 5,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "orders-service/1.0.0",
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [InventoryHttpClient],
  exports: [InventoryHttpClient],
})
export class InventoryHttpModule {}
```

---

#### 2. Cliente con Circuit Breaker

```typescript
// inventory.client.ts
import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import CircuitBreaker from "opossum";
import axiosRetry from "axios-retry";
import { CheckStockResponse, ReserveStockRequest, ReleaseStockRequest } from "./inventory.interface";

@Injectable()
export class InventoryHttpClient {
  private readonly logger = new Logger(InventoryHttpClient.name);
  private readonly checkStockBreaker: CircuitBreaker;
  private readonly reserveStockBreaker: CircuitBreaker;

  private readonly DEFAULT_TIMEOUT = 5000;
  private readonly WRITE_TIMEOUT = 10000;

  constructor(private readonly httpService: HttpService) {
    // Configurar axios-retry
    axiosRetry(this.httpService.axiosRef, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) || [503, 429].includes(error.response?.status);
      },
      onRetry: (retryCount, error) => {
        this.logger.warn(`Retry attempt ${retryCount} for ${error.config.url}`);
      },
    });

    // Circuit breakers
    this.checkStockBreaker = new CircuitBreaker(this.checkStockInternal.bind(this), {
      timeout: this.DEFAULT_TIMEOUT,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      name: "inventory-check-stock",
    });

    this.reserveStockBreaker = new CircuitBreaker(this.reserveStockInternal.bind(this), {
      timeout: this.WRITE_TIMEOUT,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      name: "inventory-reserve-stock",
    });

    // Logging de eventos del circuit breaker
    this.checkStockBreaker.on("open", () => this.logger.error("Circuit breaker OPEN: inventory-check-stock"));
    this.checkStockBreaker.on("halfOpen", () => this.logger.warn("Circuit breaker HALF_OPEN: inventory-check-stock"));
    this.checkStockBreaker.on("close", () => this.logger.log("Circuit breaker CLOSED: inventory-check-stock"));

    this.reserveStockBreaker.on("open", () => this.logger.error("Circuit breaker OPEN: inventory-reserve-stock"));
  }

  /**
   * Verifica disponibilidad de stock para un producto
   * - Timeout: 5s
   * - Retry: 3 intentos con exponential backoff
   * - Circuit breaker: Sí
   */
  async checkStock(productId: number): Promise<CheckStockResponse> {
    try {
      return await this.checkStockBreaker.fire(productId);
    } catch (error) {
      this.logger.error(`Failed to check stock for product ${productId}`, error);

      // Si circuit breaker está abierto, retornar respuesta por defecto
      if (error.message?.includes("Circuit breaker is open")) {
        throw new ServiceUnavailableException("Inventory service is temporarily unavailable");
      }

      throw error;
    }
  }

  private async checkStockInternal(productId: number): Promise<CheckStockResponse> {
    const response = await firstValueFrom(
      this.httpService.get(`/inventory/${productId}`, {
        timeout: this.DEFAULT_TIMEOUT,
      })
    );
    return response.data;
  }

  /**
   * Reserva stock para una orden
   * - Timeout: 10s (operación con lock)
   * - Retry: 3 intentos (solo en errores de red, no 409 Conflict)
   * - Circuit breaker: Sí
   * - Idempotencia: Requiere idempotency-key header
   */
  async reserveStock(request: ReserveStockRequest): Promise<void> {
    try {
      await this.reserveStockBreaker.fire(request);
    } catch (error) {
      this.logger.error(`Failed to reserve stock for product ${request.productId}`, error);
      throw error;
    }
  }

  private async reserveStockInternal(request: ReserveStockRequest): Promise<void> {
    await firstValueFrom(
      this.httpService.post("/inventory/reserve", request, {
        timeout: this.WRITE_TIMEOUT,
        headers: {
          "Idempotency-Key": request.idempotencyKey,
        },
      })
    );
  }

  /**
   * Libera reserva de stock (compensación)
   * - Timeout: 10s
   * - Retry: 3 intentos
   * - Circuit breaker: Sí
   */
  async releaseStock(request: ReleaseStockRequest): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post("/inventory/release", request, {
          timeout: this.WRITE_TIMEOUT,
        })
      );
    } catch (error) {
      this.logger.error(`Failed to release stock for product ${request.productId}`, error);
      // NO propagar error - release es best-effort
      // Se puede reintentar con job asíncrono
    }
  }

  /**
   * Health check del Inventory Service
   * - Timeout: 3s
   * - Sin retry
   * - Sin circuit breaker
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await firstValueFrom(this.httpService.get("/health", { timeout: 3000 }));
      return response.status === 200;
    } catch {
      return false;
    }
  }
}
```

---

#### 3. Interfaces TypeScript

```typescript
// inventory.interface.ts
export interface CheckStockResponse {
  productId: number;
  available: number;
  reserved: number;
  total: number;
}

export interface ReserveStockRequest {
  productId: number;
  quantity: number;
  orderId: string;
  idempotencyKey: string; // UUID para prevenir duplicados
}

export interface ReleaseStockRequest {
  productId: number;
  quantity: number;
  orderId: string;
}
```

---

## 📊 Observabilidad y Monitoring

### Métricas a Trackear

```typescript
// metrics.service.ts (usando prom-client)
const inventoryCallsTotal = new Counter({
  name: "inventory_http_calls_total",
  help: "Total de llamadas HTTP a Inventory Service",
  labelNames: ["method", "endpoint", "status"],
});

const inventoryCallDuration = new Histogram({
  name: "inventory_http_call_duration_seconds",
  help: "Duración de llamadas HTTP a Inventory Service",
  labelNames: ["method", "endpoint"],
  buckets: [0.1, 0.5, 1, 2, 5],
});

const circuitBreakerState = new Gauge({
  name: "circuit_breaker_state",
  help: "Estado del circuit breaker (0=closed, 1=open, 2=half_open)",
  labelNames: ["breaker_name"],
});
```

### Logging Estructurado

```typescript
this.logger.log({
  message: "Inventory HTTP call",
  productId,
  duration: `${duration}ms`,
  status: response.status,
  retries: retryCount,
  circuitBreakerState: this.checkStockBreaker.opened ? "open" : "closed",
});
```

---

## 🧪 Estrategia de Testing

### 1. Unit Tests (Mocks)

```typescript
// inventory.client.spec.ts
describe("InventoryHttpClient", () => {
  let client: InventoryHttpClient;
  let httpService: jest.Mocked<HttpService>;

  beforeEach(() => {
    httpService = {
      get: jest.fn(),
      post: jest.fn(),
    } as any;

    client = new InventoryHttpClient(httpService);
  });

  it("should check stock successfully", async () => {
    httpService.get.mockReturnValue(of({ data: { productId: 1, available: 100 } }));

    const result = await client.checkStock(1);

    expect(result.available).toBe(100);
    expect(httpService.get).toHaveBeenCalledWith("/inventory/1", {
      timeout: 5000,
    });
  });

  it("should throw ServiceUnavailable when circuit breaker opens", async () => {
    // Simular 10 errores consecutivos para abrir circuit breaker
    httpService.get.mockRejectedValue(new Error("Service down"));

    for (let i = 0; i < 10; i++) {
      try {
        await client.checkStock(1);
      } catch {}
    }

    // Circuit breaker debería estar abierto ahora
    await expect(client.checkStock(1)).rejects.toThrow(ServiceUnavailableException);
  });
});
```

---

### 2. Integration Tests (Testcontainers)

```typescript
// inventory.client.integration.spec.ts
describe("InventoryHttpClient Integration", () => {
  let inventoryContainer: StartedDockerContainer;
  let client: InventoryHttpClient;

  beforeAll(async () => {
    // Levantar Inventory Service con Testcontainers
    inventoryContainer = await new GenericContainer("inventory-service:test").withExposedPorts(8080).start();

    const baseURL = `http://${inventoryContainer.getHost()}:${inventoryContainer.getMappedPort(8080)}`;

    const httpService = new HttpService(axios.create({ baseURL }));
    client = new InventoryHttpClient(httpService);
  });

  afterAll(async () => {
    await inventoryContainer.stop();
  });

  it("should communicate with real Inventory Service", async () => {
    const result = await client.checkStock(123);
    expect(result).toHaveProperty("available");
  });

  it("should retry on transient errors", async () => {
    // Test con network delay simulado
  });
});
```

---

## 🚨 Manejo de Errores

### Tipos de Errores y Respuestas

| Error Type                     | HTTP Status | Retry?      | Action                       |
| ------------------------------ | ----------- | ----------- | ---------------------------- |
| Network Error                  | -           | ✅ Yes (3x) | Retry con backoff            |
| Timeout                        | 504         | ✅ Yes (3x) | Retry más rápido             |
| 503 Service Unavailable        | 503         | ✅ Yes (3x) | Retry, abrir circuit breaker |
| 429 Too Many Requests          | 429         | ✅ Yes (3x) | Retry con backoff            |
| 409 Conflict (Optimistic Lock) | 409         | ❌ No       | Propagate error              |
| 400 Bad Request                | 400         | ❌ No       | Log + Propagate              |
| 404 Not Found                  | 404         | ❌ No       | Return null/throw            |
| 500 Internal Server Error      | 500         | ⚠️ Maybe    | Retry si idempotente         |

---

## 🎓 Para Entrevistas

**Pregunta:** "¿Cómo manejas la comunicación entre microservicios?"

**Respuesta:**

> "Uso **REST síncrono** para operaciones que requieren respuesta inmediata, como verificar stock. Implemento una **estrategia de resiliencia en capas**:
>
> 1. **Cliente HTTP:** `@nestjs/axios` con timeouts dinámicos (5s reads, 10s writes)
> 2. **Retry automático:** `axios-retry` con exponential backoff (3 intentos)
> 3. **Circuit breaker:** `opossum` a nivel de cliente para fail-fast cuando servicio está caído
> 4. **Observabilidad:** Métricas de latencia, success rate, circuit breaker state
>
> Decidí circuit breaker en **cliente** (no gateway) para mayor granularidad y demostrar skills de resiliencia. En producción, monitoreo tiempos de respuesta (P95, P99) y estado de circuit breakers con Prometheus/Grafana.
>
> Para operaciones asíncronas (notificaciones, auditoría), uso mensajería con RabbitMQ (ADR-029)."

**Skills demostradas:**

- ✅ Resiliencia (retry, circuit breaker, timeout)
- ✅ NestJS avanzado (modules, DI, interceptors)
- ✅ Observabilidad (métricas, logging estructurado)
- ✅ Testing (unit + integration con Testcontainers)
- ✅ Pragmatismo (service discovery estático para 2-3 servicios)

---

## 📚 Referencias

- **@nestjs/axios Docs:** https://docs.nestjs.com/techniques/http-module
- **axios-retry:** https://github.com/softonic/axios-retry
- **opossum Circuit Breaker:** https://nodeshift.dev/opossum/
- **Martin Fowler - Circuit Breaker:** https://martinfowler.com/bliki/CircuitBreaker.html
- **ADR-009:** Retry Pattern con Exponential Backoff
- **ADR-010:** Circuit Breaker Pattern

---

## ✅ Checklist de Implementación

### Fase 1: Setup Básico (1 hora)

- [ ] Instalar dependencias (`@nestjs/axios`, `axios-retry`, `opossum`)
- [ ] Crear `InventoryHttpModule`
- [ ] Configurar timeout y baseURL con env vars
- [ ] Crear interfaces TypeScript

### Fase 2: Cliente con Resiliencia (2 horas)

- [ ] Implementar `InventoryHttpClient`
- [ ] Configurar `axios-retry`
- [ ] Implementar circuit breakers con `opossum`
- [ ] Añadir logging estructurado

### Fase 3: Testing (2 horas)

- [ ] Unit tests con mocks (Jest)
- [ ] Integration tests con Testcontainers (opcional)
- [ ] Tests de circuit breaker (simular failures)
- [ ] Tests de retry (simular timeouts)

### Fase 4: Observabilidad (1 hora)

- [ ] Métricas Prometheus (calls total, duration, errors)
- [ ] Gauge de circuit breaker state
- [ ] Logging de errores con stack traces

### Fase 5: Documentación (30 min)

- [ ] README con ejemplos de uso
- [ ] Diagramas de flujo (Mermaid)
- [ ] Runbook de troubleshooting

**Tiempo Total Estimado:** ~6-7 horas (1 día completo)

---

## 📅 Plan de Implementación

### Fase Actual: **FASE 0 - Technical Spikes** ✅

**Este ADR documenta las DECISIONES, no la implementación.**

En Fase 0 solo se investiga y decide. La implementación real ocurrirá en fases posteriores:

---

### 🔄 Roadmap de Implementación

#### **FASE 1: Implementación Base de Servicios** (Semanas 3-5)

**Epic 1.4: Inventory Service - CRUD Completo**

- Task: Implementar endpoints REST en Inventory Service (Go/Gin)
  - `GET /inventory/:id` - Consultar stock
  - `POST /inventory/reserve` - Reservar stock
  - `POST /inventory/release` - Liberar reserva
  - `GET /health` - Health check
- **Status:** No iniciado
- **Prerequisito:** Inventory Service con repositorios GORM funcionales

---

#### **FASE 2: Integración entre Servicios** (Semanas 6-8)

**Epic 2.3: Comunicación REST Orders → Inventory** 🎯 **AQUÍ SE IMPLEMENTA ADR-028**

Esta es la fase donde se implementarán las decisiones de este ADR:

**Task 2.3.1: Setup Cliente HTTP en Orders Service** (2 horas)

- [ ] Instalar dependencias (`@nestjs/axios@^3.0.0`, `axios-retry@^4.0.0`, `opossum@^8.1.0`)
- [ ] Crear `InventoryHttpModule` con configuración
- [ ] Configurar environment variables (INVENTORY_SERVICE_URL)
- [ ] Crear interfaces TypeScript (`CheckStockResponse`, `ReserveStockRequest`, etc.)
- **Entregable:** Módulo HTTP configurado y registrado en AppModule

**Task 2.3.2: Implementar InventoryHttpClient** (3 horas)

- [ ] Implementar `InventoryHttpClient` con métodos:
  - `checkStock(productId)`
  - `reserveStock(request)`
  - `releaseStock(request)`
  - `healthCheck()`
- [ ] Configurar timeouts dinámicos (5s read, 10s write)
- [ ] Integrar `axios-retry` con exponential backoff
- [ ] Implementar circuit breakers con `opossum`
- [ ] Añadir logging estructurado con Winston
- **Entregable:** Cliente HTTP funcional con resiliencia

**Task 2.3.3: Tests del Cliente HTTP** (2 horas)

- [ ] Unit tests con mocks (Jest)
- [ ] Tests de circuit breaker (simular 10+ fallos consecutivos)
- [ ] Tests de retry (simular timeouts y 503)
- [ ] Tests de timeouts por tipo de operación
- **Entregable:** Coverage >80% en InventoryHttpClient

**Task 2.3.4: Integración con Create Order Use Case** (2 horas)

- [ ] Inyectar `InventoryHttpClient` en `CreateOrderUseCase`
- [ ] Implementar flujo: verificar stock → crear orden → reservar stock
- [ ] Manejar compensación (liberar stock si orden falla)
- [ ] Añadir idempotency keys en requests
- **Entregable:** Flujo completo Orders → Inventory funcionando

**Task 2.3.5: Observabilidad y Métricas** (1 hora)

- [ ] Métricas Prometheus:
  - `inventory_http_calls_total{method, endpoint, status}`
  - `inventory_http_call_duration_seconds{method, endpoint}`
  - `circuit_breaker_state{breaker_name}` (0=closed, 1=open, 2=half_open)
- [ ] Dashboard Grafana (opcional)
- **Entregable:** Métricas expuestas en `/metrics`

**Tiempo Total Epic 2.3:** ~10 horas (1.5 días)  
**Prerequisitos:**

- ✅ ADR-028 completado (este documento)
- ⏳ Inventory Service con endpoints REST implementados (Epic 1.4)
- ⏳ Orders Service refactorizado a Clean Architecture (Epic 1.5)

---

#### **FASE 3: Optimización y Producción** (Semanas 9-10)

**Epic 3.2: Optimización de Comunicación HTTP**

- Task: Load testing con k6 (1000 req/s)
- Task: Ajustar timeouts basado en percentiles (P95, P99)
- Task: Optimizar circuit breaker thresholds (errores reales en staging)
- Task: Implementar tracing distribuido con OpenTelemetry (opcional)
- **Entregable:** Sistema optimizado para producción

---

### 🎯 Resumen de Cuándo se Implementa

| Fase                | Qué se hace                             | Cuándo              |
| ------------------- | --------------------------------------- | ------------------- |
| **Fase 0** (ACTUAL) | Spike + ADR-028                         | ✅ Semana 2 (AHORA) |
| **Fase 1**          | Implementar Inventory Service endpoints | ⏳ Semanas 3-5      |
| **Fase 2**          | **Implementar InventoryHttpClient**     | 🎯 **Semanas 6-8**  |
| **Fase 3**          | Optimización y producción               | ⏳ Semanas 9-10     |

**Este ADR (028) se implementará en FASE 2, Epic 2.3** (~Semana 6)

---

## 🚦 Criterios de Éxito (Fase 2)

Cuando Epic 2.3 esté completo, deberemos tener:

- ✅ Orders Service puede llamar a Inventory Service vía REST
- ✅ Retry automático funciona (testear desconectando Inventory)
- ✅ Circuit breaker abre después de 50% errores
- ✅ Timeouts respetados (5s read, 10s write)
- ✅ Métricas en Prometheus mostrando latencia y errores
- ✅ Tests pasando (unit + integration)
- ✅ Flujo completo: crear orden → verificar stock → reservar → confirmar

---

**Firmado:** Ariel D. Righi  
**Status:** ✅ ADR ACEPTADO - Decisiones tomadas en Fase 0  
**Implementación:** FASE 2 (Epic 2.3, ~Semana 6)  
**Próximo Spike:** T0.1.4 - RabbitMQ vs Redis Pub/Sub
