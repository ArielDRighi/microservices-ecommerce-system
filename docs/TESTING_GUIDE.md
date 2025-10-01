# 🧪 Guía de Testing del Sistema de Colas

Esta guía te ayudará a probar el sistema de colas implementado con Redis y Bull.

## 📋 Prerrequisitos

Antes de comenzar, asegúrate de tener instalado:

- ✅ Node.js 18+
- ✅ Docker y Docker Compose
- ✅ Git

## 🚀 Paso 1: Levantar Servicios con Docker

Primero, vamos a levantar Redis y PostgreSQL usando Docker Compose:

```bash
# Levantar solo Redis y PostgreSQL (sin la app)
docker-compose up -d postgres redis

# Verificar que los servicios están corriendo
docker-compose ps

# Ver logs de Redis para confirmar que está activo
docker-compose logs redis

# Ver logs de PostgreSQL
docker-compose logs postgres
```

**Resultado esperado:**

```
✅ ecommerce-postgres  - Up
✅ ecommerce-redis     - Up
```

## 🔧 Paso 2: Verificar Conexión a Redis

Puedes verificar que Redis esté accesible de dos formas:

### Opción A: Usando Docker Exec

```bash
# Conectar a Redis via Docker
docker exec -it ecommerce-redis redis-cli

# Una vez dentro, probar:
> PING
# Debe responder: PONG

> INFO server
# Debe mostrar información del servidor Redis

> EXIT
```

### Opción B: Usando el script de test

```bash
# Nuestro script de test también verifica la conexión
node test-queues.js help
```

Si ves el mensaje de ayuda sin errores, Redis está accesible.

## 🏃 Paso 3: Iniciar la Aplicación NestJS

Ahora vamos a levantar la aplicación NestJS localmente (no en Docker):

```bash
# Asegurarte de que las dependencias estén instaladas
npm install

# Iniciar en modo desarrollo con hot reload
npm run start:dev
```

**Resultado esperado:**

```
[Nest] Starting Nest application...
[Nest] QueueModule dependencies initialized
[Nest] OrderProcessingProcessor initialized
[Nest] PaymentProcessor initialized
[Nest] InventoryProcessor initialized
[Nest] NotificationProcessor initialized
[Nest] Nest application successfully started
[Nest] Application is running on: http://localhost:3000
```

## 🎯 Paso 4: Acceder al Bull Board Dashboard

Una vez que la aplicación esté corriendo, abre tu navegador y ve a:

```
http://localhost:3000/admin/queues
```

**En el dashboard verás:**

- 📊 Estado de las 4 colas: `order-processing`, `payment-processing`, `inventory-management`, `notification-sending`
- 📈 Número de jobs: waiting, active, completed, failed, delayed
- 🔍 Capacidad de inspeccionar jobs individuales
- ⚡ Botones para reintentar jobs fallidos
- 📋 Detalles de cada job (data, options, stacktrace si falló)

## 🧪 Paso 5: Agregar Jobs de Prueba

Ahora vamos a agregar jobs de prueba usando nuestro script:

### 5.1. Agregar un Job de Orden

```bash
# Abre una nueva terminal (mantén la app corriendo en la otra)
node test-queues.js order
```

**Qué sucede:**

1. Se agrega un job `create-order` a la cola `order-processing`
2. El `OrderProcessingProcessor` lo procesa automáticamente
3. Verás logs en la terminal de la app mostrando el progreso
4. El dashboard muestra el job completado

### 5.2. Agregar un Job de Pago

```bash
node test-queues.js payment
```

### 5.3. Agregar un Job de Inventario

```bash
node test-queues.js inventory
```

### 5.4. Agregar un Job de Notificación

```bash
node test-queues.js notification
```

### 5.5. Agregar Múltiples Jobs a la Vez

```bash
node test-queues.js all
```

Esto agregará un job de cada tipo simultáneamente.

## 📊 Paso 6: Ver Métricas de las Colas

Para ver el estado actual de todas las colas:

```bash
node test-queues.js metrics
```

**Ejemplo de salida:**

```
┌─────────┬─────────────────────────┬─────────┬────────┬───────────┬────────┬─────────┬────────┐
│ (index) │          name           │ waiting │ active │ completed │ failed │ delayed │ paused │
├─────────┼─────────────────────────┼─────────┼────────┼───────────┼────────┼─────────┼────────┤
│    0    │   'Order Processing'    │    0    │   0    │     5     │   0    │    0    │   0    │
│    1    │  'Payment Processing'   │    0    │   0    │     3     │   0    │    0    │   0    │
│    2    │ 'Inventory Management'  │    0    │   0    │     4     │   0    │    0    │   0    │
│    3    │ 'Notification Sending'  │    0    │   0    │     8     │   0    │    0    │   0    │
└─────────┴─────────────────────────┴─────────┴────────┴───────────┴────────┴─────────┴────────┘
```

## 🔄 Paso 7: Probar Retry Logic

Para probar que los reintentos funcionan:

1. **Detén la aplicación** (Ctrl+C en la terminal donde corre `npm run start:dev`)
2. **Agrega jobs mientras la app está detenida:**
   ```bash
   node test-queues.js all
   ```
3. **Ver métricas** - los jobs estarán en estado `waiting`:
   ```bash
   node test-queues.js metrics
   ```
4. **Reinicia la aplicación:**
   ```bash
   npm run start:dev
   ```
5. **Observa** cómo los jobs pendientes se procesan automáticamente

## 🧹 Paso 8: Limpiar Colas

### Limpiar jobs completados

```bash
node test-queues.js clean
```

Esto elimina jobs completados hace más de 1 segundo.

### Vaciar todas las colas

```bash
node test-queues.js empty
```

⚠️ **CUIDADO:** Esto elimina TODOS los jobs (waiting, active, completed, failed) de todas las colas.

## ✅ Paso 9: Ejecutar Tests Automatizados

Finalmente, ejecuta los tests unitarios:

```bash
# Ejecutar tests unitarios
npm run test

# Ejecutar tests con coverage
npm run test:cov

# Ejecutar tests en modo watch (útil durante desarrollo)
npm run test:watch
```

**Tests específicos de colas:**

```bash
# Solo tests de processors
npm test -- processors

# Solo test del OrderProcessingProcessor
npm test -- order-processing.processor.spec
```

## 🎯 Escenarios de Testing Avanzados

### Escenario 1: Simular Carga Alta

Crea un script para agregar muchos jobs:

```bash
# En una terminal, ejecuta esto 10 veces rápidamente
for i in {1..10}; do node test-queues.js all; done
```

Observa en Bull Board cómo las colas manejan la carga.

### Escenario 2: Simular Fallo y Recovery

1. Detén Redis: `docker-compose stop redis`
2. Intenta agregar jobs: `node test-queues.js order`
3. Verás errores de conexión
4. Reinicia Redis: `docker-compose start redis`
5. Los jobs se procesarán cuando la conexión se restablezca

### Escenario 3: Monitorear Rate Limiting

Agrega muchos jobs seguidos y observa en Bull Board cómo el rate limiting controla el throughput:

```bash
# Agregar 20 jobs de notificación
for i in {1..20}; do node test-queues.js notification; sleep 0.1; done
```

La cola `notification-sending` está configurada para procesar máximo 100 jobs/segundo.

## 🐛 Troubleshooting

### Error: "Cannot connect to Redis"

**Solución:**

```bash
# Verificar que Redis está corriendo
docker-compose ps redis

# Si no está corriendo, iniciarlo
docker-compose up -d redis

# Ver logs de Redis
docker-compose logs -f redis
```

### Error: "Port 3000 is already in use"

**Solución:**

```bash
# Cambiar el puerto en .env
PORT=3001

# O matar el proceso que usa el puerto 3000
# En Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Los jobs no se procesan

**Verificar:**

1. ¿La aplicación está corriendo? → `npm run start:dev`
2. ¿Redis está activo? → `docker-compose ps`
3. ¿Hay errores en los logs? → Ver terminal de la app

### Dashboard de Bull Board no carga

**Verificar:**

1. ¿La app está en http://localhost:3000?
2. Ir a http://localhost:3000/admin/queues (no olvidar `/admin/queues`)
3. Ver logs de la app por errores

## 📊 Métricas y KPIs a Observar

Durante el testing, observa:

- ✅ **Throughput**: Jobs procesados por segundo
- ✅ **Latencia**: Tiempo desde que se agrega hasta que se completa
- ✅ **Success Rate**: % de jobs completados exitosamente
- ✅ **Retry Rate**: % de jobs que necesitaron reintentos
- ✅ **Dead Letter Queue**: Jobs que fallaron después de todos los reintentos

## 🎓 Próximos Pasos

Una vez que hayas verificado que todo funciona:

1. ✅ **Tests automatizados**: Agrega más tests unitarios
2. ✅ **Integration tests**: Crea tests e2e del flujo completo
3. ✅ **Load testing**: Usa herramientas como `artillery` o `k6`
4. ✅ **Monitoring**: Integra con Prometheus/Grafana
5. ✅ **Alerting**: Configura alertas para jobs fallidos

## 📚 Recursos Adicionales

- [Documentación de Colas](./QUEUES.md)
- [Ejemplos de Uso](./QUEUE_EXAMPLES.md)
- [Bull Documentation](https://optimalbits.github.io/bull/)
- [Bull Board](https://github.com/felixmosh/bull-board)

---

💡 **Tips:**

- Mantén Bull Board abierto mientras pruebas para ver los cambios en tiempo real
- Usa `LOG_LEVEL=debug` en `.env` para ver logs más detallados
- Los processors están en `src/queues/processors/` si quieres modificar la lógica

¡Happy Testing! 🚀
