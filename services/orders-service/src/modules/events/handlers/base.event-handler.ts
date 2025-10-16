import { Logger } from '@nestjs/common';
import { EventHandler, DomainEvent } from '../interfaces/event.interface';

/**
 * Abstract base class for event handlers
 * Provides common functionality for all event handlers
 */
export abstract class BaseEventHandler<T extends DomainEvent> implements EventHandler<T> {
  protected readonly logger: Logger;

  constructor(loggerContext?: string) {
    this.logger = new Logger(loggerContext || this.constructor.name);
  }

  /**
   * Handle the domain event
   * Must be implemented by concrete handlers
   */
  abstract handle(event: T): Promise<void>;

  /**
   * Get the event type this handler handles
   * Must be implemented by concrete handlers
   */
  abstract get eventType(): string;

  /**
   * Check if this handler can handle a given event type
   */
  canHandle(eventType: string): boolean {
    return this.eventType === eventType;
  }

  /**
   * Log event handling start
   */
  protected logHandlingStart(event: T): void {
    this.logger.log(
      `Handling event: ${event.eventType} [${event.eventId}] for aggregate ${event.aggregateType}:${event.aggregateId}`,
    );
  }

  /**
   * Log event handling success
   */
  protected logHandlingSuccess(event: T): void {
    this.logger.log(`Successfully handled event: ${event.eventType} [${event.eventId}]`);
  }

  /**
   * Log event handling error
   */
  protected logHandlingError(event: T, error: Error): void {
    this.logger.error(`Failed to handle event: ${event.eventType} [${event.eventId}]`, error.stack);
  }

  /**
   * Execute event handling with logging
   * Template method pattern
   */
  async execute(event: T): Promise<void> {
    this.logHandlingStart(event);

    try {
      await this.handle(event);
      this.logHandlingSuccess(event);
    } catch (error) {
      this.logHandlingError(event, error as Error);
      throw error;
    }
  }
}
