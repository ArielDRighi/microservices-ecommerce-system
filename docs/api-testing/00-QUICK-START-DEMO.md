# ⚡ Quick Start Demo - 5 Minutos

> **Objetivo**: Demostrar el core del sistema en 5 minutos

---

## 🎯 El Sistema en Una Frase

**Sistema que procesa órdenes de e-commerce de forma asíncrona (<100ms respuesta) con procesamiento en background resiliente, usando Saga Pattern, reintentos automáticos, y garantías de idempotencia.**

---

## 🚀 Demo Rápida

### 1️⃣ Pre-requisitos (1 min)

```bash
# 1. Levantar sistema
docker-compose up -d
npm run start:dev

# 2. Seed datos (incluye users, categories, products e inventory)
npm run seed:all

# 3. Abrir Swagger
# http://localhost:3002/api/docs
```

---

### 2️⃣ Login (30s)

En Swagger → `POST /auth/login`:

```json
{
  "email": "admin@test.com",
  "password": "Admin123!"
}
```

Click **Authorize** 🔓 → Pegar `accessToken` → Authorize

---

### 3️⃣ Ver Productos (30s)

`GET /products` → Execute

Copia 2 `id` de productos con stock > 0

---

### 4️⃣ 🎯 Crear Orden - EL CORE (1 min)

`POST /orders` → Use este payload (reemplaza con ID real de producto):

```json
{
  "items": [
    {
      "productId": "PEGA-ID-REAL-AQUÍ",
      "quantity": 2
    }
  ]
}
```

💡 **Nota**: El precio se calcula automáticamente desde la base de datos.

**Observa**:

- ✅ Respuesta: **202 Accepted** (no 201)
- ✅ Tiempo: **< 100ms**
- ✅ Status: **"PENDING"**
- ✅ Copia el `id` de la orden

---

### 5️⃣ Observar Procesamiento (2 min)

#### Opción A: Bull Board (UI Visual)

1. Ve a: http://localhost:3002/api/v1/admin/queues
2. Login: `admin` / `changeme_in_production`
3. Ver cola `order-processing`:
   - Job procesándose (2-5 segundos)
   - Steps: Stock → Reserve → Payment → Notify → Confirm

#### Opción B: Logs (Terminal)

Busca en la terminal:

```
[Saga Step 1/5] ✅ Stock verified
[Saga Step 2/5] ✅ Inventory reserved
[Saga Step 3/5] ✅ Payment completed
[Saga Step 4/5] ✅ Notification sent
[Saga Step 5/5] ✅ Order confirmed
Saga completed successfully (800ms)
```

---

### 6️⃣ Verificar Resultado (30s)

`GET /orders/{id}` → Pega el `id` de tu orden

**Resultado esperado**:

```json
{
  "status": "CONFIRMED",
  "totalAmount": "69.98",
  "items": [
    {
      "productName": "Indoor Plant Pot Set",
      "quantity": 2,
      "totalPrice": "69.98"
    }
  ]
}
```

---

## 🎉 ¡Listo!

**Acabas de demostrar**:

- ✅ Procesamiento asíncrono (respuesta inmediata)
- ✅ Workers en background
- ✅ Saga Pattern (5 steps orquestados)
- ✅ Transacciones distribuidas
- ✅ Estado final consistente

---

## 🛡️ Bonus: Demostrar Resiliencia (2 min)

### 1️⃣ Fallo + Compensación

**Simulación automática**: El sistema falla aleatoriamente (80% éxito, 15% fallo temporal con retry, 5% fallo permanente)

**En Swagger** (`/api/docs`):

1. **POST /orders** → Crear múltiples órdenes (repetir 5-10 veces)
   - Usar diferentes productos
   - Eventualmente verás una orden con `status: "FAILED"`

2. **Observar en logs** cuando ocurra un fallo:

   ```
   [Saga] ❌ Payment failed: Insufficient funds
   [Saga] Starting rollback...
   [Saga] ✅ Inventory released
   Order status: FAILED
   ```

3. **Verificar en Bull Board** (`/api/v1/admin/queues`):
   - Ver jobs fallidos en la cola
   - Ver reintentos automáticos

**¿Qué demuestra?** Sistema se auto-recupera con rollback automático, no deja estado inconsistente

> 💡 **Tip**: Si quieres garantizar ver un fallo, crea 10 órdenes. Estadísticamente al menos 1-2 fallarán.

---

### 2️⃣ Idempotencia

**¿Qué valor usar en `idempotencyKey`?**

- 💡 **Opcional**: Si no lo envías, el sistema genera uno automáticamente
- ✅ **Recomendado**: Un string único que identifique la intención (ej: `order-2025-10-15-user-123`)
- ⚠️ **Para esta demo**: Usa cualquier string, pero repítelo para ver la idempotencia

**En Swagger** (`/api/docs`):

1. **POST /orders** → `Try it out`
   - Body con `idempotencyKey` (elige cualquier valor único):
     ```json
     {
       "items": [
         {
           "productId": "usa-un-id-real",
           "quantity": 1
         }
       ],
       "idempotencyKey": "mi-prueba-123"
     }
     ```
   - Execute → **202 Accepted** (guarda el `orderId`)

2. **POST /orders** → `Try it out` (repetir EXACTAMENTE igual)
   - **Mismo** body con el **mismo** `idempotencyKey`:
     ```json
     {
       "items": [
         {
           "productId": "usa-un-id-real",
           "quantity": 1
         }
       ],
       "idempotencyKey": "mi-prueba-123"
     }
     ```
   - Execute → **200 OK** (retorna la orden ya creada, NO crea una nueva)

3. **Verificar**: Ambas respuestas tienen el **mismo `orderId`**

**¿Qué demuestra?** Request duplicado detectado, retorna orden existente, no crea duplicados

> ⚠️ **IMPORTANTE**: El `idempotencyKey` identifica la **intención de crear UNA orden específica**. Si usas el mismo key con productos diferentes, el sistema **siempre retorna la orden original**, ignorando los nuevos datos. Para crear una orden nueva, usa un key diferente o no envíes key.

> 💡 **Tip**: En producción, el frontend generaría un UUID **nuevo** por cada intento de compra del usuario. Si el usuario hace doble-click en el **mismo carrito**, ambos requests usan el mismo UUID → solo se crea 1 orden.

---

## 📊 Visualizaciones Clave

| Herramienta      | URL                                       | Qué Ver            |
| ---------------- | ----------------------------------------- | ------------------ |
| **Swagger UI**   | http://localhost:3002/api/docs            | API interactiva    |
| **Bull Board**   | http://localhost:3002/api/v1/admin/queues | Colas y jobs       |
| **Health Check** | http://localhost:3002/api/v1/health       | Status del sistema |

---

## 🎓 Elevator Pitch

> "Sistema de órdenes asíncrono que responde en <100ms mientras procesa en background con Saga Pattern. Maneja fallos automáticamente con compensaciones, reintentos, y circuit breakers. Garantiza idempotencia y consistencia eventual en transacciones distribuidas."

---

## 📝 Checklist Rápido

- [ ] Orden creada en <100ms con 202
- [ ] Worker procesa en background (2-5s)
- [ ] Orden cambia de PENDING → CONFIRMED
- [ ] Stock decrementado
- [ ] Payment creado
- [ ] Fallo activa compensación
- [ ] Mismo idempotency key retorna misma orden

---

## 🔗 Más Info

- Guía completa: `/docs/HAPPY_PATH_GUIDE.md`
- Arquitectura: `/docs/ARCHITECTURE.md`
- API Docs: `/docs/API_DOCUMENTATION.md`

---

**¡Demo completo en 5 minutos! 🚀**
