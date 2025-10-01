/**
 * Events Module
 * Central export for all event-related functionality
 */

// Module
export * from './events.module';

// Entities
export * from './entities/outbox-event.entity';

// Interfaces
export * from './interfaces/event.interface';

// Types
export * from './types';

// Publishers
export { EventPublisher } from './publishers/event.publisher';

// Processors
export { OutboxProcessor, OutboxProcessorConfig } from './processors/outbox.processor';
