import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { BaseProcessor } from './base.processor';
import { OrderProcessingJobData, JobResult } from '../../common/interfaces/queue-job.interface';

/**
 * Order Processing Processor
 * Handles asynchronous order processing tasks
 */
@Processor('order-processing')
export class OrderProcessingProcessor extends BaseProcessor<OrderProcessingJobData> {
  protected readonly logger = new Logger(OrderProcessingProcessor.name);
  protected readonly processorName = 'OrderProcessingProcessor';

  /**
   * Process order creation
   */
  @Process('create-order')
  async handleCreateOrder(job: Job<OrderProcessingJobData>): Promise<JobResult> {
    return this.handleJob(job);
  }

  /**
   * Process order confirmation
   */
  @Process('confirm-order')
  async handleConfirmOrder(job: Job<OrderProcessingJobData>): Promise<JobResult> {
    return this.handleJob(job);
  }

  /**
   * Process order cancellation
   */
  @Process('cancel-order')
  async handleCancelOrder(job: Job<OrderProcessingJobData>): Promise<JobResult> {
    return this.handleJob(job);
  }

  /**
   * Main processing logic for order jobs
   */
  protected async processJob(
    data: OrderProcessingJobData,
    job: Job<OrderProcessingJobData>,
  ): Promise<JobResult> {
    this.logger.log(`Processing order ${data.orderId}`, {
      orderId: data.orderId,
      jobId: job.id,
      jobName: job.name,
    });

    // Update progress: 25% - Validating order
    await this.updateProgress(job, {
      percentage: 25,
      message: 'Validating order',
      currentStep: 'validation',
    });

    // Simulate order validation
    await this.delay(1000);

    // Update progress: 50% - Processing items
    await this.updateProgress(job, {
      percentage: 50,
      message: 'Processing items',
      currentStep: 'items-processing',
      data: { itemCount: data.items.length },
    });

    // Simulate items processing
    await this.delay(1500);

    // Update progress: 75% - Finalizing
    await this.updateProgress(job, {
      percentage: 75,
      message: 'Finalizing order',
      currentStep: 'finalization',
    });

    // Simulate finalization
    await this.delay(1000);

    const result: JobResult = {
      success: true,
      data: {
        orderId: data.orderId,
        status: 'processed',
        processedAt: new Date(),
      },
      processedAt: new Date(),
      duration: 0, // Will be calculated by base processor
      attemptsMade: job.attemptsMade + 1,
    };

    // Log metrics
    this.logMetrics(job, result);

    return result;
  }

  /**
   * Utility method to simulate async operations
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
