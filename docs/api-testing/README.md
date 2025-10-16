# 🧪 API Testing Documentation

**Proyecto:** E-commerce Async & Resilient System  
**Propósito:** Guías manuales de testing para todos los módulos de la API  
**Audiencia:** QA Engineers, Tech Leads, Developers

---

## � Quick Start

**¿Primera vez aquí? Comienza con la demo de 5 minutos:**

➡️ **[Quick Start Demo (5 min)](/docs/api-testing/00-QUICK-START-DEMO.md)**

Esta guía express te permite probar el core del sistema (procesamiento asíncrono de órdenes con Saga Pattern) directamente desde Swagger en 5 minutos.

---

## �📋 Descripción General

Este directorio contiene **documentación detallada de testing manual** para cada módulo de la API REST del sistema de e-commerce. Cada documento está diseñado para ser seguido paso a paso, permitiendo a cualquier miembro del equipo técnico validar la funcionalidad completa de cada módulo.

### 🎯 Objetivos

- **Testing Manual Estructurado:** Cada documento proporciona comandos `curl` completos y ejemplos de respuestas esperadas
- **Validación Funcional:** Pruebas de casos exitosos y casos de error para cada endpoint
- **Verificación de Seguridad:** Validación de autenticación, autorización y protección de datos sensibles
- **Documentación de Referencia:** Ejemplos reales de cómo consumir la API correctamente

### 🔑 Características Clave

- ✅ Comandos `curl` listos para ejecutar
- ✅ Respuestas esperadas con estructura JSON completa
- ✅ Checklists de validación para cada test
- ✅ Explicación de roles y permisos (RBAC)
- ✅ Manejo de errores y casos edge
- ✅ Variables de entorno y setup inicial
- ✅ Ejemplos de paginación, filtros y búsqueda

---

## 📚 Módulos Disponibles

### 1️⃣ [Autenticación (Auth)](./01-AUTH-MODULE.md)

**Endpoint Base:** `POST /api/v1/auth`  
**Descripción:** Sistema de autenticación con JWT, registro de usuarios, login, refresh tokens y gestión de perfil.

**Funcionalidades:**

- Registro de nuevos usuarios
- Login con email/password
- Refresh de access tokens
- Obtención de perfil autenticado
- Logout (invalidación de tokens)

**Tests Incluidos:** 15+  
**Autenticación Requerida:** Parcial (algunos endpoints públicos)

---

### 2️⃣ [Productos (Products)](./02-PRODUCTS-MODULE.md)

**Endpoint Base:** `GET/POST/PATCH/DELETE /api/v1/products`  
**Descripción:** Gestión completa del catálogo de productos con búsqueda, paginación, filtros y activación/desactivación.

**Funcionalidades:**

- CRUD completo de productos
- Búsqueda avanzada con filtros
- Paginación y ordenamiento
- Activación/desactivación de productos
- Validación de stock y precios

**Tests Incluidos:** 20+  
**Autenticación Requerida:** Sí (ADMIN para crear/modificar/eliminar)

---

### 3️⃣ [Inventario (Inventory)](./03-INVENTORY-MODULE.md)

**Endpoint Base:** `GET/POST/PUT /api/v1/inventory`  
**Descripción:** Sistema de gestión de inventario con reservas, disponibilidad, control de stock y estadísticas.

**Funcionalidades:**

- Verificación de disponibilidad
- Reserva de stock (con TTL)
- Liberación y fulfillment de reservas
- Agregar/remover stock
- Consultas de bajo stock y sin stock
- Estadísticas de inventario

**Tests Incluidos:** 18+  
**Autenticación Requerida:** Sí (ADMIN para operaciones de stock)

---

### 4️⃣ [Órdenes (Orders)](./04-ORDERS-MODULE.md)

**Endpoint Base:** `GET/POST /api/v1/orders`  
**Descripción:** Procesamiento de órdenes con saga pattern, pagos, reservas de inventario y notificaciones asíncronas.

**Funcionalidades:**

- Creación de órdenes (multi-item)
- Listado de órdenes con filtros
- Obtención de órdenes por ID
- Consulta de estado de orden
- Procesamiento asíncrono (queues)

**Tests Incluidos:** 12+  
**Autenticación Requerida:** Sí (usuarios solo ven sus propias órdenes)

---

### 5️⃣ [Usuarios (Users)](./05-USERS-MODULE.md)

**Endpoint Base:** `GET/POST/PATCH/DELETE /api/v1/users`  
**Descripción:** Gestión de usuarios con RBAC, soft delete, paginación y control de acceso basado en roles.

**Funcionalidades:**

- CRUD de usuarios (ADMIN only)
- Listado con paginación y búsqueda
- Perfil propio (cualquier usuario autenticado)
- Filtros por estado (activo/inactivo)
- Activación de usuarios eliminados
- Soft delete con @DeleteDateColumn

**Tests Incluidos:** 18+  
**Autenticación Requerida:** Sí (ADMIN para gestión, USER para ver propio perfil)

---

### 6️⃣ [Categorías (Categories)](./06-CATEGORIES-MODULE.md)

**Endpoint Base:** `GET/POST/PUT/PATCH/DELETE /api/v1/categories`  
**Descripción:** Gestión jerárquica de categorías con árbol ilimitado, slugs SEO-friendly, breadcrumbs y relaciones parent-child.

**Funcionalidades:**

- Categorías con estructura de árbol recursiva
- Slugs únicos y auto-generados
- Árbol completo con hijos anidados
- Búsqueda por slug (SEO-friendly)
- Path completo (breadcrumb)
- Descendientes con control de profundidad
- Activación/desactivación
- Soft delete

**Tests Incluidos:** 25+  
**Autenticación Requerida:** ADMIN para crear/modificar/eliminar, público para consultas

---

### 7️⃣ [Health & Monitoring](./07-HEALTH-MONITORING-MODULE.md)

**Endpoint Base:** `GET /api/v1/health`, `GET /api/v1/metrics`, `GET /api/v1/admin/queues`  
**Descripción:** Endpoints de salud, métricas Prometheus y dashboard de monitoreo de queues (Bull Board).

**Funcionalidades:**

- Health check general
- Readiness probe (Kubernetes)
- Liveness probe (Kubernetes)
- Detailed health check
- Métricas Prometheus
- Bull Board dashboard (Basic Auth)

**Tests Incluidos:** 7  
**Autenticación Requerida:** No para health/metrics, Basic Auth para Bull Board

**⚠️ Nota Importante:** Redis y Queues health checks están implementados pero NO registrados/habilitados en el HealthModule actual, por lo que no aparecen en las respuestas de health. El dashboard Bull Board sí está funcional y accesible.

---

## 🚀 Cómo Usar Esta Documentación

### Pre-requisitos

Antes de iniciar cualquier testing, asegúrate de tener:

1. **Servidor corriendo:** `npm run start:dev` (puerto 3002)
2. **Base de datos iniciada:** PostgreSQL con migraciones aplicadas (`npm run migration:run`)
3. **Redis corriendo:** Para queues de Bull
4. **Seed data ejecutado:** Ejecutar seeds según necesidad:
   - `npm run seed:run` - Seed inicial (usuarios admin y user)
   - `npm run seed:users` - Solo usuarios
   - `npm run seed:categories` - Categorías de productos
   - `npm run seed:products` - Productos (requiere categorías)
   - `npm run seed:inventory` - Inventario (requiere productos)
   - `npm run seed:all` - Todos los seeds en orden (recomendado para testing completo)

### Variables de Entorno Comunes

Cada documento define sus propias variables, pero estas son las más comunes:

```bash
# Base URL de la API
export BASE_URL="http://localhost:3002/api/v1"

# Tokens de autenticación (obtener desde Auth module)
export ADMIN_TOKEN=""  # Token con rol ADMIN
export USER_TOKEN=""   # Token con rol USER

# IDs de recursos (se obtienen durante los tests)
export USER_ID=""
export PRODUCT_ID=""
export CATEGORY_ID=""
export ORDER_ID=""
```

### 🎨 Testing con Swagger UI (Alternativa Interactiva)

Además del testing manual con `curl`, puedes usar **Swagger UI** para una experiencia más visual e interactiva:

**URL:** `http://localhost:3002/api/docs`

**Características:**

- ✅ **Exploración visual** de todos los endpoints organizados por módulos
- ✅ **Pruebas interactivas** directamente desde el navegador (sin necesidad de curl)
- ✅ **Autenticación integrada**: Click en "Authorize" → Pegar tu JWT token
- ✅ **Esquemas detallados**: Ver estructura completa de request/response bodies
- ✅ **Validación en tiempo real**: Swagger valida tus requests antes de enviarlos
- ✅ **Ejemplos auto-generados**: Pre-poblado con valores de ejemplo
- ✅ **Exportar OpenAPI**: Descargar especificación en formato JSON/YAML

**Cómo usar Swagger:**

1. **Iniciar servidor:** `npm run start:dev`
2. **Abrir Swagger:** Navegar a `http://localhost:3002/api/docs`
3. **Autenticarse:**
   - Click en botón "Authorize" (icono de candado arriba a la derecha)
   - Obtener token desde Auth module (POST `/api/v1/auth/login`)
   - Pegar token en el campo `Bearer <token>`
   - Click "Authorize" y "Close"
4. **Probar endpoints:**
   - Expandir módulo (ej: "products")
   - Click en endpoint (ej: GET `/api/v1/products`)
   - Click "Try it out"
   - Rellenar parámetros si es necesario
   - Click "Execute"
   - Ver respuesta con status code, headers y body

**💡 Tip:** Swagger es ideal para exploración rápida y pruebas ad-hoc. Para testing sistemático y repetible, sigue los documentos de testing manual con `curl`.

---

### Orden Sugerido de Testing

Para una validación completa del sistema, se recomienda seguir este orden:

1. **Auth Module** - Obtener tokens para el resto de los tests
2. **Users Module** - Validar gestión de usuarios y RBAC
3. **Categories Module** - Crear estructura de categorías para productos
4. **Products Module** - Crear productos asociados a categorías
5. **Inventory Module** - Verificar stock y reservas
6. **Orders Module** - Probar flujo completo de órdenes
7. **Health & Monitoring** - Validar estado del sistema

### Estructura de Cada Documento

Todos los documentos siguen la misma estructura para facilitar la lectura:

```markdown
## 📋 Índice de Tests

- Checkbox list de todos los tests

## 🚀 Pre-requisitos

- Setup inicial específico del módulo

## Variables de Entorno

- Variables necesarias para el módulo

## 🔑 Obtener Tokens (si aplica)

- Comandos para autenticación

## Tests Individuales

- Comando curl
- Respuesta esperada
- Checklist de validación
- Explicación de campos importantes

## ⚠️ Respuestas de Error

- Casos de error comunes
```

---

## 🔐 Sistema de Autorización (RBAC)

El sistema implementa control de acceso basado en roles:

### Roles Disponibles

- **ADMIN**: Acceso completo a todos los recursos
- **USER**: Acceso limitado (solo sus propios recursos)

### Niveles de Acceso por Módulo

| Módulo     | Endpoint                  | ADMIN  | USER | Público |
| ---------- | ------------------------- | ------ | ---- | ------- |
| Auth       | POST /auth/register       | ✅     | ✅   | ✅      |
| Auth       | POST /auth/login          | ✅     | ✅   | ✅      |
| Auth       | GET /auth/profile         | ✅     | ✅   | ❌      |
| Users      | POST /users               | ✅     | ❌   | ❌      |
| Users      | GET /users                | ✅     | ❌   | ❌      |
| Users      | GET /users/profile        | ✅     | ✅   | ❌      |
| Products   | POST /products            | ✅     | ❌   | ❌      |
| Products   | GET /products             | ✅     | ✅   | ✅      |
| Categories | POST /categories          | ✅     | ❌   | ❌      |
| Categories | GET /categories           | ✅     | ✅   | ✅      |
| Inventory  | POST /inventory/add-stock | ✅     | ❌   | ❌      |
| Inventory  | GET /inventory            | ✅     | ✅   | ❌      |
| Orders     | POST /orders              | ✅     | ✅   | ❌      |
| Orders     | GET /orders               | ✅     | ✅\* | ❌      |
| Health     | GET /health               | ✅     | ✅   | ✅      |
| Metrics    | GET /metrics              | ✅     | ✅   | ✅      |
| Bull Board | GET /admin/queues         | ✅\*\* | ❌   | ❌      |

\*USER solo ve sus propias órdenes  
\*\*Requiere Basic Auth (no JWT)

---

## 📊 Formato de Respuestas

Todos los endpoints siguen un formato estándar de respuesta:

### Respuesta Exitosa

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    // Datos del recurso
  },
  "timestamp": "2025-10-15T00:00:00.000Z",
  "path": "/api/v1/resource",
  "success": true
}
```

### Respuesta con Paginación

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": {
    "data": [
      /* array de items */
    ],
    "meta": {
      "total": 100,
      "page": 1,
      "limit": 10,
      "totalPages": 10,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  },
  "timestamp": "2025-10-15T00:00:00.000Z",
  "path": "/api/v1/resource",
  "success": true
}
```

### Respuesta de Error

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "BAD_REQUEST",
  "details": ["Field 'email' must be a valid email address"],
  "timestamp": "2025-10-15T00:00:00.000Z",
  "path": "/api/v1/resource",
  "method": "POST",
  "correlationId": "uuid-here",
  "success": false
}
```

### Códigos de Estado Comunes

| Código | Significado           | Uso                                     |
| ------ | --------------------- | --------------------------------------- |
| 200    | OK                    | Operación exitosa (GET, PATCH, PUT)     |
| 201    | Created               | Recurso creado exitosamente (POST)      |
| 204    | No Content            | Recurso eliminado exitosamente (DELETE) |
| 400    | Bad Request           | Validación fallida o request inválido   |
| 401    | Unauthorized          | Token faltante o inválido               |
| 403    | Forbidden             | Sin permisos suficientes (RBAC)         |
| 404    | Not Found             | Recurso no encontrado                   |
| 409    | Conflict              | Conflicto (ej: email duplicado)         |
| 500    | Internal Server Error | Error del servidor                      |
| 503    | Service Unavailable   | Servicio no disponible (health checks)  |

---

## 🛠️ Herramientas Recomendadas

### Para Testing Manual

- **curl** - Incluido en los ejemplos de cada documento
- **Postman** - Importar colecciones desde los comandos curl
- **Insomnia** - Alternativa a Postman
- **HTTPie** - CLI más amigable que curl
- **Swagger UI** - 📚 Documentación interactiva en `http://localhost:3002/api/docs`
  - Explorar todos los endpoints disponibles
  - Probar requests directamente desde el navegador
  - Ver esquemas completos de request/response
  - Autenticación JWT integrada (botón "Authorize")
  - Exportar especificaciones OpenAPI

### Para Monitoreo

- **Bull Board** - Dashboard web para queues (incluido en el proyecto)
- **Prometheus** - Scraping de métricas (`/api/v1/metrics`)
- **Grafana** - Visualización de métricas de Prometheus

### Para Automatización

- **Jest + Supertest** - Tests E2E automatizados (ver `/test/e2e`)
- **GitHub Actions** - CI/CD pipelines
- **Postman Collections** - Test runners automatizados

---

## 📝 Convenciones de Nomenclatura

### Variables de Entorno

- Mayúsculas con guiones bajos: `ADMIN_TOKEN`, `BASE_URL`
- Prefijo por tipo: `USER_`, `PRODUCT_`, `ORDER_`

### Placeholders en Ejemplos

- UUIDs: `<USER_UUID>`, `uuid-generado`
- Timestamps: `<timestamp>`, `2025-10-15T00:00:00.000Z`
- Valores dinámicos: `<nombre-campo>`

### Comandos curl

- Una línea por flag para legibilidad
- Headers explícitos (`-H "Authorization: Bearer $TOKEN"`)
- JSON formateado con `python -m json.tool` o `jq`

---

## 🐛 Troubleshooting

### Puerto ya en uso (EADDRINUSE)

```bash
# Windows
netstat -ano | findstr :3002
taskkill //PID <PID> //F

# Linux/Mac
lsof -ti:3002 | xargs kill -9
```

### Base de datos no responde

```bash
# Verificar PostgreSQL corriendo
npm run db:status

# Ejecutar migraciones
npm run migration:run

# Ejecutar seed
npm run seed:run
```

### Redis no disponible

```bash
# Verificar Redis corriendo
redis-cli ping  # Debe responder: PONG

# En Windows con Memurai
memurai-cli ping
```

### Tokens expirados

```bash
# Los tokens expiran después de 15 minutos
# Volver a obtener tokens desde Auth module
curl -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Admin123!"}'
```

---

## 🔄 Actualizaciones y Mantenimiento

### Última Actualización

**Fecha:** 2025-10-15  
**Versión API:** v1  
**Estado:** ✅ Todos los módulos documentados y probados

### Cambios Recientes

- ✅ Agregada documentación de Swagger UI y testing interactivo
- ✅ Corrección de comandos de seeds (seed:run → seed:all para testing completo)
- ✅ Corrección de puerto (3000 → 3002) en Health module
- ✅ Documentación de Redis/Queues health checks (implementados pero no registrados)
- ✅ Actualización de ejemplos de respuesta con wrapper estándar
- ✅ Corrección de rutas con prefijo `/api/v1`

### Contribuir

Si encuentras discrepancias entre la documentación y el comportamiento real de la API:

1. Verifica que el servidor esté en la última versión
2. Ejecuta los tests manuales siguiendo el documento al pie de la letra
3. Documenta las diferencias encontradas
4. Crea un issue o PR con las correcciones necesarias

---

## 📚 Recursos Adicionales

### Documentación Interactiva

- **[📚 Swagger UI - Documentación API Interactiva](http://localhost:3002/api/docs)**
  - Exploración visual de todos los endpoints
  - Testing interactivo desde el navegador
  - Esquemas completos de request/response
  - Autenticación JWT integrada
  - Especificaciones OpenAPI exportables

### Documentación Técnica

- [Arquitectura del Sistema](../ARCHITECTURE.md)
- [Diseño de Base de Datos](../DATABASE_DESIGN.md)

### ADRs (Architecture Decision Records)

- [ADR Directory](../adr/README.md)
- Decisiones arquitectónicas documentadas

### Testing Automatizado

- Tests E2E en `/test/e2e`
- Tests unitarios en cada módulo (`*.spec.ts`)

---

## 📧 Contacto y Soporte

Para preguntas o problemas relacionados con esta documentación:

- **Issues:** GitHub Issues del proyecto
- **Tech Lead:** Ver CODEOWNERS
- **Documentación:** Este directorio `/docs/api-testing`

---

**Happy Testing! 🚀**
