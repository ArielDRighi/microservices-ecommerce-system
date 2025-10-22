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
    it('should require authentication for /api/orders/* routes', async () => {
      // Without token, should return 401
      const response = await request(app).get('/api/orders/test');

      // Expect 401 Unauthorized (no token provided)
      expect(response.status).toBe(401);
      expect(response.body.error).toContain('No token provided');
    });

    it('should require authentication for /api/inventory/* routes', async () => {
      // Without token, should return 401
      const response = await request(app).get('/api/inventory/test');

      // Expect 401 Unauthorized (no token provided)
      expect(response.status).toBe(401);
      expect(response.body.error).toContain('No token provided');
    });
  });

  describe('Non-proxied routes', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown-route');

      expect(response.status).toBe(404);
    });
  });
});
