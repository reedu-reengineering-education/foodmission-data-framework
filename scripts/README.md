# Database Scripts

This directory contains database management scripts for the FOODMISSION Data Framework.

## Scripts Overview

### Seeding Scripts

- **`seed-dev.ts`** - Enhanced seeding for development environment with comprehensive test data
- **`seed-test.ts`** - Minimal, predictable seeding for automated testing

### Migration Scripts

- **`migration-utils.ts`** - Data migration utilities for schema changes and data transformations

### Backup & Restore Scripts

- **`db-backup.sh`** - Database backup utility with multiple backup types
- **`db-restore.sh`** - Database restore utility with interactive selection

### Development Scripts

- **`dev-setup.sh`** - Complete development environment setup
- **`db-reset.sh`** - Quick database reset for development

## Quick Reference

```bash
# Development setup
npm run dev:setup

# Seeding
npm run db:seed          # Standard seeding
npm run db:seed:dev      # Development seeding
npm run db:seed:test     # Test seeding

# Backup & Restore
npm run db:backup        # Create backup
npm run db:restore       # List/restore backups

# Migrations
npm run migrate list     # List migrations
npm run migrate run 001  # Run migration

# Database reset
npm run dev:reset        # Reset with fresh data
```

## Environment Variables

All scripts support these environment variables:

```bash
DATABASE_NAME=foodmission_dev
DATABASE_USER=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_URL=postgresql://user:pass@host:port/db
```

## File Permissions

Ensure shell scripts are executable:

```bash
chmod +x scripts/*.sh
```

## Documentation

See `docs/DATABASE_SEEDING_MIGRATION.md` for comprehensive documentation.