import { Test, TestingModule } from '@nestjs/testing';
import { QueueHealthIndicator } from './queue.health-indicator';
import { HealthCheckError } from '@nestjs/terminus';
import { Queue } from 'bull';

describe('QueueHealthIndicator', () => {
  let indicator: QueueHealthIndicator;
  let mockOrderQueue: jest.Mocked<Partial<Queue>>;
  let mockPaymentQueue: jest.Mocked<Partial<Queue>>;

  beforeEach(async () => {
    mockOrderQueue = {
      getJobCounts: jest.fn(),
      getWaiting: jest.fn(),
      getActive: jest.fn(),
      getFailed: jest.fn(),
      getCompleted: jest.fn(),
      isPaused: jest.fn(),
    };

    mockPaymentQueue = {
      getJobCounts: jest.fn(),
      getWaiting: jest.fn(),
      getActive: jest.fn(),
      getFailed: jest.fn(),
      getCompleted: jest.fn(),
      isPaused: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueHealthIndicator,
        {
          provide: 'BullQueue_order-processing',
          useValue: mockOrderQueue,
        },
        {
          provide: 'BullQueue_payment-processing',
          useValue: mockPaymentQueue,
        },
      ],
    }).compile();

    indicator = module.get<QueueHealthIndicator>(QueueHealthIndicator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isHealthy', () => {
    it('should return healthy status when all queues are operational', async () => {
      // Arrange
      mockOrderQueue.getJobCounts = jest.fn().mockResolvedValue({
        waiting: 10,
        active: 5,
        completed: 100,
        failed: 2,
        delayed: 0,
        paused: 0,
      });

      mockPaymentQueue.getJobCounts = jest.fn().mockResolvedValue({
        waiting: 5,
        active: 3,
        completed: 50,
        failed: 1,
        delayed: 0,
        paused: 0,
      });

      mockOrderQueue.isPaused = jest.fn().mockResolvedValue(false);
      mockPaymentQueue.isPaused = jest.fn().mockResolvedValue(false);

      // Act
      const result = await indicator.isHealthy('queues');

      // Assert
      expect(result['queues']?.status).toBe('up');
      expect(result['queues']).toHaveProperty('order-processing');
      expect(result['queues']).toHaveProperty('payment-processing');
    });

    it('should throw HealthCheckError when waiting jobs exceed threshold', async () => {
      // Arrange
      mockOrderQueue.getJobCounts = jest.fn().mockResolvedValue({
        waiting: 1000, // Exceeds default threshold
        active: 5,
        completed: 100,
        failed: 2,
        delayed: 0,
        paused: 0,
      });

      mockOrderQueue.isPaused = jest.fn().mockResolvedValue(false);

      // Act & Assert
      await expect(indicator.isHealthy('queues')).rejects.toThrow(HealthCheckError);
    });

    it('should throw HealthCheckError when queue is paused', async () => {
      // Arrange
      mockOrderQueue.isPaused = jest.fn().mockResolvedValue(true);

      // Act & Assert
      await expect(indicator.isHealthy('queues')).rejects.toThrow(HealthCheckError);
    });

    it('should throw HealthCheckError when failed job rate is high', async () => {
      // Arrange
      mockOrderQueue.getJobCounts = jest.fn().mockResolvedValue({
        waiting: 10,
        active: 5,
        completed: 10,
        failed: 50, // High failure rate
        delayed: 0,
        paused: 0,
      });

      mockOrderQueue.isPaused = jest.fn().mockResolvedValue(false);

      // Act & Assert
      await expect(indicator.isHealthy('queues')).rejects.toThrow(HealthCheckError);
    });
  });

  describe('checkQueue', () => {
    it('should return health status for a specific queue', async () => {
      // Arrange
      const queueName = 'order-processing';
      mockOrderQueue.getJobCounts = jest.fn().mockResolvedValue({
        waiting: 10,
        active: 5,
        completed: 100,
        failed: 2,
        delayed: 0,
        paused: 0,
      });

      mockOrderQueue.isPaused = jest.fn().mockResolvedValue(false);

      // Act
      const result = await indicator.checkQueue(queueName, mockOrderQueue as Queue);

      // Assert
      expect(result[queueName].status).toBe('up');
      expect(result[queueName].waiting).toBe(10);
      expect(result[queueName].active).toBe(5);
      expect(result[queueName].failed).toBe(2);
    });

    it('should include processing time metrics', async () => {
      // Arrange
      const queueName = 'payment-processing';
      mockPaymentQueue.getJobCounts = jest.fn().mockResolvedValue({
        waiting: 5,
        active: 3,
        completed: 50,
        failed: 1,
        delayed: 0,
        paused: 0,
      });

      mockPaymentQueue.isPaused = jest.fn().mockResolvedValue(false);

      // Act
      const result = await indicator.checkQueue(queueName, mockPaymentQueue as Queue);

      // Assert
      expect(result[queueName]).toHaveProperty('jobCounts');
      expect(result[queueName].jobCounts).toEqual({
        waiting: 5,
        active: 3,
        completed: 50,
        failed: 1,
        delayed: 0,
        paused: 0,
      });
    });
  });

  describe('checkWithThreshold', () => {
    it('should return healthy when below threshold', async () => {
      // Arrange
      const threshold = {
        maxWaiting: 100,
        maxFailed: 10,
        maxFailureRate: 0.1,
      };

      mockOrderQueue.getJobCounts = jest.fn().mockResolvedValue({
        waiting: 50,
        active: 5,
        completed: 100,
        failed: 5,
        delayed: 0,
        paused: 0,
      });

      mockPaymentQueue.getJobCounts = jest.fn().mockResolvedValue({
        waiting: 30,
        active: 3,
        completed: 50,
        failed: 2,
        delayed: 0,
        paused: 0,
      });

      mockOrderQueue.isPaused = jest.fn().mockResolvedValue(false);
      mockPaymentQueue.isPaused = jest.fn().mockResolvedValue(false);

      // Act
      const result = await indicator.checkWithThreshold('queues', threshold);

      // Assert
      expect(result['queues']?.status).toBe('up');
    });

    it('should throw when exceeding thresholds', async () => {
      // Arrange
      const threshold = {
        maxWaiting: 10,
        maxFailed: 2,
        maxFailureRate: 0.05,
      };

      mockOrderQueue.getJobCounts = jest.fn().mockResolvedValue({
        waiting: 50, // Exceeds maxWaiting
        active: 5,
        completed: 100,
        failed: 5,
        delayed: 0,
        paused: 0,
      });

      mockPaymentQueue.getJobCounts = jest.fn().mockResolvedValue({
        waiting: 5,
        active: 2,
        completed: 50,
        failed: 1,
        delayed: 0,
        paused: 0,
      });

      mockOrderQueue.isPaused = jest.fn().mockResolvedValue(false);
      mockPaymentQueue.isPaused = jest.fn().mockResolvedValue(false);

      // Act & Assert
      await expect(indicator.checkWithThreshold('queues', threshold)).rejects.toThrow(
        HealthCheckError,
      );
    });
  });
});
