# 🔍 Análisis de Gaps del Backlog - Proyecto 3: Microservicios E-commerce

> **Documento:** Revisión exhaustiva del backlog actual  
> **Fecha:** 2025-10-16  
> **Proyecto:** Sistema de gestión de inventario y órdenes con microservicios  
> **Autor:** Análisis de arquitectura y planificación

---

## 📊 Resumen Ejecutivo

**Estado Actual del Backlog:** 60% Completo

- ✅ Estructura sólida con fases y épicas bien organizadas
- ⚠️ Faltan ~50 tareas críticas para estar production-ready
- 🔴 7 gaps críticos que deben añadirse antes de comenzar Fase 2

**Veredicto:** El backlog actual NO es suficiente para desarrollar el proyecto completo sin encontrar bloqueos a mitad del camino.

---

## ✅ Fortalezas del Backlog Actual

### Lo que está bien implementado:

1. ✅ **Fases bien definidas** (1-7) con objetivos claros por semana
2. ✅ **Épicas agrupadas lógicamente** por funcionalidad técnica
3. ✅ **Separación total del Proyecto 2** documentada (puertos, BDs, contenedores)
4. ✅ **TDD mencionado** desde el inicio del Inventory Service
5. ✅ **Estructura hexagonal** definida claramente para Go
6. ✅ **Métricas de éxito** establecidas al inicio del documento
7. ✅ **Docker Compose** planificado desde Fase 1
8. ✅ **CI/CD** considerado temprano en el proyecto

---

## ❌ GAPS CRÍTICOS IDENTIFICADOS

### 🔴 Gap 1: Migración y Adaptación del Orders Service

**Problema:** El backlog asume que simplemente "clonas" el Proyecto 2, pero hay refactoring masivo necesario para que funcione en un ecosistema de microservicios.

#### Epic 1.6: Refactoring del Orders Service para Microservicios

**Priority:** CRITICAL | **Effort:** 12h | **Dependencies:** Epic 1.1, 1.2

##### ⏳ T1.6.1: Eliminar lógica de inventario interno

- Remover tabla `inventory` de la base de datos del Orders Service
- Eliminar seeders relacionados con inventario
- Eliminar endpoints internos `/inventory/*`
- Actualizar migraciones para eliminar referencias

##### ⏳ T1.6.2: Crear InventoryServiceClient (HTTP)

- Crear interface `IInventoryClient` en módulo común
- Implementación con axios/fetch para llamadas HTTP
- Manejo de errores de red (timeouts, 5xx, connection refused)
- Retry logic con exponential backoff (3 intentos, delay: 1s, 2s, 4s)
- Logging estructurado de todas las llamadas

##### ⏳ T1.6.3: Actualizar Saga Pattern para llamadas externas

- Modificar `OrderSaga` para usar `InventoryServiceClient`
- Añadir step de compensación para fallos de red
- Implementar timeout en llamadas al servicio externo (max 5 segundos)
- Manejar casos de servicio no disponible

##### ⏳ T1.6.4: Actualizar variables de entorno

- `INVENTORY_SERVICE_URL=http://inventory-service:8080`
- `INVENTORY_SERVICE_TIMEOUT=5000`
- `INVENTORY_SERVICE_RETRY_ATTEMPTS=3`
- Actualizar `.env.example` con nuevas variables

##### ⏳ T1.6.5: Actualizar tests del Orders Service

- Mockear `InventoryServiceClient` en unit tests
- Crear fixtures para responses del Inventory Service
- Actualizar E2E tests para levantar ambos servicios
- Tests de timeout y retry logic

**Criterios de Aceptación:**

- Orders Service no tiene lógica de inventario
- Todas las operaciones de stock se delegan al Inventory Service
- Tests pasan con el cliente HTTP mockeado
- E2E tests funcionan con ambos servicios corriendo

---

### 🔴 Gap 2: Estrategia de Comunicación Inter-Servicio Incompleta

**Problema:** Se menciona HTTP y eventos, pero falta decisión crítica sobre REST vs gRPC, y la implementación de eventos está subdesarrollada.

#### Epic 2.5: Sistema de Eventos Distribuidos (RabbitMQ)

**Priority:** CRITICAL | **Effort:** 10h | **Dependencies:** Epic 2.2

##### ⏳ T2.5.1: Setup RabbitMQ en docker-compose

- Añadir servicio RabbitMQ con imagen `rabbitmq:3-management`
- Configurar puerto 5672 (AMQP) y 15672 (Management UI)
- Crear exchanges y queues iniciales
- Configurar persistencia de mensajes
- Health check de RabbitMQ

##### ⏳ T2.5.2: Definir eventos de inventario

- Crear schemas de eventos:
  - `InventoryReserved`: cuando se crea una reserva
  - `InventoryConfirmed`: cuando se confirma y decrementa stock
  - `InventoryReleased`: cuando se cancela una reserva
  - `StockDepleted`: cuando un producto llega a quantity = 0
  - `StockReplenished`: cuando se añade stock a un producto
- Documentar estructura de cada evento con ejemplos

##### ⏳ T2.5.3: Implementar Publisher en Inventory Service (Go)

- Usar librería `github.com/rabbitmq/amqp091-go`
- Crear módulo de eventos con método `Publish(event Event)`
- Publicar al exchange `inventory.events`
- Garantizar at-least-once delivery
- Manejo de errores de publicación

##### ⏳ T2.5.4: Implementar Consumer en Orders Service (NestJS)

- Crear módulo RabbitMQ consumer (además de Bull existente)
- Suscribirse a eventos de inventario desde queue específica
- Procesar eventos y actualizar estado de órdenes
- Idempotencia en procesamiento (evitar duplicados)

##### ⏳ T2.5.5: Crear ADR-027: Estrategia de Comunicación

- Documentar decisión: REST para sync, RabbitMQ para async
- Alternativas consideradas: gRPC, Apache Kafka
- Pros y contras de cada opción
- Justificación de la decisión tomada

**Criterios de Aceptación:**

- RabbitMQ corriendo en docker-compose
- Inventory publica eventos correctamente
- Orders consume y procesa eventos
- ADR documentado

---

### 🔴 Gap 3: Gestión de Transacciones Distribuidas (Saga Compensation)

**Problema:** Se menciona Saga Pattern, pero no hay tareas específicas para compensaciones complejas cuando Inventory Service falla.

#### Epic 3.3: Compensación Distribuida y Manejo de Fallos

**Priority:** CRITICAL | **Effort:** 8h | **Dependencies:** Epic 3.1, 3.2

##### ⏳ T3.3.1: Implementar patrón Two-Phase Commit simplificado

- Phase 1: Reserve - reserva temporal en Inventory Service
- Phase 2: Confirm o Release según resultado de pago
- Timeout de 15 minutos para confirmación
- Auto-release si no se confirma a tiempo

##### ⏳ T3.3.2: Manejar fallos de red entre servicios

- Si Inventory no responde, retry 3 veces con backoff
- Si falla definitivamente, marcar orden como FAILED
- Registrar error detallado en logs
- Enviar notificación al cliente sobre fallo

##### ⏳ T3.3.3: Implementar Dead Letter Queue para eventos fallidos

- Si Orders no puede procesar evento de inventario, enviar a DLQ
- Crear endpoint administrativo para revisar DLQ
- Dashboard para monitorear eventos fallidos
- Manual retry de eventos desde DLQ

##### ⏳ T3.3.4: Crear tests de "Chaos Engineering" básicos

- Test: Simular Inventory Service completamente caído
- Test: Simular latencia extrema de red (>2 segundos)
- Test: Simular respuestas malformadas del Inventory
- Verificar que Orders Service no se bloquea ni crashea

**Criterios de Aceptación:**

- Compensaciones funcionan correctamente en todos los escenarios
- No hay órdenes en estado inconsistente
- DLQ captura eventos fallidos
- Tests de caos pasan exitosamente

---

### 🔴 Gap 4: Cache Distribuida con Redis (Incompleto)

**Problema:** Se menciona caché en Inventory, pero falta estrategia de invalidación y sincronización entre servicios.

#### Epic 2.6: Sistema de Caché Distribuida

**Priority:** HIGH | **Effort:** 6h | **Dependencies:** Epic 2.3

##### ⏳ T2.6.1: Implementar Cache-Aside Pattern en Inventory

- GET `/inventory/:productId` → leer de Redis primero
- Si cache miss, leer de PostgreSQL y escribir a Redis
- TTL configurable: 5 minutos por defecto
- Serialización eficiente de datos

##### ⏳ T2.6.2: Invalidación de caché al actualizar stock

- Al reservar stock, invalidar key en Redis
- Al confirmar reserva, invalidar key
- Al liberar reserva, invalidar key
- Usar patrón "write-through" para consistencia

##### ⏳ T2.6.3: Caché de agregaciones

- Cachear query "low stock products" (pesada, muchos JOINs)
- Cachear "most reserved products" para analytics
- Cachear estadísticas globales de inventario
- TTL más largo para agregaciones (15 min)

##### ⏳ T2.6.4: Configurar Redis Cluster (opcional para portfolio avanzado)

- Setup master-replica para alta disponibilidad
- Configurar Redis Sentinel para failover automático
- Documentar arquitectura de Redis distribuido
- Health checks de Redis cluster

**Criterios de Aceptación:**

- Cache-aside funciona correctamente
- Invalidación es inmediata al actualizar datos
- Latencia de queries con cache <50ms P95
- Tests de invalidación pasan

---

### 🔴 Gap 5: Observabilidad y Debugging Distribuido

**Problema:** Se tienen métricas y logs, pero falta distributed tracing, crítico para debugging de microservicios.

#### Epic 6.4: Distributed Tracing

**Priority:** CRITICAL | **Effort:** 8h | **Dependencies:** Epic 6.1, 6.2

##### ⏳ T6.4.1: Implementar OpenTelemetry en ambos servicios

- Instalar SDK de OpenTelemetry para Go
- Instalar SDK de OpenTelemetry para Node.js
- Instrumentar endpoints HTTP automáticamente
- Instrumentar llamadas a base de datos
- Propagar trace context en headers HTTP

##### ⏳ T6.4.2: Setup Jaeger para visualización de traces

- Añadir Jaeger all-in-one a docker-compose
- Configurar exporters en ambos servicios hacia Jaeger
- UI disponible en `http://localhost:16686`
- Configurar sampling (100% en dev, 10% en prod)

##### ⏳ T6.4.3: Crear Correlation IDs unificados

- Generar UUID único en API Gateway para cada request
- Propagar en header `X-Correlation-ID`
- Incluir correlation ID en todos los logs estructurados
- Incluir en respuestas de error para debugging

##### ⏳ T6.4.4: Dashboards de latencia cross-service

- Crear Grafana dashboard con métricas de tracing
- Visualizar latencia P50/P95/P99 por servicio
- Visualizar tiempo total de procesamiento de una orden
- Visualizar tasa de errores distribuida por servicio

**Criterios de Aceptación:**

- Traces visibles en Jaeger UI
- Correlation IDs presentes en todos los logs
- Dashboard de Grafana funcionando
- Latencias medibles end-to-end

---

### 🔴 Gap 6: API Gateway - Funcionalidad Incompleta

**Problema:** Se definen rutas básicas, pero faltan features críticos de un API Gateway real de nivel empresarial.

#### Epic 4.2: Funcionalidades Avanzadas del API Gateway

**Priority:** HIGH | **Effort:** 10h | **Dependencies:** Epic 4.1

##### ⏳ T4.2.1: Implementar Rate Limiting global

- Limitar a 100 requests/minuto por IP
- Usar Redis para contadores distribuidos
- Retornar 429 Too Many Requests cuando se excede
- Headers informativos: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

##### ⏳ T4.2.2: Implementar Request/Response Logging

- Log de todos los requests entrantes con correlation ID
- Log de response times para métricas
- Log de errores 4xx y 5xx con detalles
- Integración con Winston para logging estructurado

##### ⏳ T4.2.3: Implementar Circuit Breaker a nivel Gateway

- Monitorear error rate de cada servicio downstream
- Si un servicio tiene >50% error rate, abrir circuit
- Retornar 503 Service Unavailable inmediatamente
- Auto-cierre después de timeout configurable

##### ⏳ T4.2.4: Configurar CORS policies

- Permitir origenes específicos (whitelist)
- Configurar métodos HTTP permitidos
- Configurar headers permitidos y expuestos
- Preflight requests manejados correctamente

##### ⏳ T4.2.5: Implementar Load Balancing básico

- Detectar múltiples instancias del mismo servicio
- Algoritmo round-robin simple para distribución
- Health checks para remover instancias no saludables
- Sticky sessions si es necesario

##### ⏳ T4.2.6: Crear ADR-028: Selección de API Gateway

- Decisión final: Express custom vs Kong vs Traefik
- Evaluación de features necesarios vs disponibles
- Consideraciones de complejidad para portfolio
- Justificación técnica de la elección

**Criterios de Aceptación:**

- Rate limiting funcional
- Circuit breaker previene cascading failures
- CORS configurado correctamente
- ADR documentado con decisión clara

---

### 🔴 Gap 7: Testing de Concurrencia (Feature Estrella)

**Problema:** Se menciona "test de concurrencia" vagamente, pero es el feature más importante del proyecto.

#### Epic 5.3: Suite Completa de Tests de Concurrencia

**Priority:** CRITICAL | **Effort:** 12h | **Dependencies:** Epic 2.2, 2.3

##### ⏳ T5.3.1: Test: Race condition al reservar último ítem

- 100 goroutines intentan reservar simultáneamente quantity=1
- Solo 1 debe tener éxito (200 OK)
- 99 deben recibir 409 Conflict (insufficient stock)
- Verificar en base de datos: `reserved = 1`, no más
- Usar testcontainers para PostgreSQL real

##### ⏳ T5.3.2: Test: Locking optimista con versiones

- Thread 1 lee item (version=1)
- Thread 2 lee item (version=1)
- Thread 1 actualiza con éxito (version=2)
- Thread 2 intenta actualizar con version=1 → FAIL 409
- Verificar mensaje de error apropiado

##### ⏳ T5.3.3: Test: Reservas expiradas liberan stock correctamente

- Crear 10 reservas con expiración en 1 segundo
- Esperar 2 segundos
- Ejecutar cronjob de expiración manualmente
- Verificar que stock disponible aumentó exactamente en 10 unidades

##### ⏳ T5.3.4: Test de carga con K6

- Crear script de K6 para simular 1000 usuarios concurrentes
- Cada usuario intenta crear una orden simultáneamente
- Medir latencia P95 (target: <200ms)
- Verificar 0 race conditions en stock
- Generar reporte HTML con resultados

##### ⏳ T5.3.5: Test: Deadlock prevention

- Orden 1 intenta reservar producto A y B
- Orden 2 intenta reservar producto B y A (orden inverso)
- Ambas órdenes se ejecutan simultáneamente
- Verificar que no hay deadlock (timeout o success en ambas)
- Medir tiempo de resolución

**Criterios de Aceptación:**

- 100% de tests de concurrencia pasan
- 0 race conditions detectadas
- Locking optimista funciona correctamente
- Reporte de K6 demuestra performance bajo carga

---

### 🟡 Gap 8: Seguridad (Casi Ausente)

**Problema:** Solo se menciona "autenticación centralizada" vagamente, pero la seguridad necesita más atención.

#### Epic 4.3: Seguridad del Ecosistema

**Priority:** HIGH | **Effort:** 6h | **Dependencies:** Epic 4.1

##### ⏳ T4.3.1: Implementar Service-to-Service Authentication

- API keys compartidas entre servicios internos
- O JWT específico para comunicación inter-servicio
- Inventory Service valida requests de Orders Service
- Prevenir acceso directo desde internet (solo via Gateway)

##### ⏳ T4.3.2: Implementar Input Validation en Inventory

- Validar formato de UUIDs
- Validar rangos de quantity (min: 1, max: 1000)
- Sanitizar todos los inputs para prevenir SQL injection
- Retornar 400 Bad Request con errores descriptivos

##### ⏳ T4.3.3: Rate Limiting por servicio

- Inventory Service: 200 req/min por cliente
- Orders Service: 100 req/min por usuario
- Rate limiting diferenciado por endpoint

##### ⏳ T4.3.4: Secrets Management

- Usar Docker secrets o variables de entorno protegidas
- NO commitear credenciales en código fuente
- Documentar proceso de rotación de passwords de BD
- Usar secretos diferentes en dev, test y prod

**Criterios de Aceptación:**

- Servicios no son accesibles sin autenticación
- Input validation previene ataques comunes
- Secrets management implementado
- Documentación de seguridad completa

---

### 🟡 Gap 9: Data Management y Migraciones

**Problema:** Se definen migraciones básicamente, pero falta estrategia de datos de prueba y sincronización.

#### Epic 2.7: Gestión de Datos y Migraciones

**Priority:** MEDIUM | **Effort:** 6h | **Dependencies:** Epic 2.3

##### ⏳ T2.7.1: Crear migraciones iniciales para Inventory

- `001_create_inventory_items.sql`
- `002_create_reservations.sql`
- `003_add_indexes.sql`
- `004_add_constraints.sql`

##### ⏳ T2.7.2: Crear seeders para desarrollo

- Seed 100 productos en Inventory Service
- Sincronizar UUIDs con productos del Orders Service
- Crear script reutilizable para recrear datos

##### ⏳ T2.7.3: Script de sincronización de datos

- Script que copia `product_ids` de Orders a Inventory
- Útil al migrar de monolito a microservicios
- Maneja productos nuevos y existentes
- Logging detallado de operaciones

##### ⏳ T2.7.4: Estrategia de rollback de migraciones

- Definir proceso manual de rollback
- Crear migraciones "down" para cada migración "up"
- Documentar escenarios de rollback
- Tests de migraciones up y down

**Criterios de Aceptación:**

- Migraciones se ejecutan sin errores
- Seeds crean datos consistentes
- Script de sincronización funciona
- Rollbacks documentados

---

### 🟡 Gap 10: Performance y Optimización

**Problema:** No hay épica dedicada a optimización, crítico para demostrar expertise técnico.

#### Epic 5.4: Optimización y Performance

**Priority:** MEDIUM | **Effort:** 8h | **Dependencies:** Epic 5.1

##### ⏳ T5.4.1: Benchmarking de endpoints críticos

- Benchmark: GET `/inventory/:id` (target: <50ms P95)
- Benchmark: POST `/inventory/reserve` (target: <100ms P95)
- Usar herramienta como Apache Bench o wrk
- Generar reportes de performance

##### ⏳ T5.4.2: Optimización de queries SQL

- Añadir índices compuestos donde sea necesario
- Analizar EXPLAIN de queries lentas
- Optimizar JOINs innecesarios
- Documentar decisiones de indexación

##### ⏳ T5.4.3: Connection Pooling optimizado

- PostgreSQL: max 20 conexiones por servicio
- Redis: max 10 conexiones
- Timeout de conexión: 5 segundos
- Monitoring de pool saturation

##### ⏳ T5.4.4: Compresión de responses

- Implementar gzip para responses >1KB
- Medir impacto en latencia
- Balance entre CPU y bandwidth
- Configurar en API Gateway

**Criterios de Aceptación:**

- Benchmarks documentados
- Optimizaciones implementadas mejoran performance
- Connection pools configurados óptimamente
- Compresión reduce payload size

---

### 🟡 Gap 11: Documentación Técnica de Arquitectura

**Problema:** Se tienen ADRs genéricos, pero faltan diagramas detallados y documentación de flujos.

#### Epic 7.3: Documentación de Arquitectura

**Priority:** MEDIUM | **Effort:** 6h | **Dependencies:** Todas las fases anteriores

##### ⏳ T7.3.1: Diagrama C4 Model - Nivel 1 (Context)

- Identificar actores externos (Cliente, Admin)
- Mostrar sistema completo como caja negra
- Incluir sistemas externos (Email Service, Payment Gateway)
- Documentar interacciones de alto nivel

##### ⏳ T7.3.2: Diagrama C4 Model - Nivel 2 (Containers)

- Descomponer en: API Gateway, Orders Service, Inventory Service
- Incluir: Bases de datos, Redis, RabbitMQ
- Mostrar protocolos de comunicación (HTTP, AMQP)
- Documentar puertos y endpoints

##### ⏳ T7.3.3: Diagrama de Secuencia: Happy Path de Orden

- Flujo completo: Cliente → Gateway → Orders → Inventory → Payment
- Incluir tiempos aproximados de cada paso
- Mostrar comunicación síncrona y asíncrona
- Documentar estados de la orden en cada paso

##### ⏳ T7.3.4: Diagrama de Secuencia: Compensación en Fallo

- Flujo cuando falla el procesamiento de pago
- Orders llama a Inventory para liberar reserva
- Actualización de estado de orden
- Notificación al cliente

##### ⏳ T7.3.5: Documento: Estrategia de Deployment

- Orden correcto de inicio de servicios
- Healthchecks y readiness probes configurados
- Estrategia de rollback en caso de fallo
- Checklist de deployment

**Criterios de Aceptación:**

- Todos los diagramas creados en Mermaid
- Documentación incluida en repositorio
- Diagramas referenciados en README principal
- Estrategia de deployment documentada

---

## 📊 Resumen de Gaps por Criticidad

| Gap | Categoría                   | Criticidad | Tareas | Effort |
| --- | --------------------------- | ---------- | ------ | ------ |
| 1   | Refactoring Orders          | 🔴 CRÍTICO | 5      | 12h    |
| 2   | Comunicación Inter-Servicio | 🔴 CRÍTICO | 5      | 10h    |
| 3   | Saga Compensation           | 🔴 CRÍTICO | 4      | 8h     |
| 4   | Caché Distribuida           | 🟡 MEDIO   | 4      | 6h     |
| 5   | Distributed Tracing         | 🔴 CRÍTICO | 4      | 8h     |
| 6   | API Gateway Avanzado        | 🟡 MEDIO   | 6      | 10h    |
| 7   | Tests de Concurrencia       | 🔴 CRÍTICO | 5      | 12h    |
| 8   | Seguridad                   | 🔴 CRÍTICO | 4      | 6h     |
| 9   | Data Management             | 🟡 MEDIO   | 4      | 6h     |
| 10  | Performance                 | 🟡 MEDIO   | 4      | 8h     |
| 11  | Docs Arquitectura           | 🟡 MEDIO   | 5      | 6h     |

**Totales:**

- **Tareas adicionales necesarias:** 50 tareas
- **Effort total:** 92 horas (~2.5 semanas adicionales)
- **Gaps críticos (🔴):** 6 épicas / 31 tareas
- **Gaps medios (🟡):** 5 épicas / 19 tareas

---

## 🎯 Recomendaciones de Acción

### 1️⃣ Prioriza los Gaps Críticos Primero

Los siguientes gaps son **no negociables** para un portfolio profesional de microservicios:

- Gap 1: Refactoring de Orders Service
- Gap 2: Sistema de eventos con RabbitMQ
- Gap 3: Compensación distribuida
- Gap 5: Distributed tracing
- Gap 7: Tests de concurrencia exhaustivos
- Gap 8: Seguridad básica

**Acción:** Integra estos 6 gaps antes de comenzar la Fase 2.

### 2️⃣ Reorganiza las Fases del Proyecto

**Estructura Sugerida:**

```
FASE 0: Technical Spikes (3 días)
  └── Investigación de tecnologías clave

FASE 1: Setup + Refactoring (Semana 1-2)
  ├── Épicas existentes 1.1-1.5 ✅
  ├── Epic 1.6: Refactoring Orders Service 🔴
  └── Epic 1.7: Setup RabbitMQ 🔴

FASE 2: Inventory Core + Comunicación (Semana 3-4)
  ├── Épicas existentes 2.1-2.4 ✅
  ├── Epic 2.5: Sistema de Eventos 🔴
  ├── Epic 2.6: Caché Distribuida 🟡
  └── Epic 2.7: Data Management 🟡

FASE 3: Integración Cross-Service (Semana 5)
  ├── Épicas existentes 3.1-3.2 ✅
  └── Epic 3.3: Compensación Distribuida 🔴

FASE 4: API Gateway (Semana 6)
  ├── Epic existente 4.1 ✅
  ├── Epic 4.2: Features Avanzados 🟡
  └── Epic 4.3: Seguridad 🔴

FASE 5: Testing Exhaustivo (Semana 7-8)
  ├── Épicas existentes 5.1-5.2 ✅
  ├── Epic 5.3: Tests de Concurrencia 🔴
  └── Epic 5.4: Performance 🟡

FASE 6: Observabilidad (Semana 9)
  ├── Épicas existentes 6.1-6.3 ✅
  └── Epic 6.4: Distributed Tracing 🔴

FASE 7: Documentación + Deploy (Semana 10)
  ├── Épicas existentes 7.1-7.2 ✅
  └── Epic 7.3: Docs de Arquitectura 🟡
```

### 3️⃣ Añade "Definition of Done" a Cada Epic

**Ejemplo para Epic 2.1:**

```markdown
## Epic 2.1: Domain Layer - Entidades y Lógica de Negocio

✅ Definition of Done:

- [ ] Todas las entidades tienen tests unitarios con coverage >80%
- [ ] Value Objects validados con casos edge (negativos, límites)
- [ ] Errores de dominio documentados en código con ejemplos
- [ ] Interfaces de repositorios definidas y documentadas
- [ ] Code review completado por segundo desarrollador
- [ ] Documentación técnica actualizada
```

El Epic 0 debería enfocarse en decisiones pendientes reales, no en cosas ya definidas:
Epic 0.1: Technical Spikes (CORREGIDO)
⏳ Spike 0.1.1: Selección de API Gateway para Portfolio
Contexto: Necesitamos un gateway que enrute a Orders (NestJS/REST) e Inventory (Go/REST).
Opciones a evaluar:

Express custom con http-proxy-middleware

Pro: Control total, fácil de entender para recruiters
Pro: Mismo stack que Orders (Node.js)
Contra: Tenés que implementar todo (rate limiting, circuit breaker, etc.)

Kong (Open Source)

Pro: Nivel empresarial, muchas features out-of-the-box
Contra: Complejidad de setup puede opacar el proyecto
Contra: Puede parecer "overkill" para un portfolio

Traefik

Pro: Configuración simple con docker labels
Pro: Auto-descubrimiento de servicios
Contra: Menos control granular

Decisión esperada: Express custom (recomendado para portfolio - máxima transparencia)

⏳ Spike 0.1.2: Testcontainers en Go - Viabilidad para CI/CD
Contexto: Inventory Service (Go) necesita tests de integración con PostgreSQL real.
A investigar:

¿Testcontainers funciona bien en GitHub Actions?
¿Tiempo de setup es aceptable? (<2 min ideal)
¿Alternativas como sqlmock son suficientes para el portfolio?

Entregable: PoC de test con testcontainers + decisión documentada

⏳ Spike 0.1.3: Estrategia de Comunicación Síncrona
Contexto: Orders (NestJS) necesita llamar a Inventory (Go/Gin).
Ya decidido: REST (ambos servicios son RESTful)
A definir:

¿Cliente HTTP nativo de NestJS (@nestjs/axios) o librería custom?
¿Timeout strategy? (5s, 10s?)
¿Retry automático o manual?
¿Circuit breaker a nivel de cliente o gateway?

Entregable: ADR con decisiones de implementación

⏳ Spike 0.1.4: RabbitMQ vs Redis Pub/Sub para eventos asíncronos
Contexto: Inventory necesita publicar eventos (InventoryReserved, etc.) que Orders consume.
Opciones:

RabbitMQ (nuevo en el stack)

Pro: Garantías de entrega más fuertes
Pro: Queues persistentes
Contra: Añade complejidad al docker-compose

Redis Pub/Sub (ya tenés Redis del Proyecto 2)

Pro: Infraestructura existente
Pro: Más simple
Contra: No persiste mensajes (at-most-once delivery)

Recomendación para portfolio: RabbitMQ (demuestra más conocimiento de message brokers)
