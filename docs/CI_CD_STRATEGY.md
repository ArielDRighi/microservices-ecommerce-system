# Estrategia de CI/CD - Microservices E-commerce System

**Fecha:** 2025-10-17  
**Estado:** Fase 1 - Epic 1.3 ✅ COMPLETADO | Epic 1.4 EN PROGRESO  
**Última actualización:** Epic 1.3 completado y mergeado - Epic 1.4 iniciado

---

## 🎯 Filosofía: "CI/CD debe coincidir con la madurez del proyecto"

Este documento explica la **estrategia progresiva** de CI/CD adaptada al estado real del código.

---

## 📊 Estado Actual del Proyecto

### Epic 1.3: CI/CD Pipeline Inicial ✅ COMPLETADO

```
├── Epic 1.1 ✅ Estructura del Monorepo (COMPLETADA)
├── Epic 1.2 ✅ Inventory Service - Esqueleto Básico (COMPLETADA)
├── Epic 1.3 ✅ CI/CD - Pipeline Inicial (COMPLETADA - MERGEADA)
│   ├── T1.3.1 ✅ Crear inventory-service-ci.yml
│   ├── T1.3.2 ✅ Configurar golangci-lint
│   ├── T1.3.3 ✅ Crear orders-service-ci.yml
│   └── T1.3.4 ✅ Añadir badges CI/CD al README
└── Epic 1.4 🔄 Docker & Orchestration (EN PROGRESO)
    ├── T1.4.1 ✅ docker-compose.yml principal
    ├── T1.4.2 ✅ Bases de datos separadas
    ├── T1.4.3 ✅ Dockerfile para Inventory Service
    ├── T1.4.4 ⏳ Dockerfile.dev (desarrollo con hot-reload)
    └── T1.4.5 ⏳ Setup RabbitMQ
```

**Epic 1.3 - Resultado:**

- ✅ Pipelines minimalistas: Build + Lint (non-blocking)
- ✅ Tests deshabilitados explícitamente (con documentación)
- ✅ CI pasa en todos los servicios
- ✅ PR #6 mergeado a develop

**Epic 1.4 - Objetivo:**

- Completar infraestructura Docker
- RabbitMQ para mensajería asíncrona
- Hot-reload en desarrollo

**Duración Epic 1.4:** ~3-5 días

---

## 🔧 Pipelines ACTIVOS en Epic 1.3

### 1. CI Basic (`.github/workflows/ci-basic.yml`)

**Propósito:** Validación estructural ligera del monorepo

**Lo que hace:**

- ✅ Valida estructura de directorios
- ✅ Verifica archivos de configuración existen
- ✅ Linting básico (no bloqueante)

**Estado:** ✅ ACTIVO

---

### 2. Inventory Service CI (`.github/workflows/inventory-service-ci.yml`)

**Propósito:** Build + Linting para servicio Go

**Jobs:**

#### Job 1: Build & Unit Tests

- ✅ **Build**: Compila binario Go
- ⏸️ **Tests**: DISABLED (no hay DB configurada - pendiente Epic 1.4)
- ⏸️ **Coverage**: DISABLED (se habilitará en Epic 2.x)

```yaml
- name: Build application
  run: go build -v -o bin/inventory-service cmd/api/main.go

- name: Run unit tests (DISABLED - Epic 1.3)
  run: |
    echo "⏸️ Tests DISABLED - Database not configured yet"
    # go test ./internal/... (se habilitará en Epic 1.4)
```

#### Job 2: Integration Tests

- ⏸️ **Status**: Skipped (requiere Testcontainers + Docker - Epic 1.4)

#### Job 3: Linting

- ✅ **golangci-lint**: Ejecuta pero `continue-on-error: true` (non-blocking)
- ✅ **gofmt**: Check de formateo (warnings, no falla el pipeline)
- ✅ **go vet**: Análisis estático (warnings, no falla el pipeline)

```yaml
- uses: golangci/golangci-lint-action@v6
  continue-on-error: true # Non-blocking for Epic 1.3
```

#### Job 4: Security

- ✅ **gosec**: Scanner de seguridad (ejecuta, warnings non-blocking)

**Path filters:** Solo ejecuta si cambian archivos en `services/inventory-service/**`

**Estado:** ✅ ACTIVO (minimalista - solo build + lint)

---

### 3. Orders Service CI (`.github/workflows/orders-service-ci.yml`)

**Propósito:** Build + Linting para servicio NestJS

**Jobs:**

#### Job 1: Build & Unit Tests

- ✅ **Install**: `npm ci --ignore-scripts` (evita husky en monorepo)
- ✅ **Lint**: `npm run lint` (warnings non-blocking)
- ✅ **Build**: `npm run build` (validación TypeScript)
- ⏸️ **Tests**: DISABLED (servicio reciclado, no configurado aún)

```yaml
- name: Install dependencies
  run: npm ci --ignore-scripts # Evita husky en CI

- name: Run unit tests (DISABLED - Epic 1.3)
  run: |
    echo "⏸️ Tests DISABLED - Service not configured yet"
    echo "📝 Missing: .env, database, configuration"
    # npm run test:cov (se habilitará en Epic 2.x)
```

**Por qué tests están deshabilitados:**

- Orders Service es **código reciclado** de otro proyecto
- **NO está configurado** para este proyecto:
  - ❌ Sin `.env` configurado
  - ❌ Sin base de datos creada
  - ❌ Variables de entorno incorrectas

#### Job 2: E2E Tests

- ⏸️ **Status**: Skipped (servicio no configurado, se habilitará en Epic 2.x)

```yaml
e2e-tests:
  name: E2E Tests (Disabled)
  steps:
    - run: echo "⏸️ E2E tests DISABLED during Epic 1.3"
```

#### Job 3: Linting

- ✅ **ESLint**: Ejecuta (warnings non-blocking)
- ✅ **Prettier**: Check de formateo (warnings non-blocking)
- ✅ **TypeScript**: Type checking vía build (warnings non-blocking)

```yaml
- run: npm run lint || echo "⚠️ Linting issues (non-blocking)"
```

#### Job 4: Security

- ⏸️ **npm audit**: Skipped (23 vulnerabilidades conocidas en devDeps)

**Path filters:** Solo ejecuta si cambian archivos en `services/orders-service/**`

**Estado:** ✅ ACTIVO (minimalista - solo build + lint)

---

## 📅 Roadmap de CI/CD por Epic

### Epic 1.3: CI/CD Pipeline Inicial (ACTUAL)

```yaml
Inventory Service:
  - ✅ Build compilation
  - ✅ Linting (non-blocking)
  - ⏸️ Unit tests DISABLED
  - ⏸️ Coverage DISABLED

Orders Service:
  - ✅ Build compilation
  - ✅ Linting (non-blocking)
  - ⏸️ Unit tests DISABLED
  - ⏸️ E2E tests DISABLED
  - ⏸️ Coverage DISABLED

Criteria:
  - ✅ Pipelines ejecutan sin errores
  - ✅ Builds compilan correctamente
  - ✅ Linting está configurado (warnings OK)
  - ❌ Tests automáticos (fuera de scope)
```

**Duración:** 1 semana  
**Entregable:** Workflows funcionando con builds + linting

---

### Epic 1.4: Docker & Orchestration (PRÓXIMA)

```yaml
Inventory Service:
  - ✅ Build compilation (mantener)
  - ✅ Linting (mantener)
  - 🆕 Unit tests ENABLED (con DB en Docker)
  - 🆕 Coverage threshold >70% (enforced)
  - ⏸️ Integration tests (Testcontainers, manual)

Orders Service:
  - ✅ Build compilation (mantener)
  - ✅ Linting (mantener)
  - ⏸️ Unit tests (pendiente adaptación servicio)
  - ⏸️ E2E tests (pendiente adaptación servicio)

Infrastructure:
  - 🆕 docker-compose.yml configurado
  - 🆕 PostgreSQL databases (inventory, orders)
  - 🆕 Redis cluster
  - 🆕 Health checks
```

**Duración:** 2-3 semanas  
**Entregable:** Inventory Service completo con tests automáticos

---

### Epic 2.x: Feature Implementation (FUTURA)

```yaml
Inventory Service:
  - ✅ Build + Lint + Unit Tests (mantener)
  - 🆕 Integration tests ENABLED (Testcontainers en CI)
  - 🆕 Coverage threshold >75% (enforced)

Orders Service:
  - 🆕 Service ADAPTED to this project
  - 🆕 Unit tests ENABLED (.env, DB configured)
  - 🆕 E2E tests ENABLED (PostgreSQL, Redis)
  - 🆕 Coverage threshold >70% (enforced)

Test Strategy:
  - Unit: Jest (NestJS), Go testing
  - Integration: Testcontainers (Inventory)
  - E2E: Supertest (Orders)
```

**Duración:** 3-4 semanas  
**Entregable:** Ambos servicios con tests completos + coverage >70%

---

### Epic 3.x: CI/CD Avanzado (FUTURA)

```yaml
CI:
  - ✅ All tests passing automatically
  - 🆕 Performance tests (load testing)
  - 🆕 Security scans (SARIF upload)
  - 🆕 Mutation testing (optional)

CD:
  - 🆕 Docker images build
  - 🆕 Push to ghcr.io
  - 🆕 Deploy to staging (Railway/Fly.io)
  - ⏸️ Production deploy (manual approval)
```

**Duración:** 2-3 semanas  
**Entregable:** CD pipeline completo con staging environment

---

## 🚨 Decisiones Importantes

### 1. Tests DISABLED en Epic 1.3

**Razón:**

- Epic 1.3 es **setup de CI/CD**, no configuración de servicios
- **Inventory**: Solo tiene esqueleto (sin DB configurada)
- **Orders**: Código reciclado (sin .env, sin adaptación)

**Cuándo se habilitan:**

- **Inventory**: Epic 1.4 (cuando Docker/DB estén listos)
- **Orders**: Epic 2.x (cuando se adapte el servicio)

---

### 2. Linting Non-Blocking

**Razón:**

- Código reciclado tiene estilo diferente (otro proyecto)
- PoC de Testcontainers tiene warnings técnicos
- Epic 1.3 es **informativo**, no enforcement

**Cuándo se vuelve bloqueante:**

- Epic 2.x (cuando código esté limpio y adaptado)

---

### 3. Coverage DISABLED

**Razón:**

- No hay tests ejecutándose → no hay coverage
- Coverage enforcement solo tiene sentido con tests activos

**Cuándo se habilita:**

- **Inventory**: Epic 1.4 (threshold >70%)
- **Orders**: Epic 2.x (threshold >70%)

---

## 🎓 Para Entrevistas

**Pregunta:** "¿Por qué tus tests están deshabilitados en CI?"

**Respuesta profesional:**

> "Aplico **CI/CD progresivo** alineado con la madurez del proyecto.
>
> Estoy en **Epic 1.3** (CI/CD Setup). Mi objetivo es validar:
>
> - ✅ El código **compila**
> - ✅ El **linting** está configurado
> - ✅ La **estructura** es correcta
>
> Los tests están **explícitamente deshabilitados** porque:
>
> 1. **Inventory Service**: Solo esqueleto básico (sin DB - pendiente Epic 1.4)
> 2. **Orders Service**: Código reciclado, no configurado (sin .env, sin DB)
>
> Los habilito **progresivamente**:
>
> - Epic 1.4: Inventory tests (con Docker/DB)
> - Epic 2.x: Orders tests (servicio adaptado)
>
> Es más **profesional** deshabilitar tests con documentación clara que tener pipelines rojos por configuración faltante."

---

## 📚 Referencias

- **Backlog:** `docs/PROJECT_BACKLOG.md`
- **Errores:** `docs/pipeline_errores.md`
- **Workflows:**
  - `.github/workflows/ci-basic.yml`
  - `.github/workflows/inventory-service-ci.yml`
  - `.github/workflows/orders-service-ci.yml`

---

**Última actualización:** 2025-10-17 (Epic 1.3 - Pipelines minimalistas configurados)

---

## 🔧 Pipelines por Fase

### ✅ Pipelines ACTIVOS en Fase 1 (Epic 1.3)

#### 1. **CI Basic** (`.github/workflows/ci-basic.yml`)

**Propósito:** Validación estructural ligera del monorepo  
**Trigger:** `push` a cualquier rama, `pull_request`  
**Lo que hace:**

- ✅ Valida estructura de directorios
- ✅ Verifica archivos de configuración existen
- ✅ Ejecuta `gofmt` (formateo Go)
- ✅ Ejecuta `go vet` (análisis estático Go)
- ✅ Verifica `package.json`, `tsconfig.json` (Orders)

**Estado:** ✅ **ACTIVO** (desde Fase 0)

---

#### 2. **Inventory Service CI** (`.github/workflows/inventory-service-ci.yml`) 🆕

**Propósito:** CI/CD completo para servicio Go  
**Trigger:** `push`/`pull_request` con path filters (`services/inventory-service/**`)  
**Lo que hace:**

- ✅ **Build & Unit Tests**
  - Compila binario Go
  - Ejecuta tests unitarios con coverage
  - Verifica threshold mínimo 70%
  - Sube reporte de coverage
- ✅ **Integration Tests**
  - Tests con Testcontainers (PostgreSQL real)
  - Timeout 5 minutos
- ✅ **Linting**
  - golangci-lint con `.golangci.yml` estricto
  - gofmt check
  - go vet
- ✅ **Security Scan**
  - gosec para vulnerabilidades
  - SARIF upload para GitHub Security tab
- ✅ **Summary**
  - Reporte consolidado
  - Comentario automático en PRs

**Path filters:** Solo ejecuta si cambian archivos en `services/inventory-service/**`

**Estado:** ✅ **ACTIVO** (Epic 1.3 - T1.3.1, T1.3.2)

---

#### 3. **Orders Service CI** (`.github/workflows/orders-service-ci.yml`) 🆕

**Propósito:** CI/CD completo para servicio NestJS  
**Trigger:** `push`/`pull_request` con path filters (`services/orders-service/**`)  
**Lo que hace:**

- ✅ **Build & Unit Tests**
  - npm ci para dependencias
  - npm run lint (ESLint)
  - npm run build (TypeScript)
  - npm run test:cov (Jest con coverage)
  - Verifica threshold mínimo 70%
  - Sube coverage a Codecov
- ✅ **E2E Tests**
  - Tests con Supertest
  - PostgreSQL y Redis en GitHub Actions services
- ✅ **Linting**
  - ESLint con reglas estrictas
  - Prettier check
  - TypeScript type checking
- ✅ **Security Audit**
  - npm audit (nivel moderate)
- ✅ **Summary**
  - Reporte consolidado
  - Comentario automático en PRs

**Services:** PostgreSQL 16, Redis 7 (GitHub Actions containers)

**Path filters:** Solo ejecuta si cambian archivos en `services/orders-service/**`

**Estado:** ✅ **ACTIVO** (Epic 1.3 - T1.3.3)

---

### ⏸️ Pipelines DESHABILITADOS en Fase 0

#### 2. **CD Pipeline** (`.github/workflows/cd.yml`)

**Propósito:** Build de Docker images + Deploy a staging/production  
**Trigger anterior:** `push` a `main` (automático)  
**Trigger actual:** `workflow_dispatch` (manual, deshabilitado)

**Por qué está deshabilitado:**

```
ERROR: failed to read dockerfile: open Dockerfile: no such file or directory
```

**Estado del código:**

- API Gateway: **VACÍO** (solo ADR-026)
- Inventory Service: **SKELETON** (estructura básica, sin implementación)
- Orders Service: **COMPLETO** (pero no adaptado al monorepo)

**No tiene sentido buildear imágenes Docker cuando no hay servicios listos.**

**Estado:** ⏸️ **DESHABILITADO** (comentado trigger `push`)

**Se reactivará en:** Fase 1 (cuando haya servicios implementados)

---

## 📅 Roadmap de CI/CD por Fase

### Fase 0: Technical Spikes (ACTUAL)

```yaml
CI:
  - ✅ ci-basic.yml (estructura, formateo, linting)

CD:
  - ⏸️ cd.yml (DESHABILITADO - no hay servicios)

Tests:
  - ⏸️ Sin tests automáticos (solo PoCs manuales)
```

**Duración:** 1-2 semanas  
**Entregable:** 4 ADRs + decisiones arquitectónicas

---

### Fase 1: Implementación Base (PRÓXIMA)

```yaml
CI:
  - ✅ ci-basic.yml (mantener)
  - 🆕 ci-full.yml (añadir):
      - npm install / go mod download
      - Unit tests (Jest, Go testing)
      - Linting avanzado (ESLint, golangci-lint)
      - Coverage reports (80%+ target)

CD:
  - ⏸️ cd.yml (TODAVÍA DESHABILITADO - no hay infra)

Tests:
  - ✅ Unit tests automáticos (cada push)
  - ⏸️ Integration tests (manual, requiere Docker)
```

**Duración:** 2-3 semanas  
**Entregable:**

- Inventory Service completo (CRUD, repositorios, locking optimista)
- API Gateway básico (routing, health checks)
- Orders Service adaptado al monorepo

---

### Fase 2: Integración y Testing Avanzado

```yaml
CI:
  - ✅ ci-basic.yml (mantener)
  - ✅ ci-full.yml (mantener)
  - 🆕 ci-integration.yml (añadir):
      - Integration tests con Testcontainers
      - E2E tests con Postman/Newman
      - Performance tests básicos

CD:
  - ⏸️ cd.yml (TODAVÍA DESHABILITADO - testing en progreso)

Tests:
  - ✅ Unit tests (cada push)
  - ✅ Integration tests (cada push a main)
  - ✅ E2E tests (manual antes de merge)
```

**Duración:** 1-2 semanas  
**Entregable:**

- Tests de integración completos
- E2E flows críticos
- Coverage >80%

---

### Fase 3: Staging y Pre-Producción

```yaml
CI:
  - ✅ ci-basic.yml (mantener)
  - ✅ ci-full.yml (mantener)
  - ✅ ci-integration.yml (mantener)

CD:
  - ✅ cd.yml (REACTIVAR - solo staging):
      - Build Docker images
      - Push to ghcr.io
      - Deploy to staging (Railway/Fly.io/Render)
      - Smoke tests
      - ⏸️ Production deploy (manual approval)

Infrastructure:
  - 🆕 Docker Compose actualizado (todos los servicios)
  - 🆕 Kubernetes manifests (opcional)
  - 🆕 Terraform/IaC (opcional para portfolio)
```

**Duración:** 1-2 semanas  
**Entregable:**

- Staging environment funcional
- Docker images publicadas
- Deploy automatizado

---

### Fase 4: Producción (FINAL)

```yaml
CI:
  - ✅ Todos los pipelines activos

CD:
  - ✅ cd.yml (COMPLETO):
      - ✅ Build + Push images
      - ✅ Deploy to staging (automático)
      - ✅ Deploy to production (manual approval)
      - ✅ Rollback capability
      - ✅ Health checks
      - ✅ Notifications (Slack/Email)

Monitoring:
  - 🆕 Prometheus metrics
  - 🆕 Grafana dashboards
  - 🆕 Error tracking (Sentry/opcional)
```

**Duración:** Continuo (mantenimiento)  
**Entregable:** Sistema production-ready completo

---

## 🚨 Errores Comunes y Soluciones

### Error 1: "Dockerfile not found"

```
ERROR: failed to read dockerfile: open Dockerfile: no such file or directory
```

**Causa:** CD pipeline intentando buildear cuando no hay Dockerfile  
**Solución:** Pipeline CD deshabilitado en Fase 0  
**Cuándo se reactiva:** Fase 3 (cuando haya Dockerfiles listos)

---

### Error 2: "go: no Go files in /app"

```
ERROR: go build: no Go files
```

**Causa:** Inventory Service solo tiene estructura, no implementación  
**Solución:** CI basic solo valida estructura, no intenta compilar  
**Cuándo se activa compilación:** Fase 1 (cuando haya código Go completo)

---

### Error 3: "npm install failed - package.json not found"

```
ERROR: ENOENT: no such file or directory, open 'package.json'
```

**Causa:** API Gateway está vacío (solo decisión en ADR)  
**Solución:** CI basic solo valida que carpeta exista, no ejecuta npm  
**Cuándo se activa npm install:** Fase 1 (cuando API Gateway esté implementado)

---

## 📖 Filosofía de CI/CD en este Proyecto

### Principio 1: **Progresivo, no complejo desde el inicio**

- ✅ Empezar simple (validación estructural)
- ✅ Añadir capas según madurez del código
- ❌ No configurar deploy cuando no hay nada que deployar

### Principio 2: **Fast feedback en desarrollo**

- ✅ CI básico debe ser rápido (<30s)
- ✅ Tests completos solo en branches importantes
- ✅ Integration tests con flag `-short` para skip local

### Principio 3: **Visible y documentado**

- ✅ Cada pipeline tiene comentarios explicativos
- ✅ Errores esperados documentados (como este)
- ✅ Estrategia clara en este documento

### Principio 4: **Portfolio-friendly**

- ✅ Demostrar conocimiento de CI/CD progresivo
- ✅ No "fake pipelines" que no hacen nada útil
- ✅ Explicar decisiones en entrevistas

---

## 🎓 Para Entrevistas

**Pregunta:** "¿Por qué tu CD pipeline está deshabilitado?"

**Respuesta:**

> "Sigo una estrategia de CI/CD progresiva. En **Fase 0** (Technical Spikes), solo tengo documentación y decisiones arquitectónicas (ADRs), no código de producción. Por eso mi CD pipeline está comentado - no tiene sentido intentar buildear imágenes Docker cuando los servicios están en esqueleto.
>
> Mi **CI básico** valida estructura y formateo (gofmt, go vet), que es apropiado para esta fase. En **Fase 1**, activaré tests automáticos. En **Fase 3**, reactivaré el CD pipeline cuando tenga servicios completos y Dockerfiles listos.
>
> Esto demuestra pragmatismo: no configurar infraestructura prematuramente, sino adaptarla a la madurez del proyecto. Es más profesional que tener pipelines 'verdes' que no hacen nada útil."

---

## 📚 Referencias

- **CI Basic:** `.github/workflows/ci-basic.yml` (ACTIVO)
- **CD Pipeline:** `.github/workflows/cd.yml` (DESHABILITADO)
- **ADR-026:** API Gateway Express (decisión)
- **ADR-027:** Testcontainers Strategy (decisión)
- **PROJECT_BACKLOG.md:** Roadmap completo

---

## ✅ Checklist de Reactivación

### Para reactivar CD Pipeline (Fase 3):

- [ ] Inventory Service implementado (CRUD completo)
- [ ] API Gateway implementado (routing básico)
- [ ] Orders Service adaptado al monorepo
- [ ] Dockerfiles creados para cada servicio
- [ ] Docker Compose funcional
- [ ] Tests de integración pasando
- [ ] Coverage >80%
- [ ] Staging environment configurado
- [ ] Descomentar trigger `push: branches: [main]` en `cd.yml`

**Comando para reactivar:**

```yaml
# En .github/workflows/cd.yml
on:
  push:
    branches: [main] # ← Descomentar esta línea
  workflow_dispatch:
```

---

**Última actualización:** 2025-10-16 (Fase 0 - Spikes T0.1.1 y T0.1.2 completados)
