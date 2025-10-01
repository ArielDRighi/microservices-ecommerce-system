import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OutboxEvent } from '../entities/outbox-event.entity';
import { OutboxProcessor as IOutboxProcessor } from '../interfaces/event.interface';

/**
 * Configuration for outbox processor
 */
export interface OutboxProcessorConfig {
  /** Batch size for processing events */
  batchSize?: number;
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Retry delay in milliseconds (exponential backoff base) */
  retryDelay?: number;
  /** Whether to enable automatic processing */
  enabled?: boolean;
  /** Processing interval in milliseconds (only used if cron is disabled) */
  processingInterval?: number;
}

/**
 * Service responsible for processing events from the outbox table
 * Implements polling pattern with exponential backoff retry
 */
@Injectable()
export class OutboxProcessor implements IOutboxProcessor, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxProcessor.name);
  private processingInterval?: NodeJS.Timeout;
  private isProcessing = false;
  private readonly config: Required<OutboxProcessorConfig>;

  constructor(
    @InjectRepository(OutboxEvent)
    private readonly outboxRepository: Repository<OutboxEvent>,
    @InjectQueue('order-processing')
    private readonly orderQueue: Queue,
    @InjectQueue('inventory-processing')
    private readonly inventoryQueue: Queue,
    @InjectQueue('payment-processing')
    private readonly paymentQueue: Queue,
  ) {
    // Set default configuration
    this.config = {
      batchSize: 50,
      maxRetries: 5,
      retryDelay: 1000,
      enabled: true,
      processingInterval: 5000,
    };
  }

  /**
   * Initialize the processor on module startup
   */
  async onModuleInit(): Promise<void> {
    if (this.config.enabled) {
      await this.start();
      this.logger.log('OutboxProcessor initialized and started');
    } else {
      this.logger.log('OutboxProcessor initialized but disabled');
    }
  }

  /**
   * Cleanup on module destruction
   */
  async onModuleDestroy(): Promise<void> {
    await this.stop();
    this.logger.log('OutboxProcessor stopped');
  }

  /**
   * Start the outbox processor
   */
  async start(): Promise<void> {
    if (this.processingInterval) {
      this.logger.warn('OutboxProcessor is already running');
      return;
    }

    this.logger.log('Starting OutboxProcessor...');

    // Process immediately on start
    await this.processPendingEvents();

    // Note: Cron job (@Cron decorator) handles periodic processing
    // No need for setInterval to avoid duplicate processing
  } /**
   * Stop the outbox processor
   */
  async stop(): Promise<void> {
    this.logger.log('Stopping OutboxProcessor...');

    // Wait for current processing to complete
    while (this.isProcessing) {
      await this.sleep(100);
    }

    this.logger.log('OutboxProcessor stopped');
  }

  /**
   * Process pending events from the outbox
   * This method is called by cron schedule and by interval
   */
  @Cron(CronExpression.EVERY_5_SECONDS)
  async processPendingEvents(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    if (this.isProcessing) {
      this.logger.debug('Processing already in progress, skipping...');
      return;
    }

    this.isProcessing = true;

    try {
      const pendingEvents = await this.fetchPendingEvents();

      if (pendingEvents.length === 0) {
        this.logger.debug('No pending events to process');
        return;
      }

      this.logger.log(`Processing ${pendingEvents.length} pending events`);

      for (const event of pendingEvents) {
        await this.processEvent(event);
      }

      this.logger.log(`Finished processing ${pendingEvents.length} events`);
    } catch (error) {
      this.logger.error(
        'Error processing pending events',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Fetch pending events from the outbox table
   */
  private async fetchPendingEvents(): Promise<OutboxEvent[]> {
    return this.outboxRepository.find({
      where: [
        // Unprocessed events
        { processed: false, processedAt: IsNull() },
        // Failed events that should be retried (exponential backoff)
        {
          processed: false,
          processedAt: LessThan(new Date(Date.now() - this.config.retryDelay)),
        },
      ],
      order: {
        createdAt: 'ASC',
        sequenceNumber: 'ASC',
      },
      take: this.config.batchSize,
    });
  }

  /**
   * Process a single event
   * @param event - Outbox event to process
   */
  private async processEvent(event: OutboxEvent): Promise<void> {
    try {
      this.logger.debug(`Processing event: ${event.eventType} [${event.id}]`);

      // Skip Order events as they are enqueued directly by OrdersService
      // to avoid duplicate processing
      if (event.aggregateType === 'Order') {
        this.logger.debug(
          `Skipping Order event ${event.eventType} [${event.id}] - already enqueued directly`,
        );
        await this.markAsProcessed(event, true);
        return;
      }

      // Determine the appropriate queue based on aggregate type
      const queue = this.getQueueForEvent(event);

      if (!queue) {
        this.logger.error(`No queue found for aggregate type: ${event.aggregateType}`);
        await this.markAsProcessed(event, false);
        return;
      }

      // Publish event to the queue
      // Map event type to job type (e.g., OrderCreated -> create-order)
      const jobType = this.getJobTypeForEvent(event);

      // Prepare job data based on aggregate type
      const jobData = this.prepareJobData(event);

      await queue.add(jobType, jobData, {
        attempts: this.config.maxRetries,
        backoff: {
          type: 'exponential',
          delay: this.config.retryDelay,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });

      // Mark event as processed
      await this.markAsProcessed(event, true);

      this.logger.log(`Successfully published event to queue: ${event.eventType} [${event.id}]`);
    } catch (error) {
      this.logger.error(
        `Failed to process event: ${event.eventType} [${event.id}]`,
        error instanceof Error ? error.stack : String(error),
      );

      // Event remains with processed: false and processedAt: null for retry
      // Will be picked up in next polling cycle
    }
  }

  /**
   * Get the appropriate Bull queue for an event based on aggregate type
   */
  private getQueueForEvent(event: OutboxEvent): Queue | null {
    switch (event.aggregateType) {
      case 'Order':
        return this.orderQueue;
      case 'Inventory':
        return this.inventoryQueue;
      case 'Payment':
        return this.paymentQueue;
      default:
        return null;
    }
  }

  /**
   * Map event type to job type for queue processing
   */
  private getJobTypeForEvent(event: OutboxEvent): string {
    // Map domain events to processor job types
    const eventToJobTypeMap: Record<string, string> = {
      // Order events
      OrderCreated: 'create-order',
      OrderConfirmed: 'confirm-order',
      OrderCancelled: 'cancel-order',
      // Inventory events (add as needed)
      InventoryReserved: 'reserve-inventory',
      InventoryReleased: 'release-inventory',
      // Payment events (add as needed)
      PaymentProcessed: 'process-payment',
      PaymentRefunded: 'refund-payment',
    };

    return eventToJobTypeMap[event.eventType] || event.eventType.toLowerCase();
  }

  /**
   * Prepare job data from outbox event
   * Transforms event data into the format expected by job processors
   */
  private prepareJobData(event: OutboxEvent): unknown {
    const eventData = event.eventData as Record<string, unknown>;

    switch (event.aggregateType) {
      case 'Order':
        return {
          orderId: eventData['orderId'] || event.aggregateId,
          userId: eventData['userId'],
          items: eventData['items'] || [],
          totalAmount: eventData['totalAmount'],
          currency: eventData['currency'] || 'USD',
          idempotencyKey: eventData['idempotencyKey'],
          jobId: event.id,
          createdAt: event.createdAt,
          correlationId: event.correlationId,
          metadata: {
            eventId: event.id,
            eventType: event.eventType,
            eventMetadata: event.eventMetadata,
          },
        };

      case 'Inventory':
        return {
          action: eventData['action'],
          productId: eventData['productId'],
          quantity: eventData['quantity'],
          orderId: eventData['orderId'],
          reservationId: eventData['reservationId'],
          reason: eventData['reason'],
          jobId: event.id,
          createdAt: event.createdAt,
          correlationId: event.correlationId,
          userId: event.userId,
        };

      case 'Payment':
        return {
          orderId: eventData['orderId'],
          paymentId: eventData['paymentId'],
          amount: eventData['amount'],
          currency: eventData['currency'] || 'USD',
          paymentMethod: eventData['paymentMethod'],
          customerId: eventData['customerId'] || eventData['userId'],
          jobId: event.id,
          createdAt: event.createdAt,
          correlationId: event.correlationId,
          userId: event.userId,
        };

      default:
        // Generic fallback
        return {
          ...eventData,
          jobId: event.id,
          createdAt: event.createdAt,
          correlationId: event.correlationId,
          userId: event.userId,
          metadata: {
            eventId: event.id,
            aggregateType: event.aggregateType,
            aggregateId: event.aggregateId,
            eventType: event.eventType,
            eventMetadata: event.eventMetadata,
          },
        };
    }
  }

  /**
   * Mark an event as processed
   */
  private async markAsProcessed(event: OutboxEvent, success: boolean): Promise<void> {
    event.processed = success;
    event.processedAt = success ? new Date() : undefined;
    await this.outboxRepository.save(event);
  }

  /**
   * Utility method to sleep for a given duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get processing statistics
   */
  async getStatistics(): Promise<{
    totalEvents: number;
    processedEvents: number;
    pendingEvents: number;
    oldestPendingEvent?: Date;
  }> {
    const [totalEvents, processedEvents, pendingEvents, oldestPending] = await Promise.all([
      this.outboxRepository.count(),
      this.outboxRepository.count({ where: { processed: true } }),
      this.outboxRepository.count({ where: { processed: false } }),
      this.outboxRepository.findOne({
        where: { processed: false },
        order: { createdAt: 'ASC' },
      }),
    ]);

    return {
      totalEvents,
      processedEvents,
      pendingEvents,
      oldestPendingEvent: oldestPending?.createdAt,
    };
  }
}
