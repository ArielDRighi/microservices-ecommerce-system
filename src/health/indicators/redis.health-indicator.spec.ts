import { Test, TestingModule } from '@nestjs/testing';
import { RedisHealthIndicator } from './redis.health-indicator';
import { HealthCheckError } from '@nestjs/terminus';
import { Redis } from 'ioredis';

describe('RedisHealthIndicator', () => {
  let indicator: RedisHealthIndicator;
  let mockRedisClient: jest.Mocked<Partial<Redis>>;

  beforeEach(async () => {
    mockRedisClient = {
      ping: jest.fn(),
      info: jest.fn(),
      status: 'ready',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisHealthIndicator,
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedisClient,
        },
      ],
    }).compile();

    indicator = module.get<RedisHealthIndicator>(RedisHealthIndicator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isHealthy', () => {
    it('should return healthy status when Redis is connected', async () => {
      // Arrange
      mockRedisClient.ping = jest.fn().mockResolvedValue('PONG');

      // Act
      const result = await indicator.isHealthy('redis');

      // Assert
      expect(result['redis']).toHaveProperty('status', 'up');
      expect(result['redis']).toHaveProperty('latency');
      expect(typeof result['redis']?.['latency']).toBe('number');
      expect(mockRedisClient.ping).toHaveBeenCalled();
    });

    it('should throw HealthCheckError when Redis is not ready', async () => {
      // Arrange
      mockRedisClient.status = 'end';

      // Act & Assert
      await expect(indicator.isHealthy('redis')).rejects.toThrow(HealthCheckError);
    });

    it('should throw HealthCheckError when ping fails', async () => {
      // Arrange
      mockRedisClient.ping = jest.fn().mockRejectedValue(new Error('Connection refused'));

      // Act & Assert
      await expect(indicator.isHealthy('redis')).rejects.toThrow(HealthCheckError);
    });

    it('should include latency in result', async () => {
      // Arrange
      mockRedisClient.ping = jest
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve('PONG'), 10)));

      // Act
      const result = await indicator.isHealthy('redis');

      // Assert
      expect(result['redis']).toHaveProperty('latency');
      expect(result['redis']?.['latency']).toBeGreaterThan(0);
    });
  });

  describe('checkLatency', () => {
    it('should return healthy when latency is below threshold', async () => {
      // Arrange
      const maxLatency = 100;
      mockRedisClient.ping = jest
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve('PONG'), 20)));

      // Act
      const result = await indicator.checkLatency('redis', maxLatency);

      // Assert
      expect(result['redis']?.['status']).toBe('up');
      expect(result['redis']?.['latency']).toBeLessThan(maxLatency);
    });

    it('should throw HealthCheckError when latency exceeds threshold', async () => {
      // Arrange
      const maxLatency = 10;
      mockRedisClient.ping = jest
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve('PONG'), 50)));

      // Act & Assert
      await expect(indicator.checkLatency('redis', maxLatency)).rejects.toThrow(HealthCheckError);
    });
  });

  describe('getMemoryInfo', () => {
    it('should return memory usage information', async () => {
      // Arrange
      const mockInfo =
        'used_memory:1000000\r\nused_memory_human:976.56K\r\nused_memory_rss:2000000';
      mockRedisClient.info = jest.fn().mockResolvedValue(mockInfo);

      // Act
      const result = await indicator.getMemoryInfo();

      // Assert
      expect(result).toHaveProperty('used_memory');
      expect(result).toHaveProperty('used_memory_human');
      expect(mockRedisClient.info).toHaveBeenCalledWith('memory');
    });
  });
});
