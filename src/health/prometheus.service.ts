import { Injectable, OnModuleInit } from '@nestjs/common';
import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

/**
 * Prometheus Metrics Service
 * Manages custom business metrics and provides Prometheus-compatible output
 */
@Injectable()
export class PrometheusService implements OnModuleInit {
  // Business metrics
  private readonly ordersProcessedCounter: Counter;
  private readonly orderProcessingDuration: Histogram;
  private readonly orderProcessingErrors: Counter;
  private readonly queueLengthGauge: Gauge;
  private readonly queueProcessingTime: Histogram;
  private readonly httpRequestDuration: Histogram;
  private readonly httpRequestErrors: Counter;

  constructor() {
    // Orders metrics
    this.ordersProcessedCounter = new Counter({
      name: 'orders_processed_total',
      help: 'Total number of orders processed',
      labelNames: ['status'], // success, failed, cancelled
    });

    this.orderProcessingDuration = new Histogram({
      name: 'order_processing_duration_seconds',
      help: 'Order processing duration in seconds',
      labelNames: ['stage'], // validation, payment, inventory, notification
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30], // 100ms to 30s
    });

    this.orderProcessingErrors = new Counter({
      name: 'order_processing_errors_total',
      help: 'Total number of order processing errors',
      labelNames: ['error_type'], // validation, payment, inventory, etc.
    });

    // Queue metrics
    this.queueLengthGauge = new Gauge({
      name: 'queue_length',
      help: 'Current length of processing queues',
      labelNames: ['queue_name'], // order-processing, payment-processing, etc.
    });

    this.queueProcessingTime = new Histogram({
      name: 'queue_job_processing_duration_seconds',
      help: 'Job processing duration in seconds',
      labelNames: ['queue_name', 'job_type'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
    });

    // HTTP metrics
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    });

    this.httpRequestErrors = new Counter({
      name: 'http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'status_code'],
    });
  }

  /**
   * Initialize default metrics collection
   */
  onModuleInit() {
    // Collect default metrics (CPU, memory, etc.)
    collectDefaultMetrics({
      prefix: 'ecommerce_',
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
    });
  }

  /**
   * Get all metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * Increment orders processed counter
   */
  incrementOrdersProcessed(status: 'success' | 'failed' | 'cancelled'): void {
    this.ordersProcessedCounter.inc({ status });
  }

  /**
   * Record order processing duration
   */
  recordOrderProcessingDuration(stage: string, durationSeconds: number): void {
    this.orderProcessingDuration.observe({ stage }, durationSeconds);
  }

  /**
   * Increment order processing errors
   */
  incrementOrderProcessingErrors(errorType: string): void {
    this.orderProcessingErrors.inc({ error_type: errorType });
  }

  /**
   * Update queue length gauge
   */
  setQueueLength(queueName: string, length: number): void {
    this.queueLengthGauge.set({ queue_name: queueName }, length);
  }

  /**
   * Record queue job processing time
   */
  recordQueueJobDuration(queueName: string, jobType: string, durationSeconds: number): void {
    this.queueProcessingTime.observe({ queue_name: queueName, job_type: jobType }, durationSeconds);
  }

  /**
   * Record HTTP request duration
   */
  recordHttpRequestDuration(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number,
  ): void {
    this.httpRequestDuration.observe(
      { method, route, status_code: statusCode.toString() },
      durationSeconds,
    );
  }

  /**
   * Increment HTTP request errors
   */
  incrementHttpRequestErrors(method: string, route: string, statusCode: number): void {
    this.httpRequestErrors.inc({ method, route, status_code: statusCode.toString() });
  }

  /**
   * Reset all metrics (useful for testing)
   */
  resetMetrics(): void {
    register.clear();
  }
}
