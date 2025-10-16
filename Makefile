.PHONY: help install-all start start-orders start-inventory stop clean test-all build-all health-check migrate-all seed-all

# Colores para output
RED=\033[0;31m
GREEN=\033[0;32m
YELLOW=\033[1;33m
BLUE=\033[0;34m
NC=\033[0m # No Color

help: ## Mostrar ayuda
	@echo "$(BLUE)════════════════════════════════════════════════════════════$(NC)"
	@echo "$(YELLOW)  Microservices E-commerce System - Comandos Disponibles$(NC)"
	@echo "$(BLUE)════════════════════════════════════════════════════════════$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

# ============================================================================
# Instalación y Setup
# ============================================================================

install-all: ## Instalar dependencias de todos los servicios
	@echo "$(BLUE)📦 Instalando dependencias...$(NC)"
	@echo "$(YELLOW)→ Orders Service (Node.js)$(NC)"
	cd services/orders-service && npm install
	@echo "$(YELLOW)→ Inventory Service (Go)$(NC)"
	cd services/inventory-service && go mod download
	@echo "$(GREEN)✅ Dependencias instaladas$(NC)"

setup: ## Setup completo del proyecto (primera vez)
	@echo "$(BLUE)🚀 Setup inicial del proyecto...$(NC)"
	@make install-all
	@make infra-up
	@echo "$(YELLOW)⏳ Esperando a que la base de datos esté lista...$(NC)"
	@sleep 5
	@make migrate-all
	@make seed-all
	@echo "$(GREEN)✅ Setup completado!$(NC)"
	@echo "$(YELLOW)💡 Ejecuta 'make start' para iniciar los servicios$(NC)"

# ============================================================================
# Infraestructura (Docker)
# ============================================================================

infra-up: ## Levantar infraestructura (PostgreSQL, Redis)
	@echo "$(BLUE)🐳 Levantando infraestructura...$(NC)"
	docker-compose up -d postgres redis
	@echo "$(GREEN)✅ Infraestructura lista$(NC)"

infra-down: ## Detener infraestructura
	@echo "$(YELLOW)⏹️  Deteniendo infraestructura...$(NC)"
	docker-compose down

infra-logs: ## Ver logs de la infraestructura
	docker-compose logs -f postgres redis

infra-clean: ## Limpiar infraestructura (ELIMINA DATOS)
	@echo "$(RED)⚠️  ADVERTENCIA: Esto eliminará todos los datos!$(NC)"
	@read -p "¿Continuar? [y/N]: " confirm && [ "$$confirm" = "y" ]
	docker-compose down -v --remove-orphans
	@echo "$(GREEN)✅ Infraestructura limpiada$(NC)"

# ============================================================================
# Servicios
# ============================================================================

start: ## Iniciar todos los servicios
	@echo "$(BLUE)🚀 Iniciando todos los servicios...$(NC)"
	@make infra-up
	@echo "$(YELLOW)→ Iniciando Orders Service en puerto 3000...$(NC)"
	@cd services/orders-service && npm run start:dev &
	@echo "$(YELLOW)→ Iniciando Inventory Service en puerto 8080...$(NC)"
	@cd services/inventory-service && go run cmd/api/main.go &
	@echo "$(GREEN)✅ Servicios iniciados$(NC)"
	@echo "$(BLUE)📊 Orders Service:    http://localhost:3000$(NC)"
	@echo "$(BLUE)📦 Inventory Service: http://localhost:8080$(NC)"

start-orders: ## Iniciar solo Orders Service
	@echo "$(YELLOW)🛒 Iniciando Orders Service...$(NC)"
	cd services/orders-service && npm run start:dev

start-inventory: ## Iniciar solo Inventory Service
	@echo "$(YELLOW)📦 Iniciando Inventory Service...$(NC)"
	cd services/inventory-service && go run cmd/api/main.go

stop: ## Detener todos los servicios y la infraestructura
	@echo "$(YELLOW)⏹️  Deteniendo servicios...$(NC)"
	@pkill -f "nest start" || true
	@pkill -f "inventory-service" || true
	@make infra-down
	@echo "$(GREEN)✅ Servicios detenidos$(NC)"

restart: stop start ## Reiniciar todos los servicios

# ============================================================================
# Base de Datos
# ============================================================================

migrate-all: ## Ejecutar migraciones de todos los servicios
	@echo "$(BLUE)🗄️  Ejecutando migraciones...$(NC)"
	@echo "$(YELLOW)→ Orders Service$(NC)"
	cd services/orders-service && npm run migration:run
	@echo "$(GREEN)✅ Migraciones completadas$(NC)"

seed-all: ## Seedear datos de prueba en todos los servicios
	@echo "$(BLUE)🌱 Sedeando datos...$(NC)"
	@echo "$(YELLOW)→ Orders Service$(NC)"
	cd services/orders-service && npm run seed:all
	@echo "$(GREEN)✅ Datos sedeados$(NC)"

db-reset: ## Resetear bases de datos (ELIMINA DATOS)
	@echo "$(RED)⚠️  ADVERTENCIA: Esto eliminará todos los datos!$(NC)"
	@read -p "¿Continuar? [y/N]: " confirm && [ "$$confirm" = "y" ]
	cd services/orders-service && npm run migration:revert
	@make migrate-all
	@make seed-all
	@echo "$(GREEN)✅ Bases de datos reseteadas$(NC)"

# ============================================================================
# Testing
# ============================================================================

test-all: ## Ejecutar tests de todos los servicios
	@echo "$(BLUE)🧪 Ejecutando tests...$(NC)"
	@echo "$(YELLOW)→ Orders Service$(NC)"
	cd services/orders-service && npm run test
	@echo "$(YELLOW)→ Inventory Service$(NC)"
	cd services/inventory-service && go test ./... -v
	@echo "$(GREEN)✅ Tests completados$(NC)"

test-coverage: ## Tests con cobertura
	@echo "$(BLUE)📊 Ejecutando tests con cobertura...$(NC)"
	@echo "$(YELLOW)→ Orders Service$(NC)"
	cd services/orders-service && npm run test:cov
	@echo "$(YELLOW)→ Inventory Service$(NC)"
	cd services/inventory-service && go test ./... -coverprofile=coverage.out
	@echo "$(GREEN)✅ Coverage generado$(NC)"

test-e2e: ## Tests end-to-end
	@echo "$(BLUE)🌐 Ejecutando tests E2E...$(NC)"
	cd services/orders-service && npm run test:e2e
	@echo "$(GREEN)✅ Tests E2E completados$(NC)"

# ============================================================================
# Build y Deploy
# ============================================================================

build-all: ## Compilar todos los servicios
	@echo "$(BLUE)🔨 Compilando servicios...$(NC)"
	@echo "$(YELLOW)→ Orders Service$(NC)"
	cd services/orders-service && npm run build
	@echo "$(YELLOW)→ Inventory Service$(NC)"
	cd services/inventory-service && go build -o bin/inventory-service cmd/api/main.go
	@echo "$(GREEN)✅ Servicios compilados$(NC)"

docker-build-all: ## Construir imágenes Docker de todos los servicios
	@echo "$(BLUE)🐳 Construyendo imágenes Docker...$(NC)"
	docker-compose build
	@echo "$(GREEN)✅ Imágenes construidas$(NC)"

docker-up: ## Levantar TODO el ecosistema con Docker
	@echo "$(BLUE)🐳 Levantando ecosistema completo...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✅ Ecosistema levantado$(NC)"
	@make health-check

# ============================================================================
# Calidad de Código
# ============================================================================

lint-all: ## Ejecutar linters de todos los servicios
	@echo "$(BLUE)🔍 Ejecutando linters...$(NC)"
	@echo "$(YELLOW)→ Orders Service$(NC)"
	cd services/orders-service && npm run lint
	@echo "$(YELLOW)→ Inventory Service$(NC)"
	cd services/inventory-service && make lint
	@echo "$(GREEN)✅ Linting completado$(NC)"

format-all: ## Formatear código de todos los servicios
	@echo "$(BLUE)✨ Formateando código...$(NC)"
	@echo "$(YELLOW)→ Orders Service$(NC)"
	cd services/orders-service && npm run format
	@echo "$(YELLOW)→ Inventory Service$(NC)"
	cd services/inventory-service && make fmt
	@echo "$(GREEN)✅ Código formateado$(NC)"

# ============================================================================
# Utilidades
# ============================================================================

health-check: ## Verificar salud de todos los servicios
	@echo "$(BLUE)🏥 Verificando salud de servicios...$(NC)"
	@echo "$(YELLOW)→ Orders Service (http://localhost:3000/health)$(NC)"
	@curl -s http://localhost:3000/health | grep -q "ok" && echo "$(GREEN)✅ Orders Service: OK$(NC)" || echo "$(RED)❌ Orders Service: FAIL$(NC)"
	@echo "$(YELLOW)→ Inventory Service (http://localhost:8080/health)$(NC)"
	@curl -s http://localhost:8080/health | grep -q "ok" && echo "$(GREEN)✅ Inventory Service: OK$(NC)" || echo "$(RED)❌ Inventory Service: FAIL$(NC)"
	@echo "$(YELLOW)→ PostgreSQL$(NC)"
	@docker-compose exec -T postgres pg_isready -U postgres && echo "$(GREEN)✅ PostgreSQL: OK$(NC)" || echo "$(RED)❌ PostgreSQL: FAIL$(NC)"
	@echo "$(YELLOW)→ Redis$(NC)"
	@docker-compose exec -T redis redis-cli ping | grep -q "PONG" && echo "$(GREEN)✅ Redis: OK$(NC)" || echo "$(RED)❌ Redis: FAIL$(NC)"

logs-orders: ## Ver logs de Orders Service
	cd services/orders-service && npm run start:dev

logs-inventory: ## Ver logs de Inventory Service
	cd services/inventory-service && go run cmd/api/main.go

clean: ## Limpiar archivos generados
	@echo "$(BLUE)🧹 Limpiando...$(NC)"
	cd services/orders-service && rm -rf dist/ node_modules/ coverage/
	cd services/inventory-service && rm -rf bin/ coverage.out
	@echo "$(GREEN)✅ Limpieza completada$(NC)"

status: ## Ver estado del ecosistema
	@echo "$(BLUE)📊 Estado del Ecosistema$(NC)"
	@echo ""
	@docker-compose ps
	@echo ""
	@echo "$(YELLOW)Para ver más detalles: make health-check$(NC)"

# ============================================================================
# Información
# ============================================================================

info: ## Mostrar información del proyecto
	@echo "$(BLUE)════════════════════════════════════════════════════════════$(NC)"
	@echo "$(YELLOW)  Microservices E-commerce System$(NC)"
	@echo "$(BLUE)════════════════════════════════════════════════════════════$(NC)"
	@echo ""
	@echo "$(GREEN)📦 Servicios:$(NC)"
	@echo "  • Orders Service (NestJS)    → http://localhost:3000"
	@echo "  • Inventory Service (Go)     → http://localhost:8080"
	@echo ""
	@echo "$(GREEN)🗄️  Infraestructura:$(NC)"
	@echo "  • PostgreSQL                 → localhost:5432"
	@echo "  • Redis                      → localhost:6379"
	@echo "  • PgAdmin (opcional)         → http://localhost:8080"
	@echo ""
	@echo "$(GREEN)📚 Documentación:$(NC)"
	@echo "  • Orders API (Swagger)       → http://localhost:3000/api/docs"
	@echo "  • Bull Dashboard             → http://localhost:3000/admin/queues"
	@echo "  • README                     → ./README.md"
	@echo ""
	@echo "$(YELLOW)💡 Tip: Ejecuta 'make help' para ver todos los comandos$(NC)"
	@echo ""
