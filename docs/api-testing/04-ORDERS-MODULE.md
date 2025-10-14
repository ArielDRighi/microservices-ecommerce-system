# 🛒 API Testing - Módulo de Órdenes (Orders)

**Módulo:** Orders  
**Base URL:** `http://localhost:3002/api/v1/orders`  
**Descripción:** Gestión de órdenes de compra con procesamiento asíncrono y saga pattern

---

## 📋 Índice de Tests

- [ ] 1️⃣ **Crear Orden** (POST /orders) **[🟡 Auth Required]** - **EMPEZAR AQUÍ**
- [ ] 2️⃣ Idempotencia - Mismo request retorna orden existente
- [ ] 3️⃣ Crear orden sin autenticación (401 Unauthorized)
- [ ] 4️⃣ Crear orden con items vacíos (400 Bad Request)
- [ ] 5️⃣ Listar Órdenes del Usuario (GET /orders) **[🟡 Auth Required]**
- [ ] 6️⃣ Obtener Orden por ID (GET /orders/:id) **[🟡 Auth Required]**
- [ ] 7️⃣ Obtener Estado de Orden (GET /orders/:id/status) **[🟡 Auth Required]**

**NOTA:** Marca cada checkbox `[x]` conforme completes cada test exitosamente.

---

## 🚀 Pre-requisitos y Estado Inicial

### Antes de empezar, asegúrate de tener:

1. **✅ Servidor corriendo:** `npm run start:dev` en puerto 3002
2. **✅ Base de datos iniciada:** PostgreSQL con migraciones aplicadas
3. **✅ Productos creados:** Al menos 2 productos activos en DB
4. **✅ Inventario creado:** Los productos deben tener inventario (usar `03-INVENTORY-MODULE.md`)
5. **✅ Usuarios seed:** Usuarios de prueba deben existir:
   - `admin@test.com` / `Admin123!` (rol: ADMIN)
   - `user@test.com` / `Admin123!` (rol: USER)

### Estado esperado de la DB:

- **Productos:** Al menos 2 productos activos
- **Inventario:** Productos con stock disponible (> 0)
- **Órdenes:** Pueden existir órdenes previas (no afecta los tests)

### ⚠️ Importante:

Este documento usa **placeholders genéricos** (`<ORDER_UUID>`, `<PRODUCT_UUID>`, `<timestamp>`, etc.) en las respuestas de ejemplo. Los valores reales en tu sistema serán diferentes pero deben seguir la misma estructura.

---

## Variables de Entorno

```bash
export BASE_URL="http://localhost:3002/api/v1"
export USER_TOKEN=""      # Se obtendrá en la sección de autenticación
export ADMIN_TOKEN=""     # Se obtendrá en la sección de autenticación
export ORDER_ID=""        # Se guardará después de crear orden (Test 1)
export IDEMPOTENCY_KEY="" # Se generará al crear orden (Test 1)
export PRODUCT_ID_1=""    # Se obtendrá dinámicamente en Test 1
export PRODUCT_ID_2=""    # Se obtendrá dinámicamente en Test 1
```

**NOTA:** Estas variables se llenarán automáticamente conforme ejecutes los tests en orden.

---

## 🔑 Obtener Tokens de Autenticación

```bash
# Token de USUARIO (crear órdenes)
export USER_TOKEN=$(curl -s -X POST "http://localhost:3002/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com",
    "password": "Admin123!"
  }' | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

# Token de ADMINISTRADOR (opcional, para operaciones admin)
export ADMIN_TOKEN=$(curl -s -X POST "http://localhost:3002/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Admin123!"
  }' | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

echo "USER_TOKEN: $USER_TOKEN"
echo "ADMIN_TOKEN: $ADMIN_TOKEN"
```

---

## ⚠️ Importante: Procesamiento Asíncrono

Las órdenes se procesan **asíncronamente** mediante:

- 🔄 **Bull Queue** (Redis)
- 🎭 **Saga Pattern** para transacciones distribuidas
- ⏱️ **202 Accepted** - La orden se crea inmediatamente en estado `PENDING`
- 📊 **Estados progresivos**: PENDING → CONFIRMED → PAID → SHIPPED → DELIVERED
- ❌ **Estados de fallo**: CANCELLED (si falla reserva de stock o pago)

**NOTA:** El estado cambia automáticamente en background. Usa polling del endpoint `/orders/:id/status` para monitorear progreso.

---

## 1️⃣ Crear Orden **[🟡 Auth Required]** - **EMPEZAR AQUÍ**

### ✅ Test 1.1: Crear orden exitosamente

**Endpoint:** `POST /orders`  
**Autenticación:** Bearer Token (JWT) - Required  
**Status Code:** `202 Accepted` (procesamiento asíncrono)

**Request Body:**

```json
{
  "items": [
    {
      "productId": "<PRODUCT_UUID_1>",
      "quantity": 2
    },
    {
      "productId": "<PRODUCT_UUID_2>",
      "quantity": 1
    }
  ],
  "idempotencyKey": "order_<timestamp>_<random>"
}
```

**Campos requeridos:**
- `items` (array): Array de items con `productId` (UUID) y `quantity` (integer >= 1)

**Campos opcionales:**
- `idempotencyKey` (string): Clave para prevenir órdenes duplicadas. **Si no se provee, se genera automáticamente**

**⚠️ PRE-REQUISITO:** Necesitas al menos 2 productos con inventario disponible.

**Paso 1: Obtener productos existentes dinámicamente**

```bash
# Obtener los primeros 2 productos disponibles
export PRODUCT_ID_1=$(curl -s "http://localhost:3002/api/v1/products?page=1&limit=2" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
export PRODUCT_ID_2=$(curl -s "http://localhost:3002/api/v1/products?page=1&limit=2" | grep -o '"id":"[^"]*"' | head -2 | tail -1 | cut -d'"' -f4)

echo "PRODUCT_ID_1: $PRODUCT_ID_1"
echo "PRODUCT_ID_2: $PRODUCT_ID_2"
```

**Paso 2: Generar idempotency key único**

```bash
export IDEMPOTENCY_KEY="order_$(date +%s)_$RANDOM"
echo "IDEMPOTENCY_KEY: $IDEMPOTENCY_KEY"
```

**Paso 3: Crear orden**

```bash
curl -s -X POST "http://localhost:3002/api/v1/orders" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "'$PRODUCT_ID_1'",
        "quantity": 2
      },
      {
        "productId": "'$PRODUCT_ID_2'",
        "quantity": 1
      }
    ],
    "idempotencyKey": "'$IDEMPOTENCY_KEY'"
  }'
```

**Respuesta Esperada (202 Accepted):**

```json
{
  "statusCode": 202,
  "message": "Order created successfully",
  "data": {
    "id": "<ORDER_UUID>",
    "userId": "<USER_UUID>",
    "status": "PENDING",
    "totalAmount": "509.97",
    "currency": "USD",
    "idempotencyKey": "order_<timestamp>_<random>",
    "items": [
      {
        "id": "<ITEM_UUID_1>",
        "productId": "<PRODUCT_UUID_1>",
        "productName": "<Product_Name_1>",
        "quantity": 2,
        "unitPrice": "179.99",
        "totalPrice": "359.98"
      },
      {
        "id": "<ITEM_UUID_2>",
        "productId": "<PRODUCT_UUID_2>",
        "productName": "<Product_Name_2>",
        "quantity": 1,
        "unitPrice": "149.99",
        "totalPrice": "149.99"
      }
    ],
    "createdAt": "<timestamp>",
    "updatedAt": "<timestamp>"
  },
  "timestamp": "<timestamp>",
  "path": "/api/v1/orders"
}
```

**Campos en la respuesta:**

- `id`: UUID de la orden creada (**Guardar como ORDER_ID**)
- `status`: Estado inicial `PENDING` (cambiará asíncronamente)
- `totalAmount`: Total de la orden en string decimal
- `currency`: Moneda (USD)
- `items`: Array con detalles de cada producto
  - `totalPrice`: quantity × unitPrice por item
- `idempotencyKey`: Clave de idempotencia enviada

**Paso 4: Guardar ORDER_ID para tests siguientes**

```bash
# Extraer el ID de la orden de la respuesta anterior
export ORDER_ID=$(curl -s -X GET "http://localhost:3002/api/v1/orders" -H "Authorization: Bearer $USER_TOKEN" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "ORDER_ID guardado: $ORDER_ID"
```

**Checklist:**

- [ ] Status code es **202 Accepted** (no 201 Created)
- [ ] Respuesta contiene `id` de la orden
- [ ] `status` es `PENDING`
- [ ] `totalAmount` está calculado correctamente
- [ ] `items` array contiene todos los productos solicitados
- [ ] Cada item tiene `totalPrice` = quantity × unitPrice
- [ ] `idempotencyKey` coincide con el enviado
- [ ] Variable `ORDER_ID` guardada correctamente

---

## 2️⃣ Idempotencia - Mismo Request Retorna Orden Existente **[🟡 Auth Required]**

### ✅ Test 2.1: Idempotencia - Mismo idempotencyKey retorna orden existente

**Concepto:** Enviar el mismo `idempotencyKey` dos veces debe retornar la **misma orden** sin crear una nueva.

**Endpoint:** `POST /orders`  
**Autenticación:** Bearer Token (JWT) - Required  
**Status Code:** `202 Accepted` (ambas llamadas)

**Comando curl:**

```bash
# Segunda llamada con el MISMO idempotencyKey (reusar el del Test 1.1)
curl -s -X POST "http://localhost:3002/api/v1/orders" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "'$PRODUCT_ID_1'",
        "quantity": 2
      },
      {
        "productId": "'$PRODUCT_ID_2'",
        "quantity": 1
      }
    ],
    "idempotencyKey": "'$IDEMPOTENCY_KEY'"
  }'
```

**Respuesta Esperada (202 Accepted):**

```json
{
  "statusCode": 202,
  "message": "Order created successfully",
  "data": {
    "id": "<SAME_ORDER_UUID>",
    "userId": "<USER_UUID>",
    "status": "PENDING",
    "totalAmount": "509.97",
    "currency": "USD",
    "idempotencyKey": "order_<timestamp>_<random>",
    "items": [
      {
        "id": "<SAME_ITEM_UUID_1>",
        "productId": "<PRODUCT_UUID_1>",
        "productName": "<Product_Name_1>",
        "quantity": 2,
        "unitPrice": "179.99",
        "totalPrice": "359.98"
      },
      {
        "id": "<SAME_ITEM_UUID_2>",
        "productId": "<PRODUCT_UUID_2>",
        "productName": "<Product_Name_2>",
        "quantity": 1,
        "unitPrice": "149.99",
        "totalPrice": "149.99"
      }
    ],
    "createdAt": "<same_timestamp>",
    "updatedAt": "<same_timestamp>"
  },
  "timestamp": "<timestamp>",
  "path": "/api/v1/orders"
}
```

**Validación de idempotencia:**

```bash
# Comparar IDs manualmente o con script
echo "Primer ORDER_ID del Test 1.1: $ORDER_ID"

# Extraer ID de la segunda llamada
SECOND_ORDER_ID=$(curl -s -X POST "http://localhost:3002/api/v1/orders" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"productId": "'$PRODUCT_ID_1'", "quantity": 2}],
    "idempotencyKey": "'$IDEMPOTENCY_KEY'"
  }' | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "Segundo ORDER_ID (debe ser igual): $SECOND_ORDER_ID"

if [ "$ORDER_ID" == "$SECOND_ORDER_ID" ]; then
  echo "✅ Idempotencia funciona correctamente"
else
  echo "❌ Idempotencia falló - IDs diferentes"
fi
```

**Checklist:**

- [ ] Status code es 202 Accepted en ambas llamadas
- [ ] El `id` de la orden es **idéntico** en ambas respuestas
- [ ] No se creó una segunda orden en la base de datos
- [ ] `createdAt` y `updatedAt` son iguales en ambas respuestas
- [ ] `idempotencyKey` es el mismo en ambas respuestas

---

## 3️⃣ Crear Orden Sin Autenticación (401 Unauthorized)

### ❌ Test 3.1: Crear orden sin token Bearer

**Endpoint:** `POST /orders`  
**Autenticación:** None (sin Authorization header)  
**Status Code esperado:** `401 Unauthorized`

**Comando curl:**

```bash
curl -s -X POST "http://localhost:3002/api/v1/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{
      "productId": "'$PRODUCT_ID_1'",
      "quantity": 1
    }],
    "idempotencyKey": "test_no_auth"
  }'
```

**Respuesta Esperada (401 Unauthorized):**

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "UNAUTHORIZED",
  "success": false,
  "timestamp": "<timestamp>",
  "path": "/api/v1/orders",
  "method": "POST"
}
```

**Checklist:**

- [ ] Status code es 401 Unauthorized
- [ ] Mensaje indica falta de autenticación
- [ ] No se crea ninguna orden

---

## 4️⃣ Crear Orden con Items Vacíos (400 Bad Request)

### ❌ Test 4.1: Crear orden sin productos en items

**Endpoint:** `POST /orders`  
**Autenticación:** Bearer Token (JWT) - Required  
**Status Code esperado:** `400 Bad Request`

**Comando curl:**

```bash
curl -s -X POST "http://localhost:3002/api/v1/orders" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [],
    "idempotencyKey": "test_empty"
  }'
```

**Respuesta Esperada (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": "At least one item is required",
  "error": "BAD_REQUEST",
  "success": false,
  "timestamp": "<timestamp>",
  "path": "/api/v1/orders",
  "method": "POST"
}
```

**Checklist:**

- [ ] Status code es 400 Bad Request
- [ ] Mensaje indica que se requiere al menos un item
- [ ] Validación ocurre antes de procesar la orden

---

## 5️⃣ Listar Órdenes del Usuario Autenticado **[🟡 Auth Required]**

### ✅ Test 5.1: Listar todas las órdenes del usuario

**Endpoint:** `GET /orders`  
**Autenticación:** Bearer Token (JWT) - Required  
**Status Code:** `200 OK`

**Comando curl:**

```bash
curl -s -X GET "http://localhost:3002/api/v1/orders" \
  -H "Authorization: Bearer $USER_TOKEN"
```

**Respuesta Esperada (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": [
    {
      "id": "<ORDER_UUID_1>",
      "userId": "<USER_UUID>",
      "status": "CANCELLED",
      "totalAmount": "509.97",
      "currency": "USD",
      "idempotencyKey": "order_<timestamp>_<random>",
      "items": [
        {
          "id": "<ITEM_UUID_1>",
          "productId": "<PRODUCT_UUID_1>",
          "productName": "<Product_Name_1>",
          "quantity": 2,
          "unitPrice": "179.99",
          "totalPrice": "359.98"
        },
        {
          "id": "<ITEM_UUID_2>",
          "productId": "<PRODUCT_UUID_2>",
          "productName": "<Product_Name_2>",
          "quantity": 1,
          "unitPrice": "149.99",
          "totalPrice": "149.99"
        }
      ],
      "createdAt": "<timestamp>",
      "updatedAt": "<timestamp>"
    },
    {
      "id": "<ORDER_UUID_2>",
      "userId": "<USER_UUID>",
      "status": "PENDING",
      "totalAmount": "329.98",
      "currency": "USD",
      "idempotencyKey": "order_<timestamp>_<random>",
      "items": [...],
      "createdAt": "<timestamp>",
      "updatedAt": "<timestamp>"
    }
  ],
  "timestamp": "<timestamp>",
  "path": "/api/v1/orders"
}
```

**Estructura de respuesta:**

- `data`: Array de órdenes del usuario autenticado
- Cada orden incluye:
  - `id`, `userId`, `status`, `totalAmount`, `currency`
  - `items`: Array con detalles completos de productos
  - `idempotencyKey`: Clave de idempotencia usada
  - `createdAt`, `updatedAt`: Timestamps

**Estados posibles:**

- `PENDING`: Orden creada, en procesamiento
- `CONFIRMED`: Orden confirmada, stock reservado
- `PAID`: Pago procesado exitosamente
- `CANCELLED`: Orden cancelada (fallo en stock o pago)
- `SHIPPED`: Orden enviada
- `DELIVERED`: Orden entregada

**Checklist:**

- [ ] Status code es 200 OK
- [ ] Respuesta es un array de órdenes en `data`
- [ ] Todas las órdenes pertenecen al usuario autenticado (mismo `userId`)
- [ ] Cada orden incluye `items` completos con detalles de productos
- [ ] No incluye órdenes de otros usuarios



---

## 6️⃣ Obtener Orden por ID **[🟡 Auth Required]**

### ✅ Test 6.1: Obtener orden propia exitosamente

**Endpoint:** `GET /orders/:id`  
**Autenticación:** Bearer Token (JWT) - Required  
**Status Code:** `200 OK`

**Comando curl:**

```bash
# Usar el ORDER_ID guardado del Test 1.1
curl -s -X GET "http://localhost:3002/api/v1/orders/$ORDER_ID" \
  -H "Authorization: Bearer $USER_TOKEN"
```

**Respuesta Esperada (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "id": "<ORDER_UUID>",
    "userId": "<USER_UUID>",
    "status": "CANCELLED",
    "totalAmount": "509.97",
    "currency": "USD",
    "idempotencyKey": "order_<timestamp>_<random>",
    "items": [
      {
        "id": "<ITEM_UUID_1>",
        "productId": "<PRODUCT_UUID_1>",
        "productName": "<Product_Name_1>",
        "quantity": 2,
        "unitPrice": "179.99",
        "totalPrice": "359.98"
      },
      {
        "id": "<ITEM_UUID_2>",
        "productId": "<PRODUCT_UUID_2>",
        "productName": "<Product_Name_2>",
        "quantity": 1,
        "unitPrice": "149.99",
        "totalPrice": "149.99"
      }
    ],
    "createdAt": "<timestamp>",
    "updatedAt": "<timestamp>"
  },
  "timestamp": "<timestamp>",
  "path": "/api/v1/orders/<ORDER_UUID>"
}
```

**Estructura de respuesta:**

- `data`: Objeto con detalles completos de la orden
  - `id`: UUID de la orden
  - `userId`: UUID del usuario propietario
  - `status`: Estado actual de la orden
  - `totalAmount`: Total en string decimal
  - `currency`: Moneda (USD)
  - `idempotencyKey`: Clave de idempotencia usada
  - `items`: Array completo con todos los productos
  - `createdAt`, `updatedAt`: Timestamps

**Checklist:**

- [ ] Status code es 200 OK
- [ ] Orden contiene todos los detalles completos
- [ ] `items` incluye información completa de productos
- [ ] `userId` coincide con el usuario autenticado
- [ ] Solo puede ver sus propias órdenes

---

## 7️⃣ Obtener Estado de Orden (Endpoint Ligero) **[🟡 Auth Required]**

### ✅ Test 7.1: Obtener solo el estado de la orden

**Endpoint:** `GET /orders/:id/status`  
**Autenticación:** Bearer Token (JWT) - Required  
**Status Code:** `200 OK`  
**Propósito:** Polling ligero para verificar progreso sin transferir toda la orden

**Comando curl:**

```bash
# Usar el ORDER_ID guardado del Test 1.1
curl -s -X GET "http://localhost:3002/api/v1/orders/$ORDER_ID/status" \
  -H "Authorization: Bearer $USER_TOKEN"
```

**Respuesta Esperada (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "orderId": "<ORDER_UUID>",
    "status": "CANCELLED"
  },
  "timestamp": "<timestamp>",
  "path": "/api/v1/orders/<ORDER_UUID>/status"
}
```

**Estructura de respuesta:**

- `data.orderId`: UUID de la orden
- `data.status`: Estado actual (solo el campo necesario)

**📝 Notas:**

- ⚠️ **El endpoint NO retorna `paymentStatus` ni `updatedAt`** (solo `orderId` y `status`)
- ✅ Respuesta mucho más ligera que GET /orders/:id
- ✅ Ideal para polling en loops sin consumir ancho de banda innecesario
- ✅ Útil para monitorear progreso de órdenes en procesamiento asíncrono

**Estados posibles:**

- `PENDING`: Orden creada, esperando procesamiento
- `CONFIRMED`: Stock reservado exitosamente
- `PAID`: Pago procesado
- `CANCELLED`: Orden cancelada (falta stock, pago rechazado, etc.)
- `SHIPPED`: Orden enviada
- `DELIVERED`: Orden entregada

**Checklist:**

- [ ] Status code es 200 OK
- [ ] Respuesta contiene solo `orderId` y `status`
- [ ] Más ligera que GET /orders/:id completo
- [ ] Útil para polling frecuente



---

## 📝 Notas Importantes

### Estados de Orden

El sistema implementa **procesamiento asíncrono** con los siguientes estados:

1. **PENDING** - Orden creada, esperando procesamiento en cola
2. **CONFIRMED** - Stock verificado y reservado exitosamente
3. **PAID** - Pago procesado exitosamente
4. **CANCELLED** - Orden cancelada (stock insuficiente, pago rechazado, timeout, etc.)
5. **SHIPPED** - Orden enviada al cliente
6. **DELIVERED** - Orden entregada al cliente

**⚠️ IMPORTANTE:** El estado cambia automáticamente en background mediante **Bull Queue** y **Saga Pattern**. Usa el endpoint `/orders/:id/status` para hacer polling ligero.

### Idempotencia

- **Clave:** `idempotencyKey` (opcional)
- **Generación:** Si no se provee, el backend genera uno automáticamente
- **Uso:** Previene creación de órdenes duplicadas en caso de retry/timeout
- **Comportamiento:** Mismo key retorna la orden existente (202) sin crear nueva
- **Recomendación:** Usa formato `order_<timestamp>_<random>` para garantizar unicidad

### Estructura de Precios

```
totalPrice (por item) = quantity × unitPrice
totalAmount (orden) = Σ(item.totalPrice)
currency = "USD" (fijo)
```

**📝 Nota:** En la implementación actual:
- No hay campos separados para `tax` o `shippingCost`
- El `totalAmount` es la suma directa de todos los `item.totalPrice`
- La moneda es siempre `USD`

### Flujo Asíncrono (Saga Pattern)

```
1. POST /orders → 202 Accepted (status: PENDING)
2. Background: Reservar stock en Inventory
3. Background: Procesar pago
4. Status cambia: PENDING → CONFIRMED → PAID
5. Si falla: PENDING → CANCELLED
```

**Polling recomendado:**
- Usa `GET /orders/:id/status` cada 3-5 segundos
- Timeout después de 60 segundos si sigue en PENDING
- Máximo 20 intentos de polling

---

**Estado del Módulo:** ✅ Completado  
**Tests Ejecutados:** 7  
**Tests Críticos:** 7  
**Procesamiento:** Asíncrono (Bull Queue + Saga Pattern)  
**Última Actualización:** 2025-10-14
