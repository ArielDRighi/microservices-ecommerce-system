import { Injectable } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';

@Injectable()
export class HealthService {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
  ) {}

  @HealthCheck()
  check() {
    return this.health.check([
      // Database health check
      () => this.db.pingCheck('database'),

      // Memory health check - should not exceed 150MB
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),

      // Memory health check - should not exceed 300MB RSS
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),

      // Disk health check - should have at least 250GB free
      () =>
        this.disk.checkStorage('storage', {
          path: '/',
          thresholdPercent: 0.9, // 90% usage threshold
        }),
    ]);
  }

  @HealthCheck()
  checkReadiness() {
    return this.health.check([
      // Only check critical dependencies for readiness
      () => this.db.pingCheck('database'),
    ]);
  }

  @HealthCheck()
  checkLiveness() {
    return this.health.check([
      // Basic checks for liveness
      () => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024),
    ]);
  }
}
