import { Injectable, Inject } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { Redis } from 'ioredis';

/**
 * Custom Redis Health Indicator
 * Checks Redis connection status, latency, and provides memory information
 */
@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redisClient: Redis,
  ) {
    super();
  }

  /**
   * Check if Redis is healthy
   * @param key - The key for the health check result
   * @returns Health indicator result
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      // Check if Redis client is ready
      if (this.redisClient.status !== 'ready') {
        throw new Error(`Redis is not ready. Current status: ${this.redisClient.status}`);
      }

      // Ping Redis to verify connection
      const pingResult = await this.redisClient.ping();
      const latency = Date.now() - startTime;

      if (pingResult !== 'PONG') {
        throw new Error('Redis ping failed');
      }

      return this.getStatus(key, true, {
        status: 'up',
        latency,
      });
    } catch (error) {
      throw new HealthCheckError(
        `Redis health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.getStatus(key, false, {
          status: 'down',
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  /**
   * Check Redis latency against a threshold
   * @param key - The key for the health check result
   * @param maxLatency - Maximum acceptable latency in milliseconds
   * @returns Health indicator result
   */
  async checkLatency(key: string, maxLatency: number): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      await this.redisClient.ping();
      const latency = Date.now() - startTime;

      if (latency > maxLatency) {
        throw new Error(`Redis latency ${latency}ms exceeds threshold ${maxLatency}ms`);
      }

      return this.getStatus(key, true, {
        status: 'up',
        latency,
        threshold: maxLatency,
      });
    } catch (error) {
      throw new HealthCheckError(
        `Redis latency check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.getStatus(key, false, {
          status: 'down',
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  /**
   * Get Redis memory information
   * @returns Memory usage information
   */
  async getMemoryInfo(): Promise<Record<string, string>> {
    try {
      const info = await this.redisClient.info('memory');
      const lines = info.split('\r\n');
      const memoryInfo: Record<string, string> = {};

      for (const line of lines) {
        if (line && line.includes(':')) {
          const [key, value] = line.split(':');
          if (key && value) {
            memoryInfo[key.trim()] = value.trim();
          }
        }
      }

      return memoryInfo;
    } catch {
      return {};
    }
  }
}
