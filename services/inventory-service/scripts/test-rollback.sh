#!/bin/bash

# Test Rollback Script for Inventory Service Migrations
# Tests rollback functionality by applying and reverting migrations
# Usage: ./scripts/test-rollback.sh [--env development|test]

set -e  # Exit on error
set -o pipefail  # Exit on pipe failure

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default environment
ENV="${1:-test}"

# Load environment variables
if [ "$ENV" = "development" ]; then
    DB_HOST="localhost"
    DB_PORT="5433"
    DB_NAME="microservices_inventory"
    DB_USER="microservices_user"
    DB_PASSWORD="microservices_password"
elif [ "$ENV" = "test" ]; then
    DB_HOST="localhost"
    DB_PORT="5433"
    DB_NAME="microservices_test"
    DB_USER="microservices_user"
    DB_PASSWORD="microservices_password"
else
    echo -e "${RED}❌ Invalid environment: $ENV${NC}"
    echo "Usage: $0 [development|test]"
    exit 1
fi

DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=disable"
MIGRATIONS_DIR="./migrations"

# Function to print step
print_step() {
    echo -e "\n${BLUE}===================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===================================================${NC}\n"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to check if migrate is installed
check_migrate() {
    if ! command -v migrate &> /dev/null; then
        print_error "golang-migrate is not installed"
        echo "Install it with:"
        echo "  go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest"
        exit 1
    fi
    print_success "golang-migrate is installed"
}

# Function to check database connection
check_db_connection() {
    if psql "$DB_URL" -c "SELECT 1;" &> /dev/null; then
        print_success "Database connection successful"
        return 0
    else
        print_error "Cannot connect to database"
        echo "Database URL: ${DB_HOST}:${DB_PORT}/${DB_NAME}"
        return 1
    fi
}

# Function to get current migration version
get_migration_version() {
    local version=$(migrate -path "$MIGRATIONS_DIR" -database "$DB_URL" version 2>&1 | grep -oP '\d+' || echo "0")
    echo "$version"
}

# Function to check if table exists
table_exists() {
    local table_name=$1
    local exists=$(psql "$DB_URL" -tAc "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='$table_name');")
    if [ "$exists" = "t" ]; then
        return 0
    else
        return 1
    fi
}

# Function to count rows in table
count_rows() {
    local table_name=$1
    local count=$(psql "$DB_URL" -tAc "SELECT COUNT(*) FROM $table_name;" 2>/dev/null || echo "0")
    echo "$count"
}

# Function to apply migrations
apply_migrations() {
    print_step "Applying Migrations"
    
    if migrate -path "$MIGRATIONS_DIR" -database "$DB_URL" up; then
        local version=$(get_migration_version)
        print_success "Migrations applied successfully (version: $version)"
        return 0
    else
        print_error "Failed to apply migrations"
        return 1
    fi
}

# Function to rollback migration
rollback_migration() {
    local steps=${1:-1}
    print_step "Rolling Back $steps Migration(s)"
    
    if migrate -path "$MIGRATIONS_DIR" -database "$DB_URL" down "$steps"; then
        local version=$(get_migration_version)
        print_success "Rollback successful (version: $version)"
        return 0
    else
        print_error "Rollback failed"
        return 1
    fi
}

# Test 1: Verify Initial State
test_initial_state() {
    print_step "Test 1: Verify Initial State"
    
    # Drop all tables if they exist
    psql "$DB_URL" -c "DROP TABLE IF EXISTS reservations CASCADE;" &> /dev/null || true
    psql "$DB_URL" -c "DROP TABLE IF EXISTS inventory_items CASCADE;" &> /dev/null || true
    psql "$DB_URL" -c "DROP TABLE IF EXISTS schema_migrations CASCADE;" &> /dev/null || true
    
    if ! table_exists "inventory_items" && ! table_exists "reservations"; then
        print_success "Database is clean"
    else
        print_error "Database is not clean"
        return 1
    fi
}

# Test 2: Apply and Verify Migrations
test_apply_migrations() {
    print_step "Test 2: Apply and Verify Migrations"
    
    if ! apply_migrations; then
        return 1
    fi
    
    # Verify tables exist
    if table_exists "inventory_items"; then
        print_success "inventory_items table exists"
    else
        print_error "inventory_items table does not exist"
        return 1
    fi
    
    if table_exists "reservations"; then
        print_success "reservations table exists"
    else
        print_error "reservations table does not exist"
        return 1
    fi
    
    # Verify migration version
    local version=$(get_migration_version)
    if [ "$version" = "2" ]; then
        print_success "Migration version is 2"
    else
        print_error "Migration version is $version (expected 2)"
        return 1
    fi
}

# Test 3: Insert Test Data
test_insert_data() {
    print_step "Test 3: Insert Test Data"
    
    # Insert test inventory item
    psql "$DB_URL" -c "
        INSERT INTO inventory_items (id, product_id, quantity, reserved, version, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            gen_random_uuid(),
            100,
            0,
            1,
            NOW(),
            NOW()
        );
    " &> /dev/null
    
    local count=$(count_rows "inventory_items")
    if [ "$count" = "1" ]; then
        print_success "Test data inserted (1 row in inventory_items)"
    else
        print_error "Failed to insert test data"
        return 1
    fi
}

# Test 4: Rollback Last Migration (002)
test_rollback_last() {
    print_step "Test 4: Rollback Last Migration (002)"
    
    if ! rollback_migration 1; then
        return 1
    fi
    
    # Verify reservations table is gone
    if ! table_exists "reservations"; then
        print_success "reservations table removed"
    else
        print_error "reservations table still exists"
        return 1
    fi
    
    # Verify inventory_items table still exists
    if table_exists "inventory_items"; then
        print_success "inventory_items table still exists"
    else
        print_error "inventory_items table was removed (should still exist)"
        return 1
    fi
    
    # Verify data is intact
    local count=$(count_rows "inventory_items")
    if [ "$count" = "1" ]; then
        print_success "Data is intact (1 row in inventory_items)"
    else
        print_error "Data was lost (expected 1 row, got $count)"
        return 1
    fi
    
    # Verify migration version
    local version=$(get_migration_version)
    if [ "$version" = "1" ]; then
        print_success "Migration version is 1"
    else
        print_error "Migration version is $version (expected 1)"
        return 1
    fi
}

# Test 5: Rollback All Migrations
test_rollback_all() {
    print_step "Test 5: Rollback All Migrations"
    
    # Re-apply migration 002 first
    if ! apply_migrations; then
        return 1
    fi
    
    # Now rollback all
    if ! rollback_migration 2; then
        return 1
    fi
    
    # Verify all tables are gone
    if ! table_exists "inventory_items" && ! table_exists "reservations"; then
        print_success "All tables removed"
    else
        print_error "Some tables still exist"
        return 1
    fi
    
    # Verify migration version
    local version=$(get_migration_version)
    if [ "$version" = "0" ]; then
        print_success "Migration version is 0"
    else
        print_error "Migration version is $version (expected 0)"
        return 1
    fi
}

# Test 6: Re-apply Migrations (Idempotent)
test_reapply_migrations() {
    print_step "Test 6: Re-apply Migrations (Idempotent)"
    
    if ! apply_migrations; then
        return 1
    fi
    
    # Verify tables exist again
    if table_exists "inventory_items" && table_exists "reservations"; then
        print_success "Tables re-created successfully"
    else
        print_error "Failed to re-create tables"
        return 1
    fi
    
    # Verify migration version
    local version=$(get_migration_version)
    if [ "$version" = "2" ]; then
        print_success "Migration version is 2"
    else
        print_error "Migration version is $version (expected 2)"
        return 1
    fi
}

# Test 7: Verify Schema Details
test_schema_details() {
    print_step "Test 7: Verify Schema Details"
    
    # Check indexes on inventory_items
    local indexes=$(psql "$DB_URL" -tAc "SELECT COUNT(*) FROM pg_indexes WHERE tablename='inventory_items';")
    if [ "$indexes" -ge "2" ]; then
        print_success "Indexes exist on inventory_items (found $indexes)"
    else
        print_error "Missing indexes on inventory_items (found $indexes, expected >= 2)"
        return 1
    fi
    
    # Check constraints on inventory_items
    local constraints=$(psql "$DB_URL" -tAc "SELECT COUNT(*) FROM pg_constraint WHERE conrelid='inventory_items'::regclass AND contype='c';")
    if [ "$constraints" -ge "3" ]; then
        print_success "Check constraints exist on inventory_items (found $constraints)"
    else
        print_error "Missing constraints on inventory_items (found $constraints, expected >= 3)"
        return 1
    fi
    
    # Check foreign key on reservations
    local fk=$(psql "$DB_URL" -tAc "SELECT COUNT(*) FROM pg_constraint WHERE conrelid='reservations'::regclass AND contype='f';")
    if [ "$fk" -ge "1" ]; then
        print_success "Foreign key exists on reservations"
    else
        print_error "Missing foreign key on reservations"
        return 1
    fi
}

# Main test execution
main() {
    echo -e "${BLUE}"
    echo "=================================================="
    echo "  Inventory Service - Rollback Test Suite"
    echo "=================================================="
    echo -e "${NC}"
    echo "Environment: $ENV"
    echo "Database: ${DB_HOST}:${DB_PORT}/${DB_NAME}"
    echo ""
    
    # Pre-flight checks
    check_migrate || exit 1
    check_db_connection || exit 1
    
    # Run tests
    local tests_passed=0
    local tests_failed=0
    
    if test_initial_state; then
        ((tests_passed++))
    else
        ((tests_failed++))
        print_error "Test 1 failed"
    fi
    
    if test_apply_migrations; then
        ((tests_passed++))
    else
        ((tests_failed++))
        print_error "Test 2 failed"
    fi
    
    if test_insert_data; then
        ((tests_passed++))
    else
        ((tests_failed++))
        print_error "Test 3 failed"
    fi
    
    if test_rollback_last; then
        ((tests_passed++))
    else
        ((tests_failed++))
        print_error "Test 4 failed"
    fi
    
    if test_rollback_all; then
        ((tests_passed++))
    else
        ((tests_failed++))
        print_error "Test 5 failed"
    fi
    
    if test_reapply_migrations; then
        ((tests_passed++))
    else
        ((tests_failed++))
        print_error "Test 6 failed"
    fi
    
    if test_schema_details; then
        ((tests_passed++))
    else
        ((tests_failed++))
        print_error "Test 7 failed"
    fi
    
    # Print summary
    print_step "Test Summary"
    echo -e "Tests Passed: ${GREEN}$tests_passed${NC}"
    echo -e "Tests Failed: ${RED}$tests_failed${NC}"
    echo ""
    
    if [ "$tests_failed" -eq 0 ]; then
        print_success "All rollback tests passed! 🎉"
        exit 0
    else
        print_error "Some rollback tests failed"
        exit 1
    fi
}

# Run main function
main
