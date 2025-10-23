import request from 'supertest';
import { app } from '../app';
import { mockIncr, mockExpire, mockTtl } from './setup';

describe('Rate Limiter Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIncr.mockResolvedValue(1);
    mockTtl.mockResolvedValue(60);
    mockExpire.mockResolvedValue(1);
  });

  describe('Request Limiting', () => {
    it('should allow requests under the rate limit', async () => {
      mockIncr.mockResolvedValue(50);

      const response = await request(app).get('/health').set('X-Forwarded-For', '192.168.1.1');

      expect(response.status).toBe(200);
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
    });

    it('should block requests exceeding the rate limit', async () => {
      mockIncr.mockResolvedValue(101);

      const response = await request(app).get('/health').set('X-Forwarded-For', '192.168.1.1');

      expect(response.status).toBe(429);
      expect(response.body).toHaveProperty('error', 'Too Many Requests');
      expect(response.body).toHaveProperty('retryAfter');
    });

    it('should set correct rate limit headers', async () => {
      mockIncr.mockResolvedValue(50);

      const response = await request(app).get('/health').set('X-Forwarded-For', '192.168.1.1');

      expect(response.headers).toHaveProperty('x-ratelimit-limit', '100');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });

    it('should reset rate limit after window expiration', async () => {
      mockIncr.mockResolvedValue(1);

      const response = await request(app).get('/health').set('X-Forwarded-For', '192.168.1.1');

      expect(response.status).toBe(200);
      expect(mockExpire).toHaveBeenCalled();
    });
  });

  describe('IP Address Detection', () => {
    it('should use X-Forwarded-For header if present', async () => {
      await request(app).get('/health').set('X-Forwarded-For', '203.0.113.1');

      expect(mockIncr).toHaveBeenCalledWith(expect.stringContaining('203.0.113.1'));
    });

    it('should use X-Real-IP header as fallback', async () => {
      await request(app).get('/health').set('X-Real-IP', '203.0.113.2');

      expect(mockIncr).toHaveBeenCalledWith(expect.stringContaining('203.0.113.2'));
    });

    it('should use req.ip as final fallback', async () => {
      await request(app).get('/health');

      expect(mockIncr).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should allow request if Redis is unavailable (fail-open)', async () => {
      mockIncr.mockRejectedValue(new Error('Redis connection failed'));

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
    });
  });
});
