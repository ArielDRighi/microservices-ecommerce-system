# ADR-023: Docker Multi-Stage Builds

**Status:** Accepted  
**Date:** 2024-01-17  
**Author:** Development Team

---

## Context

Need **optimized Docker images** for production: small size, fast builds, security.

---

## Decision

Use **multi-stage Dockerfile** with separate build and production stages:

```dockerfile
# Dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app

# Copy only production dependencies
COPY --from=deps /app/node_modules ./node_modules
# Copy built app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

ENV NODE_ENV=production
USER node

CMD ["node", "dist/main.js"]
```

---

## Image Sizes

**Before (single-stage):** 1.2 GB  
**After (multi-stage):** 180 MB  
**Reduction:** 85% smaller! 🚀

---

## Benefits

✅ **Small Images:** Only production deps + compiled code  
✅ **Fast Builds:** Cached layers, parallel stages  
✅ **Secure:** No build tools in production image  
✅ **Alpine Base:** Minimal attack surface

---

**Status:** ✅ **IMPLEMENTED**  
**Files:** `Dockerfile`, `Dockerfile.dev`
