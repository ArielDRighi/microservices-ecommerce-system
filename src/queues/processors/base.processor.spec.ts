/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { BaseProcessor } from './base.processor';
import { BaseJobData, JobResult } from '../../common/interfaces/queue-job.interface';

// Test implementation of BaseProcessor
class TestProcessor extends BaseProcessor<BaseJobData> {
  protected readonly logger = new Logger(TestProcessor.name);
  protected readonly processorName = 'TestProcessor';

  protected async processJob(_data: BaseJobData, _job: Job<BaseJobData>): Promise<JobResult> {
    return {
      success: true,
      data: { processed: true },
      processedAt: new Date(),
      duration: 0,
      attemptsMade: 1,
    };
  }
}

// Test processor that throws errors
class ErrorProcessor extends BaseProcessor<BaseJobData> {
  protected readonly logger = new Logger(ErrorProcessor.name);
  protected readonly processorName = 'ErrorProcessor';

  protected async processJob(): Promise<JobResult> {
    throw new Error('Test error');
  }
}

// Test processor for retryable errors
class RetryableErrorProcessor extends BaseProcessor<BaseJobData> {
  protected readonly logger = new Logger(RetryableErrorProcessor.name);
  protected readonly processorName = 'RetryableErrorProcessor';

  protected async processJob(): Promise<JobResult> {
    const error = new Error('Network error');
    (error as any).code = 'ECONNRESET';
    throw error;
  }
}

describe('BaseProcessor', () => {
  let testProcessor: TestProcessor;
  let errorProcessor: ErrorProcessor;
  let retryableErrorProcessor: RetryableErrorProcessor;

  const mockJob: Partial<Job<BaseJobData>> = {
    id: '1',
    name: 'test-job',
    data: {
      jobId: 'test-1',
      createdAt: new Date(),
    },
    attemptsMade: 0,
    opts: { attempts: 3 },
    progress: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TestProcessor, ErrorProcessor, RetryableErrorProcessor],
    }).compile();

    testProcessor = module.get<TestProcessor>(TestProcessor);
    errorProcessor = module.get<ErrorProcessor>(ErrorProcessor);
    retryableErrorProcessor = module.get<RetryableErrorProcessor>(RetryableErrorProcessor);

    // Mock logger methods to avoid console spam
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleJob', () => {
    it('should process job successfully', async () => {
      const result = await testProcessor.handleJob(mockJob as Job<BaseJobData>);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ processed: true });
      expect(result.processedAt).toBeInstanceOf(Date);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.attemptsMade).toBe(1);
    });

    it('should update progress during job execution', async () => {
      await testProcessor.handleJob(mockJob as Job<BaseJobData>);

      expect(mockJob.progress).toHaveBeenCalledWith({
        percentage: 0,
        message: 'Job started',
      });

      expect(mockJob.progress).toHaveBeenCalledWith({
        percentage: 100,
        message: 'Job completed',
      });
    });

    it('should handle job failure', async () => {
      const result = await errorProcessor.handleJob(mockJob as Job<BaseJobData>);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Test error');
      expect(result.processedAt).toBeInstanceOf(Date);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle retryable errors', async () => {
      const result = await retryableErrorProcessor.handleJob(mockJob as Job<BaseJobData>);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should move to dead letter queue after max attempts', async () => {
      const jobWithMaxAttempts: Partial<Job<BaseJobData>> = {
        ...mockJob,
        attemptsMade: 2, // This will be the 3rd attempt (max)
        opts: { attempts: 3 },
      };

      const result = await errorProcessor.handleJob(jobWithMaxAttempts as Job<BaseJobData>);

      expect(result.success).toBe(false);
      // Logger should have been called for dead letter queue
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('dead letter queue'),
        expect.any(Object),
      );
    });

    it('should handle progress update failure gracefully', async () => {
      const jobWithFailingProgress: Partial<Job<BaseJobData>> = {
        ...mockJob,
        progress: jest.fn().mockRejectedValue(new Error('Progress update failed')),
      };

      const result = await testProcessor.handleJob(jobWithFailingProgress as Job<BaseJobData>);

      expect(result.success).toBe(true); // Job should still succeed
      expect(Logger.prototype.warn).toHaveBeenCalled();
    });
  });

  describe('isRetryableError', () => {
    it('should identify ECONNRESET as retryable', () => {
      const error = new Error('Connection reset');
      (error as any).code = 'ECONNRESET';

      const isRetryable = (testProcessor as any).isRetryableError(error);
      expect(isRetryable).toBe(true);
    });

    it('should identify ETIMEDOUT as retryable', () => {
      const error = new Error('Timeout');
      (error as any).code = 'ETIMEDOUT';

      const isRetryable = (testProcessor as any).isRetryableError(error);
      expect(isRetryable).toBe(true);
    });

    it('should identify NetworkError in message as retryable', () => {
      const error = new Error('NetworkError: Connection failed');

      const isRetryable = (testProcessor as any).isRetryableError(error);
      expect(isRetryable).toBe(true);
    });

    it('should identify non-retryable errors', () => {
      const error = new Error('Validation error');

      const isRetryable = (testProcessor as any).isRetryableError(error);
      expect(isRetryable).toBe(false);
    });

    it('should handle non-Error objects', () => {
      const error = { message: 'Not an Error instance' };

      const isRetryable = (testProcessor as any).isRetryableError(error);
      expect(isRetryable).toBe(false);
    });
  });

  describe('onModuleDestroy', () => {
    it('should handle graceful shutdown', async () => {
      jest.useFakeTimers();

      const shutdownPromise = testProcessor.onModuleDestroy();

      // Fast-forward timers
      jest.advanceTimersByTime(5000);

      await shutdownPromise;

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('shutting down gracefully'),
      );

      jest.useRealTimers();
    });
  });

  describe('logMetrics', () => {
    it('should log job metrics', () => {
      const mockJobResult: JobResult = {
        success: true,
        data: { test: true },
        processedAt: new Date(),
        duration: 100,
        attemptsMade: 1,
      };

      (testProcessor as any).logMetrics(mockJob as Job<BaseJobData>, mockJobResult);

      expect(Logger.prototype.debug).toHaveBeenCalledWith(
        expect.stringContaining('Job metrics'),
        expect.objectContaining({
          jobId: '1',
          success: true,
          duration: 100,
        }),
      );
    });
  });

  describe('error handling with code property', () => {
    it('should handle errors with undefined code', async () => {
      class ErrorWithoutCodeProcessor extends BaseProcessor<BaseJobData> {
        protected readonly logger = new Logger(ErrorWithoutCodeProcessor.name);
        protected readonly processorName = 'ErrorWithoutCodeProcessor';

        protected async processJob(): Promise<JobResult> {
          throw new Error('Error without code');
        }
      }

      const module: TestingModule = await Test.createTestingModule({
        providers: [ErrorWithoutCodeProcessor],
      }).compile();

      const processor = module.get<ErrorWithoutCodeProcessor>(ErrorWithoutCodeProcessor);
      const result = await processor.handleJob(mockJob as Job<BaseJobData>);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBeUndefined();
    });
  });
});
