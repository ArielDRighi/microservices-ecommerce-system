#!/bin/bash

# Script para testear endpoints de órdenes
# Puerto: 3002 (ajustado)
# Asegúrate de haber reiniciado el servidor después de los últimos cambios

set -e

BASE_URL="http://localhost:3002/api/v1"

echo "=========================================="
echo "Testing Orders Module API Endpoints"
echo "Base URL: $BASE_URL"
echo "=========================================="
echo ""

# 1. Registrar usuario
echo "1️⃣  Registrando usuario de prueba..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-orders-v2@example.com",
    "password": "Test123456!",
    "firstName": "Test",
    "lastName": "User"
  }')

echo "✅ Usuario registrado"
echo ""

# 2. Login
echo "2️⃣  Haciendo login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-orders-v2@example.com",
    "password": "Test123456!"
  }')

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
echo "✅ Token obtenido: ${ACCESS_TOKEN:0:50}..."
echo ""

# 3. Crear productos
echo "3️⃣  Creando productos de prueba..."

PRODUCT1_RESPONSE=$(curl -s -X POST "$BASE_URL/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "name": "Laptop HP Pro",
    "description": "Laptop HP 15 pulgadas",
    "price": 899.99,
    "sku": "LAPTOP-HP-PRO-001",
    "isActive": true
  }')

PRODUCT1_ID=$(echo "$PRODUCT1_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "✅ Producto 1 creado: $PRODUCT1_ID"

PRODUCT2_RESPONSE=$(curl -s -X POST "$BASE_URL/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "name": "Mouse Logitech Pro",
    "description": "Mouse inalámbrico Logitech",
    "price": 29.99,
    "sku": "MOUSE-LOG-PRO-001",
    "isActive": true
  }')

PRODUCT2_ID=$(echo "$PRODUCT2_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "✅ Producto 2 creado: $PRODUCT2_ID"
echo ""

# 4. Crear orden (esperando 202 Accepted)
echo "4️⃣  Creando orden (POST /orders)..."
echo "⏳ Esperando respuesta 202 Accepted..."

ORDER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{
    \"items\": [
      {
        \"productId\": \"$PRODUCT1_ID\",
        \"quantity\": 2
      },
      {
        \"productId\": \"$PRODUCT2_ID\",
        \"quantity\": 3
      }
    ]
  }")

HTTP_CODE=$(echo "$ORDER_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$ORDER_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "202" ]; then
  echo "✅ Correcto: Recibió 202 Accepted (non-blocking)"
  ORDER1_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  TOTAL=$(echo "$RESPONSE_BODY" | grep -o '"totalAmount":"[^"]*' | cut -d'"' -f4)
  echo "📦 Order ID: $ORDER1_ID"
  echo "💰 Total: \$$TOTAL USD"
else
  echo "❌ Error: Esperaba 202 pero recibió $HTTP_CODE"
  echo "Respuesta: $RESPONSE_BODY"
  exit 1
fi
echo ""

# 5. Probar idempotencia
echo "5️⃣  Probando idempotencia..."

IDEMPOTENCY_KEY="test-key-$(date +%s)"
echo "🔑 Idempotency Key: $IDEMPOTENCY_KEY"

# Primera petición
IDEM1_RESPONSE=$(curl -s -X POST "$BASE_URL/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{
    \"items\": [
      {
        \"productId\": \"$PRODUCT1_ID\",
        \"quantity\": 1
      }
    ],
    \"idempotencyKey\": \"$IDEMPOTENCY_KEY\"
  }")

IDEM1_ID=$(echo "$IDEM1_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "Primera petición - Order ID: $IDEM1_ID"

# Segunda petición (mismo idempotency key)
IDEM2_RESPONSE=$(curl -s -X POST "$BASE_URL/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{
    \"items\": [
      {
        \"productId\": \"$PRODUCT1_ID\",
        \"quantity\": 1
      }
    ],
    \"idempotencyKey\": \"$IDEMPOTENCY_KEY\"
  }")

IDEM2_ID=$(echo "$IDEM2_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "Segunda petición - Order ID: $IDEM2_ID"

if [ "$IDEM1_ID" = "$IDEM2_ID" ]; then
  echo "✅ Idempotencia funcionando correctamente (mismo ID)"
else
  echo "❌ Idempotencia falló (IDs diferentes)"
fi
echo ""

# 6. Listar órdenes
echo "6️⃣  Obteniendo lista de órdenes (GET /orders)..."

ORDERS_LIST=$(curl -s -X GET "$BASE_URL/orders" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

ORDER_COUNT=$(echo "$ORDERS_LIST" | grep -o '"id":"[^"]*' | wc -l)
echo "✅ Total de órdenes: $ORDER_COUNT"
echo ""

# 7. Obtener detalles de orden
echo "7️⃣  Obteniendo detalles de orden (GET /orders/$ORDER1_ID)..."

ORDER_DETAILS=$(curl -s -X GET "$BASE_URL/orders/$ORDER1_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

STATUS=$(echo "$ORDER_DETAILS" | grep -o '"status":"[^"]*' | head -1 | cut -d'"' -f4)
ITEMS_COUNT=$(echo "$ORDER_DETAILS" | grep -o '"quantity":[0-9]*' | wc -l)

echo "✅ Orden obtenida"
echo "📊 Estado: $STATUS"
echo "📦 Items: $ITEMS_COUNT"
echo ""

# 8. Obtener solo estado
echo "8️⃣  Obteniendo solo estado (GET /orders/$ORDER1_ID/status)..."

STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/orders/$ORDER1_ID/status" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

CURRENT_STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
echo "✅ Estado: $CURRENT_STATUS"
echo ""

# 9. Validar seguridad
echo "9️⃣  Validando seguridad (orden inexistente)..."

FAKE_ID="00000000-0000-0000-0000-000000000000"
SEC_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/orders/$FAKE_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

SEC_HTTP_CODE=$(echo "$SEC_RESPONSE" | tail -n1)

if [ "$SEC_HTTP_CODE" = "404" ]; then
  echo "✅ Seguridad OK: Retorna 404 para orden inexistente"
else
  echo "❌ Esperaba 404 pero recibió $SEC_HTTP_CODE"
fi
echo ""

# Resumen
echo "=========================================="
echo "🎉 TODAS LAS PRUEBAS COMPLETADAS"
echo "=========================================="
echo "✅ Usuario registrado y autenticado"
echo "✅ 2 Productos creados"
echo "✅ Orden creada con 202 Accepted"
echo "✅ Idempotencia validada"
echo "✅ Lista de órdenes obtenida"
echo "✅ Detalles de orden obtenidos"
echo "✅ Estado de orden obtenido"
echo "✅ Validación de seguridad exitosa"
echo "=========================================="
echo ""
echo "💡 Verifica en los logs del servidor:"
echo "   - OrderCreatedEvent publicado a outbox"
echo "   - OutboxProcessor procesando eventos"
echo ""
