#!/bin/bash

# Database reset script for development

set -e

echo "🔄 Resetting development database..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not found in environment"
    echo "Please make sure .env file exists with DATABASE_URL"
    exit 1
fi

# Reset Prisma migrations and database
echo "📝 Resetting Prisma migrations..."
npx prisma migrate reset --force

# Seed the database
echo "🌱 Seeding database with fresh data..."
npm run db:seed

echo "✅ Database reset complete!"
echo "🎯 Database is now ready with fresh seed data."