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
