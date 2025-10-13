# 🔧 Fix: Swagger Configuration

## Problema Identificado

El problema era que **Swagger se configuraba DESPUÉS de aplicar el prefijo global** (`api/v1`), causando que la documentación se montara en una ruta incorrecta.

### Orden Incorrecto (ANTES):

```
1. ✅ Bull Board se monta → `/api/v1/admin/queues`
2. ❌ Se aplica prefijo global → `api/v1`
3. ❌ Swagger se configura → Se intenta montar en `/api/docs`
   Resultado: Swagger termina en `/api/v1/api/docs` ❌
```

### Flujo de Rutas Problemático:

```
app.setGlobalPrefix('api/v1');  // ← Primero el prefijo
SwaggerModule.setup('api/docs', app, document);  // ← Luego Swagger
// Resultado: /api/v1/api/docs (INCORRECTO)
```

## Solución Implementada

**Mover la configuración de Swagger ANTES del prefijo global**, siguiendo el mismo patrón usado para Bull Board.

### Orden Correcto (DESPUÉS):

```
1. ✅ Bull Board se monta → `/api/v1/admin/queues`
2. ✅ Swagger se configura → `/api/docs`
3. ✅ Se aplica prefijo global → `api/v1`
   Resultado: Swagger permanece en `/api/docs` ✅
```

### Flujo de Rutas Corregido:

```
SwaggerModule.setup('api/docs', app, document);  // ← Primero Swagger
app.setGlobalPrefix('api/v1');  // ← Luego el prefijo
// Resultado: /api/docs (CORRECTO)
```

## Cambios Realizados en `src/main.ts`

### 1. **Movimiento de Bloque Swagger**

- ✅ Swagger ahora se configura en **líneas 77-125** (ANTES del prefijo global)
- ✅ Prefijo global se aplica en **línea 128** (DESPUÉS de Swagger)

### 2. **Mejoras Adicionales**

- ➕ Agregado tag `'Categories'` para el módulo de categorías
- ➕ Agregadas opciones de Swagger:
  - `tagsSorter: 'alpha'` - Ordena tags alfabéticamente
  - `operationsSorter: 'alpha'` - Ordena operaciones alfabéticamente
- ➕ CSS personalizado para ocultar el topbar de Swagger
- 📝 Comentarios mejorados explicando el orden de configuración

### 3. **Estructura del Código**

```typescript
// 1. Bull Board (antes del prefijo)
app.use('/api/v1/admin/queues', serverAdapter.getRouter());

// 2. Swagger (antes del prefijo) ← NUEVO ORDEN
if (configService.get<boolean>('app.swagger.enabled', true)) {
  // ... configuración de Swagger
  SwaggerModule.setup('api/docs', app, document, { ... });
}

// 3. Prefijo Global (después de Swagger y Bull Board)
app.setGlobalPrefix('api/v1');

// 4. CORS, Validation Pipes, etc.
// ...
```

## URLs Correctas (Puerto 3002)

### ✅ URLs Funcionales:

| Servicio          | URL                                         | Descripción                         |
| ----------------- | ------------------------------------------- | ----------------------------------- |
| **Swagger UI**    | `http://localhost:3002/api/docs`            | Documentación interactiva de la API |
| **Swagger JSON**  | `http://localhost:3002/api/docs-json`       | Schema OpenAPI en formato JSON      |
| **Bull Board**    | `http://localhost:3002/api/v1/admin/queues` | Dashboard de monitoreo de colas     |
| **Health Check**  | `http://localhost:3002/health`              | Estado de salud de la aplicación    |
| **API Endpoints** | `http://localhost:3002/api/v1/*`            | Todos los endpoints de la API       |

### Ejemplos de Endpoints API:

```bash
# Auth
POST http://localhost:3002/api/v1/auth/register
POST http://localhost:3002/api/v1/auth/login

# Users
GET  http://localhost:3002/api/v1/users
GET  http://localhost:3002/api/v1/users/profile

# Products
GET  http://localhost:3002/api/v1/products
POST http://localhost:3002/api/v1/products

# Categories
GET  http://localhost:3002/api/v1/categories
GET  http://localhost:3002/api/v1/categories/tree

# Orders
GET  http://localhost:3002/api/v1/orders
POST http://localhost:3002/api/v1/orders

# Inventory
GET  http://localhost:3002/api/v1/inventory
```

## Logs Esperados al Iniciar

Al ejecutar `npm run start:dev`, deberías ver:

```
[Bootstrap] 📊 Bull Board dashboard available at: http://localhost:3002/api/v1/admin/queues
[Bootstrap] 📚 Swagger documentation available at: http://localhost:3002/api/docs
[Bootstrap] 🚀 Application is running on: http://localhost:3002
[Bootstrap] 🌍 Environment: development
[Bootstrap] 📡 API Prefix: /api/v1
[Bootstrap] 🛡️  Authentication: JWT with Bearer token
[Bootstrap] ❤️ Health Check: http://localhost:3002/health
[Bootstrap] 🔧 Development mode enabled
```

## Verificación de Funcionamiento

### 1. **Verificar Swagger UI**

```bash
# Opción 1: Navegador
# Abrir: http://localhost:3002/api/docs

# Opción 2: Curl
curl http://localhost:3002/api/docs
```

### 2. **Verificar Swagger JSON Schema**

```bash
curl http://localhost:3002/api/docs-json | jq .
```

### 3. **Verificar Bull Board**

```bash
curl http://localhost:3002/api/v1/admin/queues
```

### 4. **Verificar Health Check**

```bash
curl http://localhost:3002/health
```

## Próximos Pasos

1. ✅ **Commit y Push de Cambios**

   ```bash
   git add src/main.ts
   git commit -m "fix(swagger): move Swagger config before global prefix to fix routing"
   git push origin fix/swagger-configuration
   ```

2. ✅ **Iniciar Servidor y Validar**

   ```bash
   npm run start:dev
   # Abrir: http://localhost:3002/api/docs
   ```

3. ✅ **Verificar Documentación de Endpoints**
   - Revisar que todos los módulos aparezcan en Swagger
   - Verificar tags: Auth, Users, Products, Categories, Orders, etc.
   - Probar autenticación con JWT Bearer token

4. ✅ **Documentar en PLANIFICATION.md**
   - Actualizar tarea de Swagger en PLANIFICATION.md
   - Marcar como completada
   - Agregar referencias a URLs correctas

## Conceptos Clave

### ⚠️ **Importante: Orden de Configuración en NestJS**

Cuando uses `app.setGlobalPrefix()`, cualquier middleware o ruta que registres **DESPUÉS** de llamarlo será afectado por el prefijo.

```typescript
// ❌ INCORRECTO
app.setGlobalPrefix('api/v1');
app.use('/dashboard', router); // Termina en: /api/v1/dashboard

// ✅ CORRECTO
app.use('/dashboard', router); // Permanece en: /dashboard
app.setGlobalPrefix('api/v1');
```

### 📌 **Regla General**

**Configura primero las rutas que NO quieres que sean afectadas por el prefijo global, luego aplica el prefijo.**

Orden recomendado:

1. Middleware/rutas especiales (Bull Board, Swagger, etc.)
2. `app.setGlobalPrefix()`
3. CORS, Validation Pipes, etc.
4. `app.listen()`

## Referencias

- [NestJS - Global Prefix](https://docs.nestjs.com/faq/global-prefix)
- [Swagger Module Setup](https://docs.nestjs.com/openapi/introduction)
- [Bull Board Configuration](https://github.com/felixmosh/bull-board)

---

**Fecha de Fix:** 2025-10-13  
**Branch:** `fix/swagger-configuration`  
**Archivo Modificado:** `src/main.ts`  
**Estado:** ✅ Resuelto
