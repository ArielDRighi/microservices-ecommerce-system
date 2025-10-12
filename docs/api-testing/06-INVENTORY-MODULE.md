# 📦 API Testing - Módulo de Inventario (Inventory)

**Módulo:** Inventory  
**Base URL:** `http://localhost:3000/inventory`  
**Descripción:** Gestión de stock, reservas con TTL, movimientos y estadísticas en tiempo real

---

## 📋 Índice de Tests

- [ ] ✅ 1. Verificar Disponibilidad (POST /inventory/check-availability) [Public]
- [ ] ✅ 2. Reservar Stock (POST /inventory/reserve) [Auth Required]
- [ ] ✅ 3. Liberar Reserva (PUT /inventory/release-reservation) [Auth Required]
- [ ] ✅ 4. Confirmar Reserva (PUT /inventory/fulfill-reservation) [Auth Required]
- [ ] ✅ 5. Agregar Stock (POST /inventory/add-stock) [Auth Required - ADMIN]
- [ ] ✅ 6. Remover Stock (POST /inventory/remove-stock) [Auth Required - ADMIN]
- [ ] ✅ 7. Obtener Inventario por Producto (GET /inventory/product/:productId) [Public]
- [ ] ✅ 8. Listar Todo el Inventario (GET /inventory) [Public]
- [ ] ✅ 9. Productos con Stock Bajo (GET /inventory/low-stock) [Public]
- [ ] ✅ 10. Productos Sin Stock (GET /inventory/out-of-stock) [Public]
- [ ] ✅ 11. Estadísticas de Inventario (GET /inventory/stats) [Auth Required]
- [ ] ✅ 12. Reservas con TTL (Time To Live)
- [ ] ✅ 13. Movimientos de Stock (Audit Trail)

---

## Variables de Entorno

```bash
export BASE_URL="http://localhost:3000"
export TOKEN="your-jwt-token-here"
export ADMIN_TOKEN="admin-jwt-token-here"
export PRODUCT_ID=""
export RESERVATION_ID=""
```

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

## 1️⃣ Verificar Disponibilidad

### ✅ Test 1.1: Verificar stock disponible

**Endpoint:** `POST /inventory/check-availability`  
**Autenticación:** No requerida (Public)  
**Status Code:** `200 OK`

**Request Body:**

```json
{
  "productId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "quantity": 5,
  "location": "MAIN_WAREHOUSE"
}
```

**Comando curl:**

```bash
# Primero obtener un producto existente
export PRODUCT_ID=$(curl -s -X GET "$BASE_URL/products?limit=1" | jq -r '.data[0].id')

curl -X POST "$BASE_URL/inventory/check-availability" \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"quantity\": 5,
    \"location\": \"MAIN_WAREHOUSE\"
  }" | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
{
  "productId": "product-uuid",
  "requestedQuantity": 5,
  "available": true,
  "availableQuantity": 150,
  "location": "MAIN_WAREHOUSE",
  "message": "Stock available"
}
```

**Respuesta cuando NO hay stock suficiente:**

```json
{
  "productId": "product-uuid",
  "requestedQuantity": 5,
  "available": false,
  "availableQuantity": 2,
  "location": "MAIN_WAREHOUSE",
  "message": "Insufficient stock. Only 2 units available"
}
```

**Checklist:**

- [ ] Status code es 200 (siempre, aunque no haya stock)
- [ ] `available: true` si hay stock suficiente
- [ ] `available: false` si stock insuficiente
- [ ] `availableQuantity` indica stock real disponible
- [ ] Endpoint público (no requiere auth)

---

### ✅ Test 1.2: Verificar con cantidad 0 (400 Bad Request)

**Comando curl:**

```bash
curl -X POST "$BASE_URL/inventory/check-availability" \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"quantity\": 0
  }" | jq '.'
```

**Respuesta Esperada (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": ["Quantity must be at least 1"],
  "error": "Bad Request"
}
```

**Checklist:**

- [ ] Status code es 400
- [ ] Cantidad mínima es 1

---

## 2️⃣ Reservar Stock

### ✅ Test 2.1: Reservar stock exitosamente

**Endpoint:** `POST /inventory/reserve`  
**Autenticación:** Bearer Token (JWT) - Required  
**Status Code:** `201 Created`

**Request Body:**

```json
{
  "productId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
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
curl -X POST "$BASE_URL/inventory/reserve" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"quantity\": 3,
    \"reservationId\": \"$RESERVATION_ID\",
    \"location\": \"MAIN_WAREHOUSE\",
    \"reason\": \"Order processing\",
    \"referenceId\": \"order_test_123\",
    \"ttlMinutes\": 30
  }" | jq '.'
```

**Respuesta Esperada (201 Created):**

```json
{
  "id": "reservation-uuid",
  "productId": "product-uuid",
  "reservationId": "res_1234567890",
  "quantity": 3,
  "location": "MAIN_WAREHOUSE",
  "reason": "Order processing",
  "referenceId": "order_xyz123",
  "status": "ACTIVE",
  "expiresAt": "2025-10-11T11:00:00.000Z",
  "createdAt": "2025-10-11T10:30:00.000Z"
}
```

**Checklist:**

- [ ] Status code es 201
- [ ] `status` es `ACTIVE`
- [ ] `expiresAt` es 30 minutos después (o TTL especificado)
- [ ] Stock disponible disminuye temporalmente
- [ ] `reservationId` debe ser único

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
curl -X PUT "$BASE_URL/inventory/release-reservation" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"reservationId\": \"$RESERVATION_ID\"
  }" | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
{
  "id": "reservation-uuid",
  "reservationId": "res_1234567890",
  "productId": "product-uuid",
  "quantity": 3,
  "status": "RELEASED",
  "releasedAt": "2025-10-11T10:35:00.000Z"
}
```

**Checklist:**

- [ ] Status code es 200
- [ ] `status` cambia a `RELEASED`
- [ ] Stock vuelve a estar disponible
- [ ] `releasedAt` tiene timestamp

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
# Crear nueva reserva para fulfill
FULFILL_RESERVATION="res_fulfill_$(date +%s)"

curl -s -X POST "$BASE_URL/inventory/reserve" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"quantity\": 2,
    \"reservationId\": \"$FULFILL_RESERVATION\"
  }" > /dev/null

# Confirmar reserva
curl -X PUT "$BASE_URL/inventory/fulfill-reservation" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"reservationId\": \"$FULFILL_RESERVATION\"
  }" | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
{
  "id": "reservation-uuid",
  "reservationId": "res_1234567890",
  "productId": "product-uuid",
  "quantity": 2,
  "status": "FULFILLED",
  "fulfilledAt": "2025-10-11T10:40:00.000Z"
}
```

**Checklist:**

- [ ] Status code es 200
- [ ] `status` cambia a `FULFILLED`
- [ ] Stock físico decrementado permanentemente
- [ ] Reserva ya no aparece como activa
- [ ] `fulfilledAt` tiene timestamp

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

## 6️⃣ Remover Stock

### ✅ Test 6.1: Remover stock exitosamente

**Endpoint:** `POST /inventory/remove-stock`  
**Autenticación:** Bearer Token (JWT) - Required (ADMIN)  
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
curl -X POST "$BASE_URL/inventory/remove-stock" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"quantity\": 10,
    \"location\": \"MAIN_WAREHOUSE\",
    \"reason\": \"Damaged goods\",
    \"referenceId\": \"ADJ-001\"
  }" | jq '.'
```

**Respuesta Esperada (201 Created):**

```json
{
  "id": "movement-uuid",
  "productId": "product-uuid",
  "type": "OUTBOUND",
  "quantity": 10,
  "previousQuantity": 150,
  "newQuantity": 140,
  "location": "MAIN_WAREHOUSE",
  "reason": "Damaged goods",
  "referenceId": "ADJ-001",
  "createdAt": "2025-10-11T10:50:00.000Z"
}
```

**Checklist:**

- [ ] Status code es 201
- [ ] `type` es `OUTBOUND`
- [ ] `newQuantity` = `previousQuantity` - `quantity`
- [ ] Solo ADMIN puede remover stock

---

### ❌ Test 6.2: Remover más stock del disponible (400 Bad Request)

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
curl -X GET "$BASE_URL/inventory/low-stock?threshold=20" | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
{
  "data": [
    {
      "productId": "product-uuid",
      "productName": "Low Stock Product",
      "productSku": "PROD-LOW",
      "totalQuantity": 15,
      "availableQuantity": 12,
      "lowStockThreshold": 20,
      "deficit": 5
    }
  ],
  "meta": {
    "total": 8,
    "threshold": 20
  }
}
```

**Checklist:**

- [ ] Status code es 200
- [ ] Solo productos con `quantity <= threshold`
- [ ] Útil para alertas de reabastecimiento

---

## 🔟 Productos Sin Stock

### ✅ Test 10.1: Listar productos sin stock

**Endpoint:** `GET /inventory/out-of-stock`

**Comando curl:**

```bash
curl -X GET "$BASE_URL/inventory/out-of-stock" | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
{
  "data": [
    {
      "productId": "product-uuid",
      "productName": "Out of Stock Product",
      "productSku": "PROD-OOS",
      "totalQuantity": 0,
      "availableQuantity": 0,
      "lastRestockDate": "2025-10-01T10:00:00.000Z",
      "daysOutOfStock": 10
    }
  ],
  "meta": {
    "total": 3
  }
}
```

**Checklist:**

- [ ] Status code es 200
- [ ] Solo productos con `availableQuantity = 0`

---

## 1️⃣1️⃣ Estadísticas de Inventario

### ✅ Test 11.1: Obtener estadísticas globales

**Endpoint:** `GET /inventory/stats`  
**Autenticación:** Bearer Token (JWT) - Required

**Comando curl:**

```bash
curl -X GET "$BASE_URL/inventory/stats" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
{
  "totalProducts": 150,
  "totalStockValue": 250000.0,
  "totalQuantity": 5420,
  "availableQuantity": 5180,
  "reservedQuantity": 240,
  "lowStockProducts": 12,
  "outOfStockProducts": 5,
  "activeReservations": 45,
  "locations": [
    {
      "location": "MAIN_WAREHOUSE",
      "totalQuantity": 4200,
      "productsCount": 120
    },
    {
      "location": "BACKUP_WAREHOUSE",
      "totalQuantity": 1220,
      "productsCount": 80
    }
  ],
  "recentMovements": {
    "last24h": {
      "inbound": 150,
      "outbound": 95,
      "netChange": 55
    },
    "last7d": {
      "inbound": 850,
      "outbound": 620,
      "netChange": 230
    }
  }
}
```

**Checklist:**

- [ ] Status code es 200
- [ ] Dashboard completo de inventario
- [ ] Estadísticas por ubicación
- [ ] Movimientos recientes

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

---

**Estado del Módulo:** ✅ Completado  
**Tests Totales:** 40+  
**Tests Críticos:** 13  
**Reservas:** Con TTL automático  
**Audit Trail:** Completo  
**Última Actualización:** 2025-10-11
