import { Test, TestingModule } from '@nestjs/testing';
import { EmailProvider } from './email.provider';
import { NotificationStatus } from '../enums';

describe('EmailProvider - Validation and Errors', () => {
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

  describe('Email Validation', () => {
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

    it('should reject invalid email formats', async () => {
      const result = await provider.send('invalid-email', 'Test Subject', '<p>Test Content</p>');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email');
    });
  });

  describe('Bounce Simulation', () => {
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
  });

  describe('Unsubscribe Simulation', () => {
    it('should simulate unsubscribe detection', async () => {
      const result = await provider.send(
        'unsubscribed@example.com',
        'Test Subject',
        '<p>Test Content</p>',
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('unsubscribed');
    });
  });
});
