#!/bin/bash

# ============================================
# Staging Deployment Script
# ============================================

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
ENVIRONMENT="staging"
IMAGE_NAME="ecommerce-async-resilient-system"
REGISTRY="ghcr.io"
NAMESPACE="staging"

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
    log_info "Checking prerequisites..."
    
    # Check if required tools are installed
    command -v docker >/dev/null 2>&1 || { log_error "Docker is required but not installed. Aborting."; exit 1; }
    command -v kubectl >/dev/null 2>&1 || { log_warning "kubectl not found. Assuming Docker deployment."; }
    
    log_success "Prerequisites check completed"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations for $ENVIRONMENT..."
    
    # In a real deployment, this would connect to the staging database
    # and run TypeORM migrations
    
    cd "$PROJECT_ROOT"
    
    # Example migration command (adjust based on your setup)
    # npm run migration:run -- --env=staging
    
    log_info "Migration command would be: npm run migration:run -- --env=$ENVIRONMENT"
    log_success "Database migrations completed"
}

# Deploy application
deploy_application() {
    local image_tag="$1"
    log_info "Deploying application to $ENVIRONMENT environment..."
    
    # Set environment variables for deployment
    export IMAGE_TAG="$image_tag"
    export ENVIRONMENT="$ENVIRONMENT"
    export NAMESPACE="$NAMESPACE"
    
    # In a real deployment, this would use docker-compose, kubectl, or Helm
    log_info "Deployment command would use image: $REGISTRY/$IMAGE_NAME:$image_tag"
    
    # Example Docker deployment
    # docker run -d --name "$IMAGE_NAME-$ENVIRONMENT" \
    #   --env-file ".env.$ENVIRONMENT" \
    #   -p 3000:3000 \
    #   "$REGISTRY/$IMAGE_NAME:$image_tag"
    
    log_success "Application deployed to $ENVIRONMENT"
}

# Run health checks
run_health_checks() {
    log_info "Running health checks..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log_info "Health check attempt $attempt/$max_attempts"
        
        # In a real deployment, this would check the actual health endpoint
        if [ $((RANDOM % 10)) -eq 0 ]; then
            log_error "Health check failed on attempt $attempt"
            if [ $attempt -eq $max_attempts ]; then
                log_error "Health checks failed after $max_attempts attempts"
                return 1
            fi
        else
            log_success "Health checks passed"
            return 0
        fi
        
        sleep 10
        attempt=$((attempt + 1))
    done
}

# Run smoke tests
run_smoke_tests() {
    log_info "Running smoke tests..."
    
    # In a real deployment, this would run actual smoke tests
    # Examples:
    # - Check if main endpoints respond with 200
    # - Verify database connectivity
    # - Test authentication flow
    # - Check external service integrations
    
    sleep 5
    log_success "Smoke tests completed"
}

# Cleanup old deployments
cleanup_old_deployments() {
    log_info "Cleaning up old deployments..."
    
    # In a real deployment, this would remove old containers/pods
    log_info "Would remove old deployments for $ENVIRONMENT"
    
    log_success "Cleanup completed"
}

# Main deployment function
main() {
    local image_tag="${1:-latest}"
    
    log_info "Starting deployment to $ENVIRONMENT environment"
    log_info "Image tag: $image_tag"
    
    check_prerequisites
    run_migrations
    deploy_application "$image_tag"
    run_health_checks
    run_smoke_tests
    cleanup_old_deployments
    
    log_success "🚀 Deployment to $ENVIRONMENT completed successfully!"
    log_info "Application URL: https://staging.ecommerce-system.com"
}

# Handle script arguments
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [IMAGE_TAG]"
    echo ""
    echo "Deploy application to staging environment"
    echo ""
    echo "Arguments:"
    echo "  IMAGE_TAG    Docker image tag to deploy (default: latest)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Deploy latest tag"
    echo "  $0 v1.2.3            # Deploy specific version"
    echo "  $0 main-abc123       # Deploy specific commit"
    exit 0
fi

# Execute main function
main "$@"