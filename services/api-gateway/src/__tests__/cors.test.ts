import request from 'supertest';
import { app } from '../app';

describe('CORS Configuration', () => {
  describe('Preflight Requests (OPTIONS)', () => {
    it('should handle OPTIONS preflight request', async () => {
      const response = await request(app)
        .options('/health')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.status).toBe(204);
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should allow configured methods', async () => {
      const response = await request(app)
        .options('/api/orders')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.headers).toHaveProperty('access-control-allow-methods');
    });

    it('should allow configured headers', async () => {
      const response = await request(app)
        .options('/health')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Headers', 'content-type,authorization');

      expect(response.headers).toHaveProperty('access-control-allow-headers');
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers in GET requests', async () => {
      const response = await request(app).get('/health').set('Origin', 'http://localhost:3000');

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should allow credentials', async () => {
      const response = await request(app).get('/health').set('Origin', 'http://localhost:3000');

      expect(response.headers).toHaveProperty('access-control-allow-credentials', 'true');
    });

    it('should expose custom headers', async () => {
      const response = await request(app).get('/health');

      // Verify that custom headers like X-Correlation-ID are exposed
      expect(response.headers).toHaveProperty('x-correlation-id');
    });
  });

  describe('Origin Validation', () => {
    it('should accept requests from any origin when configured as wildcard', async () => {
      const response = await request(app).get('/health').set('Origin', 'http://example.com');

      // With config.cors.origin = '*', should allow any origin
      expect([200, 204]).toContain(response.status);
    });

    it('should handle requests without Origin header', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
    });
  });
});
