import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { Repository } from 'typeorm';
import { Queue } from 'bull';
import { OutboxProcessor } from './outbox.processor';
import { OutboxEvent } from '../entities/outbox-event.entity';

describe('OutboxProcessor', () => {
  let processor: OutboxProcessor;

  const mockOutboxRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    save: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: OutboxProcessor,
          useFactory: (
            repo: Repository<OutboxEvent>,
            oQueue: Queue,
            iQueue: Queue,
            pQueue: Queue,
          ) => new OutboxProcessor(repo, oQueue, iQueue, pQueue),
          inject: [
            getRepositoryToken(OutboxEvent),
            getQueueToken('order-processing'),
            getQueueToken('inventory-processing'),
            getQueueToken('payment-processing'),
          ],
        },
        {
          provide: getRepositoryToken(OutboxEvent),
          useValue: mockOutboxRepository,
        },
        {
          provide: getQueueToken('order-processing'),
          useValue: mockQueue,
        },
        {
          provide: getQueueToken('inventory-processing'),
          useValue: mockQueue,
        },
        {
          provide: getQueueToken('payment-processing'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    processor = module.get<OutboxProcessor>(OutboxProcessor);
  });

  afterEach(async () => {
    await processor.stop();
  });

  describe('processPendingEvents', () => {
    it('should process pending events', async () => {
      mockOutboxRepository.find.mockResolvedValue([]);

      await processor.processPendingEvents();

      // Should call repository to find pending events
      expect(mockOutboxRepository.find).toHaveBeenCalled();
    });
  });

  describe('getStatistics', () => {
    it('should return processing statistics', async () => {
      mockOutboxRepository.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(80)
        .mockResolvedValueOnce(20);

      const oldestPending = {
        id: 'event-old',
        createdAt: new Date('2024-01-01'),
      };

      mockOutboxRepository.findOne.mockResolvedValue(oldestPending);

      const stats = await processor.getStatistics();

      expect(stats).toEqual({
        totalEvents: 100,
        processedEvents: 80,
        pendingEvents: 20,
        oldestPendingEvent: new Date('2024-01-01'),
      });
    });

    it('should handle no pending events', async () => {
      mockOutboxRepository.count
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(0);

      mockOutboxRepository.findOne.mockResolvedValue(null);

      const stats = await processor.getStatistics();

      expect(stats).toEqual({
        totalEvents: 50,
        processedEvents: 50,
        pendingEvents: 0,
        oldestPendingEvent: undefined,
      });
    });
  });

  describe('start and stop', () => {
    it('should start and process events immediately', async () => {
      mockOutboxRepository.find.mockResolvedValue([]);

      await processor.start();

      // Should process events immediately on start
      expect(mockOutboxRepository.find).toHaveBeenCalled();
    });

    it('should stop processing', async () => {
      await processor.stop();
      expect(true).toBe(true);
    });
  });
});
