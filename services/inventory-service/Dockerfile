# Etapa 1: Builder
FROM golang:1.21-alpine AS builder

# Instalar dependencias del sistema
RUN apk add --no-cache git make

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY go.mod go.sum ./
RUN go mod download

# Copiar código fuente
COPY . .

# Compilar aplicación
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main cmd/api/main.go

# Etapa 2: Runtime
FROM alpine:latest

# Instalar certificados CA para HTTPS
RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copiar binario desde builder
COPY --from=builder /app/main .

# Copiar archivos de configuración (opcional)
COPY --from=builder /app/.env.example .env.example

# Exponer puerto
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Ejecutar aplicación
CMD ["./main"]
