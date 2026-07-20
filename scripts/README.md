# Scripts

This directory contains development, database, CI, and utility scripts used by
the FOODMISSION Data Framework.

## Main Scripts

### Database and Seeding

- **`seed-dev.ts`** — OFF JSON + core users + extra dev users / food products from fixtures
- **`seed-test.ts`** — Minimal deterministic users + barcode food products for CI (`npm run db:seed:test`)
- **`seed-prod.ts`** — Production-oriented pipeline: NEVO (create-only) → OFF JSON → recipes → FoodKeeper → shelf-life links (`npm run db:seed:prod`)
- **`seed-nevo.ts`** — Standalone NEVO CSV → `generic_foods` (create-only); also runnable as CLI
- **`seed-prod-nevo.ts`** — NEVO import then recipe seeding (subset prod workflow)
- **`seed-food-products-only.ts`** — **Wipes all `food_products`** then loads `openfoodfacts-foods.json` only (`npm run db:seed:foods`); destructive — use only when you intend to replace the catalog
- **`migration-utils.ts`** - Migration helper utilities
- **`db-reset.sh`** - Reset local database state
- **`init-test-db.sql`** - Test DB bootstrap SQL

### Backup and Restore

- **`migration-utils.ts`** — Custom data migrations (separate from `prisma migrate`); CLI via `npm run migrate`
- **`db-backup.sh`** - Backup utility (full/data/schema/all modes)
- **`db-restore.sh`** - Restore utility

### OpenAPI

Shared config and document builders live in `src/docs/` (`swagger.config.ts`, `swagger.document.ts`, `swagger.generate.ts`, `swagger.artifacts.ts`).

- **`generate-openapi-spec.ts`** — writes `docs/openapi.json` and `docs/openapi.yaml` (`npm run docs:generate`)

Interactive Swagger UI: run the API and open `/api/docs` (see root `README.md` § API Documentation).

### Development and CI Utilities

- `dev-setup.sh` - One-time local development setup
- `ci-local-test.sh` - Local CI-style checks
- `test-runner.sh` - Scripted test runner helper
- `manage-secrets.sh` - Secrets management helper script

### Translations (`scripts/i18n/`)

See [`.github/CONTRIBUTING.md`](../.github/CONTRIBUTING.md) for full workflows.

| npm script | Purpose |
| --- | --- |
| `i18n:export` / `i18n:import` | Vendor handoff for UI JSON (`src/i18n/`) |
| `i18n:export:db` / `i18n:import:db` | Vendor handoff for DB `entity_translations` |
| `i18n:validate` / `i18n:validate:locales` / `i18n:missing` | Check UI translation files |

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
```

## Documentation

- `docs/DATABASE_SEEDING_MIGRATION.md`
- `docs/analytics_instructions:.md`
- `docs/Data anonymization/`
