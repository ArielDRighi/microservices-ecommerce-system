# Estrategia de CI/CD - Microservices E-commerce System

**Fecha:** 2025-10-16  
**Estado:** Fase 0 - Technical Spikes  
**Última actualización:** Commit 2e83b19

---

## 🎯 Filosofía: "CI/CD debe coincidir con la madurez del proyecto"

Este documento explica por qué ciertos pipelines están **deshabilitados temporalmente** y cuándo se activarán.

---

## 📊 Estado Actual del Proyecto

### Fase 0: Technical Spikes (ACTUAL)
```
├── T0.1.1 ✅ Spike API Gateway (ADR-026)
├── T0.1.2 ✅ Spike Testcontainers (ADR-027 + PoC)
├── T0.1.3 ⏳ Spike Comunicación Síncrona (pendiente)
└── T0.1.4 ⏳ Spike RabbitMQ vs Redis (pendiente)
```

**Objetivo:** Investigación y decisiones arquitectónicas (ADRs)  
**Entregables:** Documentación, NO código de producción  
**Duración:** ~1-2 semanas

---

## 🔧 Pipelines por Fase

### ✅ Pipelines ACTIVOS en Fase 0

#### 1. **CI Basic** (`.github/workflows/ci-basic.yml`)

**Propósito:** Validación estructural ligera  
**Trigger:** `push` a cualquier rama, `pull_request`  
**Lo que hace:**
- ✅ Valida estructura de directorios
- ✅ Verifica archivos de configuración existen
- ✅ Ejecuta `gofmt` (formateo Go)
- ✅ Ejecuta `go vet` (análisis estático Go)
- ✅ Verifica `package.json`, `tsconfig.json` (Orders)

**Lo que NO hace:**
- ❌ npm install / go mod download
- ❌ Ejecutar tests
- ❌ Build de aplicaciones
- ❌ Coverage thresholds

**Razón:** En Fase 0 solo documentamos, no hay código completo para testear.

**Estado:** ✅ **ACTIVO**

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
    branches: [main]  # ← Descomentar esta línea
  workflow_dispatch:
```

---

**Última actualización:** 2025-10-16 (Fase 0 - Spikes T0.1.1 y T0.1.2 completados)
