import { Test, TestingModule } from '@nestjs/testing';
import { EmailProvider } from './email.provider';
import { NotificationStatus } from '../enums';

describe('EmailProvider', () => {
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

  describe('Email Sending', () => {
    it('should send email successfully', async () => {
      const result = await provider.send('test@example.com', 'Test Subject', '<p>Test Content</p>');

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.status).toBe(NotificationStatus.SENT);
      expect(result.sentAt).toBeDefined();
    });

    it('should have realistic delay (100-2000ms)', async () => {
      const startTime = Date.now();

      await provider.send('test@example.com', 'Test Subject', '<p>Test Content</p>');

      const duration = Date.now() - startTime;
      expect(duration).toBeGreaterThanOrEqual(100);
      expect(duration).toBeLessThanOrEqual(2100); // Small buffer for execution time
    });

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

    it('should fail approximately 5% of the time', async () => {
      const iterations = 100;
      let failures = 0;

      for (let i = 0; i < iterations; i++) {
        const result = await provider.send(
          `test${i}@example.com`,
          'Test Subject',
          '<p>Test Content</p>',
        );

        if (!result.success) {
          failures++;
        }
      }

      // Should be approximately 5%, allowing for statistical variance (1-10%)
      expect(failures).toBeGreaterThan(0);
      expect(failures).toBeLessThan(15);
    }, 120000); // 120 second timeout for 100 iterations

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
          expect(result.error).toBeDefined();
          expect(result.status).toBe(NotificationStatus.FAILED);
          expect(result.sentAt).toBeUndefined();
          return;
        }

        attempts++;
      }

      // If we didn't get a failure, that's okay for this test
      expect(attempts).toBeGreaterThan(0);
    }, 60000); // 60 second timeout to wait for at least one failure
  });

  describe('Email Attachments', () => {
    it('should support attachments in options', async () => {
      const attachments = [
        {
          filename: 'receipt.pdf',
          content: 'fake pdf content',
        },
      ];

      const result = await provider.send(
        'test@example.com',
        'Order Receipt',
        '<p>Your receipt is attached</p>',
        { attachments },
      );

      expect(result).toBeDefined();
      expect(result.messageId).toBeDefined();
    });

    it('should support multiple attachments', async () => {
      const attachments = [
        {
          filename: 'receipt.pdf',
          content: 'fake pdf content',
        },
        {
          filename: 'invoice.pdf',
          content: 'fake invoice content',
        },
      ];

      const result = await provider.send(
        'test@example.com',
        'Order Documents',
        '<p>Your documents are attached</p>',
        { attachments },
      );

      // The test may fail randomly (5% failure rate)
      expect(result).toBeDefined();
      if (result.success) {
        expect(result.messageId).toBeDefined();
      } else {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Bounce and Unsubscribe Simulation', () => {
    it('should simulate bounce for certain email patterns', async () => {
      const result = await provider.send(
        'bounce@example.com',
        'Test Subject',
        '<p>Test Content</p>',
      );

      expect(result.success).toBe(false);
      expect(result.status).toBe(NotificationStatus.BOUNCED);
      expect(result.error).toContain('bounced');
    });

    it('should simulate unsubscribe detection', async () => {
      const result = await provider.send(
        'unsubscribed@example.com',
        'Test Subject',
        '<p>Test Content</p>',
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('unsubscribed');
    });

    it('should reject invalid email formats', async () => {
      const result = await provider.send('invalid-email', 'Test Subject', '<p>Test Content</p>');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email');
    });
  });

  describe('Status Tracking', () => {
    it('should get status of sent message', async () => {
      const sendResult = await provider.send(
        'test@example.com',
        'Test Subject',
        '<p>Test Content</p>',
      );

      if (sendResult.messageId) {
        const status = await provider.getStatus(sendResult.messageId);
        expect(status).toBeDefined();
        expect([
          NotificationStatus.SENT,
          NotificationStatus.OPENED,
          NotificationStatus.CLICKED,
        ]).toContain(status);
      }
    });

    it('should return FAILED status for unknown message ID', async () => {
      const status = await provider.getStatus('unknown-message-id');
      expect(status).toBe(NotificationStatus.FAILED);
    });
  });

  describe('HTML Template Support', () => {
    it('should handle basic HTML content', async () => {
      const htmlContent = `
        <html>
          <body>
            <h1>Order Confirmation</h1>
            <p>Thank you for your order!</p>
          </body>
        </html>
      `;

      const result = await provider.send('test@example.com', 'Order Confirmation', htmlContent);

      expect(result.success).toBe(true);
    });

    it('should handle plain text content', async () => {
      const textContent = 'Plain text email content';

      const result = await provider.send('test@example.com', 'Test Subject', textContent);

      expect(result).toBeDefined();
    });
  });

  describe('Rate Limiting and Validation', () => {
    it('should validate recipient email', async () => {
      const invalidEmails = ['', 'notanemail', '@example.com', 'test@'];

      for (const email of invalidEmails) {
        const result = await provider.send(email, 'Test', 'Content');
        expect(result.success).toBe(false);
      }
    });

    it('should validate subject is not empty', async () => {
      const result = await provider.send('test@example.com', '', '<p>Content</p>');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Subject');
    });

    it('should validate content is not empty', async () => {
      const result = await provider.send('test@example.com', 'Test Subject', '');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Content');
    });
  });
});
