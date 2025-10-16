# 📦 API Testing - Módulo de Inventario (Inventory)

**Módulo:** Inventory  
**Base URL:** `http://localhost:3002/api/v1/inventory`  
**Descripción:** Gestión de stock, reservas con TTL, movimientos, estadísticas en tiempo real y control de acceso basado en roles (RBAC)

---

## 🔐 Control de Acceso (RBAC)

Este módulo implementa control de acceso basado en roles:

| Endpoint                         | Método | Acceso            | Descripción              |
| -------------------------------- | ------ | ----------------- | ------------------------ |
| `/inventory`                     | POST   | **🔴 ADMIN Only** | Crear inventario inicial |
| `/inventory/add-stock`           | POST   | **🔴 ADMIN Only** | Agregar stock            |
| `/inventory/remove-stock`        | POST   | **🔴 ADMIN Only** | Remover stock            |
| `/inventory/product/:productId`  | GET    | 🟢 Público        | Obtener inventario       |
| `/inventory`                     | GET    | 🟢 Público        | Listar inventario        |
| `/inventory/check-availability`  | POST   | 🟢 Público        | Verificar disponibilidad |
| `/inventory/reserve`             | POST   | 🟡 Auth Required  | Reservar stock           |
| `/inventory/release-reservation` | PUT    | 🟡 Auth Required  | Liberar reserva          |
| `/inventory/fulfill-reservation` | PUT    | 🟡 Auth Required  | Confirmar reserva        |
| `/inventory/low-stock`           | GET    | 🟢 Público        | Stock bajo               |
| `/inventory/out-of-stock`        | GET    | 🟢 Público        | Sin stock                |
| `/inventory/stats`               | GET    | 🟡 Auth Required  | Estadísticas             |

### Roles Disponibles

- **ADMIN**: Acceso completo (crear inventario, agregar/remover stock)
- **USER**: Puede reservar/liberar/confirmar (operaciones de compra)
- **Público**: Solo lectura (ver inventario y disponibilidad)

### 🔑 Obtener Tokens por Rol

```bash
# Token de ADMINISTRADOR (crear/agregar/remover stock)
export ADMIN_TOKEN=$(curl -s -X POST "http://localhost:3002/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Admin123!"
  }' | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

# Token de USUARIO (reservas)
export USER_TOKEN=$(curl -s -X POST "http://localhost:3002/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com",
    "password": "Admin123!"
  }' | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

echo "Admin Token: $ADMIN_TOKEN"
echo "User Token: $USER_TOKEN"
```

### ⚠️ Respuesta 403 Forbidden (Sin Permisos)

Cuando un usuario sin rol ADMIN intenta realizar operaciones administrativas:

```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

---

## 📋 Índice de Tests

- [ ] 1️⃣ **Crear Inventario Inicial** (POST /inventory) **[🔴 ADMIN Only]** - **EMPEZAR AQUÍ**
- [ ] 2️⃣ Agregar Stock (POST /inventory/add-stock) **[🔴 ADMIN Only]**
- [ ] 3️⃣ Obtener Inventario por Producto (GET /inventory/product/:productId) **[🟢 Público]**
- [ ] 4️⃣ Listar Todo el Inventario (GET /inventory) **[🟢 Público]**
- [ ] 5️⃣ Verificar Disponibilidad (POST /inventory/check-availability) **[🟢 Público]**
- [ ] 6️⃣ Reservar Stock (POST /inventory/reserve) **[🟡 Auth Required]**
- [ ] 7️⃣ Liberar Reserva (PUT /inventory/release-reservation) **[🟡 Auth Required]**
- [ ] 8️⃣ Confirmar Reserva (PUT /inventory/fulfill-reservation) **[🟡 Auth Required]**
- [ ] 9️⃣ Remover Stock (POST /inventory/remove-stock) **[🔴 ADMIN Only]**
- [ ] 🔟 Productos con Stock Bajo (GET /inventory/low-stock) **[🟢 Público]**
- [ ] 1️⃣1️⃣ Productos Sin Stock (GET /inventory/out-of-stock) **[🟢 Público]**
- [ ] 1️⃣2️⃣ Estadísticas de Inventario (GET /inventory/stats) **[🟡 Auth Required]**

**IMPORTANTE:** Debes crear inventario inicial para los productos antes de poder crear órdenes.

**NOTA:** Marca cada checkbox `[x]` conforme completes cada test exitosamente.

---

## 🚀 Pre-requisitos y Estado Inicial

### Antes de empezar, asegúrate de tener:

1. **✅ Servidor corriendo:** `npm run start:dev` en puerto 3002
2. **✅ Base de datos iniciada:** PostgreSQL corriendo con las migraciones aplicadas
3. **✅ Productos creados:** Al menos un producto en la DB (usar `02-PRODUCTS-MODULE.md` si es necesario)
4. **✅ Usuarios seed:** Los usuarios de prueba deben existir:
   - `admin@test.com` / `Admin123!` (rol: ADMIN)
   - `user@test.com` / `Admin123!` (rol: USER)

### Estado esperado de la DB:

- **Productos:** Debe haber al menos 1 producto activo
- **Inventarios:** Pueden estar vacíos (los crearemos en este módulo)
- **Reservas:** Ninguna (se crearán durante los tests)

### ⚠️ Importante:

Este documento usa **placeholders genéricos** (`<PRODUCT_UUID>`, `<INVENTORY_UUID>`, etc.) en las respuestas de ejemplo. Los valores reales en tu sistema serán diferentes pero deben seguir la misma estructura.

---

## Variables de Entorno

```bash
export BASE_URL="http://localhost:3002/api/v1"
export ADMIN_TOKEN=""  # Se obtendrá en la sección de autenticación
export USER_TOKEN=""   # Se obtendrá en la sección de autenticación
export PRODUCT_ID=""   # Se obtendrá dinámicamente en Test 1
export PRODUCT_SKU=""  # Se obtendrá dinámicamente en Test 1
export INVENTORY_ID="" # Se guardará después de crear inventario (Test 1)
export RESERVATION_ID="" # Se generará al crear una reserva (Test 6)
```

**NOTA:** Estas variables se llenarán automáticamente conforme ejecutes los tests en orden.

---

## ⚠️ Importante: Sistema de Reservas

El sistema de inventario implementa **reservas con TTL (Time To Live)**:

- 🔒 **Reserva temporal:** Stock reservado pero no comprometido
- ⏱️ **TTL automático:** Reserva expira después de X minutos (default: 30)
- ♻️ **Auto-liberación:** Stock vuelve a estar disponible al expirar
- ✅ **Fulfill:** Confirma la reserva y decrementa stock permanentemente
- ❌ **Release:** Cancela la reserva y libera stock inmediatamente

**Flujo típico:**

```
1. Check availability (verificar stock disponible)
2. Reserve stock (reservar con reservationId único)
3. Process order (procesar orden/pago)
4. Fulfill reservation (confirmar y decrementar)
   O
   Release reservation (cancelar y liberar)
```

---

## 1️⃣ Crear Inventario Inicial **[🔴 ADMIN Only]** - **EMPEZAR AQUÍ**

**IMPORTANTE:** Antes de poder hacer órdenes, necesitas crear registros de inventario para los productos. Solo ADMIN puede crear inventario.

### ✅ Test 1.1: Crear inventario inicial para producto como ADMIN

**Endpoint:** `POST /inventory`  
**Autenticación:** Bearer Token (JWT) - **ADMIN role required**  
**Nivel de Acceso:** 🔴 ADMIN Only  
**Status Code:** `201 Created`

**Request Body (mínimo):**

```json
{
  "productId": "a5585341-86ff-4849-8558-678a8af7c444",
  "sku": "SAMSUNG-S24-001",
  "initialStock": 100
}
```

**Request Body (completo):**

```json
{
  "productId": "a5585341-86ff-4849-8558-678a8af7c444",
  "sku": "SAMSUNG-S24-001",
  "location": "MAIN_WAREHOUSE",
  "initialStock": 100,
  "minimumStock": 10,
  "maximumStock": 1000,
  "reorderPoint": 20,
  "reorderQuantity": 50,
  "notes": "Initial inventory for Samsung Galaxy S24"
}
```

**Campos requeridos:**

- `productId` (UUID): ID del producto
- `sku` (string): SKU del producto (debe coincidir con el SKU en Products)
- `initialStock` (integer >= 0): Stock inicial

**Campos opcionales:**

- `location` (string): Ubicación/almacén (default: "MAIN_WAREHOUSE")
- `minimumStock` (integer >= 0): Stock mínimo antes de alerta (default: 5)
- `maximumStock` (integer >= 0): Capacidad máxima
- `reorderPoint` (integer >= 0): Punto de reorden
- `reorderQuantity` (integer >= 1): Cantidad a reordenar
- `notes` (string): Notas adicionales

**⚠️ PRE-REQUISITO:** Necesitas tener al menos un producto creado. Si no tienes productos, créalos primero usando el módulo de Products (`02-PRODUCTS-MODULE.md`).

**Paso 1: Obtener un producto existente dinámicamente**

```bash
# Obtener el primer producto disponible de la base de datos
export PRODUCT_ID=$(curl -s "http://localhost:3002/api/v1/products" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
export PRODUCT_SKU=$(curl -s "http://localhost:3002/api/v1/products/$PRODUCT_ID" | grep -o '"sku":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "PRODUCT_ID: $PRODUCT_ID"
echo "PRODUCT_SKU: $PRODUCT_SKU"
```

**Paso 2: Crear inventario inicial (100 unidades)**

```bash
curl -s -X POST "http://localhost:3002/api/v1/inventory" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "'$PRODUCT_ID'",
    "sku": "'$PRODUCT_SKU'",
    "initialStock": 100,
    "minimumStock": 10,
    "reorderPoint": 20
  }'
```

**⚠️ NOTA - Error 409 (Inventario ya existe):**

Si recibes un error **409 Conflict** indicando que el inventario ya existe para este producto, significa que ya se ejecutaron tests previamente o el producto ya tiene inventario asignado. En ese caso:

```bash
# Obtener el inventario existente
curl -s -X GET "http://localhost:3002/api/v1/inventory/product/$PRODUCT_ID"

# Extraer y guardar el INVENTORY_ID
export INVENTORY_ID=$(curl -s -X GET "http://localhost:3002/api/v1/inventory/product/$PRODUCT_ID" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "✅ INVENTORY_ID obtenido del inventario existente: $INVENTORY_ID"

# Continuar con el Test 2
```

**Respuesta Esperada (201 Created):**

```json
{
  "statusCode": 201,
  "message": "Created successfully",
  "data": {
    "id": "<INVENTORY_UUID>",
    "productId": "<PRODUCT_UUID>",
    "physicalStock": 100,
    "reservedStock": 0,
    "availableStock": 100,
    "minimumStock": 10,
    "maximumStock": 1000,
    "reorderPoint": 20,
    "location": "MAIN_WAREHOUSE",
    "status": "NORMAL",
    "product": {
      "id": "<PRODUCT_UUID>",
      "name": "<Product Name>",
      "sku": "<Product SKU>"
    },
    "movementsCount": 1,
    "createdAt": "<timestamp>",
    "updatedAt": "<timestamp>"
  },
  "timestamp": "<timestamp>",
  "path": "/api/v1/inventory"
}
```

**Campos en la respuesta:**

- `id`: UUID del inventario creado (**Guardar como INVENTORY_ID**)
- `physicalStock`: Stock físico total (100)
- `reservedStock`: Stock reservado en pedidos pendientes (0)
- `availableStock`: Stock disponible = physical - reserved (100)
- `status`: Estado del inventario (NORMAL, LOW_STOCK, OUT_OF_STOCK)
- `movementsCount`: Contador de movimientos (1 = creación inicial)
- `product`: Información del producto relacionado

**Paso 3: Guardar INVENTORY_ID para tests siguientes**

```bash
# Extraer el ID del inventario de la respuesta anterior
export INVENTORY_ID=$(curl -s -X GET "http://localhost:3002/api/v1/inventory/product/$PRODUCT_ID" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "INVENTORY_ID guardado: $INVENTORY_ID"
```

**Checklist:**

- [ ] Status code es 201 Created
- [ ] Respuesta contiene el inventario creado con ID
- [ ] `availableStock` = `initialStock` (100)
- [ ] `reservedStock` = 0
- [ ] `physicalStock` = `initialStock` (100)
- [ ] `status` = "NORMAL"
- [ ] `movementsCount` = 1 (creación inicial)
- [ ] Incluye información del producto relacionado
- [ ] Variable `INVENTORY_ID` guardada correctamente

---

## 2️⃣ Agregar Stock (a inventario existente) **[🔴 ADMIN Only]**

### ✅ Test 2.1: Agregar stock exitosamente como ADMIN

**Endpoint:** `POST /inventory/add-stock`  
**Autenticación:** Bearer Token (JWT) - **ADMIN role required**  
**Nivel de Acceso:** 🔴 ADMIN Only  
**Status Code:** `200 OK`

**NOTA:** Este endpoint requiere el `inventoryId`, no el `productId`. Primero debes obtener el inventoryId.

**Request Body:**

```json
{
  "inventoryId": "inventory-uuid-here",
  "movementType": "RESTOCK",
  "quantity": 50,
  "unitCost": 800.0,
  "referenceId": "PO-12345",
  "referenceType": "PURCHASE_ORDER",
  "reason": "Stock replenishment from supplier",
  "performedBy": "admin@example.com"
}
```

**Campos requeridos:**

- `inventoryId` (UUID): ID del registro de inventario (obtener con GET /inventory/product/:productId)
- `movementType` (enum): Tipo de movimiento - valores: RESTOCK, SALE, RETURN, ADJUSTMENT, DAMAGE, THEFT, TRANSFER
- `quantity` (integer): Cantidad a agregar (positivo)

**Campos opcionales:**

- `unitCost` (decimal): Costo unitario
- `referenceId` (string): ID de referencia (orden, compra, etc.)
- `referenceType` (string): Tipo de referencia
- `reason` (string): Razón del movimiento
- `performedBy` (string): Usuario que realizó el movimiento

**Comando curl:**

```bash
# Usar el INVENTORY_ID guardado del Test 1
curl -s -X POST "http://localhost:3002/api/v1/inventory/add-stock" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "inventoryId": "'$INVENTORY_ID'",
    "movementType": "RESTOCK",
    "quantity": 50,
    "reason": "Stock replenishment",
    "referenceId": "PO-'$(date +%s)'"
  }'
```

**Respuesta Esperada (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "productId": "<PRODUCT_UUID>",
    "physicalStock": 150,
    "reservedStock": 0,
    "availableStock": 150,
    "minimumStock": 10,
    "maximumStock": 1000,
    "reorderPoint": 20,
    "location": "MAIN_WAREHOUSE",
    "lastUpdated": "<timestamp>",
    "status": "NORMAL"
  },
  "timestamp": "<timestamp>",
  "path": "/api/v1/inventory/add-stock"
}
```

**Validaciones:**

- `physicalStock`: Incrementado de 100 a 150 (+50)
- `availableStock`: También 150 (sin reservas)
- `status`: Se mantiene "NORMAL"
- `lastUpdated`: Timestamp actualizado

**Checklist:**

- [ ] Status code es 200 OK
- [ ] Stock incrementado correctamente (+50 unidades)
- [ ] `physicalStock` aumentó en la cantidad especificada
- [ ] `availableStock` también aumentó
- [ ] No hay cambios en `reservedStock` (debe seguir en 0)

---

### ❌ Test 2.2: USER sin rol ADMIN intenta agregar stock (403 Forbidden)

**Endpoint:** `POST /inventory/add-stock`  
**Autenticación:** Bearer Token (USER role) - **Insufficient permissions**  
**Status Code esperado:** `403 Forbidden`

**Comando curl:**

```bash
curl -s -X POST "http://localhost:3002/api/v1/inventory/add-stock" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "inventoryId": "'$INVENTORY_ID'",
    "movementType": "RESTOCK",
    "quantity": 50
  }'
```

**Respuesta Esperada (403 Forbidden):**

```json
{
  "statusCode": 403,
  "message": "User with role 'USER' does not have access to this resource. Required roles: ADMIN",
  "error": "FORBIDDEN",
  "success": false,
  "timestamp": "<timestamp>",
  "path": "/api/v1/inventory/add-stock",
  "method": "POST"
}
```

**Checklist:**

- [ ] Status code es 403 (no 401)
- [ ] Mensaje descriptivo indica rol requerido (ADMIN)
- [ ] Stock NO fue incrementado
- [ ] Usuario autenticado pero sin permisos ADMIN

---

## 3️⃣ Obtener Inventario por Producto **[🟢 Público]**

### ✅ Test 3.1: Obtener inventario por productId

**Endpoint:** `GET /inventory/product/:productId`  
**Autenticación:** No requerida (Public)  
**Status Code:** `200 OK`

**Comando curl:**

```bash
# Usar el PRODUCT_ID del inventario creado
curl -s -X GET "http://localhost:3002/api/v1/inventory/product/$PRODUCT_ID"
```

**Respuesta Esperada (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "id": "<INVENTORY_UUID>",
    "productId": "<PRODUCT_UUID>",
    "physicalStock": 150,
    "reservedStock": 0,
    "availableStock": 150,
    "minimumStock": 10,
    "maximumStock": 1000,
    "reorderPoint": 20,
    "location": "MAIN_WAREHOUSE",
    "status": "NORMAL",
    "product": {
      "id": "<PRODUCT_UUID>",
      "name": "<Product_Name>",
      "sku": "<Product_SKU>"
    },
    "movementsCount": 2,
    "createdAt": "<timestamp>",
    "updatedAt": "<timestamp>"
  },
  "timestamp": "<timestamp>",
  "path": "/api/v1/inventory/product/<PRODUCT_UUID>"
}
```

**Campos importantes:**

- `physicalStock`: Stock físico total (150 después de agregar 50)
- `reservedStock`: Stock reservado (0 actualmente)
- `availableStock`: Stock disponible para venta (150)
- `status`: NORMAL (puede ser LOW_STOCK o OUT_OF_STOCK)
- `movementsCount`: 2 (creación inicial + un movimiento de restock)
- `product`: Información del producto asociado

**Checklist:**

- [ ] Status code es 200 OK
- [ ] Retorna información completa del inventario
- [ ] Incluye stocks (physical, reserved, available)
- [ ] Muestra status del inventario (NORMAL)
- [ ] Incluye información del producto relacionado
- [ ] Endpoint público (no requiere autenticación)

---

## 4️⃣ Listar Todo el Inventario **[🟢 Público]**

### ✅ Test 4.1: Listar todos los inventarios con paginación

**Endpoint:** `GET /inventory`  
**Autenticación:** No requerida (Public)  
**Status Code:** `200 OK`

**Comando curl:**

```bash
curl -X GET "http://localhost:3002/api/v1/inventory"
```

** (200 OK) - Resumen:**

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "items": [
      {
        "id": "<INVENTORY_UUID>",
        "productId": "<PRODUCT_UUID>",
        "physicalStock": 150,
        "reservedStock": 0,
        "availableStock": 150,
        "minimumStock": 10,
        "maximumStock": 1000,
        "reorderPoint": 20,
        "location": "MAIN_WAREHOUSE",
        "status": "NORMAL",
        "product": {
          "id": "<PRODUCT_UUID>",
          "name": "<Product_Name>",
          "sku": "<Product_SKU>"
        },
        "createdAt": "<timestamp>",
        "updatedAt": "<timestamp>"
      }
      // ... más items
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 6,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  },
  "timestamp": "2025-10-14T14:11:XX.XXXZ",
  "path": "/api/v1/inventory"
}
```

**Estructura de respuesta:**

- `items`: Array de registros de inventario
- `meta`: Información de paginación
  - Usa `hasNextPage` y `hasPreviousPage` (diferente a Products que usa hasNext/hasPrev)
  - `total`: Total de registros
  - `page`, `limit`, `totalPages`

**Checklist:**

- [ ] Status code es 200 OK
- [ ] Retorna array de inventarios en `items`
- [ ] Cada item incluye información del producto asociado
- [ ] Incluye metadata de paginación
- [ ] Endpoint público (no requiere autenticación)

---

## 5️⃣ Verificar Disponibilidad **[🟢 Público]**

### ✅ Test 5.1: Verificar disponibilidad de stock suficiente

**Endpoint:** `POST /inventory/check-availability`  
**Autenticación:** No requerida (Public)  
**Status Code:** `200 OK`

**Comando curl:**

```bash
curl -X POST "http://localhost:3002/api/v1/inventory/check-availability" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "'$PRODUCT_ID'",
    "quantity": 5,
    "location": "MAIN_WAREHOUSE"
  }'
```

** (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "productId": "<PRODUCT_UUID>",
    "physicalStock": 150,
    "reservedStock": 0,
    "availableStock": 150,
    "minimumStock": 10,
    "maximumStock": 1000,
    "reorderPoint": 20,
    "location": "MAIN_WAREHOUSE",
    "lastUpdated": "<timestamp>",
    "status": "NORMAL"
  },
  "timestamp": "2025-10-14T14:30:41.XXX",
  "path": "/api/v1/inventory/check-availability"
}
```

**Nota:** Este endpoint retorna la información completa del inventario, no solo un booleano `available`. El cliente debe verificar si `availableStock >= cantidad solicitada`.

**Checklist:**

- [ ] Status code es 200 OK
- [ ] Retorna información completa del inventario
- [ ] `availableStock` (150) es mayor que cantidad solicitada (5)
- [ ] Endpoint público (no requiere autenticación)

---

## 6️⃣ Reservar Stock **[🟡 Auth Required]**

### ✅ Test 6.1: Reservar stock exitosamente

**Endpoint:** `POST /inventory/reserve`  
**Autenticación:** Bearer Token (JWT) - Required  
**Status Code:** `201 Created`

**Request Body:**

```json
{
  "productId": "uuid",
  "quantity": 3,
  "reservationId": "res_1234567890",
  "location": "MAIN_WAREHOUSE",
  "reason": "Order processing",
  "referenceId": "order_xyz123",
  "ttlMinutes": 30
}
```

**Generar reservation ID único:**

```bash
export RESERVATION_ID="res_$(date +%s)_$RANDOM"
echo "Reservation ID: $RESERVATION_ID"
```

**Comando curl:**

```bash
curl -X POST "http://localhost:3002/api/v1/inventory/reserve" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "'$PRODUCT_ID'",
    "quantity": 3,
    "reservationId": "'$RESERVATION_ID'",
    "location": "MAIN_WAREHOUSE",
    "reason": "Order processing",
    "referenceId": "order_test_123",
    "ttlMinutes": 30
  }'
```

** (201 Created):**

```json
{
  "statusCode": 201,
  "message": "Created successfully",
  "data": {
    "reservationId": "<RESERVATION_ID>",
    "productId": "<PRODUCT_UUID>",
    "quantity": 3,
    "expiresAt": "<timestamp>",
    "location": "MAIN_WAREHOUSE",
    "reference": "order_test_123",
    "createdAt": "<timestamp>",
    "status": "ACTIVE"
  },
  "timestamp": "<timestamp>",
  "path": "/api/v1/inventory/reserve"
}
```

**Nota importante:**

- El `reservationId` debe guardarse para liberar o confirmar la reserva
- `expiresAt` es 30 minutos después de la creación (según TTL)
- El stock `reservedStock` aumenta en 3, `availableStock` disminuye en 3

**Guardar para tests siguientes:**

```bash
# El RESERVATION_ID ya está en la variable de entorno
echo "RESERVATION_ID: $RESERVATION_ID"
```

**Checklist:**

- [ ] Status code es 201 Created
- [ ] `status` es `ACTIVE`
- [ ] `expiresAt` es 30 minutos después (TTL especificado)
- [ ] Stock reservado aumentará temporalmente
- [ ] `reservationId` es único y almacenado

---

### ❌ Test 2.2: Reservar sin stock suficiente (400 Bad Request)

**Comando curl:**

```bash
curl -X POST "$BASE_URL/inventory/reserve" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"quantity\": 999999,
    \"reservationId\": \"res_insufficient\"
  }" | jq '.'
```

**Respuesta Esperada (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": "Insufficient stock to reserve",
  "error": "Bad Request"
}
```

**Checklist:**

- [ ] Status code es 400
- [ ] No se crea reserva si no hay stock

---

### ❌ Test 2.3: Reservar con reservationId duplicado (409 Conflict)

**Comando curl:**

```bash
# Primera reserva
curl -s -X POST "$BASE_URL/inventory/reserve" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"quantity\": 1,
    \"reservationId\": \"duplicate_test\"
  }" > /dev/null

# Segunda reserva con mismo ID
curl -X POST "$BASE_URL/inventory/reserve" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"quantity\": 1,
    \"reservationId\": \"duplicate_test\"
  }" | jq '.'
```

**Respuesta Esperada (409 Conflict):**

```json
{
  "statusCode": 409,
  "message": "Reservation ID already exists",
  "error": "Conflict"
}
```

**Checklist:**

- [ ] Status code es 409
- [ ] `reservationId` debe ser único

---

## 3️⃣ Liberar Reserva

### ✅ Test 3.1: Liberar reserva exitosamente

**Endpoint:** `PUT /inventory/release-reservation`  
**Autenticación:** Bearer Token (JWT) - Required  
**Status Code:** `200 OK`

**Request Body:**

```json
{
  "reservationId": "res_1234567890"
}
```

**Comando curl:**

```bash
curl -s -X PUT "http://localhost:3002/api/v1/inventory/release-reservation" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "'"$PRODUCT_ID"'",
    "quantity": 5,
    "reservationId": "'"$RESERVATION_ID_2"'"
  }'
```

** (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "productId": "<PRODUCT_UUID>",
    "physicalStock": 150,
    "reservedStock": 3,
    "availableStock": 147,
    "minimumStock": 10,
    "maximumStock": 1000,
    "reorderPoint": 20,
    "location": "MAIN_WAREHOUSE",
    "lastUpdated": "<timestamp>",
    "status": "NORMAL"
  },
  "timestamp": "<timestamp>"
}
```

**📝 Notas:**

- ⚠️ **El endpoint requiere productId, quantity y reservationId** (no solo reservationId como se esperaba)
- ✅ Al liberar la reserva, `reservedStock` disminuye y `availableStock` aumenta
- ✅ El stock vuelve a estar disponible para nuevas reservas
- ✅ RESERVATION_ID_2: <RESERVATION_ID_2> (5 unidades) fue liberado exitosamente
- ✅ Stock final: reservedStock=3 (solo queda la primera reserva), availableStock=147

**Checklist:**

- [ ] Status code es 200
- [ ] Stock vuelve a estar disponible
- [ ] `reservedStock` disminuye correctamente
- [ ] `lastUpdated` tiene timestamp actualizado

---

### ❌ Test 3.2: Liberar reserva inexistente (404 Not Found)

**Comando curl:**

```bash
curl -X PUT "$BASE_URL/inventory/release-reservation" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reservationId": "nonexistent_reservation"
  }' | jq '.'
```

**Respuesta Esperada (404 Not Found):**

```json
{
  "statusCode": 404,
  "message": "Reservation not found",
  "error": "Not Found"
}
```

**Checklist:**

- [ ] Status code es 404

---

## 4️⃣ Confirmar Reserva (Fulfill)

### ✅ Test 4.1: Confirmar reserva exitosamente

**Endpoint:** `PUT /inventory/fulfill-reservation`  
**Autenticación:** Bearer Token (JWT) - Required  
**Status Code:** `200 OK`  
**Efecto:** Stock se decrementa permanentemente

**Request Body:**

```json
{
  "reservationId": "res_1234567890"
}
```

**Comando curl:**

```bash
# Confirmar reserva existente (RESERVATION_ID)
curl -s -X PUT "http://localhost:3002/api/v1/inventory/fulfill-reservation" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "'"$PRODUCT_ID"'",
    "quantity": 3,
    "reservationId": "'"$RESERVATION_ID"'",
    "orderId": "order_test_123"
  }'
```

** (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "productId": "<PRODUCT_UUID>",
    "physicalStock": 147,
    "reservedStock": 0,
    "availableStock": 147,
    "minimumStock": 10,
    "maximumStock": 1000,
    "reorderPoint": 20,
    "location": "MAIN_WAREHOUSE",
    "lastUpdated": "<timestamp>",
    "status": "NORMAL"
  },
  "timestamp": "<timestamp>"
}
```

**📝 Notas:**

- ⚠️ **El endpoint requiere productId, quantity, reservationId y orderId** (orderId es obligatorio)
- ✅ Al confirmar la reserva, el stock se decrementa **permanentemente**
- ✅ `physicalStock` disminuyó de 150 a 147 (3 unidades vendidas)
- ✅ `reservedStock` volvió a 0 (la reserva fue consumida)
- ✅ `availableStock` = 147 (físico - reservado)
- ✅ Este es el comportamiento esperado para una venta confirmada

**Checklist:**

- [ ] Status code es 200
- [ ] Stock físico decrementado permanentemente (150 → 147)
- [ ] Reserva consumida (reservedStock: 3 → 0)
- [ ] `availableStock` refleja el nuevo stock disponible
- [ ] `lastUpdated` tiene timestamp actualizado

---

## 5️⃣ Agregar Stock

### ✅ Test 5.1: Agregar stock exitosamente

**Endpoint:** `POST /inventory/add-stock`  
**Autenticación:** Bearer Token (JWT) - Required (ADMIN)  
**Status Code:** `201 Created`

**Request Body:**

```json
{
  "productId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "quantity": 50,
  "location": "MAIN_WAREHOUSE",
  "reason": "Stock replenishment",
  "referenceId": "PO-12345"
}
```

**Comando curl:**

```bash
curl -X POST "$BASE_URL/inventory/add-stock" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"quantity\": 50,
    \"location\": \"MAIN_WAREHOUSE\",
    \"reason\": \"Stock replenishment\",
    \"referenceId\": \"PO-12345\"
  }" | jq '.'
```

**Respuesta Esperada (201 Created):**

```json
{
  "id": "movement-uuid",
  "productId": "product-uuid",
  "type": "INBOUND",
  "quantity": 50,
  "previousQuantity": 100,
  "newQuantity": 150,
  "location": "MAIN_WAREHOUSE",
  "reason": "Stock replenishment",
  "referenceId": "PO-12345",
  "createdAt": "2025-10-11T10:45:00.000Z"
}
```

**Checklist:**

- [ ] Status code es 201
- [ ] `type` es `INBOUND`
- [ ] `newQuantity` = `previousQuantity` + `quantity`
- [ ] Solo ADMIN puede agregar stock
- [ ] Movimiento registrado en audit trail

---

## 6️⃣ Remover Stock **[🔴 ADMIN Only]**

### ✅ Test 6.1: Remover stock exitosamente como ADMIN

**Endpoint:** `POST /inventory/remove-stock`  
**Autenticación:** Bearer Token (JWT) - **ADMIN role required**  
**Nivel de Acceso:** 🔴 ADMIN Only  
**Status Code:** `201 Created`

**Request Body:**

```json
{
  "productId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "quantity": 10,
  "location": "MAIN_WAREHOUSE",
  "reason": "Damaged goods",
  "referenceId": "ADJ-001"
}
```

**Comando curl:**

```bash
curl -s -X POST "http://localhost:3002/api/v1/inventory/remove-stock" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "inventoryId": "'"$INVENTORY_ID"'",
    "quantity": 10,
    "movementType": "ADJUSTMENT",
    "reason": "Damaged goods",
    "referenceId": "ADJ-001"
  }'
```

** (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "productId": "<PRODUCT_UUID>",
    "physicalStock": 137,
    "reservedStock": 0,
    "availableStock": 137,
    "minimumStock": 10,
    "maximumStock": 1000,
    "reorderPoint": 20,
    "location": "MAIN_WAREHOUSE",
    "lastUpdated": "<timestamp>",
    "status": "NORMAL"
  },
  "timestamp": "<timestamp>"
}
```

**📝 Notas:**

- ⚠️ **El endpoint requiere inventoryId, quantity, movementType** (no productId ni location)
- ✅ `movementType` válido: "ADJUSTMENT" (no "OUTBOUND")
- ✅ Stock decrementado correctamente: 147 → 137 (10 unidades removidas)
- ✅ Response code es 200 OK (no 201 Created)
- ✅ `availableStock` y `physicalStock` ambos decrementan

**Checklist:**

- [ ] Status code es 200
- [ ] `movementType` es "ADJUSTMENT"
- [ ] Stock decrementado correctamente (147 → 137)
- [ ] Solo ADMIN puede remover stock

---

### ❌ Test 6.2: USER sin rol ADMIN intenta remover stock (403 Forbidden)

**Endpoint:** `POST /inventory/remove-stock`  
**Autenticación:** Bearer Token (USER role) - **Insufficient permissions**  
**Status Code esperado:** `403 Forbidden`

**Comando curl:**

```bash
curl -s -X POST "http://localhost:3002/api/v1/inventory/remove-stock" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "inventoryId": "'"$INVENTORY_ID"'",
    "quantity": 5,
    "movementType": "ADJUSTMENT",
    "reason": "Unauthorized removal"
  }'
```

** (403 Forbidden):**

```json
{
  "statusCode": 403,
  "message": "User with role 'USER' does not have access to this resource. Required roles: ADMIN",
  "error": "FORBIDDEN",
  "success": false,
  "timestamp": "<timestamp>",
  "path": "/api/v1/inventory/remove-stock"
}
```

**Checklist:**

- [ ] Status code es 403 (no 401)
- [ ] Stock NO fue removido
- [ ] Usuario autenticado pero sin permisos ADMIN

---

### ❌ Test 6.3: Remover más stock del disponible (400 Bad Request)

**Comando curl:**

```bash
curl -X POST "$BASE_URL/inventory/remove-stock" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"quantity\": 999999
  }" | jq '.'
```

**Respuesta Esperada (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": "Cannot remove more stock than available",
  "error": "Bad Request"
}
```

**Checklist:**

- [ ] Status code es 400
- [ ] Previene stock negativo

---

## 7️⃣ Obtener Inventario por Producto

### ✅ Test 7.1: Obtener inventario de un producto

**Endpoint:** `GET /inventory/product/:productId`  
**Autenticación:** No requerida (Public)

**Comando curl:**

```bash
curl -X GET "$BASE_URL/inventory/product/$PRODUCT_ID" | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
{
  "productId": "product-uuid",
  "productName": "Product Name",
  "productSku": "PROD-001",
  "totalQuantity": 140,
  "availableQuantity": 137,
  "reservedQuantity": 3,
  "locations": [
    {
      "location": "MAIN_WAREHOUSE",
      "quantity": 100,
      "available": 98,
      "reserved": 2
    },
    {
      "location": "BACKUP_WAREHOUSE",
      "quantity": 40,
      "available": 39,
      "reserved": 1
    }
  ],
  "lowStockThreshold": 20,
  "isLowStock": false,
  "isOutOfStock": false,
  "lastRestockDate": "2025-10-11T10:45:00.000Z"
}
```

**Checklist:**

- [ ] Status code es 200
- [ ] `totalQuantity` = suma de todas las locations
- [ ] `availableQuantity` = total - reserved
- [ ] `reservedQuantity` = stock temporalmente reservado
- [ ] `locations` array muestra stock por ubicación
- [ ] Endpoint público

---

## 8️⃣ Listar Todo el Inventario

### ✅ Test 8.1: Listar inventario con paginación

**Endpoint:** `GET /inventory`  
**Query Params:** `?page=1&limit=10`

**Comando curl:**

```bash
curl -X GET "$BASE_URL/inventory?page=1&limit=10" | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
{
  "data": [
    {
      "productId": "product-uuid-1",
      "productName": "Product 1",
      "totalQuantity": 150,
      "availableQuantity": 145,
      "reservedQuantity": 5,
      "isLowStock": false,
      "isOutOfStock": false
    },
    {
      "productId": "product-uuid-2",
      "productName": "Product 2",
      "totalQuantity": 5,
      "availableQuantity": 3,
      "reservedQuantity": 2,
      "isLowStock": true,
      "isOutOfStock": false
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5
  }
}
```

**Checklist:**

- [ ] Status code es 200
- [ ] Paginación funcional
- [ ] Muestra todos los productos con inventario

---

## 9️⃣ Productos con Stock Bajo

### ✅ Test 9.1: Listar productos con stock bajo

**Endpoint:** `GET /inventory/low-stock`  
**Query Params:** `?threshold=20`

**Comando curl:**

```bash
curl -s -X GET "http://localhost:3002/api/v1/inventory/low-stock"
```

** (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "items": [],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 0,
      "totalPages": 0,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  },
  "timestamp": "<timestamp>",
  "path": "/api/v1/inventory/low-stock"
}
```

**📝 Notas:**

- ⚠️ **El endpoint NO acepta query param `threshold`** (debe estar predefinido en backend)
- ✅ En este caso, no hay productos con stock bajo actualmente
- ✅ Retorna estructura con items vacío y meta de paginación
- ✅ `hasNextPage`/`hasPreviousPage` para navegación

**Checklist:**

- [ ] Status code es 200
- [ ] Retorna productos con stock por debajo del threshold configurado
- [ ] Útil para alertas de reabastecimiento

---

## 🔟 Productos Sin Stock

### ✅ Test 10.1: Listar productos sin stock

**Endpoint:** `GET /inventory/out-of-stock`

**Comando curl:**

```bash
curl -s -X GET "http://localhost:3002/api/v1/inventory/out-of-stock"
```

** (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "items": [],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 0,
      "totalPages": 0,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  },
  "timestamp": "<timestamp>",
  "path": "/api/v1/inventory/out-of-stock"
}
```

**📝 Notas:**

- ✅ No hay productos sin stock actualmente (items vacío)
- ✅ Retorna estructura estándar con paginación
- ✅ Útil para identificar productos agotados que requieren reabastecimiento urgente

**Checklist:**

- [ ] Status code es 200
- [ ] Solo productos con `availableStock = 0` (cuando existen)

---

## 1️⃣1️⃣ Estadísticas de Inventario

### ✅ Test 11.1: Obtener estadísticas globales

**Endpoint:** `GET /inventory/stats`  
**Autenticación:** Bearer Token (JWT) - Required

**Comando curl:**

```bash
curl -s -X GET "http://localhost:3002/api/v1/inventory/stats" \
  -H "Authorization: Bearer $USER_TOKEN"
```

** (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "totalItems": 6,
    "totalValue": 195245.27,
    "lowStockCount": 0,
    "outOfStockCount": 0,
    "statusBreakdown": {
      "IN_STOCK": 6,
      "LOW_STOCK": 0,
      "OUT_OF_STOCK": 0
    }
  },
  "timestamp": "<timestamp>"
}
```

**📝 Notas:**

- ✅ **Requiere autenticación** (cualquier rol USER o ADMIN)
- ✅ Retorna estadísticas globales del inventario
- ✅ `totalItems`: 6 inventarios en el sistema
- ✅ `totalValue`: Valor total del inventario ($195,245.27)
- ✅ `statusBreakdown`: Distribución por status (IN_STOCK, LOW_STOCK, OUT_OF_STOCK)
- ✅ Útil para dashboards y reportes gerenciales

**Checklist:**

- [ ] Status code es 200
- [ ] Dashboard completo de inventario
- [ ] Estadísticas por status
- [ ] Valor total del inventario

---

## 🧪 Script de Testing Completo

```bash
#!/bin/bash
# Testing completo de Inventory Module

BASE_URL="http://localhost:3000"
TOKEN="your-jwt-token"
ADMIN_TOKEN="your-admin-jwt-token"

echo "=== 📦 Testing Inventory Module ==="
echo ""

# 0. Obtener producto existente
echo "0️⃣ Obteniendo producto..."
PRODUCT_ID=$(curl -s -X GET "$BASE_URL/products?limit=1" | jq -r '.data[0].id')
echo "✅ Product ID: $PRODUCT_ID"

# 1. Check availability
echo "1️⃣ Verificando disponibilidad..."
AVAILABILITY=$(curl -s -X POST "$BASE_URL/inventory/check-availability" \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"quantity\": 5
  }")

AVAILABLE=$(echo $AVAILABILITY | jq -r '.available')
AVAILABLE_QTY=$(echo $AVAILABILITY | jq -r '.availableQuantity')
echo "✅ Stock disponible: $AVAILABLE ($AVAILABLE_QTY unidades)"

# 2. Agregar stock (como admin)
echo "2️⃣ Agregando stock..."
ADD_STOCK=$(curl -s -X POST "$BASE_URL/inventory/add-stock" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"quantity\": 100,
    \"reason\": \"Test replenishment\"
  }")

NEW_QTY=$(echo $ADD_STOCK | jq -r '.newQuantity')
echo "✅ Stock agregado. Nuevo total: $NEW_QTY"

# 3. Reservar stock
echo "3️⃣ Reservando stock..."
RESERVATION_ID="res_test_$(date +%s)"

RESERVE=$(curl -s -X POST "$BASE_URL/inventory/reserve" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"quantity\": 5,
    \"reservationId\": \"$RESERVATION_ID\",
    \"ttlMinutes\": 30
  }")

RESERVATION_STATUS=$(echo $RESERVE | jq -r '.status')
EXPIRES_AT=$(echo $RESERVE | jq -r '.expiresAt')
echo "✅ Reserva creada: $RESERVATION_STATUS (expira: $EXPIRES_AT)"

# 4. Obtener inventario del producto
echo "4️⃣ Obteniendo inventario del producto..."
INVENTORY=$(curl -s -X GET "$BASE_URL/inventory/product/$PRODUCT_ID")

TOTAL=$(echo $INVENTORY | jq -r '.totalQuantity')
AVAILABLE=$(echo $INVENTORY | jq -r '.availableQuantity')
RESERVED=$(echo $INVENTORY | jq -r '.reservedQuantity')

echo "✅ Inventario: Total=$TOTAL, Disponible=$AVAILABLE, Reservado=$RESERVED"

# 5. Fulfill reservation
echo "5️⃣ Confirmando reserva..."
FULFILL=$(curl -s -X PUT "$BASE_URL/inventory/fulfill-reservation" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"reservationId\": \"$RESERVATION_ID\"
  }")

FULFILL_STATUS=$(echo $FULFILL | jq -r '.status')
echo "✅ Reserva confirmada: $FULFILL_STATUS"

# 6. Verificar stock después de fulfill
echo "6️⃣ Verificando stock después de fulfill..."
INVENTORY_AFTER=$(curl -s -X GET "$BASE_URL/inventory/product/$PRODUCT_ID")

TOTAL_AFTER=$(echo $INVENTORY_AFTER | jq -r '.totalQuantity')
AVAILABLE_AFTER=$(echo $INVENTORY_AFTER | jq -r '.availableQuantity')

echo "✅ Stock después: Total=$TOTAL_AFTER, Disponible=$AVAILABLE_AFTER"

# 7. Listar productos con stock bajo
echo "7️⃣ Listando productos con stock bajo..."
LOW_STOCK=$(curl -s -X GET "$BASE_URL/inventory/low-stock?threshold=50")

LOW_STOCK_COUNT=$(echo $LOW_STOCK | jq '.data | length')
echo "✅ Productos con stock bajo: $LOW_STOCK_COUNT"

# 8. Obtener estadísticas
echo "8️⃣ Obteniendo estadísticas..."
STATS=$(curl -s -X GET "$BASE_URL/inventory/stats" \
  -H "Authorization: Bearer $TOKEN")

TOTAL_PRODUCTS=$(echo $STATS | jq -r '.totalProducts')
OUT_OF_STOCK=$(echo $STATS | jq -r '.outOfStockProducts')

echo "✅ Estadísticas: Total productos=$TOTAL_PRODUCTS, Sin stock=$OUT_OF_STOCK"

echo ""
echo "=== ✅ Testing completado ==="
```

---

## 📝 Notas Importantes

### Sistema de Reservas con TTL

**Estados de reserva:**

- `ACTIVE` - Reserva activa, esperando confirmación
- `FULFILLED` - Reserva confirmada, stock decrementado
- `RELEASED` - Reserva cancelada, stock liberado
- `EXPIRED` - Reserva expirada automáticamente (por TTL)

**TTL (Time To Live):**

- Default: 30 minutos
- Configurable por reserva
- Auto-liberación cuando expira
- Background job limpia reservas expiradas

### Tipos de Movimientos

**INBOUND (Entrada):**

- Compras a proveedores
- Devoluciones de clientes
- Ajustes positivos
- Transfers entre warehouses

**OUTBOUND (Salida):**

- Ventas a clientes
- Devoluciones a proveedores
- Productos dañados
- Ajustes negativos

### Locations/Warehouses

El sistema soporta múltiples ubicaciones:

- `MAIN_WAREHOUSE` - Almacén principal
- `BACKUP_WAREHOUSE` - Almacén secundario
- `STORE_01`, `STORE_02`, etc. - Tiendas físicas
- Configurable según necesidades

### Stock Calculation

```
Total Quantity = Physical stock in all locations
Available Quantity = Total - Reserved
Reserved Quantity = Sum of active reservations
```

### Low Stock Threshold

- Configurable por producto
- Default: 20 unidades
- Alertas automáticas cuando `quantity <= threshold`
- Útil para reorden automático

### Control de Acceso (RBAC)

**Operaciones ADMIN Only:**

- Crear inventario inicial (`POST /inventory`)
- Agregar stock (`POST /inventory/add-stock`)
- Remover stock (`POST /inventory/remove-stock`)

**Operaciones Auth Required (USER/ADMIN):**

- Reservar stock (`POST /inventory/reserve`)
- Liberar reserva (`PUT /inventory/release-reservation`)
- Confirmar reserva (`PUT /inventory/fulfill-reservation`)
- Ver estadísticas (`GET /inventory/stats`)

**Operaciones Públicas:**

- Ver inventario
- Verificar disponibilidad
- Ver stock bajo/sin stock

**Respuestas de Autorización:**

- **403 Forbidden**: Usuario autenticado sin rol ADMIN
- **401 Unauthorized**: Sin autenticación

---

**Estado del Módulo:** ✅ Completado  
**Tests Totales:** 45+  
**Tests Críticos:** 15  
**RBAC:** ✅ Sistema de roles implementado  
**Seguridad:** ✅ Operaciones de stock protegidas (ADMIN only)  
**Reservas:** Con TTL automático  
**Audit Trail:** Completo  
**Última Actualización:** 2025-10-14
