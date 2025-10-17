# 📋 Configuración de Infraestructura - Proyecto 3

> **Referencia Rápida de Puertos, Bases de Datos y Credenciales**  
> Este documento contiene toda la información necesaria para conectarte a los servicios del Proyecto 3

---

## 🎯 Principio de Separación

Este proyecto (Proyecto 3) está **completamente separado** del Proyecto 2 para permitir:

- ✅ Ejecución simultánea de ambos proyectos
- ✅ Depuración sin conflictos de puertos
- ✅ Datos aislados (bases de datos diferentes)
- ✅ Fácil identificación de recursos (prefijo `microservices-*`)

---

## 🔌 Tabla de Puertos - Proyecto 2 vs Proyecto 3

| Servicio                | Proyecto 2 | Proyecto 3 | Notas                          |
| ----------------------- | ---------- | ---------- | ------------------------------ |
| **Orders Service**      | `3000`     | `3001`     | Puerto HTTP principal          |
| **Inventory Service**   | N/A        | `8080`     | Servicio nuevo en Go           |
| **PostgreSQL**          | `5432`     | `5433`     | Puerto externo del host        |
| **Redis**               | `6379`     | `6380`     | Puerto externo del host        |
| **RabbitMQ (AMQP)**     | N/A        | `5672`     | Message broker (AMQP protocol) |
| **RabbitMQ Management** | N/A        | `15672`    | Management UI de RabbitMQ      |
| **PgAdmin**             | `8080`     | `5050`     | Herramienta de admin de BD     |
| **Redis Commander**     | `8081`     | `8082`     | Herramienta de admin de Redis  |
| **Debug Port (Orders)** | `9229`     | `9230`     | Para debugger de Node.js       |

---

## 🗄️ Bases de Datos PostgreSQL

### **Servidor PostgreSQL**

```yaml
Host: localhost
Puerto: 5433
Usuario: postgres
Contraseña: microservices_pass_2024
Contenedor: microservices-postgres
Volumen: microservices_postgres_data
```

### **Bases de Datos Creadas**

| Nombre de BD              | Servicio Propietario    | Propósito                               |
| ------------------------- | ----------------------- | --------------------------------------- |
| `microservices_orders`    | Orders Service (NestJS) | Gestión de órdenes, usuarios, productos |
| `microservices_inventory` | Inventory Service (Go)  | Gestión de stock, reservas              |
| `microservices_test`      | Todos                   | Base de datos para tests de integración |

### **String de Conexión PostgreSQL**

#### Orders Service (NestJS):

```bash
DATABASE_URL=postgresql://postgres:microservices_pass_2024@localhost:5433/microservices_orders
```

#### Inventory Service (Go):

```bash
DB_HOST=localhost
DB_PORT=5433
DB_USER=postgres
DB_PASSWORD=microservices_pass_2024
DB_NAME=microservices_inventory
DB_SSLMODE=disable
```

#### Desde fuera de Docker (tu máquina):

```bash
psql -h localhost -p 5433 -U postgres -d microservices_orders
# Contraseña: microservices_pass_2024
```

#### Desde dentro de Docker (entre contenedores):

```bash
psql -h postgres -p 5432 -U postgres -d microservices_orders
```

---

## 🔴 Redis

### **Servidor Redis**

```yaml
Host (externo): localhost
Puerto (externo): 6380
Puerto (interno): 6379
Contraseña: (sin contraseña)
Contenedor: microservices-redis
Volumen: microservices_redis_data
```

### **String de Conexión Redis**

#### Desde tu máquina (localhost):

```bash
redis://localhost:6380
```

#### Desde dentro de Docker:

```bash
redis://redis:6379
```

#### Conectar con redis-cli:

```bash
# Desde tu máquina
redis-cli -p 6380

# Dentro del contenedor
docker exec -it microservices-redis redis-cli
```

---

## 🐰 RabbitMQ Message Broker

### **Servidor RabbitMQ**

```yaml
Host (externo): localhost
Puerto AMQP (externo): 5672
Puerto Management (externo): 15672
Puerto AMQP (interno): 5672
Puerto Management (interno): 15672
Usuario: microservices
Contraseña: microservices_pass_2024
Virtual Host: /
Contenedor: microservices-rabbitmq
Volúmenes:
  - microservices_rabbitmq_data (datos)
  - microservices_rabbitmq_logs (logs)
```

### **Acceso a RabbitMQ**

#### Management UI (Navegador):

```
URL: http://localhost:15672
Usuario: microservices
Contraseña: microservices_pass_2024
```

**Features del Management UI:**

- 📊 Ver exchanges, queues, connections, channels
- 📈 Métricas de mensajes (rates, totals)
- 🔍 Enviar/recibir mensajes de prueba
- ⚙️ Configurar policies y users
- 📝 Ver logs y traces

#### String de Conexión AMQP:

**Desde tu máquina (localhost):**

```bash
amqp://microservices:microservices_pass_2024@localhost:5672/
```

**Desde dentro de Docker:**

```bash
amqp://microservices:microservices_pass_2024@rabbitmq:5672/
```

#### Conectar con rabbitmqadmin CLI:

```bash
# Dentro del contenedor
docker exec -it microservices-rabbitmq rabbitmqadmin --help

# Listar queues
docker exec -it microservices-rabbitmq rabbitmqadmin list queues

# Listar exchanges
docker exec -it microservices-rabbitmq rabbitmqadmin list exchanges
```

### **Arquitectura de Eventos (según ADR-029)**

#### Exchanges Configurados:

```
inventory.events (type: topic)
  └─> Routing keys: inventory.reserved, inventory.confirmed, inventory.released

orders.events (type: topic)
  └─> Routing keys: order.created, order.cancelled, order.completed
```

#### Queues y Bindings:

```
orders.inventory_events
  └─> Consume de: inventory.events
  └─> Dead Letter Queue: orders.inventory_events.dlq

inventory.order_events
  └─> Consume de: orders.events
  └─> Dead Letter Queue: inventory.order_events.dlq
```

#### Eventos del Sistema:

**Inventory → Orders:**

- `inventory.reserved`: Stock reservado para una orden
- `inventory.confirmed`: Stock confirmado (decrementado)
- `inventory.released`: Reserva cancelada/expirada

**Orders → Inventory:**

- `order.created`: Nueva orden creada (requiere reserva)
- `order.cancelled`: Orden cancelada (liberar reserva)
- `order.completed`: Orden completada (confirmar reserva)

---

## 🌐 URLs de Acceso

### **Servicios Principales**

| Servicio                     | URL                                | Descripción                      |
| ---------------------------- | ---------------------------------- | -------------------------------- |
| **Orders Service**           | http://localhost:3001              | API REST principal               |
| **Orders - Swagger**         | http://localhost:3001/api/docs     | Documentación interactiva de API |
| **Orders - Health Check**    | http://localhost:3001/health       | Endpoint de salud                |
| **Orders - Bull Dashboard**  | http://localhost:3001/admin/queues | Dashboard de colas de Bull       |
| **Inventory Service**        | http://localhost:8080              | API REST de inventario           |
| **Inventory - Health Check** | http://localhost:8080/health       | Endpoint de salud                |
| **Inventory - Swagger**      | http://localhost:8080/api/docs     | Docs de API (futuro)             |

### **Herramientas de Administración**

| Herramienta             | URL                    | Credenciales                                             |
| ----------------------- | ---------------------- | -------------------------------------------------------- |
| **PgAdmin**             | http://localhost:5050  | Email: `admin@microservices.local`<br>Pass: `admin`      |
| **Redis Commander**     | http://localhost:8082  | Sin autenticación                                        |
| **RabbitMQ Management** | http://localhost:15672 | User: `microservices`<br>Pass: `microservices_pass_2024` |

---

## 🐳 Nombres de Contenedores Docker

Usa estos nombres para comandos de Docker:

```bash
# Contenedores de Infraestructura
microservices-postgres          # PostgreSQL
microservices-redis             # Redis
microservices-rabbitmq          # RabbitMQ Message Broker

# Contenedores de Servicios
microservices-orders-service    # Orders Service (NestJS)
microservices-inventory-service # Inventory Service (Go)

# Herramientas (solo con --profile tools)
microservices-pgadmin           # PgAdmin
microservices-redis-commander   # Redis Commander
```

### **Comandos Útiles de Docker**

```bash
# Ver logs de un servicio
docker logs -f microservices-orders-service
docker logs -f microservices-inventory-service
docker logs -f microservices-postgres
docker logs -f microservices-rabbitmq

# Entrar a un contenedor
docker exec -it microservices-postgres sh
docker exec -it microservices-redis sh
docker exec -it microservices-rabbitmq sh

# RabbitMQ - Ver estado de queues
docker exec -it microservices-rabbitmq rabbitmqctl list_queues
docker exec -it microservices-rabbitmq rabbitmqctl list_exchanges

# Ver estado de los contenedores
docker ps | grep microservices

# Detener todo
docker-compose down

# Limpiar volúmenes (CUIDADO: Elimina datos)
docker-compose down -v
```

---

## 📦 Volúmenes Docker

Nombres de volúmenes persistentes:

```yaml
microservices_postgres_data   # Datos de PostgreSQL
microservices_redis_data      # Datos de Redis
microservices_rabbitmq_data   # Datos de RabbitMQ (mensajes, definiciones)
microservices_rabbitmq_logs   # Logs de RabbitMQ
microservices_pgadmin_data    # Configuración de PgAdmin
```

### **Comandos de Volúmenes**

```bash
# Ver volúmenes
docker volume ls | grep microservices

# Inspeccionar un volumen
docker volume inspect microservices_postgres_data
docker volume inspect microservices_rabbitmq_data

# Eliminar volúmenes (CUIDADO: Elimina datos)
docker volume rm microservices_postgres_data
docker volume rm microservices_redis_data
docker volume rm microservices_rabbitmq_data
docker volume rm microservices_rabbitmq_logs

# Limpiar volúmenes huérfanos
docker volume prune
```

---

## 🔧 Variables de Entorno por Servicio

### **Orders Service (NestJS)**

```env
NODE_ENV=development
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=microservices_orders
DATABASE_USER=postgres
DATABASE_PASSWORD=microservices_pass_2024
REDIS_HOST=redis
REDIS_PORT=6379
INVENTORY_SERVICE_URL=http://inventory-service:8080
JWT_SECRET=microservices-jwt-secret-key-2024
ENCRYPTION_KEY=microservices-encryption-key-32
LOG_LEVEL=debug
ENABLE_SWAGGER=true
```

### **Inventory Service (Go)**

```env
PORT=8080
GIN_MODE=debug
ENVIRONMENT=development
DB_HOST=postgres
DB_PORT=5432
DB_NAME=microservices_inventory
DB_USER=postgres
DB_PASSWORD=microservices_pass_2024
DB_SSLMODE=disable
REDIS_HOST=redis
REDIS_PORT=6379
LOG_LEVEL=info
LOG_FORMAT=json
```

---

## 🚀 Comandos de Inicio Rápido

### **Levantar solo infraestructura**

```bash
docker-compose up -d postgres redis
```

### **Levantar todo el ecosistema**

```bash
docker-compose up -d
```

### **Levantar con herramientas de admin**

```bash
docker-compose --profile tools up -d
```

### **Ver estado**

```bash
make status
# o
docker-compose ps
```

### **Health check**

```bash
make health-check
```

---

## 🔍 Troubleshooting

### **Problema: Puerto ya en uso**

```bash
# Ver qué está usando el puerto
netstat -ano | findstr :3001
netstat -ano | findstr :5433

# Detener el proceso o cambiar el puerto en docker-compose.yml
```

### **Problema: No puedo conectarme a PostgreSQL**

```bash
# 1. Verificar que el contenedor esté corriendo
docker ps | grep microservices-postgres

# 2. Ver logs del contenedor
docker logs microservices-postgres

# 3. Probar conexión desde el contenedor
docker exec -it microservices-postgres psql -U postgres -d microservices_orders
```

### **Problema: Base de datos no existe**

```bash
# Verificar que el script init-db.sql se ejecutó
docker exec -it microservices-postgres psql -U postgres -c '\l'

# Si no existe, recrear el contenedor
docker-compose down -v
docker-compose up -d postgres
```

### **Problema: Conflicto con Proyecto 2**

```bash
# Ver contenedores de ambos proyectos
docker ps | grep -E "ecommerce|microservices"

# El Proyecto 2 usa prefijo "ecommerce-"
# El Proyecto 3 usa prefijo "microservices-"
# Ambos pueden correr al mismo tiempo
```

---

## 📊 Estructura de Red

### **Red Docker**

```yaml
Nombre: microservices-ecommerce-network
Driver: bridge
```

### **Comunicación Interna**

Los servicios dentro de Docker se comunican usando nombres de contenedor:

- `postgres:5432` (no 5433)
- `redis:6379` (no 6380)
- `inventory-service:8080`

Los puertos `5433`, `6380`, etc. son para acceso desde tu máquina (localhost).

---

## 🔐 Credenciales Consolidadas

### **PostgreSQL**

```
Usuario: postgres
Contraseña: microservices_pass_2024
```

### **PgAdmin**

```
Email: admin@microservices.local
Contraseña: admin
```

### **Redis**

```
Sin contraseña (desarrollo)
```

---

## 📝 Notas Importantes

1. **Prefijo `microservices-`**: Todos los recursos del Proyecto 3 usan este prefijo
2. **Puertos externos diferentes**: Para permitir ejecución simultánea con Proyecto 2
3. **Datos persistentes**: Los volúmenes Docker mantienen los datos entre reinicios
4. **Health checks**: Todos los servicios tienen endpoints `/health`
5. **Logs estructurados**: Inventory Service usa JSON logs para facilitar debugging
6. **RabbitMQ**: Message broker para comunicación asíncrona event-driven (ADR-029)

---

## 🆘 Contacto y Soporte

Si tienes problemas, revisa:

1. Este documento primero
2. `docker-compose.yml` para configuración actual
3. Logs de los contenedores: `docker logs -f <nombre-contenedor>`
4. README.md principal del proyecto
5. RabbitMQ Management UI: http://localhost:15672

---

**Última actualización**: 2025-10-17 (Epic 1.4 - RabbitMQ agregado)  
**Proyecto**: Microservices E-commerce System (Proyecto 3)  
**Repositorio**: microservices-ecommerce-system
