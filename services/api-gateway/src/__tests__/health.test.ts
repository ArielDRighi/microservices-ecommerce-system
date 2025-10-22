import request from 'supertest';
import { app } from '../index';

describe('Health Check Endpoints', () => {
  describe('GET /health', () => {
    it('should return 200 and health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'UP');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('service', 'api-gateway');
      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.uptime).toBe('number');
    });

    it('should return a valid ISO timestamp', async () => {
      const response = await request(app).get('/health');

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.toString()).not.toBe('Invalid Date');
    });
  });

  describe('GET /ready', () => {
    it('should return 200 and readiness status', async () => {
      const response = await request(app).get('/ready');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'READY');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return a valid ISO timestamp', async () => {
      const response = await request(app).get('/ready');

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.toString()).not.toBe('Invalid Date');
    });
  });

  describe('Error handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app).get('/non-existent-route');

      expect(response.status).toBe(404);
    });
  });
});
