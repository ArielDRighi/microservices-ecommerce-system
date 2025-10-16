# Ì∫Ä Quick Reference - Proyecto 3

> **Gu√≠a de consulta r√°pida** - Lo esencial del proyecto en un solo lugar

---

## Ì≥ã En 30 Segundos

```bash
# 1. Levantar infraestructura
docker-compose up -d postgres redis

# 2. Instalar dependencias
cd services/orders-service && npm install
cd ../inventory-service && go mod download

# 3. Ejecutar migraciones
cd services/orders-service && npm run migration:run

# 4. Iniciar servicios
# Terminal 1:
cd services/orders-service && npm run start:dev

# Terminal 2:
cd services/inventory-service && go run cmd/api/main.go
```

**Accesos r√°pidos:**
- Orders API: http://localhost:3001
- Swagger: http://localhost:3001/api/docs
- Inventory API: http://localhost:8080

---

## Ì¥å Puertos

| Proyecto 2 | Proyecto 3 | Servicio |
|------------|------------|----------|
| `3000` | **`3001`** | Orders Service |
| N/A | **`8080`** | Inventory Service |
| `5432` | **`5433`** | PostgreSQL |
| `6379` | **`6380`** | Redis |

---

## Ì∑ÑÔ∏è Bases de Datos

```bash
# Proyecto 2 (old)
ecommerce_async

# Proyecto 3 (new)
microservices_orders      # Orders Service
microservices_inventory   # Inventory Service
microservices_test        # Tests
```

**Conectar:**
```bash
psql -h localhost -p 5433 -U postgres -d microservices_orders
# Password: microservices_pass_2024
```

---

## Ì∞≥ Contenedores

```bash
# Ver todos
docker ps | grep microservices

# Logs
docker logs -f microservices-orders-service
docker logs -f microservices-inventory-service
docker logs -f microservices-postgres

# Restart
docker restart microservices-orders-service
```

---

## Ì¥ß Comandos Make

```bash
make help              # Ver todos los comandos
make setup             # Setup inicial completo
make start             # Iniciar todo
make stop              # Detener todo
make health-check      # Verificar salud
make test-all          # Ejecutar todos los tests
make clean             # Limpiar archivos generados
```

---

## Ì≥ö Documentaci√≥n Completa

- **[README Principal](README.md)** - Visi√≥n general del proyecto
- **[Referencia de Infraestructura](docs/INFRASTRUCTURE_REFERENCE.md)** - Puertos, BDs, credenciales
- **[Orders Service](services/orders-service/README.md)** - NestJS service
- **[Inventory Service](services/inventory-service/README.md)** - Go service
- **[ADRs](docs/adr/)** - Decisiones de arquitectura

---

## ‚ö†Ô∏è Troubleshooting R√°pido

**Puerto ocupado:**
```bash
netstat -ano | findstr :3001
```

**BD no existe:**
```bash
docker-compose down -v && docker-compose up -d postgres
```

**No compila Go:**
```bash
cd services/inventory-service && go mod tidy
```

**Tests fallan:**
```bash
docker-compose up -d postgres redis
# Esperar 5 segundos
make test-all
```

---

Ì≤° **Tip**: Guarda este archivo en favoritos para consulta r√°pida
