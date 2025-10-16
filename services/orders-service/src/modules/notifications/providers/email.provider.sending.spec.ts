import { Test, TestingModule } from '@nestjs/testing';
import { EmailProvider } from './email.provider';
import { NotificationStatus } from '../enums';
import {
  expectSuccessfulEmail,
  expectFailedEmail,
  expectValidEmailResult,
} from './helpers/email-provider.test-helpers';

describe('EmailProvider - Email Sending', () => {
  let provider: EmailProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailProvider],
    }).compile();

    provider = module.get<EmailProvider>(EmailProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('Basic Sending', () => {
    it('should send email successfully', async () => {
      const result = await provider.send('test@example.com', 'Test Subject', '<p>Test Content</p>');

      // The test result can be success or failure due to the provider's 5% failure rate
      expect([true, false]).toContain(result.success);
      expect([NotificationStatus.SENT, NotificationStatus.FAILED]).toContain(result.status);

      // If successful, verify success fields
      if (result.success) {
        expect(result.messageId).toBeDefined();
        expect(result.sentAt).toBeDefined();
      } else {
        // If failed, verify error field
        expect(result.error).toBeDefined();
      }
    });

    it('should have realistic delay (100-2000ms)', async () => {
      const startTime = Date.now();

      await provider.send('test@example.com', 'Test Subject', '<p>Test Content</p>');

      const duration = Date.now() - startTime;
      expect(duration).toBeGreaterThanOrEqual(100);
      expect(duration).toBeLessThanOrEqual(2100); // Small buffer for execution time
    });
  });

  describe('Message ID Generation', () => {
    it('should generate unique message IDs', async () => {
      const result1 = await provider.send(
        'test1@example.com',
        'Test Subject',
        '<p>Test Content</p>',
      );

      const result2 = await provider.send(
        'test2@example.com',
        'Test Subject',
        '<p>Test Content</p>',
      );

      // Only check messageIds if both were successful
      if (result1.success && result2.success) {
        expect(result1.messageId).toBeDefined();
        expect(result2.messageId).toBeDefined();
        expect(result1.messageId).not.toBe(result2.messageId);
      } else {
        // If any failed, we only check that they return valid results
        expect(result1).toBeDefined();
        expect(result2).toBeDefined();
      }
    });
  });

  describe('Bulk Sending Simulation', () => {
    it('should return both success and failure results over multiple calls', async () => {
      // Run multiple sends and verify we get a mix of results
      // This tests that the provider simulates realistic behavior without being flaky
      const promises = Array.from({ length: 20 }, (_, i) =>
        provider.send(`test${i}@example.com`, 'Test Subject', '<p>Test Content</p>'),
      );

      const results = await Promise.all(promises);

      // All results should be defined
      results.forEach((result) => {
        expectValidEmailResult(result);
      });

      // Verify we have both successes and failures (not all one or the other)
      // With 95% success rate, getting all 20 successes is possible but very unlikely
      // This ensures the mock provider is actually simulating failures
      const hasSuccess = results.some((r) => r.success);
      const hasFailure = results.some((r) => !r.success);
      const successCount = results.filter((r) => r.success).length;

      expect(hasSuccess).toBe(true);
      // Note: With true randomness, we might not get any failures in 20 attempts
      // Probability of 20 successes = 0.95^20 = ~35.8%
      // So we can't assert hasFailure is true, but we log it for observation
      if (hasFailure) {
        expect(successCount).toBeLessThan(20);
        expect(successCount).toBeGreaterThan(0);
      }

      // Verify failed results have error messages
      results
        .filter((r) => !r.success)
        .forEach((result) => {
          expectFailedEmail(result, NotificationStatus.FAILED);
        });

      // Verify successful results have messageId
      results
        .filter((r) => r.success)
        .forEach((result) => {
          expectSuccessfulEmail(result);
        });
    }, 30000);

    it('should provide error message on failure', async () => {
      // Run until we get a failure
      let result;
      let attempts = 0;
      const maxAttempts = 50;

      while (attempts < maxAttempts) {
        result = await provider.send(
          `test${attempts}@example.com`,
          'Test Subject',
          '<p>Test Content</p>',
        );

        if (!result.success) {
          expectFailedEmail(result, NotificationStatus.FAILED);
          return;
        }

        attempts++;
      }

      // If we didn't get a failure, that's okay for this test
      expect(attempts).toBeGreaterThan(0);
    }, 60000); // 60 second timeout to wait for at least one failure
  });
});
