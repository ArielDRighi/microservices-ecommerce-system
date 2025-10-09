import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { ResponseHelper } from '../../helpers/response.helper';
import { TestAppHelper } from '../../helpers/test-app.helper';
import { ProductFactory } from '../../helpers/factories/product.factory';
import { InventoryFactory } from '../../helpers/factories/inventory.factory';
import { Product } from '../../../src/modules/products/entities/product.entity';
import { Inventory } from '../../../src/modules/inventory/entities/inventory.entity';

// Helper function to extract data from nested response structure - exact copy from products test

describe('Order Processing Saga - Failure Scenarios (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let productRepository: any;
  let inventoryRepository: any;

  beforeAll(async () => {
    // ✅ Usar TestAppHelper para dependencias REALES
    app = await TestAppHelper.createTestApp();
    dataSource = app.get(DataSource);
    productRepository = dataSource.getRepository(Product);
    inventoryRepository = dataSource.getRepository(Inventory);
  });

  afterAll(async () => {
    // ✅ Cierre seguro esperando jobs de cola
    await TestAppHelper.closeApp(app);
  });

  beforeEach(async () => {
    // ✅ Limpiar base de datos entre tests
    await TestAppHelper.cleanDatabase(app);
  });

  describe('Saga Compensation Scenarios', () => {
    it('should handle insufficient stock gracefully', async () => {
      const timestamp = Date.now();

      // Register user directly (simpler approach)
      const userResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `failure${timestamp}@test.com`,
          password: 'FailTest123!@',
          firstName: 'Failure',
          lastName: 'Test',
        })
        .expect(201);

      const accessToken = ResponseHelper.extractData<{ accessToken: string }>(
        userResponse,
      ).accessToken;

      // Setup: product with low stock
      const product = await ProductFactory.create(productRepository);
      await InventoryFactory.create(inventoryRepository, {
        productId: product.id,
        currentStock: 1,
        sku: product.sku,
      });

      // Try to order more than available
      const orderRes = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          items: [{ productId: product.id, quantity: 10 }],
        })
        .expect(202);

      const orderData = ResponseHelper.extractData(orderRes);
      const orderId = orderData.id;

      // Simple wait for processing
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Verify order was handled appropriately (cancelled or error state)
      const orderResponse = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const finalOrder = ResponseHelper.extractData(orderResponse);

      // Order should be cancelled or in error state
      expect(['CANCELLED', 'FAILED', 'ERROR']).toContain(finalOrder.status);
    });

    it('should handle order processing failure gracefully', async () => {
      const timestamp = Date.now();

      // Register user directly
      const userResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `processing${timestamp}@test.com`,
          password: 'ProcTest123!@',
          firstName: 'Processing',
          lastName: 'Test',
        })
        .expect(201);

      const accessToken = ResponseHelper.extractData<{ accessToken: string }>(
        userResponse,
      ).accessToken;

      // Setup: products for potential failure testing
      const product1 = await ProductFactory.create(productRepository);
      const product2 = await ProductFactory.create(productRepository);

      // Create order that may trigger processing issues
      const orderRes = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          items: [
            { productId: product1.id, quantity: 50 },
            { productId: product2.id, quantity: 25 },
          ],
        })
        .expect(202);

      const orderData2 = ResponseHelper.extractData(orderRes);
      const orderId = orderData2.id;

      // Simple wait for processing
      await new Promise((resolve) => setTimeout(resolve, 7000));

      // Verify order status (may fail due to processing issues)
      const orderResponse2 = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const finalOrder2 = ResponseHelper.extractData(orderResponse2);

      // Should handle failures gracefully
      expect(['PENDING', 'FAILED', 'CANCELLED', 'ERROR']).toContain(finalOrder2.status);
    });

    it('should maintain system integrity during saga compensation failures', async () => {
      const timestamp = Date.now();

      // Register user directly
      const userResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `integrity${timestamp}@test.com`,
          password: 'IntegTest123!@',
          firstName: 'Integrity',
          lastName: 'Test',
        })
        .expect(201);

      const accessToken = ResponseHelper.extractData<{ accessToken: string }>(
        userResponse,
      ).accessToken;

      // Setup: product for integrity test
      const product = await ProductFactory.create(productRepository);

      // Create order that will likely fail due to no inventory setup
      const orderRes = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          items: [{ productId: product.id, quantity: 10 }],
        })
        .expect(202);

      const orderData3 = ResponseHelper.extractData(orderRes);
      const orderId = orderData3.id;

      // Simple wait for processing
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Verify order record exists despite potential failures
      const orderResponse3 = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const finalOrder3 = ResponseHelper.extractData(orderResponse3);
      expect(finalOrder3.id).toBe(orderId);

      // Verify product still exists and is accessible
      const productCheckResponse = await request(app.getHttpServer())
        .get(`/products/${product.id}`)
        .expect(200);

      const productData = ResponseHelper.extractData(productCheckResponse);
      expect(productData.id).toBe(product.id);

      // Verify user can still access their orders
      const userOrders = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(userOrders.body.data).toBeDefined();

      // Verify inventory system hasn't been corrupted
      const inventoryCheck = await request(app.getHttpServer())
        .post('/inventory/check-availability')
        .send({
          productId: product.id,
          requiredQuantity: 1,
        });

      // May fail due to no inventory, but shouldn't crash the system
      expect([200, 400, 404]).toContain(inventoryCheck.status);
    });
  });
});
