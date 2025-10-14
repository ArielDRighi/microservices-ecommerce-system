# 📦 API Testing - Módulo de Productos (Products)

**Módulo:** Products  
**Base URL:** `http://localhost:3000/products`  
**Descripción:** CRUD completo de productos con búsqueda, filtros, paginación, gestión de estado y control de acceso basado en roles (RBAC)

---

## 🔐 Control de Acceso (RBAC)

Este módulo implementa control de acceso basado en roles:

| Endpoint                   | Método | Acceso            | Descripción                     |
| -------------------------- | ------ | ----------------- | ------------------------------- |
| `/products`                | POST   | **🔴 ADMIN Only** | Crear productos                 |
| `/products`                | GET    | 🟢 Público        | Listar productos                |
| `/products/search`         | GET    | 🟢 Público        | Buscar productos                |
| `/products/:id`            | GET    | 🟢 Público        | Obtener producto                |
| `/products/:id`            | PATCH  | **🔴 ADMIN Only** | Actualizar producto             |
| `/products/:id/activate`   | PATCH  | **🔴 ADMIN Only** | Activar producto                |
| `/products/:id/deactivate` | PATCH  | **🔴 ADMIN Only** | Desactivar producto             |
| `/products/:id`            | DELETE | **🔴 ADMIN Only** | Eliminar producto (soft delete) |

### Roles Disponibles

- **ADMIN**: Acceso completo (crear, modificar, eliminar productos)
- **USER**: Solo lectura (ver productos y buscar)
- **Público**: Solo lectura (sin autenticación)

### 🔑 Obtener Tokens por Rol

```bash
# Token de ADMINISTRADOR (acceso completo)
export ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Admin123!@#"
  }' | jq -r '.data.accessToken')

# Token de USUARIO (solo lectura)
export USER_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com",
    "password": "User123!@#"
  }' | jq -r '.data.accessToken')

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

- [ ] 1️⃣ Crear Producto (POST /products) **[🔴 ADMIN Only]** - **EMPEZAR AQUÍ**
  - [ ] 1.1 Crear producto como ADMIN (201)
  - [ ] 1.2 Crear varios productos para pruebas
  - [ ] 1.3 USER intenta crear producto (403 Forbidden)
  - [ ] 1.4 Sin autenticación (401 Unauthorized)
  - [ ] 1.5 Validación de precio mínimo ($0.50)
- [ ] 2️⃣ Listar Productos con Paginación (GET /products) **[🟢 Público]**
- [ ] 3️⃣ Buscar Productos (GET /products/search) **[🟢 Público]**
- [ ] 4️⃣ Actualizar Producto (PATCH /products/:id) **[🔴 ADMIN Only]**
- [ ] 5️⃣ Activar Producto (PATCH /products/:id/activate) **[🔴 ADMIN Only]**
- [ ] 6️⃣ Desactivar Producto (PATCH /products/:id/deactivate) **[🔴 ADMIN Only]**
- [ ] 7️⃣ Eliminar Producto (DELETE /products/:id) **[🔴 ADMIN Only]**

**IMPORTANTE:** Comenzar con la creación de productos (Test 1) para tener datos con los que trabajar en los tests siguientes.

---

## Variables de Entorno

```bash
export BASE_URL="http://localhost:3000"
export ADMIN_TOKEN=""  # Token con rol ADMIN (para crear/modificar/eliminar)
export USER_TOKEN=""   # Token con rol USER (solo lectura)
export PRODUCT_ID=""
```

---

## 🔑 Prerequisitos

Antes de comenzar, asegúrate de tener tokens JWT para ambos roles:

```bash
# Token de ADMINISTRADOR (requerido para crear/modificar/eliminar)
export ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Admin123!@#"
  }' | jq -r '.data.accessToken')

# Token de USUARIO (solo lectura)
export USER_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com",
    "password": "User123!@#"
  }' | jq -r '.data.accessToken')

echo "Admin Token: $ADMIN_TOKEN"
echo "User Token: $USER_TOKEN"
```

---

## 1️⃣ Crear Producto **[🔴 ADMIN Only]** - **EMPEZAR AQUÍ**

**NOTA:** Solo usuarios con rol ADMIN pueden crear productos.

### ✅ Test 1.1: Crear producto exitosamente como ADMIN

**Endpoint:** `POST /products`  
**Autenticación:** Bearer Token (JWT) - **ADMIN role required**  
**Nivel de Acceso:** 🔴 ADMIN Only

**Request Body:**

```json
{
  "name": "Test Product",
  "description": "This is a test product for API testing",
  "sku": "TEST-PROD-001",
  "price": 149.99,
  "brand": "TestBrand",
  "weight": 2.5,
  "images": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
  "tags": ["test", "electronics", "new"],
  "attributes": {
    "color": "Blue",
    "material": "Metal",
    "warranty": "2 years"
  },
  "costPrice": 100.0,
  "compareAtPrice": 199.99,
  "isActive": true,
  "trackInventory": true,
  "minimumStock": 5
}
```

**⚠️ IMPORTANTE - Validación de Precio:**

- **Precio mínimo:** $0.50 USD (constante: `PRODUCT_PRICE.MIN = 0.5`)
- **Precio máximo:** $1,000,000.00 USD (constante: `PRODUCT_PRICE.MAX = 1000000`)
- Precios fuera de este rango retornarán error 400

**Comando curl:**

```bash
curl -X POST "$BASE_URL/products" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "description": "This is a test product for API testing",
    "sku": "TEST-PROD-001",
    "price": 149.99,
    "brand": "TestBrand",
    "weight": 2.5,
    "images": ["https://example.com/image1.jpg"],
    "tags": ["test", "electronics"],
    "costPrice": 100.00,
    "compareAtPrice": 199.99,
    "trackInventory": true,
    "minimumStock": 10
  }' | jq '.'
```

**Respuesta Esperada (201 Created):**

```json
{
  "statusCode": 201,
  "message": "Created successfully",
  "data": {
    "id": "new-uuid-here",
    "name": "Test Product",
    "description": "This is a test product for API testing",
    "sku": "TEST-PROD-001",
    "price": "149.99",
    "brand": "TestBrand",
    "isActive": true,
    "createdAt": "2025-10-13T...",
    "updatedAt": "2025-10-13T..."
  }
}
```

**Guardar ID del producto creado:**

```bash
export PRODUCT_ID=$(curl -s -X POST "$BASE_URL/products" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "description": "Test description",
    "sku": "TEST-'$(date +%s)'",
    "price": 149.99,
    "brand": "TestBrand"
  }' | jq -r '.data.id')

echo "Product ID: $PRODUCT_ID"
```

**Checklist:**

- [ ] Status code es 201
- [ ] Respuesta contiene el producto creado con ID
- [ ] `isActive` es `true` por defecto
- [ ] Todos los campos enviados están presentes
- [ ] Precio cumple con el mínimo de $0.50

---

### ✅ Test 1.2: Crear varios productos para pruebas (como ADMIN)

```bash
# Producto 1: Samsung Galaxy S24
curl -X POST "$BASE_URL/products" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Samsung Galaxy S24",
    "description": "Latest Samsung flagship smartphone",
    "sku": "SAMSUNG-S24-001",
    "price": 999.99,
    "brand": "Samsung",
    "tags": ["smartphone", "android", "5G"],
    "compareAtPrice": 1199.99
  }'

# Producto 2: iPhone 15 Pro
curl -X POST "$BASE_URL/products" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "iPhone 15 Pro",
    "description": "Apple flagship smartphone",
    "sku": "APPLE-IP15PRO-001",
    "price": 1099.99,
    "brand": "Apple",
    "tags": ["smartphone", "ios", "5G"]
  }'

# Producto 3: MacBook Pro 14
curl -X POST "$BASE_URL/products" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MacBook Pro 14",
    "description": "Professional laptop with M3 chip",
    "sku": "APPLE-MBP14-001",
    "price": 1999.99,
    "brand": "Apple",
    "tags": ["laptop", "macOS", "professional"]
  }'

# Producto 4: Dell XPS 15
curl -X POST "$BASE_URL/products" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dell XPS 15",
    "description": "High-performance Windows laptop",
    "sku": "DELL-XPS15-001",
    "price": 1499.99,
    "brand": "Dell",
    "tags": ["laptop", "windows", "professional"]
  }'

# Producto 5: Sony WH-1000XM5
curl -X POST "$BASE_URL/products" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sony WH-1000XM5",
    "description": "Premium noise-cancelling headphones",
    "sku": "SONY-WH1000XM5-001",
    "price": 399.99,
    "brand": "Sony",
    "tags": ["headphones", "audio", "wireless"],
    "costPrice": 200.00,
    "compareAtPrice": 449.99
  }'
```

**Checklist:**

- [ ] Todos los productos creados exitosamente
- [ ] Cada producto tiene un ID único
- [ ] SKUs son únicos

---

### ❌ Test 1.3: USER sin rol ADMIN intenta crear producto (403 Forbidden)

**Endpoint:** `POST /products`  
**Autenticación:** Bearer Token (USER role) - **Insufficient permissions**  
**Status Code esperado:** `403 Forbidden`

**Comando curl:**

```bash
curl -X POST "$BASE_URL/products" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Unauthorized Product",
    "description": "This should fail",
    "sku": "UNAUTH-001",
    "price": 99.99,
    "brand": "TestBrand"
  }' | jq '.'
```

**Respuesta Esperada (403 Forbidden):**

```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

**Checklist:**

- [ ] Status code es 403 (no 401)
- [ ] Mensaje indica recurso prohibido
- [ ] Producto NO fue creado en la base de datos

**💡 Nota:** Error 403 significa que el usuario está autenticado pero no tiene permisos suficientes (rol USER en vez de ADMIN).

---

### ❌ Test 1.4: Crear producto sin autenticación (401 Unauthorized)

**Endpoint:** `POST /products`  
**Autenticación:** None  
**Status Code esperado:** `401 Unauthorized`

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
- [ ] Diferencia entre 401 (sin token) y 403 (sin permisos)

---

### ❌ Test 1.5: Validación de precio mínimo (400 Bad Request)

**Endpoint:** `POST /products`  
**Autenticación:** Bearer Token (ADMIN)  
**Status Code esperado:** `400 Bad Request`

**⚠️ Precio Mínimo: $0.50 USD** (constante: `PRODUCT_PRICE.MIN = 0.5`)

**Comando curl:**

```bash
# Precio por debajo del mínimo ($0.50)
curl -X POST "$BASE_URL/products" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Too Cheap Product",
    "sku": "CHEAP-001",
    "price": 0.25,
    "brand": "TestBrand",
    "description": "Price below minimum"
  }' | jq '.'

# Precio de $0.01 (anterior mínimo, ahora inválido)
curl -X POST "$BASE_URL/products" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "One Cent Product",
    "sku": "CENT-001",
    "price": 0.01,
    "brand": "TestBrand",
    "description": "Old minimum, now invalid"
  }' | jq '.'

# Precio exactamente $0.50 (válido, límite inferior)
curl -X POST "$BASE_URL/products" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Minimum Price Product",
    "sku": "MIN-PRICE-001",
    "price": 0.50,
    "brand": "TestBrand",
    "description": "Exactly at minimum"
  }' | jq '.'
```

**Respuesta Esperada para precio < $0.50 (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": ["price must not be less than 0.5"],
  "error": "Bad Request"
}
```

**Respuesta Esperada para precio = $0.50 (201 Created):**

```json
{
  "statusCode": 201,
  "message": "Created successfully",
  "data": {
    "id": "uuid-here",
    "name": "Minimum Price Product",
    "price": "0.50",
    ...
  }
}
```

**Checklist:**

- [ ] Precio < $0.50 retorna 400
- [ ] Precio = $0.50 es aceptado (201)
- [ ] Precio > $0.50 es aceptado
- [ ] Mensaje de error especifica el mínimo de 0.5
- [ ] Constante PRODUCT_PRICE.MIN documentada

**💡 Nota:** El precio mínimo fue actualizado de $0.01 a $0.50 por políticas de negocio. Ver `src/modules/products/constants/product-validation.constants.ts`

---

### ❌ Test 1.6: Crear producto con SKU duplicado (409 Conflict)

**Comando curl:**

```bash
curl -X POST "$BASE_URL/products" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
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

### ❌ Test 1.7: Crear producto con datos inválidos (400 Bad Request)

**Comando curl:**

```bash
# Precio negativo
curl -X POST "$BASE_URL/products" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Invalid Product",
    "sku": "INVALID-001",
    "price": -50,
    "brand": "TestBrand"
  }' | jq '.'

# Campos requeridos faltantes
curl -X POST "$BASE_URL/products" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Incomplete Product"
  }' | jq '.'

# SKU con formato inválido (debe ser uppercase y solo A-Z, 0-9, -, _)
curl -X POST "$BASE_URL/products" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Invalid SKU Product",
    "sku": "test-invalid-sku",
    "price": 99.99,
    "brand": "TestBrand"
  }' | jq '.'
```

**Respuesta Esperada (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": ["price must be a positive number", "sku is required"],
  "error": "Bad Request"
}
```

**Checklist:**

- [ ] Status code es 400
- [ ] Mensaje detalla validaciones fallidas
- [ ] SKU debe ser uppercase y formato válido

---

## 2️⃣ Listar Productos con Paginación y Filtros

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

## 4️⃣ Actualizar Producto **[🔴 ADMIN Only]**

### ✅ Test 5.1: Actualizar producto exitosamente como ADMIN

**Endpoint:** `PATCH /products/:id`  
**Autenticación:** Bearer Token (JWT) - **ADMIN role required**  
**Nivel de Acceso:** 🔴 ADMIN Only

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
  -H "Authorization: Bearer $ADMIN_TOKEN" \
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

### ❌ Test 5.2: USER sin rol ADMIN intenta actualizar producto (403 Forbidden)

**Endpoint:** `PATCH /products/:id`  
**Autenticación:** Bearer Token (USER role) - **Insufficient permissions**  
**Status Code esperado:** `403 Forbidden`

**Comando curl:**

```bash
curl -X PATCH "$BASE_URL/products/$PRODUCT_ID" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Unauthorized Update",
    "price": 999.99
  }' | jq '.'
```

**Respuesta Esperada (403 Forbidden):**

```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

**Checklist:**

- [ ] Status code es 403 (no 401)
- [ ] Producto NO fue actualizado
- [ ] Usuario autenticado pero sin permisos

---

### ❌ Test 5.3: Actualizar producto inexistente (404 Not Found)

**Comando curl:**

```bash
curl -X PATCH "$BASE_URL/products/00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
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

### ❌ Test 5.4: Actualizar sin autenticación (401 Unauthorized)

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

## 5️⃣ Activar Producto **[🔴 ADMIN Only]**

### ✅ Test 6.1: Activar producto desactivado como ADMIN

**Endpoint:** `PATCH /products/:id/activate`  
**Autenticación:** Bearer Token (JWT) - **ADMIN role required**  
**Nivel de Acceso:** 🔴 ADMIN Only

**Comando curl:**

```bash
curl -X PATCH "$BASE_URL/products/$PRODUCT_ID/activate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
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

### ❌ Test 6.2: USER intenta activar producto (403 Forbidden)

**Comando curl:**

```bash
curl -X PATCH "$BASE_URL/products/$PRODUCT_ID/activate" \
  -H "Authorization: Bearer $USER_TOKEN" | jq '.'
```

**Respuesta Esperada (403 Forbidden):**

```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

**Checklist:**

- [ ] Status code es 403
- [ ] Producto NO fue activado

---

## 6️⃣ Desactivar Producto **[🔴 ADMIN Only]**

### ✅ Test 7.1: Desactivar producto activo como ADMIN

**Endpoint:** `PATCH /products/:id/deactivate`  
**Autenticación:** Bearer Token (JWT) - **ADMIN role required**  
**Nivel de Acceso:** 🔴 ADMIN Only

**Comando curl:**

```bash
curl -X PATCH "$BASE_URL/products/$PRODUCT_ID/deactivate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
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

### ❌ Test 7.2: USER intenta desactivar producto (403 Forbidden)

**Comando curl:**

```bash
curl -X PATCH "$BASE_URL/products/$PRODUCT_ID/deactivate" \
  -H "Authorization: Bearer $USER_TOKEN" | jq '.'
```

**Respuesta Esperada (403 Forbidden):**

```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

**Checklist:**

- [ ] Status code es 403
- [ ] Producto NO fue desactivado

---

## 7️⃣ Eliminar Producto (Soft Delete) **[🔴 ADMIN Only]**

### ✅ Test 8.1: Eliminar producto exitosamente como ADMIN

**Endpoint:** `DELETE /products/:id`  
**Autenticación:** Bearer Token (JWT) - **ADMIN role required**  
**Nivel de Acceso:** 🔴 ADMIN Only

**Comando curl:**

```bash
curl -X DELETE "$BASE_URL/products/$PRODUCT_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
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

### ❌ Test 8.2: USER intenta eliminar producto (403 Forbidden)

**Comando curl:**

```bash
curl -X DELETE "$BASE_URL/products/$PRODUCT_ID" \
  -H "Authorization: Bearer $USER_TOKEN" | jq '.'
```

**Respuesta Esperada (403 Forbidden):**

```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

**Checklist:**

- [ ] Status code es 403
- [ ] Producto NO fue eliminado

---

### ❌ Test 8.3: Eliminar producto ya eliminado (404 Not Found)

**Comando curl:**

```bash
curl -X DELETE "$BASE_URL/products/$PRODUCT_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
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
ADMIN_TOKEN="your-admin-jwt-token"
USER_TOKEN="your-user-jwt-token"

echo "=== 📦 Testing Products Module ==="
echo ""

# Obtener tokens
echo "0️⃣ Obteniendo tokens de autenticación..."
ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Admin123!@#"
  }' | jq -r '.data.accessToken')

USER_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com",
    "password": "User123!@#"
  }' | jq -r '.data.accessToken')

echo "✅ Tokens obtenidos"
echo ""

# 1. Listar productos
echo "1️⃣ Listando productos..."
PRODUCTS=$(curl -s -X GET "$BASE_URL/products?limit=5")
TOTAL=$(echo $PRODUCTS | jq -r '.meta.totalItems')
echo "✅ Total de productos: $TOTAL"

# 2. Crear producto como ADMIN
echo "2️⃣ Creando producto de prueba como ADMIN..."
SKU="TEST-$(date +%s)"
CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/products" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Product\",
    \"description\": \"Test description\",
    \"sku\": \"$SKU\",
    \"price\": 149.99,
    \"brand\": \"TestBrand\"
  }")

PRODUCT_ID=$(echo $CREATE_RESPONSE | jq -r '.data.id')

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

# 5. Actualizar producto como ADMIN
echo "5️⃣ Actualizando producto como ADMIN..."
UPDATE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/products/$PRODUCT_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Test Product",
    "price": 199.99
  }')

UPDATED_NAME=$(echo $UPDATE_RESPONSE | jq -r '.name')
echo "✅ Producto actualizado: $UPDATED_NAME"

# 6. Test de autorización - USER intenta actualizar (debe fallar)
echo "6️⃣ Probando autorización - USER intenta actualizar..."
USER_UPDATE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X PATCH "$BASE_URL/products/$PRODUCT_ID" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"price": 999.99}')

if [ "$USER_UPDATE" == "403" ]; then
  echo "✅ Autorización correcta - USER recibió 403 Forbidden"
else
  echo "❌ Error de autorización - Expected 403, got $USER_UPDATE"
fi

# 7. Desactivar producto como ADMIN
echo "7️⃣ Desactivando producto como ADMIN..."
DEACTIVATE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/products/$PRODUCT_ID/deactivate" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

IS_ACTIVE=$(echo $DEACTIVATE_RESPONSE | jq -r '.isActive')
echo "✅ Producto desactivado (isActive: $IS_ACTIVE)"

# 8. Activar producto como ADMIN
echo "8️⃣ Activando producto como ADMIN..."
ACTIVATE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/products/$PRODUCT_ID/activate" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

IS_ACTIVE=$(echo $ACTIVATE_RESPONSE | jq -r '.isActive')
echo "✅ Producto activado (isActive: $IS_ACTIVE)"

# 9. Eliminar producto como ADMIN
echo "9️⃣ Eliminando producto como ADMIN..."
DELETE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X DELETE "$BASE_URL/products/$PRODUCT_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

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

### Control de Acceso (RBAC)

- **Operaciones ADMIN Only**: Crear, Actualizar, Activar, Desactivar, Eliminar
- **Operaciones Públicas**: Listar, Buscar, Obtener por ID
- **403 Forbidden**: Usuario autenticado sin rol ADMIN
- **401 Unauthorized**: Sin autenticación

### Campos Requeridos para Crear Producto

- `name` (string, min: 2 chars, max: 255 chars)
- `sku` (string, único, min: 3 chars, max: 100 chars, uppercase, formato: `[A-Z0-9\-_]+`)
- `price` (number, **min: 0.50**, max: 1000000.00, 2 decimales)
  - **⚠️ Precio mínimo actualizado de $0.01 a $0.50**
  - Ver constante: `PRODUCT_PRICE.MIN = 0.5` en `src/modules/products/constants/product-validation.constants.ts`

### Campos Opcionales

- `description` (string, max: 2000 chars)
- `brand` (string, max: 50 chars)
- `weight` (number, max: 999.999 kg, 3 decimales)
- `attributes` (object - cualquier metadato del producto)
- `images` (array de URLs, max: 10 items)
- `tags` (array de strings, max: 20 items, se convierten a lowercase)
- `costPrice` (number, >= 0, max: 1000000.00, 2 decimales)
- `compareAtPrice` (number, **min: 0.50**, max: 1000000.00, 2 decimales)
- `isActive` (boolean, default: true)
- `trackInventory` (boolean, default: true)
- `minimumStock` (number, >= 0, max: 999999)

**NOTA:** Para gestionar el stock real del producto, se debe usar el módulo de Inventario

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

### Constantes de Validación

Definidas en `src/modules/products/constants/product-validation.constants.ts`:

```typescript
export const PRODUCT_PRICE = {
  MIN: 0.5, // Precio mínimo: $0.50
  MAX: 1000000, // Precio máximo: $1,000,000.00
} as const;
```

---

**Estado del Módulo:** ✅ Completado  
**Tests Totales:** 35+  
**Tests Críticos:** 12  
**RBAC:** ✅ Sistema de roles implementado  
**Seguridad:** ✅ Protección de endpoints administrativos  
**Validaciones:** ✅ Precio mínimo $0.50  
**Última Actualización:** 2025-10-14
