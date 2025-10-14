# 👥 API Testing - Módulo de Usuarios (Users)

**Módulo:** Users  
**Base URL:** `http://localhost:3002/api/v1/users`  
**Descripción:** Gestión de usuarios con CRUD completo, paginación, soft delete y sistema RBAC

---

## 📋 Índice de Tests

- [ ] 1️⃣ **Crear Usuario** (POST /users) **[🔴 ADMIN Only]** - **EMPEZAR AQUÍ**
- [ ] 2️⃣ USER intenta crear usuario (403 Forbidden)
- [ ] 3️⃣ Listar Usuarios con Paginación (GET /users) **[🔴 ADMIN Only]**
- [ ] 4️⃣ Obtener Perfil Propio (GET /users/profile) **[🟡 Auth Required]**
- [ ] 5️⃣ Obtener Usuario por ID (GET /users/:id) **[🔴 ADMIN Only]**

**NOTA:** Marca cada checkbox `[x]` conforme completes cada test exitosamente.

---

## 🚀 Pre-requisitos y Estado Inicial

### Antes de empezar, asegúrate de tener:

1. **✅ Servidor corriendo:** `npm run start:dev` en puerto 3002
2. **✅ Base de datos iniciada:** PostgreSQL con migraciones aplicadas
3. **✅ Usuarios seed:** Los usuarios de prueba deben existir:
   - `admin@test.com` / `Admin123!` (rol: ADMIN)
   - `user@test.com` / `Admin123!` (rol: USER)

### Estado esperado de la DB:

- **Usuarios:** Pueden existir usuarios previos (no afecta los tests)
- **Seed data:** Los usuarios admin y user deben estar disponibles

### ⚠️ Importante:

Este documento usa **placeholders genéricos** (`<USER_UUID>`, `<timestamp>`, etc.) en las respuestas de ejemplo. Los valores reales en tu sistema serán diferentes pero deben seguir la misma estructura.

---

## Variables de Entorno

```bash
export BASE_URL="http://localhost:3002/api/v1"
export USER_TOKEN=""      # Se obtendrá en la sección de autenticación (role: USER)
export ADMIN_TOKEN=""     # Se obtendrá en la sección de autenticación (role: ADMIN)
export USER_ID=""         # Se guardará después de crear usuario (Test 1)
```

**NOTA:** Estas variables se llenarán automáticamente conforme ejecutes los tests en orden.

---

## � Obtener Tokens de Autenticación

```bash
# Token de ADMINISTRADOR (gestión completa de usuarios)
export ADMIN_TOKEN=$(curl -s -X POST "http://localhost:3002/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Admin123!"
  }' | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

# Token de USUARIO normal (solo ver propio perfil)
export USER_TOKEN=$(curl -s -X POST "http://localhost:3002/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com",
    "password": "Admin123!"
  }' | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

echo "ADMIN_TOKEN: ${ADMIN_TOKEN:0:50}..."
echo "USER_TOKEN: ${USER_TOKEN:0:50}..."
```

---

## 🔐 Obtener Usuario Autenticado

**Endpoint:** `GET /auth/me`  
**Autenticación:** Bearer Token (JWT) - Required  
**Status Code:** `200 OK`

**Propósito:** Obtener información del usuario autenticado extraída del token JWT. Útil para obtener el ID del usuario actual sin necesidad de conocerlo previamente.

**Comando curl:**

```bash
curl -s -X GET "http://localhost:3002/api/v1/auth/me" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Respuesta Esperada (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "id": "<USER_UUID>",
    "email": "<email>@example.com",
    "firstName": "<FirstName>",
    "lastName": "<LastName>",
    "fullName": "<FirstName> <LastName>",
    "isActive": true
  },
  "timestamp": "<timestamp>",
  "path": "/api/v1/auth/me"
}
```

**Características:**

- Retorna información básica del usuario autenticado
- Extrae el ID del usuario desde el JWT token
- Funciona con cualquier rol (USER o ADMIN)
- Útil para tests que requieren el ID del usuario actual

**Checklist:**

- [ ] Status code es 200 OK
- [ ] Retorna información del usuario autenticado
- [ ] Incluye campos: id, email, firstName, lastName, fullName, isActive
- [ ] Funciona con ADMIN_TOKEN y USER_TOKEN

---

## �🔐 Sistema de Autorización RBAC

### Roles Disponibles

- **ADMIN**: Acceso completo a gestión de usuarios (crear, listar, actualizar, eliminar)
- **USER**: Solo puede ver y editar su propio perfil

### Endpoints por Nivel de Acceso

#### 🔴 Solo ADMIN (Bearer Token con role ADMIN)

- `POST /users` - Crear usuario
- `GET /users` - Listar todos los usuarios
- `GET /users/:id` - Ver cualquier usuario
- `PATCH /users/:id` - Actualizar cualquier usuario
- `DELETE /users/:id` - Eliminar usuario (soft delete)
- `PATCH /users/:id/activate` - Activar usuario

#### � Usuario Autenticado (Cualquier role)

- `GET /users/profile` - Ver propio perfil

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

## 1️⃣ Crear Usuario **[🔴 ADMIN Only]** - **EMPEZAR AQUÍ**

### ✅ Test 1.1: Crear usuario exitosamente como ADMIN

**Endpoint:** `POST /users`  
**Autenticación:** Bearer Token (JWT) - **ADMIN role required**  
**Status Code:** `201 Created`

**Request Body:**

```json
{
  "email": "<email>@example.com",
  "passwordHash": "SecurePassword123!",
  "firstName": "<FirstName>",
  "lastName": "<LastName>",
  "phoneNumber": "+541234567890"
}
```

**Campos requeridos:**

- `email` (string, email format): Email del usuario
- `passwordHash` (string, 8-128 chars): Password con mayúscula, minúscula, número y carácter especial
- `firstName` (string, 2-100 chars): Nombre
- `lastName` (string, 2-100 chars): Apellido

**Campos opcionales:**

- `phoneNumber` (string): Formato internacional (e.g., +541234567890)
- `dateOfBirth` (string, date): Fecha de nacimiento (YYYY-MM-DD)
- `language` (string): Idioma preferido (default: "en")
- `timezone` (string): Zona horaria (default: "UTC")
- `isActive` (boolean): Estado activo (default: true)

**Comando curl:**

```bash
curl -s -X POST "http://localhost:3002/api/v1/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "techlead.test'$(date +%s)'@example.com",
    "passwordHash": "SecurePass123!",
    "firstName": "TechLead",
    "lastName": "TestUser",
    "phoneNumber": "+541234567890"
  }'
```

**Respuesta Esperada (201 Created):**

```json
{
  "statusCode": 201,
  "message": "Created successfully",
  "data": {
    "id": "<USER_UUID>",
    "email": "techlead.test<timestamp>@example.com",
    "firstName": "TechLead",
    "lastName": "TestUser",
    "fullName": "TechLead TestUser",
    "phoneNumber": "+541234567890",
    "dateOfBirth": null,
    "language": "en",
    "timezone": "UTC",
    "isActive": true,
    "emailVerifiedAt": null,
    "lastLoginAt": null,
    "createdAt": "<timestamp>",
    "updatedAt": "<timestamp>"
  },
  "timestamp": "<timestamp>",
  "path": "/api/v1/users"
}
```

**Campos en la respuesta:**

- `id`: UUID del usuario creado (**Guardar como USER_ID**)
- `email`: Email en minúsculas y trimmed automáticamente
- `fullName`: Concatenación de firstName + lastName
- `language`: Default "en" si no se especifica
- `timezone`: Default "UTC" si no se especifica
- `isActive`: Default `true` si no se especifica
- ⚠️ **`passwordHash` NO aparece** en la respuesta (seguridad)
- `emailVerifiedAt`: `null` (usuario no verificado aún)
- `lastLoginAt`: `null` (nunca ha iniciado sesión)

**Guardar USER_ID para tests siguientes:**

```bash
# Extraer el ID del usuario creado (último usuario de la lista)
export USER_ID="<copiar-el-id-de-la-respuesta-anterior>"
echo "USER_ID guardado: $USER_ID"
```

**Checklist:**

- [ ] Status code es 201 Created
- [ ] Email está en minúsculas y trimmed
- [ ] `passwordHash` NO aparece en la respuesta
- [ ] `fullName` está calculado correctamente (firstName + " " + lastName)
- [ ] `isActive` por defecto es `true`
- [ ] `language` por defecto es "en"
- [ ] `timezone` por defecto es "UTC"
- [ ] `emailVerifiedAt` es `null`
- [ ] `lastLoginAt` es `null`
- [ ] Variable `USER_ID` guardada correctamente

---

### ❌ Test 1.2: USER intenta crear usuario (403 Forbidden)

**Endpoint:** `POST /users`  
**Autenticación:** Bearer Token (JWT) - **USER role** (sin permisos ADMIN)  
**Status Code:** `403 Forbidden`

**Propósito:** Verificar que el sistema de RBAC impide que usuarios con rol USER creen otros usuarios.

**Comando curl:**

```bash
curl -s -X POST "http://localhost:3002/api/v1/users" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "forbidden.test'$(date +%s)'@example.com",
    "passwordHash": "SecurePass123!",
    "firstName": "Forbidden",
    "lastName": "Test"
  }'
```

**Respuesta Esperada (403 Forbidden):**

```json
{
  "statusCode": 403,
  "message": "User with role 'USER' does not have access to this resource. Required roles: ADMIN",
  "error": "FORBIDDEN",
  "success": false,
  "timestamp": "<timestamp>",
  "path": "/api/v1/users",
  "method": "POST"
}
```

**Checklist:**

- [ ] Status code es 403 Forbidden
- [ ] Mensaje indica claramente: "Required roles: ADMIN"
- [ ] Error es "FORBIDDEN"
- [ ] `success: false`
- [ ] Usuario NO fue creado en la base de datos

---

### ❌ Test 1.3: Crear usuario con email duplicado (409 Conflict)

**Propósito:** Verificar que el sistema impide crear usuarios con emails duplicados.

**Comando curl:**

```bash
# Usar un email que ya existe (admin@test.com del seed)
curl -s -X POST "http://localhost:3002/api/v1/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "passwordHash": "SecurePassword123!",
    "firstName": "Duplicate",
    "lastName": "Test"
  }'
```

**Respuesta Esperada (409 Conflict):**

```json
{
  "statusCode": 409,
  "message": "User with this email already exists",
  "error": "CONFLICT",
  "success": false,
  "timestamp": "<timestamp>",
  "path": "/api/v1/users",
  "method": "POST"
}
```

**Checklist:**

- [ ] Status code es 409 Conflict
- [ ] Mensaje indica que el email ya existe
- [ ] Email debe ser único en el sistema
- [ ] No se crea usuario duplicado

---

### ❌ Test 1.3: Crear usuario con password débil (400 Bad Request)

**Comando curl:**

```bash
curl -X POST "http://localhost:3002/api/v1/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "weak.password@example.com",
    "passwordHash": "weak",
    "firstName": "Weak",
    "lastName": "Password"
  }'
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
curl -X POST "http://localhost:3002/api/v1/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "passwordHash": "ValidPassword123!",
    "firstName": "Invalid",
    "lastName": "Email"
  }'
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
curl -X POST "http://localhost:3002/api/v1/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid.name@example.com",
    "passwordHash": "ValidPassword123!",
    "firstName": "J",
    "lastName": "123"
  }'
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
curl -X POST "http://localhost:3002/api/v1/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid.phone@example.com",
    "passwordHash": "ValidPassword123!",
    "firstName": "Invalid",
    "lastName": "Phone",
    "phoneNumber": "123456"
  }'
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
curl -X POST "http://localhost:3002/api/v1/users" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "no.auth@example.com",
    "passwordHash": "ValidPassword123!",
    "firstName": "No",
    "lastName": "Auth"
  }'
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

## 2️⃣ Listar Usuarios **[🔴 ADMIN Only]**

### ✅ Test 2.1: Listar usuarios con paginación

**Endpoint:** `GET /users`  
**Autenticación:** Bearer Token (JWT) - **ADMIN role required**  
**Status Code:** `200 OK`

**Query Params opcionales:**

- `page` (number, default: 1): Número de página
- `limit` (number, default: 10, max: 100): Cantidad de resultados por página
- `status` (string, default: 'all'): Filtrar por estado - valores: `'active'`, `'inactive'`, `'all'`
- `search` (string): Búsqueda en firstName, lastName, email
- `sortBy` (string, default: 'createdAt'): Campo de ordenamiento - valores: `'createdAt'`, `'updatedAt'`, `'firstName'`, `'lastName'`, `'email'`
- `sortOrder` (string, default: 'DESC'): Orden - valores: `'ASC'`, `'DESC'`

**⚠️ Nota:** El filtro de estado usa el parámetro `status` (no `isActive`):
- `?status=active` - Solo usuarios activos (`isActive: true`)
- `?status=inactive` - Solo usuarios inactivos (`isActive: false`)
- `?status=all` - Todos los usuarios (default)

**Comando curl:**

```bash
curl -s -X GET "http://localhost:3002/api/v1/users?page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Respuesta Esperada (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "data": [
      {
        "id": "<USER_UUID_1>",
        "email": "<email1>@example.com",
        "firstName": "<FirstName>",
        "lastName": "<LastName>",
        "fullName": "<FirstName> <LastName>",
        "phoneNumber": "<phone_or_null>",
        "dateOfBirth": null,
        "language": "en",
        "timezone": "UTC",
        "isActive": true,
        "emailVerifiedAt": null,
        "lastLoginAt": "<timestamp_or_null>",
        "createdAt": "<timestamp>",
        "updatedAt": "<timestamp>"
      },
      {
        "id": "<USER_UUID_2>",
        "email": "<email2>@example.com",
        "firstName": "<FirstName>",
        "lastName": "<LastName>",
        "fullName": "<FirstName> <LastName>",
        "phoneNumber": null,
        "dateOfBirth": null,
        "language": "en",
        "timezone": "UTC",
        "isActive": true,
        "emailVerifiedAt": null,
        "lastLoginAt": "<timestamp>",
        "createdAt": "<timestamp>",
        "updatedAt": "<timestamp>"
      }
    ],
    "meta": {
      "total": 5,
      "page": 1,
      "limit": 10,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  },
  "timestamp": "<timestamp>",
  "path": "/api/v1/users"
}
```

**Estructura de metadata:**

- `total`: Total de usuarios en la DB
- `page`: Página actual
- `limit`: Usuarios por página
- `totalPages`: Total de páginas
- `hasNext`: Hay página siguiente
- `hasPrev`: Hay página anterior

**Checklist:**

- [ ] Status code es 200 OK
- [ ] Respuesta contiene `data.data` (array de usuarios)
- [ ] Respuesta contiene `data.meta` (información de paginación)
- [ ] Array tiene máximo `limit` elementos
- [ ] ⚠️ `passwordHash` NO aparece en la respuesta
- [ ] `meta.totalPages` está calculado correctamente
- [ ] `fullName` está calculado para cada usuario
- [ ] Campos opcionales pueden ser `null` (phoneNumber, dateOfBirth, emailVerifiedAt, lastLoginAt)

---

### ✅ Test 2.2: Filtrar usuarios activos

**Query Params:** `?status=active`

**Comando curl:**

```bash
curl -s -X GET "http://localhost:3002/api/v1/users?status=active&page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Respuesta Esperada (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "data": [
      {
        "id": "<USER_UUID>",
        "email": "<email>@example.com",
        "firstName": "<FirstName>",
        "lastName": "<LastName>",
        "fullName": "<FirstName> <LastName>",
        "isActive": true,
        ...
      }
    ],
    "meta": {
      "total": 5,
      "page": 1,
      "limit": 10,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

**Checklist:**

- [ ] Status code es 200
- [ ] Todos los usuarios tienen `isActive: true`

---

### ✅ Test 2.3: Filtrar usuarios inactivos

**Query Params:** `?status=inactive`

**Comando curl:**

```bash
curl -s -X GET "http://localhost:3002/api/v1/users?status=inactive&page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Respuesta Esperada (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "data": [],
    "meta": {
      "total": 0,
      "page": 1,
      "limit": 10,
      "totalPages": 0,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

**Nota:** Si hay usuarios eliminados (soft delete), aparecerán aquí con `isActive: false`.

**Checklist:**

- [ ] Status code es 200
- [ ] Todos los usuarios tienen `isActive: false` (o array vacío si no hay inactivos)

---

### ✅ Test 2.4: Buscar usuarios por email

**Query Params:** `?search=john`

**Comando curl:**

```bash
curl -X GET "http://localhost:3002/api/v1/users?search=john" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Checklist:**

- [ ] Status code es 200
- [ ] Usuarios filtrados contienen "john" en email, firstName o lastName

---

### ✅ Test 2.5: Paginación - Página 2

**Query Params:** `?page=2&limit=5`

**Comando curl:**

```bash
curl -X GET "http://localhost:3002/api/v1/users?page=2&limit=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
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
curl -X GET "http://localhost:3002/api/v1/users?sortBy=createdAt&sortOrder=DESC&page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Checklist:**

- [ ] Status code es 200
- [ ] Usuarios ordenados del más reciente al más antiguo

---

## 3️⃣ Obtener Perfil Propio **[🟡 Auth Required]**

### ✅ Test 3.1: Obtener perfil propio

**Endpoint:** `GET /users/profile`  
**Autenticación:** Bearer Token (JWT) - **Cualquier usuario autenticado**  
**Status Code:** `200 OK`

**Propósito:** Endpoint especial para que cualquier usuario autenticado obtenga su propio perfil sin necesidad de conocer su ID.

**Comando curl:**

```bash
curl -s -X GET "http://localhost:3002/api/v1/users/profile" \
  -H "Authorization: Bearer $USER_TOKEN"
```

**Respuesta Esperada (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "id": "<USER_UUID>",
    "email": "<email>@example.com",
    "firstName": "<FirstName>",
    "lastName": "<LastName>",
    "fullName": "<FirstName> <LastName>",
    "phoneNumber": "<phone_or_null>",
    "dateOfBirth": null,
    "language": "en",
    "timezone": "UTC",
    "isActive": true,
    "emailVerifiedAt": null,
    "lastLoginAt": "<timestamp_or_null>",
    "createdAt": "<timestamp>",
    "updatedAt": "<timestamp>"
  },
  "timestamp": "<timestamp>",
  "path": "/api/v1/users/profile"
}
```

**Características:**

- Retorna el perfil del usuario identificado por el token JWT
- No requiere pasar el ID como parámetro
- Funciona con cualquier rol (USER o ADMIN)
- ⚠️ `passwordHash` NO aparece en la respuesta (seguridad)

**Checklist:**

- [ ] Status code es 200 OK
- [ ] Retorna el perfil del usuario autenticado (extraído del token)
- [ ] `passwordHash` NO aparece en la respuesta
- [ ] Incluye todos los campos del usuario
- [ ] Funciona con USER_TOKEN y ADMIN_TOKEN

---

### ❌ Test 3.2: Obtener perfil sin autenticación (401 Unauthorized)

**Comando curl:**

```bash
curl -X GET "http://localhost:3002/api/v1/users/profile"
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

## 4️⃣ Obtener Usuario por ID **[🔴 ADMIN Only]**

### ✅ Test 4.1: Obtener usuario por ID como ADMIN

**Endpoint:** `GET /users/:id`  
**Autenticación:** Bearer Token (JWT) - **ADMIN role required**  
**Status Code:** `200 OK`

**Path Params:**

- `id` (UUID): ID del usuario a obtener

**Comando curl:**

```bash
# Usar el USER_ID guardado anteriormente
curl -s -X GET "http://localhost:3002/api/v1/users/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Respuesta Esperada (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "id": "<USER_UUID>",
    "email": "<email>@example.com",
    "firstName": "<FirstName>",
    "lastName": "<LastName>",
    "fullName": "<FirstName> <LastName>",
    "phoneNumber": "<phone_or_null>",
    "dateOfBirth": null,
    "language": "en",
    "timezone": "UTC",
    "isActive": true,
    "emailVerifiedAt": null,
    "lastLoginAt": null,
    "createdAt": "<timestamp>",
    "updatedAt": "<timestamp>"
  },
  "timestamp": "<timestamp>",
  "path": "/api/v1/users/<USER_UUID>"
}
```

**Características:**

- Solo ADMIN puede obtener información de otros usuarios
- Retorna los mismos campos que `/profile`
- ⚠️ `passwordHash` NO aparece en la respuesta

**Checklist:**

- [ ] Status code es 200 OK
- [ ] Retorna usuario específico por ID
- [ ] `passwordHash` NO aparece en la respuesta
- [ ] Estructura de respuesta idéntica a `/profile`

---

### ❌ Test 4.2: Obtener usuario inexistente (404 Not Found)

**Comando curl:**

```bash
curl -X GET "http://localhost:3002/api/v1/users/00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
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
curl -X GET "http://localhost:3002/api/v1/users/$USER_ID" \
  -H "Authorization: Bearer $USER_TOKEN"
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

## 5️⃣ Actualizar Usuario **[🔴 ADMIN Only]**

### ✅ Test 5.1: ADMIN actualiza usuario por ID

**Endpoint:** `PATCH /users/:id`  
**Autenticación:** Bearer Token (JWT) - **ADMIN role required**  
**Status Code:** `200 OK`

**Restricciones:**

- ⚠️ Solo ADMIN puede actualizar usuarios (incluso el propio perfil)
- NO se puede actualizar `email` (campo único e inmutable)
- NO se puede actualizar `passwordHash` por este endpoint (usar `/auth/change-password`)
- NO se puede actualizar `isActive` por este endpoint (usar `/users/:id/activate` o `/users/:id` DELETE)

**Campos actualizables:**

- `firstName` (string, 2-100 chars): Nombre
- `lastName` (string, 2-100 chars): Apellido
- `phoneNumber` (string, opcional): Teléfono en formato internacional
- `dateOfBirth` (string, date, opcional): Fecha de nacimiento
- `language` (string): Idioma preferido (e.g., "es", "en")
- `timezone` (string): Zona horaria (e.g., "America/Argentina/Buenos_Aires")

**Request Body:**

```json
{
  "firstName": "<UpdatedFirstName>",
  "phoneNumber": "+5491199887766"
}
```

**Comando curl:**

```bash
# Usar el USER_ID guardado anteriormente
curl -s -X PATCH "http://localhost:3002/api/v1/users/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "UpdatedByAdmin",
    "phoneNumber": "+5491199887766"
  }'
```

**Respuesta Esperada (200 OK):**

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "id": "<USER_UUID>",
    "email": "<email>@example.com",
    "firstName": "UpdatedByAdmin",
    "lastName": "<LastName>",
    "fullName": "UpdatedByAdmin <LastName>",
    "phoneNumber": "+5491199887766",
    "dateOfBirth": null,
    "language": "en",
    "timezone": "UTC",
    "isActive": true,
    "emailVerifiedAt": null,
    "lastLoginAt": null,
    "createdAt": "<timestamp>",
    "updatedAt": "<timestamp_updated>"
  },
  "timestamp": "<timestamp>",
  "path": "/api/v1/users/<USER_UUID>",
  "success": true
}
```

**Características:**

- `fullName` se recalcula automáticamente (firstName + " " + lastName)
- `updatedAt` se actualiza automáticamente con el timestamp actual
- Solo se actualizan los campos enviados (partial update)
- ⚠️ `passwordHash` NO aparece en la respuesta

**Checklist:**

- [ ] Status code es 200 OK
- [ ] Campos enviados están actualizados en la respuesta
- [ ] `fullName` se recalculó automáticamente
- [ ] `updatedAt` cambió (timestamp más reciente)
- [ ] `email` NO cambió (campo inmutable)
- [ ] `passwordHash` NO aparece en la respuesta

---

### ❌ Test 5.2: USER intenta actualizar (403 Forbidden)

**Endpoint:** `PATCH /users/:id`  
**Autenticación:** Bearer Token (JWT) - **USER role** (sin permisos ADMIN)  
**Status Code:** `403 Forbidden`

**Propósito:** Verificar que USER no puede actualizar ningún usuario, ni siquiera su propio perfil.

**Comando curl:**

```bash
# Obtener el propio ID del usuario autenticado
MY_USER_ID=$(curl -s -X GET "http://localhost:3002/api/v1/users/profile" \
  -H "Authorization: Bearer $USER_TOKEN" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# Intentar actualizar el propio perfil con USER_TOKEN
curl -s -X PATCH "http://localhost:3002/api/v1/users/$MY_USER_ID" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "AttemptedUpdate",
    "phoneNumber": "+541199887766"
  }'
```

**Respuesta Esperada (403 Forbidden):**

```json
{
  "statusCode": 403,
  "message": "User with role 'USER' does not have access to this resource. Required roles: ADMIN",
  "error": "FORBIDDEN",
  "success": false,
  "timestamp": "<timestamp>",
  "path": "/api/v1/users/<USER_UUID>",
  "method": "PATCH"
}
```

**Checklist:**

- [ ] Status code es 403 Forbidden
- [ ] Mensaje indica: "Required roles: ADMIN"
- [ ] Error es "FORBIDDEN"
- [ ] Usuario NO fue actualizado en la base de datos

---

### ❌ Test 5.3: Actualizar con datos inválidos (400 Bad Request)

**Comando curl:**

```bash
curl -X PATCH "http://localhost:3002/api/v1/users/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "A",
    "phoneNumber": "invalid"
  }'
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

### ✅ Test 6.1: ADMIN elimina usuario (Soft Delete)

**Endpoint:** `DELETE /users/:id`  
**Autenticación:** Bearer Token (JWT) - **ADMIN role required**  
**Status Code:** `204 No Content`

**Propósito:** Soft delete - el usuario se marca con `deletedAt` (TypeORM @DeleteDateColumn) pero NO se elimina físicamente de la base de datos.

**Path Params:**

- `id` (UUID): ID del usuario a eliminar

**Comando curl:**

```bash
# Usar el USER_ID guardado anteriormente
curl -s -X DELETE "http://localhost:3002/api/v1/users/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Respuesta Esperada (204 No Content):**

```
(Sin body, solo status code 204 sin contenido)
```

**Verificar soft delete:**

```bash
# Intentar obtener usuario eliminado (debería retornar 404)
curl -s -X GET "http://localhost:3002/api/v1/users/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Respuesta al GET después del DELETE (404 Not Found):**

```json
{
  "statusCode": 404,
  "message": "User with ID <USER_UUID> not found",
  "error": "NOT_FOUND",
  "success": false,
  "timestamp": "<timestamp>",
  "path": "/api/v1/users/<USER_UUID>",
  "method": "GET"
}
```

**Comportamiento del Soft Delete:**

- Usuario existe en la DB pero con campo `deletedAt` poblado
- TypeORM filtra automáticamente registros con `deletedAt` (WHERE deletedAt IS NULL)
- Usuario NO aparece en GET /users/:id (retorna 404)
- Usuario NO aparece en listado GET /users
- Usuario puede ser reactivado con PATCH /users/:id/activate

**Checklist:**

- [ ] Status code es 204 No Content
- [ ] No hay body en la respuesta del DELETE
- [ ] GET /users/:id retorna 404 Not Found después del DELETE
- [ ] Usuario NO aparece en listado GET /users
- [ ] En DB: campo `deletedAt` tiene timestamp (soft delete)
- [ ] Usuario puede ser recuperado con endpoint `/users/:id/activate`

---

### ❌ Test 6.2: Admin intenta eliminarse a sí mismo (403 Forbidden)

**Endpoint:** `DELETE /users/:id`  
**Autenticación:** Bearer Token (JWT) - ADMIN  
**Status Code:** `403 Forbidden`  
**Nota:** Protección de seguridad - admin no puede auto-eliminarse

**Comando curl:**

```bash
# Obtener ID del usuario admin actual usando /auth/me
ADMIN_USER_ID=$(curl -s -X GET "http://localhost:3002/api/v1/auth/me" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "ADMIN_USER_ID: $ADMIN_USER_ID"

# Intentar eliminar el propio usuario admin
curl -s -X DELETE "http://localhost:3002/api/v1/users/$ADMIN_USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Respuesta Esperada (403 Forbidden):**

```json
{
  "statusCode": 403,
  "message": "Admin users cannot be deleted. Please contact support for assistance.",
  "error": "FORBIDDEN",
  "success": false,
  "timestamp": "<timestamp>",
  "path": "/api/v1/users/<ADMIN_UUID>",
  "method": "DELETE"
}
```

**Checklist:**

- [ ] Status code es 403 Forbidden
- [ ] Admin NO puede eliminarse a sí mismo
- [ ] Mensaje claro de prohibición: "Admin users cannot be deleted"
- [ ] Usuario admin sigue activo después del intento

---

### ❌ Test 6.3: Usuario normal intenta eliminar usuario (403 Forbidden)

**Comando curl:**

```bash
curl -X DELETE "http://localhost:3002/api/v1/users/$USER_ID" \
  -H "Authorization: Bearer $USER_TOKEN"
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
curl -X PATCH "http://localhost:3002/api/v1/users/$USER_ID/activate" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
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

CREATE_RESPONSE=$(curl -s -X POST "http://localhost:3002/api/v1/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"test.user.$TIMESTAMP@example.com\",
    \"passwordHash\": \"TestPassword123!\",
    \"firstName\": \"Test\",
    \"lastName\": \"User\",
    \"phoneNumber\": \"+541234567890\"
  }")

USER_ID=$(echo $CREATE_RESPONSE
EMAIL=$(echo $CREATE_RESPONSE

if [ "$USER_ID" != "null" ]; then
  echo "✅ Usuario creado: $USER_ID"
  echo "   Email: $EMAIL"
else
  echo "❌ Error al crear usuario"
  exit 1
fi

# 2. Listar usuarios
echo "2️⃣ Listando usuarios..."
LIST_RESPONSE=$(curl -s -X GET "http://localhost:3002/api/v1/users?page=1&limit=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

TOTAL_USERS=$(echo $LIST_RESPONSE
echo "✅ Total de usuarios: $TOTAL_USERS"

# 3. Obtener perfil propio
echo "3️⃣ Obteniendo perfil propio..."
PROFILE_RESPONSE=$(curl -s -X GET "http://localhost:3002/api/v1/users/profile" \
  -H "Authorization: Bearer $USER_TOKEN")

PROFILE_EMAIL=$(echo $PROFILE_RESPONSE
echo "✅ Perfil obtenido: $PROFILE_EMAIL"

# 4. Obtener usuario por ID
echo "4️⃣ Obteniendo usuario por ID..."
USER_DETAIL=$(curl -s -X GET "http://localhost:3002/api/v1/users/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

FULL_NAME=$(echo $USER_DETAIL
echo "✅ Usuario obtenido: $FULL_NAME"

# 5. Actualizar usuario
echo "5️⃣ Actualizando usuario..."
UPDATE_RESPONSE=$(curl -s -X PATCH "http://localhost:3002/api/v1/users/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Updated",
    "lastName": "Name",
    "phoneNumber": "+549876543210"
  }')

UPDATED_NAME=$(echo $UPDATE_RESPONSE
echo "✅ Usuario actualizado: $UPDATED_NAME"

# 6. Filtrar usuarios activos
echo "6️⃣ Filtrando usuarios activos..."
ACTIVE_USERS=$(curl -s -X GET "http://localhost:3002/api/v1/users?isActive=true&limit=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

ACTIVE_COUNT=$(echo $ACTIVE_USERS
echo "✅ Usuarios activos en página: $ACTIVE_COUNT"

# 7. Soft delete de usuario
echo "7️⃣ Eliminando usuario (soft delete)..."
DELETE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "http://localhost:3002/api/v1/users/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if [ "$DELETE_RESPONSE" == "204" ]; then
  echo "✅ Usuario eliminado (soft delete)"
else
  echo "❌ Error al eliminar usuario: HTTP $DELETE_RESPONSE"
fi

# 8. Verificar que está inactivo
echo "8️⃣ Verificando estado inactivo..."
DELETED_USER=$(curl -s -X GET "http://localhost:3002/api/v1/users/$USER_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

IS_ACTIVE=$(echo $DELETED_USER
echo "   isActive: $IS_ACTIVE"

if [ "$IS_ACTIVE" == "false" ]; then
  echo "✅ Usuario correctamente inactivo"
else
  echo "❌ Usuario aún activo"
fi

# 9. Activar usuario
echo "9️⃣ Activando usuario..."
ACTIVATE_RESPONSE=$(curl -s -X PATCH "http://localhost:3002/api/v1/users/$USER_ID/activate" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

IS_ACTIVE_AGAIN=$(echo $ACTIVATE_RESPONSE

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
