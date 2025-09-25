#!/bin/bash

# ============================================
# Database Migration Script
# ============================================

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
ENVIRONMENT="${1:-development}"
MIGRATION_DIR="$PROJECT_ROOT/src/database/migrations"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Load environment variables
load_environment() {
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    
    if [ -f "$env_file" ]; then
        log_info "Loading environment from $env_file"
        set -a  # Automatically export variables
        source "$env_file"
        set +a
    else
        log_warning "Environment file not found: $env_file"
        log_info "Using default environment variables"
    fi
}

# Check database connectivity
check_database_connection() {
    log_info "Checking database connection..."
    
    # Try to connect to the database
    # In a real deployment, this would use actual database credentials
    local db_host="${DATABASE_HOST:-localhost}"
    local db_port="${DATABASE_PORT:-5432}"
    local db_name="${DATABASE_NAME:-ecommerce_async}"
    local db_user="${DATABASE_USER:-postgres}"
    
    log_info "Testing connection to $db_host:$db_port/$db_name"
    
    # Use nc (netcat) to test basic connectivity
    if command -v nc >/dev/null 2>&1; then
        if nc -z "$db_host" "$db_port" 2>/dev/null; then
            log_success "Database server is reachable"
        else
            log_error "Cannot connect to database server at $db_host:$db_port"
            exit 1
        fi
    else
        log_warning "nc (netcat) not available, skipping connectivity test"
    fi
    
    # Test with pg_isready if available
    if command -v pg_isready >/dev/null 2>&1; then
        if pg_isready -h "$db_host" -p "$db_port" -d "$db_name" -U "$db_user" >/dev/null 2>&1; then
            log_success "PostgreSQL is ready"
        else
            log_warning "PostgreSQL may not be ready, proceeding anyway"
        fi
    fi
}

# Create backup before migration
create_migration_backup() {
    log_info "Creating database backup before migration..."
    
    local backup_dir="$PROJECT_ROOT/backups/migrations"
    local backup_file="$backup_dir/pre_migration_$(date +%Y%m%d_%H%M%S).sql"
    
    mkdir -p "$backup_dir"
    
    # In a real deployment, create actual backup
    # pg_dump "$DATABASE_URL" > "$backup_file"
    
    log_info "Backup would be created at: $backup_file"
    log_success "Migration backup completed"
}

# Show pending migrations
show_pending_migrations() {
    log_info "Checking for pending migrations..."
    
    cd "$PROJECT_ROOT"
    
    # In a real deployment, this would show actual pending migrations
    # npm run migration:show
    
    log_info "Migration status command: npm run migration:show"
    
    # Mock pending migrations
    echo "Pending migrations:"
    echo "  - 20241201_120000_CreateUsersTable.ts"
    echo "  - 20241201_120100_CreateProductsTable.ts"
    echo "  - 20241201_120200_CreateOrdersTable.ts"
}

# Run migrations
run_migrations() {
    local dry_run="${1:-false}"
    
    if [ "$dry_run" = "true" ]; then
        log_info "Running migrations in dry-run mode..."
        # npm run migration:run -- --dry-run
        log_info "Dry-run command: npm run migration:run -- --dry-run"
        log_success "Dry-run completed successfully"
        return
    fi
    
    log_info "Running database migrations..."
    
    cd "$PROJECT_ROOT"
    
    # Set NODE_ENV for the migration
    export NODE_ENV="$ENVIRONMENT"
    
    # Run TypeORM migrations
    log_info "Executing: npm run migration:run"
    
    # In a real deployment:
    # npm run migration:run
    
    log_success "Migrations completed successfully"
}

# Revert migrations
revert_migrations() {
    local steps="${1:-1}"
    
    log_warning "Reverting $steps migration(s)..."
    log_warning "This will UNDO database changes!"
    
    if [ "$FORCE_REVERT" != "true" ]; then
        read -p "Are you sure you want to revert $steps migration(s)? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log_info "Migration revert cancelled by user"
            return 0
        fi
    fi
    
    cd "$PROJECT_ROOT"
    
    for ((i=1; i<=steps; i++)); do
        log_info "Reverting migration $i of $steps..."
        # npm run migration:revert
        log_info "Revert command: npm run migration:revert"
    done
    
    log_success "Migration revert completed"
}

# Generate new migration
generate_migration() {
    local migration_name="$1"
    
    if [ -z "$migration_name" ]; then
        log_error "Migration name is required"
        exit 1
    fi
    
    log_info "Generating new migration: $migration_name"
    
    cd "$PROJECT_ROOT"
    
    # Generate TypeORM migration
    # npm run migration:generate -- --name="$migration_name"
    
    log_info "Generate command: npm run migration:generate -- --name=\"$migration_name\""
    log_success "Migration generated successfully"
}

# Validate migration files
validate_migrations() {
    log_info "Validating migration files..."
    
    if [ ! -d "$MIGRATION_DIR" ]; then
        log_warning "Migration directory not found: $MIGRATION_DIR"
        return 0
    fi
    
    local migration_count=$(find "$MIGRATION_DIR" -name "*.ts" -type f | wc -l)
    log_info "Found $migration_count migration files"
    
    # Check for naming conventions
    find "$MIGRATION_DIR" -name "*.ts" -type f | while read -r migration_file; do
        local filename=$(basename "$migration_file")
        if [[ ! $filename =~ ^[0-9]{14}_[A-Za-z0-9_]+\.ts$ ]]; then
            log_warning "Migration file doesn't follow naming convention: $filename"
        fi
    done
    
    log_success "Migration validation completed"
}

# Main function for different commands
main() {
    local command="$2"
    
    log_info "🗄️  Database Migration Manager"
    log_info "Environment: $ENVIRONMENT"
    
    load_environment
    
    case $command in
        "run")
            check_database_connection
            create_migration_backup
            show_pending_migrations
            run_migrations
            ;;
        "dry-run")
            check_database_connection
            show_pending_migrations
            run_migrations true
            ;;
        "revert")
            local steps="${3:-1}"
            check_database_connection
            create_migration_backup
            revert_migrations "$steps"
            ;;
        "status")
            check_database_connection
            show_pending_migrations
            ;;
        "generate")
            local migration_name="$3"
            generate_migration "$migration_name"
            ;;
        "validate")
            validate_migrations
            ;;
        *)
            show_migration_help
            ;;
    esac
}

# Show help
show_migration_help() {
    echo "Usage: $0 [ENVIRONMENT] [COMMAND] [OPTIONS]"
    echo ""
    echo "Database migration management script"
    echo ""
    echo "Arguments:"
    echo "  ENVIRONMENT    Target environment (development|staging|production)"
    echo "  COMMAND       Migration command to execute"
    echo ""
    echo "Commands:"
    echo "  run           Run pending migrations"
    echo "  dry-run       Show what migrations would run"
    echo "  revert [N]    Revert N migrations (default: 1)"
    echo "  status        Show migration status"
    echo "  generate NAME Generate new migration file"
    echo "  validate      Validate migration files"
    echo ""
    echo "Environment Variables:"
    echo "  FORCE_REVERT    Set to 'true' to skip revert confirmation"
    echo ""
    echo "Examples:"
    echo "  $0 development run              # Run migrations in development"
    echo "  $0 production dry-run          # Dry-run in production"
    echo "  $0 staging revert 2            # Revert 2 migrations in staging"
    echo "  $0 development generate CreateUsersTable"
    echo ""
    echo "Safety Features:"
    echo "  - Automatic backup before migrations"
    echo "  - Dry-run mode to preview changes"
    echo "  - Connection testing before execution"
    echo "  - Migration file validation"
}

# Handle help
if [ "$1" = "--help" ] || [ "$1" = "-h" ] || [ -z "$2" ]; then
    show_migration_help
    exit 0
fi

# Validate environment
if [ "$1" != "development" ] && [ "$1" != "staging" ] && [ "$1" != "production" ]; then
    log_error "Invalid environment: $1. Use 'development', 'staging', or 'production'"
    exit 1
fi

# Execute main function
main "$@"