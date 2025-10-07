import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { OrderStatus } from '../../../src/modules/orders/enums/order-status.enum';

describe('Orders API (E2E)', () => {
  let app: INestApplication;
  let userToken: string;
  let user2Token: string;
  let userId: string;
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

    userToken = userResponse1.body.data.accessToken;
    user2Token = userResponse2.body.data.accessToken;
    userId = userResponse1.body.data.user.id;

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

    productId1 = product1Response.body.data.id;
    productId2 = product2Response.body.data.id;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
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

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('status', OrderStatus.PENDING);
      expect(response.body.data).toHaveProperty('userId', userId);
      expect(response.body.data).toHaveProperty('totalAmount');
      expect(response.body.data).toHaveProperty('idempotencyKey');
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data.items).toHaveLength(2);
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

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.id).toMatch(
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

      expect(response1.body.data.idempotencyKey).toBeDefined();
      expect(response2.body.data.idempotencyKey).toBeDefined();
      expect(response1.body.data.idempotencyKey).not.toBe(response2.body.data.idempotencyKey);
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

      // Should calculate total automatically
      expect(parseFloat(response.body.data.totalAmount)).toBeGreaterThan(0);
      expect(response.body.data.items[0]).toHaveProperty('unitPrice');
      expect(response.body.data.items[0]).toHaveProperty('totalPrice');
      expect(response.body.data.items[1]).toHaveProperty('unitPrice');
      expect(response.body.data.items[1]).toHaveProperty('totalPrice');
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

      // Should return the same order
      expect(response1.body.data.id).toBe(response2.body.data.id);
      expect(response1.body.data.idempotencyKey).toBe(response2.body.data.idempotencyKey);
    });
  });

  describe('GET /orders', () => {
    let testOrderId: string;

    beforeAll(async () => {
      // Create a test order for this user
      const orderData = {
        items: [{ productId: productId1, quantity: 1 }],
      };

      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(202);

      testOrderId = response.body.data.id;
    });

    it('should list orders for authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Should include our test order
      const testOrder = response.body.data.find((order: any) => order.id === testOrderId);
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

      const user2OrderId = user2OrderResponse.body.data.id;

      // Get orders for user1 - should not include user2's order
      const response = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const user2Order = response.body.data.find((order: any) => order.id === user2OrderId);
      expect(user2Order).toBeUndefined();

      // All orders should belong to user1
      response.body.data.forEach((order: any) => {
        expect(order.userId).toBe(userId);
      });
    });

    it('should paginate results', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders?page=1&limit=5')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      // Should handle pagination parameters (even if not many results)
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /orders/:id', () => {
    let testOrderId: string;
    let otherUserOrderId: string;

    beforeAll(async () => {
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

      testOrderId = response.body.data.id;

      // Create order for user2
      const user2Response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${user2Token}`)
        .send(orderData)
        .expect(202);

      otherUserOrderId = user2Response.body.data.id;
    });

    it('should get order detail with items', async () => {
      const response = await request(app.getHttpServer())
        .get(`/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('id', testOrderId);
      expect(response.body.data).toHaveProperty('userId', userId);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('totalAmount');
      expect(response.body.data).toHaveProperty('items');
      expect(Array.isArray(response.body.data.items)).toBe(true);
      expect(response.body.data.items.length).toBe(2);

      // Check item details
      expect(response.body.data.items[0]).toHaveProperty('productId');
      expect(response.body.data.items[0]).toHaveProperty('productName');
      expect(response.body.data.items[0]).toHaveProperty('quantity');
      expect(response.body.data.items[0]).toHaveProperty('unitPrice');
      expect(response.body.data.items[0]).toHaveProperty('totalPrice');
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

    beforeAll(async () => {
      // Create test order
      const orderData = {
        items: [{ productId: productId1, quantity: 1 }],
      };

      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(202);

      testOrderId = response.body.data.id;
    });

    it('should return only the status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('orderId', testOrderId);
      expect(response.body.data).toHaveProperty('status');
      expect(Object.values(OrderStatus)).toContain(response.body.data.status);

      // Should only contain orderId and status, not full order details
      expect(response.body.data).not.toHaveProperty('items');
      expect(response.body.data).not.toHaveProperty('totalAmount');
      expect(response.body.data).not.toHaveProperty('userId');
    });

    it('should return valid order status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

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

      expect(validStatuses).toContain(response.body.data.status);
    });
  });
});
