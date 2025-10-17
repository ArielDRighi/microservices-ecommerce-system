# Guía de Validación de Código: TypeScript/NestJS y Go/Gin

## TypeScript / NestJS

### Comandos Básicos de Validación

#### Linting (ESLint)

```bash
# Analizar y corregir automáticamente
npm run lint

# Solo verificar sin modificar (CI/CD)
npm run lint:check
# o
npx eslint . --max-warnings=0
```

#### Formateo (Prettier)

```bash
# Formatear código
npm run format

# Verificar formato sin modificar
npm run format:check
# o
npx prettier --check .
```

#### Type Checking

```bash
# Verificar tipos de TypeScript
npm run build
# o
npx tsc --noEmit
```

#### Testing

```bash
# Ejecutar tests
npm run test

# Tests con cobertura
npm run test:cov

# Tests en modo watch
npm run test:watch

# Tests e2e
npm run test:e2e
```

### Herramientas Avanzadas para NestJS/TypeScript

#### 1. **Husky + lint-staged**

Ejecuta validaciones automáticamente antes de cada commit.

```bash
npm install --save-dev husky lint-staged
npx husky init
```

**package.json:**

```json
{
  "lint-staged": {
    "*.ts": ["eslint --fix", "prettier --write"]
  }
}
```

**.husky/pre-commit:**

```bash
npx lint-staged
npm run test
```

#### 2. **Commitlint**

Valida que los mensajes de commit sigan convenciones.

```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional
```

**commitlint.config.js:**

```js
module.exports = {
  extends: ["@commitlint/config-conventional"],
};
```

#### 3. **TypeScript Strict Mode**

Habilita verificaciones estrictas en `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

#### 4. **SonarQube / SonarCloud**

Análisis continuo de calidad de código, detecta bugs, vulnerabilidades y code smells.

```bash
# Con Docker
docker run -d --name sonarqube -p 9000:9000 sonarqube
```

#### 5. **Madge**

Detecta dependencias circulares en tu código.

```bash
npm install --save-dev madge
npx madge --circular --extensions ts ./src
```

#### 6. **Depcheck**

Encuentra dependencias no utilizadas.

```bash
npm install -g depcheck
depcheck
```

#### 7. **npm audit / Snyk**

Detecta vulnerabilidades de seguridad en dependencias.

```bash
# Nativo de npm
npm audit
npm audit fix

# Snyk (más completo)
npm install -g snyk
snyk test
snyk monitor
```

#### 8. **TSLint Security Rules**

Reglas de seguridad para ESLint.

```bash
npm install --save-dev eslint-plugin-security
```

#### 9. **Bundle Analysis**

Analiza el tamaño de tu build.

```bash
npm install --save-dev webpack-bundle-analyzer
```

#### 10. **Class Validator + Class Transformer (NestJS)**

Validación de DTOs en runtime.

```typescript
import { IsEmail, IsNotEmpty } from "class-validator";

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}
```

---

## Go / Gin

### Comandos Básicos de Validación

#### Formateo

```bash
# Formatear todo el proyecto
go fmt ./...

# Verificar formato sin modificar
gofmt -d .

# Con goimports (maneja imports automáticamente)
goimports -w .
```

#### Análisis de Código

```bash
# Detector de problemas comunes
go vet ./...

# Verificar errores de sombreado de variables
go vet -shadow ./...
```

#### Testing

```bash
# Ejecutar todos los tests
go test ./...

# Con cobertura
go test -cover ./...

# Cobertura detallada en HTML
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

#### Build y Verificación

```bash
# Compilar el proyecto
go build ./...

# Verificar módulos
go mod verify
go mod tidy
```

### Herramientas Avanzadas para Go/Gin

#### 1. **golangci-lint** (Esencial)

Meta-linter que ejecuta múltiples linters simultáneamente.

```bash
# Instalación
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# Uso básico
golangci-lint run

# Con configuración específica
golangci-lint run --enable-all
```

**.golangci.yml:**

```yaml
linters:
  enable:
    - gofmt
    - govet
    - staticcheck
    - errcheck
    - gosimple
    - ineffassign
    - unused
    - gocritic
    - gosec
    - revive

linters-settings:
  govet:
    check-shadowing: true
  gofmt:
    simplify: true
```

#### 2. **staticcheck**

Linter avanzado para detectar bugs y code smells.

```bash
go install honnef.co/go/tools/cmd/staticcheck@latest
staticcheck ./...
```

#### 3. **gosec**

Escáner de seguridad para Go.

```bash
go install github.com/securego/gosec/v2/cmd/gosec@latest
gosec ./...
```

#### 4. **Go Vulnerability Check**

Detecta vulnerabilidades conocidas en dependencias.

```bash
go install golang.org/x/vuln/cmd/govulncheck@latest
govulncheck ./...
```

#### 5. **errcheck**

Verifica que no ignores errores sin manejar.

```bash
go install github.com/kisielk/errcheck@latest
errcheck ./...
```

#### 6. **go-critic**

Linter extensible con muchas verificaciones.

```bash
go install github.com/go-critic/go-critic/cmd/gocritic@latest
gocritic check ./...
```

#### 7. **Gin Validator**

Validación de requests en Gin usando tags.

```go
import "github.com/go-playground/validator/v10"

type CreateUserRequest struct {
    Email    string `json:"email" binding:"required,email"`
    Password string `json:"password" binding:"required,min=8"`
}

func CreateUser(c *gin.Context) {
    var req CreateUserRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }
    // ...
}
```

#### 8. **Testify**

Biblioteca de assertions para tests más legibles.

```bash
go get github.com/stretchr/testify
```

```go
import "github.com/stretchr/testify/assert"

func TestSomething(t *testing.T) {
    assert.Equal(t, 123, myFunc())
    assert.NotNil(t, object)
}
```

#### 9. **Go Mock**

Generación de mocks para testing.

```bash
go install github.com/golang/mock/mockgen@latest
mockgen -source=interface.go -destination=mock.go
```

#### 10. **Pre-commit Hooks**

Similar a Husky en Node.

```bash
# Instalar pre-commit
pip install pre-commit

# .pre-commit-config.yaml
repos:
  - repo: https://github.com/dnephin/pre-commit-golang
    rev: master
    hooks:
      - id: go-fmt
      - id: go-vet
      - id: go-imports
      - id: golangci-lint
```

---

## Pipeline de CI/CD Recomendado

### GitHub Actions - TypeScript/NestJS

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm ci
      - run: npm run lint:check
      - run: npm run format:check
      - run: npm run build
      - run: npm run test:cov
      - run: npm audit
```

### GitHub Actions - Go/Gin

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: "1.21"
      - run: go mod download
      - run: gofmt -d .
      - run: go vet ./...
      - run: golangci-lint run
      - run: go test -race -coverprofile=coverage.out ./...
      - run: govulncheck ./...
```

---

## Métricas de Calidad Recomendadas

### Para ambos ecosistemas:

1. **Cobertura de tests**: Mínimo 80%
2. **Complejidad ciclomática**: Máximo 10-15 por función
3. **Duplicación de código**: Menos del 5%
4. **Deuda técnica**: Máximo 5% del tiempo de desarrollo
5. **Vulnerabilidades**: 0 críticas, 0 altas

### Herramientas de métricas:

- **SonarQube**: Métricas completas de calidad
- **Code Climate**: Análisis automático de calidad
- **Codecov**: Seguimiento de cobertura de tests
- **DeepSource**: Análisis continuo de código

---

## Script de Validación Completo

### TypeScript/NestJS (validate.sh)

```bash
#!/bin/bash
set -e

echo "🔍 Verificando formato..."
npm run format:check

echo "🔍 Verificando linting..."
npm run lint:check

echo "🔍 Verificando tipos..."
npx tsc --noEmit

echo "🔍 Buscando dependencias circulares..."
npx madge --circular --extensions ts ./src

echo "🔍 Verificando dependencias no usadas..."
depcheck

echo "🔍 Escaneando vulnerabilidades..."
npm audit

echo "🧪 Ejecutando tests..."
npm run test:cov

echo "✅ Todas las validaciones pasaron!"
```

### Go/Gin (validate.sh)

```bash
#!/bin/bash
set -e

echo "🔍 Verificando formato..."
test -z "$(gofmt -l .)"

echo "🔍 Verificando código..."
go vet ./...

echo "🔍 Ejecutando linters..."
golangci-lint run

echo "🔍 Verificando vulnerabilidades..."
govulncheck ./...

echo "🔍 Verificando módulos..."
go mod verify

echo "🧪 Ejecutando tests..."
go test -race -coverprofile=coverage.out ./...

echo "✅ Todas las validaciones pasaron!"
```

---

## Recomendaciones Finales

### Para comenzar (orden de prioridad):

**TypeScript/NestJS:**

1. ESLint + Prettier configurados
2. TypeScript strict mode
3. Tests con buena cobertura
4. Husky + lint-staged
5. npm audit regularmente

**Go/Gin:**

1. go fmt + go vet en cada commit
2. golangci-lint configurado
3. Tests con table-driven tests
4. govulncheck regularmente
5. Validator en endpoints de Gin

### Integra gradualmente:

No intentes implementar todo a la vez. Comienza con lo básico y ve agregando herramientas conforme tu proyecto crezca.

### Automatiza:

Usa pre-commit hooks y CI/CD para que las validaciones sean automáticas y no dependan de la memoria humana.
