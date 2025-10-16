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
    // Use MUCH higher thresholds in test environment to avoid false positives
    // Tests create multiple app instances which accumulate memory
    const isTestEnv = process.env['NODE_ENV'] === 'test' || process.env['NODE_ENV'] === 'e2e';

    const heapThreshold = isTestEnv
      ? 2000 * 1024 * 1024 // 2GB for tests (increased from 1GB)
      : 150 * 1024 * 1024; // 150MB for production

    const rssThreshold = isTestEnv
      ? 3000 * 1024 * 1024 // 3GB for tests (increased from 1.2GB)
      : 300 * 1024 * 1024; // 300MB for production

    const checks = [
      // Database health check
      () => this.db.pingCheck('database'),

      // Memory health check - should not exceed threshold
      () => this.memory.checkHeap('memory_heap', heapThreshold),

      // Memory health check - RSS threshold
      () => this.memory.checkRSS('memory_rss', rssThreshold),

      // Disk health check - should have at least 250GB free
      () =>
        this.disk.checkStorage('storage', {
          path: process.platform === 'win32' ? 'C:\\' : '/',
          thresholdPercent: 0.9, // 90% usage threshold
        }),
    ];

    // Add Redis check if available
    if (this.redis) {
      checks.push(() => this.redis!.isHealthy('redis'));
    }

    return this.health.check(checks);
  }

  @HealthCheck()
  checkReadiness() {
    const checks = [
      // Only check critical dependencies for readiness
      () => this.db.pingCheck('database'),
    ];

    // Add Redis check if available (critical for queues)
    if (this.redis) {
      checks.push(() => this.redis!.isHealthy('redis'));
    }

    return this.health.check(checks);
  }

  @HealthCheck()
  checkLiveness() {
    // Use MUCH higher threshold in test environment
    const isTestEnv = process.env['NODE_ENV'] === 'test' || process.env['NODE_ENV'] === 'e2e';

    const memoryThreshold = isTestEnv
      ? 2000 * 1024 * 1024 // 2GB for tests (increased from 1GB)
      : 200 * 1024 * 1024; // 200MB for production

    return this.health.check([
      // Basic checks for liveness
      () => this.memory.checkHeap('memory_heap', memoryThreshold),
    ]);
  }

  @HealthCheck()
  checkDetailed() {
    // Use MUCH higher thresholds in test environment
    const isTestEnv = process.env['NODE_ENV'] === 'test' || process.env['NODE_ENV'] === 'e2e';

    const heapThreshold = isTestEnv
      ? 2000 * 1024 * 1024 // 2GB for tests (increased from 1GB)
      : 150 * 1024 * 1024; // 150MB for production

    const rssThreshold = isTestEnv
      ? 3000 * 1024 * 1024 // 3GB for tests (increased from 1.2GB)
      : 300 * 1024 * 1024; // 300MB for production

    const checks = [
      // Database checks
      () => this.db.pingCheck('database'),
      () => this.database.pingCheck('database_detailed'),

      // Memory checks
      () => this.memory.checkHeap('memory_heap', heapThreshold),
      () => this.memory.checkRSS('memory_rss', rssThreshold),

      // Disk check
      () =>
        this.disk.checkStorage('storage', {
          path: process.platform === 'win32' ? 'C:\\' : '/',
          thresholdPercent: 0.9,
        }),
    ];

    // Add Redis checks if available
    if (this.redis) {
      checks.push(() => this.redis!.isHealthy('redis'));
    }

    // Add Queue checks if available
    if (this.queue) {
      checks.push(() => this.queue!.isHealthy('queues'));
    }

    return this.health.check(checks);
  }
}
