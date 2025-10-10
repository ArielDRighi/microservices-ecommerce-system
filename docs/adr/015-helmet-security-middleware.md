# ADR-015: Helmet Security Middleware

**Status:** Accepted  
**Date:** 2024-01-17  
**Author:** Development Team  
**Related ADRs:** ADR-005 (NestJS Framework)

---

## Context

Web applications are vulnerable to common attacks like **XSS, Clickjacking, MIME sniffing, and protocol downgrade** attacks. HTTP security headers provide **defense-in-depth** by instructing browsers how to handle content securely.

### Problem

**Without Security Headers:**
```http
HTTP/1.1 200 OK
Content-Type: text/html

<html>...</html>
```

**Risks:**
- ❌ **XSS Attacks:** Malicious scripts can execute
- ❌ **Clickjacking:** Site can be embedded in iframe
- ❌ **MIME Sniffing:** Browser executes unexpected content types
- ❌ **Protocol Downgrade:** HTTPS → HTTP downgrade possible

---

## Decision

Use **Helmet.js middleware** to automatically set secure HTTP headers:

```typescript
/**
 * main.ts
 * Location: src/main.ts
 */
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Apply Helmet middleware
  if (configService.get<boolean>('app.security.helmet.enabled', true)) {
    app.use(
      helmet({
        crossOriginEmbedderPolicy: false,  // Allow embedding assets
        contentSecurityPolicy: environment === 'production' 
          ? undefined   // Enable CSP in production
          : false,      // Disable CSP in dev (Swagger needs it)
      }),
    );
  }

  await app.listen(3000);
}
```

**Configuration:**
```typescript
// src/config/app.config.ts
export const appConfig = registerAs('app', () => ({
  security: {
    helmet: {
      enabled: process.env['HELMET_ENABLED'] !== 'false', // Enabled by default
    },
  },
}));
```

---

## Security Headers Applied

### 1. X-Content-Type-Options: nosniff
```http
X-Content-Type-Options: nosniff
```
**Prevents:** MIME type sniffing (browser respects Content-Type header)  
**Example Attack:** Server sends `image.jpg` (actually contains JS), browser executes it  
**Helmet Fix:** Browser won't execute, throws error instead

### 2. X-Frame-Options: SAMEORIGIN
```http
X-Frame-Options: SAMEORIGIN
```
**Prevents:** Clickjacking attacks (site embedded in malicious iframe)  
**Example Attack:** Attacker embeds bank site in iframe, overlays fake UI  
**Helmet Fix:** Only allows embedding from same origin

### 3. Strict-Transport-Security (HSTS)
```http
Strict-Transport-Security: max-age=15552000; includeSubDomains
```
**Prevents:** Protocol downgrade attacks (HTTPS → HTTP)  
**Example Attack:** Man-in-the-middle downgrades connection to HTTP  
**Helmet Fix:** Browser enforces HTTPS for 180 days

### 4. X-Download-Options: noopen
```http
X-Download-Options: noopen
```
**Prevents:** IE8+ auto-opening downloads in browser context  
**Example Attack:** Download HTML file, IE executes scripts in site context  
**Helmet Fix:** Forces "Save As" instead of "Open"

### 5. X-Permitted-Cross-Domain-Policies: none
```http
X-Permitted-Cross-Domain-Policies: none
```
**Prevents:** Flash/PDF cross-domain data loading  
**Helmet Fix:** Disallows cross-domain policies

### 6. Referrer-Policy: no-referrer
```http
Referrer-Policy: no-referrer
```
**Prevents:** Sensitive data leakage via Referer header  
**Example:** User visits `https://site.com/orders/12345?token=secret`  
Then clicks external link → Referer exposes token!  
**Helmet Fix:** No Referer sent to external sites

### 7. Content-Security-Policy (CSP) - Production Only
```http
Content-Security-Policy: default-src 'self'
```
**Prevents:** XSS attacks (restricts resource loading)  
**Example:** Attacker injects `<script src="evil.com/steal.js"></script>`  
**Helmet Fix:** Browser blocks script from untrusted domain

**Why Disabled in Dev:** Swagger UI needs inline scripts, CSP blocks them

---

## Implementation

**Configuration:**
```typescript
// .env
HELMET_ENABLED=true  // Production: true, Dev: false (optional)

// docker-compose.yml (dev)
HELMET_ENABLED=false  // Disable for local dev (Swagger compatibility)
```

**Conditional Enabling:**
```typescript
// Helmet enabled by default, can be disabled via env var
if (configService.get<boolean>('app.security.helmet.enabled', true)) {
  app.use(helmet({ /* ... */ }));
}
```

---

## Benefits

✅ **Zero Config:** Works out-of-box with sensible defaults  
✅ **Multiple Headers:** Sets 11+ security headers automatically  
✅ **Browser Support:** Works on all modern browsers  
✅ **Performance:** Negligible overhead (<0.1ms per request)  
✅ **Compliance:** Helps meet security standards (OWASP, PCI-DSS)  

---

## Trade-offs

**1. CSP Breaks Swagger in Dev**
```
Problem: Swagger UI uses inline scripts, CSP blocks them
Solution: Disable CSP in development, enable in production
```

**2. X-Frame-Options Breaks Embedding**
```
Problem: Can't embed site in iframe (even legitimate use cases)
Solution: Use frame-ancestors CSP directive for fine-grained control
```

---

## Testing

```bash
# Check headers
curl -I http://localhost:3000/api/v1/health

HTTP/1.1 200 OK
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Strict-Transport-Security: max-age=15552000; includeSubDomains
X-Download-Options: noopen
X-Permitted-Cross-Domain-Policies: none
Referrer-Policy: no-referrer
```

**Automated Test:**
```typescript
it('should include security headers', async () => {
  const response = await request(app.getHttpServer())
    .get('/api/v1/health')
    .expect(200);

  expect(response.headers['x-content-type-options']).toBe('nosniff');
  expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
  expect(response.headers['strict-transport-security']).toContain('max-age');
});
```

---

## References

- [Helmet.js Documentation](https://helmetjs.github.io/)
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN HTTP Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)

---

## Code Locations

```
src/main.ts                 - Helmet middleware setup
src/config/app.config.ts    - Helmet configuration
.env.example                - HELMET_ENABLED variable
```

---

**Status:** ✅ **IMPLEMENTED AND OPERATIONAL**  
**Last Updated:** 2024-01-17  
**Author:** Development Team
