import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

/**
 * Custom Database Health Indicator
 * Checks database connection status and provides detailed connection pool information
 */
@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {
    super();
  }

  /**
   * Check if database is healthy
   * @param key - The key for the health check result
   * @returns Health indicator result
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Check if connection is initialized
      if (!this.connection.isInitialized) {
        throw new Error('Database connection is not initialized');
      }

      // Execute a simple query to verify connection
      await this.connection.query('SELECT 1');

      // Get connection pool information if available
      const poolInfo = this.getPoolInfo();

      return this.getStatus(key, true, {
        status: 'up',
        ...poolInfo,
      });
    } catch (error) {
      throw new HealthCheckError(
        `Database health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.getStatus(key, false, {
          status: 'down',
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  /**
   * Ping check with response time measurement
   * @param key - The key for the health check result
   * @returns Health indicator result with response time
   */
  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      await this.connection.query('SELECT 1');
      const responseTime = Date.now() - startTime;

      return this.getStatus(key, true, {
        status: 'up',
        responseTime,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      throw new HealthCheckError(
        `Database ping failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.getStatus(key, false, {
          status: 'down',
          responseTime,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  /**
   * Get connection pool information
   * @private
   * @returns Pool info object or empty object if not available
   */
  private getPoolInfo(): Record<string, unknown> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const driver = (this.connection as any).driver;

      if (driver?.pool) {
        return {
          poolSize: driver.pool.totalCount || 0,
          idleConnections: driver.pool.idleCount || 0,
          waitingCount: driver.pool.waitingCount || 0,
        };
      }
    } catch {
      // Pool info not available, return empty object
    }

    return {};
  }
}
