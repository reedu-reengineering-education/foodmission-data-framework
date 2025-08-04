#!/bin/bash

# Local CI Testing Script
# This script runs the same checks that are performed in the CI pipeline

set -e

echo "🚀 Running local CI tests..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        exit 1
    fi
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Please run this script from the project root directory${NC}"
    exit 1
fi

print_info "Installing dependencies..."
npm ci
print_status $? "Dependencies installed"

print_info "Generating Prisma client..."
npx prisma generate
print_status $? "Prisma client generated"

print_info "Running TypeScript compilation check..."
npx tsc --noEmit
print_status $? "TypeScript compilation"

print_info "Running ESLint..."
npm run lint
print_status $? "ESLint checks"

print_info "Running Prettier check..."
npx prettier --check "src/**/*.ts" "test/**/*.ts"
print_status $? "Prettier formatting"

print_info "Running unit tests..."
npm run test
print_status $? "Unit tests"

print_info "Running unit tests with coverage..."
npm run test:cov
print_status $? "Unit tests with coverage"

print_info "Building application..."
npm run build
print_status $? "Application build"

# Check if Docker is available
if command -v docker &> /dev/null; then
    print_info "Building Docker image..."
    docker build -t foodmission-data-framework:local .
    print_status $? "Docker image build"
    
    print_info "Running Docker container security scan (if Trivy is available)..."
    if command -v trivy &> /dev/null; then
        trivy image foodmission-data-framework:local
        print_status $? "Container security scan"
    else
        echo -e "${YELLOW}⚠️  Trivy not found, skipping container security scan${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Docker not found, skipping Docker build${NC}"
fi

# Check for circular dependencies
if command -v madge &> /dev/null; then
    print_info "Checking for circular dependencies..."
    npx madge --circular --extensions ts src/
    print_status $? "Circular dependency check"
else
    echo -e "${YELLOW}⚠️  Madge not found, skipping circular dependency check${NC}"
fi

# Check for unused dependencies
print_info "Checking for unused dependencies..."
npx depcheck --ignores="@types/*,eslint-*,prettier,jest,ts-*,@nestjs/cli,@nestjs/schematics" || true

# Security audit
print_info "Running security audit..."
npm audit --audit-level=moderate
print_status $? "Security audit"

# Generate OpenAPI documentation
print_info "Generating OpenAPI documentation..."
npm run docs:generate
print_status $? "OpenAPI documentation generation"

echo ""
echo -e "${GREEN}🎉 All local CI checks passed!${NC}"
echo -e "${GREEN}Your code is ready for CI pipeline.${NC}"
echo ""
echo "Next steps:"
echo "1. Commit your changes"
echo "2. Push to your branch"
echo "3. Create a pull request"
echo ""
echo "The CI pipeline will run the same checks plus:"
echo "- E2E tests with real database"
echo "- Security scanning with multiple tools"
echo "- Performance testing"
echo "- Docker multi-platform builds"