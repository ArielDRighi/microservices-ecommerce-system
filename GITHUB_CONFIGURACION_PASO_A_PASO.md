# 📋 Guía Completa de Configuración de GitHub - Paso a Paso

## 🎯 Objetivo

Esta guía te llevará paso a paso por todas las configuraciones necesarias en GitHub para establecer un repositorio profesional para el **Sistema Procesador de Órdenes Asíncrono**.

---

## 📚 Índice

1. [Creación del Repositorio](#1-creación-del-repositorio)
2. [Configuración de Branch Protection Rules](#2-configuración-de-branch-protection-rules)
3. [Configuración de Labels Organizacionales](#3-configuración-de-labels-organizacionales)
4. [Templates de Issues y Pull Requests](#4-templates-de-issues-y-pull-requests)
5. [Configuración de GitHub Actions](#5-configuración-de-github-actions)
6. [Configuración de Seguridad](#6-configuración-de-seguridad)
7. [Configuración de Pages y Wiki](#7-configuración-de-pages-y-wiki)
8. [Configuración de Collaborators](#8-configuración-de-collaborators)
9. [Configuración de Webhooks](#9-configuración-de-webhooks)
10. [Configuración de GitHub Packages](#10-configuración-de-github-packages)

---

## 1. Creación del Repositorio

### Paso 1.1: Acceder a GitHub

1. **Navega** a [github.com](https://github.com)
2. **Inicia sesión** con tu cuenta de GitHub
3. **Haz clic** en el botón **"+"** en la esquina superior derecha
4. **Selecciona** **"New repository"**

### Paso 1.2: Configurar Información Básica

1. **Repository name**: `ecommerce-async-resilient-system`
2. **Description**:
   ```
   🚀 Sistema resiliente y escalable para procesamiento asíncrono de órdenes de e-commerce. Implementa Event Sourcing, CQRS, Saga Pattern y Circuit Breaker con NestJS + TypeScript + PostgreSQL + Redis.
   ```
3. **Visibilidad**:
   - ✅ **Public** (para portafolio profesional)
   - ⭕ **Private** (si prefieres mantenerlo privado)

### Paso 1.3: Inicialización

1. ✅ **Add a README file**
2. ✅ **Add .gitignore** → Seleccionar **"Node"**
3. ✅ **Choose a license** → Seleccionar **"MIT License"**

### Paso 1.4: Crear el Repositorio

1. **Haz clic** en **"Create repository"**

---

## 2. Configuración de Branch Protection Rules

### Paso 2.1: Acceder a Settings

1. **Ve** al repositorio recién creado
2. **Haz clic** en la pestaña **"Settings"** (esquina superior derecha)
3. En el menú lateral izquierdo, **haz clic** en **"Branches"**

### Paso 2.2: Crear Rule para Branch Main

1. **Haz clic** en **"Add rule"**
2. **Branch name pattern**: `main`

### Paso 2.3: Configurar Protecciones para Main

#### Sección "Protect matching branches":

1. ✅ **Require a pull request before merging**
   - ✅ **Require approvals**: `1`
   - ✅ **Dismiss stale reviews when new commits are pushed**
   - ✅ **Require review from code owners**

2. ✅ **Require status checks to pass before merging**
   - ✅ **Require branches to be up to date before merging**
   - En **"Status checks"** agregar:
     - `build`
     - `test`
     - `lint`
     - `type-check`

3. ✅ **Require conversation resolution before merging**

4. ✅ **Require signed commits** (opcional pero recomendado)

5. ✅ **Include administrators** (aplica reglas a admins también)

6. ✅ **Restrict pushes that create files larger than 100 MB**

7. **Haz clic** en **"Create"**

### Paso 2.4: Crear Rule para Branch Develop

1. **Repite** los pasos anteriores pero con:
2. **Branch name pattern**: `develop`
3. **Configuraciones similares** pero con:
   - **Require approvals**: `1` (puede ser menos estricto)
   - **Status checks**: mismo conjunto

---

## 3. Configuración de Labels Organizacionales

### Paso 3.1: Acceder a Labels

1. En tu repositorio, **haz clic** en **"Issues"**
2. **Haz clic** en **"Labels"** (al lado de Milestones)
3. Verás las labels por defecto de GitHub

### Paso 3.2: Eliminar Labels Innecesarias

**Elimina** las siguientes labels haciendo clic en **"Delete"**:

- `good first issue`
- `help wanted`
- `invalid`
- `question`
- `wontfix`

### Paso 3.3: Crear Labels de Tipo

**Haz clic** en **"New label"** y crea:

#### 🐛 Bug y Errores

- **Name**: `bug`
- **Description**: `Something isn't working`
- **Color**: `#d73a4a` (rojo)

- **Name**: `critical-bug`
- **Description**: `Critical bug that needs immediate attention`
- **Color**: `#B60205` (rojo oscuro)

#### ✨ Features y Mejoras

- **Name**: `feature`
- **Description**: `New feature or request`
- **Color**: `#a2eeef` (azul claro)

- **Name**: `enhancement`
- **Description**: `Enhancement to existing functionality`
- **Color**: `#84b6eb` (azul)

#### 📚 Documentación

- **Name**: `documentation`
- **Description**: `Improvements or additions to documentation`
- **Color**: `#0075ca` (azul oscuro)

- **Name**: `api-docs`
- **Description**: `API documentation related`
- **Color**: `#1d76db` (azul)

### Paso 3.4: Crear Labels de Prioridad

#### 🔥 Prioridades

- **Name**: `priority: high`
- **Description**: `High priority issue`
- **Color**: `#FF6B6B` (rojo claro)

- **Name**: `priority: medium`
- **Description**: `Medium priority issue`
- **Color**: `#FFE66D` (amarillo)

- **Name**: `priority: low`
- **Description**: `Low priority issue`
- **Color**: `#95E1D3` (verde claro)

### Paso 3.5: Crear Labels de Estado

#### ⚡ Estados

- **Name**: `in-progress`
- **Description**: `Currently being worked on`
- **Color**: `#FFA726` (naranja)

- **Name**: `under-review`
- **Description**: `Under code review`
- **Color**: `#AB47BC` (morado)

- **Name**: `blocked`
- **Description**: `Blocked by external dependencies`
- **Color**: `#BDBDBD` (gris)

- **Name**: `ready-to-deploy`
- **Description**: `Ready for deployment`
- **Color**: `#4CAF50` (verde)

### Paso 3.6: Crear Labels Técnicas

#### 🏗️ Áreas Técnicas

- **Name**: `backend`
- **Description**: `Backend related changes`
- **Color**: `#5DADE2` (azul claro)

- **Name**: `database`
- **Description**: `Database related changes`
- **Color**: `#F7DC6F` (amarillo claro)

- **Name**: `api`
- **Description**: `API related changes`
- **Color**: `#A569BD` (morado claro)

- **Name**: `queue`
- **Description**: `Queue and async processing related`
- **Color**: `#58D68D` (verde claro)

- **Name**: `auth`
- **Description**: `Authentication and authorization`
- **Color**: `#F1948A` (rojo claro)

---

## 4. Templates de Issues y Pull Requests

### Paso 4.1: Crear Directorio de Templates

1. **Ve** a tu repositorio
2. **Haz clic** en **"Create new file"**
3. **Nombre del archivo**: `.github/ISSUE_TEMPLATE/bug_report.md`

### Paso 4.2: Template de Bug Report

**Copia** este contenido:

```markdown
---
name: Bug Report
about: Crear un reporte para ayudarnos a mejorar
title: '[BUG] '
labels: ['bug', 'priority: medium']
assignees: ''
---

## 🐛 Descripción del Bug

Una descripción clara y concisa de cuál es el bug.

## 🔄 Pasos para Reproducir

Pasos para reproducir el comportamiento:

1. Ve a '...'
2. Haz clic en '....'
3. Desplázate hacia abajo hasta '....'
4. Observa el error

## ✅ Comportamiento Esperado

Una descripción clara y concisa de lo que esperabas que sucediera.

## ❌ Comportamiento Actual

Una descripción clara y concisa de lo que está sucediendo actualmente.

## 📸 Screenshots

Si aplica, añade screenshots para ayudar a explicar tu problema.

## 🖥️ Información del Entorno

- **OS**: [e.g. Ubuntu 20.04, Windows 10, macOS 12.0]
- **Node.js**: [e.g. 18.17.0]
- **npm/yarn**: [e.g. npm 9.6.7]
- **Navegador**: [e.g. Chrome 115.0, Firefox 116.0]

## 📋 Logs Relevantes
```

Pega aquí cualquier log relevante, mensaje de error, o stack trace

```

## 🔍 Contexto Adicional
Añade cualquier otro contexto sobre el problema aquí.

## ✔️ Posible Solución
Si tienes una idea de cómo solucionarlo, compártela aquí.
```

### Paso 4.3: Template de Feature Request

**Crear archivo**: `.github/ISSUE_TEMPLATE/feature_request.md`

````markdown
---
name: Feature Request
about: Sugerir una idea para este proyecto
title: '[FEATURE] '
labels: ['feature', 'priority: medium']
assignees: ''
---

## 💡 Resumen de la Feature

Una descripción clara y concisa de la funcionalidad que te gustaría ver implementada.

## 🎯 Problema que Resuelve

Describe el problema o necesidad que esta feature abordaría.

## 💭 Solución Propuesta

Una descripción clara y concisa de lo que te gustaría que sucediera.

## 🔄 Alternativas Consideradas

Una descripción clara y concisa de cualquier solución alternativa o features que hayas considerado.

## 📋 Criterios de Aceptación

- [ ] Criterio 1
- [ ] Criterio 2
- [ ] Criterio 3

## 🏗️ Consideraciones Técnicas

### Cambios de API

```typescript
// Ejemplo de cambios en la API si aplica
```
````

### Cambios de Base de Datos

```sql
-- Ejemplo de cambios en la DB si aplica
```

### Dependencias Nuevas

- Lista de nuevas dependencias requeridas

## 🔍 Contexto Adicional

Añade cualquier otro contexto, mockups, o screenshots sobre la feature request aquí.

## 📊 Impacto

- **Usuarios afectados**: [e.g. todos los usuarios, solo admins]
- **Prioridad de negocio**: [e.g. alta, media, baja]
- **Esfuerzo estimado**: [e.g. 1 día, 1 semana, 1 sprint]

````

### Paso 4.4: Template de Pull Request
**Crear archivo**: `.github/pull_request_template.md`

```markdown
## 📋 Descripción
Describe brevemente los cambios en este PR.

## 🔗 Issue Relacionado
Fixes #(número_de_issue)

## 🎯 Tipo de Cambio
- [ ] 🐛 Bug fix (cambio que corrige un issue)
- [ ] ✨ Nueva feature (cambio que añade funcionalidad)
- [ ] 💥 Breaking change (fix o feature que causaría que funcionalidad existente no funcione como se espera)
- [ ] 📚 Actualización de documentación
- [ ] 🏗️ Refactoring (cambio que no corrige bug ni añade feature)
- [ ] ⚡ Mejora de performance
- [ ] 🧪 Añadir tests

## 🧪 Testing
Describe las pruebas que ejecutaste para verificar tus cambios:
- [ ] Tests unitarios
- [ ] Tests de integración
- [ ] Tests E2E
- [ ] Pruebas manuales

### Casos de Prueba
- Caso 1: [descripción]
- Caso 2: [descripción]

## 📸 Screenshots (si aplica)
| Antes | Después |
|-------|---------|
| ![before](url) | ![after](url) |

## ✅ Checklist
- [ ] Mi código sigue las guías de estilo de este proyecto
- [ ] He realizado un self-review de mi código
- [ ] He comentado mi código, especialmente en áreas difíciles de entender
- [ ] He actualizado la documentación correspondiente
- [ ] Mis cambios no generan nuevos warnings
- [ ] He añadido tests que prueban que mi fix es efectivo o que mi feature funciona
- [ ] Tests unitarios nuevos y existentes pasan localmente con mis cambios
- [ ] He verificado que no hay merge conflicts

## 🏗️ Cambios Técnicos
### Archivos Modificados
- `src/path/to/file1.ts` - [descripción del cambio]
- `src/path/to/file2.ts` - [descripción del cambio]

### APIs Añadidas/Modificadas
```typescript
// Ejemplo de nueva API o cambios
POST /api/v1/new-endpoint
GET /api/v1/modified-endpoint
````

### Cambios en Base de Datos

```sql
-- Migrations o cambios de schema
ALTER TABLE users ADD COLUMN new_field VARCHAR(255);
```

## ⚠️ Consideraciones de Deployment

- [ ] No requiere cambios de configuración
- [ ] Requiere variables de entorno nuevas
- [ ] Requiere migration de base de datos
- [ ] Requiere restart de servicios
- [ ] Requiere actualización de documentación

## 👥 Reviewers

@usuario1 @usuario2

## 🔍 Notas Adicionales

Cualquier información adicional que los reviewers deberían saber.

````

---

## 5. Configuración de GitHub Actions

### Paso 5.1: Crear Workflow de CI
1. **Crear archivo**: `.github/workflows/ci.yml`
2. **Ve** a tu repositorio
3. **Haz clic** en **"Actions"**
4. **Haz clic** en **"New workflow"**
5. **Selecciona** **"set up a workflow yourself"**

### Paso 5.2: Configurar CI Pipeline
**Nombre del archivo**: `ci.yml`

```yaml
name: CI Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

env:
  NODE_VERSION: '18.x'

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: ecommerce_async_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
    - name: 📚 Checkout code
      uses: actions/checkout@v4

    - name: 📦 Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'

    - name: 🔧 Install dependencies
      run: npm ci

    - name: 🎨 Check code formatting
      run: npm run format:check

    - name: 🔍 Lint code
      run: npm run lint

    - name: 🔎 Type check
      run: npm run type-check

    - name: 🏗️ Build application
      run: npm run build

    - name: 🧪 Run unit tests
      run: npm run test:cov
      env:
        DATABASE_HOST: localhost
        DATABASE_PORT: 5432
        DATABASE_USERNAME: postgres
        DATABASE_PASSWORD: postgres
        DATABASE_NAME: ecommerce_async_test
        REDIS_HOST: localhost
        REDIS_PORT: 6379

    - name: 🧪 Run e2e tests
      run: npm run test:e2e
      env:
        DATABASE_HOST: localhost
        DATABASE_PORT: 5432
        DATABASE_USERNAME: postgres
        DATABASE_PASSWORD: postgres
        DATABASE_NAME: ecommerce_async_test
        REDIS_HOST: localhost
        REDIS_PORT: 6379

    - name: 📊 Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        files: ./coverage/lcov.info
        flags: unittests
        name: codecov-umbrella
        fail_ci_if_error: false

  security:
    runs-on: ubuntu-latest

    steps:
    - name: 📚 Checkout code
      uses: actions/checkout@v4

    - name: 📦 Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'

    - name: 🔧 Install dependencies
      run: npm ci

    - name: 🛡️ Run security audit
      run: npm audit --audit-level high

    - name: 🔐 CodeQL Analysis
      uses: github/codeql-action/analyze@v2
      with:
        languages: typescript
````

### Paso 5.3: Crear Workflow de CD

**Nombre del archivo**: `.github/workflows/cd.yml`

```yaml
name: CD Pipeline

on:
  push:
    branches: [main]
  release:
    types: [published]

env:
  NODE_VERSION: '18.x'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: 📚 Checkout code
        uses: actions/checkout@v4

      - name: 📦 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: 🔧 Install dependencies
        run: npm ci

      - name: 🏗️ Build application
        run: npm run build

      - name: 🐳 Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: 🔐 Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: 📝 Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: 🏗️ Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### Paso 5.4: Activar GitHub Actions

1. **Ve** a la pestaña **"Actions"** de tu repositorio
2. **Haz clic** en **"I understand my workflows, go ahead and enable them"**
3. Los workflows se ejecutarán automáticamente en el próximo push

---

## 6. Configuración de Seguridad

### Paso 6.1: Habilitar Security Advisories

1. **Ve** a **"Settings"** → **"Security & analysis"**
2. **Habilita**:
   - ✅ **Vulnerability reporting** → **"Enable"**
   - ✅ **Dependency graph** → **"Enable"**
   - ✅ **Dependabot alerts** → **"Enable"**
   - ✅ **Dependabot security updates** → **"Enable"**

### Paso 6.2: Configurar CodeQL

1. En **"Code scanning"** → **"Set up"**
2. **Selecciona** **"Default"**
3. **Haz clic** en **"Enable CodeQL"**

### Paso 6.3: Configurar Secrets

1. **Ve** a **"Settings"** → **"Secrets and variables"** → **"Actions"**
2. **Haz clic** en **"New repository secret"**
3. **Añadir secrets** necesarios:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `REDIS_URL`
   - `DOCKER_REGISTRY_TOKEN` (si usas registry externo)

---

## 7. Configuración de Pages y Wiki

### Paso 7.1: Habilitar GitHub Pages

1. **Ve** a **"Settings"** → **"Pages"**
2. **Source**: Deploy from a branch
3. **Branch**: `main` o `gh-pages`
4. **Folder**: `/ (root)` o `/docs`
5. **Haz clic** en **"Save"**

### Paso 7.2: Configurar Wiki

1. **Ve** a **"Settings"** → **"General"**
2. En **"Features"**, **habilita**:
   - ✅ **Wikis**
   - ✅ **Issues**
   - ✅ **Sponsorships**
   - ✅ **Projects**
   - ✅ **Discussions** (opcional)

---

## 8. Configuración de Collaborators

### Paso 8.1: Invitar Colaboradores

1. **Ve** a **"Settings"** → **"Manage access"**
2. **Haz clic** en **"Invite a collaborator"**
3. **Ingresa** email o username
4. **Selecciona** nivel de acceso:
   - **Read**: Solo lectura
   - **Triage**: Puede gestionar issues y PRs
   - **Write**: Puede hacer push
   - **Maintain**: Puede gestionar repo sin acceso destructivo
   - **Admin**: Acceso completo

### Paso 8.2: Configurar Teams (si tienes GitHub Pro/Enterprise)

1. **Ve** a tu organización
2. **"Teams"** → **"New team"**
3. **Configura** permisos por team
4. **Añade** teams al repositorio

---

## 9. Configuración de Webhooks

### Paso 9.1: Añadir Webhook

1. **Ve** a **"Settings"** → **"Webhooks"**
2. **Haz clic** en **"Add webhook"**
3. **Configurar**:
   - **Payload URL**: `https://tu-dominio.com/webhook/github`
   - **Content type**: `application/json`
   - **Secret**: (genera un secret seguro)

### Paso 9.2: Seleccionar Eventos

**Selecciona** los eventos relevantes:

- ✅ **Push**
- ✅ **Pull requests**
- ✅ **Issues**
- ✅ **Issue comments**
- ✅ **Releases**

---

## 10. Configuración de GitHub Packages

### Paso 10.1: Configurar Package Registry

1. **Ve** a la pestaña **"Packages"** de tu perfil
2. **Configura** acceso a packages en **"Settings"** → **"Developer settings"** → **"Personal access tokens"**

### Paso 10.2: Configurar npm Registry

En tu proyecto, **crear** `.npmrc`:

```
@tu-usuario:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

---

## 📋 Checklist Final

### ✅ Configuración Básica

- [ ] Repositorio creado con descripción clara
- [ ] README.md completo y actualizado
- [ ] .gitignore configurado para Node.js/NestJS
- [ ] Licencia MIT añadida

### ✅ Branch Protection

- [ ] Branch protection rules para `main` configuradas
- [ ] Branch protection rules para `develop` configuradas
- [ ] Require PR reviews habilitado
- [ ] Status checks configurados

### ✅ Labels y Templates

- [ ] Labels organizacionales creadas
- [ ] Template de bug report creado
- [ ] Template de feature request creado
- [ ] Template de pull request creado

### ✅ GitHub Actions

- [ ] Workflow de CI configurado
- [ ] Workflow de CD configurado
- [ ] Security scanning habilitado
- [ ] Secrets configurados

### ✅ Seguridad

- [ ] Dependabot habilitado
- [ ] CodeQL analysis configurado
- [ ] Vulnerability reporting habilitado
- [ ] Secrets repository configurados

### ✅ Colaboración

- [ ] GitHub Pages habilitado (si aplica)
- [ ] Wiki habilitado
- [ ] Issues habilitado
- [ ] Discussions habilitado (opcional)

---

## 🎉 ¡Felicidades!

Tu repositorio de GitHub está ahora completamente configurado con todas las mejores prácticas para un proyecto profesional.

### 🚀 Próximos Pasos

1. **Hacer** tu primer commit con el código del proyecto
2. **Crear** tu primera issue usando los templates
3. **Abrir** tu primer PR siguiendo el template
4. **Verificar** que los workflows de CI/CD funcionen correctamente
5. **Invitar** colaboradores si trabajas en equipo

### 📞 Soporte

Si tienes algún problema con estas configuraciones, puedes:

- Revisar la [documentación oficial de GitHub](https://docs.github.com)
- Crear un issue usando el template de bug report
- Contactar al equipo de desarrollo

---

## 📖 Referencias Adicionales

- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)

---

**Documento creado por:** GitHub Copilot  
**Última actualización:** Septiembre 2025  
**Versión:** 1.0.0
