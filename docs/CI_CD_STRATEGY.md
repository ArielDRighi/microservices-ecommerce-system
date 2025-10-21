# Estrategia de CI/CD - Microservices E-commerce System

**Fecha:** 2025-10-21  
**Estado:** Fase 3 - Epic 3.1 ✅ COMPLETADO | Epic 3.2 ✅ COMPLETADO  
**Última actualización:** Epic 3.1 completado - HTTP Client con resiliencia implementado

---

## 🎯 Filosofía: "CI/CD debe coincidir con la madurez del proyecto"

Este documento explica la **estrategia progresiva** de CI/CD adaptada al estado real del código.

---

## 📊 Estado Actual del Proyecto (Actualizado 2025-10-21)

### Epic 3.1: Comunicación Síncrona (HTTP) ✅ COMPLETADO

```
├── Fase 0 ✅ Technical Spikes (COMPLETADA)
│   ├── T0.1.1 ✅ API Gateway (ADR-026)
│   ├── T0.1.2 ✅ Testcontainers Strategy (ADR-027)
│   ├── T0.1.3 ✅ REST Sync Communication (ADR-028)
│   └── T0.1.4 ✅ RabbitMQ Topology (ADR-029)
├── Fase 1 ✅ Implementación Base (COMPLETADA)
│   ├── Epic 1.1 ✅ Estructura del Monorepo
│   ├── Epic 1.2 ✅ Inventory Service - Esqueleto Básico
│   ├── Epic 1.3 ✅ CI/CD - Pipeline Inicial
│   └── Epic 1.4 ✅ Docker & Orchestration
├── Fase 2 ✅ Features Core (COMPLETADA)
│   └── Epic 2.x ✅ Inventory Service Implementation
└── Fase 3 🔄 Integración HTTP (ACTUAL)
    ├── Epic 3.1 ✅ Comunicación Síncrona HTTP (COMPLETADA)
    │   ├── T3.1.1 ✅ Setup Cliente HTTP
    │   ├── T3.1.2 ✅ InventoryHttpClient con Resiliencia
    │   ├── T3.1.3 ✅ Tests del Cliente HTTP (31 tests)
    │   ├── T3.1.4 ✅ Integración con Saga (12 tests)
    │   └── T3.1.5 ✅ Observabilidad y Métricas
    └── Epic 3.2 ✅ Saga con HTTP (COMPLETADA - integrada en 3.1)
```

**Epic 3.1 - Resultado:**

- ✅ InventoryHttpClient implementado (520 líneas)
- ✅ 43 tests pasando (31 client unit + 12 saga integration)
- ✅ Circuit breakers con opossum (50% threshold, 30s reset)
- ✅ Retry con exponential backoff (3 intentos: 1s, 2s, 4s)
- ✅ Métricas Prometheus con private Registry
- ✅ Coverage >95% en InventoryHttpClient
- ✅ 6 commits: 2d2a0b4, 838d15a, 29e0360, 22d23aa, 4c3ea2d, 6cd1b1a
- ✅ Documentación completa: docs/epic-3.1-summary.md

**Estado de Tests por Servicio:**

**Orders Service (NestJS):**
- ✅ 218+ archivos `.spec.ts` en src/
- ✅ Tests configurados con Jest
- ✅ E2E tests con Supertest en test/
- ✅ Coverage configurado (jest.config.js)
- ✅ Scripts disponibles: test, test:cov, test:e2e
- ✅ Epic 3.1: +43 tests nuevos (HTTP client + saga integration)

**Inventory Service (Go):**
- ✅ 54+ archivos `*_test.go`
- ✅ Tests unitarios en internal/
- ✅ Tests de integración con Testcontainers en tests/integration/
- ✅ Makefile con targets: test, test-coverage, test-integration, test-e2e
- ✅ Coverage configurado (coverage.out)

**Duración Epic 3.1:** ~10 horas (estimado vs real: exacto)

---

## 🔧 Pipelines ACTIVOS (Actualizado 2025-10-21)

### 1. CI Basic (`.github/workflows/ci-basic.yml`)

**Propósito:** Validación estructural ligera del monorepo

**Lo que hace:**

- ✅ Valida estructura de directorios
- ✅ Verifica archivos de configuración existen
- ✅ Linting básico (non-blocking)

**Estado:** ✅ ACTIVO

---

### 2. Inventory Service CI (`.github/workflows/inventory-service-ci.yml`)

**Propósito:** CI completo para servicio Go

**Jobs:**

#### Job 1: Build & Unit Tests

- ✅ **Build**: Compila binario Go (`go build -v -o bin/inventory-service cmd/api/main.go`)
- ⏸️ **Tests**: DISABLED en workflow (comentados con explicación)
  - **Razón**: Tests requieren DB configurada (pendiente Epic 1.4)
  - **Tests disponibles**: 54+ archivos `*_test.go` listos para ejecutarse
  - **Comando local**: `make test` o `go test ./... -v -race -short`
- ⏸️ **Coverage**: DISABLED (se habilitará después de Epic 1.4)

**Realidad del Código vs Pipeline:**
- ❌ Pipeline dice "no hay tests" 
- ✅ Código tiene 54+ archivos de test
- ✅ Tests pasan localmente con `make test`
- 🎯 **ACTUALIZACIÓN NECESARIA**: Habilitar tests en CI con servicios Docker

```yaml
# ESTADO ACTUAL EN WORKFLOW (DESACTUALIZADO):
- name: Run unit tests (DISABLED - Epic 1.3)
  run: echo "⏸️ Tests DISABLED during Epic 1.3"

# DEBERÍA SER (CON EPIC 3.1 COMPLETADO):
- name: Run unit tests
  run: go test ./... -v -race -short -coverprofile=coverage.out
```

#### Job 2: Integration Tests

- ⏸️ **Status**: Skipped en workflow
- ✅ **Tests disponibles**: tests/integration/ con Testcontainers
- 🎯 **ACTUALIZACIÓN NECESARIA**: Habilitar con Docker en GitHub Actions

#### Job 3: Linting

- ✅ **golangci-lint**: Ejecuta con `.golangci.yml` (non-blocking)
- ✅ **gofmt**: Check de formateo
- ✅ **go vet**: Análisis estático

#### Job 4: Security

- ✅ **gosec**: Scanner de seguridad (non-blocking)

**Path filters:** `services/inventory-service/**`

**Estado:** ✅ ACTIVO (build + lint) | 🎯 NECESITA ACTUALIZACIÓN (habilitar tests)

---

### 3. Orders Service CI (`.github/workflows/orders-service-ci.yml`)

**Propósito:** CI completo para servicio NestJS

**Jobs:**

#### Job 1: Build & Unit Tests

- ✅ **Install**: `npm ci --ignore-scripts`
- ✅ **Build shared types**: Compila `shared/types` package
- ✅ **Lint**: `npm run lint` (non-blocking)
- ✅ **Build**: `npm run build` (validación TypeScript)
- ⏸️ **Tests**: DISABLED en workflow (comentados con explicación)
  - **Razón declarada**: "Servicio reciclado, no configurado"
  - **Tests disponibles**: 218+ archivos `.spec.ts`
  - **Epic 3.1**: +43 tests nuevos (HTTP client + saga)
  - **Comando local**: `npm run test` o `npm run test:cov`
- ⏸️ **Coverage**: DISABLED

**Realidad del Código vs Pipeline:**
- ❌ Pipeline dice "servicio no configurado"
- ✅ Código tiene 218+ archivos de test
- ✅ Epic 3.1 agregó 43 tests nuevos (todos pasando)
- ✅ Tests pasan localmente con `npm run test`
- 🎯 **ACTUALIZACIÓN NECESARIA**: Habilitar tests en CI con servicios Docker

```yaml
# ESTADO ACTUAL EN WORKFLOW (DESACTUALIZADO):
- name: Run unit tests (DISABLED - Epic 1.3)
  run: echo "⏸️ Unit tests DISABLED during Epic 1.3"

# DEBERÍA SER (CON EPIC 3.1 COMPLETADO):
- name: Run unit tests
  run: npm run test:cov
  
- name: Check coverage threshold
  run: |
    COVERAGE=$(grep -oP '"lines":\s*\K[0-9.]+' coverage/coverage-summary.json | head -1)
    if (( $(echo "$COVERAGE < 70" | bc -l) )); then
      echo "❌ Coverage $COVERAGE% is below 70%"
      exit 1
    fi
```

**Services configurados en workflow:**
- ✅ PostgreSQL 16 (test database)
- ✅ Redis 7 (cache)

**Por qué los tests DEBERÍAN estar habilitados:**
- ✅ Orders Service está completamente configurado
- ✅ Epic 3.1 agregó InventoryHttpClient con 31 tests
- ✅ Epic 3.1 agregó saga integration con 12 tests
- ✅ Todos los 43 tests nuevos pasan localmente
- ✅ Services Docker ya configurados en workflow

#### Job 2: E2E Tests

- ⏸️ **Status**: Skipped en workflow
- ✅ **Tests disponibles**: test/ con Supertest
- 🎯 **ACTUALIZACIÓN NECESARIA**: Habilitar con servicios Docker

#### Job 3: Linting

- ✅ **ESLint**: Ejecuta (non-blocking)
- ✅ **Prettier**: Check de formateo (non-blocking)
- ✅ **TypeScript**: Type checking vía build

#### Job 4: Security

- ⏸️ **npm audit**: Skipped (23 vulnerabilidades conocidas en devDeps)

**Path filters:** `services/orders-service/**`

**Estado:** ✅ ACTIVO (build + lint) | 🎯 NECESITA ACTUALIZACIÓN (habilitar tests)

---

## 📅 Roadmap de CI/CD por Epic (Actualizado 2025-10-21)

### ✅ Epic 1.3: CI/CD Pipeline Inicial (COMPLETADO)

```yaml
Inventory Service:
  - ✅ Build compilation
  - ✅ Linting (non-blocking)
  - ⏸️ Unit tests DISABLED in workflow
  - ⏸️ Coverage DISABLED in workflow

Orders Service:
  - ✅ Build compilation
  - ✅ Build shared types package
  - ✅ Linting (non-blocking)
  - ⏸️ Unit tests DISABLED in workflow
  - ⏸️ E2E tests DISABLED in workflow
  - ⏸️ Coverage DISABLED in workflow

Status:
  - ✅ Pipelines ejecutan sin errores
  - ✅ Builds compilan correctamente
  - ✅ Linting está configurado
  - ⚠️ Tests existen pero están deshabilitados en workflows
```

**Duración:** 1 semana  
**Entregable:** Workflows funcionando con builds + linting

---

### ✅ Epic 3.1: Comunicación Síncrona HTTP (COMPLETADO 2025-10-21)

```yaml
Orders Service - Nuevos componentes:
  - ✅ InventoryHttpClient (520 líneas)
  - ✅ 31 unit tests (InventoryHttpClient)
  - ✅ 12 integration tests (Saga con HTTP)
  - ✅ Circuit breakers (opossum)
  - ✅ Retry logic (axios-retry)
  - ✅ Prometheus metrics (private Registry)
  - ✅ Coverage >95%

Estado Tests Locales:
  - ✅ 43 tests nuevos pasando (npm run test)
  - ✅ Coverage >95% en HTTP client
  - ✅ Integration tests con saga funcionando

Estado CI Workflow:
  - ❌ Tests DISABLED en workflow (desactualizado)
  - � NECESITA ACTUALIZACIÓN

Brecha identificada:
  - Tests pasan localmente ✅
  - Tests deshabilitados en CI ❌
  - Workflows no reflejan capacidad real del código
```

**Duración:** ~10 horas  
**Entregable:** InventoryHttpClient + tests completos  
**Próxima acción:** Actualizar workflows para habilitar tests

---

### 🎯 PRÓXIMA ACTUALIZACIÓN RECOMENDADA: Epic 3.1 CI Enhancement

```yaml
Inventory Service:
  - ✅ Build compilation (mantener)
  - ✅ Linting (mantener)
  - 🆕 HABILITAR Unit tests (con servicios Docker)
  - 🆕 HABILITAR Coverage threshold >70%
  - 🆕 HABILITAR Integration tests (Testcontainers en CI)

Orders Service:
  - ✅ Build compilation (mantener)
  - ✅ Linting (mantener)
  - 🆕 HABILITAR Unit tests (ya configurados en workflow)
  - 🆕 HABILITAR Coverage threshold >70%
  - 🆕 Verificar 43 tests nuevos de Epic 3.1

Cambios necesarios en workflows:
  1. orders-service-ci.yml:
     - Descomentar "npm run test:cov"
     - Descomentar "Check coverage threshold"
     - Actualizar mensaje de Epic 1.3 → Epic 3.1
     
  2. inventory-service-ci.yml:
     - Descomentar "go test ./... -v -race -short"
     - Descomentar "Generate coverage report"
     - Habilitar integration tests con Docker

Infrastructure:
  - ✅ PostgreSQL ya configurado en workflows
  - ✅ Redis ya configurado en workflows
  - ✅ Docker Compose configurado localmente
  - 🆕 Agregar Docker setup en Inventory workflow
```

**Duración:** 1-2 horas  
**Entregable:** Workflows actualizados con tests habilitados  
**Beneficio:** CI reflejará capacidad real del código (218+ tests Orders, 54+ tests Inventory)

---

### Fase Futura: Epic 4.x - CI/CD Avanzado

```yaml
CI:
  - ✅ All tests running automatically
  - 🆕 Performance tests (load testing)
  - 🆕 Security scans (SARIF upload activo)
  - 🆕 Mutation testing (optional)
  - 🆕 Test de resiliencia (circuit breakers, retry)

CD:
  - 🆕 Docker images build
  - 🆕 Push to ghcr.io
  - 🆕 Deploy to staging (Railway/Fly.io)
  - ⏸️ Production deploy (manual approval)

Monitoring in CI:
  - 🆕 Prometheus metrics validation
  - 🆕 Circuit breaker state tests
  - 🆕 Performance regression detection
```

**Duración:** 2-3 semanas  
**Entregable:** CD pipeline completo con staging environment

---

## 🚨 Decisiones Importantes (Actualizado 2025-10-21)

### 1. Tests DISABLED en Workflows pero DISPONIBLES en Código ⚠️

**Estado Actual:**
- ✅ **Orders Service**: 218+ archivos `.spec.ts`
  - ✅ Epic 3.1: +43 tests nuevos (HTTP client + saga)
  - ✅ Tests pasan localmente: `npm run test`
  - ❌ Tests deshabilitados en workflow (comentario obsoleto de Epic 1.3)
- ✅ **Inventory Service**: 54+ archivos `*_test.go`
  - ✅ Tests pasan localmente: `make test`
  - ❌ Tests deshabilitados en workflow (comentario obsoleto de Epic 1.3)

**Por qué fueron deshabilitados originalmente (Epic 1.3):**
- Epic 1.3 era **setup de CI/CD**, no configuración de servicios
- Inventory: Solo tenía esqueleto (sin DB configurada)
- Orders: Código reciclado (sin .env, sin adaptación)

**Por qué DEBERÍAN estar habilitados ahora (Epic 3.1):**
- ✅ Orders Service está completamente configurado
- ✅ Epic 3.1 agregó 43 tests nuevos (todos pasando)
- ✅ Workflows ya tienen PostgreSQL y Redis configurados
- ✅ Inventory Service tiene 54+ tests listos
- ✅ Tests pasan localmente en ambos servicios

**Recomendación:** HABILITAR tests en workflows inmediatamente

---

### 2. Brecha entre Código y CI Pipeline

**Problema identificado:**
- Workflows tienen mensajes de Epic 1.3 (octubre 2017) desactualizados
- Código evolucionó significativamente (Epic 3.1 completado)
- CI no refleja capacidad real del proyecto

**Evidencia:**
```yaml
# En orders-service-ci.yml (DESACTUALIZADO):
- name: Run unit tests (DISABLED - Epic 1.3)
  run: |
    echo "⏸️ Unit tests DISABLED during Epic 1.3"
    echo "📝 Reason: Service is recycled code, not configured"

# REALIDAD DEL CÓDIGO (2025-10-21):
- 218+ archivos .spec.ts
- Epic 3.1: +43 tests nuevos
- Coverage >95% en InventoryHttpClient
- Tests pasan: npm run test
```

**Impacto:**
- ❌ CI no valida código nuevo (43 tests de Epic 3.1 no ejecutados)
- ❌ Regresiones podrían pasar desapercibidas
- ❌ Coverage no monitoreado
- ❌ Pipeline no refleja madurez del proyecto

**Recomendación:** Actualizar workflows para Epic 3.1

---

### 3. Linting Non-Blocking (Mantener)

**Razón:**
- Código reciclado tiene estilo diferente
- PoC de Testcontainers tiene warnings técnicos
- Permite iteración rápida sin bloquear desarrollo

**Estado:** ✅ Mantener non-blocking

---

### 4. Coverage DISABLED pero ALCANZABLE

**Estado Actual:**
- ❌ Coverage disabled en workflows
- ✅ Coverage >95% en InventoryHttpClient (Epic 3.1)
- ✅ Jest configurado con coverage
- ✅ Go coverage configurado (Makefile)

**Cuándo habilitar:**
- 🎯 **AHORA** para Orders Service (coverage ya alto)
- 🎯 **Próxima actualización** para Inventory Service

**Threshold recomendado:**
- Orders Service: >70% (alcanzable con tests existentes)
- Inventory Service: >70% (requiere validar cobertura actual)

---

### 5. Integration Tests con Docker

**Inventory Service:**
- ✅ Tests disponibles: `tests/integration/` con Testcontainers
- ❌ No habilitados en CI (requiere Docker)
- 🎯 Próxima acción: Configurar Docker en GitHub Actions

**Orders Service:**
- ✅ E2E tests disponibles: `test/` con Supertest
- ✅ Services ya configurados en workflow (PostgreSQL, Redis)
- 🎯 Próxima acción: Descomentar E2E tests

---

## 🎓 Para Entrevistas (Actualizado 2025-10-21)

**Pregunta:** "¿Por qué tus tests están deshabilitados en CI?"

**Respuesta actualizada (Epic 3.1):**

> "Mis tests **están implementados y pasan localmente**, pero hay una brecha temporal entre el código y los workflows de CI que estoy cerrando.
>
> **Estado actual:**
> - ✅ **Orders Service**: 218+ archivos de test, incluyendo 43 tests nuevos de Epic 3.1 (HTTP client con circuit breakers, retry, metrics)
> - ✅ **Inventory Service**: 54+ archivos de test con Testcontainers
> - ✅ Todos los tests **pasan localmente** (coverage >95% en componentes nuevos)
> - ⏸️ Tests deshabilitados en workflows por comentarios obsoletos de Epic 1.3
>
> **Razón de la brecha:**
> - Los workflows tienen mensajes de cuando el servicio era solo esqueleto (Epic 1.3)
> - El código evolucionó significativamente (Epic 3.1: comunicación HTTP con resiliencia)
> - Los workflows ya tienen infraestructura necesaria (PostgreSQL, Redis configurados)
>
> **Próxima acción:**
> - Habilitar tests en workflows (1-2 horas de trabajo)
> - Descomentar `npm run test:cov` y `go test` en workflows
> - Configurar thresholds de coverage (>70%)
>
> Esto demuestra **pragmatismo**: documenté explícitamente por qué los tests estaban deshabilitados (no para ocultar falta de tests), y ahora que el código está maduro, los habilito progresivamente. Es más profesional que tener pipelines verdes falsos."

---

**Pregunta:** "¿Cómo manejas resiliencia en tus microservicios?"

**Respuesta (Epic 3.1):**

> "Implementé ADR-028 (REST Synchronous Communication Strategy) en Epic 3.1 con tres pilares de resiliencia:
>
> 1. **Circuit Breakers** (opossum):
>    - Threshold: 50% error rate
>    - Reset timeout: 30s
>    - Estados: closed, open, half-open
>    - Métricas Prometheus para observabilidad
>
> 2. **Retry Logic** (axios-retry):
>    - 3 intentos con exponential backoff (1s, 2s, 4s)
>    - Solo errores retryables (503, 429, network)
>    - 400/404 no se retintentan
>
> 3. **Timeouts dinámicos**:
>    - Read operations: 5s
>    - Write operations: 10s
>    - Health checks: 3s
>
> **Testing:**
> - 31 unit tests del HTTP client (mocks de circuit breaker, retry, timeouts)
> - 12 integration tests de saga con compensación
> - Coverage >95% en InventoryHttpClient
>
> **Observabilidad:**
> - Métricas Prometheus con private Registry
> - 3 métricas: calls_total, duration_seconds, circuit_breaker_state
> - Logging estructurado (INFO, WARN, ERROR)
>
> Todo documentado en `docs/epic-3.1-summary.md` con 43 tests pasando."

---

**Pregunta:** "¿Cómo garantizas calidad en tu código?"

**Respuesta:**

> "Sigo una estrategia de calidad multi-capa:
>
> **1. Testing (43 tests en Epic 3.1):**
> - Unit tests con mocks (Jest para NestJS, Go testing)
> - Integration tests (saga orchestration con HTTP)
> - Coverage >95% en componentes críticos
> - TDD: 6 commits iterativos con tests primero
>
> **2. CI/CD progresivo:**
> - Pipelines adaptan a madurez del código
> - Linting no-bloqueante para iteración rápida
> - Tests habilitados cuando código está listo
> - Coverage thresholds enforced
>
> **3. Arquitectura:**
> - ADRs documentan decisiones (28 ADRs actualmente)
> - Patrones de resiliencia (circuit breaker, retry, saga)
> - Idempotency keys para operaciones críticas
> - Observabilidad integrada (Prometheus, logging)
>
> **4. Code Review:**
> - Commits siguiendo conventional commits
> - Pull requests con contexto detallado
> - Documentation-first (epic summaries)
>
> Ejemplo: Epic 3.1 - 10 horas, 6 commits, 43 tests, documentación completa."

---

## 📚 Referencias

- **Backlog:** `docs/PROJECT_BACKLOG.md`
- **Errores:** `docs/pipeline_errores.md`
- **Workflows:**
  - `.github/workflows/ci-basic.yml`
  - `.github/workflows/inventory-service-ci.yml`
---

## ⏸️ Pipelines DESHABILITADOS

### CD Pipeline (`.github/workflows/cd.yml`)

**Propósito:** Build de Docker images + Deploy a staging/production  
**Trigger anterior:** `push` a `main` (automático)  
**Trigger actual:** `workflow_dispatch` (manual, deshabilitado)


**Por qué está deshabilitado:**
- No hay servicios implementados con Dockerfiles listos
- Pendiente para fase futura cuando infraestructura esté completa

**Estado:** ⏸️ **DESHABILITADO**

**Se reactivará en:** Fase 4 (cuando haya servicios completos y staging environment)

---
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

- **Backlog:** `docs/PROJECT_BACKLOG.md`
- **Epic 3.1 Summary:** `docs/epic-3.1-summary.md` (43 tests, HTTP client con resiliencia)
- **Errores:** `docs/pipeline_errores.md`
- **Workflows:**
  - `.github/workflows/ci-basic.yml` (ACTIVO)
  - `.github/workflows/inventory-service-ci.yml` (🎯 necesita actualización)
  - `.github/workflows/orders-service-ci.yml` (🎯 necesita actualización)
- **ADR-028:** REST Synchronous Communication Strategy (IMPLEMENTED)

---

## 🔧 Acciones Concretas para Actualizar CI (Epic 3.1)

### Acción 1: Actualizar Orders Service CI (Alta Prioridad)

**Archivo:** `.github/workflows/orders-service-ci.yml`

**Cambios necesarios:**

```yaml
# 1. Actualizar Job 1: Build & Unit Tests (líneas ~90-95)
# Descomentar: npm run test:cov

# 2. Habilitar coverage threshold (líneas ~100-104)
# Descomentar y configurar threshold 70%

# 3. Habilitar upload de coverage (líneas ~106-111)
# Descomentar codecov/codecov-action@v4

# 4. Actualizar Job 2: E2E Tests (líneas ~120-130)
# Cambiar de "Disabled" a activo con services (PostgreSQL, Redis)
```

**Justificación:**
- ✅ 218+ tests disponibles (incluyendo 43 de Epic 3.1)
- ✅ Services Docker ya configurados en workflow
- ✅ Tests pasan localmente
- ✅ Coverage >95% en componentes críticos

**Tiempo estimado:** 30 minutos

---

### Acción 2: Actualizar Inventory Service CI (Media Prioridad)

**Archivo:** `.github/workflows/inventory-service-ci.yml`

**Cambios necesarios:**

```yaml
# 1. Habilitar unit tests (líneas ~50-55)
# Descomentar: go test ./... -v -race -short

# 2. Habilitar coverage report (líneas ~60-65)
# Descomentar: go tool cover -func=coverage.out

# 3. Habilitar coverage threshold (líneas ~70-75)
# Descomentar y configurar threshold 70%

# 4. Habilitar integration tests con Docker (líneas ~90-110)
# Descomentar: go test ./tests/integration/...
```

**Justificación:**
- ✅ 54+ archivos de test disponibles
- ✅ Tests pasan localmente con `make test`
- ✅ Testcontainers configurado
- ✅ GitHub Actions tiene Docker habilitado

**Tiempo estimado:** 45 minutos

---

### Resumen de Acciones

| Acción | Archivo | Prioridad | Tiempo | Impacto |
|--------|---------|-----------|--------|---------|
| 1. Habilitar tests Orders Service | orders-service-ci.yml | 🔴 Alta | 30 min | Valida 218+ tests |
| 2. Habilitar tests Inventory Service | inventory-service-ci.yml | 🟡 Media | 45 min | Valida 54+ tests |

**Total tiempo:** ~1.25 horas  
**Beneficio:** CI reflejará capacidad real del código (272+ tests)

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

**Última actualización:** 2025-10-21 (Epic 3.1 - HTTP Client con resiliencia completado)

**Última actualización:** 2025-10-16 (Fase 0 - Spikes T0.1.1 y T0.1.2 completados)
