# ADR-029: Estrategia de Comunicación Asíncrona - RabbitMQ vs Redis Pub/Sub

## 📋 Metadata

| Campo | Valor |
|-------|-------|
| **Estado** | ✅ ACEPTADA |
| **Fecha** | 2025-10-17 |
| **Contexto** | Spike T0.1.4 - Selección de Message Broker |
| **Decisores** | Equipo de Arquitectura |
| **Consecuencias** | Añade RabbitMQ al stack, establece patrón de eventos entre servicios |

---

## 🎯 Contexto y Problema

### Situación Actual

Estamos construyendo un ecosistema de microservicios con dos servicios principales:

- **Orders Service** (NestJS/TypeScript): Gestiona órdenes de compra
- **Inventory Service** (Go/Gin): Gestiona inventario y reservas de stock

**Necesidad de comunicación asíncrona:**

1. **Inventory → Orders**: Cuando se confirma/libera una reserva
   - Evento: `InventoryReserved` → Orders debe actualizar estado
   - Evento: `InventoryConfirmed` → Orders marca pedido como "procesando"
   - Evento: `InventoryReleased` → Orders cancela pedido por falta de stock

2. **Orders → Inventory**: Cuando cambia estado de pedido
   - Evento: `OrderCancelled` → Inventory libera reserva
   - Evento: `OrderCompleted` → Inventory confirma venta definitiva

3. **Notificaciones internas**:
   - `StockDepleted`: Producto sin stock (alerta para reabastecimiento)
   - `StockReplenished`: Stock añadido (útil para analytics)

### Problema a Resolver

**¿Qué message broker usar para comunicación asíncrona entre microservicios?**

Necesitamos un sistema que:
- ✅ Garantice entrega confiable de eventos críticos (reservas, cancelaciones)
- ✅ Desacople temporalmente los servicios (no bloqueante)
- ✅ Permita retry automático ante fallos
- ✅ Sea demostrable en entrevistas técnicas (valor de portfolio)
- ✅ Se integre bien con NestJS y Go

### Alcance

**Dentro del alcance:**
- Selección de message broker (RabbitMQ vs Redis Pub/Sub vs Kafka)
- Patrones de comunicación (eventos, commands)
- Garantías de entrega requeridas
- Manejo de errores y Dead Letter Queues
- Integración con stack actual (NestJS + Go)

**Fuera del alcance:**
- Implementación detallada (se hará en Epic 2.5)
- Schemas de eventos específicos (se definen en Fase 2)
- Configuración de clustering de RabbitMQ (proyecto usa Docker Compose simple)

---

## 🔍 Drivers de Decisión

### Criterios Técnicos

| Criterio | Peso | Descripción |
|----------|------|-------------|
| **Garantías de Entrega** | 🔴 CRÍTICO | Eventos de reservas NO pueden perderse |
| **Persistencia** | 🟠 ALTO | Mensajes deben sobrevivir a reinicio de broker |
| **Complejidad Operacional** | 🟡 MEDIO | Facilidad de setup en Docker Compose |
| **Curva de Aprendizaje** | 🟡 MEDIO | Tiempo para dominar la tecnología |
| **Integración con Stack** | 🟠 ALTO | Soporte en NestJS y Go |
| **Escalabilidad** | 🟢 BAJO | 2-3 servicios (no es prioridad ahora) |
| **Valor de Portfolio** | 🟠 ALTO | Demuestra conocimiento de arquitecturas distribuidas |

### Casos de Uso Específicos

#### Caso 1: Reserva de Inventario (Crítico)
```
Orders Service → HTTP POST /inventory/reserve → Inventory Service
                     ↓ (success)
Inventory Service → Publica evento InventoryReserved
                     ↓
Orders Service → Consume evento → Actualiza orden a "reserved"
```

**Requisitos:**
- ✅ **At-least-once delivery**: Evento NO puede perderse
- ✅ **Idempotencia**: Si evento se recibe 2 veces, no duplicar procesamiento
- ✅ **Retry**: Si Orders está caído, reintentar hasta que procese

#### Caso 2: Cancelación de Orden
```
Orders Service → Cambia estado a "cancelled"
                     ↓
Orders Service → Publica evento OrderCancelled
                     ↓
Inventory Service → Consume evento → Libera reserva (UPDATE reservations SET status = 'released')
```

**Requisitos:**
- ✅ **Persistencia**: Evento debe persistir si Inventory está temporalmente caído
- ✅ **Orden garantizado**: No procesar eventos fuera de orden (cancelar antes de confirmar)

#### Caso 3: Notificación de Stock Bajo (Menos crítico)
```
Inventory Service → Detecta quantity < 10
                     ↓
Inventory Service → Publica evento StockDepleted
                     ↓
(Futuro) Notifications Service → Envía email a admin
```

**Requisitos:**
- ⚠️ **Best-effort delivery**: Si se pierde 1 evento no es crítico
- ✅ **Fire-and-forget**: No bloquear operación principal

---

## 📊 Opciones Evaluadas

### Opción 1: RabbitMQ 🐰

**Descripción:**  
Message broker maduro y robusto basado en AMQP (Advanced Message Queuing Protocol). Diseñado específicamente para sistemas distribuidos con alta confiabilidad.

**Arquitectura:**
```
Publisher (Inventory Service)
    ↓ publica mensaje
Exchange (tipo: topic)
    ↓ routing por pattern
Queue (inventory.reserved)
    ↓ consume mensaje
Consumer (Orders Service)
```

**Características Clave:**
- ✅ **At-least-once delivery**: Acknowledgments manuales garantizan entrega
- ✅ **Persistencia**: Mensajes se escriben a disco (survive restart)
- ✅ **Dead Letter Queue (DLQ)**: Mensajes fallidos van a queue separada
- ✅ **Message TTL**: Expiración automática de mensajes antiguos
- ✅ **Priority queues**: Mensajes urgentes pueden tener prioridad
- ✅ **Clustering**: Alta disponibilidad en producción (fuera de scope actual)

**Casos de Uso Ideales:**
- Sistemas financieros (transacciones críticas)
- E-commerce (órdenes, pagos, inventario)
- Sistemas de notificaciones confiables
- Arquitecturas event-driven con múltiples consumidores

**Pros:**
- ✅ **Garantías de entrega fuertes**: Configuración at-least-once o exactly-once
- ✅ **Management UI incluida**: Dashboard visual en puerto 15672
- ✅ **Soporte multi-protocolo**: AMQP 0.9.1, AMQP 1.0, MQTT, STOMP
- ✅ **Plugins extensibles**: Shovel, Federation, Consistent Hash Exchange
- ✅ **Excelente documentación**: Tutoriales oficiales muy completos
- ✅ **Librería oficial para Go**: `github.com/rabbitmq/amqp091-go`
- ✅ **NestJS tiene módulo nativo**: `@nestjs/microservices` con RabbitMQ transport
- ✅ **Retry automático**: Con exponential backoff configurable
- ✅ **Routing flexible**: Topic exchanges con wildcards (`inventory.*.reserved`)

**Contras:**
- ❌ **Complejidad inicial**: Conceptos de exchange, binding, routing keys
- ❌ **Overhead de infraestructura**: Otro contenedor en docker-compose
- ❌ **Memoria**: ~200-300 MB RAM base (vs Redis 50-100 MB)
- ❌ **Curva de aprendizaje**: AMQP protocol no es trivial
- ❌ **Latencia**: ~5-10ms por mensaje (vs Redis ~1ms)

**Stack Tecnológico:**
- Docker image: `rabbitmq:3.13-management-alpine`
- Go library: `github.com/rabbitmq/amqp091-go` v1.9.0
- NestJS: `@nestjs/microservices` + `amqplib`
- Management UI: http://localhost:15672 (guest/guest)

---

### Opción 2: Redis Pub/Sub 📡

**Descripción:**  
Sistema de mensajería ligero incluido en Redis. Usa patrón publish-subscribe simple sin persistencia.

**Arquitectura:**
```
Publisher (Inventory Service)
    ↓ PUBLISH inventory.reserved '{"orderId": 123}'
Channel (inventory.reserved)
    ↓ broadcast a todos los subscribers
Subscriber (Orders Service)
```

**Características Clave:**
- ✅ **Fire-and-forget**: Latencia ultra-baja (~1ms)
- ✅ **Pattern matching**: PSUBSCRIBE `inventory.*` escucha todos los eventos
- ⚠️ **No persistencia**: Mensajes en memoria volátil
- ⚠️ **At-most-once delivery**: Si subscriber está offline, mensaje se pierde
- ❌ **Sin ACK**: No hay confirmación de procesamiento exitoso
- ❌ **Sin Dead Letter Queue**: Mensajes fallidos se pierden

**Casos de Uso Ideales:**
- Notificaciones en tiempo real (chat, dashboards)
- Cache invalidation broadcasts
- Métricas no-críticas
- Logs distribuidos (best-effort)

**Pros:**
- ✅ **Infraestructura existente**: Ya tenemos Redis para caché y Bull queues
- ✅ **Simplicidad extrema**: Solo `PUBLISH` y `SUBSCRIBE` commands
- ✅ **Latencia ultra-baja**: <1ms por mensaje
- ✅ **Bajo overhead**: ~50-100 MB RAM
- ✅ **Fácil de debugear**: Redis CLI con `MONITOR` command
- ✅ **Zero configuration**: No exchanges, no bindings, solo channels
- ✅ **Librería nativa en Go**: `github.com/go-redis/redis/v8`
- ✅ **NestJS tiene soporte**: `@nestjs/microservices` con Redis transport

**Contras:**
- ❌ **No persistencia**: Mensajes NO sobreviven a restart de Redis
- ❌ **At-most-once delivery**: Si consumer está offline, evento se pierde
- ❌ **Sin retry automático**: Debe implementarse manualmente
- ❌ **Sin Dead Letter Queue**: Mensajes fallidos desaparecen
- ❌ **No garantías de orden**: Mensajes pueden llegar fuera de secuencia
- ❌ **Sin ACK/NACK**: No hay confirmación de procesamiento
- ❌ **Escalabilidad limitada**: Un solo Redis (sin sharding de Pub/Sub)
- ❌ **Pobre valor de portfolio**: Demasiado simple para entrevistas

**Stack Tecnológico:**
- Redis: Ya existente en proyecto (versión 7.x)
- Go library: `github.com/go-redis/redis/v8`
- NestJS: `@nestjs/microservices` con Redis transport
- Monitoreo: Redis CLI `MONITOR` command

---

### Opción 3: Apache Kafka 🦅

**Descripción:**  
Plataforma de streaming distribuido diseñada para logs de alto volumen. Overkill para este proyecto pero incluida para análisis completo.

**Arquitectura:**
```
Producer (Inventory Service)
    ↓ produce record
Topic (inventory-events)
    ↓ particionado
Consumer Group (orders-service)
    ↓ consume offset
Consumer (Orders Service)
```

**Características Clave:**
- ✅ **Persistencia duradera**: Logs en disco con retención configurable (días/semanas)
- ✅ **Alto throughput**: Millones de mensajes/segundo
- ✅ **Replay de eventos**: Consumer puede volver a leer mensajes históricos
- ✅ **Partitioning**: Paralelización automática con consumer groups
- ⚠️ **Complejidad alta**: Requiere Zookeeper (o KRaft mode en v3.x)
- ⚠️ **Overhead significativo**: ~1 GB RAM mínimo

**Casos de Uso Ideales:**
- Event sourcing (CQRS completo)
- Data pipelines de analytics
- Logs centralizados de miles de servicios
- Stream processing (Kafka Streams)

**Pros:**
- ✅ **Durabilidad extrema**: Eventos persisten días/semanas
- ✅ **Replay de eventos**: Útil para debugging y reprocessing
- ✅ **Escalabilidad masiva**: Diseñado para cientos de servicios
- ✅ **Garantías de orden**: Por partición
- ✅ **Ecosystem maduro**: Kafka Connect, Kafka Streams, ksqlDB

**Contras:**
- ❌ **OVERKILL para 2-3 servicios**: Diseñado para >50 microservicios
- ❌ **Complejidad operacional**: Requiere Zookeeper/KRaft + múltiples brokers
- ❌ **Overhead de recursos**: ~1 GB RAM + CPU significativo
- ❌ **Curva de aprendizaje muy alta**: Conceptos de partitions, offsets, consumer groups
- ❌ **Latencia mayor**: ~10-50ms por mensaje (diseñado para throughput, no latencia)
- ❌ **Setup complejo en Docker**: docker-compose con Zookeeper/KRaft
- ❌ **Tiempo de desarrollo**: ~2-3x más lento que RabbitMQ para features básicas

**Stack Tecnológico:**
- Docker images: `confluentinc/cp-kafka` + `confluentinc/cp-zookeeper`
- Go library: `github.com/segmentio/kafka-go` o `github.com/IBM/sarama`
- NestJS: `@nestjs/microservices` con Kafka transport
- Management: Kafka UI (puerto 8080)

**Veredicto:**
❌ **RECHAZADO**: Overkill para proyecto de 2-3 servicios. Kafka brilla con >50 microservicios y terabytes de logs.

---

## 📊 Análisis Comparativo Detallado

### Tabla de Comparación

| Criterio | RabbitMQ 🐰 | Redis Pub/Sub 📡 | Kafka 🦅 |
|----------|-------------|-----------------|----------|
| **Garantías de Entrega** | ✅ At-least-once (configurable) | ❌ At-most-once (fire-and-forget) | ✅ At-least-once (por defecto) |
| **Persistencia** | ✅ Mensajes en disco | ❌ Solo en memoria (volátil) | ✅ Logs durables (días/semanas) |
| **Dead Letter Queue** | ✅ Nativo | ❌ Manual (con Lua scripts) | ⚠️ Custom (consumer logic) |
| **Retry Automático** | ✅ Exponential backoff | ❌ Manual implementation | ⚠️ Consumer group rebalance |
| **ACK/NACK** | ✅ Acknowledgments explícitos | ❌ Sin confirmación | ✅ Offset commits |
| **Latencia** | 🟡 5-10ms | ✅ <1ms | 🟠 10-50ms |
| **Throughput** | 🟡 10k-50k msg/s | ✅ 100k+ msg/s | ✅ 1M+ msg/s |
| **Complejidad Setup** | 🟡 Media (exchanges, queues) | ✅ Baja (PUBLISH/SUBSCRIBE) | ❌ Alta (Zookeeper/KRaft) |
| **Memoria Base** | 🟠 200-300 MB | ✅ 50-100 MB | ❌ 1+ GB |
| **Curva de Aprendizaje** | 🟡 1-2 semanas | ✅ 1-2 días | ❌ 2-4 semanas |
| **NestJS Integration** | ✅ Nativo (`@nestjs/microservices`) | ✅ Nativo (`@nestjs/microservices`) | ✅ Nativo (`@nestjs/microservices`) |
| **Go Libraries** | ✅ Oficial (amqp091-go) | ✅ Excelente (go-redis) | ✅ Múltiples (kafka-go, sarama) |
| **Management UI** | ✅ RabbitMQ Management Plugin | ⚠️ Redis Commander (3rd party) | ⚠️ Kafka UI (3rd party) |
| **Valor de Portfolio** | ✅ Alto (estándar industria) | 🟠 Medio (demasiado simple) | ✅ Muy alto (tecnología avanzada) |
| **Fit para E-commerce** | ✅ Ideal (inventario crítico) | ❌ Riesgoso (pérdida mensajes) | ⚠️ Overkill (2-3 servicios) |

**Leyenda:**  
- ✅ Excelente / Cumple completamente  
- 🟡 Aceptable / Cumple parcialmente  
- 🟠 Limitado / Requiere workarounds  
- ❌ No cumple / No recomendado  

---

### Análisis por Caso de Uso

#### Caso 1: Eventos Críticos (InventoryReserved, OrderCancelled)

**Requisitos:**
- At-least-once delivery: Mensajes NO pueden perderse
- Persistencia: Survive restart de servicios
- Retry automático: Reintentar hasta éxito
- Dead Letter Queue: Mensajes fallidos para debugging

| Solución | Cumplimiento | Evaluación |
|----------|--------------|------------|
| **RabbitMQ** | 100% | ✅ **CUMPLE TODOS** - Diseñado para este escenario |
| **Redis Pub/Sub** | 20% | ❌ **NO CUMPLE** - At-most-once, sin persistencia |
| **Kafka** | 95% | ✅ Cumple pero overkill (100x más complejo) |

**Veredicto:** RabbitMQ es la opción obvia para eventos críticos.

---

#### Caso 2: Notificaciones Best-Effort (StockDepleted, Metrics)

**Requisitos:**
- Latencia ultra-baja
- Fire-and-forget acceptable
- Simplicidad operacional

| Solución | Cumplimiento | Evaluación |
|----------|--------------|------------|
| **RabbitMQ** | 80% | ✅ Funciona pero latencia ~5-10ms |
| **Redis Pub/Sub** | 100% | ✅ **IDEAL** - <1ms latency, simple |
| **Kafka** | 60% | ⚠️ Latencia ~10-50ms, overkill |

**Veredicto:** Redis Pub/Sub es superior para notificaciones no-críticas.

**Decisión:** Usar RabbitMQ para TODOS los eventos (incluso no-críticos) para:
- ✅ Consistencia arquitectónica (un solo message broker)
- ✅ Simplicidad operacional (no mantener Redis Pub/Sub + RabbitMQ)
- ✅ Facilidad de evolución (hoy best-effort, mañana crítico → sin cambios)

---

### Análisis de Costos (Esfuerzo de Desarrollo)

| Tarea | RabbitMQ | Redis Pub/Sub | Kafka |
|-------|----------|--------------|-------|
| **Setup Infraestructura** | 1h (docker-compose) | 0h (ya existe) | 3h (Zookeeper + Kafka) |
| **Implementar Publisher (Go)** | 2h (amqp091-go) | 1h (go-redis) | 4h (kafka-go + serialization) |
| **Implementar Consumer (NestJS)** | 2h (@nestjs/microservices) | 1h (@nestjs/microservices) | 3h (@nestjs/microservices + config) |
| **Dead Letter Queue** | 1h (config) | 3h (custom Lua scripts) | 2h (custom consumer) |
| **Tests de Integración** | 2h (Testcontainers) | 1h (Redis in-memory) | 4h (Testcontainers + Zookeeper) |
| **Monitoreo y Métricas** | 1h (Management UI) | 2h (custom dashboard) | 2h (Kafka UI) |
| **Documentación** | 1h | 1h | 2h |
| **TOTAL** | **10 horas** | **9 horas** | **20 horas** |

**Análisis:**
- **Redis Pub/Sub**: 1h menos que RabbitMQ, pero ❌ sin garantías de entrega
- **RabbitMQ**: Balance perfecto entre esfuerzo y features
- **Kafka**: 2x más esfuerzo que RabbitMQ con features innecesarias

---

### Evaluación de Riesgos

#### RabbitMQ 🐰
| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| **Complejidad AMQP** | Media | Bajo | Tutoriales oficiales excelentes, comunidad activa |
| **Overhead de memoria** | Baja | Bajo | 200-300 MB acceptable en desarrollo |
| **Single point of failure** | Media | Alto | Health checks + restart automático (Docker) |
| **Curva de aprendizaje** | Media | Medio | Invertir 1-2 días en spikes y tutoriales |

**Riesgo General:** 🟢 BAJO - Tecnología madura y bien documentada.

---

#### Redis Pub/Sub 📡
| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| **Pérdida de mensajes** | Alta | **CRÍTICO** | ❌ No mitigable (diseño de Redis Pub/Sub) |
| **Sin retry automático** | Alta | Alto | Custom retry logic (complejidad adicional) |
| **Sin Dead Letter Queue** | Alta | Medio | Custom DLQ con Lua scripts (frágil) |
| **No production-ready** | Alta | Alto | ⚠️ No recomendado para eventos críticos |

**Riesgo General:** 🔴 ALTO - No apto para eventos de inventario/órdenes.

---

#### Kafka 🦅
| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| **Overkill** | Alta | Medio | ⚠️ No justificado para 2-3 servicios |
| **Complejidad operacional** | Alta | Alto | Zookeeper/KRaft añade fragilidad |
| **Overhead de recursos** | Alta | Medio | 1+ GB RAM no escalable en laptop |
| **Curva de aprendizaje** | Alta | Alto | 2-4 semanas para dominar (retrasa proyecto) |

**Riesgo General:** 🟠 MEDIO-ALTO - Overkill técnico.

---

### Matriz de Decisión (Weighted Scoring)

| Criterio | Peso | RabbitMQ | Redis Pub/Sub | Kafka |
|----------|------|----------|--------------|-------|
| **Garantías de Entrega** | 25% | 10/10 = 2.5 | 2/10 = 0.5 | 10/10 = 2.5 |
| **Persistencia** | 20% | 10/10 = 2.0 | 1/10 = 0.2 | 10/10 = 2.0 |
| **Complejidad Operacional** | 15% | 7/10 = 1.05 | 10/10 = 1.5 | 3/10 = 0.45 |
| **Curva de Aprendizaje** | 10% | 7/10 = 0.7 | 10/10 = 1.0 | 4/10 = 0.4 |
| **Valor de Portfolio** | 20% | 9/10 = 1.8 | 5/10 = 1.0 | 10/10 = 2.0 |
| **Costo de Desarrollo** | 10% | 8/10 = 0.8 | 9/10 = 0.9 | 4/10 = 0.4 |
| **TOTAL** | 100% | **8.85/10** | **5.1/10** | **7.75/10** |

**Resultado:**
1. 🥇 **RabbitMQ**: 8.85/10 - GANADOR
2. 🥈 Kafka: 7.75/10 - Segundo lugar (overkill)
3. 🥉 Redis Pub/Sub: 5.1/10 - No apto para eventos críticos

---

## ✅ Decisión Final

### 🏆 Seleccionamos: RabbitMQ

**Decisión:** Implementar **RabbitMQ 3.13** como message broker para toda la comunicación asíncrona entre microservicios.

**Justificación Técnica:**

1. **Garantías de entrega críticas** (peso 25%)
   - Inventario es CRÍTICO: reservas perdidas = ventas perdidas o overselling
   - At-least-once delivery con ACK/NACK garantiza procesamiento
   - Dead Letter Queue para mensajes fallidos → debugging y retry manual

2. **Persistencia requerida** (peso 20%)
   - Mensajes sobreviven a restart de RabbitMQ (disk writes)
   - Queues durables persisten configuración
   - Orders Service puede estar temporalmente offline sin perder eventos

3. **Balance complejidad/features** (peso 15%)
   - Más complejo que Redis Pub/Sub, pero features justifican el esfuerzo
   - Menos complejo que Kafka (sin Zookeeper/KRaft)
   - Management UI excelente para debugging

4. **Valor de portfolio** (peso 20%)
   - RabbitMQ es estándar de industria (Amazon MQ, CloudAMQP)
   - Demuestra conocimiento de AMQP protocol
   - Patrones avanzados: DLQ, retry, topic routing
   - Mejor en entrevistas que "solo usé Redis Pub/Sub"

5. **Integración con stack actual** (peso 10%)
   - `@nestjs/microservices` tiene soporte nativo RabbitMQ
   - Go tiene librería oficial `amqp091-go` de RabbitMQ
   - Testcontainers soporta RabbitMQ para tests de integración

6. **Costo de desarrollo razonable** (peso 10%)
   - ~10 horas de implementación (vs 9h Redis, 20h Kafka)
   - 1 hora extra justificada por features críticas
   - ROI alto: +1h desarrollo = garantías de entrega

---

### 🛠️ Stack Tecnológico Seleccionado

#### Infraestructura

```yaml
# docker-compose.yml
rabbitmq:
  image: rabbitmq:3.13-management-alpine
  ports:
    - "5672:5672"    # AMQP protocol
    - "15672:15672"  # Management UI
  environment:
    RABBITMQ_DEFAULT_USER: admin
    RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
    RABBITMQ_DEFAULT_VHOST: /
  volumes:
    - rabbitmq_data:/var/lib/rabbitmq
  healthcheck:
    test: rabbitmq-diagnostics -q ping
    interval: 30s
    timeout: 10s
    retries: 5
```

**Características:**
- Alpine image: ~200 MB (vs ~400 MB full image)
- Management plugin incluido (UI en puerto 15672)
- Health checks para Docker Compose
- Volume persistente para durabilidad

---

#### Go (Inventory Service) - Publisher

**Librería:**
```go
import "github.com/rabbitmq/amqp091-go" // v1.9.0
```

**Features:**
- ✅ Librería oficial mantenida por RabbitMQ team
- ✅ Connection pooling nativo
- ✅ Publisher confirms para garantizar entrega
- ✅ Automatic reconnection
- ✅ Context support para timeouts

**Instalación:**
```bash
go get github.com/rabbitmq/amqp091-go@v1.9.0
```

---

#### NestJS (Orders Service) - Consumer

**Librería:**
```typescript
import { ClientsModule, Transport } from '@nestjs/microservices';
```

**Paquetes:**
```json
{
  "dependencies": {
    "@nestjs/microservices": "^10.0.0",
    "amqplib": "^0.10.3",
    "amqp-connection-manager": "^4.1.14"
  }
}
```

**Features:**
- ✅ Módulo nativo de NestJS (DI, decorators)
- ✅ Connection pooling automático
- ✅ Retry automático con exponential backoff
- ✅ ACK/NACK manual o automático
- ✅ Integración con Bull queues existente

---

### 🏗️ Arquitectura de Mensajería

#### Topology de RabbitMQ

```
┌─────────────────────────────────────────────────────────────────┐
│                         RabbitMQ Broker                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Exchange: inventory.events (type: topic)                      │
│      ├─→ routing_key: inventory.reserved                       │
│      ├─→ routing_key: inventory.confirmed                      │
│      ├─→ routing_key: inventory.released                       │
│      ├─→ routing_key: inventory.stock_depleted                 │
│      └─→ routing_key: inventory.stock_replenished              │
│                          ↓                                      │
│  Queue: orders.inventory_events (durable)                      │
│      - Binding: inventory.*                                    │
│      - Max Length: 10,000 messages                             │
│      - Message TTL: 24 hours                                   │
│      - DLQ: orders.inventory_events.dlq                        │
│                                                                 │
│  Exchange: orders.events (type: topic)                         │
│      ├─→ routing_key: order.cancelled                          │
│      ├─→ routing_key: order.completed                          │
│      └─→ routing_key: order.payment_failed                     │
│                          ↓                                      │
│  Queue: inventory.order_events (durable)                       │
│      - Binding: order.*                                        │
│      - DLQ: inventory.order_events.dlq                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Decisiones de diseño:**

1. **Topic Exchange** (vs Direct, Fanout, Headers)
   - ✅ Permite routing flexible con wildcards (`inventory.*`)
   - ✅ Un consumer puede escuchar múltiples tipos de eventos
   - ✅ Fácil añadir nuevos tipos de eventos sin cambiar código

2. **Naming convention**: `{domain}.{entity}.{action}`
   - `inventory.reserved`: Claro y explícito
   - Evitar `inv.res`: Abreviaciones confusas

3. **Queues durables**: `durable: true`
   - Mensajes persisten en disco
   - Survive restart de RabbitMQ

4. **Dead Letter Queue (DLQ)**: Para mensajes fallidos
   - Después de N reintentos, mensaje va a DLQ
   - Permite debugging manual y replay

---

### 📝 Definición de Eventos

#### Eventos de Inventory Service

```typescript
// shared/types/events.ts

export interface InventoryReservedEvent {
  eventType: 'inventory.reserved';
  eventId: string;              // UUID v4
  timestamp: string;            // ISO 8601
  version: '1.0';
  data: {
    reservationId: string;      // UUID de la reserva
    orderId: string;            // UUID de la orden
    productId: string;          // UUID del producto
    quantity: number;           // Cantidad reservada
    expiresAt: string;          // ISO 8601 (15 minutos)
  };
  metadata: {
    service: 'inventory-service';
    correlationId: string;      // Tracing
  };
}

export interface InventoryConfirmedEvent {
  eventType: 'inventory.confirmed';
  eventId: string;
  timestamp: string;
  version: '1.0';
  data: {
    reservationId: string;
    orderId: string;
    productId: string;
    quantity: number;
    newStockLevel: number;      // Stock después de confirmación
  };
  metadata: {
    service: 'inventory-service';
    correlationId: string;
  };
}

export interface InventoryReleasedEvent {
  eventType: 'inventory.released';
  eventId: string;
  timestamp: string;
  version: '1.0';
  data: {
    reservationId: string;
    orderId: string;
    productId: string;
    quantity: number;
    reason: 'order_cancelled' | 'reservation_expired' | 'payment_failed';
  };
  metadata: {
    service: 'inventory-service';
    correlationId: string;
  };
}
```

#### Eventos de Orders Service

```typescript
export interface OrderCancelledEvent {
  eventType: 'order.cancelled';
  eventId: string;
  timestamp: string;
  version: '1.0';
  data: {
    orderId: string;
    userId: string;
    items: Array<{
      productId: string;
      quantity: number;
    }>;
    reason: 'customer_request' | 'payment_failed' | 'timeout';
  };
  metadata: {
    service: 'orders-service';
    correlationId: string;
  };
}
```

---

### 🔒 Patrones de Resiliencia

#### 1. At-Least-Once Delivery (RabbitMQ)

```typescript
// NestJS Consumer - ACK manual
@RabbitSubscribe({
  exchange: 'inventory.events',
  routingKey: 'inventory.*',
  queue: 'orders.inventory_events',
})
async handleInventoryEvent(msg: InventoryEvent, amqpMsg: ConsumeMessage) {
  try {
    await this.processEvent(msg);
    // ✅ Acknowledge: mensaje procesado exitosamente
    this.channel.ack(amqpMsg);
  } catch (error) {
    if (this.isRetryable(error)) {
      // ⚠️ NACK + requeue: reintentar
      this.channel.nack(amqpMsg, false, true);
    } else {
      // ❌ NACK sin requeue: enviar a DLQ
      this.channel.nack(amqpMsg, false, false);
    }
  }
}
```

#### 2. Idempotency (Consumer)

```typescript
// Tabla de eventos procesados
// CREATE TABLE processed_events (
//   event_id UUID PRIMARY KEY,
//   event_type VARCHAR(100),
//   processed_at TIMESTAMP DEFAULT NOW()
// );

async processEvent(event: InventoryEvent) {
  // 1. Check si ya procesamos este evento
  const exists = await this.db.query(
    'SELECT 1 FROM processed_events WHERE event_id = $1',
    [event.eventId]
  );
  
  if (exists.rowCount > 0) {
    this.logger.warn(`Event ${event.eventId} already processed (idempotency)`);
    return; // ✅ Skip sin error
  }

  // 2. Procesar evento + guardar ID en transacción
  await this.db.transaction(async (trx) => {
    await this.updateOrderStatus(event.data, trx);
    await trx.query(
      'INSERT INTO processed_events (event_id, event_type) VALUES ($1, $2)',
      [event.eventId, event.eventType]
    );
  });
}
```

#### 3. Outbox Pattern (Publisher)

```go
// Garantizar que evento se publica SIEMPRE después de cambio en DB
func (s *InventoryService) ConfirmReservation(ctx context.Context, reservationID string) error {
    tx, _ := s.db.BeginTx(ctx, nil)
    defer tx.Rollback()

    // 1. Actualizar base de datos
    _, err := tx.Exec(`
        UPDATE reservations 
        SET status = 'confirmed', confirmed_at = NOW()
        WHERE id = $1
    `, reservationID)
    if err != nil {
        return err
    }

    // 2. Insertar evento en tabla outbox
    event := InventoryConfirmedEvent{...}
    _, err = tx.Exec(`
        INSERT INTO outbox (event_id, event_type, payload, created_at)
        VALUES ($1, $2, $3, NOW())
    `, event.EventID, event.EventType, json.Marshal(event))
    if err != nil {
        return err
    }

    // 3. Commit transacción
    tx.Commit()

    // 4. Worker separado publica eventos de outbox a RabbitMQ
    // (fuera de la transacción, asíncrono)
    return nil
}
```

#### 4. Dead Letter Queue (DLQ)

```typescript
// Configuración de DLQ en NestJS
{
  queue: 'orders.inventory_events',
  queueOptions: {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': 'dlq.exchange',
      'x-dead-letter-routing-key': 'orders.inventory_events.dlq',
      'x-message-ttl': 86400000, // 24 hours
      'x-max-length': 10000,     // Max 10k mensajes
    },
  },
}
```

**Proceso de DLQ:**
1. Mensaje falla después de N reintentos
2. RabbitMQ automáticamente lo envía a DLQ
3. Dashboard de monitoreo alerta sobre mensajes en DLQ
4. DevOps investiga error y republica mensaje manualmente si es necesario

---

## 💻 Ejemplos de Implementación

### Publisher en Go (Inventory Service)

```go
// internal/infrastructure/messaging/rabbitmq_publisher.go
package messaging

import (
    "context"
    "encoding/json"
    "fmt"
    "time"

    amqp "github.com/rabbitmq/amqp091-go"
    "github.com/google/uuid"
)

type RabbitMQPublisher struct {
    conn    *amqp.Connection
    channel *amqp.Channel
    exchange string
}

func NewRabbitMQPublisher(url, exchange string) (*RabbitMQPublisher, error) {
    conn, err := amqp.Dial(url)
    if err != nil {
        return nil, fmt.Errorf("failed to connect to RabbitMQ: %w", err)
    }

    channel, err := conn.Channel()
    if err != nil {
        return nil, fmt.Errorf("failed to open channel: %w", err)
    }

    // Declarar exchange (idempotent)
    err = channel.ExchangeDeclare(
        exchange,     // name
        "topic",      // type
        true,         // durable
        false,        // auto-deleted
        false,        // internal
        false,        // no-wait
        nil,          // arguments
    )
    if err != nil {
        return nil, fmt.Errorf("failed to declare exchange: %w", err)
    }

    return &RabbitMQPublisher{
        conn:    conn,
        channel: channel,
        exchange: exchange,
    }, nil
}

type InventoryReservedEvent struct {
    EventType string    `json:"eventType"`
    EventID   string    `json:"eventId"`
    Timestamp time.Time `json:"timestamp"`
    Version   string    `json:"version"`
    Data      struct {
        ReservationID string    `json:"reservationId"`
        OrderID       string    `json:"orderId"`
        ProductID     string    `json:"productId"`
        Quantity      int       `json:"quantity"`
        ExpiresAt     time.Time `json:"expiresAt"`
    } `json:"data"`
    Metadata struct {
        Service       string `json:"service"`
        CorrelationID string `json:"correlationId"`
    } `json:"metadata"`
}

func (p *RabbitMQPublisher) PublishInventoryReserved(
    ctx context.Context,
    reservationID, orderID, productID string,
    quantity int,
    correlationID string,
) error {
    event := InventoryReservedEvent{
        EventType: "inventory.reserved",
        EventID:   uuid.NewString(),
        Timestamp: time.Now(),
        Version:   "1.0",
    }
    event.Data.ReservationID = reservationID
    event.Data.OrderID = orderID
    event.Data.ProductID = productID
    event.Data.Quantity = quantity
    event.Data.ExpiresAt = time.Now().Add(15 * time.Minute)
    event.Metadata.Service = "inventory-service"
    event.Metadata.CorrelationID = correlationID

    body, err := json.Marshal(event)
    if err != nil {
        return fmt.Errorf("failed to marshal event: %w", err)
    }

    err = p.channel.PublishWithContext(
        ctx,
        p.exchange,           // exchange
        "inventory.reserved", // routing key
        false,                // mandatory
        false,                // immediate
        amqp.Publishing{
            ContentType:  "application/json",
            Body:         body,
            DeliveryMode: amqp.Persistent, // ✅ Persist to disk
            MessageId:    event.EventID,
            Timestamp:    time.Now(),
            CorrelationId: correlationID,
        },
    )
    if err != nil {
        return fmt.Errorf("failed to publish event: %w", err)
    }

    return nil
}

func (p *RabbitMQPublisher) Close() error {
    if err := p.channel.Close(); err != nil {
        return err
    }
    return p.conn.Close()
}
```

**Uso en Application Layer:**

```go
// internal/application/services/inventory_service.go
func (s *InventoryService) ReserveStock(ctx context.Context, req ReserveStockRequest) error {
    // 1. Validar disponibilidad
    product, err := s.repo.GetByID(ctx, req.ProductID)
    if err != nil {
        return err
    }
    if product.Quantity < req.Quantity {
        return ErrInsufficientStock
    }

    // 2. Crear reserva en DB
    reservation := &Reservation{
        ID:        uuid.NewString(),
        OrderID:   req.OrderID,
        ProductID: req.ProductID,
        Quantity:  req.Quantity,
        Status:    "reserved",
        ExpiresAt: time.Now().Add(15 * time.Minute),
    }
    err = s.repo.CreateReservation(ctx, reservation)
    if err != nil {
        return err
    }

    // 3. Publicar evento
    err = s.publisher.PublishInventoryReserved(
        ctx,
        reservation.ID,
        req.OrderID,
        req.ProductID,
        req.Quantity,
        req.CorrelationID,
    )
    if err != nil {
        // ⚠️ DB ya actualizada pero evento falló
        // Solución: Outbox Pattern (ver sección anterior)
        s.logger.Error("Failed to publish event", "error", err)
        return err
    }

    return nil
}
```

---

### Consumer en NestJS (Orders Service)

```typescript
// src/messaging/rabbitmq.module.ts
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { InventoryEventsConsumer } from './inventory-events.consumer';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'RABBITMQ_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://admin:password@localhost:5672'],
          queue: 'orders.inventory_events',
          queueOptions: {
            durable: true,
            arguments: {
              'x-dead-letter-exchange': 'dlq.exchange',
              'x-dead-letter-routing-key': 'orders.inventory_events.dlq',
              'x-message-ttl': 86400000, // 24 hours
            },
          },
          prefetchCount: 10, // Max 10 mensajes en paralelo
        },
      },
    ]),
  ],
  providers: [InventoryEventsConsumer],
})
export class MessagingModule {}
```

```typescript
// src/messaging/inventory-events.consumer.ts
import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { OrdersService } from '../orders/orders.service';

interface InventoryReservedEvent {
  eventType: 'inventory.reserved';
  eventId: string;
  timestamp: string;
  data: {
    reservationId: string;
    orderId: string;
    productId: string;
    quantity: number;
    expiresAt: string;
  };
  metadata: {
    correlationId: string;
  };
}

@Controller()
export class InventoryEventsConsumer {
  private readonly logger = new Logger(InventoryEventsConsumer.name);
  
  constructor(private readonly ordersService: OrdersService) {}

  @EventPattern('inventory.reserved') // ✅ Routing key
  async handleInventoryReserved(
    @Payload() event: InventoryReservedEvent,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    this.logger.log(
      `Received event: ${event.eventType} (ID: ${event.eventId})`,
    );

    try {
      // 1. Verificar idempotencia
      const alreadyProcessed = await this.ordersService.isEventProcessed(
        event.eventId,
      );
      if (alreadyProcessed) {
        this.logger.warn(`Event ${event.eventId} already processed (skip)`);
        channel.ack(originalMsg); // ✅ ACK sin procesar
        return;
      }

      // 2. Actualizar estado de orden
      await this.ordersService.updateOrderStatus(event.data.orderId, {
        status: 'reserved',
        reservationId: event.data.reservationId,
        reservedAt: new Date(event.timestamp),
        reservationExpiresAt: new Date(event.data.expiresAt),
      });

      // 3. Marcar evento como procesado
      await this.ordersService.markEventAsProcessed(event.eventId);

      // 4. ACK exitoso
      channel.ack(originalMsg);
      this.logger.log(`Event ${event.eventId} processed successfully`);

    } catch (error) {
      this.logger.error(
        `Error processing event ${event.eventId}: ${error.message}`,
        error.stack,
      );

      // Decidir si es retriable
      if (this.isRetryable(error)) {
        // ⚠️ NACK + requeue: reintentar después
        channel.nack(originalMsg, false, true);
        this.logger.warn(`Event ${event.eventId} requeued for retry`);
      } else {
        // ❌ NACK sin requeue: enviar a DLQ
        channel.nack(originalMsg, false, false);
        this.logger.error(`Event ${event.eventId} sent to DLQ (non-retriable error)`);
      }
    }
  }

  @EventPattern('inventory.confirmed')
  async handleInventoryConfirmed(
    @Payload() event: any,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this.ordersService.updateOrderStatus(event.data.orderId, {
        status: 'processing',
        confirmedAt: new Date(event.timestamp),
      });
      channel.ack(originalMsg);
    } catch (error) {
      this.logger.error(`Error: ${error.message}`);
      channel.nack(originalMsg, false, this.isRetryable(error));
    }
  }

  @EventPattern('inventory.released')
  async handleInventoryReleased(
    @Payload() event: any,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this.ordersService.updateOrderStatus(event.data.orderId, {
        status: 'cancelled',
        cancelledAt: new Date(event.timestamp),
        cancellationReason: event.data.reason,
      });
      channel.ack(originalMsg);
    } catch (error) {
      this.logger.error(`Error: ${error.message}`);
      channel.nack(originalMsg, false, this.isRetryable(error));
    }
  }

  private isRetryable(error: any): boolean {
    // Errores transitorios → retry
    if (error.code === 'ECONNREFUSED') return true;
    if (error.code === 'ETIMEDOUT') return true;
    if (error.name === 'QueryFailedError') return true;

    // Errores de lógica → NO retry (DLQ)
    if (error.name === 'ValidationError') return false;
    if (error.name === 'BusinessLogicError') return false;

    return false; // Por defecto, enviar a DLQ
  }
}
```

**Main Application Bootstrap:**

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Conectar RabbitMQ como microservicio híbrido
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://admin:password@localhost:5672'],
      queue: 'orders.inventory_events',
      noAck: false, // ✅ ACK manual (importante)
      queueOptions: {
        durable: true,
      },
    },
  });

  await app.startAllMicroservices();
  await app.listen(3000);
  console.log('Orders Service running on port 3000');
}
bootstrap();
```

---

### Tests de Integración (Testcontainers)

```typescript
// test/messaging/rabbitmq.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { InventoryEventsConsumer } from '../../src/messaging/inventory-events.consumer';
import * as amqp from 'amqplib';

describe('RabbitMQ Integration Tests', () => {
  let container: StartedTestContainer;
  let connection: amqp.Connection;
  let channel: amqp.Channel;
  let consumer: InventoryEventsConsumer;

  beforeAll(async () => {
    // 1. Iniciar RabbitMQ con Testcontainers
    container = await new GenericContainer('rabbitmq:3.13-management-alpine')
      .withExposedPorts(5672, 15672)
      .withEnvironment({
        RABBITMQ_DEFAULT_USER: 'test',
        RABBITMQ_DEFAULT_PASS: 'test',
      })
      .start();

    const port = container.getMappedPort(5672);
    const rabbitUrl = `amqp://test:test@localhost:${port}`;

    // 2. Conectar cliente
    connection = await amqp.connect(rabbitUrl);
    channel = await connection.createChannel();

    // 3. Declarar exchange y queue
    await channel.assertExchange('inventory.events', 'topic', { durable: true });
    await channel.assertQueue('orders.inventory_events', { durable: true });
    await channel.bindQueue('orders.inventory_events', 'inventory.events', 'inventory.*');

    // 4. Crear consumer de NestJS
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryEventsConsumer,
        {
          provide: 'OrdersService',
          useValue: {
            updateOrderStatus: jest.fn(),
            isEventProcessed: jest.fn().mockResolvedValue(false),
            markEventAsProcessed: jest.fn(),
          },
        },
      ],
    }).compile();

    consumer = module.get<InventoryEventsConsumer>(InventoryEventsConsumer);
  });

  afterAll(async () => {
    await channel.close();
    await connection.close();
    await container.stop();
  });

  it('should consume InventoryReserved event successfully', async () => {
    // Arrange
    const event = {
      eventType: 'inventory.reserved',
      eventId: 'test-event-123',
      timestamp: new Date().toISOString(),
      data: {
        reservationId: 'res-456',
        orderId: 'order-789',
        productId: 'prod-abc',
        quantity: 5,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      },
      metadata: {
        correlationId: 'corr-xyz',
      },
    };

    // Act: Publicar evento
    await channel.publish(
      'inventory.events',
      'inventory.reserved',
      Buffer.from(JSON.stringify(event)),
      { persistent: true },
    );

    // Assert: Esperar que consumer procese
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Verificar que OrdersService fue llamado
    expect(consumer['ordersService'].updateOrderStatus).toHaveBeenCalledWith(
      'order-789',
      expect.objectContaining({ status: 'reserved' }),
    );
  });

  it('should send failed message to DLQ after max retries', async () => {
    // Test de Dead Letter Queue
    // (implementación similar)
  });
});
```

---

## 📅 Plan de Implementación

### Roadmap General

```
FASE 0: Technical Spikes (actual, Semana 2)
   ✅ Decisión documentada en ADR-029
   
FASE 1: Setup Infraestructura (Semanas 3-5)
   ⏳ T1.4.5: Añadir RabbitMQ a docker-compose
   ⏳ Epic 1.4: Configurar RabbitMQ Management UI
   
FASE 2: Implementación (Semanas 5-7)
   🎯 Epic 2.5: Sistema de Eventos Distribuidos (IMPLEMENTA ADR-029)
      - T2.5.1: Setup infraestructura RabbitMQ
      - T2.5.2: Definir schemas de eventos
      - T2.5.3: Implementar Publisher (Go)
      - T2.5.4: Implementar Consumer (NestJS)
      - T2.5.5: Tests de integración
      - T2.5.6: Observabilidad y métricas
   
FASE 3: Optimización y Producción (Semanas 8-10)
   ⏳ Monitoreo avanzado (Grafana dashboards)
   ⏳ Load testing de RabbitMQ
   ⏳ Documentación de runbooks
```

---

### FASE 0: Technical Spike ✅ COMPLETADA

**Objetivo:** Tomar decisión informada sobre message broker.

**Entregables:**
- ✅ ADR-029 creado con análisis completo
- ✅ Stack tecnológico definido (RabbitMQ 3.13)
- ✅ Arquitectura de messaging documentada
- ✅ Ejemplos de código (Publisher + Consumer)
- ✅ Patrones de resiliencia definidos (Outbox, DLQ, Idempotency)

**Fase actual:** ✅ COMPLETADA

---

### FASE 1: Setup Infraestructura (Semanas 3-5)

**Objetivo:** Añadir RabbitMQ al docker-compose y verificar conectividad.

#### T1.4.5: Añadir RabbitMQ a docker-compose (1 hora)

**Checklist:**
- [ ] Añadir servicio `rabbitmq` en `docker-compose.yml`
- [ ] Configurar variables de entorno (user, password, vhost)
- [ ] Exponer puertos 5672 (AMQP) y 15672 (Management UI)
- [ ] Añadir volume persistente para datos
- [ ] Configurar health check
- [ ] Añadir `rabbitmq` a depends_on de otros servicios
- [ ] Verificar UI accessible en http://localhost:15672

**Entregable:**
```yaml
# docker-compose.yml
rabbitmq:
  image: rabbitmq:3.13-management-alpine
  container_name: ecommerce-rabbitmq
  ports:
    - "5672:5672"
    - "15672:15672"
  environment:
    RABBITMQ_DEFAULT_USER: admin
    RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD:-secretpassword}
    RABBITMQ_DEFAULT_VHOST: /
  volumes:
    - rabbitmq_data:/var/lib/rabbitmq
  healthcheck:
    test: rabbitmq-diagnostics -q ping
    interval: 30s
    timeout: 10s
    retries: 5
  networks:
    - ecommerce-network

volumes:
  rabbitmq_data:
```

**Prerequisitos:** Ninguno  
**Tiempo Estimado:** 1 hora

---

### FASE 2: Implementación Epic 2.5 (Semanas 5-7) 🎯 IMPLEMENTA ADR-029

**Objetivo:** Implementar sistema de eventos completo entre Inventory y Orders.

#### T2.5.1: Setup Infraestructura RabbitMQ (2 horas)

**Descripción:** Configurar exchanges, queues, bindings y Dead Letter Queues.

**Checklist:**
- [ ] Crear script de inicialización de RabbitMQ (`scripts/setup-rabbitmq.sh`)
- [ ] Declarar exchange `inventory.events` (type: topic, durable)
- [ ] Declarar exchange `orders.events` (type: topic, durable)
- [ ] Crear queue `orders.inventory_events` con DLQ
- [ ] Crear queue `inventory.order_events` con DLQ
- [ ] Binding: `inventory.events` → `orders.inventory_events` (routing key: `inventory.*`)
- [ ] Binding: `orders.events` → `inventory.order_events` (routing key: `order.*`)
- [ ] Verificar topology en Management UI
- [ ] Documentar en README del proyecto

**Código Referencia:** Ver sección "🏗️ Arquitectura de Mensajería" en ADR-029

**Tiempo Estimado:** 2 horas  
**Prerequisitos:** FASE 1 completada (RabbitMQ running)

---

#### T2.5.2: Definir Schemas de Eventos (2 horas)

**Descripción:** Crear tipos TypeScript compartidos para todos los eventos.

**Checklist:**
- [ ] Crear `shared/types/events/inventory.events.ts`
  - `InventoryReservedEvent`
  - `InventoryConfirmedEvent`
  - `InventoryReleasedEvent`
  - `StockDepletedEvent` (opcional)
- [ ] Crear `shared/types/events/orders.events.ts`
  - `OrderCancelledEvent`
  - `OrderCompletedEvent`
- [ ] Validar con Zod o class-validator
- [ ] Documentar ejemplos JSON en `docs/api-testing/08-EVENTS-SCHEMA.md`
- [ ] Versionar eventos (`version: "1.0"`)

**Código Referencia:** Ver sección "📝 Definición de Eventos" en ADR-029

**Tiempo Estimado:** 2 horas  
**Prerequisitos:** T2.5.1 completada

---

#### T2.5.3: Implementar Publisher en Inventory Service (Go) (4 horas)

**Descripción:** Crear módulo de eventos en Go que publica a RabbitMQ.

**Checklist:**
- [ ] Instalar librería: `go get github.com/rabbitmq/amqp091-go@v1.9.0`
- [ ] Crear `internal/infrastructure/messaging/rabbitmq_publisher.go`
- [ ] Implementar connection pooling y reconnection logic
- [ ] Implementar métodos:
  - `PublishInventoryReserved()`
  - `PublishInventoryConfirmed()`
  - `PublishInventoryReleased()`
- [ ] Configurar publisher confirms (garantizar entrega)
- [ ] Añadir logging estructurado (correlationId, eventId)
- [ ] Añadir métricas Prometheus (events_published_total)
- [ ] Tests unitarios con RabbitMQ mockeado
- [ ] Tests de integración con Testcontainers

**Código Referencia:** Ver sección "💻 Publisher en Go" en ADR-029

**Archivos a crear:**
- `internal/infrastructure/messaging/rabbitmq_publisher.go`
- `internal/infrastructure/messaging/rabbitmq_publisher_test.go`
- `tests/integration/rabbitmq_publisher_integration_test.go`

**Tiempo Estimado:** 4 horas  
**Prerequisitos:** T2.5.2 completada

---

#### T2.5.4: Implementar Consumer en Orders Service (NestJS) (4 horas)

**Descripción:** Crear módulo RabbitMQ consumer en NestJS.

**Checklist:**
- [ ] Instalar dependencias:
  ```bash
  npm install @nestjs/microservices amqplib amqp-connection-manager
  ```
- [ ] Crear `src/messaging/rabbitmq.module.ts`
- [ ] Crear `src/messaging/inventory-events.consumer.ts`
- [ ] Implementar handlers:
  - `@EventPattern('inventory.reserved')` → `handleInventoryReserved()`
  - `@EventPattern('inventory.confirmed')` → `handleInventoryConfirmed()`
  - `@EventPattern('inventory.released')` → `handleInventoryReleased()`
- [ ] Implementar idempotencia (tabla `processed_events`)
- [ ] Implementar ACK/NACK manual
- [ ] Configurar retry logic (requeue on retriable errors)
- [ ] Logging estructurado con Winston
- [ ] Tests unitarios con mocks
- [ ] Tests de integración con Testcontainers

**Código Referencia:** Ver sección "💻 Consumer en NestJS" en ADR-029

**Archivos a crear:**
- `src/messaging/rabbitmq.module.ts`
- `src/messaging/inventory-events.consumer.ts`
- `src/messaging/inventory-events.consumer.spec.ts`
- `test/messaging/rabbitmq.integration.spec.ts`

**Tiempo Estimado:** 4 horas  
**Prerequisitos:** T2.5.3 completada

---

#### T2.5.5: Tests End-to-End de Eventos (3 horas)

**Descripción:** Tests que validan flujo completo: Inventory publica → Orders consume.

**Checklist:**
- [ ] Test E2E: Reserva de inventario exitosa
  - Inventory crea reserva → publica evento
  - Orders consume evento → actualiza estado
  - Verificar estado final de orden en DB
- [ ] Test E2E: Confirmación de inventario
  - Inventory confirma reserva → publica evento
  - Orders actualiza a "processing"
- [ ] Test E2E: Liberación por cancelación
  - Orders cancela orden → publica `OrderCancelledEvent`
  - Inventory consume → libera reserva
- [ ] Test E2E: Idempotencia (evento duplicado)
  - Publicar mismo evento 2 veces
  - Verificar que solo se procesa 1 vez
- [ ] Test E2E: Dead Letter Queue
  - Forzar error no-retriable
  - Verificar mensaje en DLQ
- [ ] Coverage >80% en módulos de messaging

**Herramientas:**
- Testcontainers (RabbitMQ + PostgreSQL)
- Supertest para APIs REST
- Jest para assertions

**Tiempo Estimado:** 3 horas  
**Prerequisitos:** T2.5.4 completada

---

#### T2.5.6: Observabilidad y Métricas (2 horas)

**Descripción:** Añadir métricas de RabbitMQ y dashboards de monitoreo.

**Checklist:**
- [ ] Métricas de Publisher (Go):
  - `inventory_events_published_total{event_type}`
  - `inventory_events_publish_duration_seconds{event_type}`
  - `inventory_events_publish_errors_total{event_type}`
- [ ] Métricas de Consumer (NestJS):
  - `orders_events_consumed_total{event_type, status}`
  - `orders_events_processing_duration_seconds{event_type}`
  - `orders_events_dlq_total{event_type}`
- [ ] Configurar RabbitMQ Prometheus Plugin
- [ ] Crear Grafana dashboard "RabbitMQ Overview"
  - Queue length (mensajes pending)
  - Publish rate (msg/s)
  - Consume rate (msg/s)
  - Error rate (%)
  - DLQ messages
- [ ] Alertas:
  - DLQ con >10 mensajes
  - Queue length >1000
  - Consumer lag >5 minutos
- [ ] Documentar en `docs/MONITORING.md`

**Tiempo Estimado:** 2 horas  
**Prerequisitos:** T2.5.5 completada

---

### Definition of Done - Epic 2.5

- [ ] RabbitMQ running en docker-compose con Management UI accesible
- [ ] Exchanges y queues declarados correctamente (topology validada)
- [ ] Todos los eventos definidos y documentados (schemas + ejemplos JSON)
- [ ] Inventory Service publica eventos correctamente (Publisher funcional)
- [ ] Orders Service consume eventos correctamente (Consumer funcional)
- [ ] Idempotencia implementada (no duplicados)
- [ ] Dead Letter Queue configurada y validada
- [ ] Tests de integración pasando (coverage >80%)
- [ ] Tests E2E pasando (flujo completo validado)
- [ ] Métricas de Prometheus disponibles
- [ ] Documentación completa (README + ADR-029 + runbooks)

**Tiempo Total Epic 2.5:** ~17 horas (~2.5 días)

---

### FASE 3: Optimización y Producción (Semanas 8-10)

**Objetivo:** Preparar sistema de eventos para producción.

#### Tareas Opcionales (Post-MVP):

1. **Load Testing** (2h)
   - k6 para simular 1000 msg/s
   - Validar latencia P95 <50ms
   - Verificar no memory leaks

2. **Outbox Pattern** (4h)
   - Implementar tabla `outbox` en Inventory
   - Worker que lee outbox y publica a RabbitMQ
   - Garantiza at-least-once delivery con DB

3. **RabbitMQ Clustering** (6h, OPCIONAL)
   - Configurar 3 nodos RabbitMQ
   - Quorum queues para HA
   - Documentar failover

4. **Replay de Eventos** (3h)
   - Script para republicar eventos históricos
   - Útil para debugging y data migration

**Total Fase 3:** ~15 horas (opcional)

---

## 📊 Resumen del Timeline

| Fase | Epic | Semanas | Tiempo | Status |
|------|------|---------|--------|--------|
| **FASE 0** | Spike T0.1.4 | 2 | 2h | ✅ COMPLETADA |
| **FASE 1** | Epic 1.4 (Setup) | 3-5 | 1h | ⏳ PENDIENTE |
| **FASE 2** | Epic 2.5 (Implementación) | 5-7 | 17h | ⏳ PENDIENTE |
| **FASE 3** | Optimización | 8-10 | 15h | ⏳ OPCIONAL |

**Total:** ~35 horas (~5 días de desarrollo)

---

## 🎯 Para Entrevistas Técnicas

### Preguntas que este ADR responde:

1. **"¿Por qué RabbitMQ y no Kafka?"**
   - Respuesta: Ver matriz de decisión (8.85/10 vs 7.75/10)
   - Kafka es overkill para 2-3 servicios
   - RabbitMQ cubre todas las necesidades con menor complejidad

2. **"¿Cómo garantizas que eventos no se pierdan?"**
   - At-least-once delivery con ACK manual
   - Mensajes persistentes (disk write)
   - Dead Letter Queue para failures
   - Outbox Pattern (opcional, documentado)

3. **"¿Cómo manejas eventos duplicados?"**
   - Idempotencia en consumer (tabla `processed_events`)
   - Check por `eventId` antes de procesar
   - Transacción DB para atomicidad

4. **"¿Qué pasa si RabbitMQ se cae?"**
   - Mensajes persistidos en disco (survive restart)
   - Health checks + automatic restart (Docker)
   - En producción: Clustering con 3 nodos (documentado en Fase 3)

5. **"¿Cómo debugeas eventos fallidos?"**
   - Dead Letter Queue captura mensajes fallidos
   - Management UI muestra DLQ en tiempo real
   - Logging estructurado con correlationId
   - Métricas de Prometheus alertan sobre DLQ growth

### Habilidades Demostradas:

- ✅ **Arquitectura distribuida**: Message brokers, event-driven
- ✅ **Análisis técnico**: Comparación cuantitativa (matriz de decisión)
- ✅ **Resiliencia**: Outbox, DLQ, Idempotency, Retry
- ✅ **Multi-lenguaje**: Go + NestJS/TypeScript
- ✅ **Testing**: Unit + Integration (Testcontainers) + E2E
- ✅ **Observabilidad**: Prometheus, Grafana, structured logging
- ✅ **Trade-offs**: Balance complejidad vs features
- ✅ **Pragmatismo**: Rechazar Kafka (overkill) muestra buen juicio

---

## 🔗 Referencias

- [RabbitMQ Official Docs](https://www.rabbitmq.com/documentation.html)
- [RabbitMQ Tutorials](https://www.rabbitmq.com/getstarted.html) (Go + Node.js examples)
- [NestJS Microservices - RabbitMQ](https://docs.nestjs.com/microservices/rabbitmq)
- [Go amqp091-go Library](https://github.com/rabbitmq/amqp091-go)
- [Outbox Pattern Explained](https://microservices.io/patterns/data/transactional-outbox.html)
- [Dead Letter Queues Best Practices](https://www.rabbitmq.com/dlx.html)

---

## 📝 Changelog

| Fecha | Cambio | Autor |
|-------|--------|-------|
| 2025-10-17 | ADR-029 creado - Decisión inicial | Equipo Arquitectura |
| TBD | Implementación completada | - |

---

**Estado:** ✅ ACEPTADA  
**Próximo paso:** Implementar FASE 1 (T1.4.5: Añadir RabbitMQ a docker-compose)

