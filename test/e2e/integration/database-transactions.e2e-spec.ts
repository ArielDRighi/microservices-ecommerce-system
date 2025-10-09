import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { ResponseHelper } from '../../helpers/response.helper';
import { TestAppHelper } from '../../helpers/test-app.helper';
import { ProductFactory } from '../../helpers/factories/product.factory';
import { InventoryFactory } from '../../helpers/factories/inventory.factory';
import { Order } from '../../../src/modules/orders/entities/order.entity';
import { OrderItem } from '../../../src/modules/orders/entities/order-item.entity';
import { Product } from '../../../src/modules/products/entities/product.entity';
import { Inventory } from '../../../src/modules/inventory/entities/inventory.entity';

// Helper function to extract data from nested response structure
  return response.body.data?.data || response.body.data;
};

describe('Database Transactions & Consistency (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let productRepository: any;
  let inventoryRepository: any;
  let orderRepository: any;
  let orderItemRepository: any;

  beforeAll(async () => {
    app = await TestAppHelper.createTestApp();
    dataSource = app.get(DataSource);
    productRepository = dataSource.getRepository(Product);
    inventoryRepository = dataSource.getRepository(Inventory);
    orderRepository = dataSource.getRepository(Order);
    orderItemRepository = dataSource.getRepository(OrderItem);
  });

  afterAll(async () => {
    await TestAppHelper.closeApp(app);
  });

  beforeEach(async () => {
    await TestAppHelper.cleanDatabase(app);
  });

  describe('Atomic Transactions', () => {
    it('should create Order + OrderItems in single transaction', async () => {
      const timestamp = Date.now();

      // Create user for this test
      const userResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `user-atomic-${timestamp}@example.com`,
          password: 'UserTest123!',
          firstName: 'User',
          lastName: 'Atomic',
        })
        .expect(201);

      const userToken = ResponseHelper.extractData(userResponse).accessToken;

      // Arrange: Create products with inventory
      const products = await Promise.all([
        ProductFactory.create(productRepository),
        ProductFactory.create(productRepository),
        ProductFactory.create(productRepository),
      ]);

      for (const product of products) {
        await InventoryFactory.create(inventoryRepository, {
          productId: product.id,
          currentStock: 100,
          sku: product.sku,
        });
      }

      const orderData = {
        items: [
          { productId: products[0].id, quantity: 2 },
          { productId: products[1].id, quantity: 1 },
          { productId: products[2].id, quantity: 3 },
        ],
      };

      // Act: Create order
      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(202);

      const orderId = ResponseHelper.extractData(response).id;

      // Assert: Verify order and all items were created atomically
      const order = await orderRepository.findOne({
        where: { id: orderId },
        relations: ['items'],
      });

      expect(order).toBeDefined();

      // Load items if lazy loaded
      const orderItems = await order?.items;
      expect(orderItems).toHaveLength(3);
      expect(order?.status).toBe('PENDING');

      // Verify all items have correct order reference
      if (orderItems) {
        for (const item of orderItems) {
          expect(item.orderId).toBe(orderId);
          expect(item.quantity).toBeGreaterThan(0);
        }
      }
    });

    it('should rollback transaction when order creation fails', async () => {
      const timestamp = Date.now();

      // Create user for this test
      const userResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `user-rollback-${timestamp}@example.com`,
          password: 'UserTest123!',
          firstName: 'User',
          lastName: 'Rollback',
        })
        .expect(201);

      const userToken = ResponseHelper.extractData(userResponse).accessToken;

      // Arrange: Create valid product and use invalid product ID
      const validProduct = await ProductFactory.create(productRepository);
      await InventoryFactory.create(inventoryRepository, {
        productId: validProduct.id,
        currentStock: 100,
        sku: validProduct.sku,
      });

      const invalidProductId = '00000000-0000-0000-0000-000000000000';

      const orderData = {
        items: [
          { productId: validProduct.id, quantity: 2 },
          { productId: invalidProductId, quantity: 1 }, // Non-existent product
        ],
      };

      // Act: Attempt to create order (should fail)
      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(400); // Error for non-existent product

      // Assert: Verify NO order or items were created (rollback occurred)
      const orderCount = await orderRepository.count();
      const orderItemCount = await orderItemRepository.count();

      expect(orderCount).toBe(0);
      expect(orderItemCount).toBe(0);

      // Verify inventory was not affected
      const inventory = await inventoryRepository.findOne({
        where: { productId: validProduct.id },
      });
      expect(inventory?.currentStock).toBe(100);
      expect(inventory?.reservedStock).toBe(0);
    });
  });

  describe('Concurrent Updates & Optimistic Locking', () => {
    it('should handle concurrent inventory updates correctly', async () => {
      const timestamp = Date.now();

      // Create users for concurrent test
      const user1Response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `user1-concurrent-${timestamp}@example.com`,
          password: 'User1Test123!',
          firstName: 'User',
          lastName: 'One',
        })
        .expect(201);

      const user2Response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `user2-concurrent-${timestamp}@example.com`,
          password: 'User2Test123!',
          firstName: 'User',
          lastName: 'Two',
        })
        .expect(201);

      const user1Token = ResponseHelper.extractData(user1Response).accessToken;
      const user2Token = ResponseHelper.extractData(user2Response).accessToken;

      // Arrange: Create product with specific stock
      const product = await ProductFactory.create(productRepository);
      await InventoryFactory.create(inventoryRepository, {
        productId: product.id,
        currentStock: 10,
        sku: product.sku,
      });

      // Act: Two concurrent reservations of the same product
      const reservePromises = [
        request(app.getHttpServer())
          .post('/inventory/reserve')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            productId: product.id,
            quantity: 6,
            reservationId: 'res_1',
            location: 'MAIN_WAREHOUSE',
            reason: 'Order processing',
          }),
        request(app.getHttpServer())
          .post('/inventory/reserve')
          .set('Authorization', `Bearer ${user2Token}`)
          .send({
            productId: product.id,
            quantity: 6,
            reservationId: 'res_2',
            location: 'MAIN_WAREHOUSE',
            reason: 'Order processing',
          }),
      ];

      const results = await Promise.allSettled(reservePromises);

      // Assert: Only one reservation should succeed
      const successfulReservations = results.filter(
        (result) =>
          result.status === 'fulfilled' &&
          (result.value.status === 200 || result.value.status === 201),
      );
      const failedReservations = results.filter(
        (result) => result.status === 'fulfilled' && result.value.status === 400,
      );

      expect(successfulReservations).toHaveLength(1);
      expect(failedReservations).toHaveLength(1);
    });

    it('should prevent overselling with optimistic locking', async () => {
      const timestamp = Date.now();

      // Create user for this test
      const userResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `user-oversell-${timestamp}@example.com`,
          password: 'UserTest123!',
          firstName: 'User',
          lastName: 'Oversell',
        })
        .expect(201);

      const userToken = ResponseHelper.extractData(userResponse).accessToken;

      // Arrange: Create product with low stock
      const product = await ProductFactory.create(productRepository);
      await InventoryFactory.create(inventoryRepository, {
        productId: product.id,
        currentStock: 5,
        sku: product.sku,
      });

      // Act: Multiple reservation attempts exceeding stock
      const reserveAttempts = Array.from({ length: 3 }, (_, index) =>
        request(app.getHttpServer())
          .post('/inventory/reserve')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            productId: product.id,
            quantity: 3, // 3 × 3 = 9 > 5 (available stock)
            reservationId: `res_${index + 1}`,
            location: 'MAIN_WAREHOUSE',
            reason: 'Order processing',
          }),
      );

      const results = await Promise.allSettled(reserveAttempts);

      // Assert: Only one reservation should succeed
      const successful = results.filter(
        (result) =>
          result.status === 'fulfilled' &&
          (result.value.status === 200 || result.value.status === 201),
      );
      const failed = results.filter(
        (result) => result.status === 'fulfilled' && result.value.status === 400,
      );

      expect(successful).toHaveLength(1); // Only one successful reservation
      expect(failed).toHaveLength(2); // Two failed reservations
    });
  });

  describe('Foreign Key Constraints', () => {
    it('should enforce foreign key constraints between Order and OrderItems', async () => {
      const timestamp = Date.now();

      // Create user for this test
      const userResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `user-fk-${timestamp}@example.com`,
          password: 'UserTest123!',
          firstName: 'User',
          lastName: 'FK',
        })
        .expect(201);

      const userToken = ResponseHelper.extractData(userResponse).accessToken;

      // Arrange: Create valid order first
      const product = await ProductFactory.create(productRepository);
      await InventoryFactory.create(inventoryRepository, {
        productId: product.id,
        currentStock: 100,
        sku: product.sku,
      });

      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          items: [{ productId: product.id, quantity: 1 }],
        })
        .expect(202);

      // Act & Assert: Try to create OrderItem with non-existent order
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();

      try {
        await queryRunner.query(
          `
          INSERT INTO order_items (id, order_id, product_id, sku, product_name, quantity, unit_price, total_price, created_at, updated_at)
          VALUES (
            gen_random_uuid(),
            '00000000-0000-0000-0000-000000000000',
            $1,
            'TEST-SKU',
            'Test Product',
            1,
            100.00,
            100.00,
            NOW(),
            NOW()
          )
        `,
          [product.id],
        );

        // Should not reach here if constraint works
        fail('Expected foreign key constraint violation');
      } catch (error: any) {
        // Should throw foreign key constraint error
        expect(error.message).toContain('foreign key constraint');
        expect(error.code).toBe('23503'); // PostgreSQL foreign key violation
      } finally {
        await queryRunner.release();
      }
    });

    it('should enforce cascading deletes correctly', async () => {
      const timestamp = Date.now();

      // Create user for this test
      const userResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `user-cascade-${timestamp}@example.com`,
          password: 'UserTest123!',
          firstName: 'User',
          lastName: 'Cascade',
        })
        .expect(201);

      const userToken = ResponseHelper.extractData(userResponse).accessToken;

      // Arrange: Create order with items
      const products = await Promise.all([
        ProductFactory.create(productRepository),
        ProductFactory.create(productRepository),
      ]);

      for (const product of products) {
        await InventoryFactory.create(inventoryRepository, {
          productId: product.id,
          currentStock: 100,
          sku: product.sku,
        });
      }

      const orderResponse = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          items: [
            { productId: products[0].id, quantity: 1 },
            { productId: products[1].id, quantity: 2 },
          ],
        })
        .expect(202);

      const orderId = ResponseHelper.extractData(orderResponse).id;

      // Verify order items were created
      const initialItemCount = await orderItemRepository.count({
        where: { orderId },
      });
      expect(initialItemCount).toBe(2);

      // Act: Delete the order (should cascade to items)
      await orderRepository.delete(orderId);

      // Assert: Order items should be automatically deleted
      const finalItemCount = await orderItemRepository.count({
        where: { orderId },
      });
      expect(finalItemCount).toBe(0);
    });
  });

  describe('Unique Constraints', () => {
    it('should validate unique constraints on product SKU', async () => {
      // Note: For SKU testing, we directly use the repository since
      // product creation typically requires admin access
      const uniqueSku = `TEST-SKU-${Date.now()}`;

      // Act: Create first product successfully
      const product1 = await ProductFactory.create(productRepository, {
        sku: uniqueSku,
      });

      expect(product1.sku).toBe(uniqueSku);

      // Act: Try to create second product with same SKU (should fail)
      try {
        await ProductFactory.create(productRepository, {
          sku: uniqueSku,
        });
        fail('Expected unique constraint violation');
      } catch (error: any) {
        // Should throw unique constraint error
        expect(error.message).toContain('duplicate key value');
        expect(error.code).toBe('23505'); // PostgreSQL unique violation
      }

      // Assert: Verify only one product with that SKU exists
      const productCount = await productRepository.count({
        where: { sku: uniqueSku },
      });
      expect(productCount).toBe(1);
    });

    it('should validate unique constraint on order-product combination in order items', async () => {
      const timestamp = Date.now();

      // Create user for this test
      const userResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `user-unique-${timestamp}@example.com`,
          password: 'UserTest123!',
          firstName: 'User',
          lastName: 'Unique',
        })
        .expect(201);

      const userToken = ResponseHelper.extractData(userResponse).accessToken;

      // Arrange: Create product and order
      const product = await ProductFactory.create(productRepository);
      await InventoryFactory.create(inventoryRepository, {
        productId: product.id,
        currentStock: 100,
        sku: product.sku,
      });

      const orderResponse = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          items: [{ productId: product.id, quantity: 1 }],
        })
        .expect(202);

      const orderId = ResponseHelper.extractData(orderResponse).id;

      // Act & Assert: Try to insert duplicate OrderItem
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();

      try {
        // Verify existing item exists
        const existingItem = await orderItemRepository.findOne({
          where: { orderId, productId: product.id },
        });
        expect(existingItem).toBeDefined();

        // Try to insert duplicate
        await queryRunner.query(
          `
          INSERT INTO order_items (id, order_id, product_id, sku, product_name, quantity, unit_price, total_price, created_at, updated_at)
          VALUES (
            gen_random_uuid(),
            $1,
            $2,
            'TEST-SKU-2',
            'Test Product 2',
            2,
            100.00,
            200.00,
            NOW(),
            NOW()
          )
        `,
          [orderId, product.id],
        );

        // Should not reach here if constraint works
        fail('Expected unique constraint violation');
      } catch (error: any) {
        // Should throw unique constraint error
        expect(error.message).toContain('duplicate key value');
        expect(error.code).toBe('23505'); // PostgreSQL unique violation
      } finally {
        await queryRunner.release();
      }
    });
  });

  describe('ACID Properties Validation', () => {
    it('should maintain consistency during complex multi-table operations', async () => {
      const timestamp = Date.now();

      // Create user for this test
      const userResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `user-acid-${timestamp}@example.com`,
          password: 'UserTest123!',
          firstName: 'User',
          lastName: 'ACID',
        })
        .expect(201);

      const userToken = ResponseHelper.extractData(userResponse).accessToken;

      // Arrange: Setup complex scenario with multiple products and stock
      const products = await Promise.all([
        ProductFactory.create(productRepository),
        ProductFactory.create(productRepository),
        ProductFactory.create(productRepository),
      ]);

      const inventories = [];
      for (const product of products) {
        const inventory = await InventoryFactory.create(inventoryRepository, {
          productId: product.id,
          currentStock: 50,
          sku: product.sku,
        });
        inventories.push(inventory);
      }

      const initialStockSum = inventories.reduce((sum, inv) => sum + inv.currentStock, 0);

      // Act: Create multiple orders simultaneously
      const orderPromises = [
        request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            items: [
              { productId: products[0].id, quantity: 2 },
              { productId: products[1].id, quantity: 1 },
            ],
          }),
        request(app.getHttpServer())
          .post('/orders')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            items: [
              { productId: products[1].id, quantity: 1 },
              { productId: products[2].id, quantity: 3 },
            ],
          }),
      ];

      const results = await Promise.allSettled(orderPromises);

      // Assert: Verify at least some operations completed successfully
      // (some may fail due to inventory constraints or circuit breakers)
      const successfulResults = results.filter(
        (result) => result.status === 'fulfilled' && result.value.status === 202,
      );
      expect(successfulResults.length).toBeGreaterThanOrEqual(1);
      expect(successfulResults.length).toBeLessThanOrEqual(3);

      // Assert: Verify global consistency
      const orders = await orderRepository.find({
        relations: ['items'],
      });

      const orderItems = await orderItemRepository.find();
      const currentInventories = await inventoryRepository.find();

      // Verify referential integrity
      for (const item of orderItems) {
        const order = orders.find((o: any) => o.id === item.orderId);
        expect(order).toBeDefined();

        const inventory = currentInventories.find((i: any) => i.productId === item.productId);
        expect(inventory).toBeDefined();
      }

      // Verify stock conservation (total stock + reserved should not exceed initial)
      const currentStockSum = currentInventories.reduce(
        (sum: number, inv: any) => sum + inv.currentStock + inv.reservedStock,
        0,
      );
      expect(currentStockSum).toBeLessThanOrEqual(initialStockSum);

      // Verify no orphaned records
      const orphanedItems = await dataSource.query(`
        SELECT oi.* FROM order_items oi
        LEFT JOIN orders o ON oi.order_id = o.id
        WHERE o.id IS NULL
      `);
      expect(orphanedItems).toHaveLength(0);
    });
  });
});
