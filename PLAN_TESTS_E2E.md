# 🧪 Plan de Implementación de Tests E2E

## 📋 Información del Documento

| Campo              | Valor                                    |
| ------------------ | ---------------------------------------- |
| **Proyecto**       | E-commerce Async Resilient System        |
| **Fecha Creación** | Octubre 2025                             |
| **Versión**        | 1.0.0                                    |
| **Estado**         | ✅ Aprobado - Listo para implementación  |
| **Autor**          | GitHub Copilot + Team                    |
| **Objetivo**       | Implementar suite completa de tests E2E  |

---

## 🎯 Visión General

### Objetivo Principal

Implementar una **suite completa de tests End-to-End (E2E)** siguiendo las mejores prácticas de testing de NestJS, validando:

- ✅ **Flujos de negocio completos** (customer journey, order processing saga)
- ✅ **Integración entre módulos** (orders, inventory, payments, notifications)
- ✅ **Patrones arquitectónicos** (Saga, Outbox, Circuit Breaker)
- ✅ **APIs REST** (todos los endpoints documentados)
- ✅ **Contratos de API** (request/response schemas)
- ✅ **Performance y seguridad** (SLAs, autenticación, autorización)

### Estado Actual

| Métrica                      | Actual | Objetivo Post-E2E |
| ---------------------------- | ------ | ----------------- |
| **Tests Unitarios**          | 1033   | 1033 (mantener)   |
| **Tests E2E**                | 0      | ~150-200          |
| **Coverage Unitario**        | 75%    | 75% (mantener)    |
| **Coverage E2E**             | 0%     | 60-70%            |
| **Módulos sin tests E2E**    | TODOS  | 0                 |
| **Business flows testeados** | 0      | 5+                |

### Principios Guía

1. **Test Pyramid**: 70% Unit, 20% Integration, 10% E2E
2. **Real Dependencies**: Base de datos real, Redis real, minimal mocking
3. **Isolation**: Cada test debe ser independiente y reproducible
4. **Fast Feedback**: Suite completa E2E < 3 minutos
5. **CI/CD Integration**: Todos los tests deben pasar en pipeline

---

## 📊 Análisis de la Aplicación

### Módulos Implementados

| Módulo           | Controllers | Endpoints | Complejidad | Prioridad Tests |
| ---------------- | ----------- | --------- | ----------- | --------------- |
| **Auth**         | 1           | 4         | Media       | 🔴 CRÍTICA      |
| **Users**        | 1           | 7         | Media       | 🔴 CRÍTICA      |
| **Categories**   | 1           | 9         | Alta        | 🟡 ALTA         |
| **Products**     | 1           | 7         | Media       | 🟡 ALTA         |
| **Inventory**    | 1           | 8         | Alta        | 🔴 CRÍTICA      |
| **Orders**       | 1           | 4         | Muy Alta    | 🔴 CRÍTICA      |
| **Payments**     | 0           | N/A       | Media       | 🟢 MEDIA        |
| **Notifications**| 0           | N/A       | Baja        | 🟢 BAJA         |
| **Events**       | 0           | N/A       | Media       | 🟡 ALTA         |
| **Health**       | 2           | 5         | Baja        | 🟡 ALTA         |

**Total**: ~53 endpoints públicos a testear

### Patrones Arquitectónicos Implementados

#### 1. **Saga Pattern** (Order Processing)
- **Componentes**: OrderProcessingSagaService, OrderProcessingProcessor
- **Steps**: Stock Verification → Reservation → Payment → Confirmation
- **Compensations**: Release Inventory, Cancel Order, Refund Payment
- **Testing Priority**: 🔴 CRÍTICA

#### 2. **Outbox Pattern** (Event Sourcing)
- **Componentes**: OutboxEventEntity, EventPublisher
- **Flow**: Event Creation → Outbox Storage → Async Processing → Marking Processed
- **Testing Priority**: 🟡 ALTA

#### 3. **Circuit Breaker Pattern** (Resilience)
- **Services**: PaymentService, InventoryService, NotificationService
- **States**: CLOSED → OPEN → HALF_OPEN
- **Testing Priority**: 🟡 ALTA

#### 4. **Queue Pattern** (Async Processing)
- **Queues**: order-processing, payment-processing, inventory-management, notification-sending
- **Features**: Retry, Dead Letter Queue, Priority, Progress Tracking
- **Testing Priority**: 🔴 CRÍTICA

---

## 🗂️ Estructura de Tests E2E Propuesta

```
test/
├── config/
│   ├── jest-e2e.json                         # ✨ NUEVO - Config Jest E2E
│   ├── setup-e2e.ts                          # ✨ NUEVO - Setup global E2E
│   ├── teardown-e2e.ts                       # ✨ NUEVO - Cleanup E2E
│   └── setup-after-env.ts                    # ✅ EXISTENTE
│
├── e2e/                                      # ✨ NUEVO - Directorio E2E
│   ├── smoke/                                # Smoke tests (health checks)
│   │   └── app.e2e-spec.ts                   # Basic app health
│   │
│   ├── api/                                  # Tests de endpoints individuales
│   │   ├── auth.e2e-spec.ts                  # Auth endpoints
│   │   ├── users.e2e-spec.ts                 # Users CRUD
│   │   ├── categories.e2e-spec.ts            # Categories hierarchy
│   │   ├── products.e2e-spec.ts              # Products catalog
│   │   ├── inventory.e2e-spec.ts             # Inventory management
│   │   ├── orders.e2e-spec.ts                # Orders creation
│   │   └── health.e2e-spec.ts                # Health endpoints
│   │
│   ├── business-flows/                       # Flujos de negocio completos
│   │   ├── customer-journey.e2e-spec.ts      # Full customer flow
│   │   ├── order-saga-happy-path.e2e-spec.ts # Saga success flow
│   │   ├── order-saga-failures.e2e-spec.ts   # Saga compensation
│   │   └── admin-workflows.e2e-spec.ts       # Admin operations
│   │
│   ├── integration/                          # Integración de sistemas
│   │   ├── queue-processing.e2e-spec.ts      # Bull queues E2E
│   │   ├── database-transactions.e2e-spec.ts # DB integrity
│   │   ├── event-outbox.e2e-spec.ts          # Outbox pattern
│   │   └── circuit-breaker.e2e-spec.ts       # Resilience patterns
│   │
│   ├── contracts/                            # Validación de contratos API
│   │   ├── api-schemas.e2e-spec.ts           # Response schemas
│   │   └── pagination-contracts.e2e-spec.ts  # Pagination format
│   │
│   ├── performance/                          # Performance benchmarks
│   │   ├── api-latency.e2e-spec.ts           # Response times
│   │   └── load-simulation.e2e-spec.ts       # Concurrent requests
│   │
│   └── security/                             # Security testing
│       ├── authentication.e2e-spec.ts        # Auth & tokens
│       ├── authorization.e2e-spec.ts         # Roles & permissions
│       └── input-validation.e2e-spec.ts      # Injection prevention
│
├── helpers/                                  # Test utilities
│   ├── auth.helper.ts                        # ✅ EXISTENTE - Mejorar
│   ├── database.helper.ts                    # ✅ EXISTENTE - Mejorar
│   ├── test-app.helper.ts                    # ✅ EXISTENTE - Mejorar
│   ├── test-helpers.ts                       # ✅ EXISTENTE
│   ├── mock-data.ts                          # ✅ EXISTENTE - Expandir
│   ├── index.ts                              # ✅ EXISTENTE
│   ├── queue.helper.ts                       # ✨ NUEVO - Queue testing
│   ├── saga.helper.ts                        # ✨ NUEVO - Saga testing
│   ├── factories/                            # ✨ NUEVO - Data factories
│   │   ├── user.factory.ts                   # User test data
│   │   ├── product.factory.ts                # Product test data
│   │   ├── category.factory.ts               # Category test data
│   │   └── order.factory.ts                  # Order test data
│   └── assertions/                           # ✨ NUEVO - Custom assertions
│       ├── api-response.assertion.ts         # API response validation
│       └── saga-state.assertion.ts           # Saga state validation
│
└── fixtures/                                 # ✨ NUEVO - Test data
    ├── users.json                            # User fixtures
    ├── products.json                         # Product fixtures
    └── categories.json                       # Category fixtures
```

**Total estimado**: ~150-200 tests E2E en ~25 archivos

---

## 📝 Plan de Implementación Detallado

### **FASE 1: Infraestructura Base (Tarea 1)**

**Objetivo**: Configurar toda la infraestructura necesaria para ejecutar tests E2E

#### Tarea 1: Configurar Infraestructura de Tests E2E

**Duración estimada**: 3-4 horas

**Archivos a crear/modificar**:

1. **`test/config/jest-e2e.json`** - Nueva configuración Jest para E2E
2. **`test/config/setup-e2e.ts`** - Setup global de tests E2E
3. **`test/config/teardown-e2e.ts`** - Cleanup después de tests
4. **`test/helpers/test-app.helper.ts`** - MEJORAR (ya existe)
5. **`test/helpers/database.helper.ts`** - MEJORAR (ya existe)
6. **`test/helpers/queue.helper.ts`** - NUEVO
7. **`test/helpers/saga.helper.ts`** - NUEVO
8. **`test/helpers/factories/*.ts`** - NUEVOS (4 factories)
9. **`test/fixtures/*.json`** - NUEVOS (3 fixtures)

**Prompt para GitHub Copilot**:

```markdown
Como experto en NestJS y Jest, configura la infraestructura completa para tests E2E:

1. **Crear test/config/jest-e2e.json**:
   - Configuración Jest específica para E2E
   - testEnvironment: 'node'
   - testRegex: 'test/e2e/.*\.e2e-spec\.ts$'
   - setupFilesAfterEnv: ['<rootDir>/config/setup-e2e.ts']
   - testTimeout: 60000 (1 minuto por test)
   - maxWorkers: 1 (serial execution)
   - forceExit: true
   - detectOpenHandles: true
   - collectCoverageFrom para E2E

2. **Crear test/config/setup-e2e.ts**:
   - Configurar base de datos de prueba (ecommerce_test)
   - Ejecutar migraciones automáticamente
   - Limpiar todas las tablas antes de tests
   - Configurar Redis para tests (usar DB 1)
   - Limpiar colas Bull antes de tests
   - Setup de polyfills (crypto, etc)
   - Configurar timeouts globales

3. **Crear test/config/teardown-e2e.ts**:
   - Cerrar conexiones a base de datos
   - Cerrar conexiones Redis
   - Limpiar trabajos de colas
   - Liberar recursos

4. **Mejorar test/helpers/test-app.helper.ts**:
   - Método createTestApp() para instanciar app completa
   - Método seedDatabase() para cargar fixtures
   - Método cleanDatabase() para limpiar entre tests
   - Método waitForQueueJob() para esperar procesamiento async
   - Método getTestToken() para obtener JWT de prueba

5. **Crear test/helpers/queue.helper.ts**:
   - QueueHelper class con métodos:
     * waitForJob(jobId): Promise<Job>
     * clearQueue(queueName)
     * getJobStatus(jobId)
     * getQueueLength(queueName)
     * getFailedJobs(queueName)

6. **Crear test/helpers/saga.helper.ts**:
   - SagaHelper class con métodos:
     * waitForSagaCompletion(sagaId, timeout)
     * getSagaState(sagaId)
     * assertSagaStep(sagaId, expectedStep)
     * assertSagaCompensation(sagaId)

7. **Crear factories en test/helpers/factories/**:
   - UserFactory: createUser(overrides?), createAdmin()
   - ProductFactory: createProduct(), createProducts(count)
   - CategoryFactory: createCategory(), createTree(depth)
   - OrderFactory: createOrder(), createOrderWithItems()

8. **Crear fixtures en test/fixtures/**:
   - users.json: 5 usuarios de prueba
   - products.json: 20 productos en diferentes categorías
   - categories.json: árbol de 3 niveles de categorías

**Validaciones**:
- ✅ npm run test:e2e debe ejecutar sin errores
- ✅ Base de datos de prueba debe crearse automáticamente
- ✅ Factories deben generar datos válidos
- ✅ Fixtures deben cargarse correctamente
```

**Validaciones de Calidad**:
- [ ] Ejecutar `npm run test:e2e` sin errores
- [ ] Verificar que base de datos `ecommerce_test` se crea
- [ ] Confirmar que fixtures se cargan correctamente
- [ ] Validar que factories generan datos consistentes
- [ ] Verificar cleanup entre tests (no state leaking)
- [ ] Confirmar que timeouts son apropiados
- [ ] **CI Pipeline debe pasar completamente**

---

### **FASE 2: Smoke Tests & Health Checks (Tarea 2)**

**Objetivo**: Tests básicos de que la aplicación está corriendo

#### Tarea 2: Tests E2E: Smoke Tests (Health & Basic)

**Duración estimada**: 1 hora

**Archivos a crear**:
1. **`test/e2e/smoke/app.e2e-spec.ts`**

**Tests a implementar** (~5 tests):
- ✅ GET / - App info endpoint
- ✅ GET /health - Health check general
- ✅ GET /health/ready - Readiness probe
- ✅ GET /health/live - Liveness probe
- ✅ GET /metrics - Prometheus metrics

**Prompt para GitHub Copilot**:

```markdown
Como experto en NestJS E2E testing, crea smoke tests para validar que la aplicación esté corriendo:

**Archivo**: test/e2e/smoke/app.e2e-spec.ts

**Tests a implementar**:

1. **GET / - App info**:
   - Debe retornar 200 OK
   - Body debe contener: name, version, status, environment
   - status debe ser 'running'

2. **GET /health - Health check**:
   - Debe retornar 200 OK cuando todo esté sano
   - Debe incluir status: 'ok'
   - Debe incluir info.database.status: 'up'
   - Debe incluir info.memory_heap.status: 'up'

3. **GET /health/ready - Readiness**:
   - Debe retornar 200 cuando app esté lista
   - Validar que dependencias estén disponibles

4. **GET /health/live - Liveness**:
   - Debe retornar 200 cuando app esté viva
   - Validar que proceso esté respondiendo

5. **GET /metrics - Prometheus**:
   - Debe retornar 200 OK
   - Content-Type debe ser 'text/plain'
   - Debe contener métricas básicas

**Estructura del test**:
```typescript
describe('Smoke Tests (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await TestAppHelper.createTestApp();
  });

  afterAll(async () => {
    await TestAppHelper.closeApp(app);
  });

  describe('Application Health', () => {
    it('GET / should return app info', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('name');
          expect(res.body).toHaveProperty('version');
          expect(res.body.status).toBe('running');
        });
    });

    // ... más tests
  });
});
```

**Validaciones**:
- ✅ Todos los tests deben pasar
- ✅ Coverage de health module > 80%
- ✅ Tiempo de ejecución < 10 segundos
```

**Validaciones de Calidad**:
- [ ] Ejecutar `npm run test:e2e -- smoke/app.e2e-spec.ts`
- [ ] Verificar 5 tests passing
- [ ] Confirmar tiempos de respuesta < 200ms
- [ ] **CI Pipeline debe pasar completamente**

---

### **FASE 3: API Tests - Módulos Core (Tareas 3-8)**

**Objetivo**: Testear todos los endpoints REST de forma individual

#### Tarea 3: Tests E2E: Auth API (Login, Register, Profile)

**Duración estimada**: 2 horas

**Archivo**: `test/e2e/api/auth.e2e-spec.ts`

**Tests a implementar** (~15 tests):

**POST /auth/register**:
- ✅ Registro exitoso con datos válidos
- ✅ Error 409 al registrar email duplicado
- ✅ Error 400 con email inválido
- ✅ Error 400 con password débil
- ✅ Error 400 con campos requeridos faltantes

**POST /auth/login**:
- ✅ Login exitoso con credenciales válidas
- ✅ Retorna accessToken y refreshToken
- ✅ Error 401 con email incorrecto
- ✅ Error 401 con password incorrecta
- ✅ Error 400 con formato inválido

**GET /auth/profile**:
- ✅ Obtiene perfil con token válido
- ✅ Error 401 sin token
- ✅ Error 401 con token inválido
- ✅ Error 401 con token expirado

**POST /auth/logout**:
- ✅ Logout exitoso

**Validaciones de Calidad**:
- [ ] Ejecutar `npm run test:e2e -- api/auth.e2e-spec.ts`
- [ ] Verificar ~15 tests passing
- [ ] Confirmar que tokens JWT son válidos
- [ ] Validar refresh token mechanism
- [ ] **CI Pipeline debe pasar completamente**

---

#### Tarea 4: Tests E2E: Users API (CRUD completo)

**Duración estimada**: 2-3 horas

**Archivo**: `test/e2e/api/users.e2e-spec.ts`

**Tests a implementar** (~20 tests):

**GET /users** (con autenticación):
- ✅ Lista usuarios con paginación
- ✅ Filtra por isActive
- ✅ Ordena por diferentes campos
- ✅ Error 401 sin token

**GET /users/profile**:
- ✅ Obtiene perfil del usuario autenticado
- ✅ Error 401 sin token

**GET /users/:id**:
- ✅ Obtiene usuario por ID
- ✅ Error 404 con ID inexistente
- ✅ Error 400 con UUID inválido

**POST /users** (admin only):
- ✅ Crea usuario exitosamente
- ✅ Error 409 con email duplicado
- ✅ Error 403 si no es admin

**PUT /users/:id**:
- ✅ Actualiza usuario exitosamente
- ✅ No permite cambiar email a uno existente
- ✅ Error 404 con ID inexistente

**DELETE /users/:id** (soft delete):
- ✅ Marca usuario como eliminado
- ✅ Usuario no aparece en listados
- ✅ Puede recuperarse después

**PATCH /users/:id/activate**:
- ✅ Activa usuario desactivado

**PATCH /users/:id/deactivate**:
- ✅ Desactiva usuario activo

**Validaciones de Calidad**:
- [ ] Ejecutar `npm run test:e2e -- api/users.e2e-spec.ts`
- [ ] Verificar ~20 tests passing
- [ ] Confirmar soft delete funciona
- [ ] Validar paginación y filtros
- [ ] **CI Pipeline debe pasar completamente**

---

#### Tarea 5: Tests E2E: Categories API (Jerarquía y árbol)

**Duración estimada**: 3 horas

**Archivo**: `test/e2e/api/categories.e2e-spec.ts`

**Tests a implementar** (~25 tests):

**GET /categories**:
- ✅ Lista categorías con paginación
- ✅ Filtra por isActive
- ✅ Ordena por sortOrder

**GET /categories/tree**:
- ✅ Retorna estructura de árbol completa
- ✅ Incluye subcategorías anidadas
- ✅ Respeta sortOrder

**GET /categories/:id**:
- ✅ Obtiene categoría con children
- ✅ Error 404 con ID inexistente

**GET /categories/slug/:slug**:
- ✅ Obtiene categoría por slug
- ✅ Error 404 con slug inexistente

**GET /categories/:id/descendants**:
- ✅ Obtiene todas las subcategorías
- ✅ Respeta maxDepth si se especifica

**GET /categories/:id/path**:
- ✅ Retorna breadcrumb desde root

**POST /categories** (admin only):
- ✅ Crea categoría raíz
- ✅ Crea subcategoría con parentId
- ✅ Genera slug automáticamente si no se provee
- ✅ Error 409 con slug duplicado
- ✅ Error 400 con parentId inválido (ciclo)

**PUT /categories/:id**:
- ✅ Actualiza categoría
- ✅ No permite crear ciclo en jerarquía

**DELETE /categories/:id**:
- ✅ Elimina categoría sin hijos
- ✅ Error 400 si tiene subcategorías
- ✅ Error 400 si tiene productos

**PATCH /categories/:id/activate**:
- ✅ Activa categoría

**PATCH /categories/:id/deactivate**:
- ✅ Desactiva categoría

**Validaciones de Calidad**:
- [ ] Ejecutar `npm run test:e2e -- api/categories.e2e-spec.ts`
- [ ] Verificar ~25 tests passing
- [ ] Confirmar árbol jerárquico correcto
- [ ] Validar prevención de ciclos
- [ ] Verificar slug generation
- [ ] **CI Pipeline debe pasar completamente**

---

#### Tarea 6: Tests E2E: Products API (Catálogo y búsqueda)

**Duración estimada**: 2-3 horas

**Archivo**: `test/e2e/api/products.e2e-spec.ts`

**Tests a implementar** (~20 tests):

**GET /products**:
- ✅ Lista productos con paginación
- ✅ Filtra por categoryId
- ✅ Filtra por rango de precio (minPrice, maxPrice)
- ✅ Ordena por precio, nombre, createdAt
- ✅ Filtra por isActive

**GET /products/search?q=term**:
- ✅ Busca por nombre
- ✅ Busca por descripción
- ✅ Respeta limit

**GET /products/:id**:
- ✅ Obtiene producto con detalles completos
- ✅ Error 404 con ID inexistente

**POST /products** (admin only):
- ✅ Crea producto exitosamente
- ✅ Error 409 con SKU duplicado
- ✅ Error 400 con precio negativo
- ✅ Error 403 si no es admin

**PUT /products/:id**:
- ✅ Actualiza producto
- ✅ No permite SKU duplicado

**PATCH /products/:id/activate**:
- ✅ Activa producto

**PATCH /products/:id/deactivate**:
- ✅ Desactiva producto

**DELETE /products/:id**:
- ✅ Elimina producto (soft delete)

**Validaciones de Calidad**:
- [ ] Ejecutar `npm run test:e2e -- api/products.e2e-spec.ts`
- [ ] Verificar ~20 tests passing
- [ ] Confirmar búsqueda funciona
- [ ] Validar filtros de precio
- [ ] Verificar SKU único
- [ ] **CI Pipeline debe pasar completamente**

---

#### Tarea 7: Tests E2E: Inventory API (Stock management)

**Duración estimada**: 3-4 horas

**Archivo**: `test/e2e/api/inventory.e2e-spec.ts`

**Tests a implementar** (~25 tests):

**POST /inventory/check-availability**:
- ✅ Verifica stock disponible suficiente
- ✅ Retorna false si stock insuficiente
- ✅ Considera stock reservado

**POST /inventory/reserve**:
- ✅ Reserva stock exitosamente
- ✅ Retorna reservationId único
- ✅ Error si stock insuficiente
- ✅ Error si producto no existe
- ✅ Previene overselling (race conditions)

**POST /inventory/release**:
- ✅ Libera reserva exitosamente
- ✅ Stock disponible aumenta
- ✅ Error si reservationId inválido

**POST /inventory/confirm**:
- ✅ Confirma reserva y reduce stock
- ✅ Stock reservado se convierte en vendido
- ✅ Error si reservationId no existe

**POST /inventory/movements**:
- ✅ Registra movimiento de entrada
- ✅ Registra movimiento de salida
- ✅ Mantiene histórico de movimientos

**GET /inventory/:productId**:
- ✅ Obtiene inventario actual
- ✅ Muestra quantity y reservedQuantity

**GET /inventory**:
- ✅ Lista inventarios con filtros
- ✅ Filtra por location

**GET /inventory/stats**:
- ✅ Retorna estadísticas de inventario

**Validaciones de Calidad**:
- [ ] Ejecutar `npm run test:e2e -- api/inventory.e2e-spec.ts`
- [ ] Verificar ~25 tests passing
- [ ] Confirmar transacciones atómicas
- [ ] Validar prevención de overselling
- [ ] Probar concurrencia (simular 10 reservas simultáneas)
- [ ] Verificar TTL de reservas
- [ ] **CI Pipeline debe pasar completamente**

---

#### Tarea 8: Tests E2E: Orders API (Creación y estados)

**Duración estimada**: 2-3 horas

**Archivo**: `test/e2e/api/orders.e2e-spec.ts`

**Tests a implementar** (~15 tests):

**POST /orders**:
- ✅ Crea orden con estado PENDING
- ✅ Retorna 202 Accepted (no 201)
- ✅ Retorna orderId inmediatamente
- ✅ Genera idempotencyKey único
- ✅ Valida que productos existan
- ✅ Calcula total automáticamente
- ✅ Error 400 con items vacío
- ✅ Error 401 sin autenticación
- ✅ Idempotencia: misma orden con mismo key retorna existente

**GET /orders**:
- ✅ Lista órdenes del usuario autenticado
- ✅ No muestra órdenes de otros usuarios
- ✅ Pagina resultados

**GET /orders/:id**:
- ✅ Obtiene detalle de orden con items
- ✅ Error 404 con ID inexistente
- ✅ Error 403 si orden es de otro usuario

**GET /orders/:id/status**:
- ✅ Retorna solo el estado actual
- ✅ Estados posibles: PENDING, PROCESSING, CONFIRMED, etc.

**Validaciones de Calidad**:
- [ ] Ejecutar `npm run test:e2e -- api/orders.e2e-spec.ts`
- [ ] Verificar ~15 tests passing
- [ ] Confirmar respuesta 202 Accepted
- [ ] Validar idempotencia funciona
- [ ] Verificar cálculo de totales
- [ ] **CI Pipeline debe pasar completamente**

---

### **FASE 4: Business Flows - Flujos Completos (Tareas 9-11)**

**Objetivo**: Testear journeys completos de usuario y patrones arquitectónicos

#### Tarea 9: Tests E2E: Business Flow - Customer Journey Completo

**Duración estimada**: 3-4 horas

**Archivo**: `test/e2e/business-flows/customer-journey.e2e-spec.ts`

**Tests a implementar** (~5 tests, pero complejos):

**Flujo completo de compra exitosa**:
```typescript
it('should complete full customer purchase journey', async () => {
  // 1. Register new user
  const registerRes = await request(app)
    .post('/auth/register')
    .send({
      email: 'customer@test.com',
      password: 'Test123!',
      firstName: 'John',
      lastName: 'Doe'
    })
    .expect(201);

  const { accessToken } = registerRes.body.data;

  // 2. Browse products
  const productsRes = await request(app)
    .get('/products')
    .query({ page: 1, limit: 10 })
    .expect(200);

  expect(productsRes.body.data.data.length).toBeGreaterThan(0);
  const product = productsRes.body.data.data[0];

  // 3. Check stock availability
  const stockRes = await request(app)
    .post('/inventory/check-availability')
    .send({
      productId: product.id,
      quantity: 2
    })
    .expect(200);

  expect(stockRes.body.data.available).toBe(true);

  // 4. Create order
  const orderRes = await request(app)
    .post('/orders')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      items: [
        { productId: product.id, quantity: 2 }
      ]
    })
    .expect(202); // Accepted

  const orderId = orderRes.body.data.orderId;

  // 5. Wait for order processing (saga execution)
  await QueueHelper.waitForJobCompletion('order-processing', orderId, 30000);

  // 6. Verify order is confirmed
  const finalOrderRes = await request(app)
    .get(`/orders/${orderId}`)
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);

  expect(finalOrderRes.body.data.status).toBe('CONFIRMED');
  expect(finalOrderRes.body.data.paymentId).toBeDefined();

  // 7. Verify inventory was updated
  const inventoryRes = await request(app)
    .post('/inventory/check-availability')
    .send({
      productId: product.id,
      quantity: 100 // intentionally high to check current stock
    })
    .expect(200);

  // Stock should be reduced by 2
  expect(inventoryRes.body.data.currentStock).toBe(
    stockRes.body.data.currentStock - 2
  );
});
```

**Otros flujos a testear**:
- ✅ Registro → Login → Ver perfil → Actualizar perfil
- ✅ Browse categorías → Ver productos por categoría → Ver detalle
- ✅ Agregar producto al carrito → Verificar stock → Crear orden
- ✅ Admin crea productos → Configura inventario → Gestiona órdenes

**Validaciones de Calidad**:
- [ ] Ejecutar `npm run test:e2e -- business-flows/customer-journey.e2e-spec.ts`
- [ ] Verificar ~5 tests passing (complejos)
- [ ] Confirmar flujo end-to-end completo
- [ ] Validar que saga se ejecuta correctamente
- [ ] Verificar timing < 30 segundos por test
- [ ] **CI Pipeline debe pasar completamente**

---

#### Tarea 10: Tests E2E: Business Flow - Order Processing Saga (Happy Path)

**Duración estimada**: 3-4 horas

**Archivo**: `test/e2e/business-flows/order-saga-happy-path.e2e-spec.ts`

**Tests a implementar** (~10 tests):

**Saga completo exitoso**:
```typescript
describe('Order Processing Saga - Happy Path', () => {
  it('should execute saga successfully: PENDING → CONFIRMED', async () => {
    // 1. Setup: Create user, product, inventory
    const { accessToken } = await AuthHelper.createTestUser();
    const product = await ProductFactory.create({ price: 100 });
    await InventoryFactory.create({ productId: product.id, quantity: 100 });

    // 2. Create order
    const orderRes = await request(app)
      .post('/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        items: [{ productId: product.id, quantity: 1 }]
      })
      .expect(202);

    const orderId = orderRes.body.data.orderId;
    const sagaId = orderRes.body.data.sagaId;

    // 3. Wait for saga to start
    await SagaHelper.waitForSagaStep(sagaId, 'STARTED', 5000);

    // 4. Verify Step 1: Stock Verified
    await SagaHelper.waitForSagaStep(sagaId, 'STOCK_VERIFIED', 5000);
    const saga1 = await SagaHelper.getSagaState(sagaId);
    expect(saga1.currentStep).toBe('STOCK_VERIFIED');

    // 5. Verify Step 2: Stock Reserved
    await SagaHelper.waitForSagaStep(sagaId, 'STOCK_RESERVED', 5000);
    const saga2 = await SagaHelper.getSagaState(sagaId);
    expect(saga2.stateData.reservationId).toBeDefined();

    // 6. Verify Step 3: Payment Processing
    await SagaHelper.waitForSagaStep(sagaId, 'PAYMENT_PROCESSING', 10000);

    // 7. Verify Step 4: Payment Completed
    await SagaHelper.waitForSagaStep(sagaId, 'PAYMENT_COMPLETED', 5000);
    const saga3 = await SagaHelper.getSagaState(sagaId);
    expect(saga3.stateData.paymentId).toBeDefined();

    // 8. Verify Step 5: Notification Sent
    await SagaHelper.waitForSagaStep(sagaId, 'NOTIFICATION_SENT', 5000);

    // 9. Verify Step 6: Order Confirmed
    await SagaHelper.waitForSagaCompletion(sagaId, 30000);
    const finalSaga = await SagaHelper.getSagaState(sagaId);
    expect(finalSaga.status).toBe('COMPLETED');
    expect(finalSaga.currentStep).toBe('CONFIRMED');

    // 10. Verify order status
    const finalOrder = await request(app)
      .get(`/orders/${orderId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(finalOrder.body.data.status).toBe('CONFIRMED');

    // 11. Verify inventory was reduced
    const inventory = await request(app)
      .get(`/inventory/product/${product.id}`)
      .expect(200);

    expect(inventory.body.data.quantity).toBe(99);
    expect(inventory.body.data.reservedQuantity).toBe(0);
  });
});
```

**Otros tests del saga happy path**:
- ✅ Verificar timing de cada step
- ✅ Verificar métricas del saga (stepMetrics)
- ✅ Verificar event outbox entries
- ✅ Verificar circuit breaker stats
- ✅ Múltiples órdenes en paralelo

**Validaciones de Calidad**:
- [ ] Ejecutar `npm run test:e2e -- business-flows/order-saga-happy-path.e2e-spec.ts`
- [ ] Verificar ~10 tests passing
- [ ] Confirmar cada step del saga se ejecuta
- [ ] Validar timing de saga completo < 30 segundos
- [ ] Verificar métricas de performance
- [ ] **CI Pipeline debe pasar completamente**

---

#### Tarea 11: Tests E2E: Business Flow - Saga Compensation (Failure Scenarios)

**Duración estimada**: 4-5 horas

**Archivo**: `test/e2e/business-flows/order-saga-failures.e2e-spec.ts`

**Tests a implementar** (~12 tests):

**Escenario 1: Stock Insuficiente**:
```typescript
it('should compensate when stock is insufficient', async () => {
  // Setup: product with low stock
  const product = await ProductFactory.create();
  await InventoryFactory.create({ productId: product.id, quantity: 1 });

  // Try to order more than available
  const orderRes = await request(app)
    .post('/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({
      items: [{ productId: product.id, quantity: 10 }]
    })
    .expect(202);

  const sagaId = orderRes.body.data.sagaId;

  // Wait for saga to fail
  await SagaHelper.waitForSagaCompletion(sagaId, 30000);
  const saga = await SagaHelper.getSagaState(sagaId);

  // Assert compensation was executed
  expect(saga.status).toBe('COMPENSATED');
  expect(saga.errorDetails).toContain('Insufficient stock');

  // Verify order was cancelled
  const order = await request(app)
    .get(`/orders/${orderRes.body.data.orderId}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  expect(order.body.data.status).toBe('CANCELLED');
});
```

**Escenario 2: Payment Failure**:
```typescript
it('should compensate when payment fails', async () => {
  // Setup: product and inventory
  const product = await ProductFactory.create({ price: 999999 }); // High price triggers mock failure
  await InventoryFactory.create({ productId: product.id, quantity: 100 });

  // Create order
  const orderRes = await request(app)
    .post('/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({
      items: [{ productId: product.id, quantity: 1 }]
    })
    .expect(202);

  const sagaId = orderRes.body.data.sagaId;

  // Wait for saga to fail at payment step
  await SagaHelper.waitForSagaCompletion(sagaId, 30000);
  const saga = await SagaHelper.getSagaState(sagaId);

  expect(saga.status).toBe('COMPENSATED');
  expect(saga.currentStep).toBe('PAYMENT_PROCESSING');

  // Verify inventory reservation was released
  const inventory = await request(app)
    .get(`/inventory/product/${product.id}`)
    .expect(200);

  expect(inventory.body.data.reservedQuantity).toBe(0);

  // Verify order was cancelled
  const order = await request(app)
    .get(`/orders/${orderRes.body.data.orderId}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  expect(order.body.data.status).toBe('CANCELLED');
  expect(order.body.data.failureReason).toContain('Payment failed');
});
```

**Otros escenarios de fallo**:
- ✅ Notification failure (order should still be confirmed)
- ✅ Circuit breaker OPEN (multiple failures)
- ✅ Timeout en step del saga
- ✅ Retry con success después de failures
- ✅ Compensación parcial
- ✅ Verificar logs de compensación

**Validaciones de Calidad**:
- [ ] Ejecutar `npm run test:e2e -- business-flows/order-saga-failures.e2e-spec.ts`
- [ ] Verificar ~12 tests passing
- [ ] Confirmar compensaciones se ejecutan correctamente
- [ ] Validar inventory se libera en fallo
- [ ] Verificar orden se marca como CANCELLED
- [ ] Probar circuit breaker activation
- [ ] **CI Pipeline debe pasar completamente**

---

### **FASE 5: Integration Tests - Patrones Arquitectónicos (Tareas 12-14)**

**Objetivo**: Testear integración de sistemas y patrones

#### Tarea 12: Tests E2E: Integration - Queue Processing End-to-End

**Duración estimada**: 2-3 horas

**Archivo**: `test/e2e/integration/queue-processing.e2e-spec.ts`

**Tests a implementar** (~10 tests):

- ✅ Order creation → Queue job added → Processor execution → Saga execution → Final state
- ✅ Job retry on transient failure
- ✅ Job moves to failed after max retries
- ✅ Dead letter queue for permanent failures
- ✅ Job progress tracking
- ✅ Job priority handling
- ✅ Multiple jobs processed in parallel
- ✅ Queue pause/resume functionality
- ✅ Job deduplication

**Validaciones de Calidad**:
- [ ] Verificar ~10 tests passing
- [ ] Confirmar retry mechanism funciona
- [ ] Validar dead letter queue
- [ ] **CI Pipeline debe pasar completamente**

---

#### Tarea 13: Tests E2E: Integration - Database Transactions & Consistency

**Duración estimada**: 2-3 horas

**Archivo**: `test/e2e/integration/database-transactions.e2e-spec.ts`

**Tests a implementar** (~8 tests):

- ✅ Order + OrderItems created in single transaction
- ✅ Rollback on error maintains consistency
- ✅ Concurrent updates handled correctly
- ✅ Optimistic locking prevents conflicts
- ✅ Foreign key constraints enforced
- ✅ Cascading deletes work correctly
- ✅ Unique constraints validated

**Validaciones de Calidad**:
- [ ] Verificar ~8 tests passing
- [ ] Confirmar ACID properties
- [ ] Validar isolation levels
- [ ] **CI Pipeline debe pasar completamente**

---

#### Tarea 14: Tests E2E: Integration - Event Outbox Pattern

**Duración estimada**: 2 horas

**Archivo**: `test/e2e/integration/event-outbox.e2e-spec.ts`

**Tests a implementar** (~6 tests):

- ✅ Order creation → Outbox event created
- ✅ Outbox processor picks up event
- ✅ Event marked as processed
- ✅ Idempotent event consumption
- ✅ Event retry on failure
- ✅ Dead letter for problematic events

**Validaciones de Calidad**:
- [ ] Verificar ~6 tests passing
- [ ] Confirmar at-least-once delivery
- [ ] Validar idempotencia
- [ ] **CI Pipeline debe pasar completamente**

---

### **FASE 6: Contracts, Performance & Security (Tareas 15-18)**

**Objetivo**: Validar contratos, performance y seguridad

#### Tarea 15: Tests E2E: Contract Testing - API Response Schemas

**Duración estimada**: 2-3 horas

**Archivo**: `test/e2e/contracts/api-schemas.e2e-spec.ts`

**Tests a implementar** (~20 tests):

- ✅ Validar estructura de UserResponseDto
- ✅ Validar estructura de ProductResponseDto
- ✅ Validar estructura de OrderResponseDto
- ✅ Validar paginación consistente
- ✅ Validar formato de errores estándar
- ✅ Snapshot testing para responses críticas

**Validaciones de Calidad**:
- [ ] Verificar ~20 tests passing
- [ ] Confirmar schemas son consistentes
- [ ] **CI Pipeline debe pasar completamente**

---

#### Tarea 16: Tests E2E: Performance - Response Time Benchmarks

**Duración estimada**: 2 horas

**Archivo**: `test/e2e/performance/api-latency.e2e-spec.ts`

**Tests a implementar** (~10 tests):

- ✅ GET /products < 200ms
- ✅ POST /orders < 500ms
- ✅ GET /health < 100ms
- ✅ POST /auth/login < 300ms
- ✅ 10 requests concurrentes < 2 segundos total

**Validaciones de Calidad**:
- [ ] Verificar ~10 tests passing
- [ ] Confirmar SLAs cumplidos
- [ ] **CI Pipeline debe pasar completamente**

---

#### Tarea 17: Tests E2E: Security - Authentication & Authorization

**Duración estimada**: 2-3 horas

**Archivo**: `test/e2e/security/authentication.e2e-spec.ts`

**Tests a implementar** (~15 tests):

- ✅ Endpoints protegidos sin token → 401
- ✅ Token inválido → 401
- ✅ Token expirado → 401
- ✅ Usuario sin permisos → 403
- ✅ Admin endpoints solo para admin
- ✅ SQL injection attempts blocked
- ✅ XSS prevention

**Validaciones de Calidad**:
- [ ] Verificar ~15 tests passing
- [ ] Confirmar seguridad robusta
- [ ] **CI Pipeline debe pasar completamente**

---

#### Tarea 18: Tests E2E: Error Handling - Edge Cases & Validation

**Duración estimada**: 2 horas

**Archivo**: `test/e2e/security/input-validation.e2e-spec.ts`

**Tests a implementar** (~12 tests):

- ✅ Payloads malformados → 400
- ✅ Campos faltantes → 400
- ✅ Tipos incorrectos → 400
- ✅ Duplicados → 409
- ✅ Not found → 404
- ✅ Rate limiting → 429

**Validaciones de Calidad**:
- [ ] Verificar ~12 tests passing
- [ ] Confirmar validaciones robustas
- [ ] **CI Pipeline debe pasar completamente**

---

### **FASE 7: Documentación y Finalización (Tareas 19-20)**

#### Tarea 19: Documentación y CI/CD para tests E2E

**Duración estimada**: 2 horas

**Archivos a modificar**:
- `README.md` - Agregar sección de E2E tests
- `.github/workflows/ci.yml` - Agregar job de E2E tests
- `package.json` - Scripts ya están configurados

**Validaciones de Calidad**:
- [ ] README actualizado
- [ ] CI workflow ejecuta tests E2E
- [ ] **CI Pipeline debe pasar completamente**

---

#### Tarea 20: Validación final y coverage E2E

**Duración estimada**: 1 hora

**Actividades**:
- Ejecutar suite completa: `npm run test:e2e:cov`
- Generar reporte HTML de coverage E2E
- Validar que CI pipeline pase completamente
- Documentar métricas finales

**Métricas esperadas**:
- ✅ ~150-200 tests E2E passing
- ✅ Coverage E2E: 60-70%
- ✅ Tiempo ejecución: < 3 minutos
- ✅ 0 tests flakey
- ✅ CI pipeline verde

---

## 📊 Resumen de Métricas Esperadas

### Tests Totales

| Tipo       | Actual | Target Post-E2E | Incremento |
| ---------- | ------ | --------------- | ---------- |
| Unit       | 1033   | 1033            | +0         |
| **E2E**    | **0**  | **~180**        | **+180**   |
| **TOTAL**  | 1033   | **~1213**       | **+17%**   |

### Coverage

| Área                     | Actual | Target |
| ------------------------ | ------ | ------ |
| Coverage Unitario        | 75%    | 75%    |
| **Coverage E2E**         | **0%** | **65%**|
| Coverage Global Estimado | 75%    | 78%    |

### Tiempo de Ejecución

| Suite    | Tiempo Actual | Tiempo Target |
| -------- | ------------- | ------------- |
| Unit     | ~74s          | ~74s          |
| **E2E**  | **N/A**       | **<180s**     |
| CI Total | ~2min         | ~5min         |

### Distribución de Tests E2E

| Categoría        | # Tests | % Total |
| ---------------- | ------- | ------- |
| Smoke            | 5       | 3%      |
| API              | 120     | 67%     |
| Business Flows   | 27      | 15%     |
| Integration      | 24      | 13%     |
| Contracts        | 20      | 11%     |
| Performance      | 10      | 6%      |
| Security         | 27      | 15%     |
| **TOTAL**        | **~180**| **100%**|

---

## ✅ Validaciones de Calidad por Tarea

### Checklist General (TODAS las tareas)

Antes de cada push:

- [ ] Ejecutar `npm run lint` sin errores
- [ ] Verificar `npm run type-check` sin errores
- [ ] Correr `npm run test:cov` (unit tests siguen pasando)
- [ ] Correr `npm run test:e2e` (nuevos tests E2E pasan)
- [ ] Validar que no hay tests flakey (ejecutar 3 veces)
- [ ] Verificar timing de tests < límite especificado
- [ ] Confirmar que código está documentado
- [ ] **Push y esperar que CI pipeline pase COMPLETAMENTE**

### Criterios de Aceptación

Una tarea se considera **COMPLETADA** cuando:

1. ✅ Todos los tests de la tarea pasan (0 failures)
2. ✅ Coverage no disminuye (mantener 75%+ unit, 60%+ E2E)
3. ✅ No hay tests flakey (100% reproducibilidad)
4. ✅ Timing cumple SLAs (tests rápidos)
5. ✅ CI pipeline pasa completamente (GitHub Actions verde)
6. ✅ Código revisado y aprobado
7. ✅ Documentación actualizada

---

## 🚀 Workflow de Implementación

### Por Cada Tarea

```bash
# 1. Crear branch para la tarea
git checkout -b task-XX-nombre-descriptivo

# 2. Implementar tests según el prompt
# ... codificar ...

# 3. Ejecutar validaciones locales
npm run lint
npm run type-check
npm run test:cov                    # Unit tests
npm run test:e2e                    # E2E tests
npm run test:e2e -- ruta/al/archivo # Test específico

# 4. Ejecutar 3 veces para verificar no-flakiness
npm run test:e2e -- ruta/al/archivo
npm run test:e2e -- ruta/al/archivo
npm run test:e2e -- ruta/al/archivo

# 5. Commit con mensaje descriptivo
git add .
git commit -m "test(e2e): implementar tests de [módulo/feature]

- Agregar [X] tests E2E para [funcionalidad]
- Validar [comportamiento específico]
- Coverage E2E: XX%

Tests: XX passing, 0 failures
"

# 6. Push y esperar CI
git push origin task-XX-nombre-descriptivo

# 7. Verificar GitHub Actions pasa
# Si CI falla, fix y repetir desde paso 3

# 8. Merge a main cuando CI esté verde
```

---

## 📚 Recursos y Referencias

### Documentación Oficial

- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

### Archivos de Referencia Internos

- `TESTING_STANDARDS.md` - Estándares de testing del proyecto
- `PLANIFICATION.md` - Plan general del proyecto
- `test/helpers/` - Helpers existentes para extender

### Ejemplos de Tests E2E en el Proyecto

```typescript
// test/e2e/api/auth.e2e-spec.ts (ejemplo)
describe('Auth API (E2E)', () => {
  let app: INestApplication;
  let authHelper: AuthHelper;

  beforeAll(async () => {
    app = await TestAppHelper.createTestApp();
    authHelper = new AuthHelper(app);
  });

  afterAll(async () => {
    await TestAppHelper.closeApp(app);
  });

  beforeEach(async () => {
    await DatabaseHelper.cleanDatabase();
  });

  describe('POST /auth/register', () => {
    it('should register new user successfully', async () => {
      const userData = {
        email: 'newuser@test.com',
        password: 'Test123!',
        firstName: 'John',
        lastName: 'Doe'
      };

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(userData)
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('user');
          expect(res.body.data).toHaveProperty('accessToken');
          expect(res.body.data.user.email).toBe(userData.email);
        });
    });

    it('should fail with duplicate email', async () => {
      // Arrange: Create user first
      await authHelper.registerUser({
        email: 'existing@test.com',
        password: 'Test123!',
        firstName: 'Jane',
        lastName: 'Doe'
      });

      // Act & Assert: Try to register with same email
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'existing@test.com',
          password: 'Test123!',
          firstName: 'John',
          lastName: 'Smith'
        })
        .expect(409)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.error.code).toBe('USER_ALREADY_EXISTS');
        });
    });
  });
});
```

---

## 🎯 Conclusión

Este plan proporciona una **guía completa y detallada** para implementar tests E2E de nivel enterprise en el proyecto. Siguiendo este plan:

✅ **Cobertura Completa**: ~180 tests E2E cubriendo todos los módulos  
✅ **Calidad Garantizada**: Validaciones exhaustivas en cada tarea  
✅ **CI/CD Ready**: Pipeline verde después de cada tarea  
✅ **Mantenible**: Estructura clara y helpers reutilizables  
✅ **Escalable**: Fácil agregar más tests en el futuro  

**Próximos Pasos**:
1. Revisar y aprobar este plan
2. Comenzar con Tarea 1 (Infraestructura)
3. Implementar tareas secuencialmente
4. Validar CI después de cada tarea
5. Iterar y mejorar basado en feedback

---

**¿Listo para comenzar? 🚀**
