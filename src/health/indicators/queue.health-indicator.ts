import { Injectable, Inject } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { Queue } from 'bull';

/**
 * Queue health threshold configuration
 */
export interface QueueHealthThreshold {
  maxWaiting?: number;
  maxFailed?: number;
  maxFailureRate?: number;
}

/**
 * Custom Queue Health Indicator
 * Checks Bull queue status, job counts, and processing health
 */
@Injectable()
export class QueueHealthIndicator extends HealthIndicator {
  private readonly queues: Map<string, Queue> = new Map();

  constructor(
    @Inject('BullQueue_order-processing')
    private readonly orderQueue: Queue,

    @Inject('BullQueue_payment-processing')
    private readonly paymentQueue: Queue,
  ) {
    super();

    // Register queues for monitoring
    this.queues.set('order-processing', this.orderQueue);
    this.queues.set('payment-processing', this.paymentQueue);
  }

  /**
   * Check if all queues are healthy
   * @param key - The key for the health check result
   * @returns Health indicator result
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const queueStatuses: Record<string, unknown> = {};
      let hasUnhealthyQueue = false;
      const errors: string[] = [];

      for (const [queueName, queue] of this.queues) {
        try {
          const status = await this.checkQueue(queueName, queue);
          queueStatuses[queueName] = status[queueName];

          // Check for unhealthy conditions
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const jobCounts = status[queueName].jobCounts as any;
          if (jobCounts.waiting > 100) {
            hasUnhealthyQueue = true;
            errors.push(`${queueName}: waiting jobs (${jobCounts.waiting}) exceeds threshold`);
          }

          // Check failure rate
          const total = jobCounts.completed + jobCounts.failed;
          if (total > 0) {
            const failureRate = jobCounts.failed / total;
            if (failureRate > 0.1) {
              // 10% failure rate threshold
              hasUnhealthyQueue = true;
              errors.push(
                `${queueName}: failure rate (${(failureRate * 100).toFixed(2)}%) too high`,
              );
            }
          }

          // Check if paused
          const isPaused = await queue.isPaused();
          if (isPaused) {
            hasUnhealthyQueue = true;
            errors.push(`${queueName}: queue is paused`);
          }
        } catch (error) {
          hasUnhealthyQueue = true;
          errors.push(`${queueName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (hasUnhealthyQueue) {
        throw new Error(`Queue health check failed: ${errors.join('; ')}`);
      }

      return this.getStatus(key, true, {
        status: 'up',
        ...queueStatuses,
      });
    } catch (error) {
      throw new HealthCheckError(
        `Queue health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.getStatus(key, false, {
          status: 'down',
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  /**
   * Check health of a specific queue
   * @param queueName - Name of the queue
   * @param queue - Queue instance
   * @returns Health status for the queue
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async checkQueue(queueName: string, queue: Queue): Promise<Record<string, any>> {
    try {
      const jobCounts = await queue.getJobCounts();
      const isPaused = await queue.isPaused();

      return {
        [queueName]: {
          status: 'up',
          waiting: jobCounts.waiting,
          active: jobCounts.active,
          failed: jobCounts.failed,
          completed: jobCounts.completed,
          isPaused,
          jobCounts,
        },
      };
    } catch (error) {
      return {
        [queueName]: {
          status: 'down',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Check queue health with custom thresholds
   * @param key - The key for the health check result
   * @param threshold - Custom threshold configuration
   * @returns Health indicator result
   */
  async checkWithThreshold(
    key: string,
    threshold: QueueHealthThreshold,
  ): Promise<HealthIndicatorResult> {
    try {
      const queueStatuses: Record<string, unknown> = {};
      const errors: string[] = [];

      for (const [queueName, queue] of this.queues) {
        const status = await this.checkQueue(queueName, queue);
        queueStatuses[queueName] = status[queueName];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const jobCounts = status[queueName].jobCounts as any;

        // Check waiting threshold
        if (threshold.maxWaiting && jobCounts.waiting > threshold.maxWaiting) {
          errors.push(
            `${queueName}: waiting jobs (${jobCounts.waiting}) exceeds threshold (${threshold.maxWaiting})`,
          );
        }

        // Check failed threshold
        if (threshold.maxFailed && jobCounts.failed > threshold.maxFailed) {
          errors.push(
            `${queueName}: failed jobs (${jobCounts.failed}) exceeds threshold (${threshold.maxFailed})`,
          );
        }

        // Check failure rate
        if (threshold.maxFailureRate) {
          const total = jobCounts.completed + jobCounts.failed;
          if (total > 0) {
            const failureRate = jobCounts.failed / total;
            if (failureRate > threshold.maxFailureRate) {
              errors.push(
                `${queueName}: failure rate (${(failureRate * 100).toFixed(2)}%) exceeds threshold (${(threshold.maxFailureRate * 100).toFixed(2)}%)`,
              );
            }
          }
        }
      }

      if (errors.length > 0) {
        throw new Error(errors.join('; '));
      }

      return this.getStatus(key, true, {
        status: 'up',
        ...queueStatuses,
      });
    } catch (error) {
      throw new HealthCheckError(
        `Queue threshold check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.getStatus(key, false, {
          status: 'down',
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }
}
