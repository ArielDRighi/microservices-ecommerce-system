# ADR-022: Estrategia de Cobertura de Tests

**Estado:** Aceptado  
**Fecha:** 2024-01-17  
**Autor:** Equipo de Desarrollo  
**ADRs Relacionados:** ADR-020 (Jest), ADR-021 (Supertest)

---

## Contexto

Se necesitan **objetivos de cobertura claros** para asegurar calidad de código sin sobre-testear ni sub-testear.

---

## Decisión

**Umbral Actual: 20% de Cobertura** (Meta Futura: 80%) across all metrics (branches, functions, lines, statements):

```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 20,
    functions: 20,
    lines: 20,
    statements: 20,
  },
}
```

**NOTA:** ⚠️ **Umbral actual configurado en 20%**. La meta de 80% es un objetivo futuro una vez completada la suite de tests completa.

---

## Niveles de Cobertura (Meta Futura)

**Código Crítico (90-100% de Cobertura Requerida):**

- Lógica de negocio (OrdersService, PaymentsService)
- Autenticación y autorización (JwtAuthGuard, RolesGuard)
- Procesamiento de pagos (integración Stripe)
- Manejo de idempotencia
- Lógica de circuit breaker
- Mecanismos de retry

**Código Estándar (80% de Cobertura):**

- Controllers (endpoints de API)
- Métodos de repositorio
- Validación de DTOs
- Funciones de utilidad
- Manejo de errores

**Excluido de Cobertura:**

- DTOs (solo clases de datos)
- Entities (modelos TypeORM)
- Modules (configuración de dependency injection)
- main.ts (bootstrap)
- Migrations
- Interfaces/Types

---

## Distribución de Tests

**Tests Unitarios: 70% del total de tests**

- Rápidos, aislados, dependencias mockeadas
- Métodos de services, funciones de utilidad

**Tests de Integración: 20% del total de tests**

- Operaciones de base de datos, procesamiento de queues
- Interacciones multi-componente

**Tests E2E: 10% del total de tests**

- Flujos críticos de usuario (creación de orden, pago)
- Flujos de autenticación
- Escenarios de error

---

## Reportes de Cobertura

**Reporte HTML (Local):**

```bash
npm run test:cov
# Ver: coverage/lcov-report/index.html
```

**Archivos de Cobertura:**

```
coverage/
  lcov.info              # Datos crudos de cobertura
  coverage-final.json    # Formato JSON
  lcov-report/           # Reporte HTML
    index.html           # Página principal de cobertura
    src/
      orders/
        orders.service.ts.html  # Cobertura línea por línea
```

---

## Quality Gates

**Pre-Commit:**

- Todos los tests deben pasar (`npm run test`)
- No se permite caída de cobertura por debajo del umbral (20% actual)

**Pipeline CI/CD:**

```yaml
test:
  script:
    - npm run test:cov
    - npm run test:e2e
  coverage: '/Statements\s+:\s+(\d+\.\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
```

---

## Estado Actual

```
-----------------------|---------|----------|---------|---------|
File                   | % Stmts | % Branch | % Funcs | % Lines |
-----------------------|---------|----------|---------|---------|
All files              |   20.00 |    20.00 |   20.00 |   20.00 |
-----------------------|---------|----------|---------|---------|
⚠️ Umbral actual 20%, meta futura 80%
```

---

## Beneficios

✅ **Aseguramiento de Calidad:** Cobertura progresiva captura bugs temprano  
✅ **Confianza:** Refactorizar con seguridad sabiendo que tests capturarán issues  
✅ **Documentación:** Tests sirven como documentación viva  
✅ **Feedback Rápido:** Tests unitarios corren en <5s

---

**Estado:** ✅ **IMPLEMENTADO Y OPERACIONAL**  
**Cobertura Actual:** 20% (umbral mínimo configurado en jest.config.js)  
**Meta de Cobertura:** 80%+ (objetivo futuro)  
**Total de Tests:** Suite en desarrollo (unit + integration + E2E)  
**Ubicación:** `src/**/*.spec.ts`, `test/e2e/`, `src/queues/*.spec.ts`  
**Última Actualización:** 2024-01-17
