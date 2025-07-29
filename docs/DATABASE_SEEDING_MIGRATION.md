# Database Seeding and Migration Guide

This document provides comprehensive information about the database seeding and migration utilities for the FOODMISSION Data Framework.

## Overview

The FOODMISSION Data Framework includes a robust set of tools for:

- Database seeding with sample data for different environments
- Data migration utilities for schema changes
- Database backup and restore operations
- Environment-specific data management

## Directory Structure

```
prisma/
├── seed.ts                 # Main seeding script
├── seeds/
│   ├── categories.ts       # Food category seed data
│   ├── foods.ts           # Food item seed data
│   └── users.ts           # User and preferences seed data
scripts/
├── seed-dev.ts            # Development environment seeding
├── seed-test.ts           # Test environment seeding
├── migration-utils.ts     # Data migration utilities
├── db-backup.sh          # Database backup script
└── db-restore.sh         # Database restore script
```

## Seeding System

### Basic Seeding

The basic seeding system provides essential data for all environments:

```bash
# Run standard seeding
npm run db:seed
```

This creates:

- 10 food categories (Fruits, Vegetables, Dairy, etc.)
- 20+ sample food items with barcodes
- 5 sample users with preferences

### Development Environment Seeding

Enhanced seeding for development with additional test data:

```bash
# Run development seeding
npm run db:seed:dev
```

Additional features:

- Extended food catalog with edge cases
- Test users with various preference combinations
- Foods with and without barcodes/OpenFoodFacts IDs
- Users with complex dietary restrictions

### Test Environment Seeding

Minimal, predictable data for automated testing:

```bash
# Run test seeding
npm run db:seed:test
```

Features:

- Minimal, consistent data set
- Predictable IDs and values
- Designed for automated test reliability

## Migration System

### Available Commands

```bash
# List available migrations
npm run migrate list

# Run a specific migration
npm run migrate run 001

# Rollback a specific migration
npm run migrate rollback 001
```

### Creating Custom Migrations

Add new migrations to the `MigrationManager` class in `scripts/migration-utils.ts`:

```typescript
{
  version: '003',
  name: 'your_migration_name',
  description: 'Description of what this migration does',
  up: async (prisma: PrismaClient) => {
    // Migration logic here
  },
  down: async (prisma: PrismaClient) => {
    // Rollback logic here
  },
}
```

## Backup and Restore System

### Backup Operations

```bash
# Create full backup (default)
npm run db:backup
npm run db:backup:full

# Create data-only backup
npm run db:backup:data

# Create schema-only backup
npm run db:backup:schema

# Create all types of backups
npm run db:backup:all

# List existing backups
./scripts/db-backup.sh list

# Clean up old backups (keep last 10)
./scripts/db-backup.sh cleanup
```

### Restore Operations

```bash
# List available backups
npm run db:restore

# Restore from latest full backup
npm run db:restore:latest

# Interactive backup selection
npm run db:restore:interactive

# Restore from specific file
./scripts/db-restore.sh file backups/backup_file.sql.gz

# Create fresh database with migrations
./scripts/db-restore.sh fresh
```

## Environment Configuration

### Environment Variables

The scripts support the following environment variables:

```bash
# Database connection
DATABASE_NAME=foodmission_dev    # Database name
DATABASE_USER=postgres           # Database user
DATABASE_HOST=localhost          # Database host
DATABASE_PORT=5432              # Database port

# For Docker environments
DATABASE_URL=postgresql://user:pass@host:port/db
```

### Docker Integration

When using Docker Compose:

```bash
# Start services and seed
npm run dev:setup

# Reset database with fresh seed data
npm run dev:reset
```

## Data Structure

### Food Categories

Standard categories included in all environments:

- Fruits
- Vegetables
- Dairy
- Grains
- Proteins
- Beverages
- Snacks
- Condiments
- Frozen Foods
- Bakery

### Sample Foods

Each environment includes foods with:

- Unique names and descriptions
- Category associations
- Barcodes (where applicable)
- OpenFoodFacts IDs (for integration testing)
- Creation timestamps and metadata

### User Data

Sample users include:

- Keycloak integration IDs
- Email addresses and names
- Dietary restrictions (vegetarian, vegan, keto, etc.)
- Allergies (nuts, dairy, gluten, etc.)
- Preferred food categories

## Best Practices

### Development Workflow

1. **Initial Setup**: Use `npm run dev:setup` for complete environment setup
2. **Regular Development**: Use `npm run db:seed:dev` for enhanced test data
3. **Testing**: Use `npm run db:seed:test` for consistent test data
4. **Backup Before Changes**: Always backup before major schema changes

### Production Considerations

1. **Never use development seeds in production**
2. **Always backup before migrations**
3. **Test migrations on staging first**
4. **Use schema-only backups for structure changes**

### Testing Guidelines

1. **Use test seeding for unit tests**
2. **Reset database between test suites**
3. **Use predictable test data**
4. **Avoid dependencies on development seed data**

## Troubleshooting

### Common Issues

**Seeding fails with constraint errors:**

```bash
# Reset database and try again
npm run db:migrate:reset
npm run db:seed
```

**Backup fails with permission errors:**

```bash
# Check PostgreSQL permissions
# Ensure user has backup privileges
```

**Restore fails with version mismatch:**

```bash
# Use schema-only backup for structure
# Then seed with appropriate data
```

### Debugging

Enable verbose output:

```bash
# For seeding
DEBUG=* npm run db:seed:dev

# For migrations
npm run migrate list  # Check available migrations
```

## Security Considerations

1. **Backup files contain sensitive data** - store securely
2. **Development seeds use placeholder data** - never real user data
3. **Test environment is isolated** - no production data
4. **Migration scripts should be reviewed** - potential data loss

## Performance Tips

1. **Use compressed backups** - saves storage space
2. **Regular cleanup** - remove old backups automatically
3. **Batch operations** - seed data in transactions
4. **Index considerations** - migrations may affect performance

## Integration with CI/CD

### GitHub Actions Integration

The seeding system integrates with CI/CD pipelines:

```yaml
# Example CI step
- name: Setup test database
  run: |
    npm run db:migrate:deploy
    npm run db:seed:test
```

### Local Development

```bash
# Complete development setup
./scripts/dev-setup.sh

# Quick database reset
./scripts/db-reset.sh
```

## Support and Maintenance

### Regular Maintenance

1. **Weekly backup cleanup**: Remove old backup files
2. **Monthly seed data review**: Update sample data as needed
3. **Quarterly migration review**: Clean up old migration scripts

### Monitoring

- Monitor backup file sizes and success rates
- Track seeding performance and failures
- Review migration execution times

For additional support, refer to the main project documentation or contact the development team.
