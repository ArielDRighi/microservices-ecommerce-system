# 🏷️ API Testing - Módulo de Categorías (Categories)

**Módulo:** Categories  
**Base URL:** `http://localhost:3000/categories`  
**Descripción:** Gestión jerárquica de categorías con árbol, slugs y relaciones parent-child

---

## 📋 Índice de Tests

- [ ] ✅ 1. Crear Categoría Raíz (POST /categories) [Auth Required - ADMIN]
- [ ] ✅ 2. Crear Sub-categoría (POST /categories) [Auth Required - ADMIN]
- [ ] ✅ 3. Listar Categorías con Paginación (GET /categories)
- [ ] ✅ 4. Obtener Árbol de Categorías (GET /categories/tree)
- [ ] ✅ 5. Buscar por Slug (GET /categories/slug/:slug)
- [ ] ✅ 6. Obtener por ID (GET /categories/:id)
- [ ] ✅ 7. Obtener Descendientes (GET /categories/:id/descendants)
- [ ] ✅ 8. Obtener Path Completo (GET /categories/:id/path)
- [ ] ✅ 9. Actualizar Categoría (PUT /categories/:id) [Auth Required - ADMIN]
- [ ] ✅ 10. Activar Categoría (PATCH /categories/:id/activate) [Auth Required - ADMIN]
- [ ] ✅ 11. Desactivar Categoría (PATCH /categories/:id/deactivate) [Auth Required - ADMIN]
- [ ] ✅ 12. Eliminar Categoría (DELETE /categories/:id) [Auth Required - ADMIN]

---

## Variables de Entorno

```bash
export BASE_URL="http://localhost:3000"
export ADMIN_TOKEN="admin-jwt-token-here"
export CATEGORY_ID=""
export PARENT_CATEGORY_ID=""
export CHILD_CATEGORY_ID=""
```

---

## ⚠️ Importante: Estructura Jerárquica

Las categorías soportan **estructura de árbol ilimitada**:

- 📁 **Root Categories** - Categorías principales sin parent
- 📂 **Sub-categories** - Categorías hijas con `parentId`
- 🌲 **Tree Structure** - Árbol completo con recursión
- 🔗 **Path** - Breadcrumb desde root hasta la categoría
- 👶 **Descendants** - Todos los hijos recursivamente

**Ejemplos:**

```
Electronics (root)
├── Computers
│   ├── Laptops
│   │   ├── Gaming Laptops
│   │   └── Business Laptops
│   └── Desktops
└── Mobile Devices
    ├── Smartphones
    └── Tablets
```

---

## 1️⃣ Crear Categoría Raíz

### ✅ Test 1.1: Crear categoría raíz exitosamente

**Endpoint:** `POST /categories`  
**Autenticación:** Bearer Token (JWT) - Required (ADMIN)  
**Status Code:** `201 Created`

**Request Body:**

```json
{
  "name": "Electronics",
  "description": "Electronic products and gadgets",
  "slug": "electronics",
  "sortOrder": 10,
  "metadata": {
    "color": "#FF5722",
    "icon": "electronics-icon",
    "seoKeywords": ["electronics", "gadgets", "technology"]
  }
}
```

**Comando curl:**

```bash
curl -X POST "$BASE_URL/categories" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Electronics",
    "description": "Electronic products and gadgets",
    "slug": "electronics",
    "sortOrder": 10,
    "metadata": {
      "color": "#FF5722",
      "icon": "electronics-icon"
    }
  }' | jq '.'
```

**Respuesta Esperada (201 Created):**

```json
{
  "id": "category-uuid-here",
  "name": "Electronics",
  "description": "Electronic products and gadgets",
  "slug": "electronics",
  "parentId": null,
  "sortOrder": 10,
  "isActive": true,
  "metadata": {
    "color": "#FF5722",
    "icon": "electronics-icon"
  },
  "createdAt": "2025-10-11T10:30:00.000Z",
  "updatedAt": "2025-10-11T10:30:00.000Z"
}
```

**Guardar Category ID:**

```bash
export PARENT_CATEGORY_ID=$(curl -s -X POST "$BASE_URL/categories" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Parent Category",
    "description": "Category for testing",
    "slug": "test-parent"
  }' | jq -r '.id')

echo "Parent Category ID: $PARENT_CATEGORY_ID"
```

**Checklist:**

- [ ] Status code es 201
- [ ] `slug` está en lowercase
- [ ] `parentId` es `null` (categoría raíz)
- [ ] `isActive` por defecto es `true`
- [ ] `sortOrder` por defecto es 0 si no se especifica
- [ ] `metadata` se guarda como JSON

---

### ✅ Test 1.2: Crear categoría sin slug (auto-generado)

**Comando curl:**

```bash
curl -X POST "$BASE_URL/categories" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mobile Devices",
    "description": "Smartphones and tablets"
  }' | jq '.'
```

**Respuesta Esperada:**

```json
{
  "id": "category-uuid-here",
  "name": "Mobile Devices",
  "slug": "mobile-devices",
  "description": "Smartphones and tablets",
  ...
}
```

**Checklist:**

- [ ] Status code es 201
- [ ] `slug` generado automáticamente desde `name`
- [ ] Slug es lowercase con guiones: "mobile-devices"

---

## 2️⃣ Crear Sub-categoría

### ✅ Test 2.1: Crear sub-categoría exitosamente

**Endpoint:** `POST /categories`  
**Request Body:** Incluir `parentId`

**Comando curl:**

```bash
curl -X POST "$BASE_URL/categories" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Laptops\",
    \"description\": \"Portable computers\",
    \"parentId\": \"$PARENT_CATEGORY_ID\",
    \"sortOrder\": 5
  }" | jq '.'
```

**Respuesta Esperada (201 Created):**

```json
{
  "id": "child-category-uuid",
  "name": "Laptops",
  "description": "Portable computers",
  "slug": "laptops",
  "parentId": "parent-category-uuid",
  "sortOrder": 5,
  "isActive": true,
  "createdAt": "2025-10-11T10:35:00.000Z",
  "updatedAt": "2025-10-11T10:35:00.000Z"
}
```

**Guardar Child Category ID:**

```bash
export CHILD_CATEGORY_ID=$(curl -s -X POST "$BASE_URL/categories" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Gaming Laptops\",
    \"parentId\": \"$PARENT_CATEGORY_ID\"
  }" | jq -r '.id')

echo "Child Category ID: $CHILD_CATEGORY_ID"
```

**Checklist:**

- [ ] Status code es 201
- [ ] `parentId` coincide con la categoría padre
- [ ] Relación jerárquica establecida

---

### ❌ Test 2.2: Crear categoría con parent inexistente (400 Bad Request)

**Comando curl:**

```bash
curl -X POST "$BASE_URL/categories" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Invalid Child",
    "parentId": "00000000-0000-0000-0000-000000000000"
  }' | jq '.'
```

**Respuesta Esperada (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": "Parent category not found",
  "error": "Bad Request"
}
```

**Checklist:**

- [ ] Status code es 400
- [ ] Valida existencia de parent

---

### ❌ Test 2.3: Crear categoría con slug duplicado (409 Conflict)

**Comando curl:**

```bash
curl -X POST "$BASE_URL/categories" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Duplicate Category",
    "slug": "electronics"
  }' | jq '.'
```

**Respuesta Esperada (409 Conflict):**

```json
{
  "statusCode": 409,
  "message": "Category with this slug already exists",
  "error": "Conflict"
}
```

**Checklist:**

- [ ] Status code es 409
- [ ] Slug debe ser único

---

### ❌ Test 2.4: Crear categoría con slug inválido (400 Bad Request)

**Comando curl:**

```bash
curl -X POST "$BASE_URL/categories" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Invalid Slug",
    "slug": "Invalid_Slug!"
  }' | jq '.'
```

**Respuesta Esperada (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": ["Slug must contain only lowercase letters, numbers, and hyphens"],
  "error": "Bad Request"
}
```

**Checklist:**

- [ ] Status code es 400
- [ ] Slug solo permite: lowercase, números, guiones
- [ ] Regex: `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`

---

### ❌ Test 2.5: Crear categoría sin autenticación (401 Unauthorized)

**Comando curl:**

```bash
curl -X POST "$BASE_URL/categories" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Unauthorized Category"
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
- [ ] Solo ADMIN puede crear categorías

---

## 3️⃣ Listar Categorías con Paginación

### ✅ Test 3.1: Listar todas las categorías

**Endpoint:** `GET /categories`  
**Query Params:** `?page=1&limit=10`

**Comando curl:**

```bash
curl -X GET "$BASE_URL/categories?page=1&limit=10" | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
{
  "data": [
    {
      "id": "category-1",
      "name": "Electronics",
      "slug": "electronics",
      "description": "Electronic products",
      "parentId": null,
      "sortOrder": 10,
      "isActive": true,
      "createdAt": "2025-10-10T10:00:00.000Z"
    },
    {
      "id": "category-2",
      "name": "Laptops",
      "slug": "laptops",
      "parentId": "category-1",
      "sortOrder": 5,
      "isActive": true,
      "createdAt": "2025-10-10T11:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

**Checklist:**

- [ ] Status code es 200
- [ ] Respuesta paginada con `data` y `meta`
- [ ] Endpoint público (no requiere auth)

---

### ✅ Test 3.2: Filtrar categorías activas

**Query Params:** `?isActive=true`

**Comando curl:**

```bash
curl -X GET "$BASE_URL/categories?isActive=true" | jq '.'
```

**Checklist:**

- [ ] Status code es 200
- [ ] Todas las categorías tienen `isActive: true`

---

### ✅ Test 3.3: Filtrar por parent ID (obtener hijos directos)

**Query Params:** `?parentId={uuid}`

**Comando curl:**

```bash
curl -X GET "$BASE_URL/categories?parentId=$PARENT_CATEGORY_ID" | jq '.'
```

**Checklist:**

- [ ] Status code es 200
- [ ] Solo retorna hijos directos del parent especificado

---

### ✅ Test 3.4: Obtener solo categorías raíz

**Query Params:** `?parentId=null`

**Comando curl:**

```bash
curl -X GET "$BASE_URL/categories?parentId=null" | jq '.'
```

**Checklist:**

- [ ] Status code es 200
- [ ] Todas las categorías tienen `parentId: null`

---

## 4️⃣ Obtener Árbol de Categorías

### ✅ Test 4.1: Obtener árbol completo de categorías

**Endpoint:** `GET /categories/tree`  
**Descripción:** Retorna estructura jerárquica completa

**Comando curl:**

```bash
curl -X GET "$BASE_URL/categories/tree" | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
[
  {
    "id": "electronics-uuid",
    "name": "Electronics",
    "slug": "electronics",
    "parentId": null,
    "sortOrder": 10,
    "isActive": true,
    "children": [
      {
        "id": "computers-uuid",
        "name": "Computers",
        "slug": "computers",
        "parentId": "electronics-uuid",
        "sortOrder": 5,
        "isActive": true,
        "children": [
          {
            "id": "laptops-uuid",
            "name": "Laptops",
            "slug": "laptops",
            "parentId": "computers-uuid",
            "sortOrder": 1,
            "isActive": true,
            "children": []
          }
        ]
      },
      {
        "id": "mobile-uuid",
        "name": "Mobile Devices",
        "slug": "mobile-devices",
        "parentId": "electronics-uuid",
        "sortOrder": 10,
        "isActive": true,
        "children": []
      }
    ]
  }
]
```

**Checklist:**

- [ ] Status code es 200
- [ ] Estructura recursiva con `children` array
- [ ] Solo categorías raíz en el nivel superior
- [ ] Ordenado por `sortOrder`
- [ ] Por defecto solo incluye categorías activas

---

### ✅ Test 4.2: Obtener árbol incluyendo inactivas

**Query Params:** `?includeInactive=true`

**Comando curl:**

```bash
curl -X GET "$BASE_URL/categories/tree?includeInactive=true" | jq '.'
```

**Checklist:**

- [ ] Status code es 200
- [ ] Incluye categorías con `isActive: false`

---

## 5️⃣ Buscar por Slug

### ✅ Test 5.1: Buscar categoría por slug

**Endpoint:** `GET /categories/slug/:slug`

**Comando curl:**

```bash
curl -X GET "$BASE_URL/categories/slug/electronics" | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
{
  "id": "electronics-uuid",
  "name": "Electronics",
  "slug": "electronics",
  "description": "Electronic products and gadgets",
  "parentId": null,
  "sortOrder": 10,
  "isActive": true,
  "metadata": {
    "color": "#FF5722"
  },
  "createdAt": "2025-10-10T10:00:00.000Z",
  "updatedAt": "2025-10-10T10:00:00.000Z"
}
```

**Checklist:**

- [ ] Status code es 200
- [ ] Búsqueda SEO-friendly por slug

---

### ❌ Test 5.2: Buscar slug inexistente (404 Not Found)

**Comando curl:**

```bash
curl -X GET "$BASE_URL/categories/slug/nonexistent" | jq '.'
```

**Respuesta Esperada (404 Not Found):**

```json
{
  "statusCode": 404,
  "message": "Category with slug 'nonexistent' not found",
  "error": "Not Found"
}
```

**Checklist:**

- [ ] Status code es 404

---

## 6️⃣ Obtener por ID

### ✅ Test 6.1: Obtener categoría por ID

**Endpoint:** `GET /categories/:id`

**Comando curl:**

```bash
curl -X GET "$BASE_URL/categories/$PARENT_CATEGORY_ID" | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
{
  "id": "category-uuid",
  "name": "Electronics",
  "slug": "electronics",
  "description": "Electronic products",
  "parentId": null,
  "sortOrder": 10,
  "isActive": true,
  "metadata": {},
  "createdAt": "2025-10-10T10:00:00.000Z",
  "updatedAt": "2025-10-10T10:00:00.000Z"
}
```

**Checklist:**

- [ ] Status code es 200
- [ ] Retorna categoría específica

---

### ❌ Test 6.2: Obtener categoría inexistente (404 Not Found)

**Comando curl:**

```bash
curl -X GET "$BASE_URL/categories/00000000-0000-0000-0000-000000000000" | jq '.'
```

**Respuesta Esperada (404 Not Found):**

```json
{
  "statusCode": 404,
  "message": "Category not found",
  "error": "Not Found"
}
```

**Checklist:**

- [ ] Status code es 404

---

## 7️⃣ Obtener Descendientes

### ✅ Test 7.1: Obtener todos los descendientes

**Endpoint:** `GET /categories/:id/descendants`  
**Descripción:** Retorna todos los hijos, nietos, bisnietos, etc. (recursivo)

**Comando curl:**

```bash
curl -X GET "$BASE_URL/categories/$PARENT_CATEGORY_ID/descendants" | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
[
  {
    "id": "computers-uuid",
    "name": "Computers",
    "parentId": "electronics-uuid",
    "depth": 1
  },
  {
    "id": "laptops-uuid",
    "name": "Laptops",
    "parentId": "computers-uuid",
    "depth": 2
  },
  {
    "id": "gaming-laptops-uuid",
    "name": "Gaming Laptops",
    "parentId": "laptops-uuid",
    "depth": 3
  }
]
```

**Checklist:**

- [ ] Status code es 200
- [ ] Retorna todos los niveles descendientes
- [ ] Array plano (no estructura de árbol)

---

### ✅ Test 7.2: Limitar profundidad de descendientes

**Query Params:** `?maxDepth=2`

**Comando curl:**

```bash
curl -X GET "$BASE_URL/categories/$PARENT_CATEGORY_ID/descendants?maxDepth=2" | jq '.'
```

**Checklist:**

- [ ] Status code es 200
- [ ] Solo retorna hasta el nivel especificado

---

## 8️⃣ Obtener Path Completo

### ✅ Test 8.1: Obtener breadcrumb path

**Endpoint:** `GET /categories/:id/path`  
**Descripción:** Retorna el camino completo desde root hasta la categoría

**Comando curl:**

```bash
curl -X GET "$BASE_URL/categories/$CHILD_CATEGORY_ID/path" | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
["Electronics", "Computers", "Laptops", "Gaming Laptops"]
```

**Checklist:**

- [ ] Status code es 200
- [ ] Array de strings (nombres de categorías)
- [ ] Ordenado desde root hasta la categoría actual
- [ ] Útil para breadcrumbs en UI

---

## 9️⃣ Actualizar Categoría

### ✅ Test 9.1: Actualizar información básica

**Endpoint:** `PUT /categories/:id`  
**Autenticación:** Bearer Token (JWT) - Required (ADMIN)

**Request Body:**

```json
{
  "name": "Consumer Electronics",
  "description": "Updated description",
  "sortOrder": 15
}
```

**Comando curl:**

```bash
curl -X PUT "$BASE_URL/categories/$PARENT_CATEGORY_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Consumer Electronics",
    "description": "Updated description for consumer electronics",
    "sortOrder": 15
  }' | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
{
  "id": "category-uuid",
  "name": "Consumer Electronics",
  "slug": "electronics",
  "description": "Updated description for consumer electronics",
  "sortOrder": 15,
  "isActive": true,
  "updatedAt": "2025-10-11T10:45:00.000Z",
  ...
}
```

**Checklist:**

- [ ] Status code es 200
- [ ] Campos actualizados
- [ ] `updatedAt` cambió

---

### ✅ Test 9.2: Mover categoría a otro parent

**Request Body:**

```json
{
  "parentId": "new-parent-uuid"
}
```

**Comando curl:**

```bash
# Crear nuevo parent primero
NEW_PARENT_ID=$(curl -s -X POST "$BASE_URL/categories" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Parent"}' | jq -r '.id')

# Mover categoría
curl -X PUT "$BASE_URL/categories/$CHILD_CATEGORY_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"parentId\": \"$NEW_PARENT_ID\"
  }" | jq '.'
```

**Checklist:**

- [ ] Status code es 200
- [ ] `parentId` actualizado
- [ ] Jerarquía reorganizada

---

### ❌ Test 9.3: Crear jerarquía circular (400 Bad Request)

**Escenario:** Intentar mover un parent como hijo de su propio descendiente

**Comando curl:**

```bash
# Intentar hacer que el parent sea hijo de su propio child
curl -X PUT "$BASE_URL/categories/$PARENT_CATEGORY_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"parentId\": \"$CHILD_CATEGORY_ID\"
  }" | jq '.'
```

**Respuesta Esperada (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": "Circular hierarchy detected",
  "error": "Bad Request"
}
```

**Checklist:**

- [ ] Status code es 400
- [ ] Previene ciclos en la jerarquía

---

## 🔟 Activar/Desactivar Categoría

### ✅ Test 10.1: Desactivar categoría

**Endpoint:** `PATCH /categories/:id/deactivate`  
**Autenticación:** Bearer Token (JWT) - Required (ADMIN)

**Comando curl:**

```bash
curl -X PATCH "$BASE_URL/categories/$PARENT_CATEGORY_ID/deactivate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
{
  "id": "category-uuid",
  "name": "Electronics",
  "isActive": false,
  "updatedAt": "2025-10-11T10:50:00.000Z",
  ...
}
```

**Checklist:**

- [ ] Status code es 200
- [ ] `isActive` es `false`
- [ ] Categoría no aparece en listados por defecto

---

### ✅ Test 10.2: Activar categoría

**Endpoint:** `PATCH /categories/:id/activate`

**Comando curl:**

```bash
curl -X PATCH "$BASE_URL/categories/$PARENT_CATEGORY_ID/activate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
{
  "id": "category-uuid",
  "name": "Electronics",
  "isActive": true,
  "updatedAt": "2025-10-11T10:51:00.000Z",
  ...
}
```

**Checklist:**

- [ ] Status code es 200
- [ ] `isActive` es `true`

---

## 1️⃣1️⃣ Eliminar Categoría

### ✅ Test 11.1: Eliminar categoría sin hijos ni productos

**Endpoint:** `DELETE /categories/:id`  
**Autenticación:** Bearer Token (JWT) - Required (ADMIN)  
**Status Code:** `204 No Content`

**Comando curl:**

```bash
# Crear categoría temporal para eliminar
TEMP_CATEGORY_ID=$(curl -s -X POST "$BASE_URL/categories" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Temp Category"}' | jq -r '.id')

# Eliminar
curl -X DELETE "$BASE_URL/categories/$TEMP_CATEGORY_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -v
```

**Respuesta Esperada (204 No Content):**

```
(Sin body, solo status code 204)
```

**Checklist:**

- [ ] Status code es 204
- [ ] Soft delete (marca como inactiva)
- [ ] Categoría eliminada no aparece en listados

---

### ❌ Test 11.2: Eliminar categoría con hijos (400 Bad Request)

**Comando curl:**

```bash
# Intentar eliminar parent que tiene children
curl -X DELETE "$BASE_URL/categories/$PARENT_CATEGORY_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
```

**Respuesta Esperada (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": "Cannot delete category with children or products",
  "error": "Bad Request"
}
```

**Checklist:**

- [ ] Status code es 400
- [ ] Previene eliminar categorías con hijos
- [ ] Previene eliminar categorías con productos asociados

---

## 🧪 Script de Testing Completo

```bash
#!/bin/bash
# Testing completo de Categories Module

BASE_URL="http://localhost:3000"
ADMIN_TOKEN="your-admin-jwt-token"

echo "=== 🏷️ Testing Categories Module ==="
echo ""

# 1. Crear categoría raíz
echo "1️⃣ Creando categoría raíz..."
ROOT_CATEGORY=$(curl -s -X POST "$BASE_URL/categories" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Electronics",
    "description": "Electronic products for testing",
    "slug": "test-electronics",
    "sortOrder": 10
  }')

ROOT_ID=$(echo $ROOT_CATEGORY | jq -r '.id')
echo "✅ Categoría raíz creada: $ROOT_ID"

# 2. Crear sub-categoría
echo "2️⃣ Creando sub-categoría..."
SUB_CATEGORY=$(curl -s -X POST "$BASE_URL/categories" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Laptops\",
    \"description\": \"Laptop computers\",
    \"parentId\": \"$ROOT_ID\",
    \"sortOrder\": 5
  }")

SUB_ID=$(echo $SUB_CATEGORY | jq -r '.id')
echo "✅ Sub-categoría creada: $SUB_ID"

# 3. Crear sub-sub-categoría
echo "3️⃣ Creando sub-sub-categoría..."
SUBSUB_CATEGORY=$(curl -s -X POST "$BASE_URL/categories" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Gaming Laptops\",
    \"parentId\": \"$SUB_ID\"
  }")

SUBSUB_ID=$(echo $SUBSUB_CATEGORY | jq -r '.id')
echo "✅ Sub-sub-categoría creada: $SUBSUB_ID"

# 4. Obtener árbol
echo "4️⃣ Obteniendo árbol de categorías..."
TREE=$(curl -s -X GET "$BASE_URL/categories/tree")
TREE_COUNT=$(echo $TREE | jq 'length')
echo "✅ Árbol obtenido con $TREE_COUNT categorías raíz"

# 5. Buscar por slug
echo "5️⃣ Buscando por slug..."
SLUG_RESULT=$(curl -s -X GET "$BASE_URL/categories/slug/test-electronics")
SLUG_NAME=$(echo $SLUG_RESULT | jq -r '.name')
echo "✅ Categoría encontrada: $SLUG_NAME"

# 6. Obtener descendientes
echo "6️⃣ Obteniendo descendientes..."
DESCENDANTS=$(curl -s -X GET "$BASE_URL/categories/$ROOT_ID/descendants")
DESC_COUNT=$(echo $DESCENDANTS | jq 'length')
echo "✅ Descendientes obtenidos: $DESC_COUNT"

# 7. Obtener path
echo "7️⃣ Obteniendo path completo..."
PATH=$(curl -s -X GET "$BASE_URL/categories/$SUBSUB_ID/path")
echo "✅ Path: $(echo $PATH | jq -c '.')"

# 8. Actualizar categoría
echo "8️⃣ Actualizando categoría..."
UPDATED=$(curl -s -X PUT "$BASE_URL/categories/$ROOT_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Electronics",
    "sortOrder": 20
  }')

UPDATED_NAME=$(echo $UPDATED | jq -r '.name')
echo "✅ Categoría actualizada: $UPDATED_NAME"

# 9. Desactivar categoría
echo "9️⃣ Desactivando categoría..."
DEACTIVATED=$(curl -s -X PATCH "$BASE_URL/categories/$SUBSUB_ID/deactivate" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

IS_ACTIVE=$(echo $DEACTIVATED | jq -r '.isActive')
echo "✅ Categoría desactivada (isActive: $IS_ACTIVE)"

# 10. Activar categoría
echo "🔟 Activando categoría..."
ACTIVATED=$(curl -s -X PATCH "$BASE_URL/categories/$SUBSUB_ID/activate" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

IS_ACTIVE_AGAIN=$(echo $ACTIVATED | jq -r '.isActive')
echo "✅ Categoría activada (isActive: $IS_ACTIVE_AGAIN)"

# 11. Intentar eliminar parent con children (debe fallar)
echo "1️⃣1️⃣ Intentando eliminar categoría con hijos..."
DELETE_RESULT=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/categories/$ROOT_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if [ "$DELETE_RESULT" == "400" ]; then
  echo "✅ Correctamente rechazado (400) - tiene hijos"
else
  echo "❌ Error: status code $DELETE_RESULT"
fi

# 12. Eliminar leaf category
echo "1️⃣2️⃣ Eliminando categoría hoja..."
DELETE_LEAF=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/categories/$SUBSUB_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if [ "$DELETE_LEAF" == "204" ]; then
  echo "✅ Categoría hoja eliminada exitosamente"
else
  echo "❌ Error al eliminar: HTTP $DELETE_LEAF"
fi

echo ""
echo "=== ✅ Testing completado ==="
```

---

## 📝 Notas Importantes

### Slug Validation

- **Formato:** Solo lowercase, números y guiones
- **Regex:** `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`
- **Auto-generación:** Si no se provee, se genera desde `name`
- **Unicidad:** Debe ser único en todo el sistema

### Jerarquía

- **Profundidad:** Ilimitada (pero recomendado max 5 niveles)
- **Prevención de ciclos:** No se puede hacer parent de un descendiente
- **Eliminación:** No se pueden eliminar categorías con hijos o productos

### Soft Delete

- `DELETE /categories/:id` realiza soft delete
- Categoría marcada como `isActive: false`
- No aparece en listados por defecto
- Se puede reactivar con `PATCH /categories/:id/activate`

### Metadata

- Campo JSON flexible para datos adicionales
- Uso común: `color`, `icon`, `seoKeywords`, `customFields`

---

**Estado del Módulo:** ✅ Completado  
**Tests Totales:** 35+  
**Tests Críticos:** 12  
**Estructura:** Árbol jerárquico ilimitado  
**Última Actualización:** 2025-10-11
