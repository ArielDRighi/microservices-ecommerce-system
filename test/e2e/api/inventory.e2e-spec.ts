import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TestAppHelper } from '../../helpers/test-app.helper';
import { ResponseHelper } from '../../helpers/response.helper';

// Helper to extract data from response

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
    userToken = ResponseHelper.extractData<{ accessToken: string }>(registerResponse).accessToken;

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
    productId1 = ResponseHelper.extractData<{ id: string }>(product1Response).id;

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
      const data = ResponseHelper.extractData<any>(response);
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
      const data = ResponseHelper.extractData<any>(response);
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
      const data = ResponseHelper.extractData<any>(response);
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
      const data = ResponseHelper.extractData<any>(response);
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
      const data = ResponseHelper.extractData<any>(response);
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
      const data = ResponseHelper.extractData<any>(response);
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
      const data = ResponseHelper.extractData<any>(response);
      expect(data).toHaveProperty('totalItems');
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
      const data = ResponseHelper.extractData<any>(response);
      expect(typeof data.totalItems).toBe('number');
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

  // ========================================================================
  // NEW TESTS - Task 6: POST /inventory and Reservation Improvements
  // ========================================================================

  describe('POST /inventory (Create Inventory via API)', () => {
    let testProductId: string;

    beforeEach(async () => {
      // Create a test product first
      const timestamp = Date.now();
      const productResponse = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: `Product for Inventory ${timestamp}`,
          description: 'Product for inventory creation test',
          price: 299.99,
          sku: `SKU-CREATE-${timestamp}`,
          brand: 'Test Brand',
          isActive: true,
        });

      expect(productResponse.status).toBe(201);
      testProductId = ResponseHelper.extractData<{ id: string }>(productResponse).id;
    });

    it('should create inventory with minimal required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProductId,
          sku: `SKU-MIN-${Date.now()}`,
          initialStock: 100,
        });

      expect(response.status).toBe(201);
      const data = ResponseHelper.extractData<any>(response);

      expect(data.id).toBeDefined();
      expect(data.productId).toBe(testProductId);
      expect(data.physicalStock).toBe(100);
      expect(data.reservedStock).toBe(0);
      expect(data.availableStock).toBe(100);
      expect(data.location).toBe('MAIN_WAREHOUSE'); // Default value
      expect(data.minimumStock).toBe(10); // Default value
    });

    it('should create inventory with all optional fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProductId,
          sku: `SKU-COMPLETE-${Date.now()}`,
          location: 'SECONDARY_WAREHOUSE',
          initialStock: 250,
          minimumStock: 25,
          maximumStock: 2500,
          reorderPoint: 50,
          reorderQuantity: 100,
          notes: 'Test inventory with full configuration',
        });

      expect(response.status).toBe(201);
      const data = ResponseHelper.extractData<any>(response);

      expect(data.location).toBe('SECONDARY_WAREHOUSE');
      expect(data.physicalStock).toBe(250);
      expect(data.minimumStock).toBe(25);
      expect(data.reorderPoint).toBe(50);
    });

    it('should return 404 if product does not exist', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID format
          sku: 'NON-EXISTENT',
          initialStock: 100,
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Product');
      expect(response.body.message).toContain('not found');
    });

    it('should return 409 if inventory already exists for product at same location', async () => {
      // Create inventory first time
      const firstResponse = await request(app.getHttpServer())
        .post('/inventory')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProductId,
          sku: `SKU-CONFLICT-${Date.now()}`,
          initialStock: 100,
        });

      expect(firstResponse.status).toBe(201);

      // Try to create again at same location
      const secondResponse = await request(app.getHttpServer())
        .post('/inventory')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProductId,
          sku: `SKU-CONFLICT-${Date.now()}`,
          initialStock: 50,
        });

      expect(secondResponse.status).toBe(409);
      expect(secondResponse.body.message).toContain('already exists');
      expect(secondResponse.body.message).toContain('MAIN_WAREHOUSE');
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          // Missing required fields
          sku: 'TEST-SKU',
        });

      expect(response.status).toBe(400);
    });

    it('should validate initialStock is not negative', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProductId,
          sku: 'TEST-SKU',
          initialStock: -10,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /inventory/reservations/:id (Get Reservation Details)', () => {
    let testProductId: string;
    let testInventoryId: string;
    let reservationId: string;

    beforeEach(async () => {
      // Create product
      const timestamp = Date.now();
      const productResponse = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: `Product for Reservation ${timestamp}`,
          description: 'Product for reservation test',
          price: 199.99,
          sku: `SKU-RES-${timestamp}`,
          brand: 'Test Brand',
          isActive: true,
        });

      testProductId = ResponseHelper.extractData<{ id: string }>(productResponse).id;

      // Create inventory
      const inventoryResponse = await request(app.getHttpServer())
        .post('/inventory')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProductId,
          sku: `SKU-RES-${timestamp}`,
          initialStock: 100,
        });

      testInventoryId = ResponseHelper.extractData<{ id: string }>(inventoryResponse).id;

      // Create a reservation
      const uniqueReservationId = `res-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const reserveResponse = await request(app.getHttpServer())
        .post('/inventory/reserve')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProductId,
          quantity: 5,
          reservationId: uniqueReservationId,
          ttlMinutes: 60, // 1 hour
          reason: 'Test reservation for details endpoint',
        });

      expect(reserveResponse.status).toBe(201);
      reservationId = ResponseHelper.extractData<{ reservationId: string }>(
        reserveResponse,
      ).reservationId;
    });

    it('should get reservation details successfully', async () => {
      const response = await request(app.getHttpServer())
        .get(`/inventory/reservations/${reservationId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      const data = ResponseHelper.extractData<any>(response);

      expect(data.reservationId).toBe(reservationId);
      expect(data.productId).toBe(testProductId);
      expect(data.inventoryId).toBe(testInventoryId);
      expect(data.status).toBe('ACTIVE');
      expect(data.quantity).toBe(5);
      expect(data.isExpired).toBe(false);
      expect(data.canBeReleased).toBe(true);
      expect(data.canBeFulfilled).toBe(true);
      expect(data.ttlSeconds).toBeGreaterThan(0);
      expect(data.expiresAt).toBeDefined();
      expect(data.createdAt).toBeDefined();
    });

    it('should return 404 for non-existent reservation', async () => {
      const response = await request(app.getHttpServer())
        .get('/inventory/reservations/non-existent-reservation-id')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });

    it('should show reservation status after being released', async () => {
      // Release the reservation
      await request(app.getHttpServer())
        .put('/inventory/release-reservation')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProductId,
          quantity: 5,
          reservationId,
          location: 'MAIN_WAREHOUSE',
        });

      // Check status again
      const response = await request(app.getHttpServer())
        .get(`/inventory/reservations/${reservationId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      const data = ResponseHelper.extractData<any>(response);

      expect(data.status).toBe('RELEASED');
      expect(data.canBeReleased).toBe(false);
      expect(data.canBeFulfilled).toBe(false);
    });

    it('should show reservation status after being fulfilled', async () => {
      // Fulfill the reservation
      await request(app.getHttpServer())
        .put('/inventory/fulfill-reservation')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProductId,
          quantity: 5,
          reservationId,
          location: 'MAIN_WAREHOUSE',
          orderId: `order-${Date.now()}`,
        });

      // Check status again
      const response = await request(app.getHttpServer())
        .get(`/inventory/reservations/${reservationId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      const data = ResponseHelper.extractData<any>(response);

      expect(data.status).toBe('FULFILLED');
      expect(data.canBeReleased).toBe(false);
      expect(data.canBeFulfilled).toBe(false);
    });
  });

  describe('Complete Reservation Flow with Improved Validations', () => {
    let testProductId: string;

    beforeEach(async () => {
      // Create product and inventory
      const timestamp = Date.now();
      const productResponse = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: `Product for Flow ${timestamp}`,
          description: 'Product for complete flow test',
          price: 149.99,
          sku: `SKU-FLOW-${timestamp}`,
          brand: 'Test Brand',
          isActive: true,
        });

      testProductId = ResponseHelper.extractData<{ id: string }>(productResponse).id;

      await request(app.getHttpServer())
        .post('/inventory')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProductId,
          sku: `SKU-FLOW-${timestamp}`,
          initialStock: 100,
        });
    });

    it('should complete full reservation lifecycle (reserve -> check -> release)', async () => {
      // Step 1: Create reservation
      const uniqueReservationId = `res-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const reserveResponse = await request(app.getHttpServer())
        .post('/inventory/reserve')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProductId,
          quantity: 10,
          reservationId: uniqueReservationId,
          ttlMinutes: 60,
          reason: 'Full lifecycle test',
        });

      expect(reserveResponse.status).toBe(201);
      const reservationId = ResponseHelper.extractData<{ reservationId: string }>(
        reserveResponse,
      ).reservationId;

      // Step 2: Check reservation status
      const statusResponse = await request(app.getHttpServer())
        .get(`/inventory/reservations/${reservationId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(statusResponse.status).toBe(200);
      const statusData = ResponseHelper.extractData<any>(statusResponse);
      expect(statusData.status).toBe('ACTIVE');
      expect(statusData.canBeReleased).toBe(true);
      expect(statusData.canBeFulfilled).toBe(true);

      // Step 3: Release reservation
      const releaseResponse = await request(app.getHttpServer())
        .put('/inventory/release-reservation')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProductId,
          quantity: 10,
          reservationId,
          location: 'MAIN_WAREHOUSE',
        });

      expect(releaseResponse.status).toBe(200);

      // Step 4: Verify reservation status changed
      const finalStatusResponse = await request(app.getHttpServer())
        .get(`/inventory/reservations/${reservationId}`)
        .set('Authorization', `Bearer ${userToken}`);

      const finalStatusData = ResponseHelper.extractData<any>(finalStatusResponse);
      expect(finalStatusData.status).toBe('RELEASED');
      expect(finalStatusData.canBeReleased).toBe(false);
      expect(finalStatusData.canBeFulfilled).toBe(false);
    });

    it('should complete full reservation lifecycle (reserve -> check -> fulfill)', async () => {
      // Step 1: Create reservation
      const uniqueReservationId = `res-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const reserveResponse = await request(app.getHttpServer())
        .post('/inventory/reserve')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProductId,
          quantity: 8,
          reservationId: uniqueReservationId,
          ttlMinutes: 60,
          reason: 'Fulfill lifecycle test',
        });

      expect(reserveResponse.status).toBe(201);
      const reservationId = ResponseHelper.extractData<{ reservationId: string }>(
        reserveResponse,
      ).reservationId;

      // Step 2: Check reservation status
      const statusResponse = await request(app.getHttpServer())
        .get(`/inventory/reservations/${reservationId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(statusResponse.status).toBe(200);
      const statusData = ResponseHelper.extractData<any>(statusResponse);
      expect(statusData.canBeFulfilled).toBe(true);

      // Step 3: Fulfill reservation
      const orderId = `order-${Date.now()}`;
      const fulfillResponse = await request(app.getHttpServer())
        .put('/inventory/fulfill-reservation')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProductId,
          quantity: 8,
          reservationId,
          location: 'MAIN_WAREHOUSE',
          orderId,
        });

      expect(fulfillResponse.status).toBe(200);

      // Step 4: Verify final status
      const finalStatusResponse = await request(app.getHttpServer())
        .get(`/inventory/reservations/${reservationId}`)
        .set('Authorization', `Bearer ${userToken}`);

      const finalStatusData = ResponseHelper.extractData<any>(finalStatusResponse);
      expect(finalStatusData.status).toBe('FULFILLED');
      expect(finalStatusData.orderId).toBe(orderId);
    });

    it('should NOT allow releasing already released reservation (improved validation)', async () => {
      // Create and release reservation
      const uniqueReservationId = `res-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const reserveResponse = await request(app.getHttpServer())
        .post('/inventory/reserve')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProductId,
          quantity: 5,
          reservationId: uniqueReservationId,
          ttlMinutes: 60,
        });

      const reservationId = ResponseHelper.extractData<{ reservationId: string }>(
        reserveResponse,
      ).reservationId;

      // First release - should work
      const firstReleaseResponse = await request(app.getHttpServer())
        .put('/inventory/release-reservation')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProductId,
          quantity: 5,
          reservationId,
          location: 'MAIN_WAREHOUSE',
        });

      expect(firstReleaseResponse.status).toBe(200);

      // Second release attempt - should fail with 400 (not 500!)
      const secondReleaseResponse = await request(app.getHttpServer())
        .put('/inventory/release-reservation')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProductId,
          quantity: 5,
          reservationId,
          location: 'MAIN_WAREHOUSE',
        });

      expect(secondReleaseResponse.status).toBe(400);
      expect(secondReleaseResponse.body.message).toContain('Cannot release');
      expect(secondReleaseResponse.body.message).toContain('RELEASED');
      expect(['Bad Request', 'BAD_REQUEST']).toContain(secondReleaseResponse.body.error);
    });

    it('should NOT allow fulfilling already fulfilled reservation (improved validation)', async () => {
      // Create and fulfill reservation
      const uniqueReservationId = `res-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const reserveResponse = await request(app.getHttpServer())
        .post('/inventory/reserve')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProductId,
          quantity: 3,
          reservationId: uniqueReservationId,
          ttlMinutes: 60,
        });

      const reservationId = ResponseHelper.extractData<{ reservationId: string }>(
        reserveResponse,
      ).reservationId;

      // First fulfill - should work
      const orderId1 = `order-${Date.now()}`;
      const firstFulfillResponse = await request(app.getHttpServer())
        .put('/inventory/fulfill-reservation')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProductId,
          quantity: 3,
          reservationId,
          location: 'MAIN_WAREHOUSE',
          orderId: orderId1,
        });

      expect(firstFulfillResponse.status).toBe(200);

      // Second fulfill attempt - should fail with 400 (not 500!)
      const orderId2 = `order-${Date.now()}`;
      const secondFulfillResponse = await request(app.getHttpServer())
        .put('/inventory/fulfill-reservation')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProductId,
          quantity: 3,
          reservationId,
          location: 'MAIN_WAREHOUSE',
          orderId: orderId2,
        });

      expect(secondFulfillResponse.status).toBe(400);
      expect(secondFulfillResponse.body.message).toContain('Cannot fulfill');
      expect(secondFulfillResponse.body.message).toContain('FULFILLED');
      expect(['Bad Request', 'BAD_REQUEST']).toContain(secondFulfillResponse.body.error);
    });

    it('should NOT allow releasing fulfilled reservation', async () => {
      // Create and fulfill reservation
      const uniqueReservationId = `res-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const reserveResponse = await request(app.getHttpServer())
        .post('/inventory/reserve')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProductId,
          quantity: 4,
          reservationId: uniqueReservationId,
          ttlMinutes: 60,
        });

      const reservationId = ResponseHelper.extractData<{ reservationId: string }>(
        reserveResponse,
      ).reservationId;

      // Fulfill reservation
      await request(app.getHttpServer())
        .put('/inventory/fulfill-reservation')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProductId,
          quantity: 4,
          reservationId,
          location: 'MAIN_WAREHOUSE',
          orderId: `order-${Date.now()}`,
        });

      // Try to release - should fail with 400
      const releaseResponse = await request(app.getHttpServer())
        .put('/inventory/release-reservation')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProductId,
          quantity: 4,
          reservationId,
          location: 'MAIN_WAREHOUSE',
        });

      expect(releaseResponse.status).toBe(400);
      expect(releaseResponse.body.message).toContain('Cannot release');
      expect(releaseResponse.body.message).toContain('FULFILLED');
    });

    it('should NOT allow fulfilling released reservation', async () => {
      // Create and release reservation
      const uniqueReservationId = `res-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const reserveResponse = await request(app.getHttpServer())
        .post('/inventory/reserve')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProductId,
          quantity: 6,
          reservationId: uniqueReservationId,
          ttlMinutes: 60,
        });

      const reservationId = ResponseHelper.extractData<{ reservationId: string }>(
        reserveResponse,
      ).reservationId;

      // Release reservation
      await request(app.getHttpServer())
        .put('/inventory/release-reservation')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProductId,
          quantity: 6,
          reservationId,
          location: 'MAIN_WAREHOUSE',
        });

      // Try to fulfill - should fail with 400
      const fulfillResponse = await request(app.getHttpServer())
        .put('/inventory/fulfill-reservation')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProductId,
          quantity: 6,
          reservationId,
          location: 'MAIN_WAREHOUSE',
          orderId: `order-${Date.now()}`,
        });

      expect(fulfillResponse.status).toBe(400);
      expect(fulfillResponse.body.message).toContain('Cannot fulfill');
      expect(fulfillResponse.body.message).toContain('RELEASED');
    });
  });

  describe('Error Scenarios and Edge Cases', () => {
    let testProductId: string;

    beforeEach(async () => {
      // Create product and inventory
      const timestamp = Date.now();
      const productResponse = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: `Product for Errors ${timestamp}`,
          description: 'Product for error scenarios',
          price: 99.99,
          sku: `SKU-ERR-${timestamp}`,
          brand: 'Test Brand',
          isActive: true,
        });

      testProductId = ResponseHelper.extractData<{ id: string }>(productResponse).id;

      await request(app.getHttpServer())
        .post('/inventory')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProductId,
          sku: `SKU-ERR-${timestamp}`,
          initialStock: 20,
        });
    });

    it('should handle insufficient stock for reservation', async () => {
      const uniqueReservationId = `res-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const response = await request(app.getHttpServer())
        .post('/inventory/reserve')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProductId,
          quantity: 9999, // More than available
          reservationId: uniqueReservationId,
          ttlMinutes: 60,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Insufficient stock');
    });

    it('should handle reservation not found gracefully', async () => {
      const releaseResponse = await request(app.getHttpServer())
        .put('/inventory/release-reservation')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProductId,
          quantity: 1,
          reservationId: 'non-existent-reservation',
          location: 'MAIN_WAREHOUSE',
        });

      expect(releaseResponse.status).toBe(404);
      expect(releaseResponse.body.message).toContain('not found');
    });

    it('should validate inventory creation with invalid product ID format', async () => {
      const response = await request(app.getHttpServer())
        .post('/inventory')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: 'invalid-uuid',
          sku: 'TEST-SKU',
          initialStock: 100,
        });

      expect(response.status).toBe(400);
    });

    it('should handle multiple concurrent reservations correctly', async () => {
      // Create 3 reservations in parallel
      const reservations = await Promise.all([
        request(app.getHttpServer())
          .post('/inventory/reserve')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            productId: testProductId,
            quantity: 5,
            reservationId: `res-${Date.now()}-1-${Math.random().toString(36).substring(7)}`,
            ttlMinutes: 60,
          }),
        request(app.getHttpServer())
          .post('/inventory/reserve')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            productId: testProductId,
            quantity: 5,
            reservationId: `res-${Date.now()}-2-${Math.random().toString(36).substring(7)}`,
            ttlMinutes: 60,
          }),
        request(app.getHttpServer())
          .post('/inventory/reserve')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            productId: testProductId,
            quantity: 5,
            reservationId: `res-${Date.now()}-3-${Math.random().toString(36).substring(7)}`,
            ttlMinutes: 60,
          }),
      ]);

      // All should succeed (3 * 5 = 15, we have 20 in stock)
      expect(reservations[0].status).toBe(201);
      expect(reservations[1].status).toBe(201);
      expect(reservations[2].status).toBe(201);

      // Fourth should fail (would need 20, only 5 left)
      const fourthReservation = await request(app.getHttpServer())
        .post('/inventory/reserve')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProductId,
          quantity: 10,
          reservationId: `res-${Date.now()}-4-${Math.random().toString(36).substring(7)}`,
          ttlMinutes: 60,
        });

      expect(fourthReservation.status).toBe(400);
      expect(fourthReservation.body.message).toContain('Insufficient stock');
    });
  });
});
