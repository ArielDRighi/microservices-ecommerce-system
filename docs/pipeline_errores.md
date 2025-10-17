CI - Orders Service (NestJS): All jobs have failed

- Build & Unit Tests
- Install dependencies:
  Run npm ci
  npm warn deprecated supertest@6.3.4: Please upgrade to supertest v7.1.3+, see release notes at https://github.com/forwardemail/supertest/releases/tag/v7.1.3 - maintenance is supported by Forward Email @ https://forwardemail.net
  npm warn deprecated rimraf@3.0.2: Rimraf versions prior to v4 are no longer supported
  npm warn deprecated npmlog@5.0.1: This package is no longer supported.
  npm warn deprecated superagent@8.1.2: Please upgrade to superagent v10.2.2+, see release notes at https://github.com/forwardemail/superagent/releases/tag/v10.2.2 - maintenance is supported by Forward Email @ https://forwardemail.net
  npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
  npm warn deprecated gauge@3.0.2: This package is no longer supported.
  npm warn deprecated are-we-there-yet@2.0.0: This package is no longer supported.
  npm warn deprecated @types/winston@2.4.4: This is a stub types definition. winston provides its own type definitions, so you do not need this installed.
  npm warn deprecated @npmcli/move-file@1.1.2: This functionality has been moved to @npmcli/fs
  npm warn deprecated @humanwhocodes/object-schema@2.0.3: Use @eslint/object-schema instead
  npm warn deprecated @humanwhocodes/config-array@0.13.0: Use @eslint/config-array instead
  npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
  npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
  npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
  npm warn deprecated npmlog@6.0.2: This package is no longer supported.
  npm warn deprecated are-we-there-yet@3.0.1: This package is no longer supported.
  npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
  npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
  npm warn deprecated gauge@4.0.4: This package is no longer supported.
  npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
  npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
  npm warn deprecated eslint@8.57.1: This version is no longer supported. Please see https://eslint.org/version-support for other options.

> ecommerce-async-resilient-system@1.0.0 prepare
> husky install

husky - .git can't be found (see https://typicode.github.io/husky/#/?id=custom-directory)
npm error code 1
npm error path /home/runner/work/microservices-ecommerce-system/microservices-ecommerce-system/services/orders-service
npm error command failed
npm error command sh -c husky install
npm error A complete log of this run can be found in: /home/runner/.npm/\_logs/2025-10-17T13_32_37_802Z-debug-0.log
Error: Process completed with exit code 1.

- Run npm audit:
  Run echo "🔒 Running npm audit..."
  🔒 Running npm audit...

# npm audit report

micromatch <4.0.8
Severity: moderate
Regular Expression Denial of Service (ReDoS) in micromatch - https://github.com/advisories/GHSA-952p-6rrq-rcjv
fix available via `npm audit fix`
node_modules/lint-staged/node_modules/micromatch
lint-staged 7.0.0 - 8.2.1 || 13.3.0 - 15.2.4
Depends on vulnerable versions of micromatch
node_modules/lint-staged

tmp <=0.2.3
tmp allows arbitrary temporary file / directory write via symbolic link `dir` parameter - https://github.com/advisories/GHSA-52f5-9888-hmc6
fix available via `npm audit fix --force`
Will install @nestjs/cli@11.0.10, which is a breaking change
node_modules/tmp
external-editor >=1.1.1
Depends on vulnerable versions of tmp
node_modules/external-editor
inquirer 3.0.0 - 8.2.6 || 9.0.0 - 9.3.7
Depends on vulnerable versions of external-editor
node_modules/@angular-devkit/schematics-cli/node_modules/inquirer
node_modules/inquirer
@angular-devkit/schematics-cli 0.12.0-beta.0 - 18.1.0-rc.1
Depends on vulnerable versions of inquirer
node_modules/@angular-devkit/schematics-cli
@nestjs/cli 2.0.0-rc.1 - 10.4.9
Depends on vulnerable versions of @angular-devkit/schematics-cli
Depends on vulnerable versions of inquirer
node_modules/@nestjs/cli

validator _
Severity: moderate
validator.js has a URL validation bypass vulnerability in its isURL function - https://github.com/advisories/GHSA-9965-vmph-33xx
fix available via `npm audit fix --force`
Will install @nestjs/common@7.5.5, which is a breaking change
node_modules/validator
class-validator _
Depends on vulnerable versions of validator
node_modules/class-validator
@nestjs/common 4.3.0 - 5.0.0-rc.4 || >=7.6.0-next.1
Depends on vulnerable versions of class-validator
node_modules/@nestjs/common
@nestjs/bull >=10.0.0
Depends on vulnerable versions of @nestjs/bull-shared
Depends on vulnerable versions of @nestjs/common
Depends on vulnerable versions of @nestjs/core
node_modules/@nestjs/bull
@nestjs/bull-shared >=10.0.0
Depends on vulnerable versions of @nestjs/common
Depends on vulnerable versions of @nestjs/core
node_modules/@nestjs/bull-shared
@nestjs/config >=3.0.0
Depends on vulnerable versions of @nestjs/common
node_modules/@nestjs/config
@nestjs/core >=8.0.0-alpha.1
Depends on vulnerable versions of @nestjs/common
Depends on vulnerable versions of @nestjs/platform-express
node_modules/@nestjs/core
@nestjs/swagger 1.2.0 - 1.3.1 || >=4.5.2
Depends on vulnerable versions of @nestjs/common
Depends on vulnerable versions of @nestjs/core
Depends on vulnerable versions of @nestjs/mapped-types
Depends on vulnerable versions of class-validator
node_modules/@nestjs/swagger
@nestjs/typeorm <=2.0.0 || >=8.0.0
Depends on vulnerable versions of @nestjs/common
Depends on vulnerable versions of @nestjs/core
node_modules/@nestjs/typeorm
@nestjs/terminus >=8.0.0-next.0
Depends on vulnerable versions of @nestjs/common
Depends on vulnerable versions of @nestjs/core
Depends on vulnerable versions of @nestjs/typeorm
node_modules/@nestjs/terminus
@nestjs/jwt >=9.0.0
Depends on vulnerable versions of @nestjs/common
node_modules/@nestjs/jwt
@nestjs/mapped-types \*
Depends on vulnerable versions of @nestjs/common
Depends on vulnerable versions of class-validator
node_modules/@nestjs/mapped-types
@nestjs/passport >=9.0.0
Depends on vulnerable versions of @nestjs/common
node_modules/@nestjs/passport
@nestjs/platform-express >=8.0.0-alpha.1
Depends on vulnerable versions of @nestjs/common
Depends on vulnerable versions of @nestjs/core
node_modules/@nestjs/platform-express
@nestjs/schedule >=3.0.0
Depends on vulnerable versions of @nestjs/common
Depends on vulnerable versions of @nestjs/core
node_modules/@nestjs/schedule
@nestjs/testing >=8.0.0-alpha.1
Depends on vulnerable versions of @nestjs/common
Depends on vulnerable versions of @nestjs/core
Depends on vulnerable versions of @nestjs/platform-express
node_modules/@nestjs/testing

23 vulnerabilities (5 low, 18 moderate)

To address issues that do not require attention, run:
npm audit fix

To address all issues (including breaking changes), run:
npm audit fix --force
Error: Process completed with exit code 1.

- Check results:
  Run echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📊 CI Pipeline Summary - Orders Service
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Build & Tests: failure
E2E Tests: failure
Linting: failure
Security Audit: failure

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ Some checks failed. Please review.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Error: Process completed with exit code 1.

CI - Inventory Service (Go): All jobs have failed

- Run unit tests:
  Run echo "🧪 Running unit tests..."
  🧪 Running unit tests...

# github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/internal/infrastructure/config

go: no such tool "covdata"
Error: Process completed with exit code 1.

- Run integration tests:
  Run echo "🔗 Running integration tests with Testcontainers..."
  🔗 Running integration tests with Testcontainers...
  === RUN TestHealthCheckEndpoint
  === RUN TestHealthCheckEndpoint/should_return_200_OK
  [GIN] 2025/10/17 - 13:32:59 | 200 | 123.47µs | | GET "/health"
  === RUN TestHealthCheckEndpoint/should_return_correct_JSON_structure
  [GIN] 2025/10/17 - 13:32:59 | 200 | 56.295µs | | GET "/health"
  === RUN TestHealthCheckEndpoint/should_return_application/json_content_type
  [GIN] 2025/10/17 - 13:32:59 | 200 | 51.907µs | | GET "/health"
  --- PASS: TestHealthCheckEndpoint (0.00s)
  --- PASS: TestHealthCheckEndpoint/should_return_200_OK (0.00s)
  --- PASS: TestHealthCheckEndpoint/should_return_correct_JSON_structure (0.00s)
  --- PASS: TestHealthCheckEndpoint/should_return_application/json_content_type (0.00s)
  === RUN TestHealthCheckIntegration
  health_test.go:72: Integration test - requires running server
  --- SKIP: TestHealthCheckIntegration (0.00s)
  === RUN TestPoCTestcontainers
  2025/10/17 13:32:59 github.com/testcontainers/testcontainers-go - Connected to docker:
  Server Version: 28.0.4
  API Version: 1.43
  Operating System: Ubuntu 24.04.3 LTS
  Total Memory: 15995 MB
  Resolved Docker Host: unix:///var/run/docker.sock
  Resolved Docker Socket Path: /var/run/docker.sock
  Test SessionID: ac37b3b1525a8e7bfce70edab70f9d297ae60eed01e7456e0ccb3f9719aeb9c0
  Test ProcessID: 43b95fd6-6462-4ed6-a0c9-c30de52c3857
  2025/10/17 13:32:59 Failed to get image auth for docker.io. Setting empty credentials for the image: docker.io/testcontainers/ryuk:0.5.1. Error is:credentials not found in native keychain
  2025/10/17 13:33:02 🐳 Creating container for image docker.io/testcontainers/ryuk:0.5.1
  2025/10/17 13:33:02 ✅ Container created: 2b44ff191d2a
  2025/10/17 13:33:02 🐳 Starting container: 2b44ff191d2a
  2025/10/17 13:33:02 ✅ Container started: 2b44ff191d2a
  2025/10/17 13:33:02 🚧 Waiting for container id 2b44ff191d2a image: docker.io/testcontainers/ryuk:0.5.1. Waiting for: &{Port:8080/tcp timeout:<nil> PollInterval:100ms}
  2025/10/17 13:33:08 🐳 Creating container for image postgres:16-alpine
  2025/10/17 13:33:08 ✅ Container created: 3a97b608732f
  2025/10/17 13:33:08 🐳 Starting container: 3a97b608732f
  2025/10/17 13:33:08 ✅ Container started: 3a97b608732f
  2025/10/17 13:33:08 🚧 Waiting for container id 3a97b608732f image: postgres:16-alpine. Waiting for: &{timeout:<nil> deadline:0xc00013c0b8 Strategies:[0xc000130030]}
  poc_testcontainers_test.go:59: ⏱️ Testcontainer setup time: 10.192999969s
  poc_testcontainers_test.go:73: ⏱️ GORM connection time: 22.936945ms
  poc_testcontainers_test.go:83: ⏱️ Schema migration time: 18.375555ms
  poc_testcontainers_test.go:87: ✅ Total setup time: 10.238001959s
  === RUN TestPoCTestcontainers/should_create_and_retrieve_product
  === RUN TestPoCTestcontainers/should_handle_optimistic_locking
  === RUN TestPoCTestcontainers/should_enforce_NOT_NULL_constraint
  poc_testcontainers_test.go:157:
  Error Trace: /home/runner/work/microservices-ecommerce-system/microservices-ecommerce-system/services/inventory-service/tests/integration/poc_testcontainers_test.go:157
  Error: An error is expected but got nil.
  Test: TestPoCTestcontainers/should_enforce_NOT_NULL_constraint
  Messages: Should fail due to NOT NULL constraint
  === RUN TestPoCTestcontainers/should_query_multiple_products_efficiently
  poc_testcontainers_test.go:176: ⏱️ Query time for 100 products: 1.853834ms
  === NAME TestPoCTestcontainers
  poc_testcontainers_test.go:182:
  📊 PoC Results Summary
  ======================
  ✅ Testcontainer setup: 10.192999969s
  ✅ GORM connection: 22.936945ms
  ✅ Schema migration: 18.375555ms
  ✅ Total time: 10.238001959s
  ======================
  🎯 Target: < 2 min (120s)
  📈 Actual: 10.24s
  🚀 Status: ✅ PASS - Under target!
  2025/10/17 13:33:10 🐳 Terminating container: 3a97b608732f
  2025/10/17 13:33:10 🚫 Container terminated: 3a97b608732f
  --- FAIL: TestPoCTestcontainers (10.47s)
  --- PASS: TestPoCTestcontainers/should_create_and_retrieve_product (0.00s)
  --- PASS: TestPoCTestcontainers/should_handle_optimistic_locking (0.00s)
  --- FAIL: TestPoCTestcontainers/should_enforce_NOT_NULL_constraint (0.00s)
  --- PASS: TestPoCTestcontainers/should_query_multiple_products_efficiently (0.08s)
  === RUN TestPoCTestcontainersWithReuse
  poc_testcontainers_test.go:213: 💡 Tip: Testcontainers permite reusar contenedores entre tests con WithReuse(true)
  poc_testcontainers_test.go:214: 💡 Esto reduce el tiempo de setup de 60s a ~5s en ejecuciones subsecuentes
  poc_testcontainers_test.go:215: 💡 Ejemplo: testcontainers.WithReuse(true) en ContainerRequest
  --- PASS: TestPoCTestcontainersWithReuse (0.00s)
  FAIL
  FAIL github.com/ArielDRighi/microservices-ecommerce-system/services/inventory-service/tests/integration 10.539s
  FAIL
  Error: Process completed with exit code 1.

- Run golangci-lint:
  Run golangci/golangci-lint-action@v6
  prepare environment
  run golangci-lint

- Upload SARIF file:
  Run github/codeql-action/upload-sarif@v3
  Warning: Resource not accessible by integration - https://docs.github.com/rest
  Uploading code scanning results
  Processing sarif files: ["results.sarif"]
  Validating results.sarif
  Adding fingerprints to SARIF file. See https://docs.github.com/en/enterprise-cloud@latest/code-security/code-scanning/integrating-with-code-scanning/sarif-support-for-code-scanning#providing-data-to-track-code-scanning-alerts-across-runs for more information.
  Uploading results
  Warning: Resource not accessible by integration - https://docs.github.com/rest
  Error: Resource not accessible by integration - https://docs.github.com/rest
  Warning: Resource not accessible by integration - https://docs.github.com/rest

- Check results:
  Run echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📊 CI Pipeline Summary - Inventory Service
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Build & Tests: failure
Integration Tests: failure
Linting: failure
Security Scan: failure

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ Some checks failed. Please review.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Error: Process completed with exit code 1.
