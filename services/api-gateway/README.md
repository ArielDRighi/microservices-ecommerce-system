# API Gateway

Custom API Gateway for Microservices E-commerce System built with Express.js and TypeScript.

## Overview

The API Gateway serves as the single entry point for all client requests, providing:

- **Unified API**: Single endpoint for multiple microservices
- **Authentication**: Centralized JWT validation
- **Rate Limiting**: Protection against abuse with Redis-backed storage
- **Circuit Breaking**: Resilience against downstream service failures
- **Logging**: Structured logging with Winston
- **Metrics**: Prometheus metrics for observability
- **Security**: Helmet.js for security headers, CORS configuration

## Architecture Decision

See [ADR-026](../../docs/adr/026-api-gateway-express-custom.md) for the architectural decision rationale.

## Technology Stack

- **Framework**: Express.js 4.18
- **Language**: TypeScript 5.3
- **Proxy**: http-proxy-middleware 2.0
- **Authentication**: jsonwebtoken 9.0
- **Rate Limiting**: express-rate-limit 7.1 + Redis
- **Circuit Breaker**: opossum 8.1
- **Logging**: Winston 3.11
- **Metrics**: prom-client 15.1
- **Security**: Helmet 7.1

## Setup

### Install Dependencies

```bash
npm install
```

### Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key environment variables:

- `PORT`: Gateway port (default: 3000)
- `ORDERS_SERVICE_URL`: Orders Service URL
- `INVENTORY_SERVICE_URL`: Inventory Service URL
- `JWT_SECRET`: Secret for JWT validation
- `REDIS_HOST`: Redis host for rate limiting
- `REDIS_PORT`: Redis port (default: 6380)

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

## API Routes

### Health Checks

- `GET /health` - Health check endpoint
- `GET /ready` - Readiness check (K8s compatible)

### Service Routing

- `/api/orders/*` → Orders Service (port 3001)
- `/api/inventory/*` → Inventory Service (port 8080)

## Features

### 1. Security

- **Helmet.js**: Security headers (XSS, CSP, etc.)
- **CORS**: Configurable origin whitelist
- **JWT Validation**: Centralized authentication

### 2. Resilience

- **Circuit Breaker**: Prevent cascading failures (Opossum)
- **Rate Limiting**: Redis-backed distributed rate limiting
- **Graceful Shutdown**: Clean shutdown on SIGTERM/SIGINT

### 3. Observability

- **Structured Logging**: Winston with JSON format
- **HTTP Logging**: Morgan for access logs with correlation IDs
- **Correlation IDs**: Request tracing across services (X-Correlation-ID)
- **Response Time Tracking**: Automated latency metrics
- **Metrics**: Prometheus metrics endpoint
- **Health Checks**: Liveness and readiness probes

## Middleware Stack

The gateway processes requests through the following middleware chain (in order):

1. **Helmet** → Security headers (XSS, CSP, HSTS)
2. **CORS** → Cross-origin resource sharing policies
3. **Compression** → Gzip response compression
4. **Body Parsing** → JSON/URL-encoded request parsing
5. **Request Logging** → Correlation ID generation & response time tracking
6. **Morgan** → HTTP access logs
7. **Rate Limiter** → Redis-backed rate limiting (100 req/min per IP)
8. **Auth Middleware** → JWT validation
9. **Circuit Breaker Proxy** → Opossum-protected service routing

**Request Flow:**
```
Client Request
    ↓
[Security: Helmet + CORS]
    ↓
[Compression + Body Parsing]
    ↓
[Logging: Correlation ID + Morgan]
    ↓
[Rate Limiting: Redis Check]
    ↓
[Authentication: JWT Validation]
    ↓
[Circuit Breaker: Health Check]
    ↓
Upstream Service (Orders/Inventory)
    ↓
[Response Logging: Time Tracking]
    ↓
Client Response
```

## Advanced Features

### Rate Limiting Strategy

- **Algorithm**: Token bucket with Redis
- **Limit**: 100 requests per minute per IP
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Fail-Open**: Allows requests if Redis is unavailable
- **IP Detection**: X-Forwarded-For → X-Real-IP → req.ip

### Circuit Breaker Configuration

- **Library**: Opossum 8.1
- **Timeout**: 5000ms
- **Error Threshold**: 50% (opens after 50% failure rate)
- **Reset Timeout**: 30 seconds (half-open retry)
- **States**: Closed (healthy) → Open (failing) → Half-Open (testing)

### Correlation ID System

- **Generation**: crypto.randomUUID() for new requests
- **Header**: `X-Correlation-ID`
- **Propagation**: Preserved from upstream requests, forwarded to downstream services
- **Use Cases**: Distributed tracing, log aggregation, debugging multi-service flows

## Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Linting & Formatting

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Docker

### Build Production Image

```bash
docker build -t api-gateway:latest .
```

### Run Container

```bash
docker run -p 3000:3000 --env-file .env api-gateway:latest
```

### Development with Docker Compose

```bash
docker-compose up api-gateway
```

## Project Structure

```
src/
├── index.ts           # Application entry point
├── config.ts          # Configuration management
├── logger.ts          # Winston logger setup
├── middleware/        # Custom middleware
│   ├── auth.ts        # JWT authentication
│   ├── rateLimit.ts   # Rate limiting
│   └── circuitBreaker.ts  # Circuit breaker
└── routes/            # Route definitions
    ├── proxy.ts       # Proxy routes configuration
    └── health.ts      # Health check routes
```

## Performance

- **Latency**: < 5ms overhead per request
- **Throughput**: > 10,000 req/s (Node.js 18)
- **Memory**: ~100MB baseline

## Monitoring

### Prometheus Metrics

Available at `/metrics` endpoint:

- `http_requests_total`: Total HTTP requests
- `http_request_duration_seconds`: Request latency histogram
- `circuit_breaker_state`: Circuit breaker state (0=closed, 1=open, 2=half-open)
- `rate_limit_hits_total`: Rate limit hits

### Grafana Dashboard

Import the dashboard from `monitoring/grafana/dashboards/api-gateway.json`

## Troubleshooting

### Gateway not starting

1. Check if port 3000 is available
2. Verify environment variables in `.env`
3. Check logs: `docker logs api-gateway`

### 503 Service Unavailable

- Downstream service (Orders/Inventory) is down
- Circuit breaker is open (check logs)
- Network connectivity issues

### 429 Too Many Requests

- Rate limit exceeded (100 req/min by default)
- Check Redis connection
- Adjust `RATE_LIMIT_MAX_REQUESTS` if needed

## License

MIT
