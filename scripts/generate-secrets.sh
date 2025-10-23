#!/bin/bash

# generate-secrets.sh
# Script to generate secure secrets for microservices
# Usage: ./scripts/generate-secrets.sh [secret_type]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_header() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  $1"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

# Check if openssl is available
if ! command -v openssl &> /dev/null; then
    print_error "openssl is not installed. Please install it first."
    exit 1
fi

# Function to generate database password
generate_db_password() {
    print_header "DATABASE PASSWORD"
    local password=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    echo "Generated strong database password:"
    echo ""
    echo "  $password"
    echo ""
    print_warning "Store this password securely!"
    print_warning "Update your .env file: DB_PASSWORD=$password"
    echo ""
}

# Function to generate API keys
generate_api_keys() {
    print_header "SERVICE API KEYS"
    local key1="inventory-service-$(date +%Y%m)-$(openssl rand -hex 16)"
    local key2="orders-service-$(date +%Y%m)-$(openssl rand -hex 16)"
    local key3="products-service-$(date +%Y%m)-$(openssl rand -hex 16)"
    
    echo "Generated API keys for service-to-service authentication:"
    echo ""
    echo "  Inventory Service: $key1"
    echo "  Orders Service:    $key2"
    echo "  Products Service:  $key3"
    echo ""
    print_warning "Store these keys securely!"
    print_warning "Update your .env file:"
    echo ""
    echo "SERVICE_API_KEYS=$key1,$key2,$key3"
    echo ""
}

# Function to generate JWT secret
generate_jwt_secret() {
    print_header "JWT SECRET"
    local secret=$(openssl rand -base64 64 | tr -d "\n")
    echo "Generated JWT signing secret:"
    echo ""
    echo "  $secret"
    echo ""
    print_warning "Store this secret securely!"
    print_warning "Update your .env file: JWT_SECRET=$secret"
    echo ""
}

# Function to generate Redis password
generate_redis_password() {
    print_header "REDIS PASSWORD"
    local password=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    echo "Generated Redis password:"
    echo ""
    echo "  $password"
    echo ""
    print_warning "Store this password securely!"
    print_warning "Update your .env file: REDIS_PASSWORD=$password"
    echo ""
}

# Function to generate all secrets
generate_all_secrets() {
    print_header "GENERATING ALL SECRETS"
    echo "This will generate all secrets needed for the microservices"
    echo ""
    
    generate_db_password
    generate_redis_password
    generate_api_keys
    generate_jwt_secret
    
    print_success "All secrets generated successfully!"
    echo ""
    print_warning "IMPORTANT REMINDERS:"
    echo "  1. Update your .env file with these secrets"
    echo "  2. NEVER commit .env file to version control"
    echo "  3. Rotate secrets regularly (see docs/SECRETS_MANAGEMENT.md)"
    echo "  4. Use Docker secrets in production"
    echo ""
}

# Function to show usage
show_usage() {
    echo ""
    echo "Usage: $0 [secret_type]"
    echo ""
    echo "Available secret types:"
    echo "  db          - Generate database password"
    echo "  redis       - Generate Redis password"
    echo "  api         - Generate service API keys"
    echo "  jwt         - Generate JWT signing secret"
    echo "  all         - Generate all secrets (default)"
    echo ""
    echo "Examples:"
    echo "  $0              # Generate all secrets"
    echo "  $0 all          # Generate all secrets"
    echo "  $0 db           # Generate only database password"
    echo "  $0 api          # Generate only API keys"
    echo ""
}

# Main script
SECRET_TYPE=${1:-all}

case "$SECRET_TYPE" in
    db|database)
        generate_db_password
        ;;
    redis)
        generate_redis_password
        ;;
    api|keys)
        generate_api_keys
        ;;
    jwt|token)
        generate_jwt_secret
        ;;
    all)
        generate_all_secrets
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        print_error "Unknown secret type: $SECRET_TYPE"
        show_usage
        exit 1
        ;;
esac

exit 0
