/**
 * Base interface for all domain events
 */
export interface DomainEvent {
  /**
   * Unique identifier for the event
   */
  eventId: string;

  /**
   * Type of the event (OrderCreated, OrderConfirmed, etc.)
   */
  eventType: string;

  /**
   * Type of aggregate that generated this event
   */
  aggregateType: string;

  /**
   * ID of the aggregate that generated this event
   */
  aggregateId: string;

  /**
   * Version of the event schema (for evolution)
   */
  version: number;

  /**
   * Timestamp when the event was created
   */
  timestamp: Date;

  /**
   * Correlation ID for tracing across services
   */
  correlationId?: string;

  /**
   * Causation ID - the ID of the command/event that caused this event
   */
  causationId?: string;

  /**
   * User ID who triggered the event (if applicable)
   */
  userId?: string;
}

/**
 * Base interface for event metadata
 */
export interface EventMetadata {
  /**
   * Source service that generated the event
   */
  source?: string;

  /**
   * IP address of the request (if applicable)
   */
  ipAddress?: string;

  /**
   * User agent of the request (if applicable)
   */
  userAgent?: string;

  /**
   * Additional custom metadata
   */
  [key: string]: unknown;
}

/**
 * Event handler interface
 */
export interface EventHandler<T extends DomainEvent = DomainEvent> {
  /**
   * Handle the event
   */
  handle(event: T): Promise<void>;

  /**
   * Event type that this handler handles
   */
  eventType: string;

  /**
   * Whether this handler should handle the event
   */
  canHandle(eventType: string): boolean;
}

/**
 * Event publisher interface
 */
export interface EventPublisher {
  /**
   * Publish an event to the outbox
   */
  publish<T extends DomainEvent>(event: T, metadata?: EventMetadata): Promise<void>;

  /**
   * Publish multiple events in a single transaction
   */
  publishBatch<T extends DomainEvent>(events: T[], metadata?: EventMetadata): Promise<void>;
}

/**
 * Outbox processor interface
 */
export interface OutboxProcessor {
  /**
   * Process pending events from the outbox
   */
  processPendingEvents(): Promise<void>;

  /**
   * Start the background processor
   */
  start(): Promise<void>;

  /**
   * Stop the background processor
   */
  stop(): Promise<void>;
}
