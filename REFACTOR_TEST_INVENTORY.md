# Inventario de Tests - Análisis para Refactorización

**Fecha de Análisis:** 5 de Octubre, 2025
**Rama:** task-17-refactor-tests-unitarios
**Total de archivos .spec.ts:** 43 archivos
**Total de líneas:** 19,406 líneas

---

## 📊 Clasificación por Tamaño

### 🔴 CRÍTICO - Requiere Refactor Urgente (>600 líneas) - 8 archivos

| #   | Archivo                                 | Líneas | Módulo     | Acción                  |
| --- | --------------------------------------- | ------ | ---------- | ----------------------- |
| 1   | `categories.service.spec.ts`            | 1,364  | Categories | Dividir en 4 archivos   |
| 2   | `products.service.spec.ts`              | 1,088  | Products   | Dividir en 3-4 archivos |
| 3   | `outbox.processor.spec.ts`              | 886    | Events     | Dividir en 3 archivos   |
| 4   | `order-processing-saga.service.spec.ts` | 867    | Orders     | Dividir en 3 archivos   |
| 5   | `mock-payment.provider.spec.ts`         | 861    | Payments   | Dividir en 3 archivos   |
| 6   | `inventory.service.spec.ts`             | 856    | Inventory  | Dividir en 3 archivos   |
| 7   | `queue.service.spec.ts`                 | 839    | Queues     | Dividir en 3 archivos   |
| 8   | `categories.controller.spec.ts`         | 832    | Categories | Dividir en 3 archivos   |

**Subtotal:** 7,593 líneas en 8 archivos

---

### 🔴 ALTA PRIORIDAD - Requiere Refactor (400-600 líneas) - 8 archivos

| #   | Archivo                              | Líneas | Módulo    | Acción                  |
| --- | ------------------------------------ | ------ | --------- | ----------------------- |
| 9   | `payment.processor.spec.ts`          | 787    | Queues    | Dividir en 3 archivos   |
| 10  | `inventory.processor.spec.ts`        | 781    | Queues    | Dividir en 3 archivos   |
| 11  | `notification.processor.spec.ts`     | 762    | Queues    | Dividir en 3 archivos   |
| 12  | `payments.service.spec.ts`           | 674    | Payments  | Dividir en 2-3 archivos |
| 13  | `order-processing.processor.spec.ts` | 652    | Queues    | Dividir en 2-3 archivos |
| 14  | `inventory.controller.spec.ts`       | 647    | Inventory | Dividir en 2-3 archivos |
| 15  | `users.service.spec.ts`              | 610    | Users     | Dividir en 2-3 archivos |
| 16  | `auth.service.spec.ts`               | 573    | Auth      | Dividir en 2-3 archivos |

**Subtotal:** 5,486 líneas en 8 archivos

---

### 🔴 MEDIA PRIORIDAD - Requiere Refactor (300-400 líneas) - 9 archivos

| #   | Archivo                          | Líneas | Módulo        | Acción                  |
| --- | -------------------------------- | ------ | ------------- | ----------------------- |
| 17  | `notification.processor.spec.ts` | 566    | Notifications | Dividir en 2 archivos   |
| 18  | `users.controller.spec.ts`       | 433    | Users         | Dividir en 2 archivos   |
| 19  | `orders.controller.spec.ts`      | 413    | Orders        | Dividir en 2 archivos   |
| 20  | `current-user.decorator.spec.ts` | 386    | Auth          | Dividir en 2 archivos   |
| 21  | `auth.controller.spec.ts`        | 361    | Auth          | Dividir en 2 archivos   |
| 22  | `notifications.service.spec.ts`  | 357    | Notifications | Dividir en 2 archivos   |
| 23  | `orders.service.spec.ts`         | 329    | Orders        | Dividir en 2 archivos   |
| 24  | `email.provider.spec.ts`         | 319    | Notifications | Dividir en 2 archivos   |
| 25  | `event.publisher.spec.ts`        | 292    | Events        | Mantener o dividir en 2 |

**Subtotal:** 3,456 líneas en 9 archivos

---

### 🟡 ACEPTABLE - Revisar (251-300 líneas) - 3 archivos

| #   | Archivo                          | Líneas | Módulo        | Acción                        |
| --- | -------------------------------- | ------ | ------------- | ----------------------------- |
| 26  | `queue.health-indicator.spec.ts` | 272    | Health        | Revisar, posible optimización |
| 27  | `products.controller.spec.ts`    | 271    | Products      | Revisar, posible optimización |
| 28  | `sms.provider.spec.ts`           | 260    | Notifications | Revisar, posible optimización |

**Subtotal:** 803 líneas en 3 archivos

---

### 🟢 ÓPTIMO - No requiere refactor (<250 líneas) - 15 archivos

| #   | Archivo                              | Líneas | Módulo        |
| --- | ------------------------------------ | ------ | ------------- |
| 29  | `base.processor.spec.ts`             | 258    | Queues        |
| 30  | `all-exceptions.filter.spec.ts`      | 255    | Common        |
| 31  | `jwt.strategy.spec.ts`               | 198    | Auth          |
| 32  | `template.service.spec.ts`           | 173    | Notifications |
| 33  | `jwt-auth.guard.spec.ts`             | 155    | Auth          |
| 34  | `app.config.spec.ts`                 | 143    | Config        |
| 35  | `redis.health-indicator.spec.ts`     | 124    | Health        |
| 36  | `winston-logger.service.spec.ts`     | 123    | Test          |
| 37  | `database.health-indicator.spec.ts`  | 113    | Health        |
| 38  | `order-created.handler.spec.ts`      | 90     | Events        |
| 39  | `user.entity.spec.ts`                | 88     | Users         |
| 40  | `base.event-handler.spec.ts`         | 86     | Events        |
| 41  | `order-confirmed.handler.spec.ts`    | 85     | Events        |
| 42  | `payment-processed.handler.spec.ts`  | 75     | Events        |
| 43  | `inventory-reserved.handler.spec.ts` | 73     | Events        |

**Subtotal:** 2,068 líneas en 15 archivos (incluye app.controller.spec.ts con 29 líneas)

---

## 📈 Resumen Estadístico

| Categoría              | Archivos | Líneas     | % del Total |
| ---------------------- | -------- | ---------- | ----------- |
| 🔴 Crítico (>600)      | 8        | 7,593      | 39.1%       |
| 🔴 Alta (400-600)      | 8        | 5,486      | 28.3%       |
| 🔴 Media (300-400)     | 9        | 3,456      | 17.8%       |
| 🟡 Aceptable (251-300) | 3        | 803        | 4.1%        |
| 🟢 Óptimo (<250)       | 15       | 2,068      | 10.7%       |
| **TOTAL**              | **43**   | **19,406** | **100%**    |

### Archivos que Requieren Refactor

- **Total archivos >300 líneas:** 25 archivos (58.1% del total)
- **Total líneas a refactorizar:** 16,535 líneas (85.2% del código de tests)
- **Promedio actual archivos >300:** 661 líneas/archivo
- **Target después de refactor:** 150-250 líneas/archivo

---

## 🎯 Plan de Refactorización por Módulo

### 1. Módulo Auth (src/modules/auth/) - 5 archivos

- 🔴 `auth.service.spec.ts` - 573 líneas → Dividir en 2-3 archivos
- 🔴 `current-user.decorator.spec.ts` - 386 líneas → Dividir en 2 archivos
- 🔴 `auth.controller.spec.ts` - 361 líneas → Dividir en 2 archivos
- 🟢 `jwt.strategy.spec.ts` - 198 líneas → OK
- 🟢 `jwt-auth.guard.spec.ts` - 155 líneas → OK

**Total Auth:** 1,673 líneas | **Requiere refactor:** 3 archivos (1,320 líneas)

---

### 2. Módulo Users (src/modules/users/) - 3 archivos

- 🔴 `users.service.spec.ts` - 610 líneas → Dividir en 2-3 archivos
- 🔴 `users.controller.spec.ts` - 433 líneas → Dividir en 2 archivos
- 🟢 `user.entity.spec.ts` - 88 líneas → OK

**Total Users:** 1,131 líneas | **Requiere refactor:** 2 archivos (1,043 líneas)

---

### 3. Módulo Products (src/modules/products/) - 2 archivos

- 🔴 `products.service.spec.ts` - 1,088 líneas → Dividir en 3-4 archivos
- 🟡 `products.controller.spec.ts` - 271 líneas → Revisar

**Total Products:** 1,359 líneas | **Requiere refactor:** 1 archivo crítico (1,088 líneas)

---

### 4. Módulo Categories (src/modules/categories/) - 2 archivos

- 🔴 `categories.service.spec.ts` - 1,364 líneas → Dividir en 4 archivos (EL MÁS GRANDE)
- 🔴 `categories.controller.spec.ts` - 832 líneas → Dividir en 3 archivos

**Total Categories:** 2,196 líneas | **Requiere refactor:** 2 archivos (2,196 líneas)

---

### 5. Módulo Orders (src/modules/orders/) - 3 archivos

- 🔴 `order-processing-saga.service.spec.ts` - 867 líneas → Dividir en 3 archivos
- 🔴 `orders.controller.spec.ts` - 413 líneas → Dividir en 2 archivos
- 🔴 `orders.service.spec.ts` - 329 líneas → Dividir en 2 archivos

**Total Orders:** 1,609 líneas | **Requiere refactor:** 3 archivos (1,609 líneas)

---

### 6. Módulo Payments (src/modules/payments/) - 2 archivos

- 🔴 `mock-payment.provider.spec.ts` - 861 líneas → Dividir en 3 archivos
- 🔴 `payments.service.spec.ts` - 674 líneas → Dividir en 2-3 archivos

**Total Payments:** 1,535 líneas | **Requiere refactor:** 2 archivos (1,535 líneas)

---

### 7. Módulo Inventory (src/modules/inventory/) - 2 archivos

- 🔴 `inventory.service.spec.ts` - 856 líneas → Dividir en 3 archivos
- 🔴 `inventory.controller.spec.ts` - 647 líneas → Dividir en 2-3 archivos

**Total Inventory:** 1,503 líneas | **Requiere refactor:** 2 archivos (1,503 líneas)

---

### 8. Módulo Notifications (src/modules/notifications/) - 4 archivos

- 🔴 `notification.processor.spec.ts` - 566 líneas → Dividir en 2 archivos
- 🔴 `notifications.service.spec.ts` - 357 líneas → Dividir en 2 archivos
- 🔴 `email.provider.spec.ts` - 319 líneas → Dividir en 2 archivos
- 🟡 `sms.provider.spec.ts` - 260 líneas → Revisar
- 🟢 `template.service.spec.ts` - 173 líneas → OK

**Total Notifications:** 1,675 líneas | **Requiere refactor:** 3 archivos (1,242 líneas)

---

### 9. Módulo Events (src/modules/events/) - 6 archivos

- 🔴 `outbox.processor.spec.ts` - 886 líneas → Dividir en 3 archivos
- 🔴 `event.publisher.spec.ts` - 292 líneas → Dividir en 2 archivos
- 🟢 `order-created.handler.spec.ts` - 90 líneas → OK
- 🟢 `base.event-handler.spec.ts` - 86 líneas → OK
- 🟢 `order-confirmed.handler.spec.ts` - 85 líneas → OK
- 🟢 `payment-processed.handler.spec.ts` - 75 líneas → OK
- 🟢 `inventory-reserved.handler.spec.ts` - 73 líneas → OK

**Total Events:** 1,587 líneas | **Requiere refactor:** 2 archivos (1,178 líneas)

---

### 10. Queues y Processors (src/queues/) - 5 archivos

- 🔴 `queue.service.spec.ts` - 839 líneas → Dividir en 3 archivos
- 🔴 `payment.processor.spec.ts` - 787 líneas → Dividir en 3 archivos
- 🔴 `inventory.processor.spec.ts` - 781 líneas → Dividir en 3 archivos
- 🔴 `notification.processor.spec.ts` - 762 líneas → Dividir en 3 archivos
- 🔴 `order-processing.processor.spec.ts` - 652 líneas → Dividir en 2-3 archivos
- 🟢 `base.processor.spec.ts` - 258 líneas → OK

**Total Queues:** 4,079 líneas | **Requiere refactor:** 5 archivos (3,821 líneas)

---

### 11. Common y Utils (src/common/) - 1 archivo

- 🟢 `all-exceptions.filter.spec.ts` - 255 líneas → OK

**Total Common:** 255 líneas | **Requiere refactor:** 0 archivos

---

### 12. Config (src/config/) - 1 archivo

- 🟢 `app.config.spec.ts` - 143 líneas → OK

**Total Config:** 143 líneas | **Requiere refactor:** 0 archivos

---

## 🎯 Métricas Objetivo Post-Refactorización

### Estimación de Archivos Después de Refactorizar

| Módulo        | Archivos Actuales | Archivos Después | Incremento |
| ------------- | ----------------- | ---------------- | ---------- |
| Auth          | 5                 | 10               | +5         |
| Users         | 3                 | 7                | +4         |
| Products      | 2                 | 5                | +3         |
| Categories    | 2                 | 8                | +6         |
| Orders        | 3                 | 8                | +5         |
| Payments      | 2                 | 6                | +4         |
| Inventory     | 2                 | 6                | +4         |
| Notifications | 5                 | 9                | +4         |
| Events        | 6                 | 10               | +4         |
| Queues        | 6                 | 16               | +10        |
| Common        | 1                 | 1                | 0          |
| Config        | 1                 | 1                | 0          |
| **TOTAL**     | **43**            | **~90**          | **+47**    |

### Métricas Esperadas

- **Archivos totales después:** ~90 archivos .spec.ts
- **Promedio líneas/archivo:** ~180 líneas
- **Archivos >300 líneas:** 0 archivos (0%)
- **Duplicación de código:** <5%
- **Coverage:** Mantener ≥80%

---

## 📋 Orden de Ejecución Recomendado

Basado en complejidad y dependencias:

1. ✅ **Auth** - Base para otros módulos, 3 archivos a refactorizar
2. ✅ **Users** - Depende de Auth, 2 archivos a refactorizar
3. ✅ **Products** - Independiente, 1 archivo crítico
4. ✅ **Categories** - Independiente, 2 archivos críticos (más grande)
5. ✅ **Inventory** - Depende de Products, 2 archivos
6. ✅ **Payments** - Independiente, 2 archivos
7. ✅ **Orders** - Depende de varios, 3 archivos
8. ✅ **Notifications** - Independiente, 3 archivos
9. ✅ **Events** - Central para el sistema, 2 archivos
10. ✅ **Queues** - Más archivos a refactorizar, 5 archivos
11. ✅ **Common** - Sin refactor necesario
12. ✅ **Config** - Sin refactor necesario

---

## 🚀 Próximos Pasos

1. **Comenzar con Módulo Auth**
   - Analizar `auth.service.spec.ts` (573 líneas)
   - Aplicar prompt de REFACTOR_TESTS_PROMPTS.md
   - Proponer estructura de división
   - Implementar refactorización
   - Validar calidad y push

2. **Crear estructura de helpers reutilizables**
   - Factories para entities
   - Mocks comunes
   - Assertions helpers
   - Test utilities

3. **Documentar patrones encontrados**
   - Casos de uso de test.each()
   - Patrones de factories exitosos
   - Helpers más útiles
   - Lecciones aprendidas

---

**Documento generado automáticamente - Task 17 Refactorización de Tests Unitarios**
