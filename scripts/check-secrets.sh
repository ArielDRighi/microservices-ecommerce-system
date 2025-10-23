#!/bin/bash

# check-secrets.sh
# Script to scan codebase for hardcoded secrets
# Usage: ./scripts/check-secrets.sh [directory]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# Directory to scan (default: current directory)
SCAN_DIR=${1:-.}

print_header "SCANNING FOR HARDCODED SECRETS"

echo "Scanning directory: $SCAN_DIR"
echo ""

ISSUES_FOUND=0

# Patterns to search for (matches both double and single quotes)
PATTERNS=(
    'password\s*=\s*['\''"]['\''"^]{3,}'
    'PASSWORD\s*=\s*['\''"]['\''"^]{3,}'
    'secret\s*=\s*['\''"]['\''"^]{3,}'
    'SECRET\s*=\s*['\''"]['\''"^]{3,}'
    'api[_-]?key\s*=\s*['\''"]['\''"^]{8,}'
    'API[_-]?KEY\s*=\s*['\''"]['\''"^]{8,}'
    'token\s*=\s*['\''"]['\''"^]{10,}'
    'TOKEN\s*=\s*['\''"]['\''"^]{10,}'
    'jwt[_-]?secret\s*=\s*['\''"]['\''"^]{10,}'
    'JWT[_-]?SECRET\s*=\s*['\''"]['\''"^]{10,}'
    'db[_-]?password\s*=\s*['\''"]['\''"^]{3,}'
    'DB[_-]?PASSWORD\s*=\s*['\''"]['\''"^]{3,}'
)

# Exclude patterns (safe examples and placeholders)
EXCLUDE_PATTERNS=(
    'CHANGEME'
    'YOUR_SECRET_HERE'
    'EXAMPLE'
    'PLACEHOLDER'
    'TODO'
    'FIXME'
    'XXX'
    'password.*=.*""'
    'password.*=.*nil'
    '\$\{.*\}'
    ':-}'
    'DB_PASSWORD:-'
    'TEST_DB_PASSWORD:-'
)

# Directories to exclude
EXCLUDE_DIRS=(
    'node_modules'
    'vendor'
    '.git'
    'bin'
    'dist'
    'build'
    '.next'
    'coverage'
)

# File extensions to scan
INCLUDE_FILES=(
    '*.go'
    '*.ts'
    '*.js'
    '*.jsx'
    '*.tsx'
    '*.py'
    '*.java'
    '*.rb'
    '*.php'
    '*.yml'
    '*.yaml'
    '*.json'
    '*.xml'
    '*.sql'
    '*.sh'
)

# Build exclude directories string for grep
GREP_EXCLUDE=""
for dir in "${EXCLUDE_DIRS[@]}"; do
    GREP_EXCLUDE="$GREP_EXCLUDE --exclude-dir=$dir"
done

# Build include files string for grep
GREP_INCLUDE=""
for ext in "${INCLUDE_FILES[@]}"; do
    GREP_INCLUDE="$GREP_INCLUDE --include=$ext"
done

echo "Checking for suspicious patterns..."
echo ""

# Search for each pattern
for pattern in "${PATTERNS[@]}"; do
    results=$(grep -rn $GREP_EXCLUDE $GREP_INCLUDE -iE "$pattern" "$SCAN_DIR" 2>/dev/null || true)
    
    if [ ! -z "$results" ]; then
        # Filter out safe patterns
        filtered_results=""
        while IFS= read -r line; do
            is_safe=false
            for exclude in "${EXCLUDE_PATTERNS[@]}"; do
                if echo "$line" | grep -iq "$exclude"; then
                    is_safe=true
                    break
                fi
            done
            
            if [ "$is_safe" = false ]; then
                filtered_results="$filtered_results$line\n"
            fi
        done <<< "$results"
        
        if [ ! -z "$filtered_results" ]; then
            print_error "Found potential hardcoded secrets (pattern: $pattern):"
            echo -e "$filtered_results"
            ISSUES_FOUND=$((ISSUES_FOUND + 1))
        fi
    fi
done

echo ""
print_header "CHECKING .ENV FILES IN VERSION CONTROL"

# Check if .env files are tracked by git
if command -v git &> /dev/null; then
    env_files=$(git ls-files "$SCAN_DIR" | grep -E '\.env$' 2>/dev/null || true)
    
    if [ ! -z "$env_files" ]; then
        print_error "Found .env files in version control:"
        echo "$env_files"
        echo ""
        print_warning "These files should NOT be committed!"
        print_warning "Add them to .gitignore and remove from git:"
        echo ""
        echo "  git rm --cached $env_files"
        echo "  echo '.env' >> .gitignore"
        echo ""
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    else
        print_success "No .env files in version control"
    fi
fi

echo ""
print_header "CHECKING FOR AWS KEYS"

# Check for AWS access keys (more specific pattern)
aws_keys=$(grep -rn $GREP_EXCLUDE $GREP_INCLUDE -E 'AKIA[0-9A-Z]{16}' "$SCAN_DIR" 2>/dev/null || true)

if [ ! -z "$aws_keys" ]; then
    print_error "Found potential AWS access keys:"
    echo "$aws_keys"
    echo ""
    print_warning "ROTATE THESE KEYS IMMEDIATELY!"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    print_success "No AWS access keys found"
fi

echo ""
print_header "CHECKING FOR PRIVATE KEYS"

# Check for private keys
private_keys=$(grep -rn $GREP_EXCLUDE $GREP_INCLUDE -E 'BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY' "$SCAN_DIR" 2>/dev/null || true)

if [ ! -z "$private_keys" ]; then
    print_error "Found potential private keys:"
    echo "$private_keys"
    echo ""
    print_warning "REMOVE THESE IMMEDIATELY AND ROTATE!"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    print_success "No private keys found"
fi

echo ""
print_header "SCAN SUMMARY"

if [ $ISSUES_FOUND -eq 0 ]; then
    print_success "No issues found! 🎉"
    echo ""
    echo "Your codebase appears to be free of hardcoded secrets."
    echo ""
    exit 0
else
    print_error "Found $ISSUES_FOUND potential security issues!"
    echo ""
    echo "Please review the findings above and:"
    echo "  1. Remove any hardcoded secrets"
    echo "  2. Use environment variables or Docker secrets"
    echo "  3. Rotate compromised credentials"
    echo "  4. See docs/SECRETS_MANAGEMENT.md for best practices"
    echo ""
    exit 1
fi
