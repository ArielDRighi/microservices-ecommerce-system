/* eslint-disable @typescript-eslint/no-explicit-any */
import { Queue } from 'bull';

/**
 * Factory to create a mock Bull Queue with common methods
 * @returns Mock Queue instance
 */
export const createMockQueue = (): Partial<Queue> => ({
  add: jest.fn(),
  on: jest.fn(),
  getJobCounts: jest.fn(),
  isPaused: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  clean: jest.fn(),
  empty: jest.fn(),
  close: jest.fn(),
  getActiveCount: jest.fn(),
  process: jest.fn(),
});

/**
 * Creates mock job counts for queue metrics
 * @param overrides - Optional overrides for default counts
 * @returns Mock job counts object
 */
export const createMockJobCounts = (overrides: Partial<Record<string, number>> = {}) => ({
  waiting: 0,
  active: 0,
  completed: 0,
  failed: 0,
  delayed: 0,
  ...overrides,
});

/**
 * Assertion helper to verify queue metrics structure
 * @param metrics - Metrics object to verify
 * @param queueName - Expected queue name
 */
export const expectValidQueueMetrics = (metrics: any, queueName: string) => {
  expect(metrics).toEqual({
    queueName,
    waiting: expect.any(Number),
    active: expect.any(Number),
    completed: expect.any(Number),
    failed: expect.any(Number),
    delayed: expect.any(Number),
    paused: expect.any(Boolean),
    timestamp: expect.any(Date),
  });
};

/**
 * Assertion helper to verify all queues have event listeners
 * @param queues - Array of mock queues
 * @param events - Array of event names to verify
 */
export const expectEventListeners = (queues: Array<jest.Mocked<Queue>>, events: string[]) => {
  queues.forEach((queue) => {
    events.forEach((event) => {
      expect(queue.on).toHaveBeenCalledWith(event, expect.any(Function));
    });
  });
};

/**
 * Gets a specific event listener from a mock queue
 * @param queue - Mock queue instance
 * @param eventName - Name of the event
 * @returns Event listener function or undefined
 */
export const getEventListener = (
  queue: jest.Mocked<Queue>,
  eventName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): ((...args: any[]) => void) | undefined => {
  const call = (queue.on as jest.Mock).mock.calls.find((c) => c[0] === eventName);
  return call?.[1];
};
