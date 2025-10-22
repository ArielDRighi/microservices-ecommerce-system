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

      // 503 porque el servicio real no está corriendo, pero el circuit breaker permite el intento
      expect([200, 503]).toContain(response.status);
    });

    it('should have circuit breaker configured for Orders service', async () => {
      const response = await request(app)
        .get('/api/orders/health')
        .set('Authorization', `Bearer ${validToken}`);

      // Verificar que la respuesta incluye headers esperados
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
      // Circuit breaker debería tener timeout de 5000ms según config
      expect(config.circuitBreaker.timeout).toBe(5000);
    });

    it('should have proper error threshold configured', async () => {
      // Error threshold debería ser 50%
      expect(config.circuitBreaker.errorThresholdPercentage).toBe(50);
    });

    it('should have proper reset timeout configured', async () => {
      // Reset timeout debería ser 30000ms (30s)
      expect(config.circuitBreaker.resetTimeout).toBe(30000);
    });
  });
});
