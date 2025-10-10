# ADR-024: Docker Compose Orchestration

**Status:** Accepted  
**Date:** 2024-01-17  
**Author:** Development Team

---

## Context

Need to run **multiple services** locally: app, PostgreSQL, Redis, with proper networking and volumes.

---

## Decision

Use **Docker Compose** for local development and testing:

```yaml
# docker-compose.yml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ecommerce
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  # NestJS App
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/ecommerce
      REDIS_HOST: redis
      REDIS_PORT: 6379
    volumes:
      - ./src:/app/src  # Hot reload
      - ./test:/app/test
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started

volumes:
  postgres_data:
  redis_data:
```

---

## Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down

# Rebuild after changes
docker-compose up -d --build
```

---

## Benefits

✅ **One Command:** Start entire stack with `docker-compose up`  
✅ **Networking:** Services auto-discover via DNS  
✅ **Persistence:** Volumes for data  
✅ **Health Checks:** Wait for DB before starting app  

---

**Status:** ✅ **IMPLEMENTED**  
**Files:** `docker-compose.yml`, `docker-compose.dev.yml`
