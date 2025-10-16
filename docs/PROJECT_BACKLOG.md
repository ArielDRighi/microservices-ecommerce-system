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

## 🔷 FASE 0: Technical Spikes

**Objetivo:** Realizar investigación técnica y tomar decisiones arquitectónicas críticas antes de comenzar el desarrollo.

### Epic 0.1: Technical Spikes y Decisiones Arquitectónicas

**Priority:** CRITICAL | **Status:** ⏳ PENDIENTE

#### ✅ T0.1.1: Spike - Selección de API Gateway para Portfolio

- **Status:** ✅ COMPLETADA (2025-10-16)
- **Decisión tomada:** **Express custom con http-proxy-middleware**
- **Documento:** [ADR-026: API Gateway Custom con Express](../adr/026-api-gateway-express-custom.md)
- **Contexto:** Necesitamos un gateway que enrute a Orders (NestJS/REST) e Inventory (Go/REST)
- **Opciones evaluadas:**
  - ✅ **Express custom** - SELECCIONADO
    - Control total del código y lógica de routing
    - Máximo valor educativo (implementar patrones desde cero)
    - Alineación con stack actual (Node.js/TypeScript)
    - Bajo overhead (<5ms latencia, <200MB RAM)
  - ❌ **Kong** - RECHAZADO
    - Overkill para 2-3 servicios
    - Complejidad operacional (PostgreSQL para metadata)
  - ❌ **Traefik** - RECHAZADO
    - Optimizado para Kubernetes (proyecto usa Docker Compose)
    - Features limitadas para autenticación JWT custom
- **Stack definido:**
  - Proxy: `http-proxy-middleware`
  - Auth: `jsonwebtoken` (JWT custom)
  - Rate Limiting: `express-rate-limit` + Redis
  - Circuit Breaker: `opossum`
  - Logging: `winston` + `morgan`
  - Métricas: `prom-client` (Prometheus)
- **Implementación:** Ver Epic 4.1 y 4.2 en Fase 4

#### ⏳ T0.1.2: Spike - Testcontainers en Go - Viabilidad para CI/CD

- **Status:** ⏳ PENDIENTE
- **Contexto:** Inventory Service (Go) necesita tests de integración con PostgreSQL real
- **A investigar:**
  - ¿Testcontainers funciona bien en GitHub Actions?
  - ¿Tiempo de setup es aceptable? (<2 min ideal)
  - ¿Alternativas como sqlmock son suficientes para el portfolio?
- **Entregable:** PoC de test con testcontainers + decisión documentada

#### ⏳ T0.1.3: Spike - Estrategia de Comunicación Síncrona

- **Status:** ⏳ PENDIENTE
- **Contexto:** Orders (NestJS) necesita llamar a Inventory (Go/Gin)
- **Ya decidido:** REST (ambos servicios son RESTful)
- **A definir:**
  - ¿Cliente HTTP nativo de NestJS (@nestjs/axios) o librería custom?
  - ¿Timeout strategy? (5s, 10s?)
  - ¿Retry automático o manual?
  - ¿Circuit breaker a nivel de cliente o gateway?
- **Entregable:** ADR con decisiones de implementación

#### ⏳ T0.1.4: Spike - RabbitMQ vs Redis Pub/Sub para eventos asíncronos

- **Status:** ⏳ PENDIENTE
- **Contexto:** Inventory necesita publicar eventos (InventoryReserved, etc.) que Orders consume
- **Opciones:**
  - **RabbitMQ (nuevo en el stack)**
    - ✅ Pro: Garantías de entrega más fuertes
    - ✅ Pro: Queues persistentes
    - ❌ Contra: Añade complejidad al docker-compose
  - **Redis Pub/Sub (ya tenés Redis del Proyecto 2)**
    - ✅ Pro: Infraestructura existente
    - ✅ Pro: Más simple
    - ❌ Contra: No persiste mensajes (at-most-once delivery)
- **Recomendación:** RabbitMQ (demuestra más conocimiento de message brokers)
- **Entregable:** Decisión documentada + justificación técnica

**✅ Definition of Done - Epic 0.1:**

- [ ] Todas las decisiones técnicas críticas tomadas y documentadas
- [ ] Al menos 1 PoC ejecutado exitosamente (Testcontainers o API Gateway)
- [ ] Decisiones validadas con criterios de portfolio (claridad, valor demostrativo)
- [ ] ADRs preliminares creados para decisiones arquitectónicas

---

## 🔷 FASE 1: Setup Inicial, Fundamentos y Refactoring

**Objetivo:** Establecer la estructura del monorepo, configurar el servicio de inventario básico en Go, refactorizar Orders Service para arquitectura de microservicios, y tener CI/CD funcional desde el día 1.

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

**✅ Definition of Done - Epic 1.1:**

- [ ] Estructura de monorepo correctamente organizada
- [ ] .gitignore cubre todos los lenguajes del proyecto
- [ ] README principal con diagrama de arquitectura creado
- [ ] ADR-026 documentando decisión de monorepo
- [ ] Código de Orders Service migrado sin pérdida de funcionalidad

---

### ✅ Epic 1.2: Inventory Service - Esqueleto Básico (Go/Gin) **[COMPLETADA]**

**Priority:** CRITICAL | **Status:** ✅ DONE

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

- **Status:** ✅ COMPLETADA
- Test de integración del endpoint `/health`
- Makefile con comandos de testing

**✅ Definition of Done - Epic 1.2:**

- [ ] Proyecto Go inicializado con estructura hexagonal
- [ ] Todas las dependencias instaladas y funcionando
- [ ] Servidor HTTP corriendo en puerto 8080
- [ ] Health check funcional con tests pasando
- [ ] Configuración de entorno implementada
- [ ] Graceful shutdown funcionando correctamente

---

### Epic 1.3: CI/CD - Pipeline Inicial **[PENDIENTE]**

**Priority:** HIGH | **Dependencies:** T1.2.6

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
- Ajustar paths filters para nueva estructura monorepo
- Verificar que sigue funcionando correctamente

**✅ Definition of Done - Epic 1.3:**

- [ ] Pipeline CI/CD del Inventory Service funcionando
- [ ] Tests corriendo en GitHub Actions con PostgreSQL y Redis
- [ ] Linter golangci-lint integrado y pasando
- [ ] Pipeline del Orders Service actualizado para monorepo
- [ ] Coverage reports generados (target: >70%)
- [ ] Badges de CI/CD añadidos al README

---

### Epic 1.4: Docker & Orchestration **[70% COMPLETADA]**

**Priority:** CRITICAL

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

#### ⏳ T1.4.5: Setup RabbitMQ en docker-compose

- **Status:** ⏳ PENDIENTE
- Añadir servicio RabbitMQ con imagen `rabbitmq:3-management`
- Configurar puerto 5672 (AMQP) y 15672 (Management UI)
- Configurar persistencia de mensajes
- Health check de RabbitMQ
- Documentar acceso a Management UI en INFRASTRUCTURE_REFERENCE.md

**✅ Definition of Done - Epic 1.4:**

- [ ] docker-compose.yml levanta todos los servicios sin errores
- [ ] Bases de datos separadas correctamente configuradas
- [ ] Dockerfiles optimizados (multi-stage builds)
- [ ] RabbitMQ corriendo y accesible
- [ ] Health checks configurados para todos los servicios
- [ ] Documentación de puertos actualizada

---

### Epic 1.5: Documentación Inicial **[60% COMPLETADA]**

**Priority:** HIGH

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

**✅ Definition of Done - Epic 1.5:**

- [ ] Todos los README creados y actualizados
- [ ] Documentación técnica referencia puertos, bases de datos, credenciales
- [ ] Guía de troubleshooting incluida
- [ ] Quick reference con comandos esenciales documentada

---

### Epic 1.6: Refactoring del Orders Service para Microservicios

**Priority:** CRITICAL | **Status:** ⏳ PENDIENTE

**Contexto:** El Orders Service del Proyecto 2 fue diseñado como monolito con lógica de inventario interna. Debe ser refactorizado para funcionar en un ecosistema de microservicios delegando toda la gestión de stock al Inventory Service.

#### ⏳ T1.6.1: Eliminar lógica de inventario interno del Orders Service

- **Status:** ⏳ PENDIENTE
- Remover tabla `inventory` de la base de datos del Orders Service
- Eliminar seeders relacionados con inventario
- Eliminar endpoints internos `/inventory/*` del Orders Service
- Actualizar migraciones para eliminar referencias a inventario
- Crear migración de rollback por si es necesario

#### ⏳ T1.6.2: Crear InventoryServiceClient (HTTP)

- **Status:** ⏳ PENDIENTE
- Crear interface `IInventoryClient` en módulo común del Orders Service
- Implementación con `@nestjs/axios` para llamadas HTTP
- Manejo de errores de red (timeouts, 5xx, connection refused)
- Retry logic con exponential backoff (3 intentos)
- Logging estructurado de todas las llamadas al servicio externo
- Tests unitarios del cliente con mocks

#### ⏳ T1.6.3: Actualizar Saga Pattern para llamadas externas

- **Status:** ⏳ PENDIENTE
- Modificar `OrderSaga` para usar `InventoryServiceClient` en lugar de lógica interna
- Añadir step de compensación para fallos de red
- Implementar timeout en llamadas al servicio externo (max 5 segundos)
- Manejar casos de servicio no disponible
- Actualizar tests de saga con cliente HTTP mockeado

#### ⏳ T1.6.4: Actualizar variables de entorno del Orders Service

- **Status:** ⏳ PENDIENTE
- Añadir `INVENTORY_SERVICE_URL=http://inventory-service:8080`
- Añadir `INVENTORY_SERVICE_TIMEOUT=5000`
- Añadir `INVENTORY_SERVICE_RETRY_ATTEMPTS=3`
- Actualizar `.env.example` con nuevas variables
- Documentar variables en README del Orders Service

#### ⏳ T1.6.5: Actualizar tests del Orders Service

- **Status:** ⏳ PENDIENTE
- Mockear `InventoryServiceClient` en unit tests
- Crear fixtures para responses del Inventory Service
- Actualizar E2E tests para levantar ambos servicios (docker-compose)
- Tests de timeout y retry logic del cliente HTTP
- Verificar que coverage sigue >70%

**✅ Definition of Done - Epic 1.6:**

- [ ] Orders Service no tiene lógica de inventario interna
- [ ] Todas las operaciones de stock se delegan al Inventory Service vía HTTP
- [ ] Tests pasan con el cliente HTTP mockeado
- [ ] E2E tests funcionan con ambos servicios corriendo en docker-compose
- [ ] Cobertura de tests se mantiene >70%
- [ ] Variables de entorno documentadas

---

## 🔶 FASE 2: Funcionalidad Core del Inventory Service

**Objetivo:** Implementar CRUD completo de inventario con locking optimista para concurrencia, sistema de eventos distribuidos con RabbitMQ, caché distribuida con Redis, y gestión de datos con migraciones.

### Epic 2.1: Domain Layer - Entidades y Lógica de Negocio

**Priority:** CRITICAL | **Status:** ⏳ PENDIENTE

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

**✅ Definition of Done - Epic 2.1:**

- [ ] Todas las entidades de dominio creadas y documentadas
- [ ] Value Objects con validaciones implementadas y testeadas
- [ ] Interfaces de repositorios definidas claramente
- [ ] Errores de dominio implementados con mensajes descriptivos
- [ ] Tests unitarios de entidades con coverage >80%
- [ ] Código siguiendo principios de Clean Architecture

---

### Epic 2.2: Application Layer - Casos de Uso

**Priority:** CRITICAL | **Status:** ⏳ PENDIENTE

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

**✅ Definition of Done - Epic 2.2:**

- [ ] Todos los casos de uso implementados siguiendo Clean Architecture
- [ ] Repositorios mockeados en tests de casos de uso
- [ ] Locking optimista correctamente implementado en Reserve Stock
- [ ] Cronjob de expiración funcional y testeado
- [ ] Tests unitarios con coverage >80%
- [ ] Manejo de errores apropiado en cada caso de uso

---

### Epic 2.3: Infrastructure Layer - Persistencia

**Priority:** CRITICAL | **Status:** ⏳ PENDIENTE

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

**✅ Definition of Done - Epic 2.3:**

- [ ] Conexión a PostgreSQL configurada con pool optimizado
- [ ] Modelos GORM creados con índices y constraints apropiados
- [ ] InventoryRepositoryImpl implementado con locking optimista
- [ ] Migraciones SQL ejecutables y rollback disponible
- [ ] Redis configurado para caché
- [ ] Tests de integración con PostgreSQL y Redis (testcontainers)
- [ ] Código sin race conditions verificado

---

### Epic 2.4: Interfaces Layer - HTTP Handlers

**Priority:** CRITICAL | **Status:** ⏳ PENDIENTE

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

**✅ Definition of Done - Epic 2.4:**

- [ ] Todos los endpoints HTTP implementados y documentados
- [ ] Handlers delegando correctamente a casos de uso
- [ ] Validación de inputs en todos los endpoints
- [ ] Rate limiting funcional
- [ ] Tests de integración de endpoints con httptest
- [ ] Documentación de API (comentarios para Swagger)
- [ ] Manejo de errores HTTP apropiado (400, 404, 409, 500)

---

### Epic 2.5: Sistema de Eventos Distribuidos (RabbitMQ)

**Priority:** CRITICAL | **Status:** ⏳ PENDIENTE

**Contexto:** Implementar comunicación asíncrona entre Inventory Service y Orders Service mediante eventos publicados a RabbitMQ.

#### ⏳ T2.5.2: Definir eventos de inventario

- **Status:** ⏳ PENDIENTE
- Crear schemas de eventos:
  - `InventoryReserved`: cuando se crea una reserva
  - `InventoryConfirmed`: cuando se confirma y decrementa stock
  - `InventoryReleased`: cuando se cancela una reserva
  - `StockDepleted`: cuando un producto llega a quantity = 0
  - `StockReplenished`: cuando se añade stock a un producto
- Documentar estructura de cada evento con ejemplos JSON

#### ⏳ T2.5.3: Implementar Publisher en Inventory Service (Go)

- **Status:** ⏳ PENDIENTE
- Usar librería `github.com/rabbitmq/amqp091-go`
- Crear módulo de eventos con método `Publish(event Event)`
- Publicar al exchange `inventory.events`
- Garantizar at-least-once delivery
- Manejo de errores de publicación
- Logging de todos los eventos publicados

#### ⏳ T2.5.4: Implementar Consumer en Orders Service (NestJS)

- **Status:** ⏳ PENDIENTE
- Crear módulo RabbitMQ consumer (además de Bull existente)
- Suscribirse a eventos de inventario desde queue específica
- Procesar eventos y actualizar estado de órdenes
- Idempotencia en procesamiento (evitar duplicados)
- Dead Letter Queue para eventos fallidos

#### ⏳ T2.5.5: Crear ADR-027: Estrategia de Comunicación

- **Status:** ⏳ PENDIENTE
- Documentar decisión: REST para sync, RabbitMQ para async
- Alternativas consideradas: gRPC, Apache Kafka
- Pros y contras de cada opción
- Justificación de la decisión tomada

**✅ Definition of Done - Epic 2.5:**

- [ ] RabbitMQ corriendo en docker-compose (desde Fase 1)
- [ ] Todos los eventos de inventario definidos y documentados
- [ ] Inventory Service publica eventos correctamente
- [ ] Orders Service consume y procesa eventos
- [ ] Idempotencia implementada (sin duplicados)
- [ ] ADR-027 documentado
- [ ] Tests de publicación y consumo de eventos

---

### Epic 2.6: Sistema de Caché Distribuida

**Priority:** HIGH | **Status:** ⏳ PENDIENTE

**Contexto:** Optimizar performance del Inventory Service con estrategia de caché usando Redis para reducir latencia de consultas.

#### ⏳ T2.6.1: Implementar Cache-Aside Pattern en Inventory

- **Status:** ⏳ PENDIENTE
- GET `/inventory/:productId` → leer de Redis primero
- Si cache miss, leer de PostgreSQL y escribir a Redis
- TTL configurable: 5 minutos por defecto
- Serialización eficiente de datos (JSON)
- Manejo de errores de Redis (fallback a PostgreSQL)

#### ⏳ T2.6.2: Invalidación de caché al actualizar stock

- **Status:** ⏳ PENDIENTE
- Al reservar stock, invalidar key en Redis
- Al confirmar reserva, invalidar key
- Al liberar reserva, invalidar key
- Usar patrón "write-through" para consistencia
- Logging de operaciones de invalidación

#### ⏳ T2.6.3: Caché de agregaciones

- **Status:** ⏳ PENDIENTE
- Cachear query "low stock products" (productos con quantity < 10)
- Cachear "most reserved products" para analytics
- Cachear estadísticas globales de inventario
- TTL más largo para agregaciones (15 min)
- Invalidación programada (cronjob)

#### ⏳ T2.6.4: Configurar Redis Cluster (opcional para portfolio avanzado)

- **Status:** ⏳ PENDIENTE (OPCIONAL)
- Setup master-replica para alta disponibilidad
- Configurar Redis Sentinel para failover automático
- Documentar arquitectura de Redis distribuido
- Health checks de Redis cluster

**✅ Definition of Done - Epic 2.6:**

- [ ] Cache-Aside pattern funciona correctamente
- [ ] Invalidación es inmediata al actualizar datos
- [ ] Latencia de queries con cache <50ms P95
- [ ] Tests de caché (hit, miss, invalidación)
- [ ] Manejo de errores de Redis sin afectar funcionalidad
- [ ] Métricas de cache hit rate implementadas

---

### Epic 2.7: Gestión de Datos y Migraciones

**Priority:** MEDIUM | **Status:** ⏳ PENDIENTE

**Contexto:** Establecer estrategia robusta de migraciones SQL, datos de prueba y sincronización entre servicios.

#### ⏳ T2.7.1: Crear migraciones iniciales para Inventory

- **Status:** ⏳ PENDIENTE
- `001_create_inventory_items.sql`
- `002_create_reservations.sql`
- `003_add_indexes.sql`
- `004_add_constraints.sql`
- Script de ejecución de migraciones en orden
- Verificación de integridad después de cada migración

#### ⏳ T2.7.2: Crear seeders para desarrollo

- **Status:** ⏳ PENDIENTE
- Seed 100 productos en Inventory Service
- Sincronizar UUIDs con productos del Orders Service
- Crear script reutilizable para recrear datos
- Diferentes datasets: dev, test, demo
- Documentar proceso de seeding

#### ⏳ T2.7.3: Script de sincronización de datos

- **Status:** ⏳ PENDIENTE
- Script que copia `product_ids` de Orders a Inventory
- Útil al migrar de monolito a microservicios
- Maneja productos nuevos y existentes
- Logging detallado de operaciones
- Validación de datos antes de sincronizar

#### ⏳ T2.7.4: Estrategia de rollback de migraciones

- **Status:** ⏳ PENDIENTE
- Definir proceso manual de rollback
- Crear migraciones "down" para cada migración "up"
- Documentar escenarios de rollback
- Tests de migraciones up y down
- Backup automático antes de migración

**✅ Definition of Done - Epic 2.7:**

- [ ] Migraciones se ejecutan sin errores en orden correcto
- [ ] Seeds crean datos consistentes entre servicios
- [ ] Script de sincronización funciona correctamente
- [ ] Rollbacks documentados y testeados
- [ ] Proceso de migración documentado en README
- [ ] Backups automáticos configurados

---

## 🔶 FASE 3: Integración Orders ↔ Inventory

**Objetivo:** Comunicación entre servicios vía HTTP y eventos, con compensación distribuida y manejo robusto de fallos.

### Epic 3.1: Comunicación Síncrona (HTTP)

**Priority:** CRITICAL | **Status:** ⏳ PENDIENTE

#### ⏳ T3.1.1: Crear cliente HTTP en Orders Service

- **Status:** ⏳ PENDIENTE
- Service: `InventoryServiceClient`
- Métodos: `checkAvailability()`, `reserveStock()`, `confirmReservation()`
- Configuración de timeout y retry desde variables de entorno

#### ⏳ T3.1.2: Actualizar Saga de Orders

- **Status:** ⏳ PENDIENTE
- **Step 1**: Verificar stock llamando a Inventory Service
- **Step 2**: Reservar stock
- **Step 3**: Procesar pago
- **Step 4**: Confirmar reserva
- **Compensación**: Liberar reserva si falla pago
- Logging detallado de cada step

#### ⏳ T3.1.3: Implementar Circuit Breaker

- **Status:** ⏳ PENDIENTE
- Usar `opossum` o similar en NestJS
- Si Inventory Service está caído, fallar rápido
- Configurar thresholds (error rate, timeout)
- Dashboard de estado del circuit breaker

**✅ Definition of Done - Epic 3.1:**

- [ ] InventoryServiceClient implementado y testeado
- [ ] Saga de Orders actualizada con llamadas HTTP
- [ ] Circuit Breaker funcional y configurado
- [ ] Compensaciones funcionan correctamente
- [ ] Tests E2E con ambos servicios corriendo
- [ ] Manejo de timeouts y errores de red
- [ ] Logs estructurados de comunicación inter-servicio

---

### Epic 3.2: Comunicación Asíncrona (Eventos)

**Priority:** CRITICAL | **Status:** ⏳ PENDIENTE

**Contexto:** Complementar comunicación síncrona con eventos asíncronos para desacoplamiento y notificaciones.

#### ⏳ T3.2.1: Publicar eventos desde Inventory

- **Status:** ⏳ PENDIENTE
- `StockReserved`: cuando se crea una reserva
- `StockConfirmed`: cuando se confirma y decrementa
- `StockReleased`: cuando se cancela una reserva
- `StockDepleted`: cuando quantity = 0
- Integración con Epic 2.5.3 (Publisher ya implementado)

#### ⏳ T3.2.2: Consumir eventos en Orders Service

- **Status:** ⏳ PENDIENTE
- Actualizar estado de orden al confirmar stock
- Manejar evento StockDepleted (notificar backorders)
- Integración con Epic 2.5.4 (Consumer ya implementado)
- Logging de eventos consumidos

**✅ Definition of Done - Epic 3.2:**

- [ ] Todos los eventos de inventario publicados correctamente
- [ ] Orders Service consume y procesa eventos
- [ ] Estado de órdenes se actualiza basado en eventos
- [ ] Tests de integración de eventos end-to-end
- [ ] Idempotencia garantizada (sin procesamiento duplicado)
- [ ] Monitoreo de eventos en RabbitMQ Management UI

---

### Epic 3.3: Compensación Distribuida y Manejo de Fallos

**Priority:** CRITICAL | **Status:** ⏳ PENDIENTE

**Contexto:** Implementar estrategias robustas de compensación para transacciones distribuidas y manejo de fallos de red entre servicios.

#### ⏳ T3.3.1: Implementar patrón Two-Phase Commit simplificado

- **Status:** ⏳ PENDIENTE
- **Phase 1 - Reserve**: reserva temporal en Inventory Service
- **Phase 2 - Confirm o Release**: según resultado de pago
- Timeout de 15 minutos para confirmación automática
- Auto-release si no se confirma a tiempo (cronjob de Epic 2.2.5)
- Logs detallados de cada fase

#### ⏳ T3.3.2: Manejar fallos de red entre servicios

- **Status:** ⏳ PENDIENTE
- Si Inventory no responde, retry 3 veces con exponential backoff
- Si falla definitivamente, marcar orden como FAILED
- Registrar error detallado en logs con correlation ID
- Enviar notificación al cliente sobre fallo
- Compensación: no dejar reservas huérfanas

#### ⏳ T3.3.3: Implementar Dead Letter Queue para eventos fallidos

- **Status:** ⏳ PENDIENTE
- Si Orders no puede procesar evento de inventario, enviar a DLQ
- Crear endpoint administrativo para revisar DLQ: `GET /admin/dlq`
- Dashboard para monitorear eventos fallidos
- Manual retry de eventos desde DLQ: `POST /admin/dlq/:id/retry`
- Alertas cuando DLQ supera threshold (ej. >10 mensajes)

#### ⏳ T3.3.4: Crear tests de "Chaos Engineering" básicos

- **Status:** ⏳ PENDIENTE
- **Test 1**: Simular Inventory Service completamente caído
- **Test 2**: Simular latencia extrema de red (>2 segundos)
- **Test 3**: Simular respuestas malformadas del Inventory Service
- **Test 4**: Simular pérdida de conexión a RabbitMQ
- Verificar que Orders Service no se bloquea ni crashea
- Verificar que compensaciones se ejecutan correctamente

**✅ Definition of Done - Epic 3.3:**

- [ ] Two-Phase Commit funciona correctamente en todos los escenarios
- [ ] Compensaciones previenen órdenes en estado inconsistente
- [ ] DLQ captura eventos fallidos sin pérdida
- [ ] Tests de chaos pasan exitosamente
- [ ] No hay reservas huérfanas en la base de datos
- [ ] Sistema resiliente a fallos de red y servicios caídos
- [ ] Documentación de escenarios de fallo y recuperación

---

## 🔶 FASE 4: API Gateway

**Objetivo:** Implementar punto de entrada único con enrutamiento inteligente, funcionalidades avanzadas de nivel empresarial y seguridad robusta.

### Epic 4.1: Setup del API Gateway

**Priority:** CRITICAL | **Status:** ⏳ PENDIENTE

> **📌 Decisión Arquitectónica:** Este Epic implementa la decisión tomada en el Spike T0.1.1 (Fase 0).  
> Ver [ADR-026: API Gateway Custom con Express](../adr/026-api-gateway-express-custom.md) para contexto completo.

#### ⏳ T4.1.1: Implementar estructura base del API Gateway

- **Status:** ⏳ PENDIENTE
- **Tecnología:** Express + http-proxy-middleware (según decisión ADR-026)
- **Tareas:**
  - Crear directorio `services/api-gateway/`
  - Inicializar proyecto Node.js con TypeScript
  - Instalar dependencias: `express`, `http-proxy-middleware`, `helmet`, `compression`, `morgan`, `winston`, `dotenv`
  - Crear `src/index.ts` con servidor Express básico
  - Configurar variables de entorno (`.env.example`)
  - Implementar health check: `GET /health`
  - Configurar puerto (3000) y graceful shutdown
  - Crear Dockerfile para el gateway
  - Añadir al `docker-compose.yml`
- **Entregable:** API Gateway corriendo en `localhost:3000` con health check funcional

#### ⏳ T4.1.2: Configurar rutas

- **Status:** ⏳ PENDIENTE

```
/api/orders/*     → orders-service:3001
/api/inventory/*  → inventory-service:8080
```

- Configuración basada en path prefix
- Health check del gateway: `GET /health`

#### ⏳ T4.1.3: Implementar autenticación centralizada

- **Status:** ⏳ PENDIENTE
- Validar JWT en Gateway
- Propagar user info a servicios downstream (header `X-User-ID`)
- Endpoints públicos vs protegidos
- Manejo de tokens expirados

**✅ Definition of Done - Epic 4.1:**

- [ ] API Gateway funcional con tecnología seleccionada
- [ ] Rutas configuradas y enrutando correctamente
- [ ] Autenticación JWT centralizada funcionando
- [ ] Health check del gateway implementado
- [ ] Tests de enrutamiento pasando
- [ ] Documentación de configuración

---

### Epic 4.2: Funcionalidades Avanzadas del API Gateway

**Priority:** HIGH | **Status:** ⏳ PENDIENTE

**Contexto:** Implementar features de nivel empresarial en el API Gateway para demostrar conocimiento avanzado de arquitectura de microservicios.

#### ⏳ T4.2.1: Implementar Rate Limiting global

- **Status:** ⏳ PENDIENTE
- Limitar a 100 requests/minuto por IP
- Usar Redis para contadores distribuidos
- Retornar 429 Too Many Requests cuando se excede
- Headers informativos: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- Configuración diferente para usuarios autenticados vs anónimos

#### ⏳ T4.2.2: Implementar Request/Response Logging

- **Status:** ⏳ PENDIENTE
- Log de todos los requests entrantes con correlation ID
- Log de response times para métricas
- Log de errores 4xx y 5xx con detalles
- Integración con Winston para logging estructurado
- Redacción de datos sensibles (passwords, tokens)

#### ⏳ T4.2.3: Implementar Circuit Breaker a nivel Gateway

- **Status:** ⏳ PENDIENTE
- Monitorear error rate de cada servicio downstream
- Si un servicio tiene >50% error rate, abrir circuit
- Retornar 503 Service Unavailable inmediatamente
- Auto-cierre después de timeout configurable (30 segundos)
- Dashboard de estado de circuit breakers

#### ⏳ T4.2.4: Configurar CORS policies

- **Status:** ⏳ PENDIENTE
- Permitir orígenes específicos (whitelist configurable)
- Configurar métodos HTTP permitidos (GET, POST, PUT, DELETE, PATCH)
- Configurar headers permitidos y expuestos
- Preflight requests (OPTIONS) manejados correctamente
- Variables de entorno para configuración

#### ⏳ T4.2.5: Implementar Load Balancing básico (OPCIONAL)

- **Status:** ⏳ PENDIENTE (OPCIONAL)
- Detectar múltiples instancias del mismo servicio
- Algoritmo round-robin simple para distribución
- Health checks para remover instancias no saludables
- Sticky sessions si es necesario

#### ⏳ T4.2.6: Documentar patrones implementados en el Gateway

- **Status:** ⏳ PENDIENTE
- **Nota:** La decisión de tecnología ya está en ADR-026
- **Objetivo:** Documentar CÓMO se implementaron los patrones avanzados
- **Contenido:**
  - Arquitectura de middleware stack (orden y razón)
  - Configuración de Circuit Breaker (thresholds, timeouts)
  - Estrategia de Rate Limiting (por IP, por usuario, por endpoint)
  - Logging strategy (qué se loggea, qué se redacta)
  - Métricas expuestas (latencia, error rate, throughput)
  - Troubleshooting guide para operadores
- **Entregable:** Documento en `docs/api-gateway/ARCHITECTURE.md` o ADR-027 si aplica

**✅ Definition of Done - Epic 4.2:**

- [ ] Rate limiting funcional y configurado
- [ ] Request/Response logging estructurado implementado
- [ ] Circuit breaker previene cascading failures
- [ ] CORS configurado correctamente
- [ ] ADR-028 documentado con decisión clara
- [ ] Tests de cada funcionalidad avanzada
- [ ] Métricas del gateway expuestas (Prometheus)

---

### Epic 4.3: Seguridad del Ecosistema

**Priority:** CRITICAL | **Status:** ⏳ PENDIENTE

**Contexto:** Implementar medidas de seguridad robustas para proteger el ecosistema de microservicios.

#### ⏳ T4.3.1: Implementar Service-to-Service Authentication

- **Status:** ⏳ PENDIENTE
- API keys compartidas entre servicios internos
- O JWT específico para comunicación inter-servicio
- Inventory Service valida requests de Orders Service
- Prevenir acceso directo desde internet (solo via Gateway)
- Rotation policy de API keys documentada

#### ⏳ T4.3.2: Implementar Input Validation en Inventory Service

- **Status:** ⏳ PENDIENTE
- Validar formato de UUIDs en todos los endpoints
- Validar rangos de quantity (min: 1, max: 1000)
- Sanitizar todos los inputs para prevenir SQL injection
- Retornar 400 Bad Request con errores descriptivos
- Usar librería de validación (validator en Go)

#### ⏳ T4.3.3: Rate Limiting por servicio

- **Status:** ⏳ PENDIENTE
- Inventory Service: 200 req/min por cliente
- Orders Service: 100 req/min por usuario
- Rate limiting diferenciado por endpoint (GET vs POST)
- Configuración por variables de entorno

#### ⏳ T4.3.4: Secrets Management

- **Status:** ⏳ PENDIENTE
- Usar Docker secrets o variables de entorno protegidas
- NO commitear credenciales en código fuente
- Documentar proceso de rotación de passwords de BD
- Usar secretos diferentes en dev, test y prod
- `.env` en `.gitignore`, `.env.example` como template

**✅ Definition of Done - Epic 4.3:**

- [ ] Servicios no son accesibles sin autenticación apropiada
- [ ] Input validation previene ataques comunes (SQL injection, XSS)
- [ ] Secrets management implementado correctamente
- [ ] Rate limiting por servicio funcional
- [ ] Documentación de seguridad completa
- [ ] Audit de seguridad básico realizado
- [ ] No hay credenciales en el código fuente

---

## 🔶 FASE 5: Testing Completo

**Objetivo:** Implementar suite completa de tests (unitarios, integración, E2E, concurrencia) con énfasis en tests de concurrencia y performance.

### Epic 5.1: Tests de Inventory Service

**Priority:** CRITICAL | **Status:** ⏳ PENDIENTE

#### ⏳ T5.1.1: Tests unitarios de Domain

- **Status:** ⏳ PENDIENTE
- Entidades, Value Objects, errores de dominio
- Coverage target: >80%

#### ⏳ T5.1.2: Tests de Application Layer

- **Status:** ⏳ PENDIENTE
- Casos de uso mockeando repositorios
- Verificar lógica de negocio

#### ⏳ T5.1.3: Tests de integración

- **Status:** ⏳ PENDIENTE
- Con PostgreSQL y Redis reales (Testcontainers)
- Verificar interacción con infraestructura

#### ⏳ T5.1.4: Tests E2E del API

- **Status:** ⏳ PENDIENTE
- Flujo completo de reserva → confirmación → liberación
- Tests con servidor HTTP real

**✅ Definition of Done - Epic 5.1:**

- [ ] Tests unitarios con coverage >80%
- [ ] Tests de application layer con mocks correctos
- [ ] Tests de integración con testcontainers funcionando
- [ ] Tests E2E cubriendo flujos principales
- [ ] Pipeline CI ejecuta todos los tests
- [ ] Reportes de coverage generados

---

### Epic 5.2: Tests de Integración entre Servicios

**Priority:** CRITICAL | **Status:** ⏳ PENDIENTE

#### ⏳ T5.2.1: Test: Crear orden con verificación de stock

- **Status:** ⏳ PENDIENTE
- Orders Service llama a Inventory Service
- Flujo happy path completo

#### ⏳ T5.2.2: Test: Orden falla si no hay stock

- **Status:** ⏳ PENDIENTE
- Verificar compensación (reserva liberada)
- Verificar estado de orden: FAILED

#### ⏳ T5.2.3: Test de concurrencia básico

- **Status:** ⏳ PENDIENTE
- 100 requests simultáneos comprando el último ítem
- Solo 1 debe tener éxito
- Verificar en BD: stock final correcto

**✅ Definition of Done - Epic 5.2:**

- [ ] Tests de integración entre servicios pasando
- [ ] Compensaciones verificadas funcionando
- [ ] Test de concurrencia básico exitoso
- [ ] Ambos servicios levantados en docker-compose para tests
- [ ] Tests documentados y repetibles

---

### Epic 5.3: Suite Completa de Tests de Concurrencia

**Priority:** CRITICAL | **Status:** ⏳ PENDIENTE

**Contexto:** El feature estrella del proyecto - demostrar manejo correcto de concurrencia con locking optimista y prevención de race conditions.

#### ⏳ T5.3.1: Test: Race condition al reservar último ítem

- **Status:** ⏳ PENDIENTE
- 100 goroutines intentan reservar simultáneamente quantity=1
- Solo 1 debe tener éxito (200 OK)
- 99 deben recibir 409 Conflict (insufficient stock)
- Verificar en base de datos: `reserved = 1`, no más
- Usar testcontainers para PostgreSQL real
- Medir tiempo de ejecución del test

#### ⏳ T5.3.2: Test: Locking optimista con versiones

- **Status:** ⏳ PENDIENTE
- Thread 1 lee item (version=1)
- Thread 2 lee item (version=1)
- Thread 1 actualiza con éxito (version=2)
- Thread 2 intenta actualizar con version=1 → FAIL 409
- Verificar mensaje de error apropiado: "Optimistic lock failure"
- Documentar comportamiento esperado

#### ⏳ T5.3.3: Test: Reservas expiradas liberan stock correctamente

- **Status:** ⏳ PENDIENTE
- Crear 10 reservas con expiración en 1 segundo
- Esperar 2 segundos
- Ejecutar cronjob de expiración manualmente
- Verificar que stock disponible aumentó exactamente en 10 unidades
- Verificar estado de reservas: expired

#### ⏳ T5.3.4: Test de carga con K6

- **Status:** ⏳ PENDIENTE
- Crear script de K6 para simular 1000 usuarios concurrentes
- Cada usuario intenta crear una orden simultáneamente
- Medir latencia P95 (target: <200ms)
- Verificar 0 race conditions en stock
- Generar reporte HTML con resultados
- Documentar configuración de K6

#### ⏳ T5.3.5: Test: Deadlock prevention

- **Status:** ⏳ PENDIENTE
- Orden 1 intenta reservar producto A y B
- Orden 2 intenta reservar producto B y A (orden inverso)
- Ambas órdenes se ejecutan simultáneamente
- Verificar que no hay deadlock (timeout o success en ambas)
- Medir tiempo de resolución
- Implementar estrategia de prevención si es necesario

**✅ Definition of Done - Epic 5.3:**

- [ ] 100% de tests de concurrencia pasan consistentemente
- [ ] 0 race conditions detectadas en múltiples ejecuciones
- [ ] Locking optimista funciona correctamente
- [ ] Reporte de K6 demuestra performance bajo carga
- [ ] Tests de deadlock pasan (no hay bloqueos)
- [ ] Documentación completa de tests de concurrencia
- [ ] Video/GIF demostrando tests de concurrencia (portfolio)

---

### Epic 5.4: Optimización y Performance

**Priority:** MEDIUM | **Status:** ⏳ PENDIENTE

**Contexto:** Optimizar performance del sistema y demostrar conocimiento de benchmarking y tuning.

#### ⏳ T5.4.1: Benchmarking de endpoints críticos

- **Status:** ⏳ PENDIENTE
- Benchmark: GET `/inventory/:id` (target: <50ms P95)
- Benchmark: POST `/inventory/reserve` (target: <100ms P95)
- Usar herramienta como Apache Bench o wrk
- Generar reportes de performance
- Comparar con y sin caché

#### ⏳ T5.4.2: Optimización de queries SQL

- **Status:** ⏳ PENDIENTE
- Añadir índices compuestos donde sea necesario
- Analizar EXPLAIN de queries lentas
- Optimizar JOINs innecesarios
- Documentar decisiones de indexación
- Medir impacto antes/después

#### ⏳ T5.4.3: Connection Pooling optimizado

- **Status:** ⏳ PENDIENTE
- PostgreSQL: max 20 conexiones por servicio
- Redis: max 10 conexiones
- Timeout de conexión: 5 segundos
- Monitoring de pool saturation
- Configuración documentada

#### ⏳ T5.4.4: Compresión de responses

- **Status:** ⏳ PENDIENTE
- Implementar gzip para responses >1KB
- Medir impacto en latencia
- Balance entre CPU y bandwidth
- Configurar en API Gateway
- Comparar tamaños de payload

**✅ Definition of Done - Epic 5.4:**

- [ ] Benchmarks documentados con resultados
- [ ] Optimizaciones implementadas mejoran performance medible
- [ ] Connection pools configurados óptimamente
- [ ] Compresión reduce payload size >50%
- [ ] Documentación de optimizaciones realizadas
- [ ] Gráficas before/after de performance

---

## 🔶 FASE 6: Observabilidad y Monitoreo

**Objetivo:** Implementar logging estructurado, métricas, health checks avanzados y distributed tracing para observabilidad completa del ecosistema.

### Epic 6.1: Logging Estructurado

**Priority:** HIGH | **Status:** ⏳ PENDIENTE

#### ⏳ T6.1.1: Implementar Winston en Orders (ya hecho)

- **Status:** ✅ COMPLETADA (desde Proyecto 2)

#### ⏳ T6.1.2: Implementar Logrus/Zap en Inventory

- **Status:** ⏳ PENDIENTE
- Logging estructurado con JSON output

#### ⏳ T6.1.3: Correlation IDs entre servicios

- **Status:** ⏳ PENDIENTE
- Propagar correlation ID entre servicios
- Incluir en todos los logs

**✅ Definition of Done - Epic 6.1:**

- [ ] Logging estructurado en ambos servicios
- [ ] Correlation IDs funcionando end-to-end
- [ ] Logs en formato JSON
- [ ] Diferentes niveles de log configurables

---

### Epic 6.2: Métricas

**Priority:** HIGH | **Status:** ⏳ PENDIENTE

#### ⏳ T6.2.1: Exponer métricas Prometheus

- **Status:** ⏳ PENDIENTE
- `/metrics` en ambos servicios
- Métricas custom: `inventory_stock_level`, `orders_processed_total`

#### ⏳ T6.2.2: Configurar Grafana Dashboard

- **Status:** ⏳ PENDIENTE
- Dashboard unificado con métricas de ambos servicios

**✅ Definition of Done - Epic 6.2:**

- [ ] Métricas Prometheus expuestas en ambos servicios
- [ ] Grafana dashboard funcional
- [ ] Métricas custom implementadas
- [ ] Alertas básicas configuradas

---

### Epic 6.3: Health Checks Avanzados

**Priority:** MEDIUM | **Status:** ⏳ PENDIENTE

#### ⏳ T6.3.1: Health check con dependencias

- **Status:** ⏳ PENDIENTE
- Verificar conexión a PostgreSQL
- Verificar conexión a Redis
- Verificar conexión a RabbitMQ
- Retornar `503` si alguna falla

**✅ Definition of Done - Epic 6.3:**

- [ ] Health checks verifican todas las dependencias
- [ ] Respuestas correctas (200 healthy, 503 unhealthy)
- [ ] Detalle de qué dependencia falló

---

### Epic 6.4: Distributed Tracing

**Priority:** CRITICAL | **Status:** ⏳ PENDIENTE

**Contexto:** Implementar tracing distribuido para debugging y análisis de performance end-to-end en el ecosistema de microservicios.

#### ⏳ T6.4.1: Implementar OpenTelemetry en ambos servicios

- **Status:** ⏳ PENDIENTE
- Instalar SDK de OpenTelemetry para Go (Inventory)
- Instalar SDK de OpenTelemetry para Node.js (Orders)
- Instrumentar endpoints HTTP automáticamente
- Instrumentar llamadas a base de datos
- Propagar trace context en headers HTTP

#### ⏳ T6.4.2: Setup Jaeger para visualización de traces

- **Status:** ⏳ PENDIENTE
- Añadir Jaeger all-in-one a docker-compose
- Configurar exporters en ambos servicios hacia Jaeger
- UI disponible en `http://localhost:16686`
- Configurar sampling (100% en dev, 10% en prod)

#### ⏳ T6.4.3: Crear Correlation IDs unificados

- **Status:** ⏳ PENDIENTE
- Generar UUID único en API Gateway para cada request
- Propagar en header `X-Correlation-ID`
- Incluir correlation ID en todos los logs estructurados
- Incluir en respuestas de error para debugging

#### ⏳ T6.4.4: Dashboards de latencia cross-service

- **Status:** ⏳ PENDIENTE
- Crear Grafana dashboard con métricas de tracing
- Visualizar latencia P50/P95/P99 por servicio
- Visualizar tiempo total de procesamiento de una orden
- Visualizar tasa de errores distribuida por servicio

**✅ Definition of Done - Epic 6.4:**

- [ ] OpenTelemetry implementado en ambos servicios
- [ ] Traces visibles en Jaeger UI
- [ ] Correlation IDs presentes en todos los logs
- [ ] Dashboard de Grafana con métricas de latencia
- [ ] Latencias medibles end-to-end
- [ ] Documentación de uso de tracing

---

## 🔶 FASE 7: Documentación Final y Deploy

**Objetivo:** Completar documentación técnica y de arquitectura, y preparar el proyecto para deployment.

### Epic 7.1: Documentación

**Priority:** HIGH | **Status:** ⏳ PENDIENTE

#### ⏳ T7.1.1: Completar todos los ADRs

- **Status:** ⏳ PENDIENTE

#### ⏳ T7.1.2: Documentación de API (Swagger/OpenAPI)

- **Status:** ⏳ PENDIENTE

#### ⏳ T7.1.3: Guía de deployment

- **Status:** ⏳ PENDIENTE

#### ⏳ T7.1.4: Runbooks para operación

- **Status:** ⏳ PENDIENTE

**✅ Definition of Done - Epic 7.1:**

- [ ] Todos los ADRs completados
- [ ] API documentada con Swagger
- [ ] Guía de deployment escrita
- [ ] Runbooks para escenarios comunes

---

### Epic 7.2: Deploy

**Priority:** MEDIUM | **Status:** ⏳ PENDIENTE

#### ⏳ T7.2.1: Configurar Docker Compose para producción

- **Status:** ⏳ PENDIENTE

#### ⏳ T7.2.2: (Opcional) Deploy a Kubernetes

- **Status:** ⏳ PENDIENTE (OPCIONAL)

#### ⏳ T7.2.3: (Opcional) Deploy a Railway/Render

- **Status:** ⏳ PENDIENTE (OPCIONAL)

**✅ Definition of Done - Epic 7.2:**

- [ ] Docker Compose production-ready
- [ ] Variables de entorno separadas por ambiente
- [ ] Proceso de deployment documentado

---

### Epic 7.3: Documentación de Arquitectura

**Priority:** MEDIUM | **Status:** ⏳ PENDIENTE

**Contexto:** Crear documentación visual y técnica de la arquitectura del sistema usando C4 Model y diagramas de secuencia.

#### ⏳ T7.3.1: Diagrama C4 Model - Nivel 1 (Context)

- **Status:** ⏳ PENDIENTE
- Identificar actores externos (Cliente, Admin)
- Mostrar sistema completo como caja negra
- Incluir sistemas externos (Email Service, Payment Gateway)
- Documentar interacciones de alto nivel

#### ⏳ T7.3.2: Diagrama C4 Model - Nivel 2 (Containers)

- **Status:** ⏳ PENDIENTE
- Descomponer en: API Gateway, Orders Service, Inventory Service
- Incluir: Bases de datos, Redis, RabbitMQ
- Mostrar protocolos de comunicación (HTTP, AMQP)
- Documentar puertos y endpoints

#### ⏳ T7.3.3: Diagrama de Secuencia: Happy Path de Orden

- **Status:** ⏳ PENDIENTE
- Flujo completo: Cliente → Gateway → Orders → Inventory → Payment
- Incluir tiempos aproximados de cada paso
- Mostrar comunicación síncrona y asíncrona
- Documentar estados de la orden en cada paso

#### ⏳ T7.3.4: Diagrama de Secuencia: Compensación en Fallo

- **Status:** ⏳ PENDIENTE
- Flujo cuando falla el procesamiento de pago
- Orders llama a Inventory para liberar reserva
- Actualización de estado de orden
- Notificación al cliente

#### ⏳ T7.3.5: Documento: Estrategia de Deployment

- **Status:** ⏳ PENDIENTE
- Orden correcto de inicio de servicios
- Healthchecks y readiness probes configurados
- Estrategia de rollback en caso de fallo
- Checklist de deployment

**✅ Definition of Done - Epic 7.3:**

- [ ] Todos los diagramas creados en Mermaid
- [ ] Documentación incluida en repositorio
- [ ] Diagramas referenciados en README principal
- [ ] Estrategia de deployment documentada
- [ ] Diagramas exportados como imágenes (PNG/SVG)

#### ⏳ T7.2.3: (Opcional) Deploy a Railway/Render

---

## 📊 Estado Actual del Proyecto

### ✅ Completado

- [x] Estructura de monorepo (Epic 1.1 - parcial)
- [x] Inventory Service - Esqueleto básico (Epic 1.2 - completo)
- [x] Docker Compose con separación total (Epic 1.4 - parcial)
- [x] Documentación de infraestructura (Epic 1.5 - parcial)
- [x] Makefile raíz

### 🔄 En Progreso - Fase 1

- [ ] **Epic 1.1**: Completar README principal y ADR-026
- [ ] **Epic 1.3**: CI/CD pipelines para ambos servicios
- [ ] **Epic 1.4**: Añadir RabbitMQ y Dockerfile.dev
- [ ] **Epic 1.5**: Completar documentación inicial
- [ ] **Epic 1.6**: Refactoring del Orders Service (NUEVO - CRÍTICO)

### ⏳ Próximos Pasos Inmediatos

1. **Fase 0**: Ejecutar Technical Spikes (decisiones arquitectónicas críticas)
2. **Completar Fase 1**: Todas las épicas 1.1 - 1.6
3. **Tag v3.0.0-phase-1**: Marcar finalización de setup inicial
4. **Empezar Fase 2**: Domain Layer del Inventory Service

### 🚨 Cambios Importantes en este Backlog

**Actualización basada en análisis exhaustivo de gaps (ver GAPS_backlog.md):**

- ✅ **Añadida Fase 0**: Technical Spikes para decisiones arquitectónicas críticas (4 spikes)
- ✅ **Fase 1 ampliada**: Epic 1.6 (Refactoring Orders Service) + T1.4.5 (RabbitMQ setup)
- ✅ **Fase 2 ampliada**: Epic 2.5 (Eventos RabbitMQ), Epic 2.6 (Caché Distribuida), Epic 2.7 (Migraciones)
- ✅ **Fase 3 ampliada**: Epic 3.3 (Compensación Distribuida y Manejo de Fallos)
- ✅ **Fase 4 ampliada**: Epic 4.2 (Features Avanzados Gateway), Epic 4.3 (Seguridad)
- ✅ **Fase 5 ampliada**: Epic 5.3 (Tests de Concurrencia), Epic 5.4 (Optimización y Performance)
- ✅ **Fase 6 ampliada**: Epic 6.4 (Distributed Tracing con OpenTelemetry y Jaeger)
- ✅ **Fase 7 ampliada**: Epic 7.3 (Documentación de Arquitectura con C4 Model)
- ✅ **Definition of Done añadido**: A TODOS los épicos del proyecto (0.1 - 7.3)

**Resumen de gaps integrados:**

- 🔴 **11 Gaps identificados** en análisis (5 críticos, 6 medios/altos)
- 🔴 **50+ tareas nuevas** añadidas al backlog original
- 🔴 **Cobertura completa**: Desde setup hasta deployment production-ready

**Total del proyecto actualizado:**

- **8 Fases** (0-7): Desde Technical Spikes hasta Deployment
- **~35 Épicas**: Cubriendo todos los aspectos de microservicios
- **~150+ Tareas**: Detalladas y con criterios claros
- **Definition of Done**: En cada epic para garantizar calidad

---

## 📝 Notas Importantes

### Separación Proyecto 2 vs Proyecto 3

| Componente         | Proyecto 2                         | Proyecto 3                                          |
| ------------------ | ---------------------------------- | --------------------------------------------------- |
| **Repo**           | `ecommerce-async-resilient-system` | `microservices-ecommerce-system`                    |
| **Orders Port**    | 3000                               | **3001**                                            |
| **Inventory Port** | N/A                                | **8080**                                            |
| **PostgreSQL**     | 5432                               | **5433**                                            |
| **Redis**          | 6379                               | **6380**                                            |
| **RabbitMQ**       | N/A                                | **5672** (AMQP), **15672** (UI)                     |
| **Bases de Datos** | `ecommerce_async`                  | `microservices_orders`<br>`microservices_inventory` |
| **Contenedores**   | `ecommerce-*`                      | `microservices-*`                                   |

### Documentación de Referencia

- [INFRASTRUCTURE_REFERENCE.md](docs/INFRASTRUCTURE_REFERENCE.md) - Puertos, BDs, credenciales
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Guía rápida de comandos
- [GAPS_backlog.md](docs/GAPS_backlog.md) - Análisis detallado de gaps identificados

---

**Última actualización:** 2025-10-16  
**Autor:** Ariel D. Righi  
**Proyecto:** Microservices E-commerce System (Proyecto 3)
