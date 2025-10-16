# 🏥 API Testing - Módulo de Health & Monitoring

**Módulo:** Health & Monitoring  
**Base URL:** `http://localhost:3002/api/v1/health`  
**Descripción:** Endpoints de salud, métricas Prometheus y monitoreo de queues

---

## 📋 Índice de Tests

- [ ] ✅ 1. Health Check General (GET /api/v1/health) [Public]
- [ ] ✅ 2. Readiness Check (GET /api/v1/health/ready) [Public]
- [ ] ✅ 3. Liveness Check (GET /api/v1/health/live) [Public]
- [ ] ✅ 4. Detailed Health (GET /api/v1/health/detailed) [Public]
- [ ] ✅ 5. Prometheus Metrics (GET /api/v1/metrics) [Public]
- [ ] ✅ 6. Bull Board Dashboard (GET /api/v1/admin/queues) [Web UI]

---

## Variables de Entorno

```bash
export BASE_URL="http://localhost:3002/api/v1"
```

---

## ⚠️ Importante: Estado Actual de Health Checks

### 📌 Componentes Monitoreados Actualmente

Los health checks actuales verifican:

- ✅ **Database (PostgreSQL)** - Conexión y ping
- ✅ **Memory (Heap & RSS)** - Uso de memoria
- ✅ **Storage (Disk)** - Espacio disponible

### 🚧 Componentes Implementados pero NO Habilitados

Los siguientes health indicators están **completamente implementados** en el código pero **NO están registrados** en el `HealthModule`:

- ⚠️ **RedisHealthIndicator** - Implementado en `src/health/indicators/redis.health-indicator.ts`
  - Razón: Requiere provider global `REDIS_CLIENT` que no existe
  - Redis funciona internamente para Bull queues pero no hay cliente global
- ⚠️ **QueueHealthIndicator** - Implementado en `src/health/indicators/queue.health-indicator.ts`
  - Razón: No está registrado en los providers de `HealthModule`
  - Las queues funcionan correctamente (verificable en Bull Board)

**💡 Nota:** El código en `health.service.ts` usa `@Optional()` para degradar gracefully si estos indicators no están disponibles. Por eso los endpoints funcionan sin errores aunque Redis/Queues no aparezcan en las respuestas.

### 🎯 Para Habilitar Redis/Queues Health Checks

Si necesitas monitorear Redis y Queues en los health checks:

1. **Redis:** Crear `RedisModule` con provider global `REDIS_CLIENT`
2. **Queues:** Descomentar `QueueHealthIndicator` en `health.module.ts` providers
3. Los checks condicionales ya están implementados en `health.service.ts`

---

## ⚠️ Health Checks para Kubernetes/Docker

Estos endpoints están diseñados para:

- **Kubernetes:** Liveness y Readiness probes
- **Docker:** HEALTHCHECK en Dockerfile
- **Load Balancers:** Health checks automáticos
- **Monitoring:** Prometheus scraping

**Respuestas:**

- `200 OK` - Todo saludable ✅
- `503 Service Unavailable` - Uno o más componentes fallan ❌

---

## 1️⃣ Health Check General

### ✅ Test 1.1: Verificar salud general de la aplicación

**Endpoint:** `GET /api/v1/health`  
**Autenticación:** No requerida (Public)  
**Status Code:** `200 OK` (healthy) o `503 Service Unavailable` (unhealthy)

**Comando curl:**

```bash
curl -X GET "$BASE_URL/api/v1/health" | jq '.'
```

**Respuesta Esperada (200 OK - Healthy):**

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "status": "ok",
    "info": {
      "database": {
        "status": "up"
      },
      "memory_heap": {
        "status": "up"
      },
      "memory_rss": {
        "status": "up"
      },
      "storage": {
        "status": "up"
      }
    },
    "error": {},
    "details": {
      "database": {
        "status": "up"
      },
      "memory_heap": {
        "status": "up"
      },
      "memory_rss": {
        "status": "up"
      },
      "storage": {
        "status": "up"
      }
    }
  },
  "timestamp": "2025-10-15T00:36:23.754Z",
  "path": "/api/v1/health",
  "success": true
}
```

**Respuesta con problemas (503 Service Unavailable):**

```json
{
  "statusCode": 503,
  "message": "Service Unavailable",
  "data": {
    "status": "error",
    "info": {
      "memory_heap": {
        "status": "up"
      },
      "memory_rss": {
        "status": "up"
      },
      "storage": {
        "status": "up"
      }
    },
    "error": {
      "database": {
        "status": "down",
        "message": "Connection refused"
      }
    },
    "details": {
      "database": {
        "status": "down",
        "message": "Connection refused"
      },
      "memory_heap": {
        "status": "up"
      },
      "memory_rss": {
        "status": "up"
      },
      "storage": {
        "status": "up"
      }
    }
  },
  "timestamp": "2025-10-15T00:36:23.754Z",
  "path": "/api/v1/health",
  "success": false
}
```

**Checklist:**

- [ ] Status code 200 cuando todo está saludable
- [ ] Status code 503 cuando algún componente falla
- [ ] Verifica: Database (PostgreSQL), Memory (heap y RSS), Storage
- [ ] `data.status: "ok"` indica aplicación saludable
- [ ] `data.status: "error"` indica problemas
- [ ] Respuesta envuelta en wrapper estándar con `statusCode`, `message`, `data`, `timestamp`, `path`, `success`
- [ ] Endpoint público (no requiere auth)
- [ ] ⚠️ Redis NO aparece (indicator implementado pero no registrado)
- [ ] ⚠️ Queues NO aparecen (indicator implementado pero no registrado)

**💡 Nota:** Redis y Queues están disponibles a través de Bull Board pero no expuestos en health checks básicos.

---

## 2️⃣ Readiness Check

### ✅ Test 2.1: Verificar si la aplicación está lista para recibir tráfico

**Endpoint:** `GET /api/v1/health/ready`  
**Autenticación:** No requerida (Public)  
**Uso:** Kubernetes Readiness Probe

**Comando curl:**

```bash
curl -X GET "$BASE_URL/api/v1/health/ready" | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "status": "ok",
    "info": {
      "database": {
        "status": "up"
      }
    },
    "error": {},
    "details": {
      "database": {
        "status": "up"
      }
    }
  },
  "timestamp": "2025-10-15T00:36:33.795Z",
  "path": "/api/v1/health/ready",
  "success": true
}
```

**Checklist:**

- [ ] Status code 200 cuando está listo
- [ ] Status code 503 cuando NO está listo
- [ ] Verifica dependencias críticas (Database únicamente)
- [ ] Kubernetes usa esto para routing de tráfico
- [ ] ⚠️ Redis NO aparece (indicator implementado pero no registrado como crítico)

**💡 Nota:** Actualmente solo verifica Database. Redis funciona internamente para Bull queues pero no está expuesto como dependencia crítica en readiness.

**Uso en Kubernetes:**

```yaml
readinessProbe:
  httpGet:
    path: /api/v1/health/ready
    port: 3002
  initialDelaySeconds: 10
  periodSeconds: 5
```

---

## 3️⃣ Liveness Check

### ✅ Test 3.1: Verificar si la aplicación está viva

**Endpoint:** `GET /api/v1/health/live`  
**Autenticación:** No requerida (Public)  
**Uso:** Kubernetes Liveness Probe

**Comando curl:**

```bash
curl -X GET "$BASE_URL/api/v1/health/live" | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "status": "ok",
    "info": {
      "memory_heap": {
        "status": "up"
      }
    },
    "error": {},
    "details": {
      "memory_heap": {
        "status": "up"
      }
    }
  },
  "timestamp": "2025-10-15T00:36:40.500Z",
  "path": "/api/v1/health/live",
  "success": true
}
```

**Checklist:**

- [ ] Status code 200 cuando está viva
- [ ] Status code 503 cuando el proceso está colgado
- [ ] Check más ligero que readiness
- [ ] Kubernetes usa esto para reiniciar pods

**Uso en Kubernetes:**

```yaml
livenessProbe:
  httpGet:
    path: /api/v1/health/live
    port: 3002
  initialDelaySeconds: 30
  periodSeconds: 10
```

---

## 4️⃣ Detailed Health Check

### ✅ Test 4.1: Obtener información detallada de salud

**Endpoint:** `GET /api/v1/health/detailed`  
**Autenticación:** No requerida (Public)  
**Descripción:** Health check completo con detalles de todos los componentes

**Comando curl:**

```bash
curl -X GET "$BASE_URL/api/v1/health/detailed" | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "status": "ok",
    "info": {
      "database": {
        "status": "up"
      },
      "database_detailed": {
        "status": "up",
        "responseTime": 23
      },
      "memory_heap": {
        "status": "up"
      },
      "memory_rss": {
        "status": "up"
      },
      "storage": {
        "status": "up"
      }
    },
    "error": {},
    "details": {
      "database": {
        "status": "up"
      },
      "database_detailed": {
        "status": "up",
        "responseTime": 23
      },
      "memory_heap": {
        "status": "up"
      },
      "memory_rss": {
        "status": "up"
      },
      "storage": {
        "status": "up"
      }
    }
  },
  "timestamp": "2025-10-15T00:36:48.159Z",
  "path": "/api/v1/health/detailed",
  "success": true
}
```

**Checklist:**

- [ ] Status code 200 cuando todo está saludable
- [ ] Respuesta envuelta en wrapper estándar (`statusCode`, `message`, `data`, etc.)
- [ ] Incluye check básico de Database (`database`)
- [ ] Incluye check detallado de Database (`database_detailed`) con `responseTime`
- [ ] Incluye checks de memoria (heap y RSS)
- [ ] Incluye check de storage (correctamente nombrado, no "disk")
- [ ] Métricas de performance incluidas donde aplica
- [ ] ⚠️ Redis NO aparece (RedisHealthIndicator implementado pero no registrado)
- [ ] ⚠️ Queues NO aparecen (QueueHealthIndicator implementado pero no registrado)

**💡 Nota Importante sobre Redis y Queues:**

**Estado Actual:**

- ✅ Redis está funcionando correctamente (usado internamente por Bull)
- ✅ Las 4 queues de Bull están operacionales (order-processing, payment-processing, inventory-management, notification-sending)
- ✅ Bull Board accesible en `/api/v1/admin/queues` para monitoreo de queues

**Por qué NO aparecen en health checks:**

- `RedisHealthIndicator` está implementado en `src/health/indicators/redis.health-indicator.ts` pero requiere provider global `REDIS_CLIENT` que no existe
- `QueueHealthIndicator` está implementado en `src/health/indicators/queue.health-indicator.ts` pero no está registrado en `HealthModule` providers
- El `health.service.ts` usa `@Optional()` para degradar gracefully sin estos indicators

**Para habilitar en el futuro:**

1. Crear `RedisModule` con provider `REDIS_CLIENT`
2. Registrar `QueueHealthIndicator` en `health.module.ts`
3. Los checks condicionales ya están listos en el código

---

## 5️⃣ Prometheus Metrics

### ✅ Test 5.1: Obtener métricas en formato Prometheus

**Endpoint:** `GET /api/v1/metrics`  
**Autenticación:** No requerida (Public)  
**Content-Type:** `text/plain; version=0.0.4`  
**Descripción:** Endpoint para scraping de Prometheus

**Comando curl:**

```bash
curl -X GET "$BASE_URL/api/v1/metrics"
```

**Respuesta Esperada (200 OK - Plain Text):**

```prometheus
# HELP orders_processed_total Total number of orders processed
# TYPE orders_processed_total counter
orders_processed_total 1234

# HELP orders_failed_total Total number of orders that failed processing
# TYPE orders_failed_total counter
orders_failed_total 5

# HELP order_processing_duration_seconds Order processing duration in seconds
# TYPE order_processing_duration_seconds histogram
order_processing_duration_seconds_bucket{le="0.5"} 100
order_processing_duration_seconds_bucket{le="1"} 150
order_processing_duration_seconds_bucket{le="2"} 180
order_processing_duration_seconds_bucket{le="5"} 195
order_processing_duration_seconds_bucket{le="+Inf"} 200
order_processing_duration_seconds_sum 234.5
order_processing_duration_seconds_count 200

# HELP payments_processed_total Total number of payments processed
# TYPE payments_processed_total counter
payments_processed_total{status="succeeded"} 987
payments_processed_total{status="failed"} 13

# HELP payment_processing_duration_seconds Payment processing duration in seconds
# TYPE payment_processing_duration_seconds histogram
payment_processing_duration_seconds_bucket{le="0.5"} 800
payment_processing_duration_seconds_bucket{le="1"} 950
payment_processing_duration_seconds_bucket{le="2"} 980
payment_processing_duration_seconds_bucket{le="+Inf"} 1000
payment_processing_duration_seconds_sum 678.9
payment_processing_duration_seconds_count 1000

# HELP inventory_operations_total Total number of inventory operations
# TYPE inventory_operations_total counter
inventory_operations_total{operation="reserve"} 456
inventory_operations_total{operation="release"} 123
inventory_operations_total{operation="fulfill"} 333

# HELP notifications_sent_total Total number of notifications sent
# TYPE notifications_sent_total counter
notifications_sent_total{type="email"} 2345
notifications_sent_total{type="sms"} 678

# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/products",status="200"} 5432
http_requests_total{method="POST",route="/orders",status="201"} 1234
http_requests_total{method="GET",route="/health",status="200"} 9876

# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",route="/products",le="0.1"} 4000
http_request_duration_seconds_bucket{method="GET",route="/products",le="0.5"} 5200
http_request_duration_seconds_bucket{method="GET",route="/products",le="1"} 5400
http_request_duration_seconds_bucket{method="GET",route="/products",le="+Inf"} 5432

# HELP nodejs_heap_size_used_bytes Heap size used in bytes
# TYPE nodejs_heap_size_used_bytes gauge
nodejs_heap_size_used_bytes 234567890

# HELP nodejs_heap_size_total_bytes Total heap size in bytes
# TYPE nodejs_heap_size_total_bytes gauge
nodejs_heap_size_total_bytes 536870912

# HELP process_cpu_user_seconds_total User CPU time spent in seconds
# TYPE process_cpu_user_seconds_total counter
process_cpu_user_seconds_total 123.45

# HELP process_cpu_system_seconds_total System CPU time spent in seconds
# TYPE process_cpu_system_seconds_total counter
process_cpu_system_seconds_total 67.89
```

**Checklist:**

- [ ] Status code es 200
- [ ] Content-Type es `text/plain`
- [ ] Formato Prometheus válido
- [ ] Incluye métricas de negocio (orders, payments, inventory)
- [ ] Incluye métricas HTTP (requests, durations)
- [ ] Incluye métricas de Node.js (heap, CPU)
- [ ] Prometheus puede scrapear sin errores

**Configuración Prometheus:**

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'ecommerce-api'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:3002']
    metrics_path: '/api/v1/metrics'
```

**Verificar métricas específicas:**

```bash
# Ver solo métricas de órdenes
curl -s "$BASE_URL/api/v1/metrics" | grep "orders_"

# Ver métricas de pagos
curl -s "$BASE_URL/api/v1/metrics" | grep "payments_"

# Ver métricas HTTP
curl -s "$BASE_URL/api/v1/metrics" | grep "http_"

# Ver métricas de memoria
curl -s "$BASE_URL/api/v1/metrics" | grep "nodejs_heap"
```

---

## 6️⃣ Bull Board Dashboard (Web UI) **[🔐 Basic Auth]**

### 🔐 Autenticación Bull Board

Bull Board está protegido con **Basic Authentication** usando credenciales configuradas en variables de entorno.

**Variables de Entorno Requeridas:**

```bash
# .env o .env.production
BULL_BOARD_USERNAME=admin
BULL_BOARD_PASSWORD=your-secure-password-here
```

**⚠️ Seguridad:**

- Basic Auth implementado para prevenir acceso no autorizado
- Credenciales configurables por entorno
- Sin credenciales = error 401 Unauthorized
- Protege operaciones sensibles: retry, delete, pause queues

---

### ✅ Test 6.1: Acceder al dashboard CON autenticación

**Endpoint:** `GET /api/v1/admin/queues`  
**Autenticación:** Basic Auth (Username + Password)  
**Tipo:** Web UI (HTML)  
**Status Code:** `200 OK` (con auth) o `401 Unauthorized` (sin auth)

**Comando curl CON Basic Auth:**

```bash
# Usando credenciales de .env
curl -X GET "$BASE_URL/api/v1/admin/queues" \
  --user "admin:your-secure-password-here"

# Usando variables
export BULL_BOARD_USERNAME="admin"
export BULL_BOARD_PASSWORD="your-secure-password-here"

curl -X GET "$BASE_URL/api/v1/admin/queues" \
  --user "$BULL_BOARD_USERNAME:$BULL_BOARD_PASSWORD"
```

**Acceso desde navegador:**

```
http://localhost:3002/api/v1/admin/queues
```

El navegador solicitará credenciales automáticamente (popup de Basic Auth):

- **Username:** `admin` (o valor configurado en `BULL_BOARD_USERNAME`)
- **Password:** tu password configurado en `BULL_BOARD_PASSWORD`

**Dashboard incluye:**

- 📊 **Vista de todas las queues:**
  - `order-processing` - Procesamiento de órdenes
  - `payment-processing` - Procesamiento de pagos
  - `inventory-management` - Gestión de inventario
  - `notification-sending` - Envío de notificaciones

- 📈 **Métricas por queue:**
  - Waiting: Jobs esperando procesamiento
  - Active: Jobs en ejecución
  - Completed: Jobs completados exitosamente
  - Failed: Jobs fallidos
  - Delayed: Jobs programados para el futuro
  - Paused: Queue pausada

- 🔍 **Funcionalidades:**
  - Ver detalles de cada job
  - Retry de jobs fallidos
  - Eliminar jobs
  - Pausar/reanudar queues
  - Ver logs y stack traces
  - Filtrar por estado

**Checklist:**

- [ ] Dashboard accesible en `/admin/queues` con credenciales
- [ ] Basic Auth funciona correctamente
- [ ] Sin credenciales retorna 401 Unauthorized
- [ ] Muestra las 4 queues principales
- [ ] Estadísticas en tiempo real
- [ ] Se pueden ver jobs individuales
- [ ] Se pueden hacer retry de jobs fallidos
- [ ] Interfaz web responsive

---

### ❌ Test 6.2: Intento de acceso SIN autenticación (401 Unauthorized)

**Comando curl sin credenciales:**

```bash
curl -X GET "$BASE_URL/api/v1/admin/queues" -i
```

**Respuesta Esperada (401 Unauthorized):**

```
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Basic realm="Bull Board"
Content-Length: 0
```

**Checklist:**

- [ ] Status code es 401
- [ ] Header `WWW-Authenticate: Basic` presente
- [ ] No se muestra el dashboard sin autenticación

**💡 Nota:** El navegador solicitará credenciales automáticamente cuando vea el header `WWW-Authenticate: Basic`.

---

### 📝 Configuración de Credenciales

**Archivo `.env` o `.env.production`:**

```bash
# Bull Board Authentication
BULL_BOARD_USERNAME=admin
BULL_BOARD_PASSWORD=SuperSecurePassword123!

# Cambiar en producción:
# - Usar contraseñas fuertes (min 16 caracteres)
# - Incluir mayúsculas, minúsculas, números y símbolos
# - No usar credenciales por defecto
# - Rotar periódicamente
```

**Verificar configuración:**

```bash
# Ver variables configuradas (sin mostrar valores)
echo "Username configurado: ${BULL_BOARD_USERNAME:-'NOT SET'}"
[ -z "$BULL_BOARD_PASSWORD" ] && echo "Password: NOT SET" || echo "Password: CONFIGURED"
```

---

## 🧪 Script de Testing Completo

```bash
#!/bin/bash
# Testing completo de Health & Monitoring Module

BASE_URL="http://localhost:3002"

echo "=== 🏥 Testing Health & Monitoring Module ==="
echo ""

# 1. Health Check General
echo "1️⃣ Health Check General..."
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/api/v1/health")

if [ "$HEALTH" == "200" ]; then
  echo "✅ Application healthy (HTTP 200)"
  curl -s -X GET "$BASE_URL/api/v1/health" | jq '.data.status'
else
  echo "❌ Application unhealthy (HTTP $HEALTH)"
  curl -s -X GET "$BASE_URL/api/v1/health" | jq '.'
fi

# 2. Readiness Check
echo ""
echo "2️⃣ Readiness Check..."
READY=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/api/v1/health/ready")

if [ "$READY" == "200" ]; then
  echo "✅ Application ready (HTTP 200)"
else
  echo "❌ Application not ready (HTTP $READY)"
fi

# 3. Liveness Check
echo ""
echo "3️⃣ Liveness Check..."
LIVE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/api/v1/health/live")

if [ "$LIVE" == "200" ]; then
  echo "✅ Application alive (HTTP 200)"
else
  echo "❌ Application not responding (HTTP $LIVE)"
fi

# 4. Detailed Health
echo ""
echo "4️⃣ Detailed Health Check..."
DETAILED=$(curl -s -X GET "$BASE_URL/api/v1/health/detailed")

DATABASE_STATUS=$(echo $DETAILED | jq -r '.data.info.database.status')
DATABASE_DETAILED_STATUS=$(echo $DETAILED | jq -r '.data.info.database_detailed.status')
DATABASE_RESPONSE_TIME=$(echo $DETAILED | jq -r '.data.info.database_detailed.responseTime')
MEMORY_HEAP_STATUS=$(echo $DETAILED | jq -r '.data.info.memory_heap.status')
MEMORY_RSS_STATUS=$(echo $DETAILED | jq -r '.data.info.memory_rss.status')
STORAGE_STATUS=$(echo $DETAILED | jq -r '.data.info.storage.status')

echo "   Database: $DATABASE_STATUS"
echo "   Database Detailed: $DATABASE_DETAILED_STATUS (${DATABASE_RESPONSE_TIME}ms)"
echo "   Memory Heap: $MEMORY_HEAP_STATUS"
echo "   Memory RSS: $MEMORY_RSS_STATUS"
echo "   Storage: $STORAGE_STATUS"

# 5. Prometheus Metrics
echo ""
echo "5️⃣ Prometheus Metrics..."
METRICS=$(curl -s -X GET "$BASE_URL/api/v1/metrics")

if [ ! -z "$METRICS" ]; then
  echo "✅ Metrics endpoint responding"

  # Count metric types
  COUNTERS=$(echo "$METRICS" | grep "# TYPE.*counter" | wc -l)
  GAUGES=$(echo "$METRICS" | grep "# TYPE.*gauge" | wc -l)
  HISTOGRAMS=$(echo "$METRICS" | grep "# TYPE.*histogram" | wc -l)

  echo "   Counters: $COUNTERS"
  echo "   Gauges: $GAUGES"
  echo "   Histograms: $HISTOGRAMS"

  # Show sample metrics
  echo ""
  echo "   Sample metrics:"
  echo "$METRICS" | grep "orders_processed_total" | head -1
  echo "$METRICS" | grep "payments_processed_total" | head -1
  echo "$METRICS" | grep "http_requests_total" | head -3
else
  echo "❌ Metrics endpoint not responding"
fi

# 6. Bull Board Dashboard (Basic Auth)
echo ""
echo "6️⃣ Bull Board Dashboard..."

# Test sin autenticación (debe retornar 401)
BULL_UNAUTH=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/api/v1/admin/queues")

if [ "$BULL_UNAUTH" == "401" ]; then
  echo "✅ Basic Auth protecting Bull Board (401 without credentials)"
else
  echo "⚠️  Bull Board accessible without auth (HTTP $BULL_UNAUTH)"
fi

# Test con autenticación (requiere env vars)
if [ ! -z "$BULL_BOARD_USERNAME" ] && [ ! -z "$BULL_BOARD_PASSWORD" ]; then
  BULL_AUTH=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/api/v1/admin/queues" \
    --user "$BULL_BOARD_USERNAME:$BULL_BOARD_PASSWORD")

  if [ "$BULL_AUTH" == "200" ]; then
    echo "✅ Bull Board accessible with credentials (HTTP 200)"
  else
    echo "❌ Bull Board auth failed (HTTP $BULL_AUTH)"
  fi
else
  echo "⚠️  BULL_BOARD credentials not set - skipping auth test"
fi

echo "   Access via browser: $BASE_URL/api/v1/admin/queues"

echo ""
echo "=== ✅ Testing completado ==="
echo ""
echo "📊 Summary:"
echo "   Health: $HEALTH"
echo "   Readiness: $READY"
echo "   Liveness: $LIVE"
echo "   Database: $DATABASE_STATUS"
echo "   Storage: $STORAGE_STATUS"
echo ""
echo "💡 Note: Redis and Queues monitored via Bull Board at /api/v1/admin/queues"
```

---

## 📝 Notas Importantes

### Health Check Best Practices

**Kubernetes Probes:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ecommerce-api
spec:
  containers:
    - name: api
      image: ecommerce-api:latest
      ports:
        - containerPort: 3002
      livenessProbe:
        httpGet:
          path: /api/v1/health/live
          port: 3002
        initialDelaySeconds: 30
        periodSeconds: 10
        timeoutSeconds: 5
        failureThreshold: 3
      readinessProbe:
        httpGet:
          path: /api/v1/health/ready
          port: 3002
        initialDelaySeconds: 10
        periodSeconds: 5
        timeoutSeconds: 3
        failureThreshold: 3
```

**Docker HEALTHCHECK:**

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3002/api/v1/health/live || exit 1
```

### Métricas Prometheus Disponibles

**Business Metrics:**

- `orders_processed_total` - Total de órdenes procesadas
- `orders_failed_total` - Total de órdenes fallidas
- `order_processing_duration_seconds` - Duración de procesamiento
- `payments_processed_total` - Total de pagos (con labels: status)
- `payment_processing_duration_seconds` - Duración de pagos
- `inventory_operations_total` - Operaciones de inventario
- `notifications_sent_total` - Notificaciones enviadas (con labels: type)

**HTTP Metrics:**

- `http_requests_total` - Total de requests (labels: method, route, status)
- `http_request_duration_seconds` - Duración de requests

**System Metrics:**

- `nodejs_heap_size_used_bytes` - Memoria heap usada
- `nodejs_heap_size_total_bytes` - Total memoria heap
- `process_cpu_user_seconds_total` - CPU usuario
- `process_cpu_system_seconds_total` - CPU sistema

### Bull Board - Queue Management

**Estados de Jobs:**

- **Waiting:** Esperando ser procesados
- **Active:** En ejecución ahora
- **Completed:** Completados exitosamente
- **Failed:** Fallidos (ver logs)
- **Delayed:** Programados para el futuro
- **Paused:** Queue pausada

**Operaciones disponibles:**

- Retry individual job
- Retry todos los jobs fallidos
- Eliminar job
- Pausar/reanudar queue
- Ver detalles y logs

### 🔐 Seguridad Bull Board

**Basic Authentication:**

- Protege dashboard de queues sensible
- Credenciales configurables por entorno (`BULL_BOARD_USERNAME`, `BULL_BOARD_PASSWORD`)
- Sin credenciales válidas = 401 Unauthorized
- Navegadores muestran popup de autenticación automáticamente

**Recomendaciones:**

- Usar contraseñas fuertes (16+ caracteres)
- Cambiar credenciales por defecto en producción
- Rotar passwords periódicamente
- No exponer credenciales en logs o código
- Considerar IP whitelisting adicional para mayor seguridad

---

**Estado del Módulo:** ✅ Completado  
**Endpoints Totales:** 6  
**Tests Críticos:** 5  
**Prometheus:** ✅ Integrado  
**Kubernetes:** ✅ Ready  
**Seguridad:** ✅ Bull Board protegido con Basic Auth  
**Última Actualización:** 2025-10-14
