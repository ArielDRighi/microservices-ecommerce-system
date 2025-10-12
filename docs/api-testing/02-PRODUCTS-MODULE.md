# 📦 API Testing - Módulo de Productos (Products)

**Módulo:** Products  
**Base URL:** `http://localhost:3000/products`  
**Descripción:** CRUD completo de productos con búsqueda, filtros, paginación y gestión de estado

---

## 📋 Índice de Tests

- [ ] ✅ 1. Listar Productos con Paginación (GET /products)
- [ ] ✅ 2. Buscar Productos (GET /products/search)
- [ ] ✅ 3. Obtener Producto por ID (GET /products/:id)
- [ ] ✅ 4. Crear Producto (POST /products) [Auth Required]
- [ ] ✅ 5. Actualizar Producto (PATCH /products/:id) [Auth Required]
- [ ] ✅ 6. Activar Producto (PATCH /products/:id/activate) [Auth Required]
- [ ] ✅ 7. Desactivar Producto (PATCH /products/:id/deactivate) [Auth Required]
- [ ] ✅ 8. Eliminar Producto (DELETE /products/:id) [Auth Required]

---

## Variables de Entorno

```bash
export BASE_URL="http://localhost:3000"
export TOKEN="your-jwt-token-here"
export PRODUCT_ID=""
```

---

## 1️⃣ Listar Productos con Paginación y Filtros

### ✅ Test 1.1: Listar todos los productos (sin filtros)

**Endpoint:** `GET /products`  
**Autenticación:** No requerida (público)

**Comando curl:**

```bash
curl -X GET "$BASE_URL/products" | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
{
  "data": [
    {
      "id": "uuid-here",
      "name": "Product Name",
      "description": "Product description",
      "sku": "PROD-001",
      "price": 99.99,
      "discountPrice": null,
      "discountPercentage": 0,
      "brand": "Brand Name",
      "stockQuantity": 100,
      "images": ["url1", "url2"],
      "tags": ["tag1", "tag2"],
      "weight": 1.5,
      "dimensions": {
        "length": 10,
        "width": 5,
        "height": 3
      },
      "isActive": true,
      "isFeatured": false,
      "createdAt": "2025-10-11T...",
      "updatedAt": "2025-10-11T..."
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "totalItems": 50,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

**Checklist:**

- [ ] Status code es 200
- [ ] Respuesta contiene `data` array
- [ ] Respuesta contiene `meta` object con paginación
- [ ] `meta.totalItems` > 0

---

### ✅ Test 1.2: Listar productos con paginación

**Comando curl:**

```bash
# Página 1, 5 items
curl -X GET "$BASE_URL/products?page=1&limit=5" | jq '.'

# Página 2, 5 items
curl -X GET "$BASE_URL/products?page=2&limit=5" | jq '.'
```

**Checklist:**

- [ ] Status code es 200
- [ ] `meta.page` coincide con el solicitado
- [ ] `meta.limit` coincide con el solicitado
- [ ] `data.length` <= `meta.limit`
- [ ] `meta.hasNextPage` correcto según totalPages

---

### ✅ Test 1.3: Filtrar productos por precio

**Comando curl:**

```bash
# Productos entre $50 y $100
curl -X GET "$BASE_URL/products?minPrice=50&maxPrice=100" | jq '.'

# Productos menores a $50
curl -X GET "$BASE_URL/products?maxPrice=50" | jq '.'

# Productos mayores a $100
curl -X GET "$BASE_URL/products?minPrice=100" | jq '.'
```

**Checklist:**

- [ ] Status code es 200
- [ ] Todos los productos cumplen el rango de precio
- [ ] `meta.totalItems` refleja productos filtrados

---

### ✅ Test 1.4: Filtrar productos por marca

**Comando curl:**

```bash
curl -X GET "$BASE_URL/products?brand=Samsung" | jq '.'
```

**Checklist:**

- [ ] Status code es 200
- [ ] Todos los productos tienen `brand === "Samsung"`

---

### ✅ Test 1.5: Filtrar productos por status

**Comando curl:**

```bash
# Solo productos activos
curl -X GET "$BASE_URL/products?status=active" | jq '.'

# Solo productos inactivos
curl -X GET "$BASE_URL/products?status=inactive" | jq '.'

# Todos (activos + inactivos)
curl -X GET "$BASE_URL/products?status=all" | jq '.'
```

**Checklist:**

- [ ] Status code es 200
- [ ] Filtro de status aplica correctamente
- [ ] `status=active` solo muestra `isActive: true`

---

### ✅ Test 1.6: Filtrar productos en oferta

**Comando curl:**

```bash
curl -X GET "$BASE_URL/products?onSale=true" | jq '.'
```

**Checklist:**

- [ ] Status code es 200
- [ ] Todos los productos tienen `discountPrice !== null`
- [ ] `discountPercentage > 0`

---

### ✅ Test 1.7: Ordenar productos

**Comando curl:**

```bash
# Ordenar por precio ascendente
curl -X GET "$BASE_URL/products?sortBy=price&sortOrder=ASC" | jq '.'

# Ordenar por precio descendente
curl -X GET "$BASE_URL/products?sortBy=price&sortOrder=DESC" | jq '.'

# Ordenar por fecha de creación (más recientes)
curl -X GET "$BASE_URL/products?sortBy=createdAt&sortOrder=DESC" | jq '.'

# Ordenar por nombre alfabéticamente
curl -X GET "$BASE_URL/products?sortBy=name&sortOrder=ASC" | jq '.'
```

**Checklist:**

- [ ] Status code es 200
- [ ] Productos están ordenados correctamente
- [ ] Orden ASC: menor a mayor
- [ ] Orden DESC: mayor a menor

---

### ✅ Test 1.8: Búsqueda con múltiples filtros combinados

**Comando curl:**

```bash
curl -X GET "$BASE_URL/products?brand=Samsung&minPrice=500&maxPrice=1500&sortBy=price&sortOrder=ASC&status=active&page=1&limit=10" | jq '.'
```

**Checklist:**

- [ ] Status code es 200
- [ ] Todos los filtros aplican correctamente
- [ ] Resultados cumplen con todas las condiciones

---

## 2️⃣ Buscar Productos

### ✅ Test 2.1: Búsqueda por término

**Endpoint:** `GET /products/search`  
**Autenticación:** No requerida (público)

**Comando curl:**

```bash
# Buscar "laptop"
curl -X GET "$BASE_URL/products/search?q=laptop" | jq '.'

# Buscar "samsung"
curl -X GET "$BASE_URL/products/search?q=samsung" | jq '.'

# Buscar con límite de resultados
curl -X GET "$BASE_URL/products/search?q=phone&limit=5" | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
[
  {
    "id": "uuid-here",
    "name": "Samsung Galaxy Laptop",
    "description": "High-performance laptop...",
    "sku": "LAPTOP-001",
    "price": 1299.99,
    "brand": "Samsung",
    "isActive": true
  }
]
```

**Checklist:**

- [ ] Status code es 200
- [ ] Resultados contienen el término de búsqueda en `name`, `description` o `tags`
- [ ] Respuesta es un array (no paginado)
- [ ] Respeta el parámetro `limit` si se proporciona

---

### ❌ Test 2.2: Búsqueda sin término (400 Bad Request)

**Comando curl:**

```bash
curl -X GET "$BASE_URL/products/search" | jq '.'
```

**Respuesta Esperada (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": "Search term is required",
  "error": "Bad Request"
}
```

**Checklist:**

- [ ] Status code es 400
- [ ] Requiere parámetro `q`

---

## 3️⃣ Obtener Producto por ID

### ✅ Test 3.1: Obtener producto existente

**Endpoint:** `GET /products/:id`  
**Autenticación:** No requerida (público)

**Comando curl:**

```bash
# Primero obtener un ID de producto válido
export PRODUCT_ID=$(curl -s -X GET "$BASE_URL/products?limit=1" | jq -r '.data[0].id')

# Obtener el producto
curl -X GET "$BASE_URL/products/$PRODUCT_ID" | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
{
  "id": "uuid-here",
  "name": "Product Name",
  "description": "Detailed product description",
  "sku": "PROD-001",
  "price": 99.99,
  "discountPrice": 79.99,
  "discountPercentage": 20,
  "brand": "Brand Name",
  "stockQuantity": 100,
  "images": ["image1.jpg", "image2.jpg"],
  "tags": ["electronics", "featured"],
  "weight": 1.5,
  "dimensions": {
    "length": 10,
    "width": 5,
    "height": 3
  },
  "specifications": {
    "color": "Black",
    "material": "Plastic"
  },
  "isActive": true,
  "isFeatured": false,
  "metadata": {},
  "createdAt": "2025-10-11T...",
  "updatedAt": "2025-10-11T..."
}
```

**Checklist:**

- [ ] Status code es 200
- [ ] Respuesta contiene todos los campos del producto
- [ ] ID coincide con el solicitado

---

### ❌ Test 3.2: Obtener producto inexistente (404 Not Found)

**Comando curl:**

```bash
curl -X GET "$BASE_URL/products/00000000-0000-0000-0000-000000000000" | jq '.'
```

**Respuesta Esperada (404 Not Found):**

```json
{
  "statusCode": 404,
  "message": "Product with ID 00000000-0000-0000-0000-000000000000 not found",
  "error": "Not Found"
}
```

**Checklist:**

- [ ] Status code es 404
- [ ] Mensaje indica producto no encontrado

---

### ❌ Test 3.3: Obtener producto con ID inválido (400 Bad Request)

**Comando curl:**

```bash
curl -X GET "$BASE_URL/products/invalid-id" | jq '.'
```

**Respuesta Esperada (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": "Validation failed (uuid is expected)",
  "error": "Bad Request"
}
```

**Checklist:**

- [ ] Status code es 400
- [ ] Mensaje indica UUID inválido

---

## 4️⃣ Crear Producto (Requiere Autenticación)

### ✅ Test 4.1: Crear producto exitosamente

**Endpoint:** `POST /products`  
**Autenticación:** Bearer Token (JWT) - Admin required

**Request Body:**

```json
{
  "name": "Test Product",
  "description": "This is a test product for API testing",
  "sku": "TEST-PROD-001",
  "price": 149.99,
  "discountPrice": 129.99,
  "brand": "TestBrand",
  "stockQuantity": 50,
  "images": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
  "tags": ["test", "electronics", "new"],
  "weight": 2.5,
  "dimensions": {
    "length": 15,
    "width": 10,
    "height": 5
  },
  "specifications": {
    "color": "Blue",
    "material": "Metal",
    "warranty": "2 years"
  },
  "isFeatured": false,
  "metadata": {
    "supplier": "Test Supplier Inc"
  }
}
```

**Comando curl:**

```bash
curl -X POST "$BASE_URL/products" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "description": "This is a test product for API testing",
    "sku": "TEST-PROD-001",
    "price": 149.99,
    "brand": "TestBrand",
    "stockQuantity": 50,
    "images": ["https://example.com/image1.jpg"],
    "tags": ["test", "electronics"],
    "weight": 2.5,
    "dimensions": {
      "length": 15,
      "width": 10,
      "height": 5
    }
  }' | jq '.'
```

**Respuesta Esperada (201 Created):**

```json
{
  "id": "new-uuid-here",
  "name": "Test Product",
  "description": "This is a test product for API testing",
  "sku": "TEST-PROD-001",
  "price": 149.99,
  "brand": "TestBrand",
  "isActive": true,
  "createdAt": "2025-10-11T...",
  "updatedAt": "2025-10-11T..."
}
```

**Guardar ID del producto creado:**

```bash
export PRODUCT_ID=$(curl -s -X POST "$BASE_URL/products" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "description": "Test description",
    "sku": "TEST-'$(date +%s)'",
    "price": 149.99,
    "brand": "TestBrand",
    "stockQuantity": 50
  }' | jq -r '.id')

echo "Product ID: $PRODUCT_ID"
```

**Checklist:**

- [ ] Status code es 201
- [ ] Respuesta contiene el producto creado con ID
- [ ] `isActive` es `true` por defecto
- [ ] Todos los campos enviados están presentes

---

### ❌ Test 4.2: Crear producto sin autenticación (401 Unauthorized)

**Comando curl:**

```bash
curl -X POST "$BASE_URL/products" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "sku": "TEST-001",
    "price": 149.99,
    "brand": "TestBrand"
  }' | jq '.'
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

### ❌ Test 4.3: Crear producto con SKU duplicado (409 Conflict)

**Comando curl:**

```bash
curl -X POST "$BASE_URL/products" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Duplicate SKU Product",
    "sku": "TEST-PROD-001",
    "price": 149.99,
    "brand": "TestBrand"
  }' | jq '.'
```

**Respuesta Esperada (409 Conflict):**

```json
{
  "statusCode": 409,
  "message": "Product with this SKU already exists",
  "error": "Conflict"
}
```

**Checklist:**

- [ ] Status code es 409
- [ ] Mensaje indica SKU duplicado

---

### ❌ Test 4.4: Crear producto con datos inválidos (400 Bad Request)

**Comando curl:**

```bash
# Precio negativo
curl -X POST "$BASE_URL/products" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Invalid Product",
    "sku": "INVALID-001",
    "price": -50,
    "brand": "TestBrand"
  }' | jq '.'

# Campos requeridos faltantes
curl -X POST "$BASE_URL/products" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Incomplete Product"
  }' | jq '.'
```

**Respuesta Esperada (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": ["price must be a positive number", "sku is required", "brand is required"],
  "error": "Bad Request"
}
```

**Checklist:**

- [ ] Status code es 400
- [ ] Mensaje detalla validaciones fallidas

---

## 5️⃣ Actualizar Producto

### ✅ Test 5.1: Actualizar producto exitosamente

**Endpoint:** `PATCH /products/:id`  
**Autenticación:** Bearer Token (JWT) - Admin required

**Request Body (campos parciales):**

```json
{
  "name": "Updated Product Name",
  "price": 199.99,
  "discountPrice": 179.99,
  "description": "Updated description"
}
```

**Comando curl:**

```bash
curl -X PATCH "$BASE_URL/products/$PRODUCT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Product Name",
    "price": 199.99,
    "description": "Updated description"
  }' | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
{
  "id": "uuid-here",
  "name": "Updated Product Name",
  "description": "Updated description",
  "price": 199.99,
  "updatedAt": "2025-10-11T..."
}
```

**Checklist:**

- [ ] Status code es 200
- [ ] Campos actualizados reflejan los cambios
- [ ] `updatedAt` fue actualizado
- [ ] Campos no enviados permanecen sin cambios

---

### ❌ Test 5.2: Actualizar producto inexistente (404 Not Found)

**Comando curl:**

```bash
curl -X PATCH "$BASE_URL/products/00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name"
  }' | jq '.'
```

**Respuesta Esperada (404 Not Found):**

```json
{
  "statusCode": 404,
  "message": "Product not found",
  "error": "Not Found"
}
```

**Checklist:**

- [ ] Status code es 404

---

### ❌ Test 5.3: Actualizar sin autenticación (401 Unauthorized)

**Comando curl:**

```bash
curl -X PATCH "$BASE_URL/products/$PRODUCT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Unauthorized Update"
  }' | jq '.'
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

---

## 6️⃣ Activar Producto

### ✅ Test 6.1: Activar producto desactivado

**Endpoint:** `PATCH /products/:id/activate`  
**Autenticación:** Bearer Token (JWT) - Admin required

**Comando curl:**

```bash
curl -X PATCH "$BASE_URL/products/$PRODUCT_ID/activate" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
{
  "id": "uuid-here",
  "name": "Product Name",
  "isActive": true,
  "updatedAt": "2025-10-11T..."
}
```

**Checklist:**

- [ ] Status code es 200
- [ ] `isActive` es `true`

---

## 7️⃣ Desactivar Producto

### ✅ Test 7.1: Desactivar producto activo

**Endpoint:** `PATCH /products/:id/deactivate`  
**Autenticación:** Bearer Token (JWT) - Admin required

**Comando curl:**

```bash
curl -X PATCH "$BASE_URL/products/$PRODUCT_ID/deactivate" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
{
  "id": "uuid-here",
  "name": "Product Name",
  "isActive": false,
  "updatedAt": "2025-10-11T..."
}
```

**Checklist:**

- [ ] Status code es 200
- [ ] `isActive` es `false`
- [ ] Producto sigue existiendo (soft deactivation)

---

## 8️⃣ Eliminar Producto (Soft Delete)

### ✅ Test 8.1: Eliminar producto exitosamente

**Endpoint:** `DELETE /products/:id`  
**Autenticación:** Bearer Token (JWT) - Admin required

**Comando curl:**

```bash
curl -X DELETE "$BASE_URL/products/$PRODUCT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nStatus: %{http_code}\n"
```

**Respuesta Esperada (204 No Content):**

```
(Sin body - solo status code 204)
```

**Checklist:**

- [ ] Status code es 204
- [ ] No hay contenido en la respuesta
- [ ] Producto no aparece en listados normales
- [ ] Producto puede aparecer con `includeDeleted=true`

---

### ❌ Test 8.2: Eliminar producto ya eliminado (404 Not Found)

**Comando curl:**

```bash
curl -X DELETE "$BASE_URL/products/$PRODUCT_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

**Respuesta Esperada (404 Not Found):**

```json
{
  "statusCode": 404,
  "message": "Product not found",
  "error": "Not Found"
}
```

**Checklist:**

- [ ] Status code es 404

---

## 🧪 Script de Testing Completo

```bash
#!/bin/bash
# Testing completo de Products Module

BASE_URL="http://localhost:3000"
TOKEN="your-jwt-token"

echo "=== 📦 Testing Products Module ==="
echo ""

# 1. Listar productos
echo "1️⃣ Listando productos..."
PRODUCTS=$(curl -s -X GET "$BASE_URL/products?limit=5")
TOTAL=$(echo $PRODUCTS | jq -r '.meta.totalItems')
echo "✅ Total de productos: $TOTAL"

# 2. Crear producto
echo "2️⃣ Creando producto de prueba..."
SKU="TEST-$(date +%s)"
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/products" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Product\",
    \"description\": \"Test description\",
    \"sku\": \"$SKU\",
    \"price\": 149.99,
    \"brand\": \"TestBrand\",
    \"stockQuantity\": 50
  }")

PRODUCT_ID=$(echo $CREATE_RESPONSE | jq -r '.id')

if [ "$PRODUCT_ID" != "null" ]; then
  echo "✅ Producto creado: $PRODUCT_ID"
else
  echo "❌ Error al crear producto"
  exit 1
fi

# 3. Obtener producto por ID
echo "3️⃣ Obteniendo producto por ID..."
PRODUCT=$(curl -s -X GET "$BASE_URL/products/$PRODUCT_ID")
NAME=$(echo $PRODUCT | jq -r '.name')
echo "✅ Producto obtenido: $NAME"

# 4. Buscar producto
echo "4️⃣ Buscando producto..."
SEARCH_RESULTS=$(curl -s -X GET "$BASE_URL/products/search?q=Test&limit=5")
RESULTS_COUNT=$(echo $SEARCH_RESULTS | jq '. | length')
echo "✅ Resultados de búsqueda: $RESULTS_COUNT"

# 5. Actualizar producto
echo "5️⃣ Actualizando producto..."
UPDATE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/products/$PRODUCT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Test Product",
    "price": 199.99
  }')

UPDATED_NAME=$(echo $UPDATE_RESPONSE | jq -r '.name')
echo "✅ Producto actualizado: $UPDATED_NAME"

# 6. Desactivar producto
echo "6️⃣ Desactivando producto..."
DEACTIVATE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/products/$PRODUCT_ID/deactivate" \
  -H "Authorization: Bearer $TOKEN")

IS_ACTIVE=$(echo $DEACTIVATE_RESPONSE | jq -r '.isActive')
echo "✅ Producto desactivado (isActive: $IS_ACTIVE)"

# 7. Activar producto
echo "7️⃣ Activando producto..."
ACTIVATE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/products/$PRODUCT_ID/activate" \
  -H "Authorization: Bearer $TOKEN")

IS_ACTIVE=$(echo $ACTIVATE_RESPONSE | jq -r '.isActive')
echo "✅ Producto activado (isActive: $IS_ACTIVE)"

# 8. Eliminar producto
echo "8️⃣ Eliminando producto..."
DELETE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X DELETE "$BASE_URL/products/$PRODUCT_ID" \
  -H "Authorization: Bearer $TOKEN")

if [ "$DELETE_STATUS" == "204" ]; then
  echo "✅ Producto eliminado exitosamente"
else
  echo "❌ Error al eliminar producto (Status: $DELETE_STATUS)"
fi

echo ""
echo "=== ✅ Testing completado ==="
```

---

## 📝 Notas Importantes

### Campos Requeridos para Crear Producto

- `name` (string, min: 3 chars)
- `sku` (string, único)
- `price` (number, > 0)
- `brand` (string)

### Campos Opcionales

- `description`
- `discountPrice`
- `stockQuantity` (default: 0)
- `images` (array)
- `tags` (array)
- `weight`, `dimensions`, `specifications`
- `isFeatured` (default: false)
- `metadata` (object)

### Filtros Disponibles en GET /products

- `search` - Búsqueda por nombre/descripción
- `brand` - Filtrar por marca
- `status` - active | inactive | all
- `minPrice`, `maxPrice` - Rango de precios
- `onSale` - true | false
- `tags` - Filtrar por tags (comma-separated)
- `sortBy` - name, price, createdAt, brand, sku, popularity
- `sortOrder` - ASC | DESC
- `page`, `limit` - Paginación

---

**Estado del Módulo:** ✅ Completado  
**Tests Totales:** 25+  
**Tests Críticos:** 8  
**Última Actualización:** 2025-10-11
