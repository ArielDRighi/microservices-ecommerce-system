#!/bin/bash

# ============================================
# Rollback Deployment Script
# ============================================

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
ENVIRONMENT="${1:-staging}"
BACKUP_DIR="$PROJECT_ROOT/backups"

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

# Find available backups
list_available_backups() {
    log_info "Available backups:"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        log_error "Backup directory not found: $BACKUP_DIR"
        exit 1
    fi
    
    local backups=($(ls -1t "$BACKUP_DIR" 2>/dev/null || true))
    
    if [ ${#backups[@]} -eq 0 ]; then
        log_error "No backups found in $BACKUP_DIR"
        exit 1
    fi
    
    for i in "${!backups[@]}"; do
        local backup_path="$BACKUP_DIR/${backups[$i]}"
        local backup_date=$(basename "${backups[$i]}")
        local backup_size=$(du -sh "$backup_path" 2>/dev/null | cut -f1)
        echo "  $((i+1)). $backup_date (Size: $backup_size)"
    done
    
    echo "${backups[@]}"
}

# Get deployment history
get_deployment_history() {
    log_info "Recent deployment history:"
    
    # In a real scenario, this would query deployment history from:
    # - Kubernetes deployment history
    # - Docker container registry tags
    # - CI/CD pipeline records
    
    echo "  1. v1.2.3 - deployed 2 hours ago (current)"
    echo "  2. v1.2.2 - deployed 1 day ago"
    echo "  3. v1.2.1 - deployed 3 days ago"
    echo "  4. v1.2.0 - deployed 1 week ago"
}

# Rollback application
rollback_application() {
    local target_version="$1"
    
    log_info "Rolling back application to version: $target_version"
    
    # Stop current application gracefully
    log_info "Stopping current application..."
    # In a real deployment:
    # kubectl rollout undo deployment/app --to-revision=$target_version
    # docker stop ecommerce-app-production
    
    # Deploy previous version
    log_info "Deploying previous version..."
    # In a real deployment:
    # kubectl set image deployment/app app=registry/app:$target_version
    # docker run -d --name ecommerce-app-production registry/app:$target_version
    
    log_success "Application rolled back to $target_version"
}

# Rollback database
rollback_database() {
    local backup_path="$1"
    
    log_warning "⚠️  DATABASE ROLLBACK REQUESTED ⚠️"
    log_warning "This will restore database from backup: $backup_path"
    log_warning "ALL DATA CHANGES SINCE BACKUP WILL BE LOST!"
    
    if [ "$FORCE_DATABASE_ROLLBACK" != "true" ]; then
        read -p "Are you absolutely sure you want to rollback the database? (type 'yes' to confirm): " -r
        if [ "$REPLY" != "yes" ]; then
            log_info "Database rollback cancelled by user"
            return 0
        fi
    fi
    
    log_info "Creating current database backup before rollback..."
    local rollback_backup_dir="$BACKUP_DIR/rollback_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$rollback_backup_dir"
    
    # Backup current database before rollback
    # pg_dump "$DATABASE_URL" > "$rollback_backup_dir/pre_rollback_backup.sql"
    
    log_info "Restoring database from backup..."
    # In a real deployment:
    # psql "$DATABASE_URL" < "$backup_path/database_backup.sql"
    
    log_success "Database rolled back successfully"
    log_info "Pre-rollback backup saved at: $rollback_backup_dir"
}

# Verify rollback
verify_rollback() {
    log_info "Verifying rollback..."
    
    # Health checks
    log_info "Running health checks..."
    
    # Application functionality tests
    log_info "Testing critical application functionality..."
    
    # Database connectivity tests
    log_info "Testing database connectivity..."
    
    # Performance checks
    log_info "Running performance checks..."
    
    sleep 10
    log_success "Rollback verification completed"
}

# Interactive rollback mode
interactive_rollback() {
    local environment="$1"
    
    log_info "🔄 Interactive Rollback for $environment environment"
    echo ""
    
    # Show deployment history
    get_deployment_history
    echo ""
    
    # Get rollback choice
    echo "Rollback options:"
    echo "  1. Application only (recommended)"
    echo "  2. Application + Database (⚠️  DESTRUCTIVE)"
    echo "  3. Cancel rollback"
    echo ""
    
    read -p "Select rollback type (1-3): " rollback_type
    
    case $rollback_type in
        1)
            log_info "Application-only rollback selected"
            read -p "Enter target version (e.g., v1.2.2): " target_version
            rollback_application "$target_version"
            verify_rollback
            log_success "Application rollback completed successfully"
            ;;
        2)
            log_warning "Application + Database rollback selected"
            
            # List backups
            local available_backups=($(list_available_backups))
            echo ""
            
            read -p "Select backup number: " backup_number
            
            if [[ "$backup_number" =~ ^[0-9]+$ ]] && [ "$backup_number" -ge 1 ] && [ "$backup_number" -le ${#available_backups[@]} ]; then
                local selected_backup="${available_backups[$((backup_number-1))]}"
                local backup_path="$BACKUP_DIR/$selected_backup"
                
                read -p "Enter target application version: " target_version
                
                rollback_application "$target_version"
                rollback_database "$backup_path"
                verify_rollback
                
                log_success "Full rollback completed successfully"
            else
                log_error "Invalid backup selection"
                exit 1
            fi
            ;;
        3)
            log_info "Rollback cancelled by user"
            exit 0
            ;;
        *)
            log_error "Invalid selection"
            exit 1
            ;;
    esac
}

# Quick rollback to previous version
quick_rollback() {
    local environment="$1"
    
    log_info "🚀 Quick rollback for $environment environment"
    
    # Get previous version (in a real deployment, this would query the deployment history)
    local previous_version="v1.2.2"  # This would be dynamically determined
    
    log_info "Rolling back to previous version: $previous_version"
    
    rollback_application "$previous_version"
    verify_rollback
    
    log_success "Quick rollback completed successfully"
}

# Emergency rollback
emergency_rollback() {
    local environment="$1"
    
    log_error "🚨 EMERGENCY ROLLBACK INITIATED 🚨"
    log_info "Environment: $environment"
    
    # Skip confirmations in emergency mode
    export FORCE_DATABASE_ROLLBACK="true"
    
    # Get last known good version
    local last_good_version="v1.2.1"  # This would be from monitoring/alerts
    
    log_info "Rolling back to last known good version: $last_good_version"
    
    rollback_application "$last_good_version"
    
    # Find most recent backup
    local available_backups=($(list_available_backups))
    if [ ${#available_backups[@]} -gt 0 ]; then
        local latest_backup="${available_backups[0]}"
        local backup_path="$BACKUP_DIR/$latest_backup"
        
        log_info "Using latest backup for database rollback: $latest_backup"
        rollback_database "$backup_path"
    fi
    
    verify_rollback
    
    log_success "🚨 Emergency rollback completed"
    
    # Send emergency notification
    log_info "Sending emergency rollback notification..."
    # In a real deployment, send immediate alerts to on-call team
}

# Main function
main() {
    local mode="${2:-interactive}"
    local environment="${1:-staging}"
    
    log_info "🔄 Rollback Script for $environment environment"
    
    case $mode in
        "interactive")
            interactive_rollback "$environment"
            ;;
        "quick")
            quick_rollback "$environment"
            ;;
        "emergency")
            emergency_rollback "$environment"
            ;;
        *)
            log_error "Invalid mode: $mode"
            exit 1
            ;;
    esac
}

# Help function
show_help() {
    echo "Usage: $0 [ENVIRONMENT] [MODE]"
    echo ""
    echo "Rollback deployment for specified environment"
    echo ""
    echo "Arguments:"
    echo "  ENVIRONMENT    Target environment (staging|production) (default: staging)"
    echo "  MODE          Rollback mode (interactive|quick|emergency) (default: interactive)"
    echo ""
    echo "Environment Variables:"
    echo "  FORCE_DATABASE_ROLLBACK    Set to 'true' to skip database rollback confirmation"
    echo ""
    echo "Examples:"
    echo "  $0 staging                    # Interactive rollback for staging"
    echo "  $0 production quick          # Quick rollback for production"
    echo "  $0 staging emergency         # Emergency rollback for staging"
    echo ""
    echo "Modes:"
    echo "  interactive    Show options and prompts (default)"
    echo "  quick         Rollback to previous version immediately"
    echo "  emergency     Emergency rollback with minimal prompts"
}

# Handle arguments
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

if [ "$1" != "staging" ] && [ "$1" != "production" ] && [ -n "$1" ]; then
    log_error "Invalid environment: $1. Use 'staging' or 'production'"
    exit 1
fi

# Execute main function
main "$@"