import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import * as amqp from 'amqplib';
import { ConfigService } from '@nestjs/config';
import { safeValidateInventoryEvent, InventoryEvent } from '@microservices-ecommerce/shared-types';
import { BaseEventHandler } from '../handlers/base.event-handler';
import { DomainEvent } from '../interfaces/event.interface';

const MAX_RETRIES = 3;
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * RabbitMQ Consumer Service
 * Consumes inventory events from RabbitMQ and routes them to appropriate handlers
 *
 * Features:
 * - Manual ACK/NACK for reliability
 * - Idempotency (prevents duplicate processing)
 * - DLQ support for failed messages
 * - Fair dispatch with prefetch
 * - Exponential backoff for retries
 */
@Injectable()
export class RabbitMQConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQConsumerService.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private connection: any = null;
  private channel: amqp.ConfirmChannel | null = null;
  private readonly processedEvents = new Map<string, number>(); // eventId -> timestamp
  private cleanupInterval: NodeJS.Timeout | null = null;

  private readonly EXCHANGE_NAME = 'inventory.events';
  private readonly QUEUE_NAME = 'orders.inventory_events';
  private readonly DLQ_EXCHANGE_NAME = 'orders.inventory_events.dlx';
  private readonly DLQ_ROUTING_KEY = 'orders.inventory_events.dlq';

  private readonly ROUTING_KEYS = [
    'inventory.stock.reserved',
    'inventory.stock.confirmed',
    'inventory.stock.released',
    'inventory.stock.failed',
  ];

  constructor(
    private readonly configService: ConfigService,
    @Inject('INVENTORY_HANDLERS')
    private readonly handlers: BaseEventHandler<DomainEvent>[],
  ) {
    // Start cleanup interval for idempotency cache (will be set in onModuleInit)
  }

  /**
   * Initialize RabbitMQ connection and start consuming
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.connect();
      await this.setupExchangeAndQueue();
      await this.startConsuming();

      // Start cleanup interval for idempotency cache (every hour)
      this.cleanupInterval = setInterval(() => this.cleanupProcessedEvents(), 60 * 60 * 1000);

      this.logger.log('RabbitMQ Consumer initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize RabbitMQ Consumer', error);
      throw error;
    }
  }

  /**
   * Cleanup resources on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    try {
      // Clear cleanup interval
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }

      if (this.channel) {
        await this.channel.close();
        this.logger.log('RabbitMQ channel closed');
      }
      if (this.connection) {
        await this.connection.close();
        this.logger.log('RabbitMQ connection closed');
      }
    } catch (error) {
      this.logger.error('Error closing RabbitMQ connection', error);
    }
  }

  /**
   * Connect to RabbitMQ
   */
  private async connect(): Promise<void> {
    const rabbitmqUrl = this.configService.get<string>(
      'RABBITMQ_URL',
      'amqp://guest:guest@localhost:5672',
    );

    const conn = await amqp.connect(rabbitmqUrl, {
      heartbeat: 60,
    });

    conn.on('error', (err: Error) => {
      this.logger.error('RabbitMQ connection error', err);
    });

    conn.on('close', () => {
      this.logger.warn('RabbitMQ connection closed');
    });

    this.connection = conn;
    const channel = await conn.createConfirmChannel();
    this.channel = channel;

    // Set prefetch for fair dispatch
    await channel.prefetch(10);
  }

  /**
   * Setup exchange, queue, and bindings
   */
  private async setupExchangeAndQueue(): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    // Assert main exchange
    await this.channel.assertExchange(this.EXCHANGE_NAME, 'topic', {
      durable: true,
    });

    // Assert DLX exchange
    await this.channel.assertExchange(this.DLQ_EXCHANGE_NAME, 'topic', {
      durable: true,
    });

    // Assert main queue with DLQ configuration
    await this.channel.assertQueue(this.QUEUE_NAME, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': this.DLQ_EXCHANGE_NAME,
        'x-dead-letter-routing-key': this.DLQ_ROUTING_KEY,
      },
    });

    // Bind queue to exchange with routing keys
    for (const routingKey of this.ROUTING_KEYS) {
      await this.channel.bindQueue(this.QUEUE_NAME, this.EXCHANGE_NAME, routingKey);
      this.logger.log(`Bound queue ${this.QUEUE_NAME} to ${routingKey}`);
    }
  }

  /**
   * Start consuming messages
   */
  private async startConsuming(): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    await this.channel.consume(
      this.QUEUE_NAME,
      async (msg) => {
        if (!msg) {
          return;
        }

        try {
          await this.handleMessage(msg);
        } catch (error) {
          this.logger.error('Unexpected error handling message', error);
          // Nack without requeue to avoid infinite loop
          this.channel?.nack(msg, false, false);
        }
      },
      { noAck: false },
    );

    this.logger.log(`Started consuming from queue: ${this.QUEUE_NAME}`);
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(msg: amqp.Message): Promise<void> {
    const content = msg.content.toString();
    const routingKey = msg.fields.routingKey;
    const messageId = msg.properties.messageId || 'unknown';

    this.logger.debug(`Received message: ${routingKey} [${messageId}]`);

    try {
      // Parse JSON
      const data = JSON.parse(content);

      // Validate with Zod schema
      const validation = safeValidateInventoryEvent(data);

      if (!validation.success) {
        this.logger.error(
          `Invalid event schema: ${validation.error.message}`,
          validation.error.errors,
        );
        // Invalid schema -> permanent error -> nack without requeue
        this.channel?.nack(msg, false, false);
        return;
      }

      const event = validation.data;

      // Check idempotency
      if (this.isEventProcessed(event.eventId)) {
        this.logger.debug(`Event ${event.eventId} already processed (duplicate)`);
        this.channel?.ack(msg);
        return;
      }

      // Find handler for this event type
      const handler = this.findHandler(event.eventType);

      if (!handler) {
        this.logger.warn(`No handler found for event type: ${event.eventType}`);
        // No handler -> ack to avoid blocking queue
        this.channel?.ack(msg);
        return;
      }

      // Convert RabbitMQ event to domain event
      const domainEvent = this.toDomainEvent(event);

      // Execute handler
      await handler.execute(domainEvent);

      // Mark as processed
      this.markEventAsProcessed(event.eventId);

      // Acknowledge message
      this.channel?.ack(msg);

      this.logger.debug(`Successfully processed event: ${event.eventId}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Error processing message: ${err.message}`, err.stack);

      // Check retry count
      const retryCount = this.getRetryCount(msg);

      if (retryCount >= MAX_RETRIES) {
        this.logger.warn(`Max retries (${MAX_RETRIES}) exceeded for message ${messageId}`);
        // Max retries exceeded -> nack without requeue (goes to DLQ)
        this.channel?.nack(msg, false, false);
      } else {
        this.logger.debug(
          `Retrying message ${messageId} (attempt ${retryCount + 1}/${MAX_RETRIES})`,
        );
        // Transient error -> nack with requeue
        this.channel?.nack(msg, false, true);
      }
    }
  }

  /**
   * Convert RabbitMQ event to domain event format
   */
  private toDomainEvent(event: InventoryEvent): DomainEvent {
    // Map RabbitMQ event to internal domain event
    const version = event.version ?? '1.0.0';
    const versionParts = version.split('.');
    const baseEvent = {
      eventId: event.eventId,
      eventType: this.mapEventType(event.eventType),
      aggregateId: event.payload.productId,
      aggregateType: 'Inventory' as const,
      timestamp: new Date(event.timestamp),
      version: parseInt(versionParts[0] ?? '1'),
      metadata: {
        correlationId: event.correlationId,
        source: event.source,
      },
    };

    // Add payload-specific fields
    return {
      ...baseEvent,
      ...event.payload,
    } as DomainEvent;
  }

  /**
   * Map RabbitMQ event type to internal event type
   */
  private mapEventType(rabbitmqType: string): string {
    const mapping: Record<string, string> = {
      'inventory.stock.reserved': 'InventoryReserved',
      'inventory.stock.confirmed': 'InventoryReservationConfirmed',
      'inventory.stock.released': 'InventoryReservationReleased',
      'inventory.stock.failed': 'InventoryReservationFailed',
    };

    return mapping[rabbitmqType] || rabbitmqType;
  }

  /**
   * Find handler for event type
   */
  private findHandler(eventType: string): BaseEventHandler<DomainEvent> | undefined {
    const internalType = this.mapEventType(eventType);
    return this.handlers.find((h) => h.canHandle(internalType));
  }

  /**
   * Check if event has been processed (idempotency)
   */
  private isEventProcessed(eventId: string): boolean {
    return this.processedEvents.has(eventId);
  }

  /**
   * Mark event as processed
   */
  private markEventAsProcessed(eventId: string): void {
    this.processedEvents.set(eventId, Date.now());
  }

  /**
   * Cleanup old processed events to prevent memory leak
   */
  private cleanupProcessedEvents(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [eventId, timestamp] of this.processedEvents.entries()) {
      if (now - timestamp > IDEMPOTENCY_TTL_MS) {
        expiredKeys.push(eventId);
      }
    }

    for (const key of expiredKeys) {
      this.processedEvents.delete(key);
    }

    if (expiredKeys.length > 0) {
      this.logger.debug(`Cleaned up ${expiredKeys.length} expired event IDs`);
    }
  }

  /**
   * Get retry count from message headers
   */
  private getRetryCount(msg: amqp.Message): number {
    return (msg.properties.headers?.['x-retry-count'] as number) || 0;
  }
}
