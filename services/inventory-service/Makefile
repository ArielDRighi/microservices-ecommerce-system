.PHONY: help run build test test-coverage test-integration lint fmt vet clean docker-build docker-run migrate-up migrate-down migrate-create

# Variables
BINARY_NAME=inventory-service
GO_FILES=$(shell find . -name '*.go' -not -path "./vendor/*")
COVERAGE_FILE=coverage.out

help: ## Mostrar ayuda
	@echo "Comandos disponibles:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

run: ## Ejecutar la aplicación
	@echo "🚀 Iniciando Inventory Service..."
	go run cmd/api/main.go

build: ## Compilar binario
	@echo "🔨 Compilando..."
	go build -o bin/$(BINARY_NAME) cmd/api/main.go
	@echo "✅ Binario creado en bin/$(BINARY_NAME)"

test: ## Ejecutar tests unitarios
	@echo "🧪 Ejecutando tests..."
	go test ./... -v -race -short

test-all: ## Ejecutar todos los tests
	@echo "🧪 Ejecutando todos los tests..."
	go test ./... -v -race

test-coverage: ## Tests con cobertura
	@echo "📊 Ejecutando tests con cobertura..."
	go test ./... -coverprofile=$(COVERAGE_FILE) -covermode=atomic -short
	go tool cover -func=$(COVERAGE_FILE)
	@echo "💡 Para ver HTML: go tool cover -html=$(COVERAGE_FILE)"

test-integration: ## Tests de integración
	@echo "🔗 Ejecutando tests de integración..."
	go test ./tests/integration/... -v

test-e2e: ## Tests end-to-end
	@echo "🌐 Ejecutando tests E2E..."
	go test ./tests/e2e/... -v

lint: ## Ejecutar linter
	@echo "🔍 Ejecutando golangci-lint..."
	golangci-lint run

fmt: ## Formatear código
	@echo "✨ Formateando código..."
	gofmt -w $(GO_FILES)

vet: ## Análisis estático
	@echo "🔎 Ejecutando go vet..."
	go vet ./...

clean: ## Limpiar archivos generados
	@echo "🧹 Limpiando..."
	rm -rf bin/
	rm -f $(COVERAGE_FILE)
	go clean

deps: ## Instalar dependencias
	@echo "📦 Instalando dependencias..."
	go mod download
	go mod tidy

deps-update: ## Actualizar dependencias
	@echo "⬆️  Actualizando dependencias..."
	go get -u ./...
	go mod tidy

migrate-up: ## Ejecutar migraciones
	@echo "⬆️  Ejecutando migraciones..."
	migrate -path internal/infrastructure/persistence/migrations -database "$(DATABASE_URL)" up

migrate-down: ## Revertir última migración
	@echo "⬇️  Revirtiendo migración..."
	migrate -path internal/infrastructure/persistence/migrations -database "$(DATABASE_URL)" down 1

migrate-create: ## Crear nueva migración (usar: make migrate-create name=nombre_migracion)
	@echo "📝 Creando migración..."
	migrate create -ext sql -dir internal/infrastructure/persistence/migrations -seq $(name)

docker-build: ## Construir imagen Docker
	@echo "🐳 Construyendo imagen Docker..."
	docker build -t $(BINARY_NAME):latest .

docker-run: ## Ejecutar contenedor Docker
	@echo "🐳 Ejecutando contenedor..."
	docker run -p 8080:8080 --env-file .env $(BINARY_NAME):latest

watch: ## Hot-reload con air
	@echo "👀 Iniciando en modo watch..."
	air

dev: ## Ambiente de desarrollo completo
	@echo "🛠️  Iniciando ambiente de desarrollo..."
	docker-compose -f ../../docker-compose.yml up postgres redis -d
	@sleep 3
	@make run

install-tools: ## Instalar herramientas de desarrollo
	@echo "🔧 Instalando herramientas..."
	go install github.com/cosmtrek/air@latest
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
