# ======================
# Build stage
# ======================
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install all dependencies (needed for build)
RUN npm ci --silent && \
    npm cache clean --force

# Copy source code
COPY . .

# Build application
RUN npm run build

# ======================
# Production Dependencies Stage
# ======================
FROM node:20-alpine AS deps

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies, ignoring scripts to avoid Husky
RUN npm ci --only=production --silent --ignore-scripts && \
    npm cache clean --force

# ======================
# Production stage
# ======================
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Set working directory
WORKDIR /app

# Copy production dependencies from deps stage
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Copy package files (needed for runtime)
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

# Create logs directory
RUN mkdir -p logs && chown nestjs:nodejs logs

# Switch to non-root user
USER nestjs

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/main.js"]