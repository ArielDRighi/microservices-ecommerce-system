import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { BaseProcessor } from './base.processor';
import { InventoryManagementJobData, JobResult } from '../../common/interfaces/queue-job.interface';

/**
 * Inventory Management Processor
 * Handles asynchronous inventory operations
 */
@Processor('inventory-management')
export class InventoryProcessor extends BaseProcessor<InventoryManagementJobData> {
  protected readonly logger = new Logger(InventoryProcessor.name);
  protected readonly processorName = 'InventoryProcessor';

  /**
   * Process inventory reservation
   */
  @Process('reserve-inventory')
  async handleReserveInventory(job: Job<InventoryManagementJobData>): Promise<JobResult> {
    return this.handleJob(job);
  }

  /**
   * Process inventory release
   */
  @Process('release-inventory')
  async handleReleaseInventory(job: Job<InventoryManagementJobData>): Promise<JobResult> {
    return this.handleJob(job);
  }

  /**
   * Process inventory confirmation
   */
  @Process('confirm-inventory')
  async handleConfirmInventory(job: Job<InventoryManagementJobData>): Promise<JobResult> {
    return this.handleJob(job);
  }

  /**
   * Process inventory replenishment
   */
  @Process('replenish-inventory')
  async handleReplenishInventory(job: Job<InventoryManagementJobData>): Promise<JobResult> {
    return this.handleJob(job);
  }

  /**
   * Main processing logic for inventory jobs
   */
  protected async processJob(
    data: InventoryManagementJobData,
    job: Job<InventoryManagementJobData>,
  ): Promise<JobResult> {
    this.logger.log(`Processing inventory ${data.action} for product ${data.productId}`, {
      productId: data.productId,
      action: data.action,
      quantity: data.quantity,
      orderId: data.orderId,
      jobId: job.id,
    });

    // Update progress based on action
    await this.updateProgress(job, {
      percentage: 30,
      message: `Validating ${data.action} operation`,
      currentStep: 'validation',
    });

    await this.delay(500);

    await this.updateProgress(job, {
      percentage: 60,
      message: `Executing ${data.action}`,
      currentStep: 'execution',
    });

    // Simulate inventory operation
    await this.delay(1000);

    await this.updateProgress(job, {
      percentage: 90,
      message: 'Updating records',
      currentStep: 'record-update',
    });

    await this.delay(500);

    const result: JobResult = {
      success: true,
      data: {
        productId: data.productId,
        action: data.action,
        quantity: data.quantity,
        status: 'completed',
        processedAt: new Date(),
      },
      processedAt: new Date(),
      duration: 0,
      attemptsMade: job.attemptsMade + 1,
    };

    this.logMetrics(job, result);

    return result;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
