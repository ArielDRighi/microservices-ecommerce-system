# 🛒 Ecosistema de Microservicios E-commerce

<p align="center">
  <a href="https://github.com/ArielDRighi/microservices-ecommerce-system/actions">
    <img src="https://img.shields.io/github/actions/workflow/status/ArielDRighi/microservices-ecommerce-system/ci.yml?branch=develop&style=for-the-badge" alt="CI/CD Status"/>
  </a>
  <a href="#">
    <img src="https://img.shields.io/badge/microservices-3%20services-blue?style=for-the-badge" alt="Microservices"/>
  </a>
  <a href="#">
    <img src="https://img.shields.io/badge/languages-TypeScript%20%2B%20Go-purple?style=for-the-badge" alt="Multi-Language"/>
  </a>
  <a href="#">
    <img src="https://img.shields.io/badge/architecture-event--driven-orange?style=for-the-badge" alt="Architecture"/>
  </a>
  <a href="#">
    <img src="https://img.shields.io/badge/ADRs-29%20documented-green?style=for-the-badge" alt="ADRs"/>
  </a>
  <a href="#">
    <img src="https://img.shields.io/badge/testing-Testcontainers%20%2B%20E2E-brightgreen?style=for-the-badge" alt="Testing"/>
  </a>
</p>

<p align="center">
  Sistema distribuido de e-commerce con arquitectura de microservicios poliglota, implementando comunicación síncrona (REST) y asíncrona (RabbitMQ), patrones de resiliencia avanzados, y testing integral con Testcontainers.
</p>

<p align="center">
  <a href="#-quick-start">🚀 Quick Start</a> •
  <a href="#-arquitectura">Arquitectura</a> •
  <a href="#-servicios">Servicios</a> •
  <a href="#-stack-tecnológico">Stack</a> •
  <a href="#-estructura-del-monorepo">Estructura</a> •
  <a href="#-instalación">Instalación</a> •
  <a href="#-testing">Testing</a> •
  <a href="#-documentación">Documentación</a> •
  <a href="#-adrs">ADRs</a> •
  <a href="#-para-entrevistas">Para Entrevistas</a>
</p>

---

## 🚀 Quick Start

```bash
# 1. Clonar repositorio
git clone https://github.com/ArielDRighi/microservices-ecommerce-system.git
cd microservices-ecommerce-system

# 2. Levantar infraestructura (PostgreSQL, Redis, RabbitMQ)
docker-compose up -d

# 3. Instalar dependencias
cd services/orders-service && npm install && cd ../..

# 4. Ejecutar migraciones y seeders
npm run migrate
npm run seed

# 5. Iniciar servicios
# Terminal 1 - Orders Service (NestJS)
cd services/orders-service && npm run start:dev

# Terminal 2 - Inventory Service (Go)
cd services/inventory-service && make run

# Terminal 3 - API Gateway (Express)
cd services/api-gateway && npm run start:dev
```

**Endpoints principales:**
- 🌐 **API Gateway**: http://localhost:8080
- 📦 **Orders API**: http://localhost:3000/api/docs (Swagger)
- 📊 **Inventory API**: http://localhost:8081/health
- 🐰 **RabbitMQ Management**: http://localhost:15672 (admin/admin)
- 📈 **Bull Board**: http://localhost:3000/admin/queues

➡️ **[Guía Completa de API Testing](docs/api-testing/00-QUICK-START-DEMO.md)**

---

## 🏗️ Arquitectura

### Diagrama de Alto Nivel

```mermaid
graph TB
    subgraph Client["🌐 Cliente / Frontend"]
        Browser[Browser/Mobile App]
    end

    subgraph Gateway["⚡ API Gateway (Express)"]
        APIGateway[API Gateway<br/>Express + http-proxy-middleware<br/>Puerto: 8080]
    end

    subgraph Services["🔷 Microservicios"]
        Orders[Orders Service<br/>NestJS + TypeScript<br/>Puerto: 3000]
        Inventory[Inventory Service<br/>Go + Gin<br/>Puerto: 8081]
    end

    subgraph MessageBroker["📬 Message Broker"]
        RabbitMQ[RabbitMQ 3.13<br/>Eventos Asíncronos<br/>Puertos: 5672, 15672]
    end

    subgraph DataLayer["💾 Capa de Datos"]
        PostgreSQL[(PostgreSQL 16<br/>Base de Datos Principal)]
        Redis[(Redis 7<br/>Cache + Bull Queues)]
    end

    Browser -->|HTTP REST| APIGateway
    APIGateway -->|Proxy /orders/*| Orders
    APIGateway -->|Proxy /inventory/*| Inventory
    
    Orders -->|HTTP GET/POST<br/>Check Stock / Reserve| Inventory
    Inventory -->|Publish Events<br/>inventory.reserved<br/>inventory.confirmed| RabbitMQ
    Orders -->|Consume Events<br/>Update Order Status| RabbitMQ
    
    Orders -->|Read/Write<br/>Orders, Users, Categories| PostgreSQL
    Inventory -->|Read/Write<br/>Products, Reservations| PostgreSQL
    Orders -->|Bull Queues<br/>Async Jobs| Redis
    Inventory -->|Cache<br/>Product Data| Redis

    style Browser fill:#e3f2fd
    style APIGateway fill:#fff3e0
    style Orders fill:#f3e5f5
    style Inventory fill:#e8f5e9
    style RabbitMQ fill:#ffe0b2
    style PostgreSQL fill:#e1f5fe
    style Redis fill:#ffebee
```

### Comunicación entre Servicios

#### 🔵 Síncrona (REST)
- **Orders → Inventory**: Check stock, Reserve, Release
- **API Gateway → Orders/Inventory**: Proxy HTTP requests
- **Implementación**: `@nestjs/axios` + `axios-retry` + `opossum` (circuit breaker)
- **Timeouts**: 5s (read), 10s (write), 15s (critical)
- **Referencia**: [ADR-028: REST Synchronous Communication](docs/adr/028-rest-synchronous-communication-strategy.md)

#### 🟠 Asíncrona (RabbitMQ)
- **Inventory → Orders**: `InventoryReserved`, `InventoryConfirmed`, `InventoryReleased`
- **Orders → Inventory**: `OrderCancelled`, `OrderCompleted`
- **Garantías**: At-least-once delivery, Dead Letter Queue, Idempotency
- **Referencia**: [ADR-029: Message Broker RabbitMQ](docs/adr/029-message-broker-rabbitmq-vs-redis-pubsub.md)

---

## 🎯 ¿Qué Resuelve Este Proyecto?

### Problema

Sistemas de e-commerce tradicionales con arquitectura monolítica enfrentan:
- ❌ **Acoplamiento**: Cambios en inventario requieren redeploy completo
- ❌ **Escalabilidad limitada**: No se puede escalar inventario independiente de órdenes
- ❌ **Tecnologías fijas**: Stack único (ej: solo Node.js o solo Java)
- ❌ **Resiliencia pobre**: Fallo en un módulo afecta todo el sistema

### Solución: Arquitectura de Microservicios

Este proyecto demuestra:
- ✅ **Desacoplamiento**: Servicios independientes con contratos API claros
- ✅ **Escalabilidad horizontal**: Escalar Orders e Inventory por separado
- ✅ **Tecnología apropiada**: Go para performance (Inventory), NestJS para DX (Orders)
- ✅ **Resiliencia**: Circuit breakers, retries, Dead Letter Queues
- ✅ **Event-Driven**: Comunicación asíncrona con RabbitMQ

---

## 🔷 Servicios

### 1. Orders Service (NestJS + TypeScript)

**Descripción**: Gestiona órdenes de compra, usuarios, categorías y procesamiento asíncrono.

**Stack**:
- Framework: NestJS 10.x
- ORM: TypeORM
- Queue: Bull + Redis
- Testing: Jest + Supertest + Testcontainers

**Responsabilidades**:
- CRUD de órdenes, usuarios, categorías
- Procesamiento asíncrono con Bull queues
- Saga Pattern para transacciones distribuidas
- Consumidor de eventos de Inventory (RabbitMQ)

**Endpoints principales**:
- `POST /orders` - Crear orden (trigger Saga)
- `GET /orders/:id` - Consultar estado de orden
- `POST /orders/:id/cancel` - Cancelar orden
- `GET /users`, `GET /categories` - Recursos relacionados

**Documentación**: [services/orders-service/README.md](services/orders-service/README.md)

---

### 2. Inventory Service (Go + Gin)

**Descripción**: Gestiona inventario de productos y reservas con locking optimista.

**Stack**:
- Framework: Gin (Go)
- ORM: GORM
- Cache: Redis
- Testing: Testcontainers + go-sqlmock

**Responsabilidades**:
- CRUD de productos (inventory items)
- Reservas de stock con locking optimista (version column)
- Confirmación y liberación de reservas
- Publicación de eventos a RabbitMQ
- Cache con Redis (Cache-Aside pattern)

**Endpoints principales**:
- `GET /inventory` - Listar productos
- `GET /inventory/:id` - Detalle de producto
- `POST /inventory/reserve` - Reservar stock
- `POST /inventory/confirm/:id` - Confirmar reserva
- `POST /inventory/release/:id` - Liberar reserva

**Documentación**: [services/inventory-service/README.md](services/inventory-service/README.md)

---

### 3. API Gateway (Express + TypeScript)

**Descripción**: Punto de entrada único para clientes, proxy a microservicios.

**Stack**:
- Framework: Express.js
- Proxy: http-proxy-middleware
- Auth: JWT (jsonwebtoken)
- Rate Limiting: express-rate-limit + Redis
- Circuit Breaker: opossum

**Responsabilidades**:
- Routing a servicios (`/orders/*` → Orders, `/inventory/*` → Inventory)
- Autenticación JWT centralizada
- Rate limiting (100 req/min por IP)
- Circuit breaker por servicio
- Logging y métricas (Prometheus)

**Endpoints**:
- `POST /auth/login` - Autenticación (genera JWT)
- `/orders/*` - Proxy a Orders Service (puerto 3000)
- `/inventory/*` - Proxy a Inventory Service (puerto 8081)

**Documentación**: [services/api-gateway/README.md](services/api-gateway/README.md)

**Referencia**: [ADR-026: API Gateway Express Custom](docs/adr/026-api-gateway-express-custom.md)

---

## �️ Stack Tecnológico

### Backend Services

| Tecnología | Uso | Versión |
|------------|-----|---------|
| **NestJS** | Orders Service framework | 10.x |
| **Go (Golang)** | Inventory Service | 1.21+ |
| **Express.js** | API Gateway | 4.x |
| **TypeScript** | Lenguaje principal (Orders + Gateway) | 5.x |

### Databases & Storage

| Tecnología | Uso | Versión |
|------------|-----|---------|
| **PostgreSQL** | Base de datos relacional principal | 16.x |
| **Redis** | Cache + Bull queues | 7.x |

### Message Broker

| Tecnología | Uso | Versión |
|------------|-----|---------|
| **RabbitMQ** | Eventos asíncronos entre servicios | 3.13 |

### DevOps & Infrastructure

| Tecnología | Uso |
|------------|-----|
| **Docker** | Containerización de servicios |
| **Docker Compose** | Orquestación local |
| **GitHub Actions** | CI/CD pipeline |
| **Testcontainers** | Integration tests (Go + NestJS) |

### Monitoring & Observability

| Tecnología | Uso |
|------------|-----|
| **Prometheus** | Métricas de servicios |
| **Grafana** | Dashboards de monitoreo |
| **Winston** | Logging estructurado |
| **Bull Board** | Dashboard de queues (NestJS) |
| **RabbitMQ Management** | Dashboard de RabbitMQ |

### Testing

| Tecnología | Uso | Coverage |
|------------|-----|----------|
| **Jest** | Unit + E2E tests (NestJS) | >70% |
| **Supertest** | API testing (NestJS) | - |
| **Testcontainers** | Integration tests | - |
| **go-sqlmock** | Unit tests (Go) | >75% |

---

## 📁 Estructura del Monorepo

```
microservices-ecommerce-system/
├── 📂 services/                    # Microservicios independientes
│   ├── 📦 orders-service/          # NestJS + TypeScript
│   │   ├── src/
│   │   │   ├── orders/             # Módulo de órdenes
│   │   │   ├── users/              # Módulo de usuarios
│   │   │   ├── categories/         # Módulo de categorías
│   │   │   ├── saga/               # Saga Pattern implementation
│   │   │   ├── messaging/          # RabbitMQ consumer
│   │   │   └── queues/             # Bull queues (async jobs)
│   │   ├── test/                   # E2E tests
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── 📦 inventory-service/       # Go + Gin
│   │   ├── cmd/api/                # Entry point
│   │   ├── internal/
│   │   │   ├── domain/             # Entities (Product, Reservation)
│   │   │   ├── application/        # Use cases
│   │   │   ├── infrastructure/     # DB, Redis, RabbitMQ
│   │   │   └── interfaces/         # HTTP handlers
│   │   ├── tests/
│   │   │   ├── unit/               # Unit tests con mocks
│   │   │   └── integration/        # Testcontainers
│   │   ├── go.mod
│   │   ├── Makefile
│   │   └── README.md
│   │
│   └── 📦 api-gateway/             # Express + TypeScript
│       ├── src/
│       │   ├── routes/             # Proxy routing
│       │   ├── middleware/         # Auth, rate limit, circuit breaker
│       │   └── monitoring/         # Prometheus metrics
│       ├── package.json
│       └── README.md
│
├── 📂 shared/                      # Código compartido
│   ├── types/                      # TypeScript types (eventos, DTOs)
│   └── proto/                      # Protobuf definitions (futuro gRPC)
│
├── 📂 docs/                        # Documentación completa
│   ├── ARCHITECTURE.md             # Diagrama de arquitectura detallado
│   ├── DATABASE_DESIGN.md          # Esquemas de DB
│   ├── PROJECT_BACKLOG.md          # Backlog completo (8-10 semanas)
│   ├── PROJECT_SETUP.md            # Guía de setup inicial
│   ├── INFRASTRUCTURE_REFERENCE.md # Referencia de infra
│   ├── VULNERABILIDADES.md         # Análisis de seguridad
│   ├── adr/                        # Architecture Decision Records (29 ADRs)
│   │   ├── 001-async-non-blocking-architecture.md
│   │   ├── 026-api-gateway-express-custom.md
│   │   ├── 027-testcontainers-vs-mocks-go-testing.md
│   │   ├── 028-rest-synchronous-communication-strategy.md
│   │   ├── 029-message-broker-rabbitmq-vs-redis-pubsub.md
│   │   └── README.md
│   └── api-testing/                # Guías de testing de API
│       ├── 00-QUICK-START-DEMO.md
│       ├── 01-AUTH-MODULE.md
│       ├── 02-PRODUCTS-MODULE.md
│       └── ...
│
├── 📂 scripts/                     # Scripts de DevOps
│   ├── init-db.sql                 # Schema inicial
│   ├── migrate.sh                  # Migraciones
│   └── deploy-*.sh                 # Deployment scripts
│
├── docker-compose.yml              # Infraestructura completa
├── docker-compose.dev.yml          # Desarrollo local
├── .gitignore                      # Multi-lenguaje (Node + Go)
├── Makefile                        # Comandos unificados
├── README.md                       # Este archivo
└── LICENSE                         # MIT License
```

### Decisiones de Estructura

**¿Por qué Monorepo?**
- ✅ **Atomic commits**: Cambios en múltiples servicios en un solo commit
- ✅ **Refactoring simplificado**: Cambiar contratos API sin sync entre repos
- ✅ **Documentación centralizada**: ADRs, arquitectura, backlog en un solo lugar
- ✅ **CI/CD unificado**: Un pipeline para todo el ecosistema

**Alternativas consideradas**:
- ❌ **Multi-repo**: Complicaría sync de cambios entre Orders e Inventory
- ❌ **Monolito modular**: No demostraría microservicios reales

**Referencia**: [ADR-030: Monorepo Structure](docs/adr/030-monorepo-structure.md) _(pendiente)_

---

## 📖 Acerca del Proyecto

> **⚠️ Proyecto de Portfolio:** Este es un proyecto académico/demostrativo creado exclusivamente para mi portfolio profesional. **No está diseñado para uso en producción real.** Su propósito es demostrar comprensión profunda de arquitecturas distribuidas, microservicios, y patrones enterprise.

### Objetivos del Proyecto

1. **Arquitectura de Microservicios**: Demostrar diseño de sistemas distribuidos con servicios independientes
2. **Tecnología Poliglota**: Uso de Go (performance) y NestJS (DX) según necesidades
3. **Comunicación Híbrida**: REST síncrono + RabbitMQ asíncrono
4. **Patrones de Resiliencia**: Circuit breakers, retries, Dead Letter Queues
5. **Testing Integral**: Unit, Integration (Testcontainers), E2E
6. **Documentación Profesional**: 29 ADRs, diagramas, backlog detallado

### Evolución del Proyecto

Este proyecto es la **evolución** del [Sistema Procesador de Órdenes Asíncrono](https://github.com/ArielDRighi/ecommerce-async-resilient-system) (Proyecto 2), ahora transformado en una arquitectura de microservicios:

| Aspecto | Proyecto 2 (Monolito) | Proyecto 3 (Microservicios) |
|---------|----------------------|----------------------------|
| **Arquitectura** | Monolito NestJS | 3 microservicios (NestJS + Go + Express) |
| **Lenguajes** | Solo TypeScript | TypeScript + Go (poliglota) |
| **Base de Datos** | PostgreSQL compartida | PostgreSQL con esquemas separados |
| **Comunicación** | Interna (módulos) | REST + RabbitMQ (inter-service) |
| **Inventario** | Lógica interna simulada | Servicio independiente en Go con concurrencia real |
| **Testing** | Jest + Supertest | Jest + Supertest + Testcontainers (Go + NestJS) |
| **Deployment** | Single container | Multi-container (Docker Compose) |

Cuando un cliente crea una orden en un e-commerce, múltiples operaciones deben ejecutarse:

- ✅ Verificar stock disponible
- 💳 Procesar pago con gateway externo
- 📧 Enviar notificaciones por email
- 📦 Actualizar inventario en tiempo real
- 🔄 Registrar eventos de auditoría
- 📊 Actualizar métricas y analytics

Hacer todo esto **de forma síncrona** tiene graves problemas:

- ❌ **Bloquea al usuario** esperando operaciones lentas (emails, APIs externas)
- ❌ **Fragilidad**: Un fallo en email rompe toda la orden
- ❌ **No escalable**: Cuellos de botella en procesos síncronos
- ❌ **Mala experiencia**: Timeouts y errores frecuentes

Este proyecto implementa una solución **asíncrona, desacoplada y resiliente** usando colas de mensajes, event-driven architecture y patrones avanzados de resiliencia.

---

### 🏛️ Decisiones de Arquitectura y Diseño

Este proyecto no es solo código; es el resultado de un proceso de ingeniería deliberado y documentado. Todas las decisiones arquitectónicas clave, desde la elección de Bull para colas hasta la estrategia de testing, están registradas como **Architecture Decision Records (ADRs)** en español.

Este enfoque demuestra un compromiso con la planificación estratégica, la gestión de riesgos y la comunicación técnica clara, aplicando más de 10 años de experiencia en la industria de videojuegos al desarrollo de software.

➡️ **[Explora aquí los 25 ADRs para entender el "porqué" detrás de cada decisión técnica.](./docs/adr/)**

---

### ✨ Características Principales

- **Arquitectura Asíncrona No-Bloqueante:** Endpoints responden con 202 Accepted inmediatamente, procesamiento en background con workers especializados.
- **Sistema de Colas Robusto con Bull:** 4 colas especializadas (Order, Payment, Inventory, Notification) con rate limiting, retries, DLQ y progress tracking.
- **Event-Driven con Outbox Pattern:** Garantiza consistencia transaccional entre base de datos y colas de mensajes, previene pérdida de eventos.
- **Saga Pattern para Orquestación:** Coordinación de procesos distribuidos con compensación automática en caso de fallos.
- **Patrones de Resiliencia:** Circuit Breaker, Retry con exponential backoff, Idempotency keys, Dead Letter Queue para manejo de fallos.
- **CQRS (Command Query Responsibility Segregation):** Separación de escrituras y lecturas para optimización de performance.
- **Autenticación JWT Completa:** Access y refresh tokens, guards de autorización basados en roles (Admin/Customer).
- **Health Checks Empresariales:** Terminus health checks para Docker Compose, endpoints /health, /health/ready, /health/detailed.
- **Monitoreo con Prometheus:** Métricas de negocio y sistema expuestas en /metrics para scraping.
- **Bull Board Dashboard:** UI web en /api/v1/admin/queues para monitoreo en tiempo real de colas y jobs.
- **Logging Estructurado con Winston:** Logs en formato JSON con correlation IDs, rotation diaria, levels configurables.
- **Sistema de Testing Exhaustivo:** 1212 tests unitarios + 14 suites E2E, cobertura 72.14%, configuración Jest profesional.
- **Contenerización Completa:** Docker multi-stage builds, docker-compose para dev/test/prod, healthchecks configurados.
- **Pipeline CI/CD con GitHub Actions:** Linting, testing, security scanning, build validation automatizado.
- **Documentación API con Swagger:** OpenAPI completo con ejemplos, schemas detallados, endpoints documentados.

---

## 🛠️ Stack Tecnológico

Este proyecto está construido con un stack tecnológico moderno y de nivel empresarial:

<p align="center">
  <a href="https://nestjs.com/" target="_blank">
    <img src="https://img.shields.io/badge/-NestJS-ea2845?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS"/>
  </a>
  <a href="https://www.typescriptlang.org/" target="_blank">
    <img src="https://img.shields.io/badge/-TypeScript-3178c6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  </a>
  <a href="https://www.postgresql.org/" target="_blank">
    <img src="https://img.shields.io/badge/-PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  </a>
  <a href="https://redis.io/" target="_blank">
    <img src="https://img.shields.io/badge/-Redis-dc382d?style=for-the-badge&logo=redis&logoColor=white" alt="Redis"/>
  </a>
  <a href="https://www.docker.com/" target="_blank">
    <img src="https://img.shields.io/badge/-Docker-2496ed?style=for-the-badge&logo=docker&logoColor=white" alt="Docker"/>
  </a>
  <a href="https://jestjs.io/" target="_blank">
    <img src="https://img.shields.io/badge/-Jest-c21325?style=for-the-badge&logo=jest&logoColor=white" alt="Jest"/>
  </a>
  <a href="https://swagger.io/" target="_blank">
    <img src="https://img.shields.io/badge/-Swagger-85ea2d?style=for-the-badge&logo=swagger&logoColor=black" alt="Swagger"/>
  </a>
  <a href="https://github.com/features/actions" target="_blank">
    <img src="https://img.shields.io/badge/-GitHub%20Actions-2088ff?style=for-the-badge&logo=github-actions&logoColor=white" alt="GitHub Actions"/>
  </a>
</p>

### Stack Principal

| Capa                | Tecnología                          | Versión | Propósito                                    |
| ------------------- | ----------------------------------- | ------- | -------------------------------------------- |
| **Framework**       | NestJS                              | 10.x    | Framework backend modular y escalable        |
| **Lenguaje**        | TypeScript                          | 5.x     | Type safety y desarrollo robusto             |
| **Base de Datos**   | PostgreSQL                          | 15+     | Persistencia relacional con JSON support     |
| **ORM**             | TypeORM                             | 0.3.x   | Object-relational mapping y migraciones      |
| **Message Queue**   | Bull                                | 4.x     | Sistema de colas basado en Redis             |
| **Cache/Queue**     | Redis                               | 7.x     | Cache en memoria y backend de Bull           |
| **Autenticación**   | Passport JWT                        | -       | Estrategia JWT con access/refresh tokens     |
| **Validación**      | class-validator + class-transformer | -       | Validación de DTOs y transformación de tipos |
| **Documentación**   | Swagger/OpenAPI                     | -       | Documentación interactiva de API             |
| **Logging**         | Winston                             | 3.x     | Structured logging con rotation              |
| **Testing**         | Jest + Supertest                    | 29.x    | Unit, integration y E2E testing              |
| **Health Checks**   | @nestjs/terminus                    | -       | Health checks para Docker Compose            |
| **Metrics**         | prom-client (Prometheus)            | -       | Métricas de negocio y sistema                |
| **Security**        | Helmet                              | 7.x     | Security headers HTTP                        |
| **Contenerización** | Docker + Docker Compose             | -       | Orquestación multi-servicio                  |
| **CI/CD**           | GitHub Actions                      | -       | Pipeline automatizado de integración         |

### Patrones de Diseño Implementados

- **🔄 Event Sourcing** - Registro inmutable de eventos de dominio
- **📤 Outbox Pattern** - Consistencia transaccional entre DB y message queue
- **⚡ CQRS** - Command Query Responsibility Segregation para performance
- **🎭 Saga Pattern** - Orquestación de transacciones distribuidas con compensación
- **🛡️ Circuit Breaker** - Prevención de cascadas de fallos en servicios externos
- **🔁 Retry Pattern** - Reintentos automáticos con exponential backoff
- **🔑 Idempotency** - Prevención de procesamiento duplicado con idempotency keys
- **☠️ Dead Letter Queue** - Manejo de mensajes fallidos para análisis posterior

## 🏛️ Arquitectura del Sistema

Este proyecto implementa una **arquitectura asíncrona de 8 capas** con patrones avanzados de resiliencia y escalabilidad.

### � Capas Principales

| Capa              | Responsabilidad                  | Tecnologías                   |
| ----------------- | -------------------------------- | ----------------------------- |
| **API**           | Controllers, Guards, Validation  | NestJS, JWT, Swagger          |
| **Application**   | Business Logic, Services         | TypeScript, DTOs              |
| **Event**         | Event Publishing, Outbox Pattern | Outbox Table, Events          |
| **Queue**         | Async Job Management             | Bull, Redis                   |
| **Worker**        | Background Processors            | Bull Processors               |
| **Saga**          | Long-running Workflows           | Saga Pattern, Compensation    |
| **Data**          | Persistence, Queries             | PostgreSQL, TypeORM           |
| **Observability** | Monitoring, Logs, Metrics        | Terminus, Winston, Prometheus |

### 📖 Documentación Completa de Arquitectura

➡️ **[🏛️ Guía Completa de Arquitectura](./docs/ARCHITECTURE.md)**

Este documento de 800+ líneas incluye:

- **Diagramas detallados** con Mermaid (arquitectura de alto nivel, flujos de datos)
- **Componentes principales** explicados en profundidad
- **Flujos de datos** completos (happy path y compensación)
- **Patrones de diseño** implementados (Outbox, Saga, CQRS, Circuit Breaker, etc.)
- **Decisiones arquitectónicas** y justificaciones técnicas
- **Stack tecnológico** con versiones y configuraciones

---

## ⚖️ Trade-offs Arquitectónicos y Decisiones Conscientes

Este proyecto fue construido con **pragmatismo sobre purismo arquitectónico**, priorizando **entrega incremental de valor** sobre **perfección teórica**.

### 📊 Resumen de Trade-offs

He identificado y documentado **15 gaps arquitectónicos** mediante autocrítica técnica rigurosa:

- 🔴 **5 Críticos**: Impactan funcionalidad (Outbox bypass, race conditions, etc.)
- 🟡 **5 Medios**: Impactan mantenibilidad (Circuit breaker, Repository pattern, etc.)
- 🟢 **5 Bajos**: Deuda técnica menor (Logger manual, Value Objects, etc.)

**Cada trade-off incluye:**

- ❌ Descripción del problema
- ✅ Justificación de la decisión
- 🛠️ Solución planificada
- 📊 Estado actual e impacto

### 📖 Documentación Completa

➡️ **[📋 Análisis Completo: Vulnerabilidades Técnicas y Arquitectónicas](./docs/VULNERABILIDADES_TECNICAS_Y_ARQUITECTONICAS.md)**

Este documento de 1,300+ líneas detalla:

- Análisis técnico profundo de cada vulnerabilidad
- Ejemplos de código del problema y la solución
- Contexto y justificación de decisiones
- Roadmap de corrección y mejoras

> **Filosofía**: "Prefiero un sistema funcional con trade-offs documentados que un sistema perfecto que nunca se termina."

---

## 🚀 Iniciando

Para obtener una copia local y ponerla en marcha, sigue estos sencillos pasos.

### Prerrequisitos

- [Node.js](https://nodejs.org/en/) (v18 o superior)
- [Docker](https://www.docker.com/get-started) y Docker Compose
- [Git](https://git-scm.com/)
- [PostgreSQL](https://www.postgresql.org/) 15+ (o usar Docker)
- [Redis](https://redis.io/) 7.x (o usar Docker)

### Instalación

1.  **Clona el repositorio:**

    ```sh
    git clone https://github.com/ArielDRighi/ecommerce-async-resilient-system.git
    cd ecommerce-async-resilient-system
    ```

2.  **Configura tus variables de entorno:**
    Copia el archivo de ejemplo y ajústalo según tus necesidades.

    ```sh
    cp .env.example .env
    ```

    _Actualiza el archivo `.env` con tus credenciales de base de datos, Redis y otras configuraciones._

3.  **Instala las dependencias:**

    ```sh
    npm install
    ```

4.  **Inicia el entorno de desarrollo con Docker:**

    ```sh
    docker-compose up -d
    ```

    Este comando levantará PostgreSQL, Redis y todos los servicios necesarios.

5.  **Ejecuta las migraciones:**

    ```sh
    npm run migration:run
    ```

6.  **Ejecuta los seeds (datos iniciales):**

    ```sh
    npm run seed:all
    # o alternativamente: npm run seed:run (alias de seed:all)
    ```

7.  **Inicia la aplicación:**
    ```sh
    npm run start:dev
    ```

---

## 💻 Uso

Una vez iniciado, el servidor estará disponible en `http://localhost:3000`.

### Credenciales de Acceso

Para probar la API, utiliza estas credenciales pre-cargadas por el seed:

**Usuario Administrador:**

- Email: `admin@test.com`
- Password: `Admin123!`

**Usuario Cliente:**

- Email: `user@test.com`
- Password: `Admin123!`

### Documentación de la API

La documentación de la API se genera automáticamente con **Swagger** y está disponible en:
**[http://localhost:3000/api/docs](http://localhost:3000/api/docs)**

### Bull Board Dashboard

Monitor en tiempo real de las colas de procesamiento asíncrono:
**[http://localhost:3000/api/v1/admin/queues](http://localhost:3000/api/v1/admin/queues)**

### Ejemplo de Uso: Endpoint No-Bloqueante

```http
POST /api/v1/orders
Content-Type: application/json
Authorization: Bearer <your-jwt-token>

{
  "items": [
    { "productId": "uuid", "quantity": 2 }
  ]
}

Response: 202 Accepted
{
  "orderId": "uuid",
  "status": "PENDING",
  "message": "Order created successfully and is being processed"
}
```

**Flujo de Procesamiento Asíncrono:**

1. ✅ Endpoint responde inmediatamente con `202 Accepted`
2. 📤 Publica evento `OrderCreated` en Outbox Table
3. 🔄 Worker de Outbox mueve evento a cola Bull
4. ⚙️ Order Processor ejecuta en background:
   - Verificar stock con Inventory Service
   - Procesar pago con Payment Gateway
   - Enviar notificaciones por email
   - Actualizar estado final de la orden
5. 🎭 Si falla, Saga ejecuta compensaciones automáticas

---

## 🚀 Funcionalidades Clave

### Sistema de Colas Robusto

El sistema implementa **4 colas especializadas** para procesar jobs asíncronos:

- **📦 Order Processing Queue**: Procesamiento de órdenes (50 jobs/seg)
- **💳 Payment Processing Queue**: Transacciones de pago (20 jobs/seg)
- **📊 Inventory Management Queue**: Gestión de inventario (30 jobs/seg)
- **📧 Notification Queue**: Envío de notificaciones (100 jobs/seg)

**Características Avanzadas de Colas:**

- **🔒 Idempotencia**: Previene procesamiento duplicado mediante job IDs únicos
- **🛡️ Outbox Pattern**: Garantiza consistencia transaccional entre DB y message queue
- **🔄 Retry Logic**: Reintentos automáticos con backoff exponencial (3-5 intentos)
- **📊 Rate Limiting**: Control de throughput por cola (configurable)
- **☠️ Dead Letter Queue**: Manejo automático de jobs fallidos para análisis posterior
- **📈 Progress Tracking**: Seguimiento en tiempo real del progreso de jobs
- **🎯 Priority Queues**: Procesamiento prioritario para jobs críticos
- **📊 Bull Board Dashboard**: UI web para monitoreo en tiempo real en `/api/v1/admin/queues`
- **🛑 Graceful Shutdown**: Cierre controlado esperando jobs activos

---

### 🎭 Saga Pattern - Orquestación de Transacciones Distribuidas

El sistema implementa el **Saga Pattern** para coordinar transacciones distribuidas con compensación automática en caso de fallos.

#### Flujo del Saga: Procesamiento de Orden

```mermaid
graph TB
    Start([🚀 Order Created]) --> Step1[Step 1: Verify Stock]

    Step1 -->|✅ Success| Step2[Step 2: Reserve Inventory]
    Step1 -->|❌ Failure| End1([❌ Order Cancelled])

    Step2 -->|✅ Success| Step3[Step 3: Process Payment]
    Step2 -->|❌ Failure| Comp1[🔄 Compensate: Nothing to release]
    Comp1 --> End2([❌ Order Cancelled])

    Step3 -->|✅ Success| Step4[Step 4: Confirm Reservation]
    Step3 -->|❌ Failure| Comp2[🔄 Compensate: Release Reservation]
    Comp2 --> End3([❌ Order Cancelled])

    Step4 -->|✅ Success| Step5[Step 5: Send Confirmation]
    Step4 -->|❌ Failure| Comp3[🔄 Compensate: Refund Payment]
    Comp3 --> Comp4[🔄 Release Reservation]
    Comp4 --> End4([❌ Order Cancelled])

    Step5 -->|✅ Success| Step6[Step 6: Complete Order]
    Step5 -->|❌ Failure| Comp5[🔄 Compensate: Send Cancellation]
    Comp5 --> Comp6[🔄 Refund Payment]
    Comp6 --> Comp7[🔄 Release Reservation]
    Comp7 --> End5([❌ Order Cancelled])

    Step6 --> End6([✅ Order Completed])

    style Start fill:#e1f5ff
    style Step1 fill:#fff3e0
    style Step2 fill:#fff3e0
    style Step3 fill:#fff3e0
    style Step4 fill:#fff3e0
    style Step5 fill:#fff3e0
    style Step6 fill:#fff3e0
    style Comp1 fill:#ffebee
    style Comp2 fill:#ffebee
    style Comp3 fill:#ffebee
    style Comp4 fill:#ffebee
    style Comp5 fill:#ffebee
    style Comp6 fill:#ffebee
    style Comp7 fill:#ffebee
    style End6 fill:#e8f5e9
    style End1 fill:#ffcdd2
    style End2 fill:#ffcdd2
    style End3 fill:#ffcdd2
    style End4 fill:#ffcdd2
    style End5 fill:#ffcdd2
```

#### Características del Saga

| Característica              | Implementación                                 | Beneficio                                |
| --------------------------- | ---------------------------------------------- | ---------------------------------------- |
| **Estado Persistido**       | Cada step guarda estado en `saga_states` table | Recovery después de crashes              |
| **Compensación Automática** | Rollback de steps completados en orden inverso | Consistencia garantizada                 |
| **Idempotencia**            | Correlation IDs únicos por orden               | Evita duplicados en retries              |
| **Timeout Handling**        | Timeouts configurables por step                | No bloquea indefinidamente               |
| **Retry Logic**             | 3 reintentos con exponential backoff           | Auto-recuperación de fallos transitorios |
| **Observabilidad**          | Logs estructurados + estado en DB              | Debugging y auditoría completa           |

#### Estados del Saga

```
STARTED           → Saga iniciado
RUNNING           → Ejecutando steps
COMPLETED         → ✅ Completado exitosamente
FAILED            → ❌ Falló permanentemente
COMPENSATING      → 🔄 Ejecutando compensación (rollback)
COMPENSATED       → ✅ Compensación completada
COMPENSATION_FAILED → ⚠️ Compensación falló (requiere intervención manual)
```

#### Ejemplo de Flujo con Fallo

```
Order Created
  → Step 1: ✅ Stock verified (50 units available)
  → Step 2: ✅ Inventory reserved (50 units)
  → Step 3: ❌ Payment failed (card declined)

  🔄 Compensating:
    → Step 2 Compensation: ✅ Released 50 units reservation
    → Order Status: CANCELLED
    → Notification: ✅ Email sent to customer
```

> 📖 **Más detalles**: Ver [ADR-003: Saga Pattern Orchestration](docs/adr/003-saga-pattern-orchestration.md)

---

## ⚡ Comandos de Desarrollo

### Desarrollo y Build

| Comando               | Descripción                                |
| :-------------------- | :----------------------------------------- |
| `npm run start`       | Iniciar aplicación (modo normal)           |
| `npm run start:dev`   | Desarrollo con hot reload                  |
| `npm run start:debug` | Desarrollo con debugger habilitado         |
| `npm run build`       | Build para producción (compila TypeScript) |
| `npm run start:prod`  | Ejecutar build de producción               |

### Testing

| Comando                | Descripción                                             |
| :--------------------- | :------------------------------------------------------ |
| `npm test`             | Ejecuta 1212 tests unitarios (111 suites)               |
| `npm run test:watch`   | Tests en modo watch para desarrollo                     |
| `npm run test:cov`     | Genera reporte de cobertura (72% actual, threshold 71%) |
| `npm run test:debug`   | Tests con debugger para troubleshooting                 |
| `npm run test:e2e`     | Ejecuta 262 tests E2E (14 suites)                       |
| `npm run test:e2e:cov` | Tests E2E con coverage                                  |

### Code Quality

| Comando                | Descripción                             |
| :--------------------- | :-------------------------------------- |
| `npm run lint`         | Ejecutar ESLint (code quality analysis) |
| `npm run lint:fix`     | Auto-fix issues de linting              |
| `npm run format`       | Formatear código con Prettier           |
| `npm run format:check` | Verificar formato sin modificar         |

### Base de Datos

| Comando                                              | Descripción                                         |
| :--------------------------------------------------- | :-------------------------------------------------- |
| `npm run migration:generate -- --name MigrationName` | Generar migración desde entities                    |
| `npm run migration:create -- --name MigrationName`   | Crear migración vacía                               |
| `npm run migration:run`                              | Ejecutar migraciones pendientes                     |
| `npm run migration:revert`                           | Revertir última migración                           |
| `npm run seed:all`                                   | Ejecutar todos los seeds (users, categories, etc.)  |
| `npm run seed:run`                                   | Alias de seed:all                                   |
| `npm run seed:clear`                                 | 🧹 Limpiar todos los datos insertados por los seeds |

---

## ✅ Testing

El proyecto cuenta con una suite de pruebas empresarial con **1212 tests unitarios** (111 suites) y **14 suites E2E** completas.

### Métricas de Testing

- **1212 tests unitarios** ✅ distribuidos en 111 suites de test (6 skipped)
- **14 suites E2E** ✅ (smoke, API, integration, business flows, contracts)
- **72.14% cobertura de código** (umbral profesional: **71%**, superado ✅)
  - Statements: 72.14% ✅ - Threshold: 71%
  - Branches: 61.03% ⚠️ - Threshold: 62% (mejora continua: +0.44%)
  - Functions: 76.37% ✅ - Threshold: 72%
  - Lines: 72.16% ✅ - Threshold: 71%
- **Módulos críticos**: Thresholds configurados (payments, orders)
- **Tiempo de ejecución**: ~57 segundos (unit), ~9 minutos (E2E con servicios reales)

### Tests Unitarios por Módulo

| Módulo             | Archivos de Test | Descripción                                                              |
| :----------------- | :--------------- | :----------------------------------------------------------------------- |
| **Queue Service**  | 5 archivos       | Core, lifecycle, metrics, management, edge cases                         |
| **Processors**     | 19 archivos      | Order, payment, inventory, notification, base processor branch tests     |
| **Orders**         | 8 archivos       | Service (core, queries, errors), controller                              |
| **Products**       | 5 archivos       | CRUD, search, updates, edge cases                                        |
| **Inventory**      | 7 archivos       | Core, reservations, movements, statistics                                |
| **Payments**       | 6 archivos       | Core, refunds, idempotency, errors, stats, provider helpers branch tests |
| **Notifications**  | 3 archivos       | Order, payment/shipping, preferences                                     |
| **Auth**           | 3 archivos       | Authentication, user operations, JWT strategy                            |
| **Users**          | 6 archivos       | CRUD, queries, updates, branch coverage tests                            |
| **Categories**     | 2 archivos       | CRUD controller, service utilities                                       |
| **Events**         | 1 archivo        | Event publisher                                                          |
| **Winston Logger** | 1 archivo        | Structured logging service                                               |
| **Helpers**        | 1 archivo        | Response helpers                                                         |

### Tests E2E Organizados

| Categoría          | Archivos | Descripción                                           |
| :----------------- | :------- | :---------------------------------------------------- |
| **Smoke**          | 1        | Health check básico del sistema                       |
| **API**            | 6        | Auth, users, products, categories, orders, inventory  |
| **Integration**    | 3        | Event outbox, database transactions, queue processing |
| **Business Flows** | 3        | Order saga (happy path, failures), customer journey   |
| **Contracts**      | 1        | API schema validation                                 |

### Estrategia de Cobertura

- **Umbral Actual**: 71% configurado en `jest.config.js`
- **Coverage Actual**: 72.14% (superando threshold ✅)
- **Branch Coverage**: 61.03% (mejora continua hacia 62%)
- **Meta Futura**: 75-80% una vez completada suite completa
- **Últimas Mejoras**: +25 tests estratégicos para branches críticos
  - Error handling en UsersService (4 tests)
  - Network error detection en BaseProcessor (11 tests)
  - Retry logic en MockPaymentProvider helpers (10 tests)
- **Prioridades de Testing**:
  - ✅ Lógica de negocio crítica (Order, Payment, Inventory)
  - ✅ Procesadores de colas y workers
  - ✅ Patrones de resiliencia (Retry, Circuit Breaker, Saga)
  - ✅ Flujos E2E de usuario completos
  - ✅ Error handling y edge cases (mejora continua)

---

## 📚 Documentación Completa

Este proyecto incluye documentación técnica completa y profesional que demuestra planificación previa y procesos de desarrollo estructurados:

### 📖 Documentos Técnicos Principales

| Documento              | Descripción                                             | Link                                               |
| ---------------------- | ------------------------------------------------------- | -------------------------------------------------- |
| **🏗️ Architecture**    | Arquitectura completa del sistema con diagramas Mermaid | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)       |
| **🗄️ Database Design** | Diseño de base de datos, tablas, índices, relaciones    | [docs/DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md) |
| **⚙️ Project Setup**   | Guía de instalación, configuración, despliegue          | [docs/PROJECT_SETUP.md](docs/PROJECT_SETUP.md)     |
| **📋 ADRs (25 docs)**  | Architecture Decision Records en español                | [docs/adr/README.md](docs/adr/README.md)           |
| **🧪 API Testing**     | Guías de testing manual con curl para cada módulo       | [docs/api-testing/](docs/api-testing/)             |

---

## 🏛️ Decisiones de Arquitectura (ADRs)

La arquitectura de este proyecto se basa en **25 Architectural Decision Records (ADRs)** profesionales traducidos al español. Todas las decisiones están documentadas con contexto, alternativas consideradas y consecuencias.

### 🔍 ADRs Principales Implementados

| ADR                                                          | Título                                          | Estado      | Fecha      |
| ------------------------------------------------------------ | ----------------------------------------------- | ----------- | ---------- |
| [ADR-001](docs/adr/001-async-non-blocking-architecture.md)   | Arquitectura Asíncrona No-Bloqueante            | ✅ Aceptado | 2024-01-15 |
| [ADR-002](docs/adr/002-event-driven-outbox-pattern.md)       | Event-Driven con Outbox Pattern                 | ✅ Aceptado | 2024-01-15 |
| [ADR-003](docs/adr/003-saga-pattern-orchestration.md)        | Saga Pattern para Orquestación                  | ✅ Aceptado | 2024-01-15 |
| [ADR-004](docs/adr/004-cqrs-command-query-separation.md)     | CQRS (Command Query Responsibility Segregation) | ✅ Aceptado | 2024-01-15 |
| [ADR-005](docs/adr/005-nestjs-framework-selection.md)        | Selección de NestJS como Framework              | ✅ Aceptado | 2024-01-15 |
| [ADR-006](docs/adr/006-postgresql-typeorm-database.md)       | PostgreSQL + TypeORM para Persistencia          | ✅ Aceptado | 2024-01-15 |
| [ADR-007](docs/adr/007-typeorm-data-layer.md)                | TypeORM como Capa de Datos                      | ✅ Aceptado | 2024-01-15 |
| [ADR-008](docs/adr/008-redis-bull-queue-system.md)           | Redis + Bull para Sistema de Colas              | ✅ Aceptado | 2024-01-16 |
| [ADR-009](docs/adr/009-retry-pattern-exponential-backoff.md) | Retry Pattern con Exponential Backoff           | ✅ Aceptado | 2024-01-16 |
| [ADR-010](docs/adr/010-circuit-breaker-pattern.md)           | Circuit Breaker Pattern                         | ✅ Aceptado | 2024-01-16 |
| [ADR-011](docs/adr/011-idempotency-key-strategy.md)          | Estrategia de Idempotency Keys                  | ✅ Aceptado | 2024-01-16 |
| [ADR-012](docs/adr/012-dead-letter-queue-handling.md)        | Dead Letter Queue Handling                      | ✅ Aceptado | 2024-01-16 |
| [ADR-013](docs/adr/013-jwt-authentication-strategy.md)       | JWT Authentication Strategy                     | ✅ Aceptado | 2024-01-16 |
| [ADR-014](docs/adr/014-role-based-authorization-guards.md)   | Role-Based Authorization Guards                 | ✅ Aceptado | 2024-01-16 |
| [ADR-015](docs/adr/015-helmet-security-middleware.md)        | Middleware de Seguridad Helmet                  | ✅ Aceptado | 2024-01-17 |
| [ADR-016](docs/adr/016-structured-logging-winston.md)        | Logging Estructurado con Winston                | ✅ Aceptado | 2024-01-17 |
| [ADR-017](docs/adr/017-health-checks-terminus.md)            | Health Checks con Terminus                      | ✅ Aceptado | 2024-01-17 |
| [ADR-018](docs/adr/018-prometheus-metrics.md)                | Métricas de Prometheus                          | ✅ Aceptado | 2024-01-17 |
| [ADR-019](docs/adr/019-bull-board-dashboard.md)              | Bull Board Dashboard                            | ✅ Aceptado | 2024-01-17 |
| [ADR-020](docs/adr/020-jest-testing-framework.md)            | Jest Testing Framework                          | ✅ Aceptado | 2024-01-17 |
| [ADR-021](docs/adr/021-supertest-e2e-api-testing.md)         | Supertest para Testing E2E de API               | ✅ Aceptado | 2024-01-17 |
| [ADR-022](docs/adr/022-test-coverage-strategy.md)            | Estrategia de Cobertura de Tests                | ✅ Aceptado | 2024-01-17 |
| [ADR-023](docs/adr/023-docker-multi-stage-builds.md)         | Docker Multi-Stage Builds                       | ✅ Aceptado | 2024-01-17 |
| [ADR-024](docs/adr/024-docker-compose-orchestration.md)      | Orquestación con Docker Compose                 | ✅ Aceptado | 2024-01-17 |
| [ADR-025](docs/adr/025-cicd-husky-lint-staged.md)            | CI/CD con Husky & lint-staged                   | ✅ Aceptado | 2024-01-17 |

### API Swagger UI

Una vez ejecutada la aplicación, la documentación interactiva Swagger está disponible en:

- **Desarrollo**: http://localhost:3000/api/docs
- **Producción**: https://your-domain.com/api/docs

### 📡 Endpoints Principales

| Módulo         | Método | Endpoint                                    | Descripción                 | Auth   |
| -------------- | ------ | ------------------------------------------- | --------------------------- | ------ |
| **Auth**       | `POST` | `/api/v1/auth/register`                     | Registro de usuario         | ❌     |
| **Auth**       | `POST` | `/api/v1/auth/login`                        | Login                       | ❌     |
| **Auth**       | `GET`  | `/api/v1/auth/profile`                      | Perfil usuario              | ✅ JWT |
| **Users**      | `GET`  | `/api/v1/users`                             | Listar usuarios             | ✅ JWT |
| **Users**      | `GET`  | `/api/v1/users/:id`                         | Obtener usuario             | ✅ JWT |
| **Products**   | `GET`  | `/api/v1/products`                          | Listar productos            | ❌     |
| **Products**   | `GET`  | `/api/v1/products/search`                   | Buscar productos            | ❌     |
| **Products**   | `POST` | `/api/v1/products`                          | Crear producto              | ✅ JWT |
| **Categories** | `GET`  | `/api/v1/categories`                        | Listar categorías           | ❌     |
| **Categories** | `GET`  | `/api/v1/categories/tree`                   | Árbol de categorías         | ❌     |
| **Orders**     | `POST` | `/api/v1/orders`                            | **Crear orden (202 Async)** | ✅ JWT |
| **Orders**     | `GET`  | `/api/v1/orders`                            | Listar órdenes              | ✅ JWT |
| **Orders**     | `GET`  | `/api/v1/orders/:id/status`                 | Estado de orden             | ✅ JWT |
| **Inventory**  | `POST` | `/api/v1/inventory` **✨**                  | **Crear inventario (NEW)**  | ✅ JWT |
| **Inventory**  | `GET`  | `/api/v1/inventory/reservations/:id` **✨** | **Detalles reserva (NEW)**  | ✅ JWT |
| **Inventory**  | `POST` | `/api/v1/inventory/check-availability`      | Verificar stock             | ❌     |
| **Inventory**  | `POST` | `/api/v1/inventory/reserve`                 | Reservar stock              | ✅ JWT |
| **Inventory**  | `GET`  | `/api/v1/inventory/low-stock`               | Items con bajo stock        | ❌     |
| **Health**     | `GET`  | `/api/v1/health`                            | Health check general        | ❌     |
| **Health**     | `GET`  | `/api/v1/health/ready`                      | Readiness probe (k8s)       | ❌     |
| **Health**     | `GET`  | `/api/v1/health/detailed`                   | Estado detallado            | ❌     |
| **Metrics**    | `GET`  | `/api/v1/metrics`                           | Prometheus metrics          | ❌     |
| **Queues**     | `GET`  | `/api/v1/admin/queues`                      | Bull Board Dashboard        | ❌     |

> 💡 **Tip**: Usa Swagger UI para testing interactivo con ejemplos de request/response para cada endpoint.

## 🔧 Arquitectura del Código

```
src/
├── app.module.ts                 # Módulo principal
├── main.ts                       # Entry point
├── config/                       # Configuraciones
├── common/                       # Utilities compartidas
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   └── interfaces/
├── modules/
│   ├── auth/                     # Autenticación JWT
│   ├── users/                    # Gestión de usuarios
│   ├── products/                 # Catálogo de productos
│   ├── orders/                   # Procesamiento de órdenes
│   ├── inventory/                # Gestión de inventario
│   ├── payments/                 # Sistema de pagos
│   ├── notifications/            # Notificaciones
│   ├── events/                   # Event sourcing y Outbox
│   └── health/                   # Health checks
├── queues/                       # Bull processors y jobs
│   ├── processors/               # Procesadores de colas especializados
│   ├── queue.module.ts           # Módulo centralizado de colas
│   ├── queue.service.ts          # Servicio de gestión de colas
│   └── bull-board.controller.ts  # Dashboard Bull Board
└── database/                     # Migraciones y seeds
```

## 📊 Monitoreo y Observabilidad

### Health Checks

El sistema implementa health checks robustos usando `@nestjs/terminus` con indicadores personalizados:

#### Endpoints de Health Check

- **General**: `GET /api/v1/health`
  - Verifica: Database, Memory Heap, Memory RSS, Disk Storage
  - Uso: Monitoreo general del sistema
- **Liveness**: `GET /api/v1/health/live`
  - Verifica: Memory Heap
  - Uso: Kubernetes liveness probe - detecta deadlocks
  - Si falla, k8s reinicia el pod
- **Readiness**: `GET /api/v1/health/ready`
  - Verifica: Database connection
  - Uso: Kubernetes readiness probe - controla tráfico
  - Si falla, k8s deja de enviar requests al pod
- **Detailed**: `GET /api/v1/health/detailed`
  - Verifica: Todo lo anterior + métricas detalladas
  - Incluye: Connection pool info, response times
  - Uso: Debugging y troubleshooting

#### Custom Health Indicators

**DatabaseHealthIndicator**

```typescript
// Retorna información del pool de conexiones
{
  "database_detailed": {
    "status": "up",
    "responseTime": 24,        // ms
    "poolSize": 10,
    "idleConnections": 8,
    "waitingCount": 0
  }
}
```

**RedisHealthIndicator** (preparado para integración)

- Verifica conectividad con Redis
- Mide latencia de ping
- Retorna uso de memoria

**QueueHealthIndicator** (preparado para integración)

- Monitorea colas de Bull
- Verifica thresholds configurables
- Detecta fallos en procesamiento

### Prometheus Metrics

El sistema expone métricas en formato Prometheus para scraping:

**Endpoint**: `GET /api/v1/metrics`

#### Métricas de Negocio

- `orders_processed_total` - Counter de órdenes procesadas exitosamente
- `order_processing_duration_seconds` - Histogram de duración de procesamiento
- `order_processing_errors_total` - Counter de errores de procesamiento
- `queue_length` - Gauge de longitud de colas (real-time)
- `queue_job_processing_duration_seconds` - Histogram de duración de jobs
- `http_request_duration_seconds` - Histogram de duración de requests HTTP
- `http_request_errors_total` - Counter de errores HTTP

#### Métricas de Sistema (Auto-colectadas)

- **CPU**: `process_cpu_user_seconds_total`, `process_cpu_system_seconds_total`
- **Memory**: `process_resident_memory_bytes`, `nodejs_heap_size_used_bytes`
- **Event Loop**: `nodejs_eventloop_lag_seconds` con percentiles (p50, p90, p99)
- **Garbage Collection**: `nodejs_gc_duration_seconds` por tipo (minor, major, incremental)
- **Active Resources**: Handles, requests, timers activos

#### Configuración de Prometheus

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'ecommerce-api'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:3002']
    metrics_path: '/api/v1/metrics'
```

#### Ejemplo de Uso con Grafana

```bash
# 1. Levantar stack completo con prometheus/grafana
docker-compose -f docker-compose.yml up -d

# 2. Acceder a Grafana
open http://localhost:3000

# 3. Dashboard pre-configurado incluye:
# - Tasa de procesamiento de órdenes
# - Latencias (p50, p95, p99)
# - Error rates
# - Queue lengths
# - Event loop lag
```

### Métricas (Prometheus)

- Órdenes procesadas por minuto
- Tiempo promedio de procesamiento
- Queue lengths y processing times
- Error rates por endpoint
- Database connection pool status

### Logging Estructurado

```json
{
  "timestamp": "2025-09-23T10:30:00.000Z",
  "level": "info",
  "context": "OrderService",
  "message": "Order processed successfully",
  "orderId": "uuid",
  "userId": "uuid",
  "processingTime": 1250
}
```

## 🐛 Reporting de Issues

Usa nuestros [issue templates](/.github/ISSUE_TEMPLATE/) para:

- 🐛 **Bug Reports**: Describe el problema encontrado
- 💡 **Feature Requests**: Propone nuevas funcionalidades
- 📖 **Documentation**: Mejoras en documentación

---

## 📦 Despliegue

El proyecto está configurado para un despliegue sencillo en un entorno de producción utilizando Docker.

### Despliegue con Docker Compose

Para construir y ejecutar el contenedor de producción:

```sh
docker-compose -f docker-compose.yml up -d
```

### Comandos de Despliegue Disponibles

| Comando                    | Descripción                                        |
| :------------------------- | :------------------------------------------------- |
| `npm run build`            | Construye la aplicación para producción            |
| `npm run start:prod`       | Inicia la aplicación en modo producción            |
| `npm run migration:run`    | Ejecuta migraciones de base de datos               |
| `npm run migration:revert` | Revierte la última migración                       |
| `npm run seed:all`         | Ejecuta todos los seeds (users, categories, etc.)  |
| `npm run seed:clear`       | 🧹 Limpia todos los datos insertados por los seeds |

---

## � CI/CD

Este proyecto utiliza **GitHub Actions** para la integración y el despliegue continuo. El pipeline está definido en `.github/workflows/ci.yml` e incluye las siguientes fases:

1.  **Lint and Format Check:** ESLint, Prettier, análisis de código estático
2.  **Unit Testing:** 103 tests unitarios con Jest
3.  **E2E Testing:** 14 suites E2E completas con servicios reales
4.  **Security Scanning:** npm audit para vulnerabilidades
5.  **Build Validation:** Construcción y validación de la aplicación
6.  **Coverage Report:** Generación de reportes de cobertura

### CI/CD Metrics

- **Pipeline Stages**: 6 stages automatizados
- **Test Execution Time (Unit)**: ~57 segundos (1,187 tests)
- **Test Execution Time (E2E)**: ~9 minutos (262 tests, 14 suites)
- **Total Testing Time**: ~10 minutos
- **Build Time**: <3 minutos
- **Security Checks**: npm audit en cada push

---

## 🤝 Guía de Contribución

### Flujo de Trabajo

1. **Fork** el repositorio
2. Crear una **branch** desde `develop`:
   ```bash
   git checkout develop
   git checkout -b feature/nueva-funcionalidad
   ```
3. **Commit** cambios siguiendo [Conventional Commits](https://www.conventionalcommits.org/)
4. **Push** a tu fork y crear un **Pull Request**

### Estándares de Código

- ✅ **ESLint**: Sin errores de linting
- ✅ **Prettier**: Código formateado
- ✅ **TypeScript**: Sin errores de tipos
- ✅ **Testing**: Agregar tests para nueva funcionalidad
- ✅ **Commits**: Formato conventional commits

### Conventional Commits

```bash
feat: add new order processing saga
fix: resolve inventory race condition
docs: update API documentation
test: add unit tests for payment service
refactor: optimize database queries
chore: update dependencies
```

---

## 📄 Licencia

Este proyecto está bajo la licencia [MIT](LICENSE).

---

## 📞 Contacto

**Ariel D. Righi** - arieldavidrighi@gmail.com

**Enlace del Proyecto:** [https://github.com/ArielDRighi/ecommerce-async-resilient-system](https://github.com/ArielDRighi/ecommerce-async-resilient-system)

---

## 🌟 Estructura del Proyecto

```
ecommerce-async-resilient-system/
├── docs/                            # 📚 Documentación técnica completa
│   ├── ARCHITECTURE.md              # Arquitectura del sistema con diagramas
│   ├── DATABASE_DESIGN.md           # Diseño de base de datos
│   ├── PROJECT_SETUP.md             # Guía de instalación y configuración
│   ├── api-testing/                 # Guías de testing manual con curl
│   └── adr/                         # 25 Architecture Decision Records (español)
│       ├── README.md                # Índice completo de ADRs
│       ├── 001-async-non-blocking-architecture.md
│       ├── 002-event-driven-outbox-pattern.md
│       ├── 003-saga-pattern-orchestration.md
│       ├── ...                      # ADRs 004-014 (patrones y arquitectura)
│       └── 015-025...               # ADRs 015-025 (testing, DevOps, seguridad)
├── src/                             # 💻 Código fuente
│   ├── modules/                     # Módulos de negocio
│   │   ├── auth/                    # Autenticación JWT + Guards
│   │   ├── users/                   # Gestión de usuarios
│   │   ├── products/                # Catálogo de productos
│   │   ├── categories/              # Categorías de productos
│   │   ├── orders/                  # Procesamiento de órdenes (async)
│   │   ├── inventory/               # Gestión de inventario
│   │   ├── payments/                # Sistema de pagos
│   │   ├── notifications/           # Notificaciones (email, SMS)
│   │   └── events/                  # Event sourcing y Outbox Pattern
│   ├── queues/                      # Sistema de colas Bull
│   │   ├── processors/              # 4 workers especializados
│   │   ├── queue.service.ts         # Servicio de gestión de colas
│   │   └── bull-board.controller.ts # Dashboard de monitoreo
│   ├── health/                      # Health checks y métricas Prometheus
│   ├── database/                    # Migraciones y seeds
│   │   ├── migrations/              # Migraciones TypeORM
│   │   └── seeds/                   # Seeds de datos iniciales
│   ├── config/                      # Configuraciones centralizadas
│   ├── common/                      # Utilities compartidas
│   │   ├── decorators/              # Decoradores personalizados
│   │   ├── filters/                 # Exception filters
│   │   ├── guards/                  # Authorization guards
│   │   ├── interceptors/            # Interceptors (logging, transform)
│   │   └── pipes/                   # Validation pipes
│   └── main.ts                      # Entry point de la aplicación
├── test/                            # 🧪 Tests E2E (14 suites)
│   ├── e2e/                         # Tests end-to-end
│   │   ├── api/                     # Tests de API (auth, products, orders...)
│   │   ├── integration/             # Tests de integración (queue, outbox, DB)
│   │   ├── business-flows/          # Tests de flujos de negocio (saga)
│   │   ├── smoke/                   # Smoke tests básicos
│   │   └── contracts/               # Contract testing (API schemas)
│   ├── fixtures/                    # Fixtures de datos de prueba
│   └── helpers/                     # Helpers para tests
├── coverage/                        # 📊 Reportes de cobertura
├── scripts/                         # 🔧 Scripts de utilidad
├── .github/                         # GitHub Actions workflows
│   └── workflows/
│       └── ci.yml                   # Pipeline CI/CD automatizado
├── docker-compose.yml               # 🐳 Orquestación de servicios
├── docker-compose.dev.yml           # 🐳 Compose para desarrollo
├── Dockerfile                       # 🐳 Imagen multi-stage de producción
├── Dockerfile.dev                   # 🐳 Imagen de desarrollo
├── package.json                     # 📦 Dependencias
├── jest.config.js                   # ⚙️ Configuración Jest (coverage 20%)
├── tsconfig.json                    # ⚙️ Configuración TypeScript
├── .eslintrc.js                     # ⚙️ Configuración ESLint
├── .prettierrc                      # ⚙️ Configuración Prettier
└── README.md                        # 📘 Este archivo
```

---

⭐ **¡Dale una estrella si este proyecto te fue útil!**

Este proyecto forma parte de mi portfolio profesional demostrando expertise en:

- ✅ **Arquitecturas Asíncronas y Resilientes** con patrones avanzados (Event Sourcing, Outbox, Saga, CQRS)
- ✅ **Event-Driven Design** con garantías de consistencia transaccional
- ✅ **Message Queuing** con Bull y Redis (4 colas especializadas, DLQ, retry logic)
- ✅ **Patrones de Resiliencia** (Circuit Breaker, Retry, Idempotency, Compensation)
- ✅ **Backend Enterprise** con NestJS, TypeScript, PostgreSQL, TypeORM
- ✅ **RESTful APIs** con documentación OpenAPI/Swagger completa
- ✅ **Testing Exhaustivo** (1212 unit + 262 E2E, coverage 72.14%)
- ✅ **DevOps y CI/CD** con Docker multi-stage, GitHub Actions
- ✅ **Observability** (Health Checks con Terminus, Prometheus metrics, Winston logging)
- ✅ **Security** (JWT authentication, RBAC, Helmet headers, input validation)
- ✅ **Code Quality** (ESLint, Prettier, TypeScript strict mode, 25 ADRs documentados)

---

## 🔧 Troubleshooting - Problemas Comunes

### Problema: Las tablas no se crean automáticamente

**Síntomas:**

- La aplicación inicia correctamente
- Los endpoints responden pero los datos no persisten
- Errores de "table does not exist" en la base de datos

**Causa:** El archivo `.env` tiene `RUN_MIGRATIONS=false`

**Solución:**

```bash
# 1. Editar .env
RUN_MIGRATIONS=true

# 2. Reiniciar la aplicación
# Las migraciones se ejecutarán automáticamente al iniciar
```

### Problema: Conflicto de puertos de PostgreSQL

**Síntomas:**

- Docker muestra error al iniciar PostgreSQL
- Puerto 5432 ya está en uso
- La aplicación no puede conectarse a la base de datos

**Causa:** Otro contenedor o servicio PostgreSQL ya usa el puerto 5432

**Solución:**

```bash
# Opción 1: Detener otros contenedores PostgreSQL
docker ps | grep postgres
docker stop <container-id>

# Opción 2: Cambiar el puerto en docker-compose.yml
services:
  postgres:
    ports:
      - '5433:5432'  # Usar puerto 5433 externamente

# Luego actualizar .env
DATABASE_PORT=5433
```

### Problema: Los datos se pierden al reiniciar

**Síntomas:**

- Los productos/órdenes creados desaparecen después de reiniciar
- Los tests pasan pero los datos no persisten

**Causa:** La aplicación usa bases de datos en memoria o contenedor incorrecto

**Solución:**

```bash
# 1. Verificar que las tablas existen
docker exec ecommerce-postgres psql -U postgres -d ecommerce_async -c "\dt"

# 2. Si no hay tablas, verificar que RUN_MIGRATIONS=true
# 3. Verificar el puerto correcto en .env coincide con docker-compose.yml
# 4. Reiniciar la aplicación para que corra las migraciones
```

### Problema: Las órdenes siempre se cancelan

**Síntomas:**

- POST /orders retorna 202 Accepted
- Pero el estado de la orden es siempre "CANCELLED"
- No hay eventos en outbox_events

**Causa:** Sin persistencia en base de datos, el Saga Pattern no puede procesar órdenes

**Solución:**

```bash
# 1. Asegurar que las tablas existen (ver problema anterior)
# 2. Verificar que hay inventario para los productos:
curl -X POST "$BASE_URL/inventory" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "product-uuid",
    "sku": "PRODUCT-SKU",
    "initialStock": 100
  }'

# 3. Verificar que OutboxProcessor está corriendo (revisar logs)
```

### Problema: Error "Cannot GET /health"

**Síntoma:** Endpoint /health retorna 404

**Causa:** Falta el prefijo de la API

**Solución:**

```bash
# ❌ Incorrecto
curl http://localhost:3002/health

# ✅ Correcto
curl http://localhost:3002/api/v1/health
```

---

## 📥 Instalación y Setup

### Prerequisitos

- **Node.js** 18+ (para Orders Service y API Gateway)
- **Go** 1.21+ (para Inventory Service)
- **Docker** 24+ y **Docker Compose** 2+
- **Make** (opcional, para comandos unificados)

### Setup Completo

```bash
# 1. Clonar repositorio
git clone https://github.com/ArielDRighi/microservices-ecommerce-system.git
cd microservices-ecommerce-system

# 2. Levantar infraestructura (PostgreSQL + Redis + RabbitMQ)
docker-compose up -d

# 3. Instalar dependencias de Orders Service
cd services/orders-service && npm install && cd ../..

# 4. Instalar dependencias de API Gateway
cd services/api-gateway && npm install && cd ../..

# 5. Instalar dependencias de Inventory Service (Go)
cd services/inventory-service && go mod download && cd../..

# 6. Ejecutar migraciones y seeders
cd services/orders-service && npm run migration:run && npm run seed && cd ../..
```

**Ver documentación completa de instalación**: [docs/PROJECT_SETUP.md](docs/PROJECT_SETUP.md)

---

## 🧪 Testing Strategy

### Cobertura por Servicio

| Servicio | Framework | Coverage | Estrategia |
|----------|-----------|----------|------------|
| **Orders** | Jest + Supertest | >70% | Unit + Integration + E2E |
| **Inventory** | go-sqlmock + Testcontainers | >75% | Unit + Integration |
| **API Gateway** | Jest + Supertest | >65% | Unit + Integration |

### Ejecutar Tests

```bash
# Orders Service
cd services/orders-service
npm test                # Unit tests
npm run test:e2e        # E2E tests
npm run test:cov        # Coverage report

# Inventory Service
cd services/inventory-service
make test-unit          # Unit tests con mocks
make test-integration   # Integration tests (Testcontainers)
make test               # Todos los tests

# API Gateway
cd services/api-gateway
npm test                # Unit + integration tests
```

**Referencia**: [ADR-027: Testing Strategy con Testcontainers](docs/adr/027-testcontainers-vs-mocks-go-testing.md)

---

## 📚 Documentación Completa

| Documento | Descripción |
|-----------|-------------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Diagrama de arquitectura detallado |
| [DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md) | Esquemas de PostgreSQL, relaciones |
| [PROJECT_BACKLOG.md](docs/PROJECT_BACKLOG.md) | Backlog completo (8-10 semanas) |
| [PROJECT_SETUP.md](docs/PROJECT_SETUP.md) | Guía de setup detallada |
| [ADRs (29)](docs/adr/README.md) | Architecture Decision Records |
| [API Testing Guides](docs/api-testing/) | Guías por módulo |

---

## 🎤 Para Entrevistas Técnicas

### Habilidades Demostradas

- ✅ **Microservicios**: Arquitectura distribuida con 3 servicios independientes
- ✅ **Multi-lenguaje**: Go + TypeScript (poliglota)
- ✅ **Event-Driven**: RabbitMQ con at-least-once delivery
- ✅ **Resiliencia**: Circuit breakers, retries, Dead Letter Queues
- ✅ **Testing**: Testcontainers + E2E (>70% coverage)
- ✅ **Documentación**: 29 ADRs, diagramas, backlog detallado
- ✅ **DevOps**: Docker, CI/CD, monitoring
- ✅ **Pragmatismo**: Decisiones técnicas justificadas

---

## 🤝 Contribuciones

Este es un proyecto de portfolio personal. No se aceptan contribuciones externas, pero **feedback es bienvenido** via issues.

---

## 📄 Licencia

Este proyecto está bajo la licencia **MIT**. Ver [LICENSE](LICENSE) para más detalles.

---

## 📬 Contacto

**Ariel D. Righi**

- 💼 LinkedIn: [linkedin.com/in/ariel-righi](https://linkedin.com/in/ariel-righi)
- 🐙 GitHub: [@ArielDRighi](https://github.com/ArielDRighi)

---

<p align="center">
  <strong>⭐ Si este proyecto te resultó útil, considera darle una estrella en GitHub ⭐</strong>
</p>

<p align="center">
  <strong>Proyecto 3 de 3</strong> del Portfolio Profesional | <strong>Última actualización:</strong> 17 de Octubre, 2025
</p>

