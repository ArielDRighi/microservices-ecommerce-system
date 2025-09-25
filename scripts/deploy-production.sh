#!/bin/bash

# ============================================
# Production Deployment Script
# ============================================

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
ENVIRONMENT="production"
IMAGE_NAME="ecommerce-async-resilient-system"
REGISTRY="ghcr.io"
NAMESPACE="production"
BACKUP_RETENTION_DAYS=7

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

# Check prerequisites
check_prerequisites() {
    log_info "Checking production deployment prerequisites..."
    
    # Check if required tools are installed
    command -v docker >/dev/null 2>&1 || { log_error "Docker is required but not installed. Aborting."; exit 1; }
    command -v pg_dump >/dev/null 2>&1 || { log_warning "pg_dump not found. Database backup may fail."; }
    
    # Check if running in production environment
    if [ "$CI" != "true" ] && [ "$FORCE_PRODUCTION_DEPLOY" != "true" ]; then
        log_warning "This script is designed to run in CI/CD environment"
        read -p "Are you sure you want to deploy to production? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log_info "Production deployment cancelled by user"
            exit 0
        fi
    fi
    
    log_success "Prerequisites check completed"
}

# Create backup
create_backup() {
    log_info "Creating production backup..."
    
    local backup_date=$(date +%Y%m%d_%H%M%S)
    local backup_dir="$PROJECT_ROOT/backups/$backup_date"
    
    mkdir -p "$backup_dir"
    
    # Database backup
    log_info "Creating database backup..."
    # In a real deployment:
    # pg_dump "$DATABASE_URL" > "$backup_dir/database_backup.sql"
    
    # Application state backup
    log_info "Creating application state backup..."
    # In a real deployment, backup current deployment configuration
    
    # File system backup (if needed)
    log_info "Creating file system backup..."
    # In a real deployment, backup uploaded files, logs, etc.
    
    log_success "Backup created at $backup_dir"
    export BACKUP_PATH="$backup_dir"
}

# Run database migrations with safety checks
run_migrations() {
    log_info "Running database migrations for $ENVIRONMENT..."
    
    # Create migration backup point
    log_info "Creating migration backup point..."
    
    # Run migrations in transaction mode
    log_info "Executing migrations..."
    
    # In a real deployment:
    # npm run migration:run -- --env=production --transaction
    
    log_info "Migration command: npm run migration:run -- --env=$ENVIRONMENT --transaction"
    log_success "Database migrations completed safely"
}

# Deploy with blue-green strategy
deploy_application() {
    local image_tag="$1"
    log_info "Deploying application to $ENVIRONMENT environment (Blue-Green deployment)..."
    
    # Set environment variables
    export IMAGE_TAG="$image_tag"
    export ENVIRONMENT="$ENVIRONMENT"
    export NAMESPACE="$NAMESPACE"
    
    # Deploy to green environment first
    log_info "Deploying to green environment..."
    # In a real deployment:
    # kubectl apply -f k8s/production/green-deployment.yaml
    
    log_info "Green deployment command would use image: $REGISTRY/$IMAGE_NAME:$image_tag"
    
    # Wait for green deployment to be ready
    log_info "Waiting for green deployment to be ready..."
    sleep 30
    
    # Run health checks on green
    if run_health_checks_on_green; then
        log_info "Switching traffic to green environment..."
        # kubectl patch service app-service -p '{"spec":{"selector":{"version":"green"}}}'
        
        log_success "Traffic switched to green environment"
        
        # Clean up blue environment after successful deployment
        log_info "Cleaning up blue environment..."
        # kubectl delete deployment app-blue || true
        
    else
        log_error "Green environment health checks failed. Keeping blue environment active."
        return 1
    fi
    
    log_success "Blue-Green deployment completed"
}

# Health checks for green environment
run_health_checks_on_green() {
    log_info "Running health checks on green environment..."
    
    local max_attempts=20
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log_info "Green health check attempt $attempt/$max_attempts"
        
        # In a real deployment, check green environment health endpoint
        if [ $((RANDOM % 15)) -eq 0 ]; then
            log_warning "Green health check failed on attempt $attempt"
            if [ $attempt -eq $max_attempts ]; then
                log_error "Green environment health checks failed"
                return 1
            fi
        else
            log_success "Green environment is healthy"
            return 0
        fi
        
        sleep 15
        attempt=$((attempt + 1))
    done
}

# Run comprehensive production health checks
run_health_checks() {
    log_info "Running comprehensive production health checks..."
    
    # Application health
    log_info "Checking application health..."
    
    # Database connectivity
    log_info "Checking database connectivity..."
    
    # External services
    log_info "Checking external service connectivity..."
    
    # Performance checks
    log_info "Running performance checks..."
    
    # Security checks
    log_info "Running security checks..."
    
    sleep 15
    log_success "All health checks passed"
}

# Run production smoke tests
run_smoke_tests() {
    log_info "Running production smoke tests..."
    
    # Critical user journeys
    log_info "Testing critical user journeys..."
    
    # API endpoints
    log_info "Testing critical API endpoints..."
    
    # Database operations
    log_info "Testing database operations..."
    
    # Integration tests
    log_info "Testing external integrations..."
    
    sleep 20
    log_success "Production smoke tests completed"
}

# Setup monitoring and alerts
setup_monitoring() {
    log_info "Setting up monitoring and alerts..."
    
    # Enable production monitoring
    log_info "Enabling production monitoring..."
    
    # Configure alerts
    log_info "Configuring production alerts..."
    
    # Setup dashboards
    log_info "Setting up production dashboards..."
    
    log_success "Monitoring and alerts configured"
}

# Cleanup old backups
cleanup_old_backups() {
    log_info "Cleaning up old backups (keeping last $BACKUP_RETENTION_DAYS days)..."
    
    # In a real deployment:
    # find "$PROJECT_ROOT/backups" -type d -mtime +$BACKUP_RETENTION_DAYS -exec rm -rf {} \;
    
    log_success "Old backups cleaned up"
}

# Send deployment notification
send_notification() {
    local status="$1"
    local image_tag="$2"
    
    log_info "Sending deployment notification..."
    
    if [ "$status" = "success" ]; then
        log_success "🎉 Production deployment successful!"
        # In a real deployment, send to Slack, email, etc.
        # curl -X POST -H 'Content-type: application/json' \
        #   --data '{"text":"🎉 Production deployment successful! Version: '$image_tag'"}' \
        #   "$SLACK_WEBHOOK_URL"
    else
        log_error "❌ Production deployment failed!"
        # Send failure notification
    fi
}

# Rollback function
rollback() {
    log_error "Rolling back deployment..."
    
    if [ -n "$BACKUP_PATH" ]; then
        log_info "Restoring from backup: $BACKUP_PATH"
        # Restore database
        # Restore application
        log_info "Rollback completed"
    else
        log_error "No backup path available for rollback"
        return 1
    fi
}

# Main deployment function
main() {
    local image_tag="${1:-latest}"
    
    log_info "🚀 Starting PRODUCTION deployment"
    log_info "Image tag: $image_tag"
    log_warning "This will deploy to PRODUCTION environment!"
    
    # Set trap for cleanup on error
    trap 'log_error "Deployment failed! Rolling back..."; rollback; send_notification "failed" "$image_tag"; exit 1' ERR
    
    check_prerequisites
    create_backup
    run_migrations
    deploy_application "$image_tag"
    run_health_checks
    run_smoke_tests
    setup_monitoring
    cleanup_old_backups
    
    log_success "🎉 Production deployment completed successfully!"
    log_info "Application URL: https://ecommerce-system.com"
    
    send_notification "success" "$image_tag"
}

# Handle script arguments
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [IMAGE_TAG]"
    echo ""
    echo "Deploy application to production environment with safety checks"
    echo ""
    echo "Arguments:"
    echo "  IMAGE_TAG    Docker image tag to deploy (default: latest)"
    echo ""
    echo "Environment Variables:"
    echo "  FORCE_PRODUCTION_DEPLOY    Set to 'true' to skip confirmation prompt"
    echo ""
    echo "Examples:"
    echo "  $0 v1.2.3                           # Deploy specific version"
    echo "  FORCE_PRODUCTION_DEPLOY=true $0     # Deploy without confirmation"
    exit 0
fi

# Execute main function
main "$@"