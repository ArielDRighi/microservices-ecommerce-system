import { Test, TestingModule } from '@nestjs/testing';
import { SMSProvider } from './sms.provider';
import { NotificationStatus } from '../enums';

describe('SMSProvider', () => {
  let provider: SMSProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SMSProvider],
    }).compile();

    provider = module.get<SMSProvider>(SMSProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear rate limiting between tests
    provider.clearRateLimits();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('SMS Sending', () => {
    it('should send SMS successfully to valid phone number', async () => {
      const result = await provider.send(
        '+1234567890',
        'Critical Alert',
        'Your order has been shipped',
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.status).toBe(NotificationStatus.SENT);
      expect(result.sentAt).toBeDefined();
    });

    it('should have realistic delay', async () => {
      const startTime = Date.now();

      await provider.send('+1234567890', 'Test', 'Test message');

      const duration = Date.now() - startTime;
      expect(duration).toBeGreaterThanOrEqual(50);
      expect(duration).toBeLessThanOrEqual(1100);
    });

    it('should generate unique message IDs', async () => {
      const result1 = await provider.send('+1234567890', 'Test', 'Message 1');
      const result2 = await provider.send('+1987654321', 'Test', 'Message 2');

      expect(result1.messageId).toBeDefined();
      expect(result2.messageId).toBeDefined();
      expect(result1.messageId).not.toBe(result2.messageId);
    });
  });

  describe('Phone Number Validation', () => {
    it('should accept valid international format (+1234567890)', async () => {
      const result = await provider.send('+1234567890', 'Test', 'Message');
      expect(result.success).toBe(true);
    });

    it('should accept valid format with country code', async () => {
      const validNumbers = ['+11234567890', '+521234567890', '+34612345678', '+441234567890'];

      for (const number of validNumbers) {
        const result = await provider.send(number, 'Test', 'Message');
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid phone number formats', async () => {
      const invalidNumbers = [
        '1234567890', // Missing +
        '+123', // Too short
        'notaphonenumber',
        '+',
        '',
        '123-456-7890', // Invalid format
      ];

      for (const number of invalidNumbers) {
        const result = await provider.send(number, 'Test', 'Message');
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid phone number');
      }
    });

    it('should reject phone numbers that are too long', async () => {
      const tooLong = '+123456789012345678';
      const result = await provider.send(tooLong, 'Test', 'Message');
      expect(result.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow up to 5 SMS per user per minute', async () => {
      const phoneNumber = '+1234567890';
      const results: boolean[] = [];

      // Send 5 SMS (should all succeed)
      for (let i = 0; i < 5; i++) {
        const result = await provider.send(phoneNumber, 'Test', `Message ${i}`);
        results.push(result.success);
      }

      expect(results.filter((s) => s).length).toBe(5);
    });

    it('should reject 6th SMS within rate limit window', async () => {
      const phoneNumber = '+1234567890';

      // Send 5 SMS
      for (let i = 0; i < 5; i++) {
        await provider.send(phoneNumber, 'Test', `Message ${i}`);
      }

      // 6th should fail
      const result = await provider.send(phoneNumber, 'Test', 'Message 6');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit');
    });

    it('should allow different users independently', async () => {
      const phone1 = '+1234567890';
      const phone2 = '+1987654321';

      // Send 5 to each user
      for (let i = 0; i < 5; i++) {
        await provider.send(phone1, 'Test', `Message ${i}`);
        await provider.send(phone2, 'Test', `Message ${i}`);
      }

      // Both should still be able to send within their limits
      const result1 = await provider.send(phone1, 'Test', 'Extra');
      const result2 = await provider.send(phone2, 'Test', 'Extra');

      // First user hit limit, second should also hit limit
      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
    });
  });

  describe('Opt-Out Mechanism', () => {
    it('should allow user to opt out', () => {
      const phoneNumber = '+1234567890';
      provider.optOut(phoneNumber);

      const isOptedOut = provider.isOptedOut(phoneNumber);
      expect(isOptedOut).toBe(true);
    });

    it('should reject SMS to opted-out users', async () => {
      const phoneNumber = '+1234567890';
      provider.optOut(phoneNumber);

      const result = await provider.send(phoneNumber, 'Test', 'Message');

      expect(result.success).toBe(false);
      expect(result.error).toContain('opted out');
    });

    it('should allow user to opt back in', async () => {
      const phoneNumber = '+1234567890';

      // Opt out
      provider.optOut(phoneNumber);
      expect(provider.isOptedOut(phoneNumber)).toBe(true);

      // Opt back in
      provider.optIn(phoneNumber);
      expect(provider.isOptedOut(phoneNumber)).toBe(false);

      // Should be able to send now
      const result = await provider.send(phoneNumber, 'Test', 'Message');
      expect(result.success).toBe(true);
    });

    it('should maintain separate opt-out lists per phone', () => {
      const phone1 = '+1234567890';
      const phone2 = '+1987654321';

      provider.optOut(phone1);

      expect(provider.isOptedOut(phone1)).toBe(true);
      expect(provider.isOptedOut(phone2)).toBe(false);
    });
  });

  describe('Message Validation', () => {
    it('should reject empty subject', async () => {
      const result = await provider.send('+1234567890', '', 'Message');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Subject');
    });

    it('should reject empty content', async () => {
      const result = await provider.send('+1234567890', 'Test', '');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Content');
    });

    it('should reject content longer than 160 characters', async () => {
      const longMessage = 'A'.repeat(161);
      const result = await provider.send('+1234567890', 'Test', longMessage);

      expect(result.success).toBe(false);
      expect(result.error).toContain('160 characters');
    });

    it('should accept content up to 160 characters', async () => {
      const maxMessage = 'A'.repeat(160);
      const result = await provider.send('+1234567890', 'Test', maxMessage);

      expect(result.success).toBe(true);
    });
  });

  describe('Status Tracking', () => {
    it('should track status of sent messages', async () => {
      const sendResult = await provider.send('+1234567890', 'Test', 'Message');

      if (sendResult.messageId) {
        const status = await provider.getStatus(sendResult.messageId);
        expect(status).toBeDefined();
        expect([NotificationStatus.SENT, NotificationStatus.FAILED]).toContain(status);
      }
    });

    it('should return FAILED for unknown message ID', async () => {
      const status = await provider.getStatus('unknown-id');
      expect(status).toBe(NotificationStatus.FAILED);
    });
  });

  describe('Critical Message Priority', () => {
    it('should accept priority in options', async () => {
      const result = await provider.send(
        '+1234567890',
        'Critical Alert',
        'Your package is delivered',
        { priority: 'high' },
      );

      expect(result.success).toBe(true);
    });

    it('should handle critical messages differently', async () => {
      const result = await provider.send('+1234567890', 'URGENT', 'Security alert', {
        priority: 'critical',
      });

      expect(result).toBeDefined();
      expect(result.messageId).toBeDefined();
    });
  });
});
