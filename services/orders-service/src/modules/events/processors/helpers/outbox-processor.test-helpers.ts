/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { Repository } from 'typeorm';
import { Queue } from 'bull';
import { OutboxProcessor } from '../outbox.processor';
import { OutboxEvent } from '../../entities/outbox-event.entity';

/**
 * Mock del repositorio de Outbox
 */
export function mockOutboxRepository(): jest.Mocked<Repository<OutboxEvent>> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    save: jest.fn(),
  } as any;
}

/**
 * Mock de Queue de Bull
 */
export function mockQueue(): jest.Mocked<Queue> {
  return {
    add: jest.fn(),
  } as any;
}

/**
 * Crear módulo de testing con OutboxProcessor y mocks
 */
export async function createOutboxProcessorTestingModule(
  repoMock: any = mockOutboxRepository(),
  queueMock: any = mockQueue(),
): Promise<{ module: TestingModule; processor: OutboxProcessor }> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      {
        provide: OutboxProcessor,
        useFactory: (repo: Repository<OutboxEvent>, oQueue: Queue, iQueue: Queue, pQueue: Queue) =>
          new OutboxProcessor(repo, oQueue, iQueue, pQueue),
        inject: [
          getRepositoryToken(OutboxEvent),
          getQueueToken('order-processing'),
          getQueueToken('inventory-processing'),
          getQueueToken('payment-processing'),
        ],
      },
      {
        provide: getRepositoryToken(OutboxEvent),
        useValue: repoMock,
      },
      {
        provide: getQueueToken('order-processing'),
        useValue: queueMock,
      },
      {
        provide: getQueueToken('inventory-processing'),
        useValue: queueMock,
      },
      {
        provide: getQueueToken('payment-processing'),
        useValue: queueMock,
      },
    ],
  }).compile();

  const processor = module.get<OutboxProcessor>(OutboxProcessor);

  return { module, processor };
}

/**
 * Factory para crear OutboxEvent mock
 */
export function createMockOutboxEvent(overrides: Partial<OutboxEvent> = {}): Partial<OutboxEvent> {
  return {
    id: 'event-123',
    aggregateType: 'Order',
    aggregateId: 'order-456',
    eventType: 'OrderCreated',
    eventData: { orderId: 'order-456', items: [] },
    processed: false,
    processedAt: undefined,
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Factory para crear múltiples eventos mock
 */
export function createMockOutboxEvents(count: number): Partial<OutboxEvent>[] {
  return Array.from({ length: count }, (_, i) =>
    createMockOutboxEvent({
      id: `event-${i}`,
      aggregateId: `order-${i}`,
    }),
  );
}

/**
 * Expectativa para validar que evento fue procesado correctamente
 */
export function expectEventProcessed(
  repoMock: any,
  eventId: string,
  processed: boolean = true,
): void {
  expect(repoMock.save).toHaveBeenCalledWith(
    expect.objectContaining({
      id: eventId,
      processed,
      processedAt: expect.any(Date),
    }),
  );
}

/**
 * Expectativa para validar que queue.add fue llamado correctamente
 */
export function expectQueueAddCalled(queueMock: any, jobType: string, expectedData: any): void {
  expect(queueMock.add).toHaveBeenCalledWith(
    jobType,
    expect.objectContaining(expectedData),
    expect.objectContaining({
      attempts: expect.any(Number),
      backoff: expect.any(Object),
    }),
  );
}
