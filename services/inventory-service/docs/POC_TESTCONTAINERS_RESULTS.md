# PoC Testcontainers - Resultados

**Fecha:** 2025-10-16  
**Proyecto:** Inventory Service (Go)  
**Objetivo:** Validar viabilidad de Testcontainers para CI/CD

---

## ✅ Resultados del PoC

### 📊 Métricas Medidas

| Métrica | Tiempo | Target | Status |
|---------|--------|--------|--------|
| **Setup Testcontainer** | 27.26s | < 60s | ✅ PASS |
| **GORM Connection** | 39ms | < 1s | ✅ PASS |
| **Schema Migration** | 34ms | < 1s | ✅ PASS |
| **Total Setup** | **27.35s** | **< 120s** | ✅ **PASS** |
| **Query 100 productos** | 1.24ms | < 100ms | ✅ PASS |

### 🎯 Conclusión

**Testcontainers ES VIABLE para este proyecto:**

1. ✅ **Tiempo aceptable:** 27.35s (muy por debajo del target de 2 min)
2. ✅ **Funciona en local:** Docker Desktop Windows funciona perfectamente
3. ✅ **Tests reales:** Valida queries SQL, constraints, optimistic locking
4. ✅ **Performance:** Query de 100 productos en 1.24ms (excelente)

---

## 🧪 Tests Ejecutados

### Test 1: CRUD Básico ✅
- Crear producto con GORM
- Recuperar por ID
- Validar auto-increment
- Validar timestamps

### Test 2: Optimistic Locking ✅
- Simular dos transacciones concurrentes
- Validar que version field previene race conditions
- Confirmar que solo TX1 actualiza, TX2 falla

### Test 3: Constraints DB Real ⚠️
- Intentar violar NOT NULL constraint
- **Resultado:** GORM permite NULL por defecto (necesita tags explícitos)
- **Acción:** Ajustar modelo con `gorm:"not null"` tags

### Test 4: Query Performance ✅
- Insertar 100 productos
- Query con WHERE condition
- **Resultado:** 1.24ms para procesar 100 registros

---

## 🚀 Optimizaciones Identificadas

### Con Docker Layer Cache (GitHub Actions)
```yaml
# Estimación con cache
Primera ejecución:  ~27s (pull image postgres:16-alpine)
Ejecuciones siguientes: ~10s (image ya descargada)
```

### Con Container Reuse (opcional)
```go
testcontainers.WithReuse(true)
```
**Beneficio:** Reduce setup de 27s → 5s en múltiples ejecuciones locales

---

## 📦 Stack Validado

```go
// Dependencias confirmadas funcionando
github.com/testcontainers/testcontainers-go v0.26.0
github.com/testcontainers/testcontainers-go/modules/postgres v0.26.0
gorm.io/driver/postgres v1.6.0
gorm.io/gorm v1.25.10
github.com/stretchr/testify v1.11.1
```

---

## 🎓 Lecciones Aprendidas

### 1. Naming Conflicts
**Problema:** `postgres` package name conflicts (testcontainers vs gorm driver)  
**Solución:** Usar alias `postgresdriver "gorm.io/driver/postgres"`

### 2. API Changes
**Problema:** Testcontainers API difiere entre versiones  
**Solución:** Usar `postgres.RunContainer()` en v0.26.0 (no `postgres.Run()`)

### 3. Connection String
**Problema:** Necesita `sslmode=disable` explícito para tests  
**Solución:** `postgresContainer.ConnectionString(ctx, "sslmode=disable")`

### 4. GORM Defaults
**Problema:** GORM permite NULL por defecto  
**Solución:** Usar tags `gorm:"not null"` explícitamente en modelos

---

## 📈 Comparación con Alternativas

| Opción | Setup Time | Realismo | Portfolio Impact |
|--------|------------|----------|-----------------|
| **sqlmock** | ~0s | ⚠️ Bajo | ⚠️ Junior/Mid |
| **Testcontainers** | **27s** | ✅ **Alto** | ✅ **Senior** |
| **Embedded Postgres** | ~15s | ✅ Alto | ⚠️ Complejo |

**Decisión:** Testcontainers gana por balance tiempo/realismo/impacto

---

## ✅ Decisión Final

**ADOPTAR Testcontainers con estrategia híbrida:**

```
├── Unit Tests (75% coverage, ~5s)
│   └── Mocks con testify/mock
├── Integration Tests (20% coverage, ~30s)
│   └── Testcontainers con PostgreSQL real
└── E2E Tests (5% coverage, ~30s)
    └── Postman/Newman
```

**Razón:** Balance perfecto entre velocidad en desarrollo y confianza en CI/CD.

---

## 🔗 Referencias

- PoC Test: `tests/integration/poc_testcontainers_test.go`
- ADR: `docs/adr/027-testcontainers-vs-mocks-go-testing.md`
- Backlog: `PROJECT_BACKLOG.md` (T0.1.2 COMPLETADO)

---

**Firmado:** Ariel D. Righi  
**Status:** ✅ PoC EXITOSO - Proceder con implementación
