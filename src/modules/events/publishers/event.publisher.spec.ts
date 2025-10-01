import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { EventPublisher } from './event.publisher';
import { OutboxEvent } from '../entities/outbox-event.entity';
import { DomainEvent, EventMetadata } from '../interfaces/event.interface';

describe('EventPublisher', () => {
  let eventPublisher: EventPublisher;
  let outboxRepository: jest.Mocked<Repository<OutboxEvent>>;

  const mockOutboxRepository = {
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventPublisher,
        {
          provide: getRepositoryToken(OutboxEvent),
          useValue: mockOutboxRepository,
        },
      ],
    }).compile();

    eventPublisher = module.get<EventPublisher>(EventPublisher);
    outboxRepository = module.get(getRepositoryToken(OutboxEvent));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('publish', () => {
    it('should publish a single event to outbox', async () => {
      const event: DomainEvent = {
        eventId: 'event-123',
        eventType: 'OrderCreated',
        aggregateType: 'Order',
        aggregateId: 'order-456',
        version: 1,
        timestamp: new Date(),
        correlationId: 'corr-123',
        causationId: 'cause-123',
        userId: 'user-123',
      };

      const metadata: EventMetadata = {
        source: 'test',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      };

      outboxRepository.save.mockResolvedValue({} as OutboxEvent);

      await eventPublisher.publish(event, metadata);

      expect(outboxRepository.save).toHaveBeenCalledTimes(1);
      expect(outboxRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          aggregateType: 'Order',
          aggregateId: 'order-456',
          eventType: 'OrderCreated',
          processed: false,
          processedAt: undefined,
        }),
      );
    });

    it('should generate idempotency key for event', async () => {
      const event: DomainEvent = {
        eventId: 'event-123',
        eventType: 'OrderCreated',
        aggregateType: 'Order',
        aggregateId: 'order-456',
        version: 1,
        timestamp: new Date(),
        correlationId: 'corr-123',
        causationId: 'cause-123',
        userId: 'user-123',
      };

      outboxRepository.save.mockResolvedValue({} as OutboxEvent);

      await eventPublisher.publish(event);

      expect(outboxRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          idempotencyKey: 'OrderCreated_event-123_order-456_1',
        }),
      );
    });

    it('should use entity manager when provided for transactional publishing', async () => {
      const event: DomainEvent = {
        eventId: 'event-123',
        eventType: 'OrderCreated',
        aggregateType: 'Order',
        aggregateId: 'order-456',
        version: 1,
        timestamp: new Date(),
        correlationId: 'corr-123',
        causationId: 'cause-123',
        userId: 'user-123',
      };

      const mockEntityManager = {
        getRepository: jest.fn().mockReturnValue({
          save: jest.fn().mockResolvedValue({} as OutboxEvent),
        }),
      } as unknown as EntityManager;

      await eventPublisher.publish(event, undefined, mockEntityManager);

      expect(mockEntityManager.getRepository).toHaveBeenCalledWith(OutboxEvent);
      expect(outboxRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error on save failure', async () => {
      const event: DomainEvent = {
        eventId: 'event-123',
        eventType: 'OrderCreated',
        aggregateType: 'Order',
        aggregateId: 'order-456',
        version: 1,
        timestamp: new Date(),
        correlationId: 'corr-123',
        causationId: 'cause-123',
        userId: 'user-123',
      };

      const error = new Error('Database error');
      outboxRepository.save.mockRejectedValue(error);

      await expect(eventPublisher.publish(event)).rejects.toThrow('Database error');
    });

    it('should include metadata in outbox event', async () => {
      const event: DomainEvent = {
        eventId: 'event-123',
        eventType: 'OrderCreated',
        aggregateType: 'Order',
        aggregateId: 'order-456',
        version: 1,
        timestamp: new Date(),
        correlationId: 'corr-123',
        causationId: 'cause-123',
        userId: 'user-123',
      };

      const metadata: EventMetadata = {
        source: 'api-gateway',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        custom: { orderId: 'order-456' },
      };

      outboxRepository.save.mockResolvedValue({} as OutboxEvent);

      await eventPublisher.publish(event, metadata);

      expect(outboxRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          eventMetadata: expect.objectContaining({
            source: 'api-gateway',
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
            custom: { orderId: 'order-456' },
          }),
        }),
      );
    });
  });

  describe('publishBatch', () => {
    it('should publish multiple events in a batch', async () => {
      const events: DomainEvent[] = [
        {
          eventId: 'event-1',
          eventType: 'OrderCreated',
          aggregateType: 'Order',
          aggregateId: 'order-1',
          version: 1,
          timestamp: new Date(),
          correlationId: 'corr-1',
          causationId: 'cause-1',
          userId: 'user-1',
        },
        {
          eventId: 'event-2',
          eventType: 'OrderCreated',
          aggregateType: 'Order',
          aggregateId: 'order-2',
          version: 1,
          timestamp: new Date(),
          correlationId: 'corr-2',
          causationId: 'cause-2',
          userId: 'user-2',
        },
      ];

      outboxRepository.save.mockResolvedValue([] as unknown as OutboxEvent);

      await eventPublisher.publishBatch(events);

      expect(outboxRepository.save).toHaveBeenCalledTimes(1);
      expect(outboxRepository.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ aggregateId: 'order-1' }),
          expect.objectContaining({ aggregateId: 'order-2' }),
        ]),
      );
    });

    it('should handle empty events array', async () => {
      await eventPublisher.publishBatch([]);

      expect(outboxRepository.save).not.toHaveBeenCalled();
    });

    it('should use entity manager when provided for batch publishing', async () => {
      const events: DomainEvent[] = [
        {
          eventId: 'event-1',
          eventType: 'OrderCreated',
          aggregateType: 'Order',
          aggregateId: 'order-1',
          version: 1,
          timestamp: new Date(),
          correlationId: 'corr-1',
          causationId: 'cause-1',
          userId: 'user-1',
        },
      ];

      const mockEntityManager = {
        getRepository: jest.fn().mockReturnValue({
          save: jest.fn().mockResolvedValue([]),
        }),
      } as unknown as EntityManager;

      await eventPublisher.publishBatch(events, undefined, mockEntityManager);

      expect(mockEntityManager.getRepository).toHaveBeenCalledWith(OutboxEvent);
      expect(outboxRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error on batch save failure', async () => {
      const events: DomainEvent[] = [
        {
          eventId: 'event-1',
          eventType: 'OrderCreated',
          aggregateType: 'Order',
          aggregateId: 'order-1',
          version: 1,
          timestamp: new Date(),
          correlationId: 'corr-1',
          causationId: 'cause-1',
          userId: 'user-1',
        },
      ];

      const error = new Error('Batch save failed');
      outboxRepository.save.mockRejectedValue(error);

      await expect(eventPublisher.publishBatch(events)).rejects.toThrow('Batch save failed');
    });
  });

  describe('utility methods', () => {
    it('should generate valid UUID for event ID', () => {
      const eventId = EventPublisher.generateEventId();
      expect(eventId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should generate valid UUID for correlation ID', () => {
      const correlationId = EventPublisher.generateCorrelationId();
      expect(correlationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should generate different IDs on each call', () => {
      const id1 = EventPublisher.generateEventId();
      const id2 = EventPublisher.generateEventId();
      expect(id1).not.toBe(id2);
    });
  });
});
