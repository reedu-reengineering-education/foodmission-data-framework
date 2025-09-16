#!/bin/bash

# CI-friendly script for generating OpenAPI documentation
# This script sets up the required environment variables and runs the docs generation

echo "🚀 Starting CI documentation generation..."

# Set NODE_ENV to test (which is allowed by the environment validation)
export NODE_ENV=test

# Set required environment variables with mock values for documentation generation
export DATABASE_URL=${DATABASE_URL:-"postgresql://mock:mock@localhost:5432/mock_db"}
export KEYCLOAK_BASE_URL=${KEYCLOAK_BASE_URL:-"http://localhost:8080"}
export KEYCLOAK_REALM=${KEYCLOAK_REALM:-"mock-realm"}
export KEYCLOAK_CLIENT_ID=${KEYCLOAK_CLIENT_ID:-"mock-client-id"}

echo "📋 Environment configured for documentation generation"
echo "   NODE_ENV: $NODE_ENV"
echo "   DATABASE_URL: $DATABASE_URL"

# Run the documentation generation
npm run docs:generate

exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo "✅ Documentation generation completed successfully!"
else
    echo "❌ Documentation generation failed with exit code $exit_code"
fi

exit $exit_code