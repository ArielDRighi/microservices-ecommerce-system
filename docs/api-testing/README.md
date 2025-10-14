# 📚 Guía Completa de Testing de API - E-commerce Async Resilient System

**Proyecto:** E-commerce Async Resilient System  
**Arquitectura:** Microservicios asíncronos con NestJS, PostgreSQL, Redis, Bull Queues  
**Autor:** Ariel D. Righi  
**Última Actualización:** 2025-10-14

---

## 🔐 Control de Acceso (RBAC)

Este sistema implementa **Role-Based Access Control (RBAC)** con dos roles principales:

### Roles del Sistema

| Rol         | Descripción               | Acceso                                               |
| ----------- | ------------------------- | ---------------------------------------------------- |
| **ADMIN**   | Administrador del sistema | Acceso completo: crear, modificar, eliminar recursos |
| **USER**    | Usuario estándar          | Lectura + operaciones propias (órdenes, reservas)    |
| **Público** | Sin autenticación         | Solo lectura en endpoints públicos                   |

### Operaciones por Rol

**🔴 ADMIN Only:**

- Crear/modificar/eliminar productos
- Crear/modificar/eliminar categorías
- Crear/agregar/remover inventario
- Gestionar usuarios (CRUD)

**🟡 Auth Required (USER/ADMIN):**

- Crear órdenes
- Ver perfil propio
- Reservar/liberar stock
- Ver estadísticas de inventario

**🟢 Público (sin auth):**

- Listar productos y categorías
- Ver detalles de productos
- Buscar en catálogo
- Verificar disponibilidad de stock

### Obtener Tokens por Rol

```bash
# Token de ADMINISTRADOR
export ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Admin123!@#"
  }' | jq -r '.data.accessToken')

# Token de USUARIO
export USER_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com",
    "password": "User123!@#"
  }' | jq -r '.data.accessToken')

echo "Admin Token: $ADMIN_TOKEN"
echo "User Token: $USER_TOKEN"
```

### Códigos de Error de Autorización

| Código               | Significado       | Cuándo ocurre                                                                    |
| -------------------- | ----------------- | -------------------------------------------------------------------------------- |
| **401 Unauthorized** | Sin autenticación | No se envió token JWT o es inválido                                              |
| **403 Forbidden**    | Sin permisos      | Usuario autenticado pero sin rol requerido (ej: USER intentando operación ADMIN) |

### Seguridad Adicional

**Rate Limiting:**

- Login: 5 requests/minuto
- Register: 3 requests/hora
- General: 10 requests/minuto

**Bull Board Dashboard:**

- Protegido con Basic Authentication
- Credenciales: `BULL_BOARD_USERNAME` y `BULL_BOARD_PASSWORD` (env vars)
- Sin credenciales válidas = 401 Unauthorized

---

## 📋 Índice de Módulos

### 🔐 Autenticación & Usuarios

- **[01 - Auth Module](./01-AUTH-MODULE.md)** - 6 endpoints
  - Registro, Login, Refresh Token, Profile, Logout
  - JWT Authentication con refresh tokens
  - **Rate Limiting:** Login (5/min), Register (3/hr)
  - **Tests:** 25+ | **Status:** ✅ Completado

- **[05 - Users Module](./05-USERS-MODULE.md)** - 6 endpoints **[🔴 ADMIN Only]**
  - CRUD de usuarios, paginación, soft delete con @DeleteDateColumn
  - Protección contra auto-eliminación de admin
  - **RBAC:** Solo ADMIN puede gestionar usuarios
  - **Tests:** 35+ | **Status:** ✅ Completado

### 🛍️ Catálogo & Productos

- **[02 - Products Module](./02-PRODUCTS-MODULE.md)** - 8 endpoints
  - CRUD completo **[🔴 ADMIN Only]**, búsqueda, filtros avanzados **[🟢 Público]**
  - **Precio mínimo:** $0.50 (constante: PRODUCT_PRICE.MIN)
  - **RBAC:** Admin crea/modifica/elimina, público consulta
  - **Tests:** 35+ | **Status:** ✅ Completado

- **[06 - Categories Module](./06-CATEGORIES-MODULE.md)** - 11 endpoints
  - CRUD **[🔴 ADMIN Only]**, consultas **[🟢 Público]**
  - Jerarquía de árbol ilimitada, slugs SEO
  - Soft delete con @DeleteDateColumn (deletedAt)
  - **Tests:** 40+ | **Status:** ✅ Completado

### 🛒 Órdenes & Ventas

- **[03 - Orders Module](./03-ORDERS-MODULE.md)** - 4 endpoints
  - Procesamiento asíncrono con saga pattern
  - Idempotencia, estados progresivos
  - **Tests:** 15+ | **Status:** ✅ Completado

### 📦 Inventario

- **[03 - Inventory Module](./03-INVENTORY-MODULE.md)** - 16 endpoints
  - Crear/agregar/remover stock **[🔴 ADMIN Only]**
  - Reservas con TTL **[🟡 Auth Required]**, consultas **[🟢 Público]**
  - **RBAC:** Operaciones de stock solo para ADMIN
  - **Tests:** 45+ | **Status:** ✅ Completado

### 🏥 Monitoreo & Salud

- **[07 - Health & Monitoring Module](./07-HEALTH-MONITORING-MODULE.md)** - 6 endpoints
  - Health checks (Kubernetes ready) **[🟢 Público]**
  - Prometheus metrics **[🟢 Público]**
  - **Bull Board dashboard [🔐 Basic Auth]** (BULL_BOARD_USERNAME/PASSWORD)
  - **Tests:** 5+ | **Status:** ✅ Completado

---

## 📊 Resumen Ejecutivo

| Módulo     | Endpoints | Tests    | RBAC   | Seguridad         | Prioridad | Complejidad |
| ---------- | --------- | -------- | ------ | ----------------- | --------- | ----------- |
| Auth       | 6         | 25+      | ✅     | Rate Limiting     | 🔴 Alta   | Media       |
| Products   | 8         | 35+      | ✅     | ADMIN Only (CUD)  | 🔴 Alta   | Media       |
| Orders     | 4         | 15+      | ✅     | Auth Required     | 🔴 Alta   | Alta        |
| Users      | 6         | 35+      | ✅     | ADMIN Only        | 🟡 Media  | Media       |
| Categories | 11        | 40+      | ✅     | ADMIN Only (CUD)  | 🟡 Media  | Alta        |
| Inventory  | 16        | 45+      | ✅     | ADMIN (stock ops) | 🔴 Alta   | Muy Alta    |
| Health     | 6         | 5+       | ✅     | Bull Board Auth   | 🟢 Baja   | Baja        |
| **TOTAL**  | **57**    | **200+** | **✅** | **Completado**    | -         | -           |

---

## 🚀 Quick Start

### 1. Configurar Variables de Entorno

```bash
# Base URL
export BASE_URL="http://localhost:3000"

# Autenticación
export TOKEN=""
export ADMIN_TOKEN=""
export REFRESH_TOKEN=""

# IDs de recursos
export USER_ID=""
export PRODUCT_ID=""
export ORDER_ID=""
export CATEGORY_ID=""
```

### 2. Obtener Token de Autenticación

```bash
# Login como usuario normal
export TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "YourPassword123!"
  }' | jq -r '.accessToken')

echo "Token: $TOKEN"

# Login como admin
export ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "AdminPassword123!"
  }' | jq -r '.accessToken')

echo "Admin Token: $ADMIN_TOKEN"
```

### 3. Verificar Salud del Sistema

```bash
# Health check
curl -X GET "$BASE_URL/health" | jq '.'

# Métricas Prometheus
curl -X GET "$BASE_URL/metrics"

# Bull Board Dashboard
open "http://localhost:3000/admin/queues"
```

---

## 🧪 Flujos de Testing Recomendados

### Flujo 1: Testing de Usuario Nuevo (Happy Path)

```bash
#!/bin/bash
# Flujo completo de usuario nuevo realizando compra

BASE_URL="http://localhost:3000"

echo "=== 🛍️ Flujo de Usuario Nuevo ==="

# 1. Registro
echo "1️⃣ Registrando usuario..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePassword123!",
    "firstName": "New",
    "lastName": "User"
  }')

TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.accessToken')
echo "✅ Usuario registrado. Token obtenido."

# 2. Listar productos
echo "2️⃣ Buscando productos..."
PRODUCTS=$(curl -s -X GET "$BASE_URL/products?limit=5")
PRODUCT_ID=$(echo $PRODUCTS | jq -r '.data[0].id')
echo "✅ Producto seleccionado: $PRODUCT_ID"

# 3. Verificar stock
echo "3️⃣ Verificando stock..."
STOCK=$(curl -s -X POST "$BASE_URL/inventory/check-availability" \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"quantity\": 2
  }")

AVAILABLE=$(echo $STOCK | jq -r '.available')
echo "✅ Stock disponible: $AVAILABLE"

# 4. Crear orden
echo "4️⃣ Creando orden..."
ORDER=$(curl -s -X POST "$BASE_URL/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"items\": [{
      \"productId\": \"$PRODUCT_ID\",
      \"quantity\": 2,
      \"price\": 99.99
    }],
    \"shippingAddress\": {
      \"street\": \"123 Main St\",
      \"city\": \"Buenos Aires\",
      \"state\": \"CABA\",
      \"postalCode\": \"1000\",
      \"country\": \"Argentina\"
    },
    \"paymentMethod\": \"CREDIT_CARD\",
    \"idempotencyKey\": \"order_$(date +%s)\"
  }")

ORDER_ID=$(echo $ORDER | jq -r '.id')
ORDER_STATUS=$(echo $ORDER | jq -r '.status')
echo "✅ Orden creada: $ORDER_ID (Status: $ORDER_STATUS)"

# 5. Monitorear orden
echo "5️⃣ Monitoreando orden..."
sleep 3

ORDER_STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/orders/$ORDER_ID/status" \
  -H "Authorization: Bearer $TOKEN")

FINAL_STATUS=$(echo $ORDER_STATUS_RESPONSE | jq -r '.status')
echo "✅ Estado final: $FINAL_STATUS"

echo ""
echo "=== ✅ Flujo completado exitosamente ==="
```

### Flujo 2: Testing de Admin (Gestión de Catálogo)

```bash
#!/bin/bash
# Flujo de admin gestionando catálogo

BASE_URL="http://localhost:3000"
ADMIN_TOKEN="your-admin-token"

echo "=== 👨‍💼 Flujo de Administrador ==="

# 1. Crear categoría
echo "1️⃣ Creando categoría..."
CATEGORY=$(curl -s -X POST "$BASE_URL/categories" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Electronics",
    "slug": "electronics"
  }')

CATEGORY_ID=$(echo $CATEGORY | jq -r '.id')
echo "✅ Categoría creada: $CATEGORY_ID"

# 2. Crear producto
echo "2️⃣ Creando producto..."
PRODUCT=$(curl -s -X POST "$BASE_URL/products" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Laptop Pro 2024\",
    \"description\": \"High-performance laptop\",
    \"price\": 1299.99,
    \"sku\": \"LAPTOP-2024-001\",
    \"categoryId\": \"$CATEGORY_ID\",
    \"stock\": 50
  }")

PRODUCT_ID=$(echo $PRODUCT | jq -r '.id')
echo "✅ Producto creado: $PRODUCT_ID"

# 3. Agregar stock
echo "3️⃣ Agregando stock adicional..."
ADD_STOCK=$(curl -s -X POST "$BASE_URL/inventory/add-stock" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"quantity\": 100,
    \"reason\": \"Stock replenishment\"
  }")

NEW_QUANTITY=$(echo $ADD_STOCK | jq -r '.newQuantity')
echo "✅ Stock agregado. Nuevo total: $NEW_QUANTITY"

# 4. Ver estadísticas
echo "4️⃣ Obteniendo estadísticas de inventario..."
STATS=$(curl -s -X GET "$BASE_URL/inventory/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

TOTAL_PRODUCTS=$(echo $STATS | jq -r '.totalProducts')
echo "✅ Total de productos en sistema: $TOTAL_PRODUCTS"

echo ""
echo "=== ✅ Flujo de admin completado ==="
```

### Flujo 3: Testing de Inventario (Reservas con TTL)

```bash
#!/bin/bash
# Flujo de testing de sistema de reservas

BASE_URL="http://localhost:3000"
TOKEN="your-token"

echo "=== 📦 Testing de Reservas con TTL ==="

# 1. Obtener producto
PRODUCT_ID=$(curl -s -X GET "$BASE_URL/products?limit=1" | jq -r '.data[0].id')

# 2. Verificar stock inicial
echo "1️⃣ Stock inicial..."
INITIAL=$(curl -s -X GET "$BASE_URL/inventory/product/$PRODUCT_ID")
INITIAL_AVAILABLE=$(echo $INITIAL | jq -r '.availableQuantity')
echo "   Disponible: $INITIAL_AVAILABLE"

# 3. Reservar stock
echo "2️⃣ Reservando stock..."
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

echo "   Reserva creada: $RESERVATION_ID"
EXPIRES_AT=$(echo $RESERVE | jq -r '.expiresAt')
echo "   Expira en: $EXPIRES_AT"

# 4. Verificar stock después de reserva
echo "3️⃣ Stock después de reserva..."
AFTER_RESERVE=$(curl -s -X GET "$BASE_URL/inventory/product/$PRODUCT_ID")
AFTER_AVAILABLE=$(echo $AFTER_RESERVE | jq -r '.availableQuantity')
RESERVED=$(echo $AFTER_RESERVE | jq -r '.reservedQuantity')
echo "   Disponible: $AFTER_AVAILABLE"
echo "   Reservado: $RESERVED"

# 5. Liberar reserva
echo "4️⃣ Liberando reserva..."
RELEASE=$(curl -s -X PUT "$BASE_URL/inventory/release-reservation" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"reservationId\": \"$RESERVATION_ID\"
  }")

echo "   Reserva liberada"

# 6. Verificar stock final
echo "5️⃣ Stock final..."
FINAL=$(curl -s -X GET "$BASE_URL/inventory/product/$PRODUCT_ID")
FINAL_AVAILABLE=$(echo $FINAL | jq -r '.availableQuantity')
echo "   Disponible: $FINAL_AVAILABLE"

echo ""
echo "=== ✅ Testing de reservas completado ==="
```

---

## 🔧 Herramientas Recomendadas

### Testing Manual

- **curl** - Línea de comandos (incluido en guías)
- **Postman** - UI para testing de APIs
- **Insomnia** - Alternativa a Postman
- **HTTPie** - Cliente HTTP user-friendly

### Testing Automatizado

- **Jest** - Framework de testing (usado en el proyecto)
- **Supertest** - Testing de APIs HTTP
- **Newman** - Postman CLI para CI/CD

### Monitoreo

- **Prometheus** - Métricas (`/metrics`)
- **Grafana** - Visualización de métricas
- **Bull Board** - Dashboard de queues (`/admin/queues`)
- **Swagger UI** - Documentación interactiva (`/api`)

### Debugging

- **Chrome DevTools** - Network inspection
- **Redis Commander** - Visualizar Redis
- **pgAdmin** - Gestión de PostgreSQL

---

## 📝 Convenciones de Testing

### Estructura de Tests

Cada módulo sigue esta estructura:

1. **Variables de Entorno** - Setup inicial
2. **Casos de Éxito (✅)** - Happy path scenarios
3. **Casos de Error (❌)** - Error handling
4. **Edge Cases** - Casos límite
5. **Script Automatizado** - Testing completo

### Códigos de Estado HTTP

| Código  | Significado           | Uso                                                                     |
| ------- | --------------------- | ----------------------------------------------------------------------- |
| 200     | OK                    | GET exitoso, operación completada                                       |
| 201     | Created               | POST exitoso, recurso creado                                            |
| 202     | Accepted              | Procesamiento asíncrono iniciado                                        |
| 204     | No Content            | DELETE exitoso, sin body                                                |
| 400     | Bad Request           | Validación fallida, datos inválidos                                     |
| **401** | **Unauthorized**      | **Sin autenticación, token inválido/ausente**                           |
| **403** | **Forbidden**         | **Autenticado pero sin permisos (ej: USER intentando operación ADMIN)** |
| 404     | Not Found             | Recurso no encontrado                                                   |
| 409     | Conflict              | Conflicto (e.g., email duplicado)                                       |
| 422     | Unprocessable Entity  | Lógica de negocio inválida                                              |
| **429** | **Too Many Requests** | **Rate limit excedido**                                                 |
| 500     | Internal Server Error | Error del servidor                                                      |
| 503     | Service Unavailable   | Servicio no disponible                                                  |

### Diferencia entre 401 y 403

| Aspecto         | 401 Unauthorized           | 403 Forbidden                                   |
| --------------- | -------------------------- | ----------------------------------------------- |
| **Significado** | No identificado            | Identificado pero sin permisos                  |
| **Token JWT**   | No enviado o inválido      | Válido pero rol insuficiente                    |
| **Ejemplo**     | Sin header `Authorization` | USER intentando crear producto (requiere ADMIN) |
| **Solución**    | Obtener token válido       | Obtener token con rol correcto (ADMIN)          |

### Formato de Respuestas

**Respuesta exitosa:**

```json
{
  "id": "uuid",
  "field1": "value1",
  "createdAt": "2025-10-11T10:00:00.000Z"
}
```

**Respuesta con error:**

```json
{
  "statusCode": 400,
  "message": ["field must be valid"],
  "error": "Bad Request"
}
```

**Respuesta paginada:**

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

---

## 🎯 Checklist de Testing

### Pre-requisitos

- [ ] Aplicación corriendo en `http://localhost:3000`
- [ ] Base de datos PostgreSQL iniciada
- [ ] Redis iniciado
- [ ] Variables de entorno configuradas
- [ ] `jq` instalado para parsear JSON

### Testing por Módulo

- [ ] Auth Module - Autenticación funcional
- [ ] Users Module - CRUD de usuarios
- [ ] Products Module - Gestión de productos
- [ ] Categories Module - Jerarquía de categorías
- [ ] Orders Module - Procesamiento asíncrono
- [ ] Inventory Module - Reservas y stock
- [ ] Health Module - Monitoreo

### Testing de Integración

- [ ] Flujo completo: Registro → Login → Crear orden
- [ ] Flujo admin: Crear categoría → Crear producto
- [ ] Flujo inventario: Reservar → Fulfill/Release
- [ ] Idempotencia funciona en Orders
- [ ] TTL de reservas funciona correctamente
- [ ] Queues procesando jobs

### Performance

- [ ] Endpoints responden en < 100ms (sin procesamiento pesado)
- [ ] Paginación funciona con datasets grandes
- [ ] Filtros y búsquedas son eficientes
- [ ] No hay memory leaks (verificar `/health/detailed`)

### Seguridad

- [ ] Endpoints protegidos requieren autenticación (401)
- [ ] RBAC: Roles (ADMIN/USER) funcionan correctamente (403)
- [ ] Tokens JWT expiran correctamente
- [ ] Rate limiting en auth (login: 5/min, register: 3/hr) (429)
- [ ] Validaciones de input funcionan (400)
- [ ] No se exponen datos sensibles (passwords)
- [ ] Bull Board protegido con Basic Auth
- [ ] Soft delete funciona con @DeleteDateColumn (deletedAt)
- [ ] Admin no puede eliminarse a sí mismo
- [ ] USER recibe 403 al intentar operaciones ADMIN

---

## 📞 Soporte y Contacto

**Repositorio:** [github.com/ArielDRighi/ecommerce-async-resilient-system](https://github.com/ArielDRighi/ecommerce-async-resilient-system)  
**Branch:** `docs/complete-documentation`  
**Autor:** Ariel D. Righi  
**Email:** [tu-email@example.com]

---

## 📄 Licencia

Este proyecto y su documentación están bajo la licencia MIT. Ver archivo `LICENSE` para más detalles.

---

## 🔒 Resumen de Seguridad Implementada

**✅ RBAC (Role-Based Access Control):** Control de acceso por roles (ADMIN/USER/Público) en todos los módulos  
**✅ Rate Limiting:** Protección contra ataques de fuerza bruta en autenticación (5 req/min login, 3 req/hr register)  
**✅ Soft Delete:** Eliminación lógica con `@DeleteDateColumn` preservando histórico de datos  
**✅ Bull Board Auth:** Dashboard de colas protegido con Basic Authentication  
**✅ Admin Protection:** Validación para prevenir auto-eliminación de administradores  
**✅ Price Validation:** Precio mínimo configurado en $0.50 (PRODUCT_PRICE.MIN)  
**✅ Authorization Tests:** Pruebas 403 para verificar restricciones de permisos  
**✅ JWT Expiration:** Tokens con tiempo de vida limitado

> **Nota de Seguridad:** Todos los endpoints administrativos están protegidos con el decorador `@Roles('ADMIN')` y retornan `403 Forbidden` cuando un usuario con rol USER intenta acceder.

---

**Última Actualización:** 2025-10-14  
**Versión de Documentación:** 2.0.0  
**Tests Totales:** 200+  
**Cobertura de Código:** 74.66%  
**Estado:** ✅ Producción Ready con RBAC implementado
