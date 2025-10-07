import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';

describe('Inventory API (E2E)', () => {
  let app: INestApplication;
  let userToken: string;
  let productId1: string;
  let productId2: string;
describe('Inventory API (E2E)', () => {
  let app: INestApplication;
  let userToken: string;
  let productId1: string;
  let productId2: string;

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
    userToken = registerResponse.body.data.accessToken;

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
    productId1 = product1Response.body.data.id;

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
    productId2 = product2Response.body.data.id;
  });

  afterAll(async () => {
    await app.close();
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
          unitCost: 150.00,
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
        expect.arrayContaining([
          expect.stringContaining('Product ID')
        ])
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

    it('should return 404 for non-existent reservation', async () => {
      const response = await request(app.getHttpServer())
        .put('/inventory/release-reservation')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reservationId: 'non_existent_reservation',
        });

      expect(response.status).toBe(404);
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

    it('should fulfill reservation successfully', async () => {
      const response = await request(app.getHttpServer())
        .put('/inventory/fulfill-reservation')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reservationId: testReservationId,
          orderId: `order_${Date.now()}`,
          reason: 'E2E test fulfillment',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('productId', productId1);
      expect(response.body).toHaveProperty('availableStock');
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
      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('meta');
      expect(response.body.data.meta).toHaveProperty('currentPage', 1);
      expect(response.body.data.meta).toHaveProperty('itemsPerPage', 10);
      expect(Array.isArray(response.body.data.data)).toBe(true);
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
      expect(
        response.body.data.data.every(
          (item: any) => item.status === 'IN_STOCK' || item.availableStock > 0,
        ),
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
      expect(
        response.body.data.data.every(
          (item: any) => item.availableStock >= 10 && item.availableStock <= 200,
        ),
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
      expect(
        response.body.data.data.some((item: any) => item.product?.name?.includes('Test Product')),
      ).toBe(true);
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
      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('meta');
      expect(Array.isArray(response.body.data.data)).toBe(true);
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
      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('meta');
      expect(Array.isArray(response.body.data.data)).toBe(true);
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
      expect(response.body.data).toHaveProperty('totalItems');
      expect(response.body.data).toHaveProperty('totalValue');
      expect(response.body.data).toHaveProperty('lowStockCount');
      expect(response.body.data).toHaveProperty('outOfStockCount');
      expect(response.body).toHaveProperty('statusBreakdown');
      expect(response.body.statusBreakdown).toHaveProperty('IN_STOCK');
      expect(response.body.statusBreakdown).toHaveProperty('LOW_STOCK');
      expect(response.body.statusBreakdown).toHaveProperty('OUT_OF_STOCK');
    });

    it('should get global stats without location filter', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory/stats')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(typeof response.body.data.totalItems).toBe('number');
      expect(typeof response.body.data.totalValue).toBe('number');
    });
  });

  describe('Authentication', () => {
    it('should require authentication for all endpoints', async () => {
      const endpoints = [
        { method: 'post', path: '/inventory/check-availability' },
        { method: 'post', path: '/inventory/reserve' },
        { method: 'put', path: '/inventory/release-reservation' },
        { method: 'put', path: '/inventory/fulfill-reservation' },
        { method: 'post', path: '/inventory/add-stock' },
        { method: 'post', path: '/inventory/remove-stock' },
        { method: 'get', path: `/inventory/product/${productId1}` },
        { method: 'get', path: '/inventory' },
        { method: 'get', path: '/inventory/low-stock' },
        { method: 'get', path: '/inventory/out-of-stock' },
        { method: 'get', path: '/inventory/stats' },
      ];

      for (const endpoint of endpoints) {
        let response: request.Response;

        switch (endpoint.method) {
          case 'post':
            response = await request(app.getHttpServer()).post(endpoint.path);
            break;
          case 'put':
            response = await request(app.getHttpServer()).put(endpoint.path);
            break;
          case 'get':
          default:
            response = await request(app.getHttpServer()).get(endpoint.path);
            break;
        }

        expect(response.status).toBe(401);
      }
    });
  });
});

