# ADR-030: Estructura de Monorepo para Ecosistema de Microservicios

## 📋 Metadata

| Campo             | Valor                                                 |
| ----------------- | ----------------------------------------------------- |
| **Estado**        | ✅ ACEPTADA                                           |
| **Fecha**         | 2025-10-17                                            |
| **Contexto**      | Epic 1.1 - Estructura del Monorepo                    |
| **Decisores**     | Equipo de Arquitectura                                |
| **Consecuencias** | Define organización del código para 3+ microservicios |

---

## 🎯 Contexto y Problema

### Situación Actual

Estamos evolucionando el [Sistema Procesador de Órdenes Asíncrono](https://github.com/ArielDRighi/ecommerce-async-resilient-system) (Proyecto 2, monolito NestJS) hacia una **arquitectura de microservicios poliglota** con:

- **3 servicios independientes**: Orders (NestJS), Inventory (Go), API Gateway (Express)
- **2 lenguajes**: TypeScript (Orders + Gateway) + Go (Inventory)
- **Múltiples bases de código**: Frontend futuro, shared libraries, scripts DevOps
- **Documentación extensa**: 29 ADRs, diagramas, backlog, guías de API

### Problema a Resolver

**¿Cómo organizar el código de múltiples microservicios en un único repositorio de manera escalable y mantenible?**

Necesitamos decidir entre:

1. **Monorepo**: Todos los servicios en un solo repositorio
2. **Multi-repo**: Un repositorio por servicio
3. **Híbrido**: Algunos servicios agrupados, otros separados

---

## 🔍 Drivers de Decisión

### Criterios Técnicos

| Criterio                         | Peso       | Descripción                                               |
| -------------------------------- | ---------- | --------------------------------------------------------- |
| **Atomic Commits**               | 🔴 CRÍTICO | Cambiar contratos API entre servicios en un solo commit   |
| **Refactoring Simplificado**     | 🟠 ALTO    | Refactorizar código compartido sin sync entre repos       |
| **Documentación Centralizada**   | 🟠 ALTO    | ADRs, arquitectura, backlog en un solo lugar              |
| **CI/CD Unificado**              | 🟡 MEDIO   | Un pipeline para todos los servicios                      |
| **Facilidad de Clonación**       | 🟡 MEDIO   | Setup inicial con un solo `git clone`                     |
| **Independencia de Deployments** | 🟢 BAJO    | Deploy servicios por separado (no prioridad en portfolio) |
| **Escalabilidad del Repo**       | 🟢 BAJO    | Proyecto de 3-5 servicios (no >50 servicios)              |

### Casos de Uso Específicos

#### Caso 1: Cambiar Contrato de API entre Orders e Inventory

**Escenario**: Inventory añade campo `expiresAt` al endpoint `/reserve`, Orders debe consumirlo.

**Monorepo**:

```bash
git checkout -b feature/add-expiration
# 1. Actualizar Inventory Service (Go)
# 2. Actualizar Orders Service (NestJS)
# 3. Actualizar tipos compartidos (shared/types/)
git commit -m "feat: add reservation expiration"
git push
# ✅ Un solo commit, un solo PR, deploy atómico
```

**Multi-repo**:

```bash
# Repo: inventory-service
git commit -m "feat: add expiresAt field"
git push
git tag v1.2.0

# Repo: shared-types (nuevo)
git commit -m "feat: add expiresAt type"
git push

# Repo: orders-service
# Esperar a que shared-types se publique en npm/registry
npm update @shared/types
git commit -m "feat: consume expiresAt"
git push
# ❌ 3 commits, 3 PRs, coordinación manual, riesgo de desincronización
```

**Resultado**: Monorepo gana por simplicidad.

---

#### Caso 2: Documentar Decisión Arquitectónica (ADR)

**Escenario**: Crear ADR-029 sobre RabbitMQ que afecta a Orders (consumer) e Inventory (publisher).

**Monorepo**:

```bash
# docs/adr/029-message-broker.md
# Un solo lugar, visible para todos los servicios
# ✅ Fácil referenciar desde código: "Ver ADR-029"
```

**Multi-repo**:

```bash
# ¿Dónde va ADR-029?
# Opción A: Repo separado "architecture-docs"
#   ❌ Desarrolladores no lo ven al trabajar en servicio
# Opción B: Duplicar en cada servicio
#   ❌ Inconsistencias, duplicación
# Opción C: Wiki de GitHub
#   ❌ No versionado con código
```

**Resultado**: Monorepo gana por centralización.

---

#### Caso 3: Ejecutar CI/CD para Todo el Ecosistema

**Escenario**: CI debe ejecutar tests de Orders + Inventory + Gateway al crear PR.

**Monorepo**:

```yaml
# .github/workflows/ci.yml
jobs:
  test-orders:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - cd services/orders-service && npm test

  test-inventory:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - cd services/inventory-service && go test ./...

  test-gateway:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - cd services/api-gateway && npm test
# ✅ Un solo workflow, status check consolidado
```

**Multi-repo**:

```bash
# 3 repos = 3 workflows separados
# ❌ No hay forma de validar que cambios en ambos servicios funcionan juntos
# ❌ PR en orders-service no ejecuta tests de inventory-service
```

**Resultado**: Monorepo gana por validación integrada.

---

## 📊 Opciones Evaluadas

### Opción 1: Monorepo (Seleccionada) ✅

**Descripción**: Todos los servicios, shared code, docs y scripts en un solo repositorio.

**Estructura Propuesta**:

```
microservices-ecommerce-system/
├── services/
│   ├── orders-service/      # NestJS + TypeScript
│   ├── inventory-service/   # Go + Gin
│   └── api-gateway/         # Express + TypeScript
├── shared/
│   ├── types/               # TypeScript types compartidos
│   └── proto/               # Protobuf (futuro gRPC)
├── docs/
│   ├── adr/                 # 29 ADRs
│   ├── api-testing/         # Guías de API
│   └── *.md                 # Arquitectura, backlog, etc.
├── scripts/                 # DevOps scripts compartidos
├── docker-compose.yml       # Infraestructura unificada
└── .github/workflows/       # CI/CD consolidado
```

**Pros**:

- ✅ **Atomic commits**: Cambiar múltiples servicios en un solo commit
- ✅ **Refactoring simplificado**: Actualizar shared types sin publicar a npm
- ✅ **Documentación centralizada**: ADRs, arquitectura, backlog en un solo lugar
- ✅ **CI/CD unificado**: Un pipeline valida todo el ecosistema
- ✅ **Onboarding más fácil**: Un solo `git clone`
- ✅ **Versionado sincronizado**: Tags de git aplican a todo el proyecto
- ✅ **Code review consolidado**: Un PR puede cambiar Orders + Inventory
- ✅ **Búsqueda global**: `git grep` busca en todos los servicios

**Contras**:

- ❌ **Repositorio más grande**: ~500 MB vs ~100 MB por servicio individual
  - **Mitigación**: No es problema para proyecto de portfolio (no >10 GB)
- ❌ **CI más lento**: Tests de 3 servicios en cada PR
  - **Mitigación**: GitHub Actions con jobs paralelos (~5 min total)
- ❌ **Permisos granulares limitados**: No se puede dar acceso solo a Inventory
  - **Mitigación**: No aplica (proyecto individual, no equipo grande)

**Ejemplos en la Industria**:

- **Google**: Monorepo gigante con Bazel (2B+ líneas de código)
- **Facebook/Meta**: Monorepo con Mercurial
- **Nx Monorepo**: Framework especializado (Angular, React, NestJS)
- **Vercel Turborepo**: Monorepo con caching inteligente

**Herramientas**:

- Nx (si proyecto crece a >10 servicios)
- Turborepo (si se necesita cache distribuido)
- Git sparse-checkout (si repo crece mucho)

---

### Opción 2: Multi-Repo (Rechazada) ❌

**Descripción**: Un repositorio por servicio (orders-service, inventory-service, api-gateway, shared-types).

**Estructura**:

```
repos/
├── orders-service/          # Repo 1
├── inventory-service/       # Repo 2
├── api-gateway/             # Repo 3
├── shared-types/            # Repo 4 (published to npm)
└── architecture-docs/       # Repo 5 (ADRs, diagramas)
```

**Pros**:

- ✅ **Deployments independientes**: Deploy Orders sin tocar Inventory
  - **Contraargumento**: En Docker Compose, ya son independientes (servicios separados)
- ✅ **Permisos granulares**: Equipo A solo accede a Orders
  - **Contraargumento**: No aplica (proyecto individual)
- ✅ **CI más rápido por servicio**: Solo tests del servicio cambiado
  - **Contraargumento**: GitHub Actions cache + paralelización hacen monorepo igual de rápido

**Contras**:

- ❌ **Coordinación manual**: Cambiar contrato API requiere 3 commits en 3 repos
- ❌ **Shared code complejo**: Publicar `shared-types` a npm registry
- ❌ **Documentación fragmentada**: ADRs en repo separado, desarrolladores no lo ven
- ❌ **CI no valida integración**: PR en Orders no ejecuta tests de Inventory
- ❌ **Onboarding difícil**: Clonar 5 repos, setup de cada uno
- ❌ **Versionado complejo**: ¿Cómo sincronizar versiones entre repos?
- ❌ **Code review fragmentado**: Cambio en 2 servicios = 2 PRs separados

**Cuándo Usar Multi-Repo**:

- Equipos grandes (>50 personas) con ownership claro por servicio
- Servicios con ciclos de vida MUY independientes (años sin interactuar)
- Requisitos de seguridad estrictos (equipos no deben ver código de otros)

**Veredicto**: ❌ **RECHAZADO** - Añade complejidad sin beneficio para proyecto de 3 servicios.

---

### Opción 3: Híbrido (Rechazada) ❌

**Descripción**: Agrupar servicios relacionados en repos, separar documentación.

**Ejemplo**:

```
repos/
├── backend-services/        # Orders + Inventory + Gateway (monorepo)
├── frontend/                # React/Next.js (si se añade futuro)
└── architecture-docs/       # ADRs, diagramas
```

**Pros**:

- ✅ Balance entre monorepo (servicios backend) y multi-repo (frontend separado)

**Contras**:

- ❌ **Documentación todavía fragmentada**: ADRs en repo separado
- ❌ **Complejidad innecesaria**: Frontend no existe aún
- ❌ **Peor de ambos mundos**: No tiene ventajas claras de monorepo ni multi-repo

**Veredicto**: ❌ **RECHAZADO** - Complejidad prematura (frontend no existe).

---

## ✅ Decisión Final

### 🏆 Seleccionamos: Monorepo

**Decisión**: Organizar todos los servicios, shared code, documentación y scripts en un **único repositorio monorepo**.

**Justificación**:

1. **Atomic commits** (peso CRÍTICO)

   - Cambiar contratos API entre servicios en un solo commit
   - Refactorizar código compartido sin publicar a npm
   - Ejemplo: Añadir `expiresAt` a reservas (Inventory + Orders en 1 PR)

2. **Documentación centralizada** (peso ALTO)

   - 29 ADRs en `docs/adr/`, visibles para todos
   - Arquitectura, backlog, guías en un solo lugar
   - Desarrolladores ven docs al trabajar en servicio

3. **CI/CD unificado** (peso MEDIO)

   - Un pipeline valida todo el ecosistema
   - GitHub Actions con jobs paralelos (5 min total)
   - Status check consolidado en PRs

4. **Onboarding simplificado** (peso MEDIO)

   - Un solo `git clone`
   - Un solo README principal
   - Docker Compose levanta toda la infraestructura

5. **Valor de portfolio** (peso BAJO pero relevante)
   - Demuestra experiencia con monorepos (como Google, Meta)
   - Facilita que evaluadores revisen todo el código
   - Mejor presentación: un link vs múltiples repos

---

## 🏗️ Estructura Implementada

### Árbol de Carpetas

```
microservices-ecommerce-system/           # Raíz del monorepo
├── 📂 services/                          # Microservicios independientes
│   ├── 📦 orders-service/                # NestJS + TypeScript
│   │   ├── src/
│   │   │   ├── orders/                   # Módulo de órdenes (CRUD)
│   │   │   ├── users/                    # Módulo de usuarios
│   │   │   ├── categories/               # Módulo de categorías
│   │   │   ├── saga/                     # Saga Pattern implementation
│   │   │   ├── messaging/                # RabbitMQ consumer
│   │   │   └── queues/                   # Bull queues (async jobs)
│   │   ├── test/                         # E2E tests con Supertest
│   │   ├── package.json                  # Dependencias NestJS
│   │   ├── tsconfig.json
│   │   └── README.md                     # Docs específicas del servicio
│   │
│   ├── 📦 inventory-service/             # Go + Gin
│   │   ├── cmd/api/                      # Entry point (main.go)
│   │   ├── internal/
│   │   │   ├── domain/                   # Entities (Product, Reservation)
│   │   │   ├── application/              # Use cases (CRUD, reservas)
│   │   │   ├── infrastructure/           # DB, Redis, RabbitMQ
│   │   │   └── interfaces/               # HTTP handlers (Gin)
│   │   ├── tests/
│   │   │   ├── unit/                     # Unit tests con mocks
│   │   │   └── integration/              # Testcontainers (PostgreSQL real)
│   │   ├── go.mod                        # Dependencias Go
│   │   ├── go.sum
│   │   ├── Makefile                      # Comandos build/test/run
│   │   └── README.md
│   │
│   └── 📦 api-gateway/                   # Express + TypeScript
│       ├── src/
│       │   ├── routes/                   # Proxy routing a servicios
│       │   ├── middleware/               # Auth JWT, rate limit, circuit breaker
│       │   └── monitoring/               # Prometheus metrics
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md
│
├── 📂 shared/                            # Código compartido entre servicios
│   ├── types/                            # TypeScript types
│   │   ├── events/                       # Event schemas (RabbitMQ)
│   │   │   ├── inventory.events.ts       # InventoryReservedEvent, etc.
│   │   │   └── orders.events.ts          # OrderCancelledEvent, etc.
│   │   └── dtos/                         # DTOs compartidos
│   └── proto/                            # Protobuf definitions (futuro gRPC)
│
├── 📂 docs/                              # Documentación completa del ecosistema
│   ├── ARCHITECTURE.md                   # Diagrama de arquitectura detallado
│   ├── DATABASE_DESIGN.md                # Esquemas PostgreSQL, relaciones
│   ├── PROJECT_BACKLOG.md                # Backlog completo (8-10 semanas)
│   ├── PROJECT_SETUP.md                  # Guía de setup paso a paso
│   ├── INFRASTRUCTURE_REFERENCE.md       # Docker, CI/CD, deployment
│   ├── VULNERABILIDADES.md               # Análisis de seguridad
│   ├── adr/                              # Architecture Decision Records
│   │   ├── 001-async-non-blocking-architecture.md
│   │   ├── 026-api-gateway-express-custom.md
│   │   ├── 027-testcontainers-vs-mocks-go-testing.md
│   │   ├── 028-rest-synchronous-communication-strategy.md
│   │   ├── 029-message-broker-rabbitmq-vs-redis-pubsub.md
│   │   ├── 030-monorepo-structure.md     # Este ADR
│   │   └── README.md                     # Índice de ADRs
│   └── api-testing/                      # Guías de testing de API
│       ├── 00-QUICK-START-DEMO.md
│       ├── 01-AUTH-MODULE.md
│       └── ...
│
├── 📂 scripts/                           # Scripts de DevOps compartidos
│   ├── init-db.sql                       # Schema inicial PostgreSQL
│   ├── migrate.sh                        # Script de migraciones
│   ├── rollback.sh                       # Rollback de migraciones
│   ├── deploy-staging.sh                 # Deploy a staging
│   └── deploy-production.sh              # Deploy a producción
│
├── 📂 .github/                           # GitHub Actions CI/CD
│   └── workflows/
│       ├── ci.yml                        # Tests de todos los servicios
│       ├── deploy-staging.yml            # Deploy automático a staging
│       └── deploy-production.yml         # Deploy manual a producción
│
├── docker-compose.yml                    # Infraestructura completa (PostgreSQL, Redis, RabbitMQ)
├── docker-compose.dev.yml                # Variante para desarrollo
├── .gitignore                            # Multi-lenguaje (Node.js + Go)
├── Makefile                              # Comandos unificados raíz
├── README.md                             # README principal del ecosistema
└── LICENSE                               # MIT License
```

### Convenciones de Naming

| Elemento            | Convención                    | Ejemplo                               |
| ------------------- | ----------------------------- | ------------------------------------- |
| **Servicios**       | kebab-case + `-service`       | `orders-service`, `inventory-service` |
| **Carpetas shared** | lowercase singular            | `types`, `proto`                      |
| **Docs**            | UPPERCASE.md para principales | `ARCHITECTURE.md`, `README.md`        |
| **Scripts**         | kebab-case.sh                 | `deploy-staging.sh`, `init-db.sql`    |
| **Workflows**       | kebab-case.yml                | `ci.yml`, `deploy-production.yml`     |

---

## 🔄 Workflows con Monorepo

### Workflow 1: Añadir Nuevo Evento RabbitMQ

```bash
# Scenario: Añadir evento InventoryStockDepleted

# 1. Crear tipo compartido
echo "export interface InventoryStockDepletedEvent { ... }" > \
  shared/types/events/inventory.events.ts

# 2. Implementar Publisher en Inventory (Go)
# Editar: services/inventory-service/internal/infrastructure/messaging/publisher.go

# 3. Implementar Consumer en Orders (NestJS)
# Editar: services/orders-service/src/messaging/inventory-events.consumer.ts

# 4. Commit atómico
git add .
git commit -m "feat: add InventoryStockDepleted event

- shared/types: Add event interface
- inventory: Publish event when stock reaches 0
- orders: Consume event and trigger alert
"

# ✅ Un solo commit, todo sincronizado
```

### Workflow 2: Actualizar Documentación (ADR)

```bash
# Crear nuevo ADR
vim docs/adr/031-grpc-migration.md

# Actualizar índice
vim docs/adr/README.md

# Referenciar desde código
# services/inventory-service/README.md: "Ver ADR-031"

git commit -m "docs: add ADR-031 for gRPC migration decision"

# ✅ Documentación versionada con código
```

### Workflow 3: CI/CD con Cambios en Múltiples Servicios

```yaml
# .github/workflows/ci.yml
name: CI Pipeline
on: [push, pull_request]

jobs:
  test-orders:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Test Orders Service
        run: |
          cd services/orders-service
          npm install
          npm test

  test-inventory:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Test Inventory Service
        run: |
          cd services/inventory-service
          go test ./...

  test-gateway:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Test API Gateway
        run: |
          cd services/api-gateway
          npm install
          npm test

  integration:
    needs: [test-orders, test-inventory, test-gateway]
    runs-on: ubuntu-latest
    steps:
      - name: Run Integration Tests
        run: docker-compose up -d && npm run test:e2e
```

**Beneficio**: Un PR ejecuta tests de todos los servicios, validando integración completa.

---

## 🎓 Lecciones de Monorepos en la Industria

### Google's Monorepo

- **Escala**: 2B+ líneas de código, 25k+ ingenieros
- **Herramienta**: Bazel (build system)
- **Beneficio clave**: Refactoring masivo (cambiar API usada por 1000 servicios en 1 commit)

**Lección para este proyecto**: Monorepo facilita refactoring cross-service.

### Facebook/Meta's Monorepo

- **Escala**: 100M+ líneas de código
- **Herramienta**: Mercurial (VCS custom)
- **Beneficio clave**: Code search global, ownership claro por carpetas

**Lección para este proyecto**: Búsqueda global (`git grep`) es poderosa.

### Nx Monorepo (Open Source)

- **Stack**: Angular, React, NestJS, Next.js
- **Features**: Dependency graph, affected tests only
- **Beneficio clave**: CI inteligente (solo ejecutar tests de servicios afectados)

**Lección para este proyecto**: Si crece a >10 servicios, considerar Nx.

---

## 📊 Comparación Cuantitativa

| Métrica                    | Monorepo          | Multi-Repo (5 repos)                  |
| -------------------------- | ----------------- | ------------------------------------- |
| **Tiempo de onboarding**   | 5 min (1 clone)   | 25 min (5 clones + setup)             |
| **Cambios cross-service**  | 1 commit          | 3-5 commits + coordinación            |
| **CI/CD complejidad**      | 1 workflow        | 5 workflows + orchestration           |
| **Búsqueda de código**     | `git grep` global | Buscar en 5 repos manualmente         |
| **Actualizar shared code** | Commit directo    | Publicar npm + update 3 servicios     |
| **Documentación**          | Centralizada      | Fragmentada en 5 lugares              |
| **Tamaño del repo**        | ~500 MB           | ~100 MB cada uno (500 MB total igual) |
| **Tiempo de CI**           | 5 min (paralelo)  | 3 min x 5 = 15 min total (secuencial) |

**Conclusión**: Monorepo es superior en 7/8 métricas para proyecto de 3-5 servicios.

---

## 🔗 Referencias

- [Advantages of Monorepos (nx.dev)](https://nx.dev/concepts/more-concepts/why-monorepos)
- [Why Google Stores Billions of Lines in a Single Repository](https://cacm.acm.org/magazines/2016/7/204032-why-google-stores-billions-of-lines-of-code-in-a-single-repository/fulltext)
- [Monorepo vs Multi-Repo (Atlassian)](https://www.atlassian.com/git/tutorials/monorepos)
- [Turborepo Handbook](https://turbo.build/repo/docs/handbook)

---

## 📝 Changelog

| Fecha      | Cambio                                | Autor               |
| ---------- | ------------------------------------- | ------------------- |
| 2025-10-17 | ADR-030 creado - Decisión de monorepo | Equipo Arquitectura |

---

**Estado:** ✅ ACEPTADA  
**Próximo paso:** Epic 1.2 - Configurar Inventory Service en Go
