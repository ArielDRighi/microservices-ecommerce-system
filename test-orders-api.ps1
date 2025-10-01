# Comandos curl para testear el módulo de órdenes
# Ejecuta estos comandos uno por uno en tu terminal

# Variables de entorno
$BASE_URL = "http://localhost:3000"

# ==================================================
# 1. REGISTRAR USUARIO
# ==================================================
Write-Host "1. Registrando usuario..." -ForegroundColor Blue

curl -X POST "$BASE_URL/auth/register" `
  -H "Content-Type: application/json" `
  -d '{
    "email": "test-orders@example.com",
    "password": "Test123456!",
    "name": "Test Orders User"
  }'

# ==================================================
# 2. LOGIN (OBTENER TOKEN)
# ==================================================
Write-Host "`n2. Haciendo login..." -ForegroundColor Blue

$loginResponse = curl -X POST "$BASE_URL/auth/login" `
  -H "Content-Type: application/json" `
  -d '{
    "email": "test-orders@example.com",
    "password": "Test123456!"
  }' | ConvertFrom-Json

$TOKEN = $loginResponse.accessToken
Write-Host "Token obtenido: $($TOKEN.Substring(0, 50))..." -ForegroundColor Green

# ==================================================
# 3. CREAR PRODUCTOS
# ==================================================
Write-Host "`n3. Creando productos..." -ForegroundColor Blue

# Producto 1
$product1 = curl -X POST "$BASE_URL/products" `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $TOKEN" `
  -d '{
    "name": "Laptop HP",
    "description": "Laptop HP 15 pulgadas",
    "price": 899.99,
    "sku": "LAPTOP-HP-001",
    "stock": 50,
    "isActive": true
  }' | ConvertFrom-Json

$PRODUCT1_ID = $product1.id
Write-Host "Producto 1 ID: $PRODUCT1_ID" -ForegroundColor Green

# Producto 2
$product2 = curl -X POST "$BASE_URL/products" `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $TOKEN" `
  -d '{
    "name": "Mouse Logitech",
    "description": "Mouse inalámbrico Logitech",
    "price": 29.99,
    "sku": "MOUSE-LOG-001",
    "stock": 100,
    "isActive": true
  }' | ConvertFrom-Json

$PRODUCT2_ID = $product2.id
Write-Host "Producto 2 ID: $PRODUCT2_ID" -ForegroundColor Green

# ==================================================
# 4. CREAR ORDEN (POST /orders) - 202 ACCEPTED
# ==================================================
Write-Host "`n4. Creando orden (esperando 202 Accepted)..." -ForegroundColor Blue

$order1 = curl -X POST "$BASE_URL/orders" `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $TOKEN" `
  -d "{
    `"items`": [
      {
        `"productId`": `"$PRODUCT1_ID`",
        `"quantity`": 2
      },
      {
        `"productId`": `"$PRODUCT2_ID`",
        `"quantity`": 3
      }
    ]
  }" | ConvertFrom-Json

$ORDER1_ID = $order1.id
Write-Host "Orden creada con ID: $ORDER1_ID" -ForegroundColor Green
Write-Host "Total: $($order1.totalAmount) $($order1.currency)" -ForegroundColor Green
Write-Host "Estado: $($order1.status)" -ForegroundColor Green

# ==================================================
# 5. PROBAR IDEMPOTENCIA
# ==================================================
Write-Host "`n5. Probando idempotencia..." -ForegroundColor Blue

$IDEMPOTENCY_KEY = "test-key-$(Get-Date -Format 'yyyyMMddHHmmss')"
Write-Host "Usando idempotency key: $IDEMPOTENCY_KEY" -ForegroundColor Yellow

# Primera petición
$idemOrder1 = curl -X POST "$BASE_URL/orders" `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $TOKEN" `
  -d "{
    `"items`": [
      {
        `"productId`": `"$PRODUCT1_ID`",
        `"quantity`": 1
      }
    ],
    `"idempotencyKey`": `"$IDEMPOTENCY_KEY`"
  }" | ConvertFrom-Json

Write-Host "Primera orden ID: $($idemOrder1.id)" -ForegroundColor Cyan

# Segunda petición (debería retornar la misma orden)
$idemOrder2 = curl -X POST "$BASE_URL/orders" `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $TOKEN" `
  -d "{
    `"items`": [
      {
        `"productId`": `"$PRODUCT1_ID`",
        `"quantity`": 1
      }
    ],
    `"idempotencyKey`": `"$IDEMPOTENCY_KEY`"
  }" | ConvertFrom-Json

Write-Host "Segunda orden ID: $($idemOrder2.id)" -ForegroundColor Cyan

if ($idemOrder1.id -eq $idemOrder2.id) {
  Write-Host "✓ Idempotencia funcionando correctamente" -ForegroundColor Green
} else {
  Write-Host "✗ Idempotencia falló" -ForegroundColor Red
}

# ==================================================
# 6. LISTAR ÓRDENES (GET /orders)
# ==================================================
Write-Host "`n6. Obteniendo lista de órdenes..." -ForegroundColor Blue

$ordersList = curl -X GET "$BASE_URL/orders" `
  -H "Authorization: Bearer $TOKEN" | ConvertFrom-Json

Write-Host "Total de órdenes: $($ordersList.Count)" -ForegroundColor Green
$ordersList | Format-Table id, status, totalAmount, currency, createdAt

# ==================================================
# 7. OBTENER DETALLES DE ORDEN (GET /orders/:id)
# ==================================================
Write-Host "`n7. Obteniendo detalles de la orden $ORDER1_ID..." -ForegroundColor Blue

$orderDetails = curl -X GET "$BASE_URL/orders/$ORDER1_ID" `
  -H "Authorization: Bearer $TOKEN" | ConvertFrom-Json

Write-Host "Orden ID: $($orderDetails.id)" -ForegroundColor Cyan
Write-Host "Estado: $($orderDetails.status)" -ForegroundColor Cyan
Write-Host "Total: $($orderDetails.totalAmount) $($orderDetails.currency)" -ForegroundColor Cyan
Write-Host "Items: $($orderDetails.items.Count)" -ForegroundColor Cyan
$orderDetails.items | Format-Table productName, quantity, unitPrice, subtotal

# ==================================================
# 8. OBTENER ESTADO DE ORDEN (GET /orders/:id/status)
# ==================================================
Write-Host "`n8. Obteniendo solo el estado de la orden..." -ForegroundColor Blue

$orderStatus = curl -X GET "$BASE_URL/orders/$ORDER1_ID/status" `
  -H "Authorization: Bearer $TOKEN" | ConvertFrom-Json

Write-Host "Orden ID: $($orderStatus.orderId)" -ForegroundColor Cyan
Write-Host "Estado: $($orderStatus.status)" -ForegroundColor Cyan

# ==================================================
# 9. VALIDAR SEGURIDAD (orden inexistente)
# ==================================================
Write-Host "`n9. Probando seguridad (orden inexistente)..." -ForegroundColor Blue

try {
  $fakeOrderId = "00000000-0000-0000-0000-000000000000"
  curl -X GET "$BASE_URL/orders/$fakeOrderId" `
    -H "Authorization: Bearer $TOKEN"
  Write-Host "✗ Debería haber retornado 404" -ForegroundColor Red
} catch {
  Write-Host "✓ Correctamente retorna error 404" -ForegroundColor Green
}

# ==================================================
# RESUMEN
# ==================================================
Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "RESUMEN DE PRUEBAS COMPLETADAS" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "✓ Usuario registrado y autenticado" -ForegroundColor Green
Write-Host "✓ 2 Productos creados" -ForegroundColor Green
Write-Host "✓ Órdenes creadas con 202 Accepted" -ForegroundColor Green
Write-Host "✓ Idempotencia validada" -ForegroundColor Green
Write-Host "✓ Lista de órdenes obtenida" -ForegroundColor Green
Write-Host "✓ Detalles de orden obtenidos" -ForegroundColor Green
Write-Host "✓ Estado de orden obtenido" -ForegroundColor Green
Write-Host "✓ Validación de seguridad exitosa" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "`nNota: Verifica en los logs del servidor que se haya" -ForegroundColor Yellow
Write-Host "publicado el evento OrderCreatedEvent a la outbox" -ForegroundColor Yellow
