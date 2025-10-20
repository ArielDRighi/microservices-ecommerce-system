import { Injectable } from '@nestjs/common';
import { Counter, Histogram, register } from 'prom-client';

/**
 * RabbitMQ Consumer Metrics Service
 * Provides Prometheus metrics for RabbitMQ event consumption
 */
@Injectable()
export class RabbitMQMetricsService {
  // Counter for total events consumed
  public readonly eventsConsumedTotal: Counter<string>;

  // Histogram for event processing duration
  public readonly processingDuration: Histogram<string>;

  // Counter for events sent to DLQ
  public readonly dlqTotal: Counter<string>;

  // Counter for idempotent event skips
  public readonly idempotentSkipsTotal: Counter<string>;

  // Counter for processing errors
  public readonly processingErrorsTotal: Counter<string>;

  // Counter for handler executions
  public readonly handlerExecutionsTotal: Counter<string>;

  constructor() {
    // Initialize metrics
    this.eventsConsumedTotal = new Counter({
      name: 'orders_events_consumed_total',
      help: 'Total number of events consumed from RabbitMQ',
      labelNames: ['event_type', 'routing_key', 'status'],
      registers: [register],
    });

    this.processingDuration = new Histogram({
      name: 'orders_events_processing_duration_seconds',
      help: 'Duration of event processing in seconds',
      labelNames: ['event_type', 'routing_key'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2.5, 5, 10], // 1ms to 10s
      registers: [register],
    });

    this.dlqTotal = new Counter({
      name: 'orders_events_dlq_total',
      help: 'Total number of events sent to Dead Letter Queue',
      labelNames: ['event_type', 'routing_key', 'reason'],
      registers: [register],
    });

    this.idempotentSkipsTotal = new Counter({
      name: 'orders_events_idempotent_skips_total',
      help: 'Total number of duplicate events skipped due to idempotency',
      labelNames: ['event_type', 'routing_key'],
      registers: [register],
    });

    this.processingErrorsTotal = new Counter({
      name: 'orders_events_processing_errors_total',
      help: 'Total number of errors during event processing',
      labelNames: ['event_type', 'routing_key', 'error_type'],
      registers: [register],
    });

    this.handlerExecutionsTotal = new Counter({
      name: 'orders_events_handler_executions_total',
      help: 'Total number of event handler executions',
      labelNames: ['event_type', 'handler_name', 'status'],
      registers: [register],
    });
  }

  /**
   * Record event consumption
   */
  recordEventConsumed(eventType: string, routingKey: string, status: 'success' | 'failed'): void {
    this.eventsConsumedTotal.inc({ event_type: eventType, routing_key: routingKey, status });
  }

  /**
   * Record event processing duration
   */
  recordProcessingDuration(eventType: string, routingKey: string, durationSeconds: number): void {
    this.processingDuration.observe(
      { event_type: eventType, routing_key: routingKey },
      durationSeconds,
    );
  }

  /**
   * Record event sent to DLQ
   */
  recordDLQ(eventType: string, routingKey: string, reason: string): void {
    this.dlqTotal.inc({ event_type: eventType, routing_key: routingKey, reason });
  }

  /**
   * Record idempotent skip
   */
  recordIdempotentSkip(eventType: string, routingKey: string): void {
    this.idempotentSkipsTotal.inc({ event_type: eventType, routing_key: routingKey });
  }

  /**
   * Record processing error
   */
  recordProcessingError(eventType: string, routingKey: string, errorType: string): void {
    this.processingErrorsTotal.inc({
      event_type: eventType,
      routing_key: routingKey,
      error_type: errorType,
    });
  }

  /**
   * Record handler execution
   */
  recordHandlerExecution(
    eventType: string,
    handlerName: string,
    status: 'success' | 'failed',
  ): void {
    this.handlerExecutionsTotal.inc({ event_type: eventType, handler_name: handlerName, status });
  }
}
