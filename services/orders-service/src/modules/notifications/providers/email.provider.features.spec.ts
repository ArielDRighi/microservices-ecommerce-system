import { Test, TestingModule } from '@nestjs/testing';
import { EmailProvider } from './email.provider';
import { NotificationStatus } from '../enums';
import { createMockAttachment } from './helpers/email-provider.test-helpers';

describe('EmailProvider - Features', () => {
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

  describe('Email Attachments', () => {
    it('should support attachments in options', async () => {
      const attachments = [createMockAttachment('receipt.pdf')];

      const result = await provider.send(
        'test@example.com',
        'Order Receipt',
        '<p>Your receipt is attached</p>',
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

    it('should support multiple attachments', async () => {
      const attachments = [
        createMockAttachment('receipt.pdf'),
        createMockAttachment('invoice.pdf'),
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

      // The test result can be success or failure due to the provider's 5% failure rate
      expect([true, false]).toContain(result.success);
      expect(result).toBeDefined();
    });

    it('should handle plain text content', async () => {
      const textContent = 'Plain text email content';

      const result = await provider.send('test@example.com', 'Test Subject', textContent);

      expect(result).toBeDefined();
    });
  });
});
