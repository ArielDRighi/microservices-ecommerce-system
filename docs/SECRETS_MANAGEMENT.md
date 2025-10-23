# Secrets Management Guide

## Overview

This document outlines the secrets management strategy for the microservices-ecommerce-system. It covers best practices, rotation procedures, and security guidelines for handling sensitive credentials.

## Table of Contents

1. [Security Principles](#security-principles)
2. [Environment Variables](#environment-variables)
3. [Docker Secrets](#docker-secrets)
4. [Secret Rotation](#secret-rotation)
5. [Production Deployment](#production-deployment)
6. [Emergency Procedures](#emergency-procedures)

---

## Security Principles

### Golden Rules

1. ❌ **NEVER** commit credentials to version control
2. ❌ **NEVER** hardcode secrets in source code
3. ✅ **ALWAYS** use environment variables or Docker secrets
4. ✅ **ALWAYS** rotate credentials regularly
5. ✅ **ALWAYS** use strong, randomly generated passwords
6. ✅ **ALWAYS** follow principle of least privilege

### Verification

Before committing any code:

```bash
# Check for potential secrets in code
git diff --cached | grep -iE '(password|secret|api[_-]?key|token|jwt[_-]?secret)'

# Scan for hardcoded credentials
grep -rn --exclude-dir={node_modules,vendor,.git} -iE '(password|secret|api[_-]?key)\s*=\s*["\']' .
```

---

## Environment Variables

### Local Development

**File:** `.env` (NEVER commit this file)

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=inventory_user
DB_PASSWORD=<GENERATE_STRONG_PASSWORD>
DB_NAME=inventory_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=<GENERATE_STRONG_PASSWORD>

# Service Authentication
SERVICE_API_KEYS=<GENERATE_RANDOM_KEY_1>,<GENERATE_RANDOM_KEY_2>

# JWT Authentication
JWT_SECRET=<GENERATE_STRONG_SECRET>
JWT_EXPIRATION=24h

# RabbitMQ
RABBITMQ_URL=amqp://user:<PASSWORD>@localhost:5672/

# External APIs
PAYMENT_API_KEY=<EXTERNAL_SERVICE_KEY>
SHIPPING_API_KEY=<EXTERNAL_SERVICE_KEY>
```

### Template File

**File:** `.env.example` (committed to repository)

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=inventory_user
DB_PASSWORD=CHANGEME_STRONG_PASSWORD_HERE
DB_NAME=inventory_db

# Service Authentication (comma-separated keys)
SERVICE_API_KEYS=inventory-service-key-dev-12345,orders-service-key-dev-67890

# Note: Generate strong random keys for production
# Example: openssl rand -base64 32
```

### Generating Strong Secrets

```bash
# Generate a 32-byte random key (base64 encoded)
openssl rand -base64 32

# Generate a 64-byte random key
openssl rand -base64 64

# Generate UUID-based key
uuidgen

# Generate alphanumeric key (32 chars)
head -c 32 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 32
```

---

## Docker Secrets

### Docker Swarm Secrets (Production)

Docker secrets provide secure secret management for containerized applications.

#### Creating Secrets

```bash
# Create database password secret
echo "your-strong-db-password" | docker secret create db_password -

# Create from file
docker secret create jwt_secret ./secrets/jwt_secret.txt

# List secrets
docker secret ls

# Inspect secret metadata (not content)
docker secret inspect db_password
```

#### Using Secrets in Docker Compose

**File:** `docker-compose.prod.yml`

```yaml
version: '3.8'

services:
  inventory-service:
    image: inventory-service:latest
    secrets:
      - db_password
      - jwt_secret
      - service_api_keys
    environment:
      DB_HOST: postgres
      DB_USER: inventory_user
      DB_PASSWORD_FILE: /run/secrets/db_password
      JWT_SECRET_FILE: /run/secrets/jwt_secret
      SERVICE_API_KEYS_FILE: /run/secrets/service_api_keys
    deploy:
      replicas: 3

secrets:
  db_password:
    external: true
  jwt_secret:
    external: true
  service_api_keys:
    external: true
```

#### Reading Secrets in Go Application

```go
package main

import (
    "os"
    "strings"
)

// LoadSecretFromFile reads secret from Docker secret file or falls back to env var
func LoadSecretFromFile(envVar string) string {
    fileEnvVar := envVar + "_FILE"
    secretFile := os.Getenv(fileEnvVar)
    
    if secretFile != "" {
        content, err := os.ReadFile(secretFile)
        if err == nil {
            return strings.TrimSpace(string(content))
        }
        log.Printf("Warning: Failed to read secret file %s: %v", secretFile, err)
    }
    
    // Fallback to environment variable
    return os.Getenv(envVar)
}

// Example usage
func main() {
    dbPassword := LoadSecretFromFile("DB_PASSWORD")
    jwtSecret := LoadSecretFromFile("JWT_SECRET")
    apiKeys := LoadSecretFromFile("SERVICE_API_KEYS")
}
```

### Docker Compose Secrets (Development)

For local development with Docker Compose (non-swarm mode):

```yaml
version: '3.8'

services:
  inventory-service:
    build: ./services/inventory-service
    secrets:
      - db_password
    environment:
      DB_PASSWORD_FILE: /run/secrets/db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt  # Local file (not committed)
```

---

## Secret Rotation

### Rotation Schedule

| Secret Type | Rotation Frequency | Criticality |
|-------------|-------------------|-------------|
| Database passwords | Every 90 days | High |
| API keys (service-to-service) | Every 180 days | High |
| JWT signing secrets | Every 365 days | Critical |
| External API keys | As required by provider | Medium |
| Redis passwords | Every 90 days | Medium |
| RabbitMQ credentials | Every 90 days | Medium |

### Database Password Rotation Procedure

#### Step 1: Create New Password

```bash
# Generate new strong password
NEW_DB_PASSWORD=$(openssl rand -base64 32)
echo "Generated new password: $NEW_DB_PASSWORD"
```

#### Step 2: Create New Database User (Zero-Downtime)

```sql
-- Connect to PostgreSQL as superuser
psql -U postgres -d inventory_db

-- Create new user with same privileges
CREATE USER inventory_user_v2 WITH PASSWORD 'NEW_PASSWORD_HERE';

-- Grant same permissions as old user
GRANT ALL PRIVILEGES ON DATABASE inventory_db TO inventory_user_v2;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO inventory_user_v2;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO inventory_user_v2;
```

#### Step 3: Update Application Configuration

```bash
# Update Docker secret (swarm mode)
echo "NEW_PASSWORD_HERE" | docker secret create db_password_v2 -

# Update service to use new secret
docker service update \
  --secret-rm db_password \
  --secret-add source=db_password_v2,target=db_password \
  inventory-service

# Verify service is healthy
docker service ps inventory-service
```

#### Step 4: Remove Old Credentials (After Verification)

```sql
-- Wait 24 hours and verify no connections from old user
SELECT * FROM pg_stat_activity WHERE usename = 'inventory_user';

-- If no active connections, drop old user
DROP USER inventory_user;

-- Rename new user to standard name
ALTER USER inventory_user_v2 RENAME TO inventory_user;
```

#### Step 5: Update Docker Secret Name

```bash
# Remove old secret
docker secret rm db_password

# Rename new secret
docker service update \
  --secret-rm db_password_v2 \
  --secret-add source=db_password_v2,target=db_password \
  inventory-service
```

### Service API Key Rotation

API keys support **multiple simultaneous keys** for zero-downtime rotation.

#### Step 1: Generate New Key

```bash
# Generate new API key
NEW_API_KEY="inventory-service-key-$(date +%Y%m)-$(openssl rand -hex 16)"
echo "New API key: $NEW_API_KEY"
```

#### Step 2: Add New Key (Keep Old Key Active)

```bash
# Current keys: key1,key2
# Add new key: key1,key2,key3
docker service update \
  --env-add SERVICE_API_KEYS="old_key_1,old_key_2,$NEW_API_KEY" \
  inventory-service
```

#### Step 3: Update Client Services

Update all client services (orders-service, etc.) to use the new key.

```bash
docker service update \
  --env-add INVENTORY_API_KEY="$NEW_API_KEY" \
  orders-service
```

#### Step 4: Monitor and Verify

```bash
# Check logs for any authentication failures
docker service logs inventory-service | grep "Unauthorized"

# Wait 7 days to ensure all clients migrated
```

#### Step 5: Remove Old Key

```bash
# Remove old keys, keep only new key
docker service update \
  --env-add SERVICE_API_KEYS="$NEW_API_KEY" \
  inventory-service
```

### JWT Secret Rotation

JWT secret rotation requires careful coordination to avoid breaking active sessions.

#### Step 1: Implement Multi-Secret Support

```go
// Support multiple JWT secrets for rotation
type JWTConfig struct {
    CurrentSecret  string   // Used for signing new tokens
    ValidSecrets   []string // Used for validating tokens
}

func (j *JWTConfig) ValidateToken(tokenString string) (*jwt.Token, error) {
    var lastErr error
    
    // Try each valid secret
    for _, secret := range j.ValidSecrets {
        token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
            return []byte(secret), nil
        })
        
        if err == nil {
            return token, nil
        }
        lastErr = err
    }
    
    return nil, lastErr
}
```

#### Step 2: Add New Secret

```bash
# Generate new JWT secret
NEW_JWT_SECRET=$(openssl rand -base64 64)

# Add new secret (keep old for validation)
docker service update \
  --env-add JWT_SECRET="$NEW_JWT_SECRET" \
  --env-add JWT_VALID_SECRETS="$OLD_JWT_SECRET,$NEW_JWT_SECRET" \
  inventory-service
```

#### Step 3: Grace Period

Wait for token expiration period (e.g., 24 hours if JWT_EXPIRATION=24h).

#### Step 4: Remove Old Secret

```bash
# After grace period, remove old secret
docker service update \
  --env-add JWT_VALID_SECRETS="$NEW_JWT_SECRET" \
  inventory-service
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] All `.env` files are in `.gitignore`
- [ ] No hardcoded credentials in source code
- [ ] All secrets use Docker secrets or secure vault
- [ ] Strong passwords generated (min 32 chars, random)
- [ ] Secret rotation schedule documented
- [ ] Backup and disaster recovery plan in place
- [ ] Monitoring and alerting configured
- [ ] Principle of least privilege applied

### Infrastructure as Code (Terraform Example)

```hcl
# Store secrets in AWS Secrets Manager
resource "aws_secretsmanager_secret" "db_password" {
  name = "inventory-service/db-password"
  description = "Database password for inventory service"
  
  rotation_rules {
    automatically_after_days = 90
  }
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
}

resource "random_password" "db_password" {
  length  = 32
  special = true
}
```

### Kubernetes Secrets (Alternative)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: inventory-service-secrets
type: Opaque
stringData:
  db-password: <BASE64_ENCODED_PASSWORD>
  jwt-secret: <BASE64_ENCODED_SECRET>
  api-keys: <BASE64_ENCODED_KEYS>
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: inventory-service
spec:
  template:
    spec:
      containers:
      - name: inventory-service
        env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: inventory-service-secrets
              key: db-password
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: inventory-service-secrets
              key: jwt-secret
```

---

## Emergency Procedures

### Suspected Secret Compromise

#### Immediate Actions (First Hour)

1. **Revoke Compromised Secret**
   ```bash
   # Rotate immediately
   docker secret rm compromised_secret
   docker secret create new_secret -
   docker service update --secret-add new_secret service_name
   ```

2. **Check Access Logs**
   ```bash
   # Review authentication attempts
   docker service logs inventory-service | grep -i "auth\|fail\|unauthorized"
   
   # Check database connections
   psql -c "SELECT * FROM pg_stat_activity WHERE datname='inventory_db';"
   ```

3. **Enable Monitoring Alerts**
   ```bash
   # Increase logging verbosity
   docker service update --env-add LOG_LEVEL=debug inventory-service
   ```

#### Short-Term Actions (24 Hours)

1. Rotate all related secrets
2. Review access patterns for anomalies
3. Update incident response documentation
4. Notify security team and stakeholders

#### Long-Term Actions

1. Conduct security audit
2. Review and improve secret management practices
3. Implement additional security controls (2FA, IP whitelisting)
4. Schedule security training

### Secret Accidentally Committed to Git

#### If Not Yet Pushed

```bash
# Remove file from staging
git reset HEAD .env

# Or amend commit
git commit --amend
```

#### If Already Pushed (PUBLIC REPOSITORY)

**⚠️ CRITICAL: Assume the secret is compromised!**

1. **Rotate the secret immediately**
2. **Remove from Git history**
   ```bash
   # Use BFG Repo-Cleaner
   bfg --delete-files .env
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   git push --force
   ```

3. **Report incident** to security team
4. **Monitor** for unauthorized access

---

## Additional Resources

### Tools

- **git-secrets**: Prevents committing secrets to Git
  ```bash
  git secrets --install
  git secrets --register-aws
  ```

- **detect-secrets**: Scans codebase for secrets
  ```bash
  pip install detect-secrets
  detect-secrets scan > .secrets.baseline
  ```

- **Vault by HashiCorp**: Enterprise secret management
- **AWS Secrets Manager**: Managed secret storage and rotation
- **Azure Key Vault**: Cloud-based secret management

### Best Practices References

- [OWASP Secret Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_CheatSheet.html)
- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/)

---

## Audit Log

| Date | Event | Performed By | Notes |
|------|-------|--------------|-------|
| 2024-01-15 | Document created | DevOps Team | Initial version |
| YYYY-MM-DD | Password rotation | | |
| YYYY-MM-DD | Secret compromise | | |

---

**Last Updated:** 2024-01-15  
**Owner:** DevOps Team  
**Review Cycle:** Quarterly
