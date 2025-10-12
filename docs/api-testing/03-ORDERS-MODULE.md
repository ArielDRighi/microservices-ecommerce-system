# 🛒 API Testing - Módulo de Órdenes (Orders)

**Módulo:** Orders  
**Base URL:** `http://localhost:3000/orders`  
**Descripción:** Gestión de órdenes de compra con procesamiento asíncrono y saga pattern

---

## 📋 Índice de Tests

- [ ] ✅ 1. Crear Orden (POST /orders) [Auth Required]
- [ ] ✅ 2. Listar Órdenes del Usuario (GET /orders) [Auth Required]
- [ ] ✅ 3. Obtener Orden por ID (GET /orders/:id) [Auth Required]
- [ ] ✅ 4. Obtener Estado de Orden (GET /orders/:id/status) [Auth Required]
- [ ] ✅ 5. Idempotencia - Mismo request retorna orden existente

---

## Variables de Entorno

```bash
export BASE_URL="http://localhost:3000"
export TOKEN="your-jwt-token-here"
export ORDER_ID=""
export IDEMPOTENCY_KEY=""
export PRODUCT_ID_1=""
export PRODUCT_ID_2=""
```

---

## ⚠️ Importante: Procesamiento Asíncrono

Las órdenes se procesan **asíncronamente** mediante:

- 🔄 **Bull Queue** (Redis)
- 🎭 **Saga Pattern** para transacciones distribuidas
- ⏱️ **202 Accepted** - La orden se crea inmediatamente en estado `PENDING`
- 📊 **Estados progresivos**: PENDING → CONFIRMED → PAID → SHIPPED → DELIVERED

---

## 1️⃣ Crear Orden

### ✅ Test 1.1: Crear orden exitosamente

**Endpoint:** `POST /orders`  
**Autenticación:** Bearer Token (JWT) - Required  
**Status Code:** `202 Accepted` (procesamiento asíncrono)

**Request Body:**

```json
{
  "items": [
    {
      "productId": "uuid-product-1",
      "quantity": 2,
      "price": 99.99
    },
    {
      "productId": "uuid-product-2",
      "quantity": 1,
      "price": 149.99
    }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Buenos Aires",
    "state": "CABA",
    "postalCode": "1000",
    "country": "Argentina"
  },
  "paymentMethod": "CREDIT_CARD",
  "idempotencyKey": "order-2025-10-11-001"
}
```

**Preparar productos para la orden:**

```bash
# Obtener IDs de productos existentes
export PRODUCT_ID_1=$(curl -s -X GET "$BASE_URL/products?limit=1" | jq -r '.data[0].id')
export PRODUCT_ID_2=$(curl -s -X GET "$BASE_URL/products?limit=2" | jq -r '.data[1].id')

echo "Product 1: $PRODUCT_ID_1"
echo "Product 2: $PRODUCT_ID_2"
```

**Comando curl:**

```bash
# Generar idempotency key único
export IDEMPOTENCY_KEY="order-$(date +%s)"

curl -X POST "$BASE_URL/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"items\": [
      {
        \"productId\": \"$PRODUCT_ID_1\",
        \"quantity\": 2,
        \"price\": 99.99
      },
      {
        \"productId\": \"$PRODUCT_ID_2\",
        \"quantity\": 1,
        \"price\": 149.99
      }
    ],
    \"shippingAddress\": {
      \"street\": \"123 Main St\",
      \"city\": \"Buenos Aires\",
      \"state\": \"CABA\",
      \"postalCode\": \"1000\",
      \"country\": \"Argentina\"
    },
    \"paymentMethod\": \"CREDIT_CARD\",
    \"idempotencyKey\": \"$IDEMPOTENCY_KEY\"
  }" | jq '.'
```

**Respuesta Esperada (202 Accepted):**

```json
{
  "id": "order-uuid-here",
  "userId": "user-uuid-here",
  "status": "PENDING",
  "items": [
    {
      "id": "item-uuid-1",
      "productId": "product-uuid-1",
      "productName": "Product Name 1",
      "quantity": 2,
      "unitPrice": 99.99,
      "subtotal": 199.98
    },
    {
      "id": "item-uuid-2",
      "productId": "product-uuid-2",
      "productName": "Product Name 2",
      "quantity": 1,
      "unitPrice": 149.99,
      "subtotal": 149.99
    }
  ],
  "subtotal": 349.97,
  "tax": 73.49,
  "shippingCost": 15.0,
  "total": 438.46,
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Buenos Aires",
    "state": "CABA",
    "postalCode": "1000",
    "country": "Argentina"
  },
  "paymentMethod": "CREDIT_CARD",
  "idempotencyKey": "order-2025-10-11-001",
  "createdAt": "2025-10-11T10:30:00.000Z",
  "updatedAt": "2025-10-11T10:30:00.000Z"
}
```

**Guardar Order ID:**

```bash
export ORDER_ID=$(curl -s -X POST "$BASE_URL/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"items\": [
      {
        \"productId\": \"$PRODUCT_ID_1\",
        \"quantity\": 1,
        \"price\": 99.99
      }
    ],
    \"shippingAddress\": {
      \"street\": \"Test St\",
      \"city\": \"Test City\",
      \"state\": \"TC\",
      \"postalCode\": \"12345\",
      \"country\": \"Argentina\"
    },
    \"paymentMethod\": \"CREDIT_CARD\",
    \"idempotencyKey\": \"test-$(date +%s)\"
  }" | jq -r '.id')

echo "Order ID: $ORDER_ID"
```

**Checklist:**

- [ ] Status code es **202 Accepted** (no 201)
- [ ] Respuesta contiene `id` de la orden
- [ ] `status` es `PENDING`
- [ ] `total` está calculado correctamente (subtotal + tax + shipping)
- [ ] `items` array contiene todos los productos
- [ ] Cada item tiene `subtotal` calculado (quantity \* unitPrice)
- [ ] `idempotencyKey` coincide con el enviado

---

### ✅ Test 1.2: Idempotencia - Mismo request retorna orden existente

**Concepto:** Enviar el mismo `idempotencyKey` dos veces debe retornar la **misma orden** sin crear una nueva.

**Comando curl:**

```bash
# Primera llamada - crea la orden
FIRST_CALL=$(curl -s -X POST "$BASE_URL/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"items\": [{
      \"productId\": \"$PRODUCT_ID_1\",
      \"quantity\": 1,
      \"price\": 99.99
    }],
    \"shippingAddress\": {
      \"street\": \"Test St\",
      \"city\": \"Test City\",
      \"state\": \"TC\",
      \"postalCode\": \"12345\",
      \"country\": \"Argentina\"
    },
    \"paymentMethod\": \"CREDIT_CARD\",
    \"idempotencyKey\": \"idempotency-test-001\"
  }")

FIRST_ORDER_ID=$(echo $FIRST_CALL | jq -r '.id')

# Segunda llamada - mismo idempotencyKey
SECOND_CALL=$(curl -s -X POST "$BASE_URL/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"items\": [{
      \"productId\": \"$PRODUCT_ID_1\",
      \"quantity\": 1,
      \"price\": 99.99
    }],
    \"shippingAddress\": {
      \"street\": \"Test St\",
      \"city\": \"Test City\",
      \"state\": \"TC\",
      \"postalCode\": \"12345\",
      \"country\": \"Argentina\"
    },
    \"paymentMethod\": \"CREDIT_CARD\",
    \"idempotencyKey\": \"idempotency-test-001\"
  }")

SECOND_ORDER_ID=$(echo $SECOND_CALL | jq -r '.id')

echo "First Order ID: $FIRST_ORDER_ID"
echo "Second Order ID: $SECOND_ORDER_ID"

if [ "$FIRST_ORDER_ID" == "$SECOND_ORDER_ID" ]; then
  echo "✅ Idempotencia funciona correctamente"
else
  echo "❌ Idempotencia falló - IDs diferentes"
fi
```

**Checklist:**

- [ ] Status code es 202 en ambas llamadas
- [ ] El `id` de la orden es **idéntico** en ambas respuestas
- [ ] No se creó una segunda orden
- [ ] `createdAt` es igual en ambas respuestas

---

### ❌ Test 1.3: Crear orden sin autenticación (401 Unauthorized)

**Comando curl:**

```bash
curl -X POST "$BASE_URL/orders" \
  -H "Content-Type: application/json" \
  -d "{
    \"items\": [{
      \"productId\": \"$PRODUCT_ID_1\",
      \"quantity\": 1,
      \"price\": 99.99
    }],
    \"shippingAddress\": {
      \"street\": \"Test St\",
      \"city\": \"Test City\",
      \"state\": \"TC\",
      \"postalCode\": \"12345\",
      \"country\": \"Argentina\"
    },
    \"paymentMethod\": \"CREDIT_CARD\"
  }" | jq '.'
```

**Respuesta Esperada (401 Unauthorized):**

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

**Checklist:**

- [ ] Status code es 401
- [ ] Requiere autenticación

---

### ❌ Test 1.4: Crear orden con items vacíos (400 Bad Request)

**Comando curl:**

```bash
curl -X POST "$BASE_URL/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [],
    "shippingAddress": {
      "street": "Test St",
      "city": "Test City",
      "state": "TC",
      "postalCode": "12345",
      "country": "Argentina"
    },
    "paymentMethod": "CREDIT_CARD"
  }' | jq '.'
```

**Respuesta Esperada (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": ["items must contain at least 1 element"],
  "error": "Bad Request"
}
```

**Checklist:**

- [ ] Status code es 400
- [ ] Mensaje indica que items no puede estar vacío

---

### ❌ Test 1.5: Crear orden con productos inexistentes (400 Bad Request)

**Comando curl:**

```bash
curl -X POST "$BASE_URL/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{
      "productId": "00000000-0000-0000-0000-000000000000",
      "quantity": 1,
      "price": 99.99
    }],
    "shippingAddress": {
      "street": "Test St",
      "city": "Test City",
      "state": "TC",
      "postalCode": "12345",
      "country": "Argentina"
    },
    "paymentMethod": "CREDIT_CARD"
  }' | jq '.'
```

**Respuesta Esperada (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": "One or more products not found",
  "error": "Bad Request"
}
```

**Checklist:**

- [ ] Status code es 400
- [ ] Valida existencia de productos

---

### ❌ Test 1.6: Crear orden con dirección de envío inválida (400 Bad Request)

**Comando curl:**

```bash
curl -X POST "$BASE_URL/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"items\": [{
      \"productId\": \"$PRODUCT_ID_1\",
      \"quantity\": 1,
      \"price\": 99.99
    }],
    \"shippingAddress\": {
      \"street\": \"\",
      \"city\": \"\",
      \"state\": \"\",
      \"postalCode\": \"\",
      \"country\": \"\"
    },
    \"paymentMethod\": \"CREDIT_CARD\"
  }" | jq '.'
```

**Respuesta Esperada (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": [
    "street should not be empty",
    "city should not be empty",
    "state should not be empty",
    "postalCode should not be empty",
    "country should not be empty"
  ],
  "error": "Bad Request"
}
```

**Checklist:**

- [ ] Status code es 400
- [ ] Valida campos requeridos de dirección

---

## 2️⃣ Listar Órdenes del Usuario Autenticado

### ✅ Test 2.1: Listar todas las órdenes del usuario

**Endpoint:** `GET /orders`  
**Autenticación:** Bearer Token (JWT) - Required

**Comando curl:**

```bash
curl -X GET "$BASE_URL/orders" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
[
  {
    "id": "order-uuid-1",
    "userId": "user-uuid-here",
    "status": "DELIVERED",
    "total": 438.46,
    "items": [
      {
        "id": "item-uuid-1",
        "productName": "Product 1",
        "quantity": 2,
        "unitPrice": 99.99,
        "subtotal": 199.98
      }
    ],
    "createdAt": "2025-10-10T10:00:00.000Z",
    "updatedAt": "2025-10-10T12:00:00.000Z"
  },
  {
    "id": "order-uuid-2",
    "userId": "user-uuid-here",
    "status": "PENDING",
    "total": 199.99,
    "items": [...],
    "createdAt": "2025-10-11T09:00:00.000Z",
    "updatedAt": "2025-10-11T09:00:00.000Z"
  }
]
```

**Checklist:**

- [ ] Status code es 200
- [ ] Respuesta es un array de órdenes
- [ ] Todas las órdenes pertenecen al usuario autenticado
- [ ] Órdenes ordenadas por fecha de creación (más recientes primero)
- [ ] No incluye órdenes de otros usuarios

---

### ❌ Test 2.2: Listar órdenes sin autenticación (401 Unauthorized)

**Comando curl:**

```bash
curl -X GET "$BASE_URL/orders" | jq '.'
```

**Respuesta Esperada (401 Unauthorized):**

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

**Checklist:**

- [ ] Status code es 401
- [ ] Requiere autenticación

---

## 3️⃣ Obtener Orden por ID

### ✅ Test 3.1: Obtener orden propia exitosamente

**Endpoint:** `GET /orders/:id`  
**Autenticación:** Bearer Token (JWT) - Required

**Comando curl:**

```bash
curl -X GET "$BASE_URL/orders/$ORDER_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
{
  "id": "order-uuid-here",
  "userId": "user-uuid-here",
  "status": "PENDING",
  "items": [
    {
      "id": "item-uuid-1",
      "productId": "product-uuid-1",
      "productName": "Product Name",
      "productSku": "PROD-001",
      "quantity": 2,
      "unitPrice": 99.99,
      "subtotal": 199.98
    }
  ],
  "subtotal": 199.98,
  "tax": 41.99,
  "shippingCost": 15.0,
  "total": 256.97,
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Buenos Aires",
    "state": "CABA",
    "postalCode": "1000",
    "country": "Argentina"
  },
  "paymentMethod": "CREDIT_CARD",
  "paymentStatus": "PENDING",
  "idempotencyKey": "order-key-here",
  "createdAt": "2025-10-11T10:30:00.000Z",
  "updatedAt": "2025-10-11T10:30:00.000Z"
}
```

**Checklist:**

- [ ] Status code es 200
- [ ] Orden contiene todos los detalles completos
- [ ] `items` incluye información de productos
- [ ] Cálculos de totales son correctos
- [ ] `userId` coincide con el usuario autenticado

---

### ❌ Test 3.2: Obtener orden inexistente (404 Not Found)

**Comando curl:**

```bash
curl -X GET "$BASE_URL/orders/00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

**Respuesta Esperada (404 Not Found):**

```json
{
  "statusCode": 404,
  "message": "Order 00000000-0000-0000-0000-000000000000 not found",
  "error": "Not Found"
}
```

**Checklist:**

- [ ] Status code es 404
- [ ] Mensaje indica orden no encontrada

---

### ❌ Test 3.3: Obtener orden de otro usuario (403 Forbidden / 404 Not Found)

**Nota:** Depende de la implementación - puede ser 403 o 404 por seguridad.

**Comando curl:**

```bash
# Asumiendo que otro usuario tiene una orden
curl -X GET "$BASE_URL/orders/other-user-order-uuid" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

**Respuesta Esperada (404 Not Found):**

```json
{
  "statusCode": 404,
  "message": "Order not found or does not belong to user",
  "error": "Not Found"
}
```

**Checklist:**

- [ ] Status code es 404 o 403
- [ ] Usuario solo puede ver sus propias órdenes

---

## 4️⃣ Obtener Estado de Orden (Endpoint Ligero)

### ✅ Test 4.1: Obtener solo el estado de la orden

**Endpoint:** `GET /orders/:id/status`  
**Autenticación:** Bearer Token (JWT) - Required  
**Propósito:** Polling ligero para verificar progreso

**Comando curl:**

```bash
curl -X GET "$BASE_URL/orders/$ORDER_ID/status" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
{
  "orderId": "order-uuid-here",
  "status": "PENDING",
  "paymentStatus": "PENDING",
  "updatedAt": "2025-10-11T10:30:00.000Z"
}
```

**Checklist:**

- [ ] Status code es 200
- [ ] Respuesta contiene solo `orderId`, `status`, `paymentStatus`, `updatedAt`
- [ ] Más ligera que GET /orders/:id (no incluye items ni detalles)

---

### ⏱️ Test 4.2: Polling para verificar progreso de orden

**Escenario:** Verificar el estado de la orden cada X segundos hasta que cambie de PENDING.

**Comando curl (con loop):**

```bash
#!/bin/bash
# Polling del estado de la orden

MAX_ATTEMPTS=20
SLEEP_SECONDS=3
ATTEMPT=1

echo "Polling estado de orden: $ORDER_ID"

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  echo "Intento $ATTEMPT/$MAX_ATTEMPTS..."

  STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/orders/$ORDER_ID/status" \
    -H "Authorization: Bearer $TOKEN")

  STATUS=$(echo $STATUS_RESPONSE | jq -r '.status')
  PAYMENT_STATUS=$(echo $STATUS_RESPONSE | jq -r '.paymentStatus')

  echo "  Status: $STATUS | Payment: $PAYMENT_STATUS"

  if [ "$STATUS" != "PENDING" ]; then
    echo "✅ Orden procesada con estado: $STATUS"
    break
  fi

  sleep $SLEEP_SECONDS
  ATTEMPT=$((ATTEMPT + 1))
done

if [ $ATTEMPT -gt $MAX_ATTEMPTS ]; then
  echo "⚠️ Orden aún en estado PENDING después de $MAX_ATTEMPTS intentos"
fi
```

**Estados Posibles:**

- `PENDING` - Orden creada, esperando procesamiento
- `CONFIRMED` - Orden confirmada, stock reservado
- `PAID` - Pago procesado exitosamente
- `SHIPPED` - Orden enviada
- `DELIVERED` - Orden entregada
- `CANCELLED` - Orden cancelada
- `FAILED` - Orden falló en procesamiento

**Checklist:**

- [ ] Endpoint responde rápidamente (< 100ms)
- [ ] Estado progresa correctamente: PENDING → CONFIRMED → PAID → SHIPPED
- [ ] `updatedAt` cambia cuando el estado cambia

---

## 🧪 Script de Testing Completo

```bash
#!/bin/bash
# Testing completo de Orders Module

BASE_URL="http://localhost:3000"
TOKEN="your-jwt-token"

echo "=== 🛒 Testing Orders Module ==="
echo ""

# Preparar productos
echo "0️⃣ Obteniendo productos..."
PRODUCT_ID_1=$(curl -s -X GET "$BASE_URL/products?limit=1" | jq -r '.data[0].id')
PRODUCT_ID_2=$(curl -s -X GET "$BASE_URL/products?limit=2" | jq -r '.data[1].id')
echo "✅ Productos: $PRODUCT_ID_1, $PRODUCT_ID_2"

# 1. Crear orden
echo "1️⃣ Creando orden..."
IDEMPOTENCY_KEY="test-order-$(date +%s)"

CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"items\": [
      {
        \"productId\": \"$PRODUCT_ID_1\",
        \"quantity\": 2,
        \"price\": 99.99
      },
      {
        \"productId\": \"$PRODUCT_ID_2\",
        \"quantity\": 1,
        \"price\": 149.99
      }
    ],
    \"shippingAddress\": {
      \"street\": \"123 Test St\",
      \"city\": \"Test City\",
      \"state\": \"TC\",
      \"postalCode\": \"12345\",
      \"country\": \"Argentina\"
    },
    \"paymentMethod\": \"CREDIT_CARD\",
    \"idempotencyKey\": \"$IDEMPOTENCY_KEY\"
  }")

ORDER_ID=$(echo $CREATE_RESPONSE | jq -r '.id')
STATUS=$(echo $CREATE_RESPONSE | jq -r '.status')
TOTAL=$(echo $CREATE_RESPONSE | jq -r '.total')

if [ "$ORDER_ID" != "null" ]; then
  echo "✅ Orden creada: $ORDER_ID"
  echo "   Status: $STATUS | Total: \$$TOTAL"
else
  echo "❌ Error al crear orden"
  exit 1
fi

# 2. Test de idempotencia
echo "2️⃣ Probando idempotencia..."
SECOND_RESPONSE=$(curl -s -X POST "$BASE_URL/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"items\": [
      {
        \"productId\": \"$PRODUCT_ID_1\",
        \"quantity\": 2,
        \"price\": 99.99
      }
    ],
    \"shippingAddress\": {
      \"street\": \"123 Test St\",
      \"city\": \"Test City\",
      \"state\": \"TC\",
      \"postalCode\": \"12345\",
      \"country\": \"Argentina\"
    },
    \"paymentMethod\": \"CREDIT_CARD\",
    \"idempotencyKey\": \"$IDEMPOTENCY_KEY\"
  }")

SECOND_ORDER_ID=$(echo $SECOND_RESPONSE | jq -r '.id')

if [ "$ORDER_ID" == "$SECOND_ORDER_ID" ]; then
  echo "✅ Idempotencia funciona - mismo ID retornado"
else
  echo "❌ Idempotencia falló - IDs diferentes"
fi

# 3. Obtener orden por ID
echo "3️⃣ Obteniendo orden por ID..."
ORDER_DETAIL=$(curl -s -X GET "$BASE_URL/orders/$ORDER_ID" \
  -H "Authorization: Bearer $TOKEN")

ITEMS_COUNT=$(echo $ORDER_DETAIL | jq '.items | length')
echo "✅ Orden obtenida con $ITEMS_COUNT items"

# 4. Listar órdenes del usuario
echo "4️⃣ Listando órdenes del usuario..."
USER_ORDERS=$(curl -s -X GET "$BASE_URL/orders" \
  -H "Authorization: Bearer $TOKEN")

ORDERS_COUNT=$(echo $USER_ORDERS | jq '. | length')
echo "✅ Usuario tiene $ORDERS_COUNT órdenes"

# 5. Obtener estado de orden
echo "5️⃣ Obteniendo estado de orden..."
STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/orders/$ORDER_ID/status" \
  -H "Authorization: Bearer $TOKEN")

CURRENT_STATUS=$(echo $STATUS_RESPONSE | jq -r '.status')
PAYMENT_STATUS=$(echo $STATUS_RESPONSE | jq -r '.paymentStatus')

echo "✅ Estado: $CURRENT_STATUS | Pago: $PAYMENT_STATUS"

# 6. Polling de estado (esperar procesamiento)
echo "6️⃣ Esperando procesamiento de orden (max 30 segundos)..."

MAX_ATTEMPTS=10
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  sleep 3

  STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/orders/$ORDER_ID/status" \
    -H "Authorization: Bearer $TOKEN")

  STATUS=$(echo $STATUS_RESPONSE | jq -r '.status')

  echo "   Intento $ATTEMPT: $STATUS"

  if [ "$STATUS" != "PENDING" ]; then
    echo "✅ Orden procesada: $STATUS"
    break
  fi

  ATTEMPT=$((ATTEMPT + 1))
done

echo ""
echo "=== ✅ Testing completado ==="
```

---

## 📝 Notas Importantes

### Payment Methods Soportados

- `CREDIT_CARD`
- `DEBIT_CARD`
- `PAYPAL`
- `BANK_TRANSFER`
- `CASH_ON_DELIVERY`

### Estados de Orden

1. **PENDING** - Orden creada, en cola de procesamiento
2. **CONFIRMED** - Stock verificado y reservado
3. **PAID** - Pago procesado exitosamente
4. **SHIPPED** - Orden enviada al cliente
5. **DELIVERED** - Orden entregada
6. **CANCELLED** - Orden cancelada
7. **FAILED** - Error en procesamiento (stock insuficiente, pago rechazado)

### Idempotencia

- **Clave:** `idempotencyKey` (opcional pero recomendado)
- **Uso:** Previene creación de órdenes duplicadas en caso de retry
- **Comportamiento:** Mismo key retorna la orden existente sin crear nueva

### Cálculo de Totales

```
subtotal = Σ(item.quantity * item.unitPrice)
tax = subtotal * 0.21  (21% IVA)
shippingCost = 15.00 (fijo por ahora)
total = subtotal + tax + shippingCost
```

---

**Estado del Módulo:** ✅ Completado  
**Tests Totales:** 15+  
**Tests Críticos:** 6  
**Procesamiento:** Asíncrono (Saga Pattern)  
**Última Actualización:** 2025-10-11
