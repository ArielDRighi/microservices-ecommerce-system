# 📋 Guía de Configuración CI/CD en GitHub

## 🚀 Configuración Paso a Paso para Principiantes

Esta guía te ayudará a configurar completamente el sistema CI/CD en tu repositorio de GitHub. Sigue cada paso exactamente como se indica.

---

## 📖 Tabla de Contenidos

1. [Configuración de Secrets](#1-configuración-de-secrets)
2. [Configuración de Environments](#2-configuración-de-environments)
3. [Configuración de Branch Protection](#3-configuración-de-branch-protection)
4. [Configuración de Packages (Container Registry)](#4-configuración-de-packages-container-registry)
5. [Configuración Opcional - Codecov](#5-configuración-opcional---codecov)
6. [Configuración Opcional - Slack Notifications](#6-configuración-opcional---slack-notifications)
7. [Verificación de la Configuración](#7-verificación-de-la-configuración)
8. [Troubleshooting Común](#8-troubleshooting-común)

---

## 1. Configuración de Secrets

Los **secrets** son variables de entorno seguras que el CI/CD necesita para funcionar.

### 1.1 Acceder a la Configuración de Secrets

1. Ve a tu repositorio en GitHub
2. Haz clic en la pestaña **"Settings"** (Configuración)
3. En el menú lateral izquierdo, busca **"Secrets and variables"**
4. Haz clic en **"Actions"**

### 1.2 Secrets Disponibles

Todos los secrets son **OPCIONALES**. El pipeline funcionará sin ellos, pero con funcionalidad limitada.

#### ✅ Secrets para Funcionalidades Adicionales (OPCIONALES):

| Nombre del Secret   | Valor Ejemplo                 | Descripción                                           | ¿Dónde Obtenerlo?                    |
| ------------------- | ----------------------------- | ----------------------------------------------------- | ------------------------------------ |
| `CODECOV_TOKEN`     | `ejemplo: 12345678-abcd-...`  | Token para reportes de coverage en codecov.io        | [codecov.io](https://codecov.io) después de registrarte |
| `SLACK_WEBHOOK_URL` | `https://hooks.slack.com/...` | URL del webhook para notificaciones en Slack         | Configurar en tu workspace de Slack  |

#### 🔧 Secrets para Deployment Real (SOLO SI TIENES INFRAESTRUCTURA):

| Nombre del Secret      | Valor Ejemplo      | Descripción                        |
| ---------------------- | ------------------ | ---------------------------------- |
| `DOCKER_REGISTRY_URL`  | `ghcr.io`          | URL del registry de Docker         |
| `DOCKER_USERNAME`      | `tu-usuario`       | Usuario del registry               |
| `DOCKER_PASSWORD`      | `ghp_...`          | Token de acceso personal           |
| `DATABASE_STAGING_URL` | `postgresql://...` | URL de base de datos de staging    |
| `DATABASE_PROD_URL`    | `postgresql://...` | URL de base de datos de producción |

### 1.3 Cómo Crear un Secret

**⚠️ IMPORTANTE**: Estos secrets son OPCIONALES. Solo configúralos si quieres usar esas funcionalidades específicas.

1. Haz clic en **"New repository secret"**
2. **Name**: Escribe exactamente el nombre del secret (ej: `CODECOV_TOKEN`)
3. **Secret**: Pega el valor **REAL** que obtuviste del servicio correspondiente
4. Haz clic en **"Add secret"**

#### ❌ ¿Qué pasa si NO configuro secrets?
- Sin `CODECOV_TOKEN`: El pipeline funciona, pero no sube reportes de coverage a Codecov
- Sin `SLACK_WEBHOOK_URL`: El pipeline funciona, pero no envía notificaciones a Slack
- **El CI/CD seguirá funcionando perfectamente sin ningún secret configurado**

---

## 2. Configuración de Environments

Los **environments** permiten configurar deployments con aprobaciones manuales.

### 2.1 Crear Environment de Staging

1. Ve a **Settings** → **Environments**
2. Haz clic en **"New environment"**
3. **Name**: `staging`
4. Haz clic en **"Configure environment"**
5. **Environment protection rules**:
   - ☑️ **Required reviewers**: NO marcar (deployment automático)
   - ☑️ **Wait timer**: NO marcar
   - ☑️ **Deployment branches**: Selecciona "Selected branches"
     - Agrega regla: `main`
     - Agrega regla: `develop`

### 2.2 Crear Environment de Production

1. Haz clic en **"New environment"**
2. **Name**: `production`
3. Haz clic en **"Configure environment"**
4. **Environment protection rules**:
   - ☑️ **Required reviewers**: MARCAR esta opción
     - Selecciona tu usuario o usuarios que pueden aprobar
   - ☑️ **Wait timer**: Opcional (ej: 5 minutos)
   - ☑️ **Deployment branches**: Selecciona "Selected branches"
     - Agrega regla: `main` únicamente

### 2.3 Environment Secrets (si necesitas)

En cada environment, puedes agregar secrets específicos:

1. Ve al environment creado
2. **Environment secrets** → **"Add secret"**
3. Agrega secrets específicos como URLs de base de datos

---

## 3. Configuración de Branch Protection

Protege las ramas principales para que requieran CI/CD antes del merge.

### 3.1 Proteger la Rama `main`

1. Ve a **Settings** → **Branches**
2. Haz clic en **"Add rule"**
3. **Branch name pattern**: `main`
4. Configura las siguientes opciones:

#### ☑️ Reglas Obligatorias:

- **Require a pull request before merging**
  - ☑️ Dismiss stale PR approvals when new commits are pushed
  - **Required number of approvals before merging**: `1`
- **Require status checks to pass before merging**
  - ☑️ Require branches to be up to date before merging
  - **Status checks** (búscalos y selecciona):
    - `Lint and Format Check`
    - `Security Audit`
    - `Test Suite (18.x)`
    - `Test Suite (20.x)`
    - `Build Application`
    - `Quality Gate`
- **Require conversation resolution before merging**
- **Restrict pushes that create files to protected branch**

#### ☑️ Reglas Adicionales:

- **Do not allow bypassing the above settings**
- **Restrict pushes that create files larger than 100MB**

### 3.2 Proteger la Rama `develop`

Repite el mismo proceso pero con:

- **Branch name pattern**: `develop`
- Mismas reglas pero puedes ser menos estricto en approvals (0 approvals)

---

## 4. Configuración de Packages (Container Registry)

Para usar GitHub Container Registry y almacenar las imágenes Docker.

### 4.1 Habilitar GitHub Container Registry

1. Ve a tu **perfil** → **Settings** (no del repositorio)
2. **Developer settings** → **Personal access tokens** → **Tokens (classic)**
3. **Generate new token (classic)**
4. **Scopes** necesarios:
   - ☑️ `repo` (Full control of private repositories)
   - ☑️ `write:packages` (Upload packages to GitHub Package Registry)
   - ☑️ `read:packages` (Download packages from GitHub Package Registry)
   - ☑️ `delete:packages` (Delete packages from GitHub Package Registry)

### 4.2 Configurar Package Visibility

1. Ve a tu repositorio
2. **Settings** → **General**
3. Busca **"Features"** → **Packages**
4. Si no está habilitado, contacta al administrador de la organización

---

## 5. Configuración Opcional - Codecov

Para reportes detallados de code coverage.

### 5.1 Configurar Codecov

1. Ve a [codecov.io](https://codecov.io)
2. **Sign up** con tu cuenta de GitHub
3. Busca y selecciona tu repositorio
4. Copia el **token** que aparece
5. Ve a GitHub → **Settings** → **Secrets and variables** → **Actions**
6. **New repository secret**:
   - **Name**: `CODECOV_TOKEN`
   - **Secret**: pega el token copiado

### 5.2 Archivo de Configuración Codecov (Opcional)

Crear archivo `.codecov.yml` en la raíz del proyecto:

```yaml
coverage:
  status:
    project:
      default:
        target: 80%
        threshold: 1%
    patch:
      default:
        target: 80%

comment:
  layout: 'reach,diff,flags,files,footer'
  behavior: default
  require_changes: false
```

---

## 6. Configuración Opcional - Slack Notifications

Para recibir notificaciones de deployments.

### 6.1 Configurar Webhook de Slack

1. Ve a tu workspace de Slack
2. **Apps** → buscar **"Incoming Webhooks"**
3. **Add to Slack**
4. Selecciona el canal donde quieres las notificaciones
5. Copia la **Webhook URL**
6. Ve a GitHub → **Settings** → **Secrets**
7. **New repository secret**:
   - **Name**: `SLACK_WEBHOOK_URL`
   - **Secret**: pega la webhook URL

---

## 7. Verificación de la Configuración

### 7.1 Checklist de Verificación

Antes de hacer el primer push, verifica:

#### ✅ Secrets Configurados:

- [ ] `CODECOV_TOKEN` (si usas Codecov)
- [ ] `SLACK_WEBHOOK_URL` (si usas Slack)
- [ ] Otros secrets según tus necesidades

#### ✅ Environments Configurados:

- [ ] Environment `staging` creado
- [ ] Environment `production` creado con required reviewers
- [ ] Deployment branches configuradas correctamente

#### ✅ Branch Protection:

- [ ] Rama `main` protegida con status checks
- [ ] Rama `develop` protegida
- [ ] Status checks requeridos seleccionados

#### ✅ Permisos:

- [ ] GitHub Actions habilitado
- [ ] Container Registry habilitado
- [ ] Personal Access Token creado (si necesario)

### 7.2 Probar la Configuración

1. **Crear una PR de prueba**:

   ```bash
   git checkout -b test-ci-cd
   echo "# Test CI/CD" >> README.md
   git add README.md
   git commit -m "test: CI/CD configuration"
   git push origin test-ci-cd
   ```

2. **Crear Pull Request** en GitHub hacia `develop`

3. **Verificar que los checks se ejecuten**:
   - Lint and Format Check ✅
   - Security Audit ✅
   - Test Suite (18.x, 20.x) ✅
   - Build Application ✅
   - Quality Gate ✅

4. **Hacer merge a `develop`** y ver que no dispare CD

5. **Hacer merge a `main`** y ver que dispare el CD pipeline

---

## 8. Troubleshooting Común

### 8.1 Pipeline Falla en Tests

**Problema**: Tests fallan en CI pero pasan localmente.

**Solución**:

```bash
# Verificar que las dependencias estén bien
npm ci
npm run test

# Verificar que el código compile
npm run build

# Verificar linting
npm run lint
```

### 8.2 Docker Build Falla

**Problema**: Error al construir imagen Docker.

**Verificación**:

```bash
# Probar build local
docker build -t test-app .

# Ver logs detallados
docker build --no-cache -t test-app . --progress=plain
```

### 8.3 Status Checks No Aparecen

**Problema**: Los status checks no se muestran en Branch Protection.

**Solución**:

1. Primero ejecuta el pipeline al menos una vez
2. Los status checks aparecerán después de la primera ejecución
3. Luego puedes seleccionarlos en Branch Protection Rules

### 8.4 Deployment Fails con 403

**Problema**: Error de permisos al hacer deployment.

**Verificación**:

1. Personal Access Token tiene permisos correctos
2. GITHUB_TOKEN tiene write permissions
3. Repository Settings → Actions → General → Workflow permissions = "Read and write"

### 8.5 Environment No Requiere Approval

**Problema**: Production deployment no pide aprobación.

**Verificación**:

1. Environment `production` tiene "Required reviewers" marcado
2. Al menos un reviewer está seleccionado
3. El deployment está usando el environment correcto en el YAML

---

## 🎉 ¡Configuración Completada!

Una vez que hayas completado todos estos pasos:

1. **Tu CI/CD estará completamente funcional**
2. **Cada PR será validada automáticamente**
3. **Deployments a staging serán automáticos**
4. **Deployments a production requerirán aprobación**
5. **Tendrás reportes de coverage y notificaciones**

### 📞 Soporte

Si encuentras problemas:

1. **Revisa los logs** en la pestaña "Actions" de tu repositorio
2. **Compara con esta guía** para asegurar que no falta nada
3. **Busca en la documentación oficial** de GitHub Actions
4. **Crea un issue** en el repositorio con logs detallados

### 🔄 Mantenimiento

**Mensualmente**:

- Revisa y rota los tokens de acceso
- Actualiza las imágenes base de Docker
- Revisa los reportes de seguridad
- Actualiza las dependencias del proyecto

---

## 📚 Recursos Adicionales

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [NestJS Deployment Guide](https://docs.nestjs.com/deployment)
- [Codecov Documentation](https://docs.codecov.com/)

---

**¡Felicidades! 🎊 Tu pipeline CI/CD está completamente configurado y listo para usar.**
