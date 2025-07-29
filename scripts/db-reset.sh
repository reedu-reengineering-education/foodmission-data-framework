#!/bin/bash

# Database reset script for development

set -e

echo "🔄 Resetting development database..."

# Reset Prisma migrations and database
echo "📝 Resetting Prisma migrations..."
npx prisma migrate reset --force

# Seed the database
echo "🌱 Seeding database with fresh data..."
npm run db:seed

echo "✅ Database reset complete!"
echo "🎯 Database is now ready with fresh seed data."