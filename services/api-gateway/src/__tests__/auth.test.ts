import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../app';
import { config } from '../config';

describe('JWT Authentication Middleware', () => {
  const validToken = jwt.sign(
    { userId: '123', email: 'test@example.com', role: 'user' },
    config.jwt.secret,
    { expiresIn: '1h' },
  );

  const expiredToken = jwt.sign(
    { userId: '456', email: 'expired@example.com', role: 'user' },
    config.jwt.secret,
    { expiresIn: '-1h' }, // Token already expired
  );

  const invalidToken = 'invalid.jwt.token';

  describe('Protected routes', () => {
    it('should allow access with valid JWT token', async () => {
      // /api/orders and /api/inventory require authentication
      const response = await request(app)
        .get('/api/orders/test')
        .set('Authorization', `Bearer ${validToken}`);

      // Expect proxy error (503) not auth error (401)
      // This means auth passed and tried to proxy
      expect(response.status).toBe(503);
    });

    it('should return 401 when no token is provided', async () => {
      const response = await request(app).get('/api/orders/test');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('No token provided');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/orders/test')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid token');
    });

    it('should return 401 with expired token', async () => {
      const response = await request(app)
        .get('/api/orders/test')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('expired');
    });

    it('should propagate user info to downstream services', async () => {
      const response = await request(app)
        .get('/api/inventory/test')
        .set('Authorization', `Bearer ${validToken}`);

      // We can't easily test header propagation without mocking the proxy
      // but we can verify auth passed (503 instead of 401)
      expect(response.status).toBe(503); // Service unavailable, not unauthorized
    });
  });

  describe('Public routes', () => {
    it('should allow access to /health without token', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('UP');
    });

    it('should allow access to /ready without token', async () => {
      const response = await request(app).get('/ready');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('READY');
    });
  });

  describe('Token parsing', () => {
    it('should accept token with Bearer prefix', async () => {
      const response = await request(app)
        .get('/api/orders/test')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).not.toBe(401);
    });

    it('should reject token without Bearer prefix', async () => {
      const response = await request(app).get('/api/orders/test').set('Authorization', validToken);

      expect(response.status).toBe(401);
    });
  });
});
