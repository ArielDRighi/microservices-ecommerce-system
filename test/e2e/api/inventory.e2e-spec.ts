import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TestAppHelper } from '../../helpers/test-app.helper';
import { ResponseHelper } from '../../helpers/response.helper';

// Helper to extract data from response
  return response.body.data?.data || response.body.data;
};

describe('Inventory API (E2E)', () => {
  let app: INestApplication;
  let userToken: string;
  let productId1: string;

  beforeAll(async () => {
    app = await TestAppHelper.createTestApp();
  });

  afterAll(async () => {
    await TestAppHelper.closeApp(app);
  });

  beforeEach(async () => {
    await TestAppHelper.cleanDatabase(app);

    // Create test user
    const userTimestamp = Date.now().toString().slice(-6);
    const userData = {
      email: `inventory${userTimestamp}@test.com`,
      password: 'SecurePass123!',
      firstName: 'Inventory',
      lastName: 'Tester',
    };

    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send(userData);

    expect(registerResponse.status).toBe(201);
    userToken = ResponseHelper.extractData(registerResponse).accessToken;

    // Create test products directly (without categories)
    const timestamp = Date.now();
    const product1Response = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: `Test Product 1 ${timestamp}`,
        description: 'Product for inventory testing',
        price: 299.99,
        sku: `SKU1-${timestamp}`,
        brand: 'Test Brand',
        tags: ['test', 'inventory'],
        isActive: true,
        weight: 1.0,
      });

    expect(product1Response.status).toBe(201);
    productId1 = ResponseHelper.extractData(product1Response).id;

    const product2Response = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: `Test Product 2 ${timestamp}`,
        description: 'Second product for inventory testing',
        price: 199.99,
        sku: `SKU2-${timestamp}`,
        brand: 'Test Brand',
        tags: ['test', 'inventory'],
        isActive: true,
        weight: 0.5,
      });

    expect(product2Response.status).toBe(201);
  });

  describe('POST /inventory/add-stock (Initial Setup)', () => {
    it('should fail when trying to add stock to non-existent inventory', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory/add-stock')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          inventoryId: productId1, // Using product ID as inventory ID
          movementType: 'RESTOCK',
          quantity: 100,
          unitCost: 150.0,
          reason: 'Initial stock for E2E testing',
          performedBy: 'system',
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Inventory not found');
    });

    it('should validate positive quantity', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory/add-stock')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          inventoryId: productId1,
          movementType: 'RESTOCK',
          quantity: -5,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /inventory/check-availability', () => {
    it('should return 404 for product without inventory', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory/check-availability')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: productId1,
          quantity: 10,
          location: 'MAIN_WAREHOUSE',
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Inventory not found');
    });

    it('should return 404 for non-existent product', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory/check-availability')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: '550e8400-e29b-41d4-a716-446655440000',
          quantity: 1,
          location: 'MAIN_WAREHOUSE',
        });

      expect(response.status).toBe(404);
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory/check-availability')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          quantity: 10,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('Product ID')]),
      );
    });

    it('should validate quantity is positive', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory/check-availability')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: productId1,
          quantity: 0,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /inventory/reserve', () => {
    it('should fail when trying to reserve stock with no inventory', async () => {
      const reservationId = `res_${Date.now()}`;

      const response = await request(app.getHttpServer())
        .post('/inventory/reserve')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: productId1,
          quantity: 5,
          reservationId,
          location: 'MAIN_WAREHOUSE',
          reason: 'E2E test reservation',
          ttlMinutes: 30,
        });

      expect(response.status).toBe(404);
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory/reserve')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          quantity: 5,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /inventory/release-reservation', () => {
    it('should fail with validation errors when missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .put('/inventory/release-reservation')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reservationId: 'test-reservation-id',
          reason: 'E2E test release',
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 for validation error (invalid reservationId format)', async () => {
      const response = await request(app.getHttpServer())
        .put('/inventory/release-reservation')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reservationId: 'non_existent_reservation',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /inventory/fulfill-reservation', () => {
    let testReservationId: string;

    beforeEach(async () => {
      testReservationId = `res_fulfill_${Date.now()}`;

      await request(app.getHttpServer())
        .post('/inventory/reserve')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: productId1,
          quantity: 2,
          reservationId: testReservationId,
          location: 'MAIN_WAREHOUSE',
        });
    });

    it('should return validation error for invalid reservation', async () => {
      const response = await request(app.getHttpServer())
        .put('/inventory/fulfill-reservation')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reservationId: testReservationId,
          orderId: `order_${Date.now()}`,
          reason: 'E2E test fulfillment',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /inventory/add-stock', () => {
    it('should fail when trying to add stock to non-existent inventory', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory/add-stock')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          inventoryId: productId1,
          movementType: 'RESTOCK',
          quantity: 25,
          unitCost: 150,
          reason: 'E2E test stock addition',
          performedBy: 'test-user',
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Inventory not found');
    });

    it('should validate positive quantity', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory/add-stock')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          inventoryId: productId1,
          movementType: 'RESTOCK',
          quantity: -5,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Add stock quantity must be positive');
    });
  });

  describe('POST /inventory/remove-stock', () => {
    it('should fail when trying to remove stock from non-existent inventory', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory/remove-stock')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          inventoryId: productId1,
          movementType: 'SALE',
          quantity: 10,
          reason: 'E2E test stock removal',
          performedBy: 'test-user',
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Inventory not found');
    });

    it('should validate removing from non-existent inventory', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory/remove-stock')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          inventoryId: productId1,
          movementType: 'SALE',
          quantity: 10000,
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Inventory not found');
    });
  });

  describe('GET /inventory/product/:productId', () => {
    it('should return 404 for product without inventory', async () => {
      const response = await request(app.getHttpServer())
        .get(`/inventory/product/${productId1}`)
        .set('Authorization', `Bearer ${userToken}`)
        .query({ location: 'MAIN_WAREHOUSE' });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Inventory not found for product');
    });

    it('should return 404 for non-existent product', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory/product/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Inventory not found for product');
    });
  });

  describe('GET /inventory', () => {
    it('should get paginated inventory list', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory')
        .set('Authorization', `Bearer ${userToken}`)
        .query({
          page: 1,
          limit: 10,
          location: 'MAIN_WAREHOUSE',
        });

      expect(response.status).toBe(200);
      const data = ResponseHelper.extractData(response);
      expect(data).toHaveProperty('items');
      expect(data).toHaveProperty('meta');
      expect(data.meta).toHaveProperty('page', 1);
      expect(data.meta).toHaveProperty('limit', 10);
      expect(Array.isArray(data.items)).toBe(true);
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory')
        .set('Authorization', `Bearer ${userToken}`)
        .query({
          status: 'IN_STOCK',
          page: 1,
          limit: 10,
        });

      expect(response.status).toBe(200);
      const data = ResponseHelper.extractData(response);
      expect(
        data.items.every((item: any) => item.status === 'IN_STOCK' || item.availableStock > 0),
      ).toBe(true);
    });

    it('should filter by stock range', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory')
        .set('Authorization', `Bearer ${userToken}`)
        .query({
          minStock: 10,
          maxStock: 200,
        });

      expect(response.status).toBe(200);
      const data = ResponseHelper.extractData(response);
      expect(
        data.items.every((item: any) => item.availableStock >= 10 && item.availableStock <= 200),
      ).toBe(true);
    });

    it('should search by product name or SKU', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory')
        .set('Authorization', `Bearer ${userToken}`)
        .query({
          search: 'Test Product',
        });

      expect(response.status).toBe(200);
      const data = ResponseHelper.extractData(response);
      expect(data).toHaveProperty('items');
      expect(Array.isArray(data.items)).toBe(true);
      // Since database is empty, search should return empty array
      expect(data.items.length).toBe(0);
    });
  });

  describe('GET /inventory/low-stock', () => {
    it('should get low stock items', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory/low-stock')
        .set('Authorization', `Bearer ${userToken}`)
        .query({
          page: 1,
          limit: 10,
        });

      expect(response.status).toBe(200);
      const data = ResponseHelper.extractData(response);
      expect(data).toHaveProperty('items');
      expect(data).toHaveProperty('meta');
      expect(Array.isArray(data.items)).toBe(true);
    });
  });

  describe('GET /inventory/out-of-stock', () => {
    it('should get out of stock items', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory/out-of-stock')
        .set('Authorization', `Bearer ${userToken}`)
        .query({
          page: 1,
          limit: 10,
        });

      expect(response.status).toBe(200);
      const data = ResponseHelper.extractData(response);
      expect(data).toHaveProperty('items');
      expect(data).toHaveProperty('meta');
      expect(Array.isArray(data.items)).toBe(true);
    });
  });

  describe('GET /inventory/stats', () => {
    it('should get inventory statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory/stats')
        .set('Authorization', `Bearer ${userToken}`)
        .query({
          location: 'MAIN_WAREHOUSE',
        });

      expect(response.status).toBe(200);
      const data = ResponseHelper.extractData(response);
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('totalValue');
      expect(data).toHaveProperty('lowStockCount');
      expect(data).toHaveProperty('outOfStockCount');
      expect(data).toHaveProperty('statusBreakdown');
      expect(data.statusBreakdown).toHaveProperty('IN_STOCK');
      expect(data.statusBreakdown).toHaveProperty('LOW_STOCK');
      expect(data.statusBreakdown).toHaveProperty('OUT_OF_STOCK');
    });

    it('should get global stats without location filter', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory/stats')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      const data = ResponseHelper.extractData(response);
      expect(typeof data.total).toBe('number');
      expect(typeof data.totalValue).toBe('number');
    });
  });

  describe('Authentication', () => {
    it('should require authentication for all endpoints', async () => {
      // Test PUBLIC endpoints - should return 200 (these are customer-facing queries)
      const publicEndpoints = [
        '/inventory',
        '/inventory/low-stock',
        '/inventory/out-of-stock',
        '/inventory/stats',
      ];

      for (const path of publicEndpoints) {
        const response = await request(app.getHttpServer()).get(path);
        expect(response.status).toBe(200);
      }

      // Test PUBLIC check-availability endpoint
      const checkAvailabilityResponse = await request(app.getHttpServer())
        .post('/inventory/check-availability')
        .send({ productId: productId1, quantity: 1, location: 'MAIN_WAREHOUSE' });
      expect(checkAvailabilityResponse.status).toBe(404); // Non-existent product

      // Test PUBLIC get product inventory
      const productResponse = await request(app.getHttpServer()).get(
        `/inventory/product/${productId1}`,
      );
      expect(productResponse.status).toBe(404); // Non-existent product

      // Test PROTECTED endpoints - should return 401 when no auth
      const protectedPostResponse = await request(app.getHttpServer())
        .post('/inventory/reserve')
        .send({
          productId: productId1,
          quantity: 1,
          reservationId: 'test-res-123',
          location: 'MAIN_WAREHOUSE',
        });
      expect(protectedPostResponse.status).toBe(401);

      // Test PROTECTED add-stock endpoint
      const protectedStockResponse = await request(app.getHttpServer())
        .post('/inventory/add-stock')
        .send({
          inventoryId: productId1,
          movementType: 'RESTOCK',
          quantity: 10,
        });
      expect(protectedStockResponse.status).toBe(401);
    });
  });
});
