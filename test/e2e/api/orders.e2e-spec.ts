import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TestAppHelper } from '../../helpers/test-app.helper';
import { ResponseHelper } from '../../helpers/response.helper';
import { OrderStatus } from '../../../src/modules/orders/enums/order-status.enum';

describe('Orders API (E2E)', () => {
  let app: INestApplication;
  let userToken: string;
  let user2Token: string;
  let userId: string;
  let productId1: string;
  let productId2: string;

  beforeEach(async () => {
    app = await TestAppHelper.createTestApp();

    await app.init();

    // Create test users
    const userTimestamp = Date.now().toString().slice(-6); // Últimos 6 dígitos
    const userData1 = {
      email: `test${userTimestamp}a@test.com`,
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Doe',
    };

    const userData2 = {
      email: `test${userTimestamp}b@test.com`,
      password: 'SecurePass123!',
      firstName: 'Jane',
      lastName: 'Smith',
    };

    const userResponse1 = await request(app.getHttpServer())
      .post('/auth/register')
      .send(userData1)
      .expect(201);

    const userResponse2 = await request(app.getHttpServer())
      .post('/auth/register')
      .send(userData2)
      .expect(201);

    userToken = ResponseHelper.extractData<{ accessToken: string; user: { id: string } }>(userResponse1).accessToken;
    user2Token = ResponseHelper.extractData<{ accessToken: string }>(userResponse2).accessToken;
    userId = ResponseHelper.extractData<{ accessToken: string; user: { id: string } }>(userResponse1).user.id;

    // Create test products
    const timestamp = Date.now();
    const product1Response = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: `Test Product 1 ${timestamp}`,
        description: 'Test product description',
        price: 99.99,
        sku: `PROD-1-${timestamp}`,
        brand: 'Test Brand',
        tags: ['test'],
        isActive: true,
      })
      .expect(201);

    const product2Response = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: `Test Product 2 ${timestamp}`,
        description: 'Test product description 2',
        price: 149.99,
        sku: `PROD-2-${timestamp}`,
        brand: 'Test Brand',
        tags: ['test'],
        isActive: true,
      })
      .expect(201);

    productId1 = ResponseHelper.extractData<{ id: string }>(product1Response).id;
    productId2 = ResponseHelper.extractData<{ id: string }>(product2Response).id;
  });

  afterEach(async () => {
    if (app) {
      await TestAppHelper.closeApp(app);
    }
  });

  describe('POST /orders', () => {
    it('should create order with status PENDING', async () => {
      const orderData = {
        items: [
          { productId: productId1, quantity: 2 },
          { productId: productId2, quantity: 1 },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(202); // Should return 202 Accepted

      const responseData = ResponseHelper.extractData<any>(response);
      expect(responseData).toHaveProperty('id');
      expect(responseData).toHaveProperty('status', OrderStatus.PENDING);
      expect(responseData).toHaveProperty('userId', userId);
      expect(responseData).toHaveProperty('totalAmount');
      expect(responseData).toHaveProperty('idempotencyKey');
      expect(responseData).toHaveProperty('items');
      expect(responseData.items).toHaveLength(2);
    });

    it('should return 202 Accepted (not 201)', async () => {
      const orderData = {
        items: [{ productId: productId1, quantity: 1 }],
      };

      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(202); // Specifically testing for 202, not 201
    });

    it('should return orderId immediately', async () => {
      const orderData = {
        items: [{ productId: productId1, quantity: 1 }],
      };

      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(202);

      const responseData = ResponseHelper.extractData<any>(response);
      expect(responseData).toHaveProperty('id');
      expect(responseData.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      ); // UUID format
    });

    it('should generate unique idempotencyKey', async () => {
      // Crear órdenes con diferentes productos para asegurar diferentes keys
      const orderData1 = {
        items: [{ productId: productId1, quantity: 1 }],
      };

      const orderData2 = {
        items: [{ productId: productId2, quantity: 1 }],
      };

      const response1 = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData1)
        .expect(202);

      // Esperar un poco para asegurar timestamps diferentes
      await new Promise((resolve) => setTimeout(resolve, 10));

      const response2 = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData2)
        .expect(202);

      const responseData1 = ResponseHelper.extractData<any>(response1);
      const responseData2 = ResponseHelper.extractData<any>(response2);
      expect(responseData1.idempotencyKey).toBeDefined();
      expect(responseData2.idempotencyKey).toBeDefined();
      expect(responseData1.idempotencyKey).not.toBe(responseData2.idempotencyKey);
    });

    it('should validate that products exist', async () => {
      const orderData = {
        items: [
          { productId: '123e4567-e89b-12d3-a456-426614174000', quantity: 1 }, // Non-existent product
        ],
      };

      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(400);
    });

    it('should calculate total automatically', async () => {
      const orderData = {
        items: [
          { productId: productId1, quantity: 2 }, // 99.99 * 2 = 199.98
          { productId: productId2, quantity: 1 }, // 149.99 * 1 = 149.99
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(202);

      const responseData = ResponseHelper.extractData<any>(response);
      // Should calculate total automatically
      expect(parseFloat(responseData.totalAmount)).toBeGreaterThan(0);
      expect(responseData.items[0]).toHaveProperty('unitPrice');
      expect(responseData.items[0]).toHaveProperty('totalPrice');
      expect(responseData.items[1]).toHaveProperty('unitPrice');
      expect(responseData.items[1]).toHaveProperty('totalPrice');
    });

    it('should return error 400 with empty items', async () => {
      const orderData = {
        items: [],
      };

      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(400);

      expect(response.body.message).toContain('At least one item is required');
    });

    it('should return error 401 without authentication', async () => {
      const orderData = {
        items: [{ productId: productId1, quantity: 1 }],
      };

      await request(app.getHttpServer()).post('/orders').send(orderData).expect(401);
    });

    it('should support idempotency - same order with same key returns existing', async () => {
      const idempotencyKey = `test-idempotency-${Date.now()}`;
      const orderData = {
        items: [{ productId: productId1, quantity: 1 }],
        idempotencyKey,
      };

      // First request
      const response1 = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(202);

      // Second request with same idempotency key
      const response2 = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(202);

      const responseData1 = ResponseHelper.extractData<any>(response1);
      const responseData2 = ResponseHelper.extractData<any>(response2);
      // Should return the same order
      expect(responseData1.id).toBe(responseData2.id);
      expect(responseData1.idempotencyKey).toBe(responseData2.idempotencyKey);
    });
  });

  describe('GET /orders', () => {
    let testOrderId: string;

    beforeEach(async () => {
      // Create a test order for this user
      const orderData = {
        items: [{ productId: productId1, quantity: 1 }],
      };

      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(202);

      testOrderId = ResponseHelper.extractData<any>(response).id;
    });

    it('should list orders for authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const responseData = ResponseHelper.extractData<any>(response);
      expect(Array.isArray(responseData)).toBe(true);
      expect(responseData.length).toBeGreaterThan(0);

      // Should include our test order
      const testOrder = responseData.find((order: any) => order.id === testOrderId);
      expect(testOrder).toBeDefined();
      expect(testOrder.userId).toBe(userId);
    });

    it('should not show orders from other users', async () => {
      // Create order for user2
      const orderData = {
        items: [{ productId: productId1, quantity: 1 }],
      };

      const user2OrderResponse = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${user2Token}`)
        .send(orderData)
        .expect(202);

      const user2OrderId = ResponseHelper.extractData(user2OrderResponse).id;

      // Get orders for user1 - should not include user2's order
      const response = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const responseData = ResponseHelper.extractData<any>(response);
      const user2Order = responseData.find((order: any) => order.id === user2OrderId);
      expect(user2Order).toBeUndefined();

      // All orders should belong to user1
      responseData.forEach((order: any) => {
        expect(order.userId).toBe(userId);
      });
    });

    it('should paginate results', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders?page=1&limit=5')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const responseData = ResponseHelper.extractData<any>(response);
      expect(Array.isArray(responseData)).toBe(true);
      // Should handle pagination parameters (even if not many results)
      expect(responseData.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /orders/:id', () => {
    let testOrderId: string;
    let otherUserOrderId: string;

    beforeEach(async () => {
      // Create test order for user1
      const orderData = {
        items: [
          { productId: productId1, quantity: 2 },
          { productId: productId2, quantity: 1 },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(202);

      testOrderId = ResponseHelper.extractData<any>(response).id;

      // Create order for user2
      const user2Response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${user2Token}`)
        .send(orderData)
        .expect(202);

      otherUserOrderId = ResponseHelper.extractData<{ id: string }>(user2Response).id;
    });

    it('should get order detail with items', async () => {
      const response = await request(app.getHttpServer())
        .get(`/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const responseData = ResponseHelper.extractData<any>(response);
      expect(responseData).toHaveProperty('id', testOrderId);
      expect(responseData).toHaveProperty('userId', userId);
      expect(responseData).toHaveProperty('status');
      expect(responseData).toHaveProperty('totalAmount');
      expect(responseData).toHaveProperty('items');
      expect(Array.isArray(responseData.items)).toBe(true);
      expect(responseData.items.length).toBe(2);

      // Check item details
      expect(responseData.items[0]).toHaveProperty('productId');
      expect(responseData.items[0]).toHaveProperty('productName');
      expect(responseData.items[0]).toHaveProperty('quantity');
      expect(responseData.items[0]).toHaveProperty('unitPrice');
      expect(responseData.items[0]).toHaveProperty('totalPrice');
    });

    it('should return error 404 with non-existent ID', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';

      await request(app.getHttpServer())
        .get(`/orders/${nonExistentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('should return error 403 if order belongs to another user', async () => {
      // Try to access user2's order with user1's token
      await request(app.getHttpServer())
        .get(`/orders/${otherUserOrderId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404); // Should return 404, not 403, for security (don't reveal existence)
    });
  });

  describe('GET /orders/:id/status', () => {
    let testOrderId: string;

    beforeEach(async () => {
      // Create test order
      const orderData = {
        items: [{ productId: productId1, quantity: 1 }],
      };

      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(202);

      testOrderId = ResponseHelper.extractData<any>(response).id;
    });

    it('should return only the status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const responseData = ResponseHelper.extractData<any>(response);
      expect(responseData).toHaveProperty('orderId', testOrderId);
      expect(responseData).toHaveProperty('status');
      expect(Object.values(OrderStatus)).toContain(responseData.status);

      // Should only contain orderId and status, not full order details
      expect(responseData).not.toHaveProperty('items');
      expect(responseData).not.toHaveProperty('totalAmount');
      expect(responseData).not.toHaveProperty('userId');
    });

    it('should return valid order status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const responseData = ResponseHelper.extractData<any>(response);
      const validStatuses = [
        OrderStatus.PENDING,
        OrderStatus.PROCESSING,
        OrderStatus.CONFIRMED,
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
        OrderStatus.CANCELLED,
        OrderStatus.PAYMENT_FAILED,
        OrderStatus.PAYMENT_PENDING,
        OrderStatus.REFUNDED,
      ];

      expect(validStatuses).toContain(responseData.status);
    });
  });
});
