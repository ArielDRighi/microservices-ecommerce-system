# 📋 Backlog Completo - Proyecto 3: Ecosistema de Microservicios E-commerce

> **Proyecto:** Sistema de gestión de inventario y órdenes con arquitectura de microservicios  
> **Stack Principal:** NestJS (Orders) + Go/Gin (Inventory) + API Gateway + Redis + PostgreSQL  
> **Metodología:** TDD/BDD con CI/CD incremental  
> **Duración Estimada:** 8-10 semanas

---

## 🎯 Visión General del Proyecto

**Objetivo:** Evolucionar el sistema asíncrono de órdenes (Proyecto 2) hacia un ecosistema de microservicios, añadiendo un servicio de inventario independiente en Go que maneje la concurrencia de stock con locking optimista y caché distribuida.

**Arquitectura Final:**
```
Cliente → API Gateway → [Orders Service (NestJS)]
                     → [Inventory Service (Go/Gin)]
                     ↓
              Message Queue (RabbitMQ)
                     ↓
              Shared PostgreSQL + Redis Cluster
```

---

## 📊 Métricas de Éxito del Proyecto

- ✅ **Cobertura de Tests:** >70% en ambos servicios
- ✅ **Latencia P95:** <200ms para consultas de inventario
- ✅ **Disponibilidad:** 99.9% (health checks configurados)
- ✅ **Documentación:** ADRs completos + API docs (Swagger/OpenAPI)
- ✅ **CI/CD:** Pipeline verde en cada commit
- ✅ **Concurrencia:** Manejo correcto de 100+ requests simultáneos sin race conditions

---

## 🔷 FASE 1: Setup Inicial y Fundamentos (Semana 1)

**Objetivo:** Establecer la estructura del monorepo, configurar el servicio de inventario básico en Go y tener CI/CD funcional desde el día 1.

### ✅ Epic 1.1: Estructura del Monorepo **[COMPLETADA]**

**Priority:** CRITICAL | **Effort:** 4h | **Status:** ✅ DONE

#### ✅ T1.1.1: Clonar proyecto 2 a nuevo repositorio
- **Status:** ✅ COMPLETADA
- Nuevo repositorio clonado con historial Git completo
- Remote origin actualizado

#### ✅ T1.1.2: Reestructurar en monorepo multi-servicio
- **Status:** ✅ COMPLETADA
- Estructura de carpetas `services/`, `shared/`, `docs/` creada
- Código de Orders movido a `services/orders-service/`

#### ✅ T1.1.3: Configurar .gitignore para multi-lenguaje
- **Status:** ✅ COMPLETADA
- `.gitignore` robusto soportando Node.js, Go, Docker, múltiples IDEs

#### ✅ T1.1.4: Crear README.md principal del ecosistema
- **Status:** ⏳ PENDIENTE (próxima tarea)
- Debe incluir diagrama de arquitectura en Mermaid
- Quick Start unificado
- Estructura del monorepo explicada

#### ✅ T1.1.5: Documentar decisión en ADR-026-monorepo-structure.md
- **Status:** ⏳ PENDIENTE
- Justificar elección de monorepo sobre multi-repo
- Pros, contras y alternativas consideradas

---

### ✅ Epic 1.2: Inventory Service - Esqueleto Básico (Go/Gin) **[COMPLETADA]**

**Priority:** CRITICAL | **Effort:** 8h | **Status:** ✅ DONE

#### ✅ T1.2.1: Inicializar proyecto Go con módulos
- **Status:** ✅ COMPLETADA
- `go.mod` creado con namespace correcto
- Go 1.25 verificado

#### ✅ T1.2.2: Setup estructura hexagonal (Clean Architecture)
- **Status:** ✅ COMPLETADA
- Estructura completa de capas: domain, application, infrastructure, interfaces
- Separación clara de responsabilidades

#### ✅ T1.2.3: Instalar dependencias iniciales
- **Status:** ✅ COMPLETADA
- Gin, GORM, Redis, Testify, Logrus instalados
- `go.mod` y `go.sum` actualizados

#### ✅ T1.2.4: Crear main.go básico con Gin
- **Status:** ✅ COMPLETADA
- Servidor HTTP funcional en puerto 8080
- Health check en `/health`
- Graceful shutdown implementado

#### ✅ T1.2.5: Configurar variables de entorno con godotenv
- **Status:** ✅ COMPLETADA
- Sistema de configuración robusto con godotenv + envconfig
- `.env.example` creado

#### ✅ T1.2.6: Escribir primer test (health check)
- **Status:** ⏳ PENDIENTE
- Test de integración del endpoint `/health`
- Makefile con comandos de testing

---

### Epic 1.3: CI/CD - Pipeline Inicial **[PENDIENTE]**

**Priority:** HIGH | **Effort:** 4h | **Dependencies:** T1.2.6

#### ⏳ T1.3.1: Crear .github/workflows/inventory-service-ci.yml
- **Status:** ⏳ PENDIENTE
- Pipeline con paths filters
- Tests con PostgreSQL y Redis en contenedores
- Coverage mínimo 70%

#### ⏳ T1.3.2: Configurar golangci-lint
- **Status:** ⏳ PENDIENTE
- Archivo `.golangci.yml` con reglas estrictas
- Integración en pipeline CI

#### ⏳ T1.3.3: Actualizar CI del Orders Service
- **Status:** ⏳ PENDIENTE
- Ajustar paths filters para nueva estructura
- Verificar que sigue funcionando

---

### Epic 1.4: Docker & Orchestration **[70% COMPLETADA]**

**Priority:** CRITICAL | **Effort:** 6h

#### ✅ T1.4.1: Crear docker-compose.yml principal
- **Status:** ✅ COMPLETADA
- Orquestación de orders-service e inventory-service
- Infraestructura compartida (PostgreSQL, Redis)
- **Separación total del Proyecto 2**: Puertos y nombres únicos

#### ✅ T1.4.2: Configurar bases de datos separadas
- **Status:** ✅ COMPLETADA
- `microservices_orders` para Orders Service
- `microservices_inventory` para Inventory Service
- `microservices_test` para tests
- Script `init-db.sql` funcional

#### ✅ T1.4.3: Dockerfile para Inventory Service
- **Status:** ✅ COMPLETADA
- Multi-stage build
- Imagen optimizada con Alpine

#### ⏳ T1.4.4: Dockerfile.dev para desarrollo
- **Status:** ⏳ PENDIENTE
- Hot-reload con Air
- Volúmenes de código montados

---

### Epic 1.5: Documentación Inicial **[60% COMPLETADA]**

**Priority:** HIGH | **Effort:** 4h

#### ✅ T1.5.1: Crear INFRASTRUCTURE_REFERENCE.md
- **Status:** ✅ COMPLETADA
- Documentación completa de:
  - Puertos (Proyecto 2 vs Proyecto 3)
  - Bases de datos
  - Credenciales
  - Contenedores Docker
  - Troubleshooting

#### ✅ T1.5.2: Crear QUICK_REFERENCE.md
- **Status:** ✅ COMPLETADA
- Guía de consulta rápida
- Comandos esenciales
- Accesos rápidos

#### ✅ T1.5.3: README de cada servicio
- **Status:** ✅ COMPLETADA
- `services/orders-service/README.md`
- `services/inventory-service/README.md`

#### ⏳ T1.5.4: README.md principal
- **Status:** ⏳ PENDIENTE (próxima tarea)
- Debe consolidar toda la información
- Diagrama de arquitectura

---

## 🔶 FASE 2: Funcionalidad Core del Inventory Service (Semana 2-3)

**Objetivo:** Implementar CRUD completo de inventario con locking optimista para concurrencia

### Epic 2.1: Domain Layer - Entidades y Lógica de Negocio

**Priority:** CRITICAL | **Effort:** 8h

#### ⏳ T2.1.1: Crear entidad InventoryItem
```go
type InventoryItem struct {
    ID          uuid.UUID
    ProductID   uuid.UUID
    Quantity    int
    Reserved    int
    Available   int          // Calculated: Quantity - Reserved
    Version     int          // For optimistic locking
    CreatedAt   time.Time
    UpdatedAt   time.Time
}
```

#### ⏳ T2.1.2: Crear entidad Reservation
```go
type Reservation struct {
    ID              uuid.UUID
    InventoryItemID uuid.UUID
    OrderID         uuid.UUID
    Quantity        int
    Status          ReservationStatus
    ExpiresAt       time.Time
    CreatedAt       time.Time
}
```

#### ⏳ T2.1.3: Implementar Value Objects
- `StockQuantity`: Validaciones de cantidad (no negativo)
- `ReservationStatus`: Enum (pending, confirmed, released, expired)

#### ⏳ T2.1.4: Definir interfaces de repositorios
```go
type InventoryRepository interface {
    FindByProductID(ctx context.Context, productID uuid.UUID) (*InventoryItem, error)
    Save(ctx context.Context, item *InventoryItem) error
    Update(ctx context.Context, item *InventoryItem) error
    DecrementStock(ctx context.Context, productID uuid.UUID, qty int, version int) error
}
```

#### ⏳ T2.1.5: Implementar errores de dominio
- `ErrInsufficientStock`
- `ErrProductNotFound`
- `ErrOptimisticLockFailure`
- `ErrReservationExpired`

---

### Epic 2.2: Application Layer - Casos de Uso

**Priority:** CRITICAL | **Effort:** 10h

#### ⏳ T2.2.1: Caso de uso: Check Availability
- Verificar si hay stock disponible para un producto
- Considerar cantidad reservada

#### ⏳ T2.2.2: Caso de uso: Reserve Stock
- Crear reserva temporal (15 min)
- Actualizar cantidad reservada
- **Usar locking optimista** (version field)

#### ⏳ T2.2.3: Caso de uso: Confirm Reservation
- Convertir reserva en decremento real de stock
- Liberar cantidad reservada
- **Transaccional**: reserva confirmada = stock decrementado

#### ⏳ T2.2.4: Caso de uso: Release Reservation
- Cancelar reserva
- Liberar cantidad reservada de vuelta a disponible

#### ⏳ T2.2.5: Caso de uso: Expire Reservations (Cronjob)
- Job que se ejecuta cada minuto
- Libera reservas expiradas (>15 min)

---

### Epic 2.3: Infrastructure Layer - Persistencia

**Priority:** CRITICAL | **Effort:** 12h

#### ⏳ T2.3.1: Configurar conexión a PostgreSQL con GORM
- Pool de conexiones
- Logging de queries en desarrollo

#### ⏳ T2.3.2: Crear modelos GORM
- `InventoryItemModel`
- `ReservationModel`
- Índices y constraints

#### ⏳ T2.3.3: Implementar InventoryRepositoryImpl
- CRUD completo
- **Locking optimista**: `UPDATE ... WHERE version = ?`

#### ⏳ T2.3.4: Crear migraciones SQL
```sql
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY,
    product_id UUID NOT NULL UNIQUE,
    quantity INT NOT NULL CHECK (quantity >= 0),
    reserved INT NOT NULL DEFAULT 0 CHECK (reserved >= 0),
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_inventory_product ON inventory_items(product_id);
```

#### ⏳ T2.3.5: Configurar Redis para caché
- Cachear productos populares
- TTL: 5 minutos
- Invalidación al actualizar stock

---

### Epic 2.4: Interfaces Layer - HTTP Handlers

**Priority:** CRITICAL | **Effort:** 8h

#### ⏳ T2.4.1: Crear handler: GET /api/inventory/:productId
- Retornar stock disponible de un producto
- Leer desde caché primero

#### ⏳ T2.4.2: Crear handler: POST /api/inventory/reserve
```json
{
  "product_id": "uuid",
  "quantity": 5,
  "order_id": "uuid"
}
```
- Crear reserva temporal

#### ⏳ T2.4.3: Crear handler: POST /api/inventory/confirm
- Confirmar reserva y decrementar stock real

#### ⏳ T2.4.4: Crear handler: DELETE /api/inventory/reserve/:reservationId
- Cancelar reserva

#### ⏳ T2.4.5: Implementar middleware de rate limiting
- Limitar a 100 req/min por IP
- Usar Redis para contadores

---

## 🔶 FASE 3: Integración Orders ↔ Inventory (Semana 4)

**Objetivo:** Comunicación entre servicios vía HTTP y eventos

### Epic 3.1: Comunicación Síncrona (HTTP)

#### ⏳ T3.1.1: Crear cliente HTTP en Orders Service
- Service: `InventoryServiceClient`
- Métodos: `checkAvailability()`, `reserveStock()`, `confirmReservation()`

#### ⏳ T3.1.2: Actualizar Saga de Orders
- **Step 1**: Verificar stock llamando a Inventory Service
- **Step 2**: Reservar stock
- **Step 3**: Procesar pago
- **Step 4**: Confirmar reserva
- **Compensación**: Liberar reserva si falla pago

#### ⏳ T3.1.3: Implementar Circuit Breaker
- Usar `opossum` o similar
- Si Inventory Service está caído, fallar rápido

---

### Epic 3.2: Comunicación Asíncrona (Eventos)

#### ⏳ T3.2.1: Publicar eventos desde Inventory
- `StockReserved`
- `StockConfirmed`
- `StockReleased`
- `StockDepleted` (cuando quantity = 0)

#### ⏳ T3.2.2: Consumir eventos en Orders Service
- Actualizar estado de orden al confirmar stock

---

## 🔶 FASE 4: API Gateway (Semana 5)

**Objetivo:** Punto de entrada único con enrutamiento inteligente

### Epic 4.1: Setup del API Gateway

#### ⏳ T4.1.1: Elegir tecnología
- Opción 1: Express + http-proxy-middleware (Node.js)
- Opción 2: Nginx (configuración)
- Opción 3: Kong/Traefik (más avanzado)

#### ⏳ T4.1.2: Configurar rutas
```
/api/orders/*     → orders-service:3000
/api/inventory/*  → inventory-service:8080
```

#### ⏳ T4.1.3: Implementar autenticación centralizada
- Validar JWT en Gateway
- Propagar user info a servicios downstream

---

## 🔶 FASE 5: Testing Completo (Semana 6-7)

### Epic 5.1: Tests de Inventory Service

#### ⏳ T5.1.1: Tests unitarios de Domain
- Entidades, Value Objects, errores

#### ⏳ T5.1.2: Tests de Application Layer
- Casos de uso mockeando repositorios

#### ⏳ T5.1.3: Tests de integración
- Con PostgreSQL y Redis reales (Testcontainers)

#### ⏳ T5.1.4: Tests E2E del API
- Flujo completo de reserva → confirmación → liberación

---

### Epic 5.2: Tests de Integración entre Servicios

#### ⏳ T5.2.1: Test: Crear orden con verificación de stock
- Orders Service llama a Inventory Service

#### ⏳ T5.2.2: Test: Orden falla si no hay stock
- Verificar compensación (reserva liberada)

#### ⏳ T5.2.3: Test de concurrencia
- 100 requests simultáneos comprando el último ítem
- Solo 1 debe tener éxito

---

## 🔶 FASE 6: Observabilidad y Monitoreo (Semana 8)

### Epic 6.1: Logging Estructurado

#### ⏳ T6.1.1: Implementar Winston en Orders (ya hecho)
#### ⏳ T6.1.2: Implementar Logrus/Zap en Inventory
#### ⏳ T6.1.3: Correlation IDs entre servicios

---

### Epic 6.2: Métricas

#### ⏳ T6.2.1: Exponer métricas Prometheus
- `/metrics` en ambos servicios
- Métricas custom: `inventory_stock_level`, `orders_processed_total`

#### ⏳ T6.2.2: Configurar Grafana Dashboard

---

### Epic 6.3: Health Checks Avanzados

#### ⏳ T6.3.1: Health check con dependencias
- Verificar conexión a PostgreSQL
- Verificar conexión a Redis
- Retornar `503` si alguna falla

---

## 🔶 FASE 7: Documentación Final y Deploy (Semana 9-10)

### Epic 7.1: Documentación

#### ⏳ T7.1.1: Completar todos los ADRs
#### ⏳ T7.1.2: Documentación de API (Swagger/OpenAPI)
#### ⏳ T7.1.3: Guía de deployment
#### ⏳ T7.1.4: Runbooks para operación

---

### Epic 7.2: Deploy

#### ⏳ T7.2.1: Configurar Docker Compose para producción
#### ⏳ T7.2.2: (Opcional) Deploy a Kubernetes
#### ⏳ T7.2.3: (Opcional) Deploy a Railway/Render

---

## 📊 Estado Actual del Proyecto

### ✅ Completado (Fase 1 - 70%)
- [x] Estructura de monorepo
- [x] Inventory Service - Esqueleto básico
- [x] Docker Compose con separación total
- [x] Documentación de infraestructura
- [x] Makefile raíz

### 🔄 En Progreso
- [ ] README principal del monorepo
- [ ] ADR-026: Monorepo structure
- [ ] Tests del health check

### ⏳ Próximos Pasos Inmediatos
1. **Completar Epic 1.5**: README principal y ADRs
2. **Verificar setup**: Tag v3.0.0-initial
3. **Empezar Fase 2**: Domain Layer del Inventory Service

---

## 📝 Notas Importantes

### Separación Proyecto 2 vs Proyecto 3

| Componente | Proyecto 2 | Proyecto 3 |
|------------|------------|------------|
| **Repo** | `ecommerce-async-resilient-system` | `microservices-ecommerce-system` |
| **Orders Port** | 3000 | **3001** |
| **Inventory Port** | N/A | **8080** |
| **PostgreSQL** | 5432 | **5433** |
| **Redis** | 6379 | **6380** |
| **Bases de Datos** | `ecommerce_async` | `microservices_orders`<br>`microservices_inventory` |
| **Contenedores** | `ecommerce-*` | `microservices-*` |

### Documentación de Referencia
- [INFRASTRUCTURE_REFERENCE.md](docs/INFRASTRUCTURE_REFERENCE.md) - Puertos, BDs, credenciales
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Guía rápida de comandos

---

**Última actualización:** 2025-10-16  
**Autor:** Ariel D. Righi  
**Proyecto:** Microservices E-commerce System (Proyecto 3)
