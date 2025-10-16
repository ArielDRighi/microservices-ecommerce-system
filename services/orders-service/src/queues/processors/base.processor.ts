import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { BaseJobData, JobResult, JobProgress } from '../../common/interfaces/queue-job.interface';

/**
 * Base Processor Class
 * Provides common functionality for all queue processors
 * Includes logging, error handling, and metrics
 */
@Injectable()
export abstract class BaseProcessor<T extends BaseJobData = BaseJobData> {
  protected abstract readonly logger: Logger;
  protected abstract readonly processorName: string;

  /**
   * Main processing method to be implemented by each processor
   */
  protected abstract processJob(data: T, job: Job<T>): Promise<JobResult>;

  /**
   * Handle job processing with error handling and logging
   */
  async handleJob(job: Job<T>): Promise<JobResult> {
    const startTime = Date.now();

    this.logger.log(`Starting job ${job.id} in ${this.processorName}`, {
      jobId: job.id,
      jobName: job.name,
      attempt: job.attemptsMade + 1,
      maxAttempts: job.opts.attempts,
      data: job.data,
    });

    try {
      // Update progress to 0%
      await this.updateProgress(job, {
        percentage: 0,
        message: 'Job started',
      });

      // Process the job
      const result = await this.processJob(job.data, job);

      // Calculate duration
      const duration = Date.now() - startTime;

      this.logger.log(`Job ${job.id} completed successfully in ${duration}ms`, {
        jobId: job.id,
        duration,
        attemptsMade: job.attemptsMade + 1,
        result,
      });

      // Update progress to 100%
      await this.updateProgress(job, {
        percentage: 100,
        message: 'Job completed',
      });

      return {
        success: true,
        data: result.data,
        processedAt: new Date(),
        duration,
        attemptsMade: job.attemptsMade + 1,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error(`Job ${job.id} failed after ${duration}ms`, {
        jobId: job.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        attemptsMade: job.attemptsMade + 1,
        maxAttempts: job.opts.attempts,
        duration,
        data: job.data,
      });

      // Determine if this is a retryable error
      const isRetryable = this.isRetryableError(error);

      if (!isRetryable || job.attemptsMade + 1 >= (job.opts.attempts || 3)) {
        // Move to dead letter queue if max attempts reached or non-retryable
        await this.handleDeadLetter(job, error);
      }

      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: (error as { code?: string }).code,
          details: error,
        },
        processedAt: new Date(),
        duration,
        attemptsMade: job.attemptsMade + 1,
      };
    }
  }

  /**
   * Update job progress
   */
  protected async updateProgress(job: Job<T>, progress: JobProgress): Promise<void> {
    try {
      await job.progress(progress);

      this.logger.debug(`Job ${job.id} progress updated: ${progress.percentage}%`, {
        jobId: job.id,
        progress,
      });
    } catch (error) {
      this.logger.warn(`Failed to update progress for job ${job.id}`, {
        jobId: job.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Determine if an error is retryable
   * Override this method to customize retry logic
   */
  protected isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      // Network errors, timeouts, etc. are usually retryable
      const retryableErrors = [
        'ECONNRESET',
        'ETIMEDOUT',
        'ECONNREFUSED',
        'EHOSTUNREACH',
        'NetworkError',
        'TimeoutError',
      ];

      return retryableErrors.some(
        (retryableError) =>
          error.message.includes(retryableError) ||
          (error as { code?: string }).code === retryableError,
      );
    }

    return false;
  }

  /**
   * Handle failed jobs that exceed retry attempts
   * Move to dead letter queue for manual intervention
   */
  protected async handleDeadLetter(job: Job<T>, error: unknown): Promise<void> {
    this.logger.error(`Job ${job.id} moved to dead letter queue`, {
      jobId: job.id,
      jobName: job.name,
      attemptsMade: job.attemptsMade + 1,
      maxAttempts: job.opts.attempts,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      data: job.data,
    });

    // Here you would typically save to a dead letter queue
    // For now, we'll just log the information
    // In a production system, you might want to:
    // 1. Save to a separate database table
    // 2. Send alerts to monitoring system
    // 3. Create a ticket in issue tracking system
  }

  /**
   * Graceful shutdown handler
   * Override this to implement custom cleanup logic
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log(`${this.processorName} shutting down gracefully`);
    // Wait for active jobs to complete
    await this.waitForActiveJobs();
  }

  /**
   * Wait for active jobs to complete before shutdown
   */
  private async waitForActiveJobs(): Promise<void> {
    // Implementation would depend on your specific requirements
    // For now, we'll add a small delay to allow jobs to finish
    return new Promise((resolve) => {
      setTimeout(() => {
        this.logger.log(`${this.processorName} shutdown complete`);
        resolve();
      }, 5000); // Wait 5 seconds for jobs to complete
    });
  }

  /**
   * Log job metrics for monitoring
   */
  protected logMetrics(job: Job<T>, result: JobResult): void {
    // In a production system, you would send these metrics to
    // a monitoring service like Prometheus, DataDog, etc.
    this.logger.debug(`Job metrics for ${job.id}`, {
      jobId: job.id,
      jobName: job.name,
      processorName: this.processorName,
      success: result.success,
      duration: result.duration,
      attemptsMade: result.attemptsMade,
      timestamp: result.processedAt,
    });
  }
}
