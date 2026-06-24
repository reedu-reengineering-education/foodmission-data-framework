#!/bin/bash

# Development setup script for FOODMISSION Data Framework

set -e

echo "🚀 Setting up FOODMISSION Data Framework development environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start services
echo "📦 Starting Docker services..."
docker compose -f docker-compose.yml up -d postgres valkey

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker compose -f docker-compose.yml exec postgres pg_isready -U postgres; do
    sleep 2
done

# Install dependencies
echo "📚 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🗄️ Running database migrations..."
npx prisma migrate deploy

# Seed the database
echo "🌱 Seeding database with initial data..."
npm run db:seed

echo "✅ Development environment setup complete!"
echo ""
echo "🎯 Next steps:"
echo "  - Run 'npm run start:dev' to start the development server"
echo "  - Open http://localhost:3000 to access the API"
echo "  - Run 'npm test' to run the test suite"
echo ""
echo "🔧 Useful commands:"
echo "  - npm run db:studio    # Open Prisma Studio"
echo "  - npm run db:reset     # Reset database"
echo "  - npm run lint         # Run ESLint"
echo "  - npm run format       # Format code with Prettier"