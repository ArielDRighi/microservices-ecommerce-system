import request from 'supertest';
import { app } from '../app';

describe('Proxy Routes', () => {
  describe('Health and Ready endpoints', () => {
    it('should not proxy health check endpoints', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('UP');
    });

    it('should not proxy readiness check endpoints', async () => {
      const response = await request(app).get('/ready');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('READY');
    });
  });

  describe('Proxy configuration', () => {
    it('should attempt to proxy /api/orders/* routes', async () => {
      // This will fail with ECONNREFUSED since orders-service is not running
      // but it proves the proxy route is configured
      const response = await request(app).get('/api/orders/test');

      // Expect 503 Service Unavailable from our error handler
      expect([503, 500]).toContain(response.status);
    });

    it('should attempt to proxy /api/inventory/* routes', async () => {
      // This will fail with ECONNREFUSED since inventory-service is not running
      // but it proves the proxy route is configured
      const response = await request(app).get('/api/inventory/test');

      // Expect 503 Service Unavailable from our error handler
      expect([503, 500]).toContain(response.status);
    });
  });

  describe('Non-proxied routes', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown-route');

      expect(response.status).toBe(404);
    });
  });
});
