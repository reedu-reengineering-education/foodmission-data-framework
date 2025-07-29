#!/bin/bash

# Comprehensive Test Runner Script
# This script runs all types of tests with proper setup and teardown

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_DB_URL="postgresql://postgres:password@localhost:5432/foodmission_test_db"
COVERAGE_THRESHOLD=80

echo -e "${BLUE}🧪 FOODMISSION Data Framework Test Suite${NC}"
echo "========================================"

# Function to print section headers
print_section() {
    echo -e "\n${BLUE}$1${NC}"
    echo "$(printf '=%.0s' {1..50})"
}

# Function to check if database is running
check_database() {
    print_section "🔍 Checking Database Connection"
    
    if ! pg_isready -h localhost -p 5432 -U postgres > /dev/null 2>&1; then
        echo -e "${RED}❌ PostgreSQL is not running. Please start PostgreSQL first.${NC}"
        echo "You can start it with: docker-compose -f docker-compose.dev.yml up -d postgres"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Database connection OK${NC}"
}

# Function to setup test database
setup_test_db() {
    print_section "🗄️ Setting up Test Database"
    
    export DATABASE_URL=$TEST_DB_URL
    
    # Create test database if it doesn't exist
    createdb foodmission_test_db 2>/dev/null || true
    
    # Run migrations
    echo "Running database migrations..."
    npx prisma migrate deploy --schema=./prisma/schema.prisma
    
    # Seed test data
    echo "Seeding test data..."
    npm run db:seed:test
    
    echo -e "${GREEN}✅ Test database setup complete${NC}"
}

# Function to run unit tests
run_unit_tests() {
    print_section "🔬 Running Unit Tests"
    
    npm run test:unit -- --verbose --passWithNoTests
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Unit tests passed${NC}"
    else
        echo -e "${RED}❌ Unit tests failed${NC}"
        exit 1
    fi
}

# Function to run integration tests
run_integration_tests() {
    print_section "🔗 Running Integration Tests"
    
    export DATABASE_URL=$TEST_DB_URL
    npm run test:integration -- --verbose --passWithNoTests
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Integration tests passed${NC}"
    else
        echo -e "${RED}❌ Integration tests failed${NC}"
        exit 1
    fi
}

# Function to run e2e tests
run_e2e_tests() {
    print_section "🌐 Running E2E Tests"
    
    export DATABASE_URL=$TEST_DB_URL
    npm run test:e2e -- --verbose --passWithNoTests
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ E2E tests passed${NC}"
    else
        echo -e "${RED}❌ E2E tests failed${NC}"
        exit 1
    fi
}

# Function to run all tests with coverage
run_all_tests_with_coverage() {
    print_section "📊 Running All Tests with Coverage"
    
    export DATABASE_URL=$TEST_DB_URL
    npm run test:all
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ All tests passed${NC}"
    else
        echo -e "${RED}❌ Some tests failed${NC}"
        exit 1
    fi
}

# Function to check coverage thresholds
check_coverage() {
    print_section "📈 Checking Coverage Thresholds"
    
    if [ -f "test/coverage-check.js" ]; then
        node test/coverage-check.js
    else
        echo -e "${YELLOW}⚠️ Coverage check script not found${NC}"
    fi
}

# Function to cleanup
cleanup() {
    print_section "🧹 Cleaning Up"
    
    # Clean up test data
    export DATABASE_URL=$TEST_DB_URL
    npx prisma migrate reset --force --skip-seed 2>/dev/null || true
    
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

# Main execution
main() {
    local test_type=${1:-"all"}
    
    case $test_type in
        "unit")
            check_database
            run_unit_tests
            ;;
        "integration")
            check_database
            setup_test_db
            run_integration_tests
            cleanup
            ;;
        "e2e")
            check_database
            setup_test_db
            run_e2e_tests
            cleanup
            ;;
        "coverage")
            check_database
            setup_test_db
            run_all_tests_with_coverage
            check_coverage
            cleanup
            ;;
        "all"|*)
            check_database
            setup_test_db
            run_unit_tests
            run_integration_tests
            run_e2e_tests
            cleanup
            ;;
    esac
    
    echo -e "\n${GREEN}🎉 Test suite completed successfully!${NC}"
}

# Handle script arguments
case ${1:-} in
    -h|--help)
        echo "Usage: $0 [test_type]"
        echo ""
        echo "Test types:"
        echo "  unit         Run only unit tests"
        echo "  integration  Run only integration tests"
        echo "  e2e          Run only e2e tests"
        echo "  coverage     Run all tests with coverage report"
        echo "  all          Run all test types (default)"
        echo ""
        echo "Examples:"
        echo "  $0           # Run all tests"
        echo "  $0 unit      # Run only unit tests"
        echo "  $0 coverage  # Run all tests with coverage"
        exit 0
        ;;
    *)
        main "$1"
        ;;
esac