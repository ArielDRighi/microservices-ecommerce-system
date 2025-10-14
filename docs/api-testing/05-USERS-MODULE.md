# 👥 API Testing - Módulo de Usuarios (Users)

**Módulo:** Users  
**Base URL:** `http://localhost:3000/users`  
**Descripción:** Gestión de usuarios con CRUD completo, paginación, soft delete y sistema RBAC

---

## 📋 Índice de Tests

- [ ] ✅ 1. Crear Usuario (POST /users) [ADMIN Only]
- [ ] ✅ 2. Listar Usuarios con Paginación (GET /users) [ADMIN Only]
- [ ] ✅ 3. Obtener Perfil Propio (GET /users/profile) [Auth Required]
- [ ] ✅ 4. Obtener Usuario por ID (GET /users/:id) [ADMIN Only]
- [ ] ✅ 5. Actualizar Usuario (PATCH /users/:id) [ADMIN Only]
- [ ] ✅ 6. Eliminar Usuario - Soft Delete (DELETE /users/:id) [ADMIN Only]
- [ ] ✅ 7. Activar Usuario (PATCH /users/:id/activate) [ADMIN Only]
- [ ] ✅ 8. Paginación y Filtros [ADMIN Only]
- [ ] ✅ 9. Tests de Autorización RBAC

---

## Variables de Entorno

```bash
export BASE_URL="http://localhost:3000"
export TOKEN="your-jwt-token-here"           # Token de usuario normal (role: USER)
export USER_ID=""
export ADMIN_TOKEN="admin-jwt-token-here"    # Token de administrador (role: ADMIN)
```

---

## 🔐 Sistema de Autorización RBAC

### Roles Disponibles

- **ADMIN**: Acceso completo a gestión de usuarios
- **USER**: Solo puede ver y editar su propio perfil

### Endpoints por Nivel de Acceso

#### 🔴 Solo ADMIN (Bearer Token con role ADMIN)

- `POST /users` - Crear usuario
- `GET /users` - Listar todos los usuarios
- `GET /users/:id` - Ver cualquier usuario
- `PATCH /users/:id` - Actualizar cualquier usuario
- `DELETE /users/:id` - Eliminar usuario (soft delete)
- `PATCH /users/:id/activate` - Activar usuario

#### 🟢 Usuario Autenticado (Cualquier role)

- `GET /users/profile` - Ver propio perfil

### Obtener Token de ADMIN

```bash
# Login como administrador
export ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Admin123!"
  }' | jq -r '.accessToken')

echo "Admin Token: $ADMIN_TOKEN"
```

### Obtener Token de Usuario Normal

```bash
# Login como usuario normal
export TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com",
    "password": "User123!"
  }' | jq -r '.accessToken')

echo "User Token: $TOKEN"
```

### Verificar Role del Token

```bash
# Ver información del usuario actual
curl -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $TOKEN" | jq '.role'
```

---

## ⚠️ Respuestas de Error - Autorización

### 403 Forbidden (Usuario sin role ADMIN)

Cuando un usuario con role `USER` intenta acceder a un endpoint administrativo:

```json
{
  "statusCode": 403,
  "message": "User with role 'USER' does not have access to this resource. Required roles: ADMIN",
  "error": "Forbidden"
}
```

### 401 Unauthorized (Sin token o token inválido)

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

## 1️⃣ Crear Usuario

### ✅ Test 1.1: Crear usuario exitosamente (como ADMIN)

**Endpoint:** `POST /users`  
**Autenticación:** Bearer Token (JWT) - Required (ADMIN)  
**Status Code:** `201 Created`

**Request Body:**

```json
{
  "email": "john.doe@example.com",
  "passwordHash": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+541234567890",
  "dateOfBirth": "1990-05-15",
  "language": "es",
  "timezone": "America/Argentina/Buenos_Aires",
  "isActive": true
}
```

**Comando curl:**

```bash
curl -X POST "$BASE_URL/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "passwordHash": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+541234567890",
    "dateOfBirth": "1990-05-15",
    "language": "es",
    "timezone": "America/Argentina/Buenos_Aires",
    "isActive": true
  }' | jq '.'
```

**Respuesta Esperada (201 Created):**

```json
{
  "id": "user-uuid-here",
  "email": "john.doe@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "fullName": "John Doe",
  "phoneNumber": "+541234567890",
  "dateOfBirth": "1990-05-15T00:00:00.000Z",
  "language": "es",
  "timezone": "America/Argentina/Buenos_Aires",
  "role": "USER",
  "isActive": true,
  "emailVerifiedAt": null,
  "lastLoginAt": null,
  "createdAt": "2025-10-11T10:30:00.000Z",
  "updatedAt": "2025-10-11T10:30:00.000Z"
}
```

**Guardar User ID:**

```bash
export USER_ID=$(curl -s -X POST "$BASE_URL/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.user@example.com",
    "passwordHash": "TestPassword123!",
    "firstName": "Test",
    "lastName": "User"
  }' | jq -r '.id')

echo "User ID: $USER_ID"
```

**Checklist:**

- [ ] Status code es 201
- [ ] Email está en minúsculas y trimmed
- [ ] `passwordHash` NO aparece en la respuesta
- [ ] `fullName` está calculado correctamente
- [ ] `role` es "USER" por defecto (nuevo campo RBAC)
- [ ] `isActive` por defecto es `true`
- [ ] `emailVerifiedAt` es `null`
- [ ] `lastLoginAt` es `null`

---

### ❌ Test 1.2: Usuario sin role ADMIN intenta crear usuario (403 Forbidden)

**Endpoint:** `POST /users`  
**Autenticación:** Bearer Token (JWT) - Usuario normal (role: USER)  
**Status Code:** `403 Forbidden`

**Comando curl:**

```bash
curl -X POST "$BASE_URL/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "passwordHash": "Password123!",
    "firstName": "New",
    "lastName": "User"
  }' | jq '.'
```

**Respuesta Esperada (403 Forbidden):**

```json
{
  "statusCode": 403,
  "message": "User with role 'USER' does not have access to this resource. Required roles: ADMIN",
  "error": "Forbidden"
}
```

**Checklist:**

- [ ] Status code es 403
- [ ] Mensaje indica falta de permisos
- [ ] Usuario NO fue creado en la base de datos

---

### ❌ Test 1.3: Crear usuario con email duplicado (409 Conflict)

**Comando curl:**

```bash
curl -X POST "$BASE_URL/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "passwordHash": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Doe"
  }' | jq '.'
```

**Respuesta Esperada (409 Conflict):**

```json
{
  "statusCode": 409,
  "message": "Email already exists",
  "error": "Conflict"
}
```

**Checklist:**

- [ ] Status code es 409
- [ ] Email debe ser único en el sistema

---

### ❌ Test 1.3: Crear usuario con password débil (400 Bad Request)

**Comando curl:**

```bash
curl -X POST "$BASE_URL/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "weak.password@example.com",
    "passwordHash": "weak",
    "firstName": "Weak",
    "lastName": "Password"
  }' | jq '.'
```

**Respuesta Esperada (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": [
    "Password must be at least 8 characters long",
    "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
  ],
  "error": "Bad Request"
}
```

**Checklist:**

- [ ] Status code es 400
- [ ] Valida longitud mínima (8 caracteres)
- [ ] Valida complejidad (mayúscula, minúscula, número, símbolo)

---

### ❌ Test 1.4: Crear usuario con email inválido (400 Bad Request)

**Comando curl:**

```bash
curl -X POST "$BASE_URL/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "passwordHash": "ValidPassword123!",
    "firstName": "Invalid",
    "lastName": "Email"
  }' | jq '.'
```

**Respuesta Esperada (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": ["Please provide a valid email address"],
  "error": "Bad Request"
}
```

**Checklist:**

- [ ] Status code es 400
- [ ] Valida formato de email

---

### ❌ Test 1.5: Crear usuario con nombre inválido (400 Bad Request)

**Comando curl:**

```bash
curl -X POST "$BASE_URL/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid.name@example.com",
    "passwordHash": "ValidPassword123!",
    "firstName": "J",
    "lastName": "123"
  }' | jq '.'
```

**Respuesta Esperada (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": [
    "First name must be at least 2 characters long",
    "Last name can only contain letters, spaces, hyphens, and apostrophes"
  ],
  "error": "Bad Request"
}
```

**Checklist:**

- [ ] Status code es 400
- [ ] Valida longitud mínima de nombre (2 caracteres)
- [ ] Valida caracteres permitidos (letras, espacios, guiones, apóstrofes)

---

### ❌ Test 1.6: Crear usuario con teléfono inválido (400 Bad Request)

**Comando curl:**

```bash
curl -X POST "$BASE_URL/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid.phone@example.com",
    "passwordHash": "ValidPassword123!",
    "firstName": "Invalid",
    "lastName": "Phone",
    "phoneNumber": "123456"
  }' | jq '.'
```

**Respuesta Esperada (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": ["Phone number must be in international format (e.g., +1234567890)"],
  "error": "Bad Request"
}
```

**Checklist:**

- [ ] Status code es 400
- [ ] Valida formato internacional (+[código país][número])

---

### ❌ Test 1.7: Crear usuario sin autenticación (401 Unauthorized)

**Comando curl:**

```bash
curl -X POST "$BASE_URL/users" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "no.auth@example.com",
    "passwordHash": "ValidPassword123!",
    "firstName": "No",
    "lastName": "Auth"
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

## 2️⃣ Listar Usuarios con Paginación

### ✅ Test 2.1: Listar usuarios con paginación por defecto

**Endpoint:** `GET /users`  
**Autenticación:** Bearer Token (JWT) - Required (ADMIN)  
**Query Params:** `?page=1&limit=10`

**Comando curl:**

```bash
curl -X GET "$BASE_URL/users?page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
{
  "data": [
    {
      "id": "user-uuid-1",
      "email": "user1@example.com",
      "firstName": "User",
      "lastName": "One",
      "fullName": "User One",
      "isActive": true,
      "createdAt": "2025-10-10T10:00:00.000Z",
      "updatedAt": "2025-10-10T10:00:00.000Z"
    },
    {
      "id": "user-uuid-2",
      "email": "user2@example.com",
      "firstName": "User",
      "lastName": "Two",
      "fullName": "User Two",
      "isActive": true,
      "createdAt": "2025-10-10T11:00:00.000Z",
      "updatedAt": "2025-10-10T11:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

**Checklist:**

- [ ] Status code es 200
- [ ] Respuesta contiene `data` (array de usuarios)
- [ ] Respuesta contiene `meta` (información de paginación)
- [ ] `data` tiene máximo `limit` elementos
- [ ] `passwordHash` NO aparece en la respuesta
- [ ] `meta.totalPages` está calculado correctamente

---

### ✅ Test 2.2: Filtrar usuarios activos

**Query Params:** `?isActive=true`

**Comando curl:**

```bash
curl -X GET "$BASE_URL/users?isActive=true&page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
```

**Checklist:**

- [ ] Status code es 200
- [ ] Todos los usuarios tienen `isActive: true`

---

### ✅ Test 2.3: Filtrar usuarios inactivos

**Query Params:** `?isActive=false`

**Comando curl:**

```bash
curl -X GET "$BASE_URL/users?isActive=false&page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
```

**Checklist:**

- [ ] Status code es 200
- [ ] Todos los usuarios tienen `isActive: false`

---

### ✅ Test 2.4: Buscar usuarios por email

**Query Params:** `?search=john`

**Comando curl:**

```bash
curl -X GET "$BASE_URL/users?search=john" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
```

**Checklist:**

- [ ] Status code es 200
- [ ] Usuarios filtrados contienen "john" en email, firstName o lastName

---

### ✅ Test 2.5: Paginación - Página 2

**Query Params:** `?page=2&limit=5`

**Comando curl:**

```bash
curl -X GET "$BASE_URL/users?page=2&limit=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
```

**Checklist:**

- [ ] Status code es 200
- [ ] `meta.page` es 2
- [ ] `meta.hasPreviousPage` es `true`
- [ ] Datos diferentes a página 1

---

### ✅ Test 2.6: Ordenar usuarios por creación (descendente)

**Query Params:** `?sortBy=createdAt&sortOrder=DESC`

**Comando curl:**

```bash
curl -X GET "$BASE_URL/users?sortBy=createdAt&sortOrder=DESC&page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
```

**Checklist:**

- [ ] Status code es 200
- [ ] Usuarios ordenados del más reciente al más antiguo

---

## 3️⃣ Obtener Perfil Propio

### ✅ Test 3.1: Obtener perfil propio exitosamente

**Endpoint:** `GET /users/profile`  
**Autenticación:** Bearer Token (JWT) - Required  
**Descripción:** Endpoint especial para que el usuario obtenga su propio perfil

**Comando curl:**

```bash
curl -X GET "$BASE_URL/users/profile" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
{
  "id": "current-user-uuid",
  "email": "current.user@example.com",
  "firstName": "Current",
  "lastName": "User",
  "fullName": "Current User",
  "phoneNumber": "+541234567890",
  "dateOfBirth": "1990-05-15T00:00:00.000Z",
  "language": "es",
  "timezone": "America/Argentina/Buenos_Aires",
  "isActive": true,
  "emailVerifiedAt": "2025-10-01T10:00:00.000Z",
  "lastLoginAt": "2025-10-11T09:30:00.000Z",
  "createdAt": "2025-10-01T10:00:00.000Z",
  "updatedAt": "2025-10-11T10:30:00.000Z"
}
```

**Checklist:**

- [ ] Status code es 200
- [ ] Retorna el perfil del usuario autenticado
- [ ] `passwordHash` NO aparece en la respuesta
- [ ] Incluye todos los campos del usuario

---

### ❌ Test 3.2: Obtener perfil sin autenticación (401 Unauthorized)

**Comando curl:**

```bash
curl -X GET "$BASE_URL/users/profile" | jq '.'
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

## 4️⃣ Obtener Usuario por ID

### ✅ Test 4.1: Obtener usuario por ID (como ADMIN)

**Endpoint:** `GET /users/:id`  
**Autenticación:** Bearer Token (JWT) - Required (ADMIN o el mismo usuario)

**Comando curl:**

```bash
curl -X GET "$BASE_URL/users/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
{
  "id": "user-uuid-here",
  "email": "user@example.com",
  "firstName": "User",
  "lastName": "Name",
  "fullName": "User Name",
  "phoneNumber": "+541234567890",
  "language": "es",
  "timezone": "America/Argentina/Buenos_Aires",
  "isActive": true,
  "emailVerifiedAt": "2025-10-01T10:00:00.000Z",
  "lastLoginAt": "2025-10-11T09:30:00.000Z",
  "createdAt": "2025-10-01T10:00:00.000Z",
  "updatedAt": "2025-10-11T10:30:00.000Z"
}
```

**Checklist:**

- [ ] Status code es 200
- [ ] Retorna usuario específico
- [ ] `passwordHash` NO aparece

---

### ❌ Test 4.2: Obtener usuario inexistente (404 Not Found)

**Comando curl:**

```bash
curl -X GET "$BASE_URL/users/00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
```

**Respuesta Esperada (404 Not Found):**

```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

**Checklist:**

- [ ] Status code es 404

---

### ❌ Test 4.3: Usuario normal intenta ver perfil de otro usuario (403 Forbidden)

**Comando curl:**

```bash
# Con token de usuario normal (no admin)
curl -X GET "$BASE_URL/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
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
- [ ] Solo ADMIN puede ver perfiles de otros usuarios

---

## 5️⃣ Actualizar Usuario

### ✅ Test 5.1: Actualizar usuario exitosamente

**Endpoint:** `PATCH /users/:id`  
**Autenticación:** Bearer Token (JWT) - Required (ADMIN o el mismo usuario)

**Nota:** NO se puede actualizar `email` ni `passwordHash` por este endpoint.

**Request Body:**

```json
{
  "firstName": "John Updated",
  "lastName": "Doe Updated",
  "phoneNumber": "+549876543210",
  "language": "en",
  "timezone": "America/New_York"
}
```

**Comando curl:**

```bash
curl -X PATCH "$BASE_URL/users/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John Updated",
    "lastName": "Doe Updated",
    "phoneNumber": "+549876543210",
    "language": "en",
    "timezone": "America/New_York"
  }' | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
{
  "id": "user-uuid-here",
  "email": "user@example.com",
  "firstName": "John Updated",
  "lastName": "Doe Updated",
  "fullName": "John Updated Doe Updated",
  "phoneNumber": "+549876543210",
  "language": "en",
  "timezone": "America/New_York",
  "isActive": true,
  "createdAt": "2025-10-01T10:00:00.000Z",
  "updatedAt": "2025-10-11T10:35:00.000Z"
}
```

**Checklist:**

- [ ] Status code es 200
- [ ] Campos actualizados reflejan los cambios
- [ ] `fullName` se recalcula automáticamente
- [ ] `updatedAt` cambió
- [ ] `email` NO se puede cambiar
- [ ] `passwordHash` NO se puede cambiar

---

### ✅ Test 5.2: Actualizar perfil propio

**Comando curl:**

```bash
# Usuario actualiza su propio perfil
curl -X PATCH "$BASE_URL/users/$(curl -s -X GET "$BASE_URL/users/profile" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.id')" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+541199887766"
  }' | jq '.'
```

**Checklist:**

- [ ] Status code es 200
- [ ] Usuario puede actualizar su propio perfil

---

### ❌ Test 5.3: Actualizar con datos inválidos (400 Bad Request)

**Comando curl:**

```bash
curl -X PATCH "$BASE_URL/users/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "A",
    "phoneNumber": "invalid"
  }' | jq '.'
```

**Respuesta Esperada (400 Bad Request):**

```json
{
  "statusCode": 400,
  "message": [
    "First name must be at least 2 characters long",
    "Phone number must be in international format (e.g., +1234567890)"
  ],
  "error": "Bad Request"
}
```

**Checklist:**

- [ ] Status code es 400
- [ ] Validaciones funcionan en actualización

---

## 6️⃣ Eliminar Usuario (Soft Delete)

### ⚠️ Importante: Soft Delete con `deletedAt`

- ✅ Utiliza `@DeleteDateColumn` de TypeORM
- ✅ Campo `deletedAt` se setea con timestamp cuando se elimina
- ✅ Usuarios eliminados NO aparecen en consultas normales (WHERE deleted_at IS NULL)
- ✅ Se puede recuperar usuario con `PATCH /users/:id/activate` (restaura soft delete)
- 🔒 **Protección Admin**: Un administrador NO puede eliminarse a sí mismo

### ✅ Test 6.1: Eliminar usuario exitosamente (Soft Delete)

**Endpoint:** `DELETE /users/:id`  
**Autenticación:** Bearer Token (JWT) - Required (ADMIN)  
**Status Code:** `204 No Content`  
**Nota:** Soft delete - el usuario se marca con `deletedAt` pero no se elimina físicamente

**Comando curl:**

```bash
curl -X DELETE "$BASE_URL/users/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -v
```

**Respuesta Esperada (204 No Content):**

```
(Sin body, solo status code 204)
```

**Verificar soft delete:**

```bash
# Intentar obtener usuario eliminado (debería retornar 404)
curl -X GET "$BASE_URL/users/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
```

**Respuesta (404 Not Found):**

```json
{
  "statusCode": 404,
  "message": "User with ID {id} not found",
  "error": "Not Found"
}
```

**Nota:** El usuario existe en la base de datos pero con `deletedAt` seteado, por lo que NO es visible en consultas normales.

**Checklist:**

- [ ] Status code es 204
- [ ] No hay body en la respuesta
- [ ] Usuario NO aparece en GET /users/:id (retorna 404)
- [ ] Usuario NO aparece en listado GET /users
- [ ] Campo `deletedAt` tiene timestamp en la base de datos
- [ ] Usuario puede ser reactivado con endpoint activate (restaura soft delete)

---

### ❌ Test 6.2: Admin intenta eliminarse a sí mismo (403 Forbidden)

**Endpoint:** `DELETE /users/:id`  
**Autenticación:** Bearer Token (JWT) - ADMIN  
**Status Code:** `403 Forbidden`  
**Nota:** Protección de seguridad - admin no puede auto-eliminarse

**Comando curl:**

```bash
# Obtener ID del usuario admin actual
ADMIN_USER_ID=$(curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.id')

# Intentar eliminar el propio usuario admin
curl -X DELETE "$BASE_URL/users/$ADMIN_USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
```

**Respuesta Esperada (403 Forbidden):**

```json
{
  "statusCode": 403,
  "message": "Admin users cannot be deleted. Please contact support for assistance.",
  "error": "Forbidden"
}
```

**Checklist:**

- [ ] Status code es 403
- [ ] Admin NO puede eliminarse a sí mismo
- [ ] Mensaje claro de prohibición
- [ ] Usuario admin sigue activo

---

### ❌ Test 6.3: Usuario normal intenta eliminar usuario (403 Forbidden)

**Comando curl:**

```bash
curl -X DELETE "$BASE_URL/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
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
- [ ] Solo ADMIN puede eliminar usuarios

---

## 7️⃣ Activar Usuario

### ✅ Test 7.1: Activar usuario eliminado

**Endpoint:** `PATCH /users/:id/activate`  
**Autenticación:** Bearer Token (JWT) - Required (ADMIN)

**Comando curl:**

```bash
curl -X PATCH "$BASE_URL/users/$USER_ID/activate" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
```

**Respuesta Esperada (200 OK):**

```json
{
  "id": "user-uuid-here",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "isActive": true,
  "deletedAt": null,
  "updatedAt": "2025-10-11T10:45:00.000Z",
  ...
}
```

**Checklist:**

- [ ] Status code es 200
- [ ] `isActive` es `true`
- [ ] `deletedAt` es `null`
- [ ] Usuario vuelve a aparecer en listado

---

## 🧪 Script de Testing Completo

```bash
#!/bin/bash
# Testing completo de Users Module

BASE_URL="http://localhost:3000"
ADMIN_TOKEN="your-admin-jwt-token"
TOKEN="your-user-jwt-token"

echo "=== 👥 Testing Users Module ==="
echo ""

# 1. Crear usuario
echo "1️⃣ Creando usuario..."
TIMESTAMP=$(date +%s)

CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"test.user.$TIMESTAMP@example.com\",
    \"passwordHash\": \"TestPassword123!\",
    \"firstName\": \"Test\",
    \"lastName\": \"User\",
    \"phoneNumber\": \"+541234567890\"
  }")

USER_ID=$(echo $CREATE_RESPONSE | jq -r '.id')
EMAIL=$(echo $CREATE_RESPONSE | jq -r '.email')

if [ "$USER_ID" != "null" ]; then
  echo "✅ Usuario creado: $USER_ID"
  echo "   Email: $EMAIL"
else
  echo "❌ Error al crear usuario"
  exit 1
fi

# 2. Listar usuarios
echo "2️⃣ Listando usuarios..."
LIST_RESPONSE=$(curl -s -X GET "$BASE_URL/users?page=1&limit=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

TOTAL_USERS=$(echo $LIST_RESPONSE | jq -r '.meta.total')
echo "✅ Total de usuarios: $TOTAL_USERS"

# 3. Obtener perfil propio
echo "3️⃣ Obteniendo perfil propio..."
PROFILE_RESPONSE=$(curl -s -X GET "$BASE_URL/users/profile" \
  -H "Authorization: Bearer $TOKEN")

PROFILE_EMAIL=$(echo $PROFILE_RESPONSE | jq -r '.email')
echo "✅ Perfil obtenido: $PROFILE_EMAIL"

# 4. Obtener usuario por ID
echo "4️⃣ Obteniendo usuario por ID..."
USER_DETAIL=$(curl -s -X GET "$BASE_URL/users/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

FULL_NAME=$(echo $USER_DETAIL | jq -r '.fullName')
echo "✅ Usuario obtenido: $FULL_NAME"

# 5. Actualizar usuario
echo "5️⃣ Actualizando usuario..."
UPDATE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/users/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Updated",
    "lastName": "Name",
    "phoneNumber": "+549876543210"
  }')

UPDATED_NAME=$(echo $UPDATE_RESPONSE | jq -r '.fullName')
echo "✅ Usuario actualizado: $UPDATED_NAME"

# 6. Filtrar usuarios activos
echo "6️⃣ Filtrando usuarios activos..."
ACTIVE_USERS=$(curl -s -X GET "$BASE_URL/users?isActive=true&limit=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

ACTIVE_COUNT=$(echo $ACTIVE_USERS | jq '.data | length')
echo "✅ Usuarios activos en página: $ACTIVE_COUNT"

# 7. Soft delete de usuario
echo "7️⃣ Eliminando usuario (soft delete)..."
DELETE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/users/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if [ "$DELETE_RESPONSE" == "204" ]; then
  echo "✅ Usuario eliminado (soft delete)"
else
  echo "❌ Error al eliminar usuario: HTTP $DELETE_RESPONSE"
fi

# 8. Verificar que está inactivo
echo "8️⃣ Verificando estado inactivo..."
DELETED_USER=$(curl -s -X GET "$BASE_URL/users/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

IS_ACTIVE=$(echo $DELETED_USER | jq -r '.isActive')
echo "   isActive: $IS_ACTIVE"

if [ "$IS_ACTIVE" == "false" ]; then
  echo "✅ Usuario correctamente inactivo"
else
  echo "❌ Usuario aún activo"
fi

# 9. Activar usuario
echo "9️⃣ Activando usuario..."
ACTIVATE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/users/$USER_ID/activate" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

IS_ACTIVE_AGAIN=$(echo $ACTIVATE_RESPONSE | jq -r '.isActive')

if [ "$IS_ACTIVE_AGAIN" == "true" ]; then
  echo "✅ Usuario reactivado exitosamente"
else
  echo "❌ Error al reactivar usuario"
fi

echo ""
echo "=== ✅ Testing completado ==="
```

---

## 📝 Notas Importantes

### Validaciones de Password

- **Longitud:** 8-128 caracteres
- **Complejidad:** Debe contener:
  - Al menos 1 mayúscula
  - Al menos 1 minúscula
  - Al menos 1 número
  - Al menos 1 carácter especial (@$!%\*?&^#()-\_=+[]{}|;:',.<>/~`)

### Validaciones de Nombre

- **Longitud:** 2-100 caracteres
- **Caracteres permitidos:** Letras (incluyendo acentos), espacios, guiones, apóstrofes
- **Regex:** `/^[a-zA-ZÀ-ÿ\s'-]+$/`

### Validaciones de Email

- **Formato:** RFC 5322 compliant
- **Transformación:** Convertido a minúsculas y trimmed automáticamente
- **Unicidad:** Debe ser único en el sistema

### Validaciones de Teléfono

- **Formato:** Internacional con código de país (+[1-9][número])
- **Ejemplo:** `+541234567890`
- **Regex:** `/^\+[1-9]\d{1,14}$/`

### Soft Delete con @DeleteDateColumn

- El endpoint `DELETE /users/:id` realiza **soft delete** usando TypeORM's @DeleteDateColumn
- Se agrega timestamp en campo `deletedAt` (no modifica `isActive`)
- El usuario NO se elimina físicamente de la base de datos
- Usuarios con `deletedAt != null` NO aparecen en consultas normales
- Se puede reactivar con `PATCH /users/:id/activate` (restaura soft delete: `deletedAt = null`)
- **Protección Admin**: Usuarios con role ADMIN no pueden eliminarse a sí mismos

### Paginación

- **Default:** `page=1, limit=10`
- **Max limit:** 100
- **Metadata incluida:**
  - `page`: Página actual
  - `limit`: Elementos por página
  - `total`: Total de elementos
  - `totalPages`: Total de páginas
  - `hasNextPage`: Boolean
  - `hasPreviousPage`: Boolean

### Campos Computados

- **fullName:** Concatenación automática de `firstName + " " + lastName`

### Sistema RBAC (Role-Based Access Control)

- **Roles:** ADMIN, USER
- **Campo role:** Agregado en entity User (enum UserRole)
- **Default role:** USER (en registro y creación)
- **Protección:** Todos los endpoints administrativos requieren role ADMIN
- **JWT:** Token incluye información de role para autorización
- **Guard:** RolesGuard valida permisos en cada request

---

**Estado del Módulo:** ✅ Completado  
**Tests Totales:** 35+  
**Tests Críticos:** 12  
**Soft Delete:** ✅ Implementado con @DeleteDateColumn  
**RBAC:** ✅ Sistema de roles completo (ADMIN/USER)  
**Seguridad:** ✅ Protección de endpoints administrativos  
**Última Actualización:** 2025-10-11
