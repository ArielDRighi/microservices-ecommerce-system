# Guía de Testing y Conocimiento del Sistema

> **Documentación generada durante la implementación y pruebas de la Tarea 11**  
> **Fecha:** 1 de octubre de 2025  
> **Contexto:** Pruebas reales de endpoints del módulo de órdenes

---

## 📋 Información General del Servidor

### Configuración del Servidor

- **Puerto:** `3002` (no 3000)
- **Prefijo Global API:** `/api/v1`
- **Base URL Completa:** `http://localhost:3002/api/v1`
- **Entorno:** Development
- **Hot Reload:** Habilitado (puede tardar 2-3 segundos en aplicar cambios)

### URLs Importantes

```bash
# Servidor principal
http://localhost:3002/api/v1

# Documentación Swagger
http://localhost:3002/api/docs

# Bull Board (Dashboard de colas)
http://localhost:3002/api/v1/admin/queues

# Health Check
http://localhost:3002/health
```

---

## 🔧 Problemas Comunes y Soluciones

### 1. Decorador @CurrentUser('id') No Funciona

**Problema:**

```typescript
@CurrentUser('id') userId: string  // ❌ Retorna undefined
```

**Causa:** El decorador extrae propiedades del objeto user, pero puede fallar en ciertos contextos.

**Solución:**

```typescript
// ✅ Usar el objeto completo y extraer el ID
@CurrentUser() user: { id: string }
const userId = user.id;
```

**Archivos Afectados:**

- `src/modules/orders/orders.controller.ts` - Todos los métodos corregidos

---

### 2. Constraint NOT NULL en Base de Datos

**Problema:**

```
QueryFailedError: null value in column "sku" of relation "order_items"
violates not-null constraint
```

**Causa:** La entidad `OrderItem` tiene campos obligatorios que no se estaban poblando al crear las órdenes.

**Campos Obligatorios en OrderItem:**

- `sku` (String, NOT NULL)
- `productName` (String, NOT NULL)
- `quantity` (Integer, NOT NULL)
- `unitPrice` (Decimal, NOT NULL)
- `totalPrice` (Decimal, NOT NULL)

**Solución:**

```typescript
// En orders.service.ts, al crear orderItemsData
return {
  productId: item.productId,
  quantity: item.quantity,
  unitPrice,
  totalPrice,
  sku: product.sku, // ✅ Agregar SKU
  productName: product.name, // ✅ Agregar nombre
  product,
};
```

**Lección Aprendida:** Siempre verificar los constraints de la base de datos en las entidades antes de crear registros.

---

### 3. Hot Reload No Detecta Cambios

**Problema:** Cambios en el código no se reflejan en el servidor.

**Soluciones:**

1. **Esperar 2-3 segundos** después de guardar
2. **Tocar un archivo del módulo:** `touch src/modules/orders/orders.module.ts`
3. **Reiniciar manualmente:** Ctrl+C y `npm run start:dev`
4. **Verificar logs:** Buscar mensajes de recompilación en la terminal del servidor

**Comando de Verificación:**

```bash
# Verificar que el cambio está en el archivo
grep -A 3 "async createOrder" src/modules/orders/orders.controller.ts
```

---

### 4. TypeORM Lazy Loading de Relaciones

**Problema:** Las relaciones lazy se definen como `Promise<T>` y no se pueden acceder directamente.

**Ejemplo:**

```typescript
// ❌ Esto no funciona
order.items.forEach(...)

// ✅ Correcto
const items = await order.items;
items.forEach(...)
```

**Optimización:** Para respuestas inmediatas, crear el objeto inline sin cargar las relaciones:

```typescript
// En lugar de cargar items y luego mapearlos
return {
  id: order.id,
  items: savedItems.map((item) => ({
    id: item.id,
    productName: productData.product.name, // Usar datos ya cargados
    // ...
  })),
};
```

---

## 🔐 Autenticación y Seguridad

### Flujo de Autenticación

1. **Registrar Usuario:**

```bash
curl -X POST http://localhost:3002/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

2. **Obtener Token:**

```bash
curl -X POST http://localhost:3002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123!"
  }'
```

3. **Extraer y Guardar Token:**

```bash
TOKEN=$(curl -s -X POST http://localhost:3002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Password123!"}' \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

echo "Token: $TOKEN"
```

4. **Usar Token en Requests:**

```bash
curl -X GET http://localhost:3002/api/v1/orders \
  -H "Authorization: Bearer $TOKEN"
```

### Guards y Decoradores

- **JwtAuthGuard:** Aplicado a nivel de controlador en `@UseGuards(JwtAuthGuard)`
- **@CurrentUser():** Inyecta el usuario autenticado del token JWT
- **@ApiBearerAuth():** Documenta en Swagger que el endpoint requiere autenticación

---

## 📦 Productos y Órdenes

### Crear Productos

**Nota Importante:** Los productos NO tienen campo `stock` directo. El inventario se maneja por separado.

```bash
curl -X POST http://localhost:3002/api/v1/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Laptop HP",
    "description": "Laptop profesional",
    "price": 899.99,
    "sku": "LAPTOP-HP-001",
    "isActive": true
  }'
```

**Campos Disponibles en CreateProductDto:**

- `name` (required, string, 2-255 chars)
- `description` (optional, string, max 2000 chars)
- `price` (required, number, 0.01-999999.99)
- `sku` (required, string, uppercase alphanumeric + `-_`)
- `brand` (optional, string)
- `weight` (optional, number, in kg)
- `images` (optional, array of URLs, max 10)
- `tags` (optional, array of strings, max 20)
- `isActive` (optional, boolean, default true)
- `trackInventory` (optional, boolean, default true)

### Crear Órdenes

**Respuesta Esperada: 202 Accepted (Non-Blocking)**

```bash
curl -i -X POST http://localhost:3002/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "items": [
      {
        "productId": "e7ba3bd5-692b-4669-9c46-b3bf5dea8ad7",
        "quantity": 2
      },
      {
        "productId": "b3f324bd-11d1-4c5e-8b8d-6954a38736c4",
        "quantity": 3
      }
    ]
  }'
```

**Características Importantes:**

- ✅ Retorna **202 Accepted** inmediatamente
- ✅ No espera el procesamiento completo
- ✅ Cliente debe hacer polling del estado
- ✅ Soporta idempotencia con `idempotencyKey`
- ✅ Calcula precios automáticamente
- ✅ Crea orden + items + evento en una transacción

---

## 🔄 Idempotencia

### Cómo Funciona

**Sin idempotencyKey (generación automática):**

```typescript
// Genera: "order-2025-10-01-{userId}-{hash(items)}"
const key = generateIdempotencyKey(userId, items);
```

**Con idempotencyKey explícito:**

```bash
IDEMPOTENCY_KEY="order-unique-key-123"

# Primera petición
curl -X POST http://localhost:3002/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"items\": [...],
    \"idempotencyKey\": \"$IDEMPOTENCY_KEY\"
  }"
# Respuesta: Order ID = abc-123

# Segunda petición (mismo key)
curl -X POST http://localhost:3002/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"items\": [...],
    \"idempotencyKey\": \"$IDEMPOTENCY_KEY\"
  }"
# Respuesta: Order ID = abc-123 (MISMO ID)
```

**Validación:**

```bash
if [ "$ORDER_ID_1" = "$ORDER_ID_2" ]; then
  echo "✅ Idempotencia funciona"
else
  echo "❌ Idempotencia falló"
fi
```

---

## 🧪 Scripts de Testing

### Script Bash Completo

Ubicación: `test-orders-port-3002.sh`

```bash
#!/bin/bash
BASE_URL="http://localhost:3002/api/v1"

# 1. Registrar usuario
# 2. Login y guardar token
# 3. Crear productos
# 4. Crear orden (validar 202)
# 5. Probar idempotencia
# 6. Listar órdenes
# 7. Obtener detalles
# 8. Obtener solo estado
# 9. Validar seguridad (404)
```

**Ejecución:**

```bash
chmod +x test-orders-port-3002.sh
./test-orders-port-3002.sh
```

### Comandos Útiles para Bash

**Extraer JSON con grep:**

```bash
# Extraer accessToken
TOKEN=$(echo "$RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# Extraer ID
ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

# Contar elementos
COUNT=$(echo "$RESPONSE" | grep -o '"id":"[^"]*' | wc -l)
```

**Capturar HTTP Status Code:**

```bash
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST ...)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "202" ]; then
  echo "✅ Success"
fi
```

---

## 📊 Endpoints del Módulo de Órdenes

### POST /api/v1/orders

- **Status Code:** `202 Accepted`
- **Auth:** Required (JWT)
- **Body:** `{ items: [{ productId, quantity }], idempotencyKey?: string }`
- **Response:** Orden completa con items
- **Características:**
  - Non-blocking (respuesta inmediata)
  - Idempotente
  - Transaccional (orden + items + evento)

### GET /api/v1/orders

- **Status Code:** `200 OK`
- **Auth:** Required (JWT)
- **Response:** Array de órdenes del usuario
- **Order:** Descendente por `createdAt`
- **Relations:** Carga items y productos

### GET /api/v1/orders/:id

- **Status Code:** `200 OK` | `404 Not Found`
- **Auth:** Required (JWT)
- **Response:** Orden completa con items
- **Validación:** Solo el owner puede acceder

### GET /api/v1/orders/:id/status

- **Status Code:** `200 OK` | `404 Not Found`
- **Auth:** Required (JWT)
- **Response:** `{ orderId, status }`
- **Uso:** Polling lightweight del estado
- **Ventaja:** No carga relaciones, más rápido

---

## 🔍 Debugging y Logs

### Logs del Servidor

**Ubicación:** Terminal donde corre `npm run start:dev`

**Logs Importantes a Buscar:**

1. **Orden Creada:**

```
[OrdersController] Creating order for user {userId} with {N} items
[OrdersService] Creating order for user {userId} with idempotency key: {key}
[OrdersService] Order created with ID: {orderId}
```

2. **Evento Publicado:**

```
[EventPublisher] Published event to outbox: OrderCreated [event-id]
```

3. **Outbox Processor:**

```
[OutboxProcessor] Processing 1 pending events from outbox
[OutboxProcessor] Successfully processed event: OrderCreated [event-id]
```

4. **Errores de Base de Datos:**

```
[DatabaseError] Database query failed
QueryFailedError: null value in column "sku"...
```

### Queries SQL

El servidor muestra todas las queries ejecutadas en modo desarrollo:

```sql
-- Buscar orden por idempotency key
SELECT * FROM "orders" WHERE "idempotency_key" = $1

-- Validar productos
SELECT * FROM "products" WHERE "id" IN ($1, $2) AND "is_active" = true

-- Crear orden (transacción)
START TRANSACTION
INSERT INTO "orders" (...)
INSERT INTO "order_items" (...)
INSERT INTO "outbox_events" (...)
COMMIT
```

---

## 🎯 Validaciones de Calidad

### Checklist Pre-Commit

```bash
# 1. Linting
npm run lint
# ✅ 0 errors, 0 warnings

# 2. Type Check
npm run type-check
# ✅ No TypeScript errors

# 3. Tests
npm test
# ✅ All tests passing

# 4. Format
npm run format:check
# ✅ All files formatted

# 5. Build
npm run build
# ✅ Build successful
```

### Cobertura de Tests

**Mínimo Esperado:**

- Service: 80%+ coverage
- Controller: Cubierto con tests E2E
- DTOs: Validación automática por decoradores

---

## 📚 Patrones y Arquitectura

### Patrón Outbox

**Flujo:**

1. Service crea Order + OrderItems
2. Service publica `OrderCreatedEvent` a tabla `outbox_events`
3. Todo en la misma transacción SQL
4. OutboxProcessor lee eventos pendientes cada 5 segundos
5. OutboxProcessor publica a cola Bull
6. Event Handler procesa el evento

**Ventajas:**

- ✅ Atomicidad garantizada
- ✅ No se pierde ningún evento
- ✅ Reintentos automáticos
- ✅ Procesamiento asíncrono

### Código HTTP 202 Accepted

**Cuándo Usar:**

- Petición aceptada pero procesamiento continúa asíncronamente
- Cliente debe hacer polling del estado
- No hay resultado inmediato

**Ejemplo en Órdenes:**

```
POST /orders → 202 Accepted (orden creada, procesamiento pending)
GET /orders/:id/status → 200 OK { status: "PENDING" }
(después de procesamiento)
GET /orders/:id/status → 200 OK { status: "COMPLETED" }
```

---

## 🚨 Errores Comunes y Troubleshooting

### Error: "Cannot POST /orders"

**Causa:** Falta el prefijo `/api/v1`

**Solución:**

```bash
# ❌ Incorrecto
curl http://localhost:3002/orders

# ✅ Correcto
curl http://localhost:3002/api/v1/orders
```

### Error: "Required field is missing"

**Posibles Causas:**

1. `@CurrentUser` no está retornando el userId
2. Campo NOT NULL en DB sin valor
3. DTO faltando campo required

**Debug:**

1. Revisar logs del servidor
2. Buscar "QueryFailedError" en logs
3. Verificar el query SQL que falló
4. Identificar qué campo es NULL

### Error: 401 Unauthorized

**Causa:** Token JWT inválido, expirado o faltante

**Solución:**

```bash
# 1. Verificar que el token está en la variable
echo $TOKEN

# 2. Login nuevamente
TOKEN=$(curl -s ... | grep -o '"accessToken"...')

# 3. Verificar que funciona
curl -X GET http://localhost:3002/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### Error: 404 Not Found en orden propia

**Causa:** El endpoint de status debe ir ANTES del endpoint paramétrico

**routes.ts:**

```typescript
// ✅ Correcto
@Get(':id/status')  // Debe ir primero
getStatus() { ... }

@Get(':id')  // Después
getById() { ... }

// ❌ Incorrecto - :id captura "status"
@Get(':id')
getById() { ... }

@Get(':id/status')  // Nunca se alcanza
getStatus() { ... }
```

---

## 💡 Tips y Best Practices

### 1. Siempre Usar el Flag -i con curl

```bash
# Ver headers HTTP incluyendo status code
curl -i -X POST ...
```

### 2. Guardar IDs en Variables

```bash
# Facilita testing secuencial
PRODUCT_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
```

### 3. Verificar que el Servidor Está Corriendo

```bash
# Antes de ejecutar tests
curl -s http://localhost:3002/health || echo "Servidor no está corriendo"
```

### 4. Esperar después de Cambios en Código

```bash
# Dar tiempo al hot reload
sleep 3
```

### 5. Validar Respuestas HTTP

```bash
if [ "$HTTP_CODE" = "202" ]; then
  echo "✅ Test pasó"
else
  echo "❌ Test falló: esperaba 202, recibió $HTTP_CODE"
  exit 1
fi
```

---

## 📝 Resumen de Lecciones Aprendidas

1. **Puerto 3002, no 3000** - Siempre verificar el puerto configurado
2. **Prefijo `/api/v1`** - Todos los endpoints lo requieren
3. **@CurrentUser('id')** - Mejor usar objeto completo
4. **Constraints DB** - Revisar entidades para campos NOT NULL
5. **202 Accepted** - Para operaciones asíncronas
6. **Idempotencia** - Clave para reintentos seguros
7. **Lazy Relations** - Cuidado con `Promise<T>` en TypeORM
8. **Hot Reload** - Esperar 2-3 segundos o reiniciar manual
9. **Transacciones** - Usar QueryRunner para atomicidad
10. **Outbox Pattern** - Garantiza entrega de eventos

---

## 🔗 Enlaces Útiles

- **Swagger UI:** http://localhost:3002/api/docs
- **Bull Board:** http://localhost:3002/api/v1/admin/queues
- **Scripts de Testing:**
  - `test-orders-port-3002.sh`
  - `TESTING_ORDERS.md`
- **Resumen Tarea 11:** `TASK_11_SUMMARY.md`

---

## 📅 Mantenimiento de Este Documento

**Actualizar cuando:**

- Cambie el puerto del servidor
- Se agreguen nuevos endpoints
- Se descubran nuevos problemas comunes
- Cambien decoradores o guards
- Se modifique la estructura de la API

**Última actualización:** 1 de octubre de 2025
