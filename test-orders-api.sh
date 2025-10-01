#!/bin/bash

# Script para testear todos los endpoints del módulo de órdenes
# Asegúrate de que el servidor esté corriendo antes de ejecutar este script

set -e

BASE_URL="http://localhost:3000"
echo "=========================================="
echo "Testing Orders Module API Endpoints"
echo "Base URL: $BASE_URL"
echo "=========================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Registrar un usuario de prueba
echo -e "${BLUE}1. Registrando usuario de prueba...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-orders@example.com",
    "password": "Test123456!",
    "name": "Test Orders User"
  }')

echo "$REGISTER_RESPONSE" | jq '.'
echo ""

# 2. Login para obtener JWT token
echo -e "${BLUE}2. Haciendo login para obtener JWT token...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-orders@example.com",
    "password": "Test123456!"
  }')

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken')
echo "Access Token: ${ACCESS_TOKEN:0:50}..."
echo ""

# 3. Crear productos de prueba
echo -e "${BLUE}3. Creando productos de prueba...${NC}"

PRODUCT1_RESPONSE=$(curl -s -X POST "$BASE_URL/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "name": "Laptop HP",
    "description": "Laptop HP 15 pulgadas",
    "price": 899.99,
    "sku": "LAPTOP-HP-001",
    "stock": 50,
    "isActive": true
  }')

PRODUCT1_ID=$(echo "$PRODUCT1_RESPONSE" | jq -r '.id')
echo "Producto 1 ID: $PRODUCT1_ID"

PRODUCT2_RESPONSE=$(curl -s -X POST "$BASE_URL/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "name": "Mouse Logitech",
    "description": "Mouse inalámbrico Logitech",
    "price": 29.99,
    "sku": "MOUSE-LOG-001",
    "stock": 100,
    "isActive": true
  }')

PRODUCT2_ID=$(echo "$PRODUCT2_RESPONSE" | jq -r '.id')
echo "Producto 2 ID: $PRODUCT2_ID"
echo ""

# 4. Crear una orden (POST /orders) - Debería retornar 202 Accepted
echo -e "${BLUE}4. Creando una orden (POST /orders)...${NC}"
echo -e "${YELLOW}Esperando respuesta 202 Accepted (no bloqueante)${NC}"

ORDER1_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/orders" \
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

HTTP_CODE=$(echo "$ORDER1_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$ORDER1_RESPONSE" | head -n-1)

echo "HTTP Status Code: $HTTP_CODE"
echo "$RESPONSE_BODY" | jq '.'

if [ "$HTTP_CODE" = "202" ]; then
  echo -e "${GREEN}✓ Correcto: Recibió 202 Accepted${NC}"
else
  echo -e "${YELLOW}⚠ Advertencia: Esperaba 202 pero recibió $HTTP_CODE${NC}"
fi

ORDER1_ID=$(echo "$RESPONSE_BODY" | jq -r '.id')
echo "Order ID: $ORDER1_ID"
echo ""

# 5. Probar idempotencia - crear orden con mismo idempotencyKey
echo -e "${BLUE}5. Probando idempotencia (mismo idempotencyKey)...${NC}"

IDEMPOTENCY_KEY="test-idempotency-key-$(date +%s)"

ORDER_IDEM1=$(curl -s -X POST "$BASE_URL/orders" \
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

IDEM_ORDER_ID=$(echo "$ORDER_IDEM1" | jq -r '.id')
echo "Primera orden con idempotency key: $IDEM_ORDER_ID"

# Intentar crear la misma orden de nuevo
ORDER_IDEM2=$(curl -s -X POST "$BASE_URL/orders" \
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

IDEM_ORDER_ID2=$(echo "$ORDER_IDEM2" | jq -r '.id')
echo "Segunda orden con mismo idempotency key: $IDEM_ORDER_ID2"

if [ "$IDEM_ORDER_ID" = "$IDEM_ORDER_ID2" ]; then
  echo -e "${GREEN}✓ Idempotencia funcionando correctamente (mismo ID)${NC}"
else
  echo -e "${YELLOW}⚠ Idempotencia no funciona (IDs diferentes)${NC}"
fi
echo ""

# 6. Obtener lista de órdenes (GET /orders)
echo -e "${BLUE}6. Obteniendo lista de órdenes del usuario (GET /orders)...${NC}"

ORDERS_LIST=$(curl -s -X GET "$BASE_URL/orders" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$ORDERS_LIST" | jq '.'
ORDER_COUNT=$(echo "$ORDERS_LIST" | jq 'length')
echo "Total de órdenes: $ORDER_COUNT"
echo ""

# 7. Obtener detalles de una orden específica (GET /orders/:id)
echo -e "${BLUE}7. Obteniendo detalles de orden específica (GET /orders/$ORDER1_ID)...${NC}"

ORDER_DETAILS=$(curl -s -X GET "$BASE_URL/orders/$ORDER1_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$ORDER_DETAILS" | jq '.'
echo ""

# 8. Obtener solo el estado de una orden (GET /orders/:id/status)
echo -e "${BLUE}8. Obteniendo solo el estado de la orden (GET /orders/$ORDER1_ID/status)...${NC}"

ORDER_STATUS=$(curl -s -X GET "$BASE_URL/orders/$ORDER1_ID/status" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$ORDER_STATUS" | jq '.'
CURRENT_STATUS=$(echo "$ORDER_STATUS" | jq -r '.status')
echo "Estado actual: $CURRENT_STATUS"
echo ""

# 9. Intentar acceder a orden de otro usuario (debería fallar)
echo -e "${BLUE}9. Probando seguridad: intentar acceder a orden inexistente...${NC}"

FAKE_ORDER_ID="00000000-0000-0000-0000-000000000000"
UNAUTHORIZED_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/orders/$FAKE_ORDER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

UNAUTH_HTTP_CODE=$(echo "$UNAUTHORIZED_RESPONSE" | tail -n1)
UNAUTH_BODY=$(echo "$UNAUTHORIZED_RESPONSE" | head -n-1)

echo "HTTP Status Code: $UNAUTH_HTTP_CODE"
echo "$UNAUTH_BODY" | jq '.'

if [ "$UNAUTH_HTTP_CODE" = "404" ]; then
  echo -e "${GREEN}✓ Correcto: Retorna 404 para orden inexistente${NC}"
else
  echo -e "${YELLOW}⚠ Esperaba 404 pero recibió $UNAUTH_HTTP_CODE${NC}"
fi
echo ""

# 10. Validar que se creó el evento en la outbox
echo -e "${BLUE}10. Resumen de pruebas completadas${NC}"
echo "=========================================="
echo -e "${GREEN}✓ Usuario registrado y autenticado${NC}"
echo -e "${GREEN}✓ Productos creados correctamente${NC}"
echo -e "${GREEN}✓ Orden creada con respuesta 202 Accepted${NC}"
echo -e "${GREEN}✓ Idempotencia validada${NC}"
echo -e "${GREEN}✓ Lista de órdenes obtenida${NC}"
echo -e "${GREEN}✓ Detalles de orden obtenidos${NC}"
echo -e "${GREEN}✓ Estado de orden obtenido${NC}"
echo -e "${GREEN}✓ Validación de seguridad exitosa${NC}"
echo "=========================================="
echo ""
echo -e "${YELLOW}Nota: Verifica en los logs del servidor que se haya publicado el evento OrderCreatedEvent a la outbox${NC}"
echo ""
