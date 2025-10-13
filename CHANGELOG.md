# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added - Task 6: Inventory Improvements (October 12, 2025)

#### 🎉 New Endpoints

- **POST /inventory** - Create inventory records via API (no more seed-only)
  - Supports all inventory fields: stock levels, reorder points, locations
  - Full validation: product existence, duplicate prevention
  - Returns 201 Created with complete inventory details
- **GET /inventory/reservations/:id** - Query reservation status
  - Check if reservation is still valid, expired, or completed
  - Returns TTL, expiration status, and action availability
  - Useful for order status pages and admin dashboards

#### 🔧 Improvements

- **Enhanced Reservation Validations**
  - Prevent double-release of same reservation (400 instead of 500)
  - Prevent double-fulfill of same reservation
  - Prevent cross-status operations (can't fulfill released reservation)
  - Clear, descriptive error messages for all validation failures

- **Database Schema**
  - Added `inventory_reservations` table via migration
  - Created `reservation_status_enum` with values: ACTIVE, RELEASED, FULFILLED, EXPIRED
  - Added indexes on: reservation_id, (product_id, location), expires_at
  - Foreign keys to products and inventory with CASCADE delete

- **Reservation Persistence**
  - `reserveStock()` now saves InventoryReservation entities to database
  - Enables tracking and querying of all reservations
  - Supports audit trail and analytics

#### 🐛 Bug Fixes

- Fixed PostgreSQL compatibility issue with pessimistic locks
  - Removed `relations: ['product']` from queries using `FOR UPDATE`
  - Prevents "FOR UPDATE cannot be applied to LEFT JOIN" errors
- Fixed reservation lifecycle management
  - Reservations now properly transition through all states
  - Status updates are persisted correctly
  - Expiration tracking works as expected

#### 🧪 Testing

- **Added 46 E2E tests for inventory module (100% passing)**
  - POST /inventory: 6 tests (minimal fields, full config, errors)
  - GET /reservations/:id: 4 tests (active, released, fulfilled, not found)
  - Complete flows: 6 tests (reserve→release, reserve→fulfill, lifecycle)
  - Improved validations: 4 tests (double-release/fulfill prevention)
  - Error scenarios: 4 tests (404, 400, insufficient stock, concurrent)
  - Other endpoints: 22 tests (existing functionality maintained)

- **Test Quality Improvements**
  - All tests are idempotent and independent
  - No dependency on seeds or pre-existing data
  - Each test creates its own fixtures
  - Tests can run in any order

- **Overall Test Results**
  - Unit Tests: 1059/1059 passing (104 suites)
  - E2E Tests: 233/234 passing (99.6%)
  - Code Coverage: 75.31% (up from 74.66%)

#### 📚 Documentation

- Updated API_DOCUMENTATION.md with new endpoints
- Updated README.md with latest test metrics
- Created TASK_6_IMPLEMENTATION_SUMMARY.md with full implementation report
- Updated INVENTORY_IMPLEMENTATION_PLAN.md with completion status
- Updated TESTING_SUMMARY.md with new test results

### Changed

- Inventory module now supports full CRUD operations via API
- Reservation system now uses ACTIVE status (not PENDING) for active reservations
- DTO validation enforces complete request bodies for release/fulfill operations

### Fixed

- PostgreSQL pessimistic lock compatibility
- Reservation entity persistence
- DTO validation error messages (now return 400 instead of 500)
- Mock expectations in unit tests after service changes

---

## [1.0.0] - 2025-10-09

### Added - Initial Release

- Non-blocking async architecture with 202 Accepted pattern
- Event-driven system with Outbox Pattern
- Saga Pattern for distributed transaction orchestration
- Bull queue system with 4 specialized queues
- Circuit Breaker and Retry patterns with exponential backoff
- Idempotency key support
- Dead Letter Queue for failed jobs
- JWT authentication with access/refresh tokens
- Role-based authorization (Admin/Customer)
- Health checks with Terminus
- Prometheus metrics
- Bull Board dashboard
- Structured logging with Winston
- 1033 unit tests (74.69% coverage)
- 35 E2E tests (94.6% passing)
- Complete Swagger/OpenAPI documentation
- Docker multi-stage builds
- GitHub Actions CI/CD pipeline
- 25 Architecture Decision Records (ADRs) in Spanish

### Modules

- Auth: Registration, login, JWT tokens, profile management
- Users: CRUD operations with role management
- Products: Catalog management with search and filtering
- Categories: Hierarchical category tree
- Orders: Async order processing with saga orchestration
- Inventory: Stock management with reservations
- Payments: Payment processing (simulated)
- Notifications: Email notifications (queued)
- Health: System health monitoring
- Events: Outbox pattern implementation

---

## Links

- [GitHub Repository](https://github.com/ArielDRighi/ecommerce-async-resilient-system)
- [API Documentation](./docs/API_DOCUMENTATION.md)
- [Architecture Decisions](./docs/adr/)
- [Testing Summary](./TESTING_SUMMARY.md)
