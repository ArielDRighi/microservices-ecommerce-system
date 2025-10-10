# ADR-018: Prometheus Metrics (Planned)

**Status:** Planned  
**Date:** 2024-01-17  
**Author:** Development Team  
**Related ADRs:** ADR-017 (Health Checks)

---

## Context

Need **real-time metrics** for monitoring application performance: request rates, error rates, latency, queue sizes, circuit breaker states.

---

## Decision (Planned)

Use **prom-client** for Prometheus metrics exposure:

```typescript
/**
 * Prometheus Service (Planned)
 * Location: src/health/prometheus.service.ts
 */
@Injectable()
export class PrometheusService {
  private readonly registry = new Registry();

  // HTTP metrics
  private readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
  });

  private readonly httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
  });

  // Queue metrics
  private readonly queueJobsWaiting = new Gauge({
    name: 'queue_jobs_waiting',
    help: 'Number of jobs waiting in queue',
    labelNames: ['queue_name'],
  });

  private readonly queueJobsFailed = new Gauge({
    name: 'queue_jobs_failed',
    help: 'Number of failed jobs in queue',
    labelNames: ['queue_name'],
  });

  // Circuit breaker metrics
  private readonly circuitBreakerState = new Gauge({
    name: 'circuit_breaker_state',
    help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
    labelNames: ['name'],
  });

  constructor() {
    this.registry.registerMetric(this.httpRequestDuration);
    this.registry.registerMetric(this.httpRequestsTotal);
    this.registry.registerMetric(this.queueJobsWaiting);
    this.registry.registerMetric(this.queueJobsFailed);
    this.registry.registerMetric(this.circuitBreakerState);
  }

  getMetrics(): string {
    return this.registry.metrics();
  }
}
```

**Metrics Controller:**
```typescript
@Controller('metrics')
@Public()
export class MetricsController {
  constructor(private readonly prometheus: PrometheusService) {}

  @Get()
  getMetrics(): string {
    return this.prometheus.getMetrics();
  }
}
```

---

## Planned Metrics

**HTTP Metrics:**
- `http_request_duration_seconds` - Request latency histogram
- `http_requests_total` - Total requests counter
- `http_errors_total` - Error counter by status code

**Queue Metrics:**
- `queue_jobs_waiting` - Jobs in queue
- `queue_jobs_active` - Jobs being processed
- `queue_jobs_failed` - Failed jobs (DLQ size)
- `queue_job_duration_seconds` - Job processing time

**Circuit Breaker Metrics:**
- `circuit_breaker_state` - State gauge (0/1/2)
- `circuit_breaker_failures_total` - Failure counter
- `circuit_breaker_successes_total` - Success counter

**Database Metrics:**
- `db_connections_active` - Active connections
- `db_query_duration_seconds` - Query latency

---

## Grafana Dashboard (Planned)

```
┌─────────────────────────────────────────────┐
│ E-Commerce System Metrics                   │
├─────────────────────────────────────────────┤
│ HTTP Request Rate:     [▄▄▄█▄▄] 230 req/s  │
│ Average Latency:       [▂▃▅▃▂] 45ms         │
│ Error Rate:            [▁▁▁▁▁] 0.3%         │
├─────────────────────────────────────────────┤
│ Queue Jobs Waiting:    [▃▄█▅▃] 45           │
│ Queue Jobs Failed:     [▁▁▂▁▁] 3            │
│ Payment Circuit:       ● CLOSED             │
│ Inventory Circuit:     ● CLOSED             │
├─────────────────────────────────────────────┤
│ Database Connections:  [▄▅▆▅▄] 12/20        │
│ Memory Usage:          [▃▄▅▄▃] 180MB/300MB  │
└─────────────────────────────────────────────┘
```

---

## Benefits

✅ **Real-Time:** Instant visibility into system health  
✅ **Alerting:** Trigger alerts on thresholds (error rate > 5%)  
✅ **Trending:** Historical data for capacity planning  
✅ **Standard:** Prometheus = industry standard, works with Grafana  

---

## Implementation Plan

1. Install `prom-client` package
2. Create PrometheusService with metrics
3. Add interceptor to record HTTP metrics
4. Add Bull queue event listeners for queue metrics
5. Expose `/metrics` endpoint
6. Configure Prometheus scraper
7. Create Grafana dashboards

---

**Status:** ⏳ **PLANNED** (basic structure exists)  
**Priority:** HIGH (visibility critical for production)  
**Endpoint (Planned):** `GET /metrics` (Prometheus format)
