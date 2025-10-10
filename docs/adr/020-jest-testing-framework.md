# ADR-020: Jest Testing Framework

**Status:** Accepted  
**Date:** 2024-01-17  
**Author:** Development Team  
**Related ADRs:** ADR-005 (NestJS)

---

## Context

Need comprehensive testing strategy for unit tests, integration tests, and E2E tests.

---

## Decision

Use **Jest 29.x** (NestJS default) with custom configuration:

```javascript
// jest.config.js
module.exports = {
  preset: '@nestjs/testing',
  testEnvironment: 'node',

  // Test organization
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: [
    '**/*.spec.ts', // Unit tests
    '**/*.e2e-spec.ts', // E2E tests
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.dto.ts',
    '!src/database/migrations/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Transform TypeScript
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/config/setup-tests.ts'],
};
```

---

## Test Organization

```
src/                         # Unit tests (co-located)
  modules/
    orders/
      orders.service.ts
      orders.service.spec.ts  ← Unit test

test/                        # E2E tests (separate folder)
  e2e/
    orders.e2e-spec.ts       ← E2E test
  fixtures/                  # Test data
  helpers/                   # Test utilities
  config/
    global-setup-e2e.ts
    global-teardown-e2e.ts
```

---

## Test Types

**Unit Tests (\*.spec.ts):**

- Test single class/function in isolation
- Mock all dependencies
- Fast (< 1ms per test)

```typescript
describe('OrdersService', () => {
  let service: OrdersService;
  let repository: MockType<Repository<Order>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useFactory: repositoryMockFactory,
        },
      ],
    }).compile();

    service = module.get(OrdersService);
    repository = module.get(getRepositoryToken(Order));
  });

  it('should create order', async () => {
    repository.save.mockResolvedValue(mockOrder);
    const result = await service.create(mockDto);
    expect(result).toEqual(mockOrder);
  });
});
```

**Integration Tests (\*.integration.spec.ts):**

- Test multiple components together
- Real database (test DB)
- Slower (100-500ms per test)

**E2E Tests (\*.e2e-spec.ts):**

- Test full HTTP request flow
- Real app, real DB, real queues
- Slowest (500-2000ms per test)

```typescript
describe('Orders (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it('/orders (POST) should create order', () => {
    return request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(createOrderDto)
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.status).toBe('pending');
      });
  });
});
```

---

## Coverage Reports

```bash
# Run tests with coverage
npm run test:cov

# Output
-----------------------|---------|----------|---------|---------|
File                   | % Stmts | % Branch | % Funcs | % Lines |
-----------------------|---------|----------|---------|---------|
All files              |   82.45 |    78.32 |   85.67 |   82.91 |
 orders.service.ts     |   95.34 |    89.23 |   100   |   95.12 |
 payments.service.ts   |   78.45 |    72.11 |   80.34 |   78.89 |
-----------------------|---------|----------|---------|---------|
```

---

## Benefits

✅ **Fast:** Jest runs tests in parallel  
✅ **Built-in:** Mocking, assertions, coverage included  
✅ **Watch Mode:** Auto-rerun on file changes  
✅ **Snapshots:** UI testing with snapshot assertions

---

**Status:** ✅ **IMPLEMENTED**  
**Target Coverage:** 80% (branches, functions, lines, statements)  
**Config:** `jest.config.js`
