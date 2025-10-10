# ADR-017: Health Checks with Terminus

**Status:** Accepted  
**Date:** 2024-01-17  
**Author:** Development Team  
**Related ADRs:** ADR-005 (NestJS), ADR-006 (PostgreSQL)

---

## Context

Kubernetes and load balancers need to know if the application is healthy before routing traffic. Need **health endpoints** for liveness (is app running?) and readiness (can app handle traffic?).

---

## Decision

Use **@nestjs/terminus** for health checks with custom indicators:

```typescript
/**
 * Health Controller
 * Location: src/health/health.controller.ts
 */
@Controller('health')
@Public() // No authentication required
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.healthService.check();
  }

  @Get('ready')
  @HealthCheck()
  async checkReadiness(): Promise<HealthCheckResult> {
    return this.healthService.checkReadiness();
  }

  @Get('live')
  @HealthCheck()
  async checkLiveness(): Promise<HealthCheckResult> {
    return this.healthService.checkLiveness();
  }
}
```

**Health Service:**

```typescript
/**
 * Health Service
 * Location: src/health/health.service.ts
 */
@Injectable()
export class HealthService {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    @InjectQueue('order-processing') private orderQueue: Queue,
  ) {}

  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      // Database connectivity
      () => this.db.pingCheck('database'),

      // Memory usage (< 300MB)
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),

      // Disk usage (< 90%)
      () =>
        this.disk.checkStorage('storage', {
          path: '/',
          thresholdPercent: 0.9,
        }),

      // Queue health (custom indicator)
      () => this.checkQueueHealth(),
    ]);
  }

  private async checkQueueHealth(): Promise<HealthIndicatorResult> {
    const waitingCount = await this.orderQueue.getWaitingCount();
    const activeCount = await this.orderQueue.getActiveCount();
    const failedCount = await this.orderQueue.getFailedCount();

    const isHealthy = waitingCount < 1000 && failedCount < 100;

    return {
      queue: {
        status: isHealthy ? 'up' : 'down',
        waiting: waitingCount,
        active: activeCount,
        failed: failedCount,
      },
    };
  }
}
```

---

## Endpoints

**GET /health** - Overall health (all checks)

```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "memory_heap": { "status": "up" },
    "storage": { "status": "up" },
    "queue": { "status": "up", "waiting": 23, "active": 5, "failed": 2 }
  }
}
```

**GET /health/ready** - Readiness probe (K8s)

- Database connected
- Redis connected
- Dependencies ready

**GET /health/live** - Liveness probe (K8s)

- App process running
- Not deadlocked

---

## Kubernetes Integration

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: app
      livenessProbe:
        httpGet:
          path: /health/live
          port: 3000
        initialDelaySeconds: 10
        periodSeconds: 10
      readinessProbe:
        httpGet:
          path: /health/ready
          port: 3000
        initialDelaySeconds: 5
        periodSeconds: 5
```

---

## Benefits

✅ **Auto-Discovery:** K8s auto-detects unhealthy pods  
✅ **Graceful Shutdown:** Stop traffic before terminating  
✅ **Zero Downtime:** Rolling updates with readiness checks  
✅ **Debugging:** `/health` shows which component is failing

---

**Status:** ✅ **IMPLEMENTED**  
**Endpoints:** `/health`, `/health/ready`, `/health/live`
