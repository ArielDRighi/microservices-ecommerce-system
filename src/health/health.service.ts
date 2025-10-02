import { Injectable, Optional } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { DatabaseHealthIndicator, RedisHealthIndicator, QueueHealthIndicator } from './indicators';

@Injectable()
export class HealthService {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly database: DatabaseHealthIndicator,
    @Optional() private readonly redis?: RedisHealthIndicator,
    @Optional() private readonly queue?: QueueHealthIndicator,
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
          path: process.platform === 'win32' ? 'C:\\' : '/',
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

  @HealthCheck()
  checkDetailed() {
    return this.health.check([
      // Database checks
      () => this.db.pingCheck('database'),
      () => this.database.pingCheck('database_detailed'),

      // Redis checks (commented out until Redis client is properly configured)
      // () => this.redis.isHealthy('redis'),
      // () => this.redis.checkLatency('redis_latency', 100), // 100ms threshold

      // Queue checks (commented out until properly configured)
      // () => this.queue?.isHealthy('queues'),

      // Memory checks
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),

      // Disk check
      () =>
        this.disk.checkStorage('storage', {
          path: process.platform === 'win32' ? 'C:\\' : '/',
          thresholdPercent: 0.9,
        }),
    ]);
  }
}
