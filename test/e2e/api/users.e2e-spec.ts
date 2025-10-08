import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TestAppHelper } from '../../helpers/test-app.helper';

// Helper function to extract data from nested response structure
const extractResponseData = (response: any) => {
  return response.body.data?.data || response.body.data;
};

describe('Users API (E2E)', () => {
  let app: INestApplication;
  let adminToken: string;
  let regularUserToken: string;
  let regularUserId: string;

  beforeAll(async () => {
    app = await TestAppHelper.createTestApp();
  });

  afterAll(async () => {
    await TestAppHelper.closeApp(app);
  });

  beforeEach(async () => {
    await TestAppHelper.cleanDatabase(app);

    // Create admin user for each test
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

    adminToken = extractResponseData(adminRegisterResponse).accessToken;

    // Create regular user for each test
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

    regularUserToken = extractResponseData(regularUserResponse).accessToken;
    regularUserId = extractResponseData(regularUserResponse).user.id;
  });

  describe('GET /users (List with pagination)', () => {
    it('should list users with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      const responseData = extractResponseData(response);
      expect(responseData).toHaveProperty('data');
      expect(responseData).toHaveProperty('meta');
      expect(Array.isArray(responseData.data)).toBe(true);
      expect(responseData.meta).toHaveProperty('page');
      expect(responseData.meta).toHaveProperty('limit');
      expect(responseData.meta).toHaveProperty('total');
    });

    it('should filter by status (isActive)', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: 'active', page: 1, limit: 10 })
        .expect(200);

      const responseData = extractResponseData(response);
      expect(responseData.data).toBeInstanceOf(Array);
      // All users should be active
      responseData.data.forEach((user: any) => {
        expect(user.isActive).toBe(true);
      });
    });

    it('should sort by different fields (createdAt DESC)', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ sortBy: 'createdAt', sortOrder: 'DESC', page: 1, limit: 10 })
        .expect(200);

      const responseData = extractResponseData(response);
      expect(responseData.data).toBeInstanceOf(Array);
      expect(responseData.meta.page).toBe(1);
    });

    it('should sort by email ascending', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ sortBy: 'email', sortOrder: 'ASC', page: 1, limit: 10 })
        .expect(200);

      const responseData = extractResponseData(response);
      expect(responseData.data).toBeInstanceOf(Array);
      if (responseData.data.length > 1) {
        const emails = responseData.data.map((u: any) => u.email);
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

      const responseData = extractResponseData(response);
      expect(responseData).toHaveProperty('id');
      expect(responseData).toHaveProperty('email');
      expect(responseData).toHaveProperty('firstName');
      expect(responseData).toHaveProperty('lastName');
      expect(responseData).toHaveProperty('fullName');
      expect(responseData).not.toHaveProperty('password');
      expect(responseData.id).toBe(regularUserId);
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

      const responseData = extractResponseData(response);
      expect(responseData).toHaveProperty('id');
      expect(responseData.id).toBe(regularUserId);
      expect(responseData).toHaveProperty('email');
      expect(responseData).not.toHaveProperty('password');
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

      const responseData = extractResponseData(response);
      expect(responseData).toHaveProperty('id');
      expect(responseData.email).toBe(newUserData.email);
      expect(responseData.firstName).toBe(newUserData.firstName);
      expect(responseData.lastName).toBe(newUserData.lastName);
      expect(responseData).not.toHaveProperty('password');
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

      const responseData = extractResponseData(response);
      expect(responseData.firstName).toBe(updateData.firstName);
      expect(responseData.lastName).toBe(updateData.lastName);
      expect(responseData.id).toBe(regularUserId);
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

      const userIdToDelete = extractResponseData(createResponse).id;

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

      const userResponseData = extractResponseData(getUserResponse);
      expect(userResponseData.isActive).toBe(false);
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

      const userId = extractResponseData(createResponse).id;

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

      const listData = extractResponseData(listResponse);
      const userIds = listData.data.map((u: any) => u.id);
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

      const userId = extractResponseData(createResponse).id;

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

      const activateData = extractResponseData(activateResponse);
      expect(activateData.isActive).toBe(true);
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

      const userId = extractResponseData(createResponse).id;

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

      const activateData = extractResponseData(activateResponse);
      expect(activateData).toHaveProperty('id');
      expect(activateData.id).toBe(userId);
      expect(activateData.isActive).toBe(true);
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

      const data1 = extractResponseData(response1);
      expect(data1.meta.limit).toBe(5);
      expect(data1.data.length).toBeLessThanOrEqual(5);

      const response2 = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      const data2 = extractResponseData(response2);
      expect(data2.meta.limit).toBe(10);
    });

    it('should not expose password in any response', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(200);

      const profileData = extractResponseData(response);
      expect(profileData).not.toHaveProperty('password');

      // Also check in list
      const listResponse = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const listData = extractResponseData(listResponse);
      listData.data.forEach((user: any) => {
        expect(user).not.toHaveProperty('password');
      });
    });
  });
});
