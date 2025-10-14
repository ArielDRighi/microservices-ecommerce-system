# 🏷️ API Testing - Módulo de Categorías (Categories)

**Módulo:** Categories  
**Base URL:** `http://localhost:3000/categories`  
**Descripción:** Gestión jerárquica de categorías con árbol, slugs, relaciones parent-child y control de acceso basado en roles (RBAC)

---

## � Control de Acceso (RBAC)

Este módulo implementa control de acceso basado en roles:

| Endpoint | Método | Acceso | Descripción |
|----------|--------|--------|-------------|
| `/categories` | POST | **🔴 ADMIN Only** | Crear categorías |
| `/categories` | GET | 🟢 Público | Listar categorías |
| `/categories/tree` | GET | 🟢 Público | Obtener árbol completo |
| `/categories/slug/:slug` | GET | 🟢 Público | Buscar por slug |
| `/categories/:id` | GET | 🟢 Público | Obtener por ID |
| `/categories/:id/descendants` | GET | 🟢 Público | Obtener descendientes |
| `/categories/:id/path` | GET | 🟢 Público | Obtener path/breadcrumb |
| `/categories/:id` | PUT | **🔴 ADMIN Only** | Actualizar categoría |
| `/categories/:id/activate` | PATCH | **🔴 ADMIN Only** | Activar categoría |
| `/categories/:id/deactivate` | PATCH | **🔴 ADMIN Only** | Desactivar categoría |
| `/categories/:id` | DELETE | **🔴 ADMIN Only** | Eliminar categoría (soft delete) |

### Roles Disponibles

- **ADMIN**: Acceso completo (crear, modificar, eliminar categorías)
- **USER**: Solo lectura (ver categorías y árbol)
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

### 🗑️ Soft Delete con @DeleteDateColumn

Las categorías usan **soft delete** mediante `@DeleteDateColumn`:

- Campo `deletedAt` (timestamp nullable)
- Categorías eliminadas tienen `deletedAt != null`
- Queries normales excluyen automáticamente registros con `deletedAt`
- No se puede eliminar categoría con productos activos asociados

---

## 📋 Índice de Tests

- [ ] 1️⃣ Crear Categoría Raíz (POST /categories) **[🔴 ADMIN Only]**
  - [ ] 1.1 Crear como ADMIN (201)
  - [ ] 1.2 USER intenta crear (403 Forbidden)
  - [ ] 1.3 Sin autenticación (401 Unauthorized)
- [ ] 2️⃣ Crear Sub-categoría (POST /categories) **[🔴 ADMIN Only]**
- [ ] 3️⃣ Listar Categorías con Paginación (GET /categories) **[🟢 Público]**
- [ ] 4️⃣ Obtener Árbol de Categorías (GET /categories/tree) **[🟢 Público]**
- [ ] 5️⃣ Buscar por Slug (GET /categories/slug/:slug) **[🟢 Público]**
- [ ] 6️⃣ Obtener por ID (GET /categories/:id) **[🟢 Público]**
- [ ] 7️⃣ Obtener Descendientes (GET /categories/:id/descendants) **[🟢 Público]**
- [ ] 8️⃣ Obtener Path Completo (GET /categories/:id/path) **[🟢 Público]**
- [ ] 9️⃣ Actualizar Categoría (PUT /categories/:id) **[🔴 ADMIN Only]**
- [ ] 🔟 Activar Categoría (PATCH /categories/:id/activate) **[🔴 ADMIN Only]**
- [ ] 1️⃣1️⃣ Desactivar Categoría (PATCH /categories/:id/deactivate) **[🔴 ADMIN Only]**
- [ ] 1️⃣2️⃣ Eliminar Categoría (DELETE /categories/:id) **[🔴 ADMIN Only]**

---

## Variables de Entorno

```bash
export BASE_URL="http://localhost:3000"
export ADMIN_TOKEN=""  # Token con rol ADMIN (para crear/modificar/eliminar)
export USER_TOKEN=""   # Token con rol USER (solo lectura)
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

## 1️⃣ Crear Categoría Raíz **[🔴 ADMIN Only]**

### ✅ Test 1.1: Crear categoría raíz exitosamente como ADMIN

**Endpoint:** `POST /categories`  
**Autenticación:** Bearer Token (JWT) - **ADMIN role required**  
**Nivel de Acceso:** 🔴 ADMIN Only  
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

### ❌ Test 1.3: USER sin rol ADMIN intenta crear categoría (403 Forbidden)

**Endpoint:** `POST /categories`  
**Autenticación:** Bearer Token (USER role) - **Insufficient permissions**  
**Status Code esperado:** `403 Forbidden`

**Comando curl:**

```bash
curl -X POST "$BASE_URL/categories" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Unauthorized Category",
    "description": "This should fail",
    "slug": "unauthorized"
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
- [ ] Categoría NO fue creada en la base de datos

**💡 Nota:** Error 403 significa que el usuario está autenticado pero no tiene permisos suficientes (rol USER en vez de ADMIN).

---

### ❌ Test 1.4: Crear categoría sin autenticación (401 Unauthorized)

**Endpoint:** `POST /categories`  
**Autenticación:** None  
**Status Code esperado:** `401 Unauthorized`

**Comando curl:**

```bash
curl -X POST "$BASE_URL/categories" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "No Auth Category",
    "slug": "no-auth"
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

## 2️⃣ Crear Sub-categoría **[🔴 ADMIN Only]**

### ✅ Test 2.1: Crear sub-categoría exitosamente como ADMIN

**Endpoint:** `POST /categories`  
**Autenticación:** Bearer Token (JWT) - **ADMIN role required**  
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

## 9️⃣ Actualizar Categoría **[🔴 ADMIN Only]**

### ✅ Test 9.1: Actualizar información básica como ADMIN

**Endpoint:** `PUT /categories/:id`  
**Autenticación:** Bearer Token (JWT) - **ADMIN role required**  
**Nivel de Acceso:** 🔴 ADMIN Only

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

### ❌ Test 9.2: USER sin rol ADMIN intenta actualizar categoría (403 Forbidden)

**Endpoint:** `PUT /categories/:id`  
**Autenticación:** Bearer Token (USER role) - **Insufficient permissions**  
**Status Code esperado:** `403 Forbidden`

**Comando curl:**

```bash
curl -X PUT "$BASE_URL/categories/$PARENT_CATEGORY_ID" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Unauthorized Update",
    "description": "This should fail"
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
- [ ] Categoría NO fue actualizada
- [ ] Usuario autenticado pero sin permisos

---

### ✅ Test 9.3: Mover categoría a otro parent como ADMIN

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

### ❌ Test 9.4: Crear jerarquía circular (400 Bad Request)

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

## 🔟 Activar/Desactivar Categoría **[🔴 ADMIN Only]**

### ✅ Test 10.1: Desactivar categoría como ADMIN

**Endpoint:** `PATCH /categories/:id/deactivate`  
**Autenticación:** Bearer Token (JWT) - **ADMIN role required**  
**Nivel de Acceso:** 🔴 ADMIN Only

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

### ✅ Test 10.2: Activar categoría como ADMIN

**Endpoint:** `PATCH /categories/:id/activate`  
**Autenticación:** Bearer Token (JWT) - **ADMIN role required**

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

### ❌ Test 10.3: USER intenta desactivar categoría (403 Forbidden)

**Endpoint:** `PATCH /categories/:id/deactivate`  
**Autenticación:** Bearer Token (USER role) - **Insufficient permissions**  
**Status Code esperado:** `403 Forbidden`

**Comando curl:**

```bash
curl -X PATCH "$BASE_URL/categories/$PARENT_CATEGORY_ID/deactivate" \
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
- [ ] Categoría NO fue desactivada

---

### ❌ Test 10.4: USER intenta activar categoría (403 Forbidden)

**Endpoint:** `PATCH /categories/:id/activate`  
**Autenticación:** Bearer Token (USER role) - **Insufficient permissions**  
**Status Code esperado:** `403 Forbidden`

**Comando curl:**

```bash
curl -X PATCH "$BASE_URL/categories/$PARENT_CATEGORY_ID/activate" \
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
- [ ] Categoría NO fue activada

---

## 1️⃣1️⃣ Eliminar Categoría (Soft Delete) **[🔴 ADMIN Only]**

### ✅ Test 11.1: Eliminar categoría sin hijos ni productos como ADMIN

**Endpoint:** `DELETE /categories/:id`  
**Autenticación:** Bearer Token (JWT) - **ADMIN role required**  
**Nivel de Acceso:** 🔴 ADMIN Only  
**Status Code:** `204 No Content`

**⚠️ Soft Delete:** Las categorías usan `@DeleteDateColumn` con campo `deletedAt`. No se eliminan físicamente de la base de datos.

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
- [ ] Soft delete: `deletedAt` timestamp establecido
- [ ] Categoría eliminada no aparece en listados normales
- [ ] Campo `deletedAt` no es null en la base de datos

---

### ❌ Test 11.2: USER intenta eliminar categoría (403 Forbidden)

**Endpoint:** `DELETE /categories/:id`  
**Autenticación:** Bearer Token (USER role) - **Insufficient permissions**  
**Status Code esperado:** `403 Forbidden`

**Comando curl:**

```bash
curl -X DELETE "$BASE_URL/categories/$TEMP_CATEGORY_ID" \
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
- [ ] Categoría NO fue eliminada
- [ ] Usuario autenticado pero sin permisos

---

### ❌ Test 11.3: Eliminar categoría con hijos o productos (400 Bad Request)

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
ADMIN_TOKEN=""
USER_TOKEN=""

echo "=== 🏷️ Testing Categories Module ==="
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

# 1. Crear categoría raíz como ADMIN
echo "1️⃣ Creando categoría raíz como ADMIN..."
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

# 11. Test de autorización - USER intenta actualizar (debe fallar)
echo "1️⃣1️⃣ Probando autorización - USER intenta actualizar..."
USER_UPDATE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X PUT "$BASE_URL/categories/$ROOT_ID" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Unauthorized"}')

if [ "$USER_UPDATE" == "403" ]; then
  echo "✅ Autorización correcta - USER recibió 403 Forbidden"
else
  echo "❌ Error de autorización - Expected 403, got $USER_UPDATE"
fi

# 12. Intentar eliminar parent con children (debe fallar)
echo "1️⃣2️⃣ Intentando eliminar categoría con hijos..."
DELETE_RESULT=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/categories/$ROOT_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if [ "$DELETE_RESULT" == "400" ]; then
  echo "✅ Correctamente rechazado (400) - tiene hijos"
else
  echo "❌ Error: status code $DELETE_RESULT"
fi

# 13. Eliminar leaf category como ADMIN
echo "1️⃣3️⃣ Eliminando categoría hoja como ADMIN..."
DELETE_LEAF=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/categories/$SUBSUB_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if [ "$DELETE_LEAF" == "204" ]; then
  echo "✅ Categoría hoja eliminada exitosamente (soft delete)"
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

### Control de Acceso (RBAC)

- **Operaciones ADMIN Only**: Crear, Actualizar, Activar, Desactivar, Eliminar
- **Operaciones Públicas**: Listar, Árbol, Buscar por slug, Obtener por ID, Descendientes, Path
- **403 Forbidden**: Usuario autenticado sin rol ADMIN
- **401 Unauthorized**: Sin autenticación

### Soft Delete con @DeleteDateColumn

- `DELETE /categories/:id` realiza **soft delete** usando `@DeleteDateColumn`
- Campo `deletedAt` (timestamp) establecido al eliminar
- Categorías con `deletedAt != null` no aparecen en queries normales
- TypeORM excluye automáticamente registros soft-deleted
- No se puede eliminar categoría con hijos o productos asociados
- **No se marca como `isActive: false`** - usa `deletedAt` para soft delete

### Metadata

- Campo JSON flexible para datos adicionales
- Uso común: `color`, `icon`, `seoKeywords`, `customFields`

---

**Estado del Módulo:** ✅ Completado  
**Tests Totales:** 40+  
**Tests Críticos:** 15  
**RBAC:** ✅ Sistema de roles implementado  
**Seguridad:** ✅ Protección de endpoints administrativos  
**Soft Delete:** ✅ @DeleteDateColumn con deletedAt  
**Estructura:** Árbol jerárquico ilimitado  
**Última Actualización:** 2025-10-14
