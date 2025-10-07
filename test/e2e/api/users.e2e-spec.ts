import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';

describe('Users API (E2E)', () => {
  let app: INestApplication;
  let adminToken: string;
  let regularUserToken: string;
  let regularUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply global validation pipe (same as main.ts)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();

    // Create admin user (assuming first user or specific role)
    const adminData = {
      email: `admin${Date.now()}@test.com`,
      password: 'AdminPass123!',
      firstName: 'Admin',
      lastName: 'User',
    };

    const adminRegisterResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send(adminData)
      .expect(201);

    adminToken = adminRegisterResponse.body.data.accessToken;

    // Create regular user
    const regularUserData = {
      email: `user${Date.now()}@test.com`,
      password: 'UserPass123!',
      firstName: 'Regular',
      lastName: 'User',
    };

    const regularUserResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send(regularUserData)
      .expect(201);

    regularUserToken = regularUserResponse.body.data.accessToken;
    regularUserId = regularUserResponse.body.data.user.id;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /users (List with pagination)', () => {
    it('should list users with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('meta');
      expect(Array.isArray(response.body.data.data)).toBe(true);
      expect(response.body.data.meta).toHaveProperty('page');
      expect(response.body.data.meta).toHaveProperty('limit');
      expect(response.body.data.meta).toHaveProperty('total');
    });

    it('should filter by status (isActive)', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: 'active', page: 1, limit: 10 })
        .expect(200);

      expect(response.body.data.data).toBeInstanceOf(Array);
      // All users should be active
      response.body.data.data.forEach((user: any) => {
        expect(user.isActive).toBe(true);
      });
    });

    it('should sort by different fields (createdAt DESC)', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ sortBy: 'createdAt', sortOrder: 'DESC', page: 1, limit: 10 })
        .expect(200);

      expect(response.body.data.data).toBeInstanceOf(Array);
      expect(response.body.data.meta.page).toBe(1);
    });

    it('should sort by email ascending', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ sortBy: 'email', sortOrder: 'ASC', page: 1, limit: 10 })
        .expect(200);

      expect(response.body.data.data).toBeInstanceOf(Array);
      if (response.body.data.data.length > 1) {
        const emails = response.body.data.data.map((u: any) => u.email);
        const sortedEmails = [...emails].sort();
        expect(emails).toEqual(sortedEmails);
      }
    });

    it('should return 401 without authentication token', async () => {
      const response = await request(app.getHttpServer()).get('/users').expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(401);
    });
  });

  describe('GET /users/profile (Current user profile)', () => {
    it('should get profile of authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data).toHaveProperty('firstName');
      expect(response.body.data).toHaveProperty('lastName');
      expect(response.body.data).toHaveProperty('fullName');
      expect(response.body.data).not.toHaveProperty('password');
      expect(response.body.data.id).toBe(regularUserId);
    });

    it('should return 401 without token', async () => {
      const response = await request(app.getHttpServer()).get('/users/profile').expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(401);
    });
  });

  describe('GET /users/:id (Get user by ID)', () => {
    it('should get user by valid ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.id).toBe(regularUserId);
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should return 404 with non-existent ID', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app.getHttpServer())
        .get(`/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(404);
    });

    it('should return 400 with invalid UUID format', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/invalid-uuid-format')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('POST /users (Create user)', () => {
    it('should create user successfully with valid data', async () => {
      const newUserData = {
        email: `newuser${Date.now()}@test.com`,
        passwordHash: 'NewUser123!',
        firstName: 'New',
        lastName: 'User',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUserData)
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.email).toBe(newUserData.email);
      expect(response.body.data.firstName).toBe(newUserData.firstName);
      expect(response.body.data.lastName).toBe(newUserData.lastName);
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should return 409 with duplicate email', async () => {
      const duplicateEmail = `duplicate${Date.now()}@test.com`;
      const userData = {
        email: duplicateEmail,
        passwordHash: 'Duplicate123!',
        firstName: 'Duplicate',
        lastName: 'User',
      };

      // First creation
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(201);

      // Attempt duplicate
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(409);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(409);
    });

    it('should return 401 without authentication', async () => {
      const userData = {
        email: `noauth${Date.now()}@test.com`,
        passwordHash: 'NoAuth123!',
        firstName: 'No',
        lastName: 'Auth',
      };

      const response = await request(app.getHttpServer()).post('/users').send(userData).expect(401);

      expect(response.body.statusCode).toBe(401);
    });
  });

  describe('PATCH /users/:id (Update user)', () => {
    it('should update user successfully', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      const response = await request(app.getHttpServer())
        .patch(`/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.firstName).toBe(updateData.firstName);
      expect(response.body.data.lastName).toBe(updateData.lastName);
      expect(response.body.data.id).toBe(regularUserId);
    });

    it('should return 404 with non-existent ID', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app.getHttpServer())
        .patch(`/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'Updated' })
        .expect(404);

      expect(response.body.statusCode).toBe(404);
    });
  });

  describe('DELETE /users/:id (Soft delete)', () => {
    it('should mark user as deleted (soft delete)', async () => {
      // Create user to delete
      const userData = {
        email: `todelete${Date.now()}@test.com`,
        passwordHash: 'ToDelete123!',
        firstName: 'To',
        lastName: 'Delete',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(201);

      const userIdToDelete = createResponse.body.data.id;

      // Delete user
      await request(app.getHttpServer())
        .delete(`/users/${userIdToDelete}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify user is deactivated but still exists
      const getUserResponse = await request(app.getHttpServer())
        .get(`/users/${userIdToDelete}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(getUserResponse.body.data.isActive).toBe(false);
    });

    it('should not appear in default user listings after soft delete', async () => {
      // Create user
      const userData = {
        email: `hidden${Date.now()}@test.com`,
        passwordHash: 'Hidden123!',
        firstName: 'Hidden',
        lastName: 'User',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(201);

      const userId = createResponse.body.data.id;

      // Delete user
      await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Check listings (status=active by default or no status filter)
      const listResponse = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: 'active' })
        .expect(200);

      const userIds = listResponse.body.data.data.map((u: any) => u.id);
      expect(userIds).not.toContain(userId);
    });

    it('should be able to activate user after soft delete', async () => {
      // Create user
      const userData = {
        email: `reactivate${Date.now()}@test.com`,
        passwordHash: 'Reactivate123!',
        firstName: 'Reactivate',
        lastName: 'User',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(201);

      const userId = createResponse.body.data.id;

      // Soft delete
      await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Activate again
      const activateResponse = await request(app.getHttpServer())
        .patch(`/users/${userId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(activateResponse.body.data.isActive).toBe(true);
    });
  });

  describe('PATCH /users/:id/activate (Activate user)', () => {
    it('should activate deactivated user', async () => {
      // Create and deactivate user
      const userData = {
        email: `activate${Date.now()}@test.com`,
        passwordHash: 'Activate123!',
        firstName: 'Activate',
        lastName: 'User',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(201);

      const userId = createResponse.body.data.id;

      // Deactivate
      await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Activate
      const activateResponse = await request(app.getHttpServer())
        .patch(`/users/${userId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(activateResponse.body.data).toHaveProperty('id');
      expect(activateResponse.body.data.id).toBe(userId);
      expect(activateResponse.body.data.isActive).toBe(true);
    });

    it('should return 404 with non-existent ID', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app.getHttpServer())
        .patch(`/users/${nonExistentId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.statusCode).toBe(404);
    });
  });

  describe('Additional validations', () => {
    it('should handle pagination correctly with different page sizes', async () => {
      const response1 = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 5 })
        .expect(200);

      expect(response1.body.data.meta.limit).toBe(5);
      expect(response1.body.data.data.length).toBeLessThanOrEqual(5);

      const response2 = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response2.body.data.meta.limit).toBe(10);
    });

    it('should not expose password in any response', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(200);

      expect(response.body.data).not.toHaveProperty('password');

      // Also check in list
      const listResponse = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      listResponse.body.data.data.forEach((user: any) => {
        expect(user).not.toHaveProperty('password');
      });
    });
  });
});
