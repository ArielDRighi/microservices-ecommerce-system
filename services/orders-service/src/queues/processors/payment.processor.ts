import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { BaseProcessor } from './base.processor';
import { PaymentProcessingJobData, JobResult } from '../../common/interfaces/queue-job.interface';

/**
 * Payment Processing Processor
 * Handles asynchronous payment processing tasks
 */
@Processor('payment-processing')
export class PaymentProcessingProcessor extends BaseProcessor<PaymentProcessingJobData> {
  protected readonly logger = new Logger(PaymentProcessingProcessor.name);
  protected readonly processorName = 'PaymentProcessingProcessor';

  /**
   * Process payment authorization
   */
  @Process('authorize-payment')
  async handleAuthorizePayment(job: Job<PaymentProcessingJobData>): Promise<JobResult> {
    return this.handleJob(job);
  }

  /**
   * Process payment capture
   */
  @Process('capture-payment')
  async handleCapturePayment(job: Job<PaymentProcessingJobData>): Promise<JobResult> {
    return this.handleJob(job);
  }

  /**
   * Process payment refund
   */
  @Process('refund-payment')
  async handleRefundPayment(job: Job<PaymentProcessingJobData>): Promise<JobResult> {
    return this.handleJob(job);
  }

  /**
   * Main processing logic for payment jobs
   */
  protected async processJob(
    data: PaymentProcessingJobData,
    job: Job<PaymentProcessingJobData>,
  ): Promise<JobResult> {
    this.logger.log(`Processing payment ${data.paymentId} for order ${data.orderId}`, {
      paymentId: data.paymentId,
      orderId: data.orderId,
      amount: data.amount,
      currency: data.currency,
      jobId: job.id,
    });

    // Update progress: 20% - Validating payment method
    await this.updateProgress(job, {
      percentage: 20,
      message: 'Validating payment method',
      currentStep: 'validation',
    });

    await this.delay(800);

    // Update progress: 40% - Contacting payment gateway
    await this.updateProgress(job, {
      percentage: 40,
      message: 'Contacting payment gateway',
      currentStep: 'gateway-communication',
    });

    await this.delay(2000); // Simulate gateway latency

    // Update progress: 70% - Processing transaction
    await this.updateProgress(job, {
      percentage: 70,
      message: 'Processing transaction',
      currentStep: 'transaction-processing',
    });

    await this.delay(1500);

    // Update progress: 90% - Verifying result
    await this.updateProgress(job, {
      percentage: 90,
      message: 'Verifying result',
      currentStep: 'verification',
    });

    await this.delay(500);

    const result: JobResult = {
      success: true,
      data: {
        paymentId: data.paymentId,
        orderId: data.orderId,
        status: 'processed',
        transactionId: `txn_${Date.now()}`,
        processedAt: new Date(),
      },
      processedAt: new Date(),
      duration: 0,
      attemptsMade: job.attemptsMade + 1,
    };

    this.logMetrics(job, result);

    return result;
  }

  /**
   * Customize retryable errors for payment processing
   */
  protected override isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      // Add payment-specific retryable errors
      const paymentRetryableErrors = [
        'GATEWAY_TIMEOUT',
        'INSUFFICIENT_FUNDS_TEMP',
        'CARD_ISSUER_UNAVAILABLE',
      ];

      if (paymentRetryableErrors.some((err) => error.message.includes(err))) {
        return true;
      }
    }

    return super.isRetryableError(error);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
