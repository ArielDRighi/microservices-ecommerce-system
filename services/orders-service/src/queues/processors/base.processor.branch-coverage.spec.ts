import { Test, TestingModule } from '@nestjs/testing';
import { BaseProcessor } from './base.processor';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';

class TestProcessor extends BaseProcessor<any> {
  protected readonly logger = new Logger('TestProcessor');
  protected readonly processorName = 'TestProcessor';

  async processJob(_data: any, _job: Job<any>): Promise<any> {
    return { success: true };
  }

  public testIsRetryableError(error: unknown): boolean {
    return (this as any).isRetryableError(error);
  }

  public async testHandleDeadLetter(job: Job<any>, error: unknown): Promise<void> {
    return (this as any).handleDeadLetter(job, error);
  }
}

describe('BaseProcessor - Branch Coverage Tests', () => {
  let processor: TestProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TestProcessor],
    }).compile();

    processor = module.get<TestProcessor>(TestProcessor);
  });

  describe('isRetryableError - Network Error Detection', () => {
    it('should identify ECONNRESET as retryable', () => {
      const error = new Error('Connection reset ECONNRESET');
      expect(processor.testIsRetryableError(error)).toBe(true);
    });

    it('should identify ETIMEDOUT as retryable', () => {
      const error = new Error('Request ETIMEDOUT after 30s');
      expect(processor.testIsRetryableError(error)).toBe(true);
    });

    it('should identify ECONNREFUSED as retryable', () => {
      const error = new Error('Connection refused ECONNREFUSED');
      expect(processor.testIsRetryableError(error)).toBe(true);
    });

    it('should identify EHOSTUNREACH as retryable', () => {
      const error = new Error('Host unreachable EHOSTUNREACH');
      expect(processor.testIsRetryableError(error)).toBe(true);
    });

    it('should identify NetworkError as retryable', () => {
      const error = new Error('NetworkError: Failed to fetch');
      expect(processor.testIsRetryableError(error)).toBe(true);
    });

    it('should identify TimeoutError as retryable', () => {
      const error = new Error('TimeoutError: Request timed out');
      expect(processor.testIsRetryableError(error)).toBe(true);
    });

    it('should identify error with code property as retryable', () => {
      const error = Object.assign(new Error('Network error'), { code: 'ECONNRESET' });
      expect(processor.testIsRetryableError(error)).toBe(true);
    });

    it('should identify non-retryable errors', () => {
      const error = new Error('ValidationError: Invalid input');
      expect(processor.testIsRetryableError(error)).toBe(false);
    });

    it('should return false for non-Error objects', () => {
      expect(processor.testIsRetryableError('string error')).toBe(false);
      expect(processor.testIsRetryableError(null)).toBe(false);
      expect(processor.testIsRetryableError(undefined)).toBe(false);
      expect(processor.testIsRetryableError({ message: 'error' })).toBe(false);
    });
  });

  describe('handleDeadLetter - Error Logging', () => {
    it('should handle dead letter with Error object', async () => {
      const mockJob = {
        id: 'job-123',
        name: 'test-job',
        attemptsMade: 3,
        data: { test: 'data' },
        opts: { attempts: 3 },
      } as Job<any>;

      const error = new Error('Fatal error');
      const loggerSpy = jest.spyOn((processor as any).logger, 'error');

      await processor.testHandleDeadLetter(mockJob, error);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Job job-123 moved to dead letter queue'),
        expect.objectContaining({
          jobId: 'job-123',
          jobName: 'test-job',
          attemptsMade: 4,
        }),
      );
    });

    it('should handle dead letter with non-Error object', async () => {
      const mockJob = {
        id: 'job-456',
        name: 'test-job-2',
        attemptsMade: 2,
        data: { test: 'data' },
        opts: { attempts: 3 },
      } as Job<any>;

      const loggerSpy = jest.spyOn((processor as any).logger, 'error');

      await processor.testHandleDeadLetter(mockJob, 'Unknown error');

      expect(loggerSpy).toHaveBeenCalled();
    });
  });
});
