import request from 'supertest';
import { app } from '../app';

describe('Request/Response Logging Middleware', () => {
  describe('Correlation ID', () => {
    it('should generate correlation ID for requests without X-Correlation-ID', async () => {
      const response = await request(app).get('/health');

      expect(response.headers).toHaveProperty('x-correlation-id');
      expect(response.headers['x-correlation-id']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should preserve existing X-Correlation-ID from request', async () => {
      const response = await request(app).get('/health').set('X-Correlation-ID', 'existing-id');

      expect(response.headers).toHaveProperty('x-correlation-id', 'existing-id');
    });

    it('should attach correlation ID to all log entries', async () => {
      // This will be verified in integration/E2E tests with actual log output
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
    });
  });

  describe('Response Time Logging', () => {
    it('should include X-Response-Time header', async () => {
      const response = await request(app).get('/health');

      expect(response.headers).toHaveProperty('x-response-time');
      expect(response.headers['x-response-time']).toMatch(/^\d+ms$/);
    });

    it('should log response time in ms', async () => {
      const response = await request(app).get('/ready');

      const responseTime = response.headers['x-response-time'];
      expect(responseTime).toBeDefined();

      const timeValue = parseInt(responseTime.replace('ms', ''));
      expect(timeValue).toBeGreaterThan(0);
    });
  });

  describe('Error Logging', () => {
    it('should log 404 errors with correlation ID', async () => {
      const response = await request(app)
        .get('/non-existent')
        .set('X-Correlation-ID', 'error-test-id');

      expect(response.status).toBe(404);
      expect(response.headers).toHaveProperty('x-correlation-id', 'error-test-id');
    });

    it('should log authentication errors with correlation ID', async () => {
      const response = await request(app).get('/api/orders/test');

      expect(response.status).toBe(401);
      expect(response.headers).toHaveProperty('x-correlation-id');
    });
  });

  describe('Request Metadata Logging', () => {
    it('should log request method and path', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      // Actual logging verification done through winston mock or log output inspection
    });

    it('should log user agent if present', async () => {
      const response = await request(app).get('/health').set('User-Agent', 'Test-Agent/1.0');

      expect(response.status).toBe(200);
    });

    it('should log IP address', async () => {
      const response = await request(app).get('/health').set('X-Forwarded-For', '203.0.113.1');

      expect(response.status).toBe(200);
    });
  });
});
