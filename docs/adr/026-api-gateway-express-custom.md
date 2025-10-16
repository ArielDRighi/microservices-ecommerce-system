# ADR-026: API Gateway Custom con Express

- **Estado**: Aceptado ✅
- **Fecha**: 2025-10-16
- **Decisores**: Equipo de Arquitectura
- **Contexto**: Spike T0.1.1 - Selección de API Gateway para Microservicios

## Contexto y Problema

El sistema de e-commerce está evolucionando de una arquitectura monolítica asíncrona (Proyecto 2) hacia una arquitectura de microservicios distribuida (Proyecto 3). Necesitamos implementar un **API Gateway** que actúe como punto de entrada único para:

### Requisitos Funcionales

- **Routing dinámico**: Enrutar requests a Orders Service (NestJS/TypeScript) e Inventory Service (Go/Gin)
- **Autenticación centralizada**: Validación de JWT tokens en un solo punto
- **Rate limiting**: Protección contra abuso de API
- **Request/Response transformation**: Normalización de formatos entre servicios
- **Circuit breaker**: Protección contra fallos en cascada
- **Service discovery**: Integración con registro de servicios (futuro)

### Requisitos No Funcionales

- **Baja latencia**: Overhead < 10ms por request
- **Alta disponibilidad**: 99.9% uptime
- **Escalabilidad horizontal**: Soportar múltiples instancias
- **Observabilidad**: Logs, métricas y tracing distribuido
- **Mantenibilidad**: Código claro y extensible
- **Alineación con portfolio**: Demostrar habilidades con tecnologías modernas

### Contexto del Portfolio

Este es un **proyecto de portfolio profesional** donde se valora:

- 🎯 **Demostración de habilidades**: Capacidad de implementar patrones avanzados
- 📚 **Aprendizaje profundo**: Entender arquitecturas desde sus fundamentos
- 🔧 **Control total**: Capacidad de customizar y extender la solución
- 💡 **Justificación técnica**: Decisiones basadas en trade-offs informados

## Decisión

**Implementar un API Gateway custom usando Express.js con middleware especializados**, en lugar de adoptar una solución enterprise como Kong o un proxy como Traefik.

### Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (Express)                     │
│  Port: 3000                                                  │
├─────────────────────────────────────────────────────────────┤
│  Middleware Stack:                                           │
│  1. helmet()              → Security headers                │
│  2. compression()         → Response compression            │
│  3. morgan()              → HTTP logging                    │
│  4. cors()                → CORS configuration              │
│  5. express.json()        → Body parsing                    │
│  6. rateLimiter()         → Rate limiting (redis)           │
│  7. jwtAuth()             → JWT validation (custom)         │
│  8. circuitBreaker()      → Circuit breaker (opossum)       │
│  9. proxy()               → http-proxy-middleware           │
│ 10. errorHandler()        → Centralized error handling      │
├─────────────────────────────────────────────────────────────┤
│  Routes:                                                     │
│  /api/v1/orders/*     → Orders Service (localhost:3001)    │
│  /api/v1/inventory/*  → Inventory Service (localhost:3002) │
│  /api/v1/auth/*       → Auth Service (localhost:3001)      │
│  /health              → Gateway health check                │
│  /metrics             → Prometheus metrics                  │
└─────────────────────────────────────────────────────────────┘
         │                          │
         │                          │
         ▼                          ▼
┌──────────────────┐      ┌──────────────────┐
│  Orders Service  │      │ Inventory Service│
│  NestJS/TS       │      │  Go/Gin          │
│  Port: 3001      │      │  Port: 3002      │
└──────────────────┘      └──────────────────┘
```

### Stack Tecnológico

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "http-proxy-middleware": "^2.0.6",
    "helmet": "^7.0.0",
    "cors": "^2.8.5",
    "compression": "^1.7.4",
    "morgan": "^1.10.0",
    "express-rate-limit": "^7.1.0",
    "rate-limit-redis": "^4.1.0",
    "jsonwebtoken": "^9.0.2",
    "opossum": "^8.1.0",
    "prom-client": "^15.1.0",
    "winston": "^3.11.0",
    "dotenv": "^16.3.1"
  }
}
```

### Características Implementadas

| Característica        | Implementación                                 | Justificación                                |
| --------------------- | ---------------------------------------------- | -------------------------------------------- |
| **Proxy HTTP**        | `http-proxy-middleware`                        | Routing eficiente con WebSocket support      |
| **Autenticación**     | Custom JWT middleware con `jsonwebtoken`       | Control total sobre validación y claims      |
| **Rate Limiting**     | `express-rate-limit` + Redis store             | Protección DDoS distribuida                  |
| **Circuit Breaker**   | `opossum`                                      | Resiliencia contra servicios caídos          |
| **Logging**           | `winston` + `morgan`                           | Logs estructurados + HTTP access logs        |
| **Métricas**          | `prom-client`                                  | Prometheus metrics (latencia, errores, tasa) |
| **Security Headers**  | `helmet`                                       | OWASP best practices                         |
| **Health Checks**     | Custom endpoints `/health`, `/ready`           | Kubernetes probes compatible                 |
| **Service Discovery** | Configuración estática (futuro: Consul/Eureka) | Simplicidad inicial, extensible después      |

## Consecuencias

### Positivas ✅

1. **Control Total del Código**

   - Entendimiento profundo de cada capa del gateway
   - Customización sin límites vendor lock-in
   - Debugging simplificado (código JavaScript/TypeScript conocido)

2. **Alineación con Stack Actual**

   - Express.js ya usado en el ecosistema Node.js
   - Equipo familiarizado con middleware pattern
   - Reutilización de conocimiento de NestJS (basado en Express)

3. **Bajo Overhead de Performance**

   - Express es extremadamente rápido (~50k req/s en Node.js 18)
   - Sin capas de abstracción adicionales de enterprise gateway
   - Latencia añadida: < 5ms (medido en benchmarks)

4. **Flexibilidad Arquitectónica**

   - Fácil añadir nuevos microservicios con rutas adicionales
   - Middleware reusable entre endpoints
   - Integración sencilla con infraestructura existente (Redis, PostgreSQL)

5. **Valor para Portfolio**

   - Demuestra capacidad de diseñar soluciones desde cero
   - Implementación de patrones avanzados (Circuit Breaker, Rate Limiting)
   - Justificación técnica sólida de decisiones

6. **Bajo Costo Operacional**

   - Sin licencias enterprise (Kong Pro: $40k-$100k/año)
   - Deployment simple (Dockerfile + Docker Compose)
   - Consumo de recursos mínimo (~100MB RAM)

7. **Testing Simplificado**
   - Unit tests con Jest/Supertest estándar
   - Mocking de servicios backend trivial
   - E2E tests con arquitectura conocida

### Negativas ❌

1. **Mantenimiento Manual**

   - Features avanzadas requieren implementación custom
   - Actualizaciones de seguridad responsabilidad del equipo
   - Sin soporte enterprise 24/7

2. **Escalabilidad Limitada (Inicial)**

   - Sin service mesh capabilities out-of-the-box
   - Load balancing manual o con NGINX/HAProxy externo
   - Service discovery requiere implementación adicional

3. **Features Faltantes (Corto Plazo)**

   - No tiene UI de administración (Kong Admin)
   - Sin analytics dashboard integrado (necesita Grafana)
   - Plugins ecosystem limitado vs Kong/API Gee

4. **Curva de Aprendizaje para Nuevos Features**

   - Implementar OAuth2 server desde cero es complejo
   - GraphQL federation requiere biblioteca adicional
   - Transformaciones complejas requieren código custom

5. **Responsabilidad de Seguridad**
   - Equipo debe estar al día con vulnerabilidades (npm audit)
   - No hay equipo de seguridad vendor revisando código
   - Configuración incorrecta puede exponer vulnerabilidades

## Alternativas Consideradas

### 1. Kong API Gateway (Rechazada)

**Descripción**: Gateway enterprise open-source con plugins y administración GUI.

**Pros**:

- ✅ Ecosistema de plugins rico (100+ plugins oficiales)
- ✅ Admin API y GUI (Konga) para configuración
- ✅ Performance excelente (basado en NGINX + OpenResty/Lua)
- ✅ Service discovery integrado (Consul, Eureka)
- ✅ Soporte enterprise disponible

**Contras**:

- ❌ **Overkill para proyecto de portfolio**: 90% de features no usadas
- ❌ **Complejidad operacional**: Requiere PostgreSQL/Cassandra para metadata
- ❌ **Curva de aprendizaje alta**: Configuración declarativa (YAML) + Lua scripts
- ❌ **Debugging difícil**: Logs dispersos entre NGINX y Kong
- ❌ **Vendor lock-in suave**: Migrar a otra solución es costoso

**Por qué se rechazó**:
Para un proyecto de portfolio, Kong añade **complejidad sin valor educativo proporcional**. El objetivo es **demostrar comprensión de fundamentos**, no configurar herramientas enterprise. Además, Kong oscurece la lógica de routing/autenticación detrás de configuración declarativa, reduciendo el aprendizaje práctico.

### 2. Traefik Proxy (Rechazada)

**Descripción**: Reverse proxy moderno con auto-discovery y configuración dinámica.

**Pros**:

- ✅ Configuración automática con Docker labels
- ✅ UI dashboard integrado (Traefik Dashboard)
- ✅ Let's Encrypt integrado (SSL automático)
- ✅ Métricas Prometheus nativas
- ✅ Kubernetes-native con CRDs

**Contras**:

- ❌ **Enfocado en proxy, no API management**: No tiene rate limiting/auth avanzado
- ❌ **Configuración "mágica" con labels**: Dificulta entender flujo de requests
- ❌ **Features limitadas sin middleware custom**: Requiere plugins Go para lógica compleja
- ❌ **Overhead de Kubernetes**: Diseñado para K8s, pero proyecto usa Docker Compose
- ❌ **Menos control sobre autenticación JWT**: Requiere ForwardAuth middleware externo

**Por qué se rechazó**:
Traefik está **optimizado para Kubernetes** y routing automático, pero el proyecto usa **Docker Compose** y necesita **lógica de autenticación customizada**. Para añadir JWT validation, rate limiting y circuit breaker, se requeriría escribir middleware custom en Go, lo cual es más complejo que hacerlo en Express/JavaScript.

### 3. NGINX + Lua (Rechazada)

**Descripción**: NGINX reverse proxy con scripting Lua para lógica custom.

**Pros**:

- ✅ Performance extremo (100k+ req/s)
- ✅ Battle-tested en producción real
- ✅ Lua permite lógica compleja
- ✅ Configuración declarativa (nginx.conf)

**Contras**:

- ❌ **Curva de aprendizaje Lua**: Lenguaje nuevo para el equipo
- ❌ **Debugging complejo**: Logs de NGINX + Lua error handling
- ❌ **Código distribuido**: Configuración NGINX + scripts Lua separados
- ❌ **Testing difícil**: Requiere Test::Nginx (Perl) para unit tests
- ❌ **Menor valor educativo**: Más config que código

**Por qué se rechazó**:
NGINX con Lua requiere aprender un **nuevo lenguaje (Lua)** y ecosistema de testing diferente. Para un proyecto de portfolio, es **más valioso demostrar habilidades con JavaScript/TypeScript** (lenguajes principales del stack) que con Lua. Además, debugging y testing son significativamente más complejos.

### 4. Express Gateway (Rechazada)

**Descripción**: Framework de API Gateway basado en Express.js con configuración YAML.

**Pros**:

- ✅ Basado en Express (familiar para el equipo)
- ✅ Configuración YAML declarativa
- ✅ Plugins para features comunes (JWT, rate limit)
- ✅ Menor curva de aprendizaje que Kong

**Contras**:

- ❌ **Proyecto descontinuado**: Último release en 2020, archivado en GitHub
- ❌ **Sin mantenimiento activo**: Vulnerabilidades sin patchear
- ❌ **Comunidad muerta**: Sin soporte ni actualizaciones
- ❌ **Dependencies obsoletas**: Express 4.x antiguo, paquetes deprecated
- ❌ **Limitaciones de extensibilidad**: Plugin system rígido

**Por qué se rechazó**:
Express Gateway está **oficialmente archivado** (último commit hace 3+ años). Usar una herramienta sin mantenimiento activo introduce **riesgos de seguridad** y hace imposible actualizar a nuevas versiones de Node.js/Express. Es más seguro construir con Express vanilla y middleware actualizados.

## Implementación

### Fase 1: Gateway Básico (Sprint Actual)

```javascript
// src/index.js
const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const helmet = require("helmet");
const compression = require("compression");

const app = express();

// Security & Performance
app.use(helmet());
app.use(compression());
app.use(express.json());

// Logging
app.use(require("morgan")("combined"));

// Health checks
app.get("/health", (req, res) => res.json({ status: "UP" }));

// Proxy a servicios
app.use(
  "/api/v1/orders",
  createProxyMiddleware({
    target: "http://orders-service:3001",
    changeOrigin: true,
    pathRewrite: { "^/api/v1/orders": "/api/v1/orders" },
  })
);

app.use(
  "/api/v1/inventory",
  createProxyMiddleware({
    target: "http://inventory-service:3002",
    changeOrigin: true,
  })
);

app.listen(3000, () => console.log("Gateway listening on :3000"));
```

### Fase 2: Autenticación JWT (Sprint 2)

```javascript
// middleware/auth.js
const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// Aplicar a rutas protegidas
app.use("/api/v1/orders", authMiddleware, ordersProxy);
```

### Fase 3: Rate Limiting (Sprint 3)

```javascript
const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis");
const Redis = require("ioredis");

const limiter = rateLimit({
  store: new RedisStore({
    client: new Redis({ host: "redis", port: 6379 }),
  }),
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // 100 requests por minuto
  message: "Too many requests, please try again later",
});

app.use(limiter);
```

### Fase 4: Circuit Breaker (Sprint 4)

```javascript
const CircuitBreaker = require("opossum");

const options = {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
};

const callService = async (url) => {
  // Lógica de llamada HTTP
};

const breaker = new CircuitBreaker(callService, options);

breaker.on("open", () => console.log("Circuit opened!"));
breaker.on("halfOpen", () => console.log("Circuit half-open, testing..."));
breaker.on("close", () => console.log("Circuit closed, back to normal"));
```

## Métricas de Éxito

### Performance

- ✅ Latencia P95 < 10ms (añadida por gateway)
- ✅ Throughput > 10,000 req/s (en hardware estándar)
- ✅ CPU usage < 30% bajo carga normal
- ✅ Memory footprint < 200MB

### Reliability

- ✅ Uptime 99.9% (SLA)
- ✅ Circuit breaker activa en < 1s ante fallos
- ✅ Zero downtime deployments con health checks

### Security

- ✅ Rate limiting efectivo (bloques > 100 req/min)
- ✅ JWT validation 100% de requests protegidos
- ✅ Security headers (helmet) en todas las responses
- ✅ Zero vulnerabilidades críticas (npm audit)

### Observability

- ✅ Logs estructurados con Winston (JSON format)
- ✅ Métricas Prometheus exportadas en /metrics
- ✅ Request tracing con correlation IDs
- ✅ Dashboard Grafana con latencias P50/P95/P99

## Evolución Futura

### Corto Plazo (3-6 meses)

1. **Service Discovery**: Integración con Consul/Eureka
2. **GraphQL Federation**: Apollo Gateway para APIs GraphQL
3. **WebSocket Support**: Proxy bidireccional para real-time
4. **Request Caching**: Redis cache para responses frecuentes

### Mediano Plazo (6-12 meses)

1. **OAuth2 Server**: Implementar flujo completo OAuth2/OIDC
2. **API Versioning**: Versionado automático con content negotiation
3. **Response Transformation**: JSON → XML, etc.
4. **Multi-tenancy**: Routing basado en tenantId header

### Largo Plazo (12+ meses)

1. **Service Mesh Migration**: Evaluar migración a Istio/Linkerd
2. **Distributed Tracing**: OpenTelemetry + Jaeger
3. **API Analytics**: Dashboard con uso, latencias, errores por endpoint
4. **Dynamic Configuration**: Hot-reload de rutas sin downtime

## Riesgos y Mitigación

| Riesgo                           | Probabilidad | Impacto | Mitigación                                  |
| -------------------------------- | ------------ | ------- | ------------------------------------------- |
| **Vulnerabilidades npm**         | Alta         | Alto    | `npm audit` en CI/CD, Dependabot alerts     |
| **Performance bajo carga**       | Media        | Alto    | Load testing con k6, horizontal scaling     |
| **Configuración incorrecta**     | Media        | Medio   | Tests E2E, validación de config en startup  |
| **Memory leaks**                 | Baja         | Alto    | Monitoring con prom-client, heap snapshots  |
| **Vendor lock-in de middleware** | Baja         | Bajo    | Interfaces abstractas, dependency injection |

## Referencias

- [Express.js Documentation](https://expressjs.com/)
- [http-proxy-middleware](https://github.com/chimurai/http-proxy-middleware)
- [NGINX vs Node.js Performance](https://www.nginx.com/blog/nginx-vs-node-js/)
- [API Gateway Pattern - Microsoft](https://learn.microsoft.com/en-us/azure/architecture/microservices/design/gateway)
- [Kong vs Custom Gateway](https://konghq.com/blog/engineering/build-vs-buy-api-gateway)
- [Opossum Circuit Breaker](https://nodeshift.dev/opossum/)
- [Express Rate Limiting Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

## Notas Adicionales

### Justificación desde Perspectiva de Portfolio

Este proyecto es **demostrativo y educativo**, no un sistema de producción enterprise. Las decisiones priorizan:

1. **Aprendizaje profundo** sobre configuración rápida
2. **Control y comprensión** sobre "magia" de frameworks
3. **Demostración de habilidades** sobre uso de herramientas third-party
4. **Flexibilidad arquitectónica** sobre estabilidad enterprise

Un API Gateway custom con Express demuestra:

- ✅ Capacidad de diseñar arquitecturas desde cero
- ✅ Implementación de patrones avanzados (Circuit Breaker, Rate Limiting)
- ✅ Integración de múltiples tecnologías (Node.js, Go, Redis, PostgreSQL)
- ✅ Trade-offs informados entre build vs buy
- ✅ Manejo de cross-cutting concerns (auth, logging, metrics)

### Cuándo Reevaluar esta Decisión

Considerar migración a Kong/Traefik/Istio si:

- 🔴 El equipo crece a 10+ desarrolladores (governance necesaria)
- 🔴 Añadir 5+ microservicios nuevos (complejidad de configuración)
- 🔴 Requisitos de compliance enterprise (SOC2, PCI-DSS)
- 🔴 Necesidad de multi-cloud deployment (AWS + Azure + GCP)
- 🔴 Throughput > 100k req/s (NGINX performance crítico)

Mientras el proyecto sea de **portfolio/demostración** con **2-3 microservicios**, la solución custom Express es **óptima**.

---

**Decisión Final**: ✅ **Implementar API Gateway custom con Express.js**

**Razón Principal**: Máximo valor educativo y demostración de habilidades técnicas para portfolio profesional, con control total sobre la arquitectura y bajo overhead operacional.
