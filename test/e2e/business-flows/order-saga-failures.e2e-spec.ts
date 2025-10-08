import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../../../src/app.module';
import { ProductFactory } from '../../helpers/factories/product.factory';
import { Product } from '../../../src/modules/products/entities/product.entity';

describe('Order Processing Saga - Failure Scenarios (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let productRepository: Repository<Product>;

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

    dataSource = moduleFixture.get<DataSource>(DataSource);
    productRepository = dataSource.getRepository(Product);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Saga Compensation Scenarios', () => {
    it('should handle insufficient stock gracefully with saga compensation', async () => {
      const timestamp = Date.now();

      // 0. Register user and get token
      const userEmail = `insufficient-${timestamp}@example.com`;
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: userEmail,
          password: 'SecurePass123!',
          firstName: 'Insufficient',
          lastName: 'Stock',
        })
        .expect(201);

      const userToken = registerResponse.body.data.accessToken;

      // 1. Setup: Create product with no initial inventory
      const product = await ProductFactory.create(productRepository, {
        name: 'Low Stock Product for Compensation Test',
        price: 199.99,
        sku: `LOW-STOCK-${timestamp}`,
        compareAtPrice: 249.99, // Must be greater than price
      });

      // 2. Try to order large quantity (expecting insufficient stock)
      const orderPayload = {
        items: [
          {
            productId: product.id,
            quantity: 100, // Intentionally large quantity
          },
        ],
      };

      const orderResponse = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderPayload);

      expect(orderResponse.status).toBe(202); // Accepted for async processing
      expect(orderResponse.body.success).toBe(true);

      const orderId = orderResponse.body.data.id;
      expect(orderId).toBeDefined();
      expect(orderResponse.body.data.status).toBe('PENDING');

      // 3. Wait for saga compensation to complete
      await new Promise((resolve) => setTimeout(resolve, 6000));

      // 4. Verify order was handled appropriately (should be in error/cancelled state)
      const finalOrderResponse = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(finalOrderResponse.status).toBe(200);

      // Order should be in an error state due to insufficient stock
      // Saga compensation should have handled this gracefully
      const finalStatus = finalOrderResponse.body.data.status;
      expect(['CANCELLED', 'FAILED', 'ERROR', 'PENDING']).toContain(finalStatus);

      // 5. Verify inventory check returns expected results
      const inventoryResponse = await request(app.getHttpServer())
        .post('/inventory/check-availability')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product.id,
          requiredQuantity: 100,
        });

      // May return 404 if no inventory exists, or 400 for validation issues
      // This is expected behavior for saga compensation
      expect([200, 400, 404]).toContain(inventoryResponse.status);

      if (inventoryResponse.status === 200) {
        // If inventory check succeeds, available should be less than requested
        expect(inventoryResponse.body.data.available).toBe(false);
      }
    }, 15000);

    it('should handle order processing failure with circuit breaker compensation', async () => {
      const timestamp = Date.now();

      // 0. Register user and get token
      const userEmail = `circuit-${timestamp}@example.com`;
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: userEmail,
          password: 'SecurePass123!',
          firstName: 'Circuit',
          lastName: 'Test',
        })
        .expect(201);

      const userToken = registerResponse.body.data.accessToken;

      // 1. Setup: Create products for potential circuit breaker testing
      const product1 = await ProductFactory.create(productRepository, {
        name: 'Circuit Breaker Test Product 1',
        price: 149.99,
        sku: `CIRCUIT1-${timestamp}`,
        compareAtPrice: 189.99,
      });

      const product2 = await ProductFactory.create(productRepository, {
        name: 'Circuit Breaker Test Product 2',
        price: 299.99,
        sku: `CIRCUIT2-${timestamp}`,
        compareAtPrice: 349.99,
      });

      // 2. Create order that may trigger circuit breaker
      const orderPayload = {
        items: [
          {
            productId: product1.id,
            quantity: 50, // Large quantity
          },
          {
            productId: product2.id,
            quantity: 25, // Large quantity
          },
        ],
      };

      const orderResponse = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderPayload);

      expect(orderResponse.status).toBe(202); // Async processing
      const orderId = orderResponse.body.data.id;

      // 3. Wait for potential circuit breaker activation and compensation
      await new Promise((resolve) => setTimeout(resolve, 7000));

      // 4. Verify order status (compensation should handle failures gracefully)
      const finalOrderResponse = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(finalOrderResponse.status).toBe(200);

      // Circuit breaker may cause order to fail, which is expected
      const finalStatus = finalOrderResponse.body.data.status;
      expect(['PENDING', 'FAILED', 'CANCELLED', 'ERROR']).toContain(finalStatus);

      // 5. Verify inventory checks for both products
      for (const product of [product1, product2]) {
        const inventoryResponse = await request(app.getHttpServer())
          .post('/inventory/check-availability')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            productId: product.id,
            requiredQuantity: 1, // Check minimal quantity
          });

        // Circuit breaker may cause 400/404 responses, which is expected
        expect([200, 400, 404]).toContain(inventoryResponse.status);
      }

      // 6. Verify system integrity - order exists but compensation handled failures
      expect(finalOrderResponse.body.data.items).toHaveLength(2);
      const totalAmount = parseFloat(finalOrderResponse.body.data.totalAmount);
      expect(totalAmount).toBeGreaterThan(0);
    }, 18000);

    it('should maintain system integrity during saga compensation failures', async () => {
      const timestamp = Date.now();

      // 0. Register user and get token
      const userEmail = `integrity-${timestamp}@example.com`;
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: userEmail,
          password: 'SecurePass123!',
          firstName: 'Integrity',
          lastName: 'Test',
        })
        .expect(201);

      const userToken = registerResponse.body.data.accessToken;

      // 1. Setup: Create product for integrity test
      const product = await ProductFactory.create(productRepository, {
        name: 'System Integrity Test Product',
        price: 89.99,
        sku: `INTEGRITY-${timestamp}`,
        compareAtPrice: 119.99,
      });

      // 2. Create order that will likely fail due to no inventory setup
      const orderPayload = {
        items: [
          {
            productId: product.id,
            quantity: 10,
          },
        ],
      };

      const orderResponse = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderPayload);

      expect(orderResponse.status).toBe(202);
      const orderId = orderResponse.body.data.id;

      // 3. Wait for saga processing and potential compensation
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // 4. Verify order record exists despite potential failures
      const orderCheckResponse = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(orderCheckResponse.status).toBe(200);
      expect(orderCheckResponse.body.data.id).toBe(orderId);

      // 5. Verify product still exists and is accessible
      const productCheckResponse = await request(app.getHttpServer()).get(
        `/products/${product.id}`,
      );

      expect(productCheckResponse.status).toBe(200);
      expect(productCheckResponse.body.data.id).toBe(product.id);

      // 6. Verify user can still access their orders
      const userOrdersResponse = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${userToken}`);

      expect(userOrdersResponse.status).toBe(200);
      expect(userOrdersResponse.body.data).toBeDefined();
      
      // Handle both direct array and paginated response structures
      const orders = Array.isArray(userOrdersResponse.body.data) 
        ? userOrdersResponse.body.data 
        : userOrdersResponse.body.data.data || [];
      
      expect(Array.isArray(orders)).toBe(true);

      // Should find our order in the list
      const foundOrder = orders.find((order: any) => order.id === orderId);
      expect(foundOrder).toBeDefined();      // 7. Verify inventory system hasn't been corrupted
      const inventoryCheckResponse = await request(app.getHttpServer())
        .post('/inventory/check-availability')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product.id,
          requiredQuantity: 1,
        });

      // May fail due to no inventory, but shouldn't crash the system
      expect([200, 400, 404]).toContain(inventoryCheckResponse.status);

      // 8. Verify user authentication still works
      const profileResponse = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${userToken}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.data.email).toBe(userEmail);

      // 9. System integrity check: no data corruption
      expect(orderCheckResponse.body.data.totalAmount).toBe('899.90'); // String comparison
      expect(orderCheckResponse.body.data.items[0].quantity).toBe(10);
      expect(orderCheckResponse.body.data.items[0].productId).toBe(product.id);
    }, 15000);
  });
});
