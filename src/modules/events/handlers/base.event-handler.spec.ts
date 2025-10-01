import { BaseEventHandler } from './base.event-handler';
import { DomainEvent } from '../interfaces/event.interface';

// Mock concrete implementation for testing
class TestEventHandler extends BaseEventHandler<DomainEvent> {
  get eventType(): string {
    return 'TestEvent';
  }

  async handle(event: DomainEvent): Promise<void> {
    // Test implementation
    if (event.aggregateId === 'fail') {
      throw new Error('Test error');
    }
  }
}

describe('BaseEventHandler', () => {
  let handler: TestEventHandler;

  beforeEach(() => {
    handler = new TestEventHandler('TestContext');
  });

  describe('canHandle', () => {
    it('should return true for matching event type', () => {
      expect(handler.canHandle('TestEvent')).toBe(true);
    });

    it('should return false for non-matching event type', () => {
      expect(handler.canHandle('OtherEvent')).toBe(false);
    });
  });

  describe('execute', () => {
    it('should execute handler successfully and log', async () => {
      const event: DomainEvent = {
        eventId: 'test-1',
        eventType: 'TestEvent',
        aggregateType: 'Test',
        aggregateId: 'test-123',
        version: 1,
        timestamp: new Date(),
        userId: 'user-1',
      };

      await expect(handler.execute(event)).resolves.toBeUndefined();
    });

    it('should handle errors and rethrow', async () => {
      const event: DomainEvent = {
        eventId: 'test-2',
        eventType: 'TestEvent',
        aggregateType: 'Test',
        aggregateId: 'fail',
        version: 1,
        timestamp: new Date(),
        userId: 'user-1',
      };

      await expect(handler.execute(event)).rejects.toThrow('Test error');
    });
  });

  describe('eventType getter', () => {
    it('should return correct event type', () => {
      expect(handler.eventType).toBe('TestEvent');
    });
  });
});
