# Inventory Service

> **Servicio de Gestión de Inventario** - Sistema de alta concurrencia para gestión de stock con locking optimista (Proyecto 3)

## 📋 Descripción

Servicio independiente en Go que maneja el inventario de productos con soporte para alta concurrencia, caché distribuida con Redis y locking optimista para prevenir race conditions en el stock.

## 🎯 Responsabilidades

- **Gestionar stock de productos** (CRUD)
- **Verificar disponibilidad** de productos
- **Reservar stock** para órdenes pendientes
- **Decrementar stock** al confirmar órdenes
- **Liberar reservas** al cancelar órdenes
- **Manejar concurrencia** con locking optimista
- **Cachear datos** de productos populares con Redis

## 🛠️ Stack Tecnológico

- **Lenguaje**: Go 1.21+
- **Framework HTTP**: Gin
- **ORM**: GORM
- **Base de Datos**: PostgreSQL
- **Caché**: Redis
- **Testing**: Testify + go-sqlmock
- **Arquitectura**: Clean Architecture (Hexagonal)

## 🏗️ Estructura del Proyecto

```
inventory-service/
├── cmd/
│   └── api/
│       └── main.go              # Entry point
├── internal/
│   ├── domain/                  # Capa de dominio (lógica de negocio)
│   │   ├── entity/              # Entidades del dominio
│   │   ├── valueobject/         # Value Objects
│   │   ├── repository/          # Interfaces (puertos)
│   │   └── errors/              # Errores de dominio
│   ├── application/             # Casos de uso
│   │   ├── dto/                 # Data Transfer Objects
│   │   └── usecase/             # Lógica de aplicación
│   ├── infrastructure/          # Implementaciones concretas
│   │   ├── persistence/         # Repositorios (GORM)
│   │   ├── cache/               # Cliente Redis
│   │   └── config/              # Configuración
│   └── interfaces/              # Adaptadores
│       └── http/                # Handlers HTTP (Gin)
├── pkg/                         # Paquetes reutilizables
│   ├── logger/                  # Sistema de logs
│   └── validator/               # Validaciones
├── tests/                       # Tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/                        # Documentación
├── scripts/                     # Scripts de utilidad
├── go.mod                       # Dependencias Go
├── Makefile                     # Comandos de desarrollo
└── README.md
```

## 🚀 Quick Start

### Prerequisitos

- Go 1.21 o superior
- PostgreSQL 15+
- Redis 7+
- Make (opcional)

### Instalación

```bash
# 1. Instalar dependencias
go mod download

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 3. Levantar infraestructura (desde raíz del monorepo)
cd ../..
docker-compose up postgres redis -d

# 4. Volver al servicio
cd services/inventory-service

# 5. Ejecutar migraciones
make migrate-up

# 6. Iniciar en modo desarrollo
make run
# O directamente: go run cmd/api/main.go
```

El servicio estará disponible en: `http://localhost:8080`

## 📝 Comandos Disponibles

```bash
# Desarrollo
make run              # Ejecutar la aplicación
make build            # Compilar binario
make watch            # Hot-reload con air

# Testing
make test             # Tests unitarios
make test-integration # Tests de integración
make test-e2e         # Tests end-to-end
make test-coverage    # Tests con cobertura

# Base de Datos
make migrate-up       # Ejecutar migraciones
make migrate-down     # Revertir migración
make migrate-create   # Crear nueva migración

# Calidad de Código
make lint             # Ejecutar golangci-lint
make fmt              # Formatear código con gofmt
make vet              # Análisis estático con go vet

# Docker
make docker-build     # Construir imagen Docker
make docker-run       # Ejecutar contenedor

# Utilidades
make clean            # Limpiar archivos generados
make help             # Mostrar ayuda
```

## 📚 Documentación de API

- **Health Check**: `GET /health`
- **API Docs (Swagger)**: `GET /api/docs` (próximamente)
- **Prometheus Metrics**: `GET /metrics` (próximamente)

## 🧪 Testing

```bash
# Ejecutar todos los tests
go test ./... -v

# Con coverage
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out

# Solo tests unitarios
go test ./tests/unit/... -v

# Tests de integración (requiere DB)
go test ./tests/integration/... -v
```

## 🏛️ Principios de Arquitectura

Este servicio sigue **Clean Architecture** (Arquitectura Hexagonal):

- **Independencia de Frameworks**: El dominio no depende de Gin ni GORM
- **Testeable**: Lógica de negocio puede testearse sin DB/HTTP
- **Independiente de UI**: Los handlers HTTP son solo adaptadores
- **Independiente de BD**: El dominio define interfaces, no implementaciones
- **Inversión de Dependencias**: Las dependencias apuntan hacia adentro

### Flujo de Dependencias

```
HTTP Request → Handler → Use Case → Repository Interface
                   ↓                        ↑
              Domain Logic            Implementation
                                      (GORM, Redis)
```

## 🔐 Seguridad

- Rate limiting en endpoints públicos
- Validación de entrada con go-playground/validator
- Preparación para autenticación JWT (futuro)
- Logs estructurados (sin datos sensibles)

## 📊 Métricas de Calidad (Objetivo)

- **Cobertura de Tests**: >70%
- **Latencia P95**: <200ms
- **Concurrencia**: Soporte para 100+ req/s
- **Disponibilidad**: 99.9%

## 🔗 Enlaces

- [Documentación del Monorepo](../../README.md)
- [ADRs](../../docs/adr/)
- [Guía de Desarrollo](../../docs/PROJECT_SETUP.md)

---

**Parte del ecosistema**: [Microservices E-commerce System](../../README.md)
