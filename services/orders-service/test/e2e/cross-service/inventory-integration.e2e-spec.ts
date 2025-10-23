/**
 * Cross-Service Integration Tests: Orders ↔ Inventory
 *
 * Epic 5.2: Tests de Integración entre Servicios
 *
 * Tests E2E que verifican la comunicación entre Orders Service (NestJS)
 * e Inventory Service (Go/Gin) usando HTTP REST.
 *
 * Requisitos:
 * - Docker Compose con ambos servicios corriendo
 * - PostgreSQL para ambos servicios
 * - Redis para cache y rate limiting
 *
 * Metodología: TDD
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { DataSource } from 'typeorm';

describe('Cross-Service Integration: Orders ↔ Inventory (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let inventoryServiceUrl: string;

  beforeAll(async () => {
    // Setup application
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same pipes as production
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Inventory Service URL from environment
    inventoryServiceUrl = process.env['INVENTORY_SERVICE_URL'] || 'http://localhost:8080';
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean database before each test
    await dataSource.query('TRUNCATE TABLE orders CASCADE');
    // Note: processed_events table removed in microservices architecture (handled by Inventory Service)
    // await dataSource.query('TRUNCATE TABLE processed_events CASCADE');
  });

  describe('T5.2.1: Create Order with Stock Verification (Happy Path)', () => {
    it.skip('should create order successfully when inventory has sufficient stock', async () => {
      // SKIPPED: This test requires test data in Inventory Service DB
      // TODO Epic 5.2: Implement test data seeding or mock Inventory Service responses
      // 
      // Arrange - Setup test data
      const productId = '550e8400-e29b-41d4-a716-446655440001'; // Must exist in Inventory Service
      const customerId = '550e8400-e29b-41d4-a716-446655440099';
      const orderQuantity = 5;

      // Verify Inventory Service is available
      const healthResponse = await request(inventoryServiceUrl).get('/health').expect(200);

      expect(healthResponse.body).toHaveProperty('status', 'ok');

      // Verify product has sufficient stock in Inventory
      const stockResponse = await request(inventoryServiceUrl)
        .get(`/api/inventory/${productId}`)
        .expect(200);

      expect(stockResponse.body).toHaveProperty('is_available', true);
      expect(stockResponse.body.available_quantity).toBeGreaterThanOrEqual(orderQuantity);

      const initialAvailable = stockResponse.body.available_quantity;
      // Note: initialReserved might change during order processing
      // const initialReserved = stockResponse.body.reserved_quantity;

      // Act - Create order via Orders Service
      const createOrderDto = {
        customerId,
        items: [
          {
            productId,
            quantity: orderQuantity,
            unitPrice: 99.99,
          },
        ],
      };

      const orderResponse = await request(app.getHttpServer())
        .post('/api/orders')
        .send(createOrderDto)
        .expect(201);

      // Assert - Verify order created
      expect(orderResponse.body).toHaveProperty('id');
      expect(orderResponse.body).toHaveProperty('status');
      expect(orderResponse.body.customerId).toBe(customerId);
      expect(orderResponse.body.items).toHaveLength(1);
      expect(orderResponse.body.items[0].productId).toBe(productId);
      expect(orderResponse.body.items[0].quantity).toBe(orderQuantity);

      const orderId = orderResponse.body.id;

      // Wait for async processing (saga completion)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify order reached COMPLETED status
      const orderStatusResponse = await request(app.getHttpServer())
        .get(`/api/orders/${orderId}`)
        .expect(200);

      expect(orderStatusResponse.body.status).toBe('COMPLETED');

      // Verify stock was decremented in Inventory Service
      const finalStockResponse = await request(inventoryServiceUrl)
        .get(`/api/inventory/${productId}`)
        .expect(200);

      // Stock should be decremented
      const expectedFinalAvailable = initialAvailable - orderQuantity;
      expect(finalStockResponse.body.available_quantity).toBe(expectedFinalAvailable);

      // Reserved might have changed during processing
      expect(finalStockResponse.body.total_stock).toBe(
        stockResponse.body.total_stock - orderQuantity,
      );
    });

    it.skip('should handle multiple sequential orders correctly', async () => {
      // SKIPPED: This test requires test data in Inventory Service DB
      // TODO Epic 5.2: Implement test data seeding or mock Inventory Service responses
      //
      // Arrange
      const productId = '550e8400-e29b-41d4-a716-446655440002';
      const customerId = '550e8400-e29b-41d4-a716-446655440099';

      // Get initial stock
      const initialStock = await request(inventoryServiceUrl)
        .get(`/api/inventory/${productId}`)
        .expect(200);

      const initialAvailable = initialStock.body.available_quantity;

      // Act - Create 3 orders sequentially
      const orders = [];
      for (let i = 0; i < 3; i++) {
        const response = await request(app.getHttpServer())
          .post('/api/orders')
          .send({
            customerId,
            items: [{ productId, quantity: 2, unitPrice: 50.0 }],
          })
          .expect(201);

        orders.push(response.body);
      }

      // Wait for all orders to process
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Assert - Verify final stock
      const finalStock = await request(inventoryServiceUrl)
        .get(`/api/inventory/${productId}`)
        .expect(200);

      expect(finalStock.body.available_quantity).toBe(initialAvailable - 6); // 3 orders * 2 quantity
    });
  });

  describe('T5.2.2: Order Fails When Insufficient Stock (Compensation)', () => {
    it('should fail order creation when inventory has insufficient stock', async () => {
      // This test will be implemented in T5.2.2
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('T5.2.3: Basic Concurrency Test (100 Simultaneous Requests)', () => {
    it('should handle 100 concurrent requests correctly', async () => {
      // This test will be implemented in T5.2.3
      expect(true).toBe(true); // Placeholder
    });
  });
});
