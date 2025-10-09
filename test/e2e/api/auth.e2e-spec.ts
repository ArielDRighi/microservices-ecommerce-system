import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TestAppHelper } from '../../helpers/test-app.helper';
import { ResponseHelper } from '../../helpers/response.helper';
import { AuthResponse, UserProfileResponse, LogoutResponse } from '../../types/api-responses';

describe('Auth API (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await TestAppHelper.createTestApp();
  });

  beforeEach(async () => {
    await TestAppHelper.cleanDatabase(app);
  });

  afterAll(async () => {
    await TestAppHelper.closeApp(app);
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully with valid data', async () => {
      const validRegisterData = {
        email: `newuser${Date.now()}@test.com`,
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      };
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(validRegisterData)
        .expect(201);

      // The actual data is nested due to response interceptor
      const authData = response.body.data.data;

      expect(authData).toHaveProperty('user');
      expect(authData).toHaveProperty('accessToken');
      expect(authData).toHaveProperty('refreshToken');

      expect(authData.user).toHaveProperty('id');
      expect(authData.user.email).toBe(validRegisterData.email);
      expect(authData.user.firstName).toBe(validRegisterData.firstName);
      expect(authData.user.lastName).toBe(validRegisterData.lastName);
      expect(authData.user).not.toHaveProperty('password');

      expect(typeof authData.accessToken).toBe('string');
      expect(authData.accessToken.length).toBeGreaterThan(0);
      expect(typeof authData.refreshToken).toBe('string');
      expect(authData.refreshToken.length).toBeGreaterThan(0);
    });

    it('should return 409 when registering with duplicate email', async () => {
      const duplicateEmail = `duplicate${Date.now()}@test.com`;
      const registerData = {
        email: duplicateEmail,
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      // First registration
      await request(app.getHttpServer()).post('/auth/register').send(registerData).expect(201);

      // Attempt duplicate registration
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerData)
        .expect(409);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(409);
    });

    it('should return 400 with invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email-format',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(400);
      expect(Array.isArray(response.body.message)).toBe(true);
    });

    it('should return 400 with weak password (no special character)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `weak1${Date.now()}@test.com`,
          password: 'WeakPass123',
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(400);
      expect(JSON.stringify(response.body.message)).toContain('special character');
    });

    it('should return 400 with weak password (too short)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `weak2${Date.now()}@test.com`,
          password: 'Pass1!',
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(400);
      expect(JSON.stringify(response.body.message)).toContain('at least 8 characters');
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `incomplete${Date.now()}@test.com`,
          // Missing password, firstName, lastName
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(400);
      expect(Array.isArray(response.body.message)).toBe(true);
    });

    it('should trim and lowercase email automatically', async () => {
      const timestamp = Date.now();
      const registerData = {
        email: `  TrimUser${timestamp}@TEST.COM  `,
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerData)
        .expect(201);

      const authData = ResponseHelper.extractData<AuthResponse>(response);
      expect(authData.user.email).toBe(`trimuser${timestamp}@test.com`);
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const registerData = {
        email: `loginuser${Date.now()}@test.com`,
        password: 'LoginPass123!',
        firstName: 'Login',
        lastName: 'User',
      };

      // Register user first
      await request(app.getHttpServer()).post('/auth/register').send(registerData).expect(201);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: registerData.email,
          password: registerData.password,
        })
        .expect(200);

      const authData = ResponseHelper.extractData<AuthResponse>(response);
      expect(authData).toHaveProperty('user');
      expect(authData).toHaveProperty('accessToken');
      expect(authData).toHaveProperty('refreshToken');

      expect(authData.user.email).toBe(registerData.email);
      expect(typeof authData.accessToken).toBe('string');
      expect(authData.accessToken.length).toBeGreaterThan(0);
    });

    it('should return both accessToken and refreshToken', async () => {
      const registerData = {
        email: `tokenuser${Date.now()}@test.com`,
        password: 'TokenPass123!',
        firstName: 'Token',
        lastName: 'User',
      };

      // Register user first
      await request(app.getHttpServer()).post('/auth/register').send(registerData).expect(201);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: registerData.email,
          password: registerData.password,
        })
        .expect(200);

      const authData = ResponseHelper.extractData<AuthResponse>(response);
      expect(authData).toHaveProperty('accessToken');
      expect(authData).toHaveProperty('refreshToken');
      expect(typeof authData.accessToken).toBe('string');
      expect(typeof authData.refreshToken).toBe('string');
      expect(authData.accessToken).not.toBe(authData.refreshToken);
    });

    it('should return 401 with incorrect email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: `nonexistent${Date.now()}@test.com`,
          password: 'SomePass123!',
        })
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(401);
    });

    it('should return 401 with incorrect password', async () => {
      const registerData = {
        email: `wrongpass${Date.now()}@test.com`,
        password: 'CorrectPass123!',
        firstName: 'Wrong',
        lastName: 'Pass',
      };

      // Register user first
      await request(app.getHttpServer()).post('/auth/register').send(registerData).expect(201);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: registerData.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(401);
    });

    it('should return 400 with invalid request format', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          // Missing email and password
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(400);
    });

    it('should be case-insensitive for email login', async () => {
      const registerData = {
        email: `casetest${Date.now()}@test.com`,
        password: 'CasePass123!',
        firstName: 'Case',
        lastName: 'Test',
      };

      // Register user first
      await request(app.getHttpServer()).post('/auth/register').send(registerData).expect(201);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: registerData.email.toUpperCase(),
          password: registerData.password,
        })
        .expect(200);

      const authData = ResponseHelper.extractData<AuthResponse>(response);
      expect(authData).toHaveProperty('accessToken');
      expect(authData.user.email).toBe(registerData.email.toLowerCase());
    });
  });

  describe('GET /auth/profile', () => {
    it('should get user profile with valid token', async () => {
      const userData = {
        email: `profile${Date.now()}@test.com`,
        password: 'ProfilePass123!',
        firstName: 'Profile',
        lastName: 'User',
      };

      // Register and get token
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(201);

      const accessToken = ResponseHelper.extractData<AuthResponse>(registerResponse).accessToken;

      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const profileData = ResponseHelper.extractData<UserProfileResponse>(response);
      expect(profileData).toHaveProperty('id');
      expect(profileData).toHaveProperty('email');
      expect(profileData).toHaveProperty('firstName');
      expect(profileData).toHaveProperty('lastName');
      expect(profileData).toHaveProperty('fullName');
      expect(profileData).toHaveProperty('isActive');

      expect(profileData.email).toBe(userData.email);
      expect(profileData.firstName).toBe(userData.firstName);
      expect(profileData.lastName).toBe(userData.lastName);
      expect(profileData).not.toHaveProperty('password');
    });

    it('should return 401 when no token is provided', async () => {
      const response = await request(app.getHttpServer()).get('/auth/profile').expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(401);
    });

    it('should return 401 with invalid token format', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token-format')
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(401);
    });

    it('should return 401 with malformed token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid')
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully with valid token', async () => {
      const userData = {
        email: `logout${Date.now()}@test.com`,
        password: 'LogoutPass123!',
        firstName: 'Logout',
        lastName: 'User',
      };

      // Register and get token
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(201);

      const accessToken = ResponseHelper.extractData<AuthResponse>(registerResponse).accessToken;

      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const logoutData = ResponseHelper.extractData<LogoutResponse>(response);
      expect(logoutData).toHaveProperty('message');
      expect(logoutData).toHaveProperty('success');
      expect(logoutData.success).toBe(true);
      expect(logoutData.message).toContain('logged out');
    });

    it('should return 401 when no token is provided for logout', async () => {
      const response = await request(app.getHttpServer()).post('/auth/logout').expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh token successfully with valid refreshToken', async () => {
      const userData = {
        email: `refresh${Date.now()}@test.com`,
        password: 'RefreshPass123!',
        firstName: 'Refresh',
        lastName: 'User',
      };

      // Register and get tokens
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(201);

      const refreshToken = ResponseHelper.extractData<AuthResponse>(registerResponse).refreshToken;

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      const refreshData = ResponseHelper.extractData<AuthResponse>(response);
      expect(refreshData).toHaveProperty('accessToken');
      expect(refreshData).toHaveProperty('refreshToken');
      expect(typeof refreshData.accessToken).toBe('string');
      expect(refreshData.accessToken.length).toBeGreaterThan(0);
    });

    it('should return 401 with invalid refreshToken', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(401);
    });
  });
});
