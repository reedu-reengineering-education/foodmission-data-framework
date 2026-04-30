# Scripts

This directory contains development, database, CI, and utility scripts used by
the FOODMISSION Data Framework.

## Main Scripts

### Database and Seeding

- `seed-dev.ts` - Development seeding with richer local data
- `seed-test.ts` - Deterministic test seeding
- `seed-foods-only.ts` - Seed only food-related data
- `migration-utils.ts` - Migration helper utilities
- `db-reset.sh` - Reset local database state
- `init-test-db.sql` - Test DB bootstrap SQL

### Backup and Restore

- `db-backup.sh` - Backup utility (full/data/schema/all modes)
- `db-restore.sh` - Restore utility

### OpenAPI

- `generate-openapi.js` - Generate OpenAPI JSON
- `generate-openapi-spec.ts` - Generate OpenAPI artifacts (JSON/YAML)
- `ci-docs-generate.sh` - CI docs generation helper

### Development and CI Utilities

- `dev-setup.sh` - One-time local development setup
- `ci-local-test.sh` - Local CI-style checks
- `test-runner.sh` - Scripted test runner helper
- `manage-secrets.sh` - Secrets management helper script

## `scripts/dev/` Folder

The `scripts/dev/` folder contains meal-log analytics development utilities:

- `seed-meal-logs.ts` - Generate synthetic meal-log data for analytics testing
- `clean-meal-logs.ts` - Remove generated meal-log records
- `clean-analytics.ts` - Remove generated analytics batch/output records

These scripts are useful for repeatable local analytics testing cycles:
seed -> generate batch -> approve/publish -> verify -> clean.

## Quick Commands

```bash
# Local setup/reset
npm run dev:setup
npm run dev:reset

# Core seeding
npm run db:seed
npm run db:seed:dev
npm run db:seed:test
npm run db:seed:foods

# Meal-log analytics dev scripts
npm run db:seed:meal-logs
npm run db:clean:meal-logs
npm run db:clean:analytics

# Backup/restore
npm run db:backup
npm run db:restore

# OpenAPI
npm run docs:generate
npm run openapi:generate
```

## Documentation

- `docs/DATABASE_SEEDING_MIGRATION.md`
- `docs/analytics_instructions:.md`
- `docs/Data anonymization/`
