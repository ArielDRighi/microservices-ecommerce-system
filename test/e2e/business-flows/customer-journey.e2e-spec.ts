import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../../src/app.module';

describe('Customer Journey (E2E)', () => {
  let app: INestApplication;

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
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Basic Customer Flow', () => {
    it('should allow user to register and browse products', async () => {
      const timestamp = Date.now();
      const customerEmail = `customer-${timestamp}@test.com`;

      // 1. Register a new customer
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: customerEmail,
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'Customer',
        })
        .expect(201);

      expect(registerRes.body.success).toBe(true);
      expect(registerRes.body.data.accessToken).toBeDefined();
      expect(registerRes.body.data.user.email).toBe(customerEmail);

      // 2. Browse categories (public endpoint)
      const categoriesRes = await request(app.getHttpServer())
        .get('/categories?page=1&limit=10')
        .expect(200);

      expect(categoriesRes.body.success).toBe(true);
      expect(categoriesRes.body.data.data).toBeDefined();

      // 3. Browse products (public endpoint)
      const productsRes = await request(app.getHttpServer())
        .get('/products?page=1&limit=5')
        .expect(200);

      expect(productsRes.body.success).toBe(true);
      expect(productsRes.body.data.data).toBeDefined();
      expect(Array.isArray(productsRes.body.data.data)).toBe(true);

      // 4. View product details (if products exist)
      if (productsRes.body.data.data.length > 0) {
        const firstProduct = productsRes.body.data.data[0];

        const productDetailRes = await request(app.getHttpServer())
          .get(`/products/${firstProduct.id}`)
          .expect(200);

        expect(productDetailRes.body.success).toBe(true);
        expect(productDetailRes.body.data.data.id).toBe(firstProduct.id);
        expect(productDetailRes.body.data.data.name).toBeDefined();
        expect(productDetailRes.body.data.data.price).toBeDefined();
      }

      // ✅ Test validates basic integration: Auth + Public endpoints work together
    }, 15000); // 15 second timeout - much more reasonable
  });

  describe('Authenticated User Actions', () => {
    it('should allow authenticated user to view profile and check inventory', async () => {
      const timestamp = Date.now();
      const customerEmail = `auth-user-${timestamp}@test.com`;

      // 1. Register and get token
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: customerEmail,
          password: 'SecurePass123!',
          firstName: 'Auth',
          lastName: 'User',
        })
        .expect(201);

      const accessToken = registerRes.body.data.accessToken;

      // 2. Get user profile (authenticated endpoint)
      const profileRes = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(profileRes.body.success).toBe(true);
      expect(profileRes.body.data.email).toBe(customerEmail);
      expect(profileRes.body.data.firstName).toBe('Auth');

      // 3. Check inventory availability (public but useful for integration)
      const productsRes = await request(app.getHttpServer())
        .get('/products?page=1&limit=1')
        .expect(200);

      if (productsRes.body.data.data.length > 0) {
        const product = productsRes.body.data.data[0];

        const inventoryRes = await request(app.getHttpServer())
          .post('/inventory/check-availability')
          .send({
            productId: product.id,
            quantity: 1,
            location: 'MAIN_WAREHOUSE',
          })
          .expect(200);

        expect(inventoryRes.body.success).toBe(true);
        expect(inventoryRes.body.data.data.available).toBeDefined();
      }

      // ✅ Test validates: Auth flow + Profile access + Inventory integration
    }, 15000); // 15 second timeout
  });
});
