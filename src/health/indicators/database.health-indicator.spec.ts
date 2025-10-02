import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseHealthIndicator } from './database.health-indicator';
import { getConnectionToken } from '@nestjs/typeorm';
import { HealthCheckError } from '@nestjs/terminus';

describe('DatabaseHealthIndicator', () => {
  let indicator: DatabaseHealthIndicator;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockConnection: any;

  beforeEach(async () => {
    mockConnection = {
      isInitialized: true,
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseHealthIndicator,
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
      ],
    }).compile();

    indicator = module.get<DatabaseHealthIndicator>(DatabaseHealthIndicator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isHealthy', () => {
    it('should return healthy status when database is connected', async () => {
      // Arrange
      mockConnection.query.mockResolvedValue([{ result: 1 }]);

      // Act
      const result = await indicator.isHealthy('database');

      // Assert
      expect(result).toEqual({
        database: {
          status: 'up',
        },
      });
      expect(mockConnection.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should throw HealthCheckError when database connection is not initialized', async () => {
      // Arrange
      mockConnection.isInitialized = false;

      // Act & Assert
      await expect(indicator.isHealthy('database')).rejects.toThrow(HealthCheckError);
    });

    it('should throw HealthCheckError when database query fails', async () => {
      // Arrange
      mockConnection.query.mockRejectedValue(new Error('Connection failed'));

      // Act & Assert
      await expect(indicator.isHealthy('database')).rejects.toThrow(HealthCheckError);
    });

    it('should include connection pool info when available', async () => {
      // Arrange
      mockConnection.query.mockResolvedValue([{ result: 1 }]);
      mockConnection.driver = {
        pool: {
          totalCount: 10,
          idleCount: 5,
          waitingCount: 0,
        },
      };

      // Act
      const result = await indicator.isHealthy('database');

      // Assert
      expect(result['database']).toHaveProperty('poolSize');
      expect(result['database']).toHaveProperty('idleConnections');
    });
  });

  describe('pingCheck', () => {
    it('should successfully ping database', async () => {
      // Arrange
      mockConnection.query.mockResolvedValue([{ result: 1 }]);

      // Act
      const result = await indicator.pingCheck('database');

      // Assert
      expect(result['database']?.['status']).toBe('up');
    });

    it('should measure response time', async () => {
      // Arrange
      mockConnection.query.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([{ result: 1 }]), 50)),
      );

      // Act
      const result = await indicator.pingCheck('database');

      // Assert
      expect(result['database']).toHaveProperty('responseTime');
      expect(result['database']?.['responseTime']).toBeGreaterThan(0);
    });
  });
});
