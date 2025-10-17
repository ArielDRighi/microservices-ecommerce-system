# Orders Service

> **Servicio de Gestión de Órdenes** - Sistema asíncrono de procesamiento de órdenes con patrones de resiliencia (Proyecto 2)

## 📋 Descripción

Este servicio maneja la creación y procesamiento asíncrono de órdenes en el ecosistema de e-commerce. Implementa patrones avanzados como Outbox Pattern, Saga Orchestration, Circuit Breaker e Idempotencia.

## 🎯 Responsabilidades

- **Crear órdenes** con respuesta inmediata (202 Accepted)
- **Procesar órdenes** asíncronamente mediante workers
- **Orquestar transacciones distribuidas** usando Saga Pattern
- **Gestionar compensaciones** en caso de fallos
- **Garantizar idempotencia** para prevenir duplicados

## 🛠️ Stack Tecnológico

- **Framework**: NestJS + TypeScript
- **Base de Datos**: PostgreSQL + TypeORM
- **Colas**: Bull + Redis
- **Testing**: Jest + Supertest
- **Documentación**: Swagger/OpenAPI

## 🚀 Quick Start

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Levantar dependencias (desde raíz del monorepo)
cd ../..
docker-compose up postgres redis -d

# Volver al servicio
cd services/orders-service

# Ejecutar migraciones
npm run migration:run

# Seedear datos de prueba
npm run seed:all

# Iniciar en modo desarrollo
npm run start:dev
```

El servicio estará disponible en: `http://localhost:3000`

## 📝 Scripts Disponibles

```bash
# Desarrollo
npm run start:dev          # Modo watch con hot-reload
npm run start:debug        # Con debugger en puerto 9229

# Testing
npm run test               # Tests unitarios
npm run test:watch         # Tests en modo watch
npm run test:cov           # Tests con cobertura
npm run test:e2e           # Tests end-to-end

# Build
npm run build              # Compilar TypeScript
npm run start:prod         # Ejecutar build de producción

# Base de Datos
npm run migration:generate # Generar nueva migración
npm run migration:run      # Ejecutar migraciones
npm run migration:revert   # Revertir última migración
npm run seed:all           # Seedear datos de prueba

# Calidad de Código
npm run lint               # Ejecutar ESLint
npm run lint:fix           # Auto-fix de issues
npm run format             # Formatear con Prettier
npm run type-check         # Verificar tipos de TypeScript
```

## 📚 Documentación

- **API Docs (Swagger)**: http://localhost:3000/api/docs
- **Bull Dashboard**: http://localhost:3000/admin/queues
- **Health Check**: http://localhost:3000/health

## ⚙️ Variables de Entorno

### Core Configuration

| Variable     | Descripción          | Default       | Obligatorio |
| ------------ | -------------------- | ------------- | ----------- |
| `NODE_ENV`   | Entorno de ejecución | `development` | ✅          |
| `PORT`       | Puerto del servicio  | `3000`        | ✅          |
| `API_PREFIX` | Prefijo de API       | `api/v1`      | ❌          |

### Database (PostgreSQL)

| Variable            | Descripción                | Default           | Obligatorio |
| ------------------- | -------------------------- | ----------------- | ----------- |
| `DATABASE_HOST`     | Host de PostgreSQL         | `localhost`       | ✅          |
| `DATABASE_PORT`     | Puerto de PostgreSQL       | `5432`            | ✅          |
| `DATABASE_USERNAME` | Usuario de PostgreSQL      | `postgres`        | ✅          |
| `DATABASE_PASSWORD` | Contraseña de PostgreSQL   | -                 | ✅          |
| `DATABASE_NAME`     | Nombre de la base de datos | `ecommerce_async` | ✅          |
| `RUN_MIGRATIONS`    | Auto-ejecutar migraciones  | `false`           | ❌          |

### Redis & Queues

| Variable         | Descripción            | Default           | Obligatorio |
| ---------------- | ---------------------- | ----------------- | ----------- |
| `REDIS_HOST`     | Host de Redis          | `localhost`       | ✅          |
| `REDIS_PORT`     | Puerto de Redis        | `6379`            | ✅          |
| `REDIS_PASSWORD` | Contraseña de Redis    | -                 | ❌          |
| `REDIS_DB`       | Base de datos de Redis | `0`               | ❌          |
| `QUEUE_PREFIX`   | Prefijo de colas Bull  | `ecommerce_async` | ❌          |

### JWT Authentication

| Variable                 | Descripción               | Default | Obligatorio |
| ------------------------ | ------------------------- | ------- | ----------- |
| `JWT_SECRET`             | Secret para firma JWT     | -       | ✅          |
| `JWT_EXPIRES_IN`         | Tiempo de expiración      | `15m`   | ❌          |
| `JWT_REFRESH_SECRET`     | Secret para refresh token | -       | ✅          |
| `JWT_REFRESH_EXPIRES_IN` | Expiración refresh token  | `7d`    | ❌          |

### **✅ Epic 1.6 - Inventory Service (External HTTP Client)**

| Variable                           | Descripción                      | Default                 | Obligatorio |
| ---------------------------------- | -------------------------------- | ----------------------- | ----------- |
| `INVENTORY_SERVICE_URL`            | URL del Inventory Service        | `http://localhost:8080` | ✅          |
| `INVENTORY_SERVICE_TIMEOUT`        | Timeout en ms para llamadas HTTP | `5000`                  | ❌          |
| `INVENTORY_SERVICE_RETRY_ATTEMPTS` | Número de reintentos en fallos   | `3`                     | ❌          |
| `INVENTORY_SERVICE_RETRY_DELAY`    | Delay base entre reintentos (ms) | `1000`                  | ❌          |

> **⚠️ Importante**: El Orders Service ahora se comunica con el Inventory Service vía HTTP.
> Asegúrate de que el Inventory Service esté corriendo antes de iniciar el Orders Service.

### Logging

| Variable      | Descripción             | Default | Obligatorio |
| ------------- | ----------------------- | ------- | ----------- |
| `LOG_LEVEL`   | Nivel de logging        | `info`  | ❌          |
| `LOG_FORMAT`  | Formato de logs         | `json`  | ❌          |
| `LOG_TO_FILE` | Escribir logs a archivo | `false` | ❌          |

### Security

| Variable               | Descripción              | Default  | Obligatorio |
| ---------------------- | ------------------------ | -------- | ----------- |
| `HELMET_ENABLED`       | Habilitar Helmet         | `true`   | ❌          |
| `RATE_LIMIT_WINDOW_MS` | Ventana de rate limit    | `900000` | ❌          |
| `RATE_LIMIT_MAX`       | Máximo de requests       | `1000`   | ❌          |
| `CORS_ORIGIN`          | Orígenes permitidos CORS | `*`      | ❌          |

### Development

| Variable          | Descripción          | Default       | Obligatorio |
| ----------------- | -------------------- | ------------- | ----------- |
| `ENABLE_SWAGGER`  | Habilitar Swagger UI | `true`        | ❌          |
| `SWAGGER_PATH`    | Ruta de Swagger      | `api/docs`    | ❌          |
| `DEBUG_NAMESPACE` | Namespace para debug | `ecommerce:*` | ❌          |

Para más detalles, ver archivos:

- `.env.example` - Plantilla con todas las variables
- `.env.development` - Configuración para desarrollo
- `.env.test` - Configuración para tests

## 🏗️ Arquitectura

- **Patrón Outbox**: Garantiza publicación transaccional de eventos
- **Saga Pattern**: Orquestación de transacciones distribuidas
- **CQRS**: Separación de comandos y consultas
- **Event-Driven**: Comunicación asíncrona basada en eventos
- **Circuit Breaker**: Protección contra cascading failures

## 📊 Cobertura de Tests

- **Tests**: 1212 passed (111 suites)
- **Coverage**: >72% (threshold: 71%)
- **E2E Tests**: 261/262 (99.6%)

## 🔗 Enlaces

- [Documentación Completa](../../docs/PROJECT_SETUP.md)
- [ADRs](../../docs/adr/)
- [Guías de API Testing](../../docs/api-testing/)

---

**Parte del ecosistema**: [Microservices E-commerce System](../../README.md)
