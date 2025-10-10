# ADR-021: Supertest for E2E API Testing

**Status:** Accepted  
**Date:** 2024-01-17  
**Author:** Development Team  
**Related ADRs:** ADR-020 (Jest), ADR-005 (NestJS)

---

## Context

Need to test HTTP API endpoints end-to-end with real requests, ensuring authentication, validation, error handling work correctly.

---

## Decision

Use **Supertest 6.x** for HTTP testing:

```typescript
/**
 * E2E Test Example
 * Location: test/e2e/orders.e2e-spec.ts
 */
import * as request from 'supertest';

describe('Orders API (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    // Create test app
    const module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .compile();

    app = module.createNestApplication();
    
    // Apply same middleware as main.ts
    app.use(helmet());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe());
    
    await app.init();

    // Authenticate test user
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'Test123!' })
      .expect(200);

    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /orders', () => {
    it('should create order with valid data', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          items: [{ productId: 'uuid-123', quantity: 2 }],
          shippingAddress: {
            street: '123 Main St',
            city: 'Boston',
            country: 'US',
          },
        })
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        status: 'pending',
        userId: expect.any(String),
        items: expect.arrayContaining([
          expect.objectContaining({
            productId: 'uuid-123',
            quantity: 2,
          }),
        ]),
      });
    });

    it('should reject order without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({
          items: [{ productId: 'uuid-123', quantity: 2 }],
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Access token is required');
        });
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          items: [], // Empty items (invalid)
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('items should not be empty');
        });
    });
  });

  describe('GET /orders/:id', () => {
    let orderId: string;

    beforeEach(async () => {
      // Create order for test
      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(validOrderDto);

      orderId = response.body.id;
    });

    it('should get order by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(orderId);
    });

    it('should return 404 for non-existent order', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/orders/non-existent-uuid')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
```

---

## Test Patterns

**Setup/Teardown:**
```typescript
beforeAll(async () => {
  // Create app, login, seed data
});

beforeEach(async () => {
  // Clean database tables
  await cleanupDatabase();
});

afterAll(async () => {
  // Close app, cleanup
  await app.close();
});
```

**Authentication Helper:**
```typescript
async function authenticateUser(role: UserRole = UserRole.CUSTOMER) {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: `${role}@test.com`, password: 'Test123!' });

  return response.body.accessToken;
}
```

**Database Seeding:**
```typescript
async function seedTestData() {
  const user = await userRepository.save(mockUser);
  const product = await productRepository.save(mockProduct);
  return { user, product };
}
```

---

## Assertions

**Response Body:**
```typescript
expect(response.body).toMatchObject({
  id: expect.any(String),
  status: 'pending',
});
```

**Headers:**
```typescript
expect(response.headers['content-type']).toContain('application/json');
expect(response.headers['x-correlation-id']).toBeDefined();
```

**Array Matching:**
```typescript
expect(response.body.items).toHaveLength(2);
expect(response.body.items).toContainEqual(
  expect.objectContaining({ productId: 'uuid-123' }),
);
```

---

## Benefits

✅ **Real HTTP Requests:** Test entire request/response cycle  
✅ **Chainable API:** `.set()`, `.send()`, `.expect()` methods  
✅ **Type-Safe:** Full TypeScript support  
✅ **Integration with Jest:** Runs in Jest test suite  

---

**Status:** ✅ **IMPLEMENTED**  
**Tests:** `test/e2e/*.e2e-spec.ts`  
**Coverage:** 80+ E2E scenarios across modules
