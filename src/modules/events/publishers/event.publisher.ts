import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OutboxEvent } from '../entities/outbox-event.entity';
import {
  DomainEvent,
  EventPublisher as IEventPublisher,
  EventMetadata,
} from '../interfaces/event.interface';

/**
 * Service responsible for publishing domain events to the outbox table
 * Implements the Outbox Pattern for reliable event publishing
 */
@Injectable()
export class EventPublisher implements IEventPublisher {
  private readonly logger = new Logger(EventPublisher.name);

  constructor(
    @InjectRepository(OutboxEvent)
    private readonly outboxRepository: Repository<OutboxEvent>,
  ) {}

  /**
   * Publish a single domain event to the outbox
   * @param event - Domain event to publish
   * @param metadata - Optional metadata (IP, user agent, etc.)
   * @param entityManager - Optional transaction manager for transactional publishing
   */
  async publish(
    event: DomainEvent,
    metadata?: EventMetadata,
    entityManager?: EntityManager,
  ): Promise<void> {
    const repository = entityManager
      ? entityManager.getRepository(OutboxEvent)
      : this.outboxRepository;

    const outboxEvent = this.createOutboxEvent(event, metadata);

    try {
      await repository.save(outboxEvent);
      this.logger.log(`Event published to outbox: ${event.eventType} [${event.eventId}]`);
    } catch (error) {
      this.logger.error(
        `Failed to publish event to outbox: ${event.eventType} [${event.eventId}]`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * Publish multiple domain events to the outbox in a single transaction
   * @param events - Array of domain events to publish
   * @param metadata - Optional metadata (IP, user agent, etc.)
   * @param entityManager - Optional transaction manager for transactional publishing
   */
  async publishBatch(
    events: DomainEvent[],
    metadata?: EventMetadata,
    entityManager?: EntityManager,
  ): Promise<void> {
    if (events.length === 0) {
      this.logger.warn('publishBatch called with empty events array');
      return;
    }

    const repository = entityManager
      ? entityManager.getRepository(OutboxEvent)
      : this.outboxRepository;

    const outboxEvents = events.map((event) => this.createOutboxEvent(event, metadata));

    try {
      await repository.save(outboxEvents);
      this.logger.log(
        `Batch of ${events.length} events published to outbox: ${events.map((e) => e.eventType).join(', ')}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish batch of ${events.length} events to outbox`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * Create an OutboxEvent entity from a DomainEvent
   * @param event - Domain event
   * @param metadata - Optional metadata
   * @returns OutboxEvent entity ready to be saved
   */
  private createOutboxEvent(event: DomainEvent, metadata?: EventMetadata): OutboxEvent {
    const outboxEvent = new OutboxEvent();

    // Generate idempotency key from event ID and type
    outboxEvent.idempotencyKey = this.generateIdempotencyKey(event);

    // Set aggregate information
    outboxEvent.aggregateType = event.aggregateType;
    outboxEvent.aggregateId = event.aggregateId;
    outboxEvent.eventType = event.eventType;

    // Store the complete event data
    outboxEvent.eventData = {
      ...event,
      timestamp: event.timestamp.toISOString(),
    };

    // Store metadata
    outboxEvent.eventMetadata = {
      source: metadata?.source || 'event-publisher',
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      publishedAt: new Date().toISOString(),
      ...metadata,
    };

    // Initialize processing state
    outboxEvent.processed = false;
    outboxEvent.processedAt = undefined;

    return outboxEvent;
  }

  /**
   * Generate a unique idempotency key for an event.
   * Prevents duplicate publishing of events with identical eventType, eventId, aggregateId, and version.
   * Note: If the same business event is generated multiple times with different eventIds, it will not be prevented.
   * @param event - Domain event
   * @returns Idempotency key
   */
  private generateIdempotencyKey(event: DomainEvent): string {
    // Combine eventType, eventId, aggregateId, and version for uniqueness.
    // This prevents publishing of events with identical identifying fields, but not all possible duplicates of a business event.
    return `${event.eventType}_${event.eventId}_${event.aggregateId}_${event.version}`;
  }

  /**
   * Utility method to generate a new event ID
   * Can be used when creating domain events
   */
  static generateEventId(): string {
    return uuidv4();
  }

  /**
   * Utility method to generate a correlation ID for event chains
   * Can be used to track related events
   */
  static generateCorrelationId(): string {
    return uuidv4();
  }
}
