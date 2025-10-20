# RabbitMQ Messaging - Monitoring & Observability

Este documento describe la estrategia de observabilidad para el sistema de mensajería RabbitMQ, incluyendo métricas, dashboards y alertas.

## 📊 Métricas Disponibles

### Go Publisher (Inventory Service)

El servicio de inventario (Go) expone métricas de publicación de eventos en el endpoint `/metrics` (puerto 8080).

#### Métricas Principales:

| Métrica                                     | Tipo      | Labels                                    | Descripción                                  |
| ------------------------------------------- | --------- | ----------------------------------------- | -------------------------------------------- |
| `inventory_events_published_total`          | Counter   | `event_type`, `routing_key`, `status`     | Total de eventos publicados (success/failed) |
| `inventory_events_publish_duration_seconds` | Histogram | `event_type`, `routing_key`               | Duración de operaciones de publicación       |
| `inventory_events_publish_errors_total`     | Counter   | `event_type`, `routing_key`, `error_type` | Total de errores al publicar                 |
| `inventory_events_publish_retries_total`    | Counter   | `event_type`, `routing_key`, `attempt`    | Total de intentos de retry                   |

#### Ejemplos de Queries (PromQL):

```promql
# Tasa de publicación exitosa (eventos/segundo)
rate(inventory_events_published_total{status="success"}[5m])

# P95 latencia de publicación
histogram_quantile(0.95, rate(inventory_events_publish_duration_seconds_bucket[5m]))

# Tasa de errores de publicación
rate(inventory_events_publish_errors_total[5m])

# Eventos publicados por tipo
sum by (event_type) (inventory_events_published_total)
```

---

### NestJS Consumer (Orders Service)

El servicio de órdenes (NestJS) expone métricas de consumo de eventos en el endpoint `/metrics` (puerto 3001).

#### Métricas Principales:

| Métrica                                     | Tipo      | Labels                                    | Descripción                                  |
| ------------------------------------------- | --------- | ----------------------------------------- | -------------------------------------------- |
| `orders_events_consumed_total`              | Counter   | `event_type`, `routing_key`, `status`     | Total de eventos consumidos (success/failed) |
| `orders_events_processing_duration_seconds` | Histogram | `event_type`, `routing_key`               | Duración de procesamiento de eventos         |
| `orders_events_dlq_total`                   | Counter   | `event_type`, `routing_key`, `reason`     | Total de eventos enviados a DLQ              |
| `orders_events_idempotent_skips_total`      | Counter   | `event_type`, `routing_key`               | Total de eventos duplicados skippeados       |
| `orders_events_processing_errors_total`     | Counter   | `event_type`, `routing_key`, `error_type` | Total de errores de procesamiento            |
| `orders_events_handler_executions_total`    | Counter   | `event_type`, `handler_name`, `status`    | Total de ejecuciones de handlers             |

#### Ejemplos de Queries (PromQL):

```promql
# Tasa de consumo exitoso (eventos/segundo)
rate(orders_events_consumed_total{status="success"}[5m])

# P99 latencia de procesamiento
histogram_quantile(0.99, rate(orders_events_processing_duration_seconds_bucket[5m]))

# Mensajes en Dead Letter Queue
sum(orders_events_dlq_total)

# Eventos skippeados por idempotencia
rate(orders_events_idempotent_skips_total[5m])

# Success rate de handlers
rate(orders_events_handler_executions_total{status="success"}[5m])
/
rate(orders_events_handler_executions_total[5m])
```

---

### RabbitMQ Native Metrics

RabbitMQ expone métricas nativas en el puerto 15692 mediante el plugin `rabbitmq_prometheus`.

#### Métricas Relevantes:

| Métrica                                                            | Descripción                   |
| ------------------------------------------------------------------ | ----------------------------- |
| `rabbitmq_queue_messages{queue="orders.inventory_events"}`         | Mensajes listos para consumir |
| `rabbitmq_queue_messages_unacked{queue="orders.inventory_events"}` | Mensajes no confirmados       |
| `rabbitmq_queue_messages_ready{queue="orders.inventory_events"}`   | Mensajes en cola              |
| `rabbitmq_connections`                                             | Número de conexiones activas  |
| `rabbitmq_channels`                                                | Número de canales activos     |

#### Ejemplos de Queries:

```promql
# Longitud de cola
rabbitmq_queue_messages{queue="orders.inventory_events"}

# Mensajes sin ACK
rabbitmq_queue_messages_unacked{queue="orders.inventory_events"}

# Conexiones activas
sum(rabbitmq_connections)
```

---

## 📈 Grafana Dashboard

El dashboard `RabbitMQ - Messaging Overview` proporciona visualización completa del sistema de mensajería.

### Ubicación

- **Archivo**: `monitoring/grafana/dashboards/rabbitmq-messaging-overview.json`
- **UID**: `rabbitmq-messaging`
- **URL**: http://localhost:3000/d/rabbitmq-messaging

### Paneles Incluidos

#### 1. Event Publish Rate (Go Publisher)

- **Tipo**: Time Series Graph
- **Query**: `rate(inventory_events_published_total{status="success"}[5m])`
- **Descripción**: Tasa de publicación de eventos por tipo y routing key

#### 2. Event Consumption Rate (NestJS Consumer)

- **Tipo**: Time Series Graph
- **Query**: `rate(orders_events_consumed_total{status="success"}[5m])`
- **Descripción**: Tasa de consumo de eventos por tipo

#### 3. Publish Duration (P95, P99)

- **Tipo**: Time Series Graph
- **Queries**:
  - P95: `histogram_quantile(0.95, rate(inventory_events_publish_duration_seconds_bucket[5m]))`
  - P99: `histogram_quantile(0.99, rate(inventory_events_publish_duration_seconds_bucket[5m]))`
- **Descripción**: Latencia de publicación en percentiles

#### 4. Processing Duration (P95, P99)

- **Tipo**: Time Series Graph
- **Queries**:
  - P95: `histogram_quantile(0.95, rate(orders_events_processing_duration_seconds_bucket[5m]))`
  - P99: `histogram_quantile(0.99, rate(orders_events_processing_duration_seconds_bucket[5m]))`
- **Descripción**: Latencia de procesamiento en percentiles

#### 5. Dead Letter Queue Messages

- **Tipo**: Stat Panel
- **Query**: `sum(orders_events_dlq_total)`
- **Thresholds**:
  - Verde: < 10
  - Amarillo: 10-50
  - Rojo: > 50

#### 6. Idempotent Skips

- **Tipo**: Stat Panel
- **Query**: `sum(orders_events_idempotent_skips_total)`
- **Descripción**: Total de eventos duplicados skippeados

#### 7. Publish Errors

- **Tipo**: Stat Panel
- **Query**: `sum(rate(inventory_events_publish_errors_total[5m]))`
- **Thresholds**:
  - Verde: < 0.01 errors/sec
  - Amarillo: 0.01-0.05
  - Rojo: > 0.05

#### 8. Processing Errors

- **Tipo**: Stat Panel
- **Query**: `sum(rate(orders_events_processing_errors_total[5m]))`
- **Thresholds**: Similar a Publish Errors

#### 9. RabbitMQ Queue Length

- **Tipo**: Time Series Graph
- **Queries**:
  - Ready: `rabbitmq_queue_messages{queue="orders.inventory_events"}`
  - Unacked: `rabbitmq_queue_messages_unacked{queue="orders.inventory_events"}`
- **Alert**: Dispara alerta si > 1000 mensajes por 5+ minutos

#### 10. Handler Execution Success Rate

- **Tipo**: Time Series Graph
- **Query**: Success rate formula
- **Descripción**: Porcentaje de ejecuciones exitosas de handlers

#### 11. Publish Retry Rate

- **Tipo**: Time Series Graph
- **Query**: `rate(inventory_events_publish_retries_total[5m])`
- **Descripción**: Tasa de reintentos de publicación

### Importar Dashboard

```bash
# Copiar el archivo al volumen de Grafana
cp monitoring/grafana/dashboards/rabbitmq-messaging-overview.json \
   /var/lib/grafana/dashboards/

# O importar via UI:
# Grafana → Dashboards → Import → Upload JSON file
```

---

## 🚨 Alertas Prometheus

Las alertas están configuradas en `monitoring/prometheus/alerts/rabbitmq-alerts.yml`.

### Alertas Críticas

#### 1. RabbitMQCriticalDLQMessages

- **Condición**: `sum(orders_events_dlq_total) > 50`
- **Duración**: 2 minutos
- **Severidad**: Critical
- **Descripción**: Más de 50 mensajes en DLQ, investigación inmediata requerida

#### 2. RabbitMQCriticalQueueLength

- **Condición**: `rabbitmq_queue_messages{queue="orders.inventory_events"} > 5000`
- **Duración**: 2 minutos
- **Severidad**: Critical
- **Descripción**: Cola con más de 5000 mensajes, consumer severamente atrasado

#### 3. RabbitMQConsumerLag

- **Condición**: Publish rate > Consume rate
- **Duración**: 5 minutos
- **Severidad**: Critical
- **Descripción**: Consumer no está procesando a la velocidad de publicación

#### 4. RabbitMQHighPublishErrorRate

- **Condición**: Error rate > 5%
- **Duración**: 5 minutos
- **Severidad**: Critical
- **Descripción**: Más del 5% de publicaciones están fallando

#### 5. RabbitMQHighProcessingErrorRate

- **Condición**: Error rate > 5%
- **Duración**: 5 minutos
- **Severidad**: Critical
- **Descripción**: Más del 5% de eventos fallan al procesarse

#### 6. RabbitMQDown

- **Condición**: `up{job="rabbitmq"} == 0`
- **Duración**: 1 minuto
- **Severidad**: Critical
- **Descripción**: RabbitMQ no está disponible

### Alertas de Advertencia

#### 1. RabbitMQHighDLQMessages

- **Condición**: `sum(orders_events_dlq_total) > 10`
- **Duración**: 5 minutos
- **Severidad**: Warning

#### 2. RabbitMQHighQueueLength

- **Condición**: Queue length > 1000
- **Duración**: 5 minutos
- **Severidad**: Warning

#### 3. RabbitMQPublishErrors

- **Condición**: Cualquier error de publicación
- **Duración**: 10 minutos
- **Severidad**: Warning

#### 4. RabbitMQHighPublishLatency

- **Condición**: P99 > 1 segundo
- **Duración**: 5 minutos
- **Severidad**: Warning

#### 5. RabbitMQHighProcessingLatency

- **Condición**: P99 > 5 segundos
- **Duración**: 5 minutos
- **Severidad**: Warning

### Cargar Alertas en Prometheus

```yaml
# Agregar a prometheus.yml
rule_files:
  - "/etc/prometheus/alerts/rabbitmq-alerts.yml"
```

---

## 🔧 Configuración

### Habilitar Prometheus en RabbitMQ

El plugin `rabbitmq_prometheus` está habilitado via `scripts/rabbitmq-plugins.conf`:

```erlang
[rabbitmq_management,rabbitmq_prometheus].
```

### Endpoints de Métricas

| Servicio                | Endpoint                       | Puerto |
| ----------------------- | ------------------------------ | ------ |
| Inventory Service (Go)  | http://localhost:8080/metrics  | 8080   |
| Orders Service (NestJS) | http://localhost:3001/metrics  | 3001   |
| RabbitMQ                | http://localhost:15692/metrics | 15692  |

### Scrape Configuration (Prometheus)

```yaml
scrape_configs:
  - job_name: "inventory-service"
    static_configs:
      - targets: ["inventory-service:8080"]
    metrics_path: "/metrics"
    scrape_interval: 15s

  - job_name: "orders-service"
    static_configs:
      - targets: ["orders-service:3001"]
    metrics_path: "/metrics"
    scrape_interval: 15s

  - job_name: "rabbitmq"
    static_configs:
      - targets: ["rabbitmq:15692"]
    metrics_path: "/metrics"
    scrape_interval: 15s
```

---

## 📋 Runbook - Investigación de Problemas

### Problema: Alta tasa de mensajes en DLQ

**Síntomas:**

- Alerta `RabbitMQHighDLQMessages` o `RabbitMQCriticalDLQMessages`
- Dashboard muestra DLQ > 10 mensajes

**Investigación:**

1. **Revisar razón de DLQ:**

   ```promql
   sum by (reason) (orders_events_dlq_total)
   ```

2. **Razones comunes:**

   - `invalid_schema`: Eventos no cumplen esquema Zod → Revisar publisher
   - `max_retries_exceeded`: Handler falla repetidamente → Revisar logs de handler
   - `no_handler`: Evento sin handler → Implementar handler faltante

3. **Revisar logs del consumer:**

   ```bash
   docker logs microservices-orders-service | grep "DLQ\|ERROR"
   ```

4. **Acciones:**
   - Fix code y redeploy
   - Considerar replay de mensajes de DLQ si es apropiado

---

### Problema: Consumer Lag

**Síntomas:**

- Alerta `RabbitMQConsumerLag`
- Queue length creciendo
- Publish rate > Consume rate

**Investigación:**

1. **Verificar processing latency:**

   ```promql
   histogram_quantile(0.99, rate(orders_events_processing_duration_seconds_bucket[5m]))
   ```

2. **Verificar CPU/Memory del consumer:**

   ```bash
   docker stats microservices-orders-service
   ```

3. **Posibles causas:**

   - Handler lento → Optimizar código
   - Bajo prefetch → Incrementar en consumer
   - Pocos consumers → Escalar horizontalmente

4. **Acciones:**
   - Escalar replicas del orders-service
   - Optimizar handlers lentos
   - Incrementar prefetch count

---

### Problema: High Publish Error Rate

**Síntomas:**

- Alerta `RabbitMQHighPublishErrorRate`
- `inventory_events_publish_errors_total` incrementando

**Investigación:**

1. **Verificar tipo de error:**

   ```promql
   sum by (error_type) (inventory_events_publish_errors_total)
   ```

2. **Revisar conectividad a RabbitMQ:**

   ```bash
   docker logs microservices-rabbitmq
   ```

3. **Posibles causas:**

   - RabbitMQ down/unavailable
   - Network issues
   - Channel cerrado inesperadamente

4. **Acciones:**
   - Verificar health de RabbitMQ
   - Revisar network entre inventory-service y RabbitMQ
   - Restart inventory-service si es necesario

---

## 🎯 SLOs (Service Level Objectives)

### Targets de Métricas

| Métrica                | Target  | Crítico |
| ---------------------- | ------- | ------- |
| Publish Success Rate   | > 99.9% | < 95%   |
| Consume Success Rate   | > 99.5% | < 95%   |
| P99 Publish Latency    | < 500ms | > 1s    |
| P99 Processing Latency | < 2s    | > 5s    |
| DLQ Messages           | < 10    | > 50    |
| Queue Length           | < 100   | > 1000  |
| Consumer Lag           | 0       | > 5min  |

---

## 📚 Referencias

- [Prometheus Client Go](https://github.com/prometheus/client_golang)
- [NestJS Prometheus](https://github.com/willsoto/nestjs-prometheus)
- [RabbitMQ Prometheus Plugin](https://www.rabbitmq.com/prometheus.html)
- [Grafana Provisioning](https://grafana.com/docs/grafana/latest/administration/provisioning/)
- [PromQL Examples](https://prometheus.io/docs/prometheus/latest/querying/examples/)

---

**Última actualización**: Epic 2.5 - T2.5.6 Observabilidad y Métricas
