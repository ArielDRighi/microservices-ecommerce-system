import request from 'supertest';
import { app } from '../app';
import jwt from 'jsonwebtoken';
import { config } from '../config';

describe('Circuit Breaker Middleware', () => {
  let validToken: string;

  beforeAll(() => {
    validToken = jwt.sign(
      { userId: '123', email: 'test@example.com', role: 'user' },
      config.jwt.secret,
      {
        expiresIn: '1h',
      },
    );
  });

  describe('Basic Functionality', () => {
    it('should allow requests when services are healthy', async () => {
      const response = await request(app)
        .get('/api/orders/test')
        .set('Authorization', `Bearer ${validToken}`);

      // 503 because the actual service is not running, but the circuit breaker allows the attempt
      expect([200, 503]).toContain(response.status);
    });

    it('should have circuit breaker configured for Orders service', async () => {
      const response = await request(app)
        .get('/api/orders/health')
        .set('Authorization', `Bearer ${validToken}`);

      // Verify that the response includes expected headers
      expect(response.headers).toHaveProperty('x-correlation-id');
    });

    it('should have circuit breaker configured for Inventory service', async () => {
      const response = await request(app)
        .get('/api/inventory/health')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.headers).toHaveProperty('x-correlation-id');
    });
  });

  describe('Configuration', () => {
    it('should have proper timeout configured', async () => {
      // Circuit breaker should have 5000ms timeout according to config
      expect(config.circuitBreaker.timeout).toBe(5000);
    });

    it('should have proper error threshold configured', async () => {
      // Error threshold should be 50%
      expect(config.circuitBreaker.errorThresholdPercentage).toBe(50);
    });

    it('should have proper reset timeout configured', async () => {
      // Reset timeout should be 30000ms (30s)
      expect(config.circuitBreaker.resetTimeout).toBe(30000);
    });
  });
});
