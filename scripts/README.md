# Scripts

This directory contains development, database, CI, and utility scripts used by
the FOODMISSION Data Framework.

## Main Scripts

### Database and Seeding

- **`prisma/seed.ts`** — Primary entry via `npm run db:seed` / `db:seed:prod` (uses `scripts/seeds/prod/genericFoods.ts`)
- **`seeds/prod/genericFoods.ts`** — NEVO nutrition CSV → `generic_foods` (English only; skips if data already exists)
- **`seeds/seed-translations.ts`** — DB translations step (`npm run db:translations`): NEVO overlays + future translation sources
- **`seeds/import-nevo-translations.ts`** — NEVO translations CSV → `entity_translations` (used by `db:translations`; also `db:import:nevo-translations`)
- **`seed-test.ts`** — Minimal deterministic users + barcode food products for CI (`npm run db:seed:test`)
- **`seed-food-products-only.ts`** — **Wipes all `food_products`** then loads `openfoodfacts-foods.json` only (`npm run db:seed:foods`); destructive
- **`seed-prod.ts`** — Legacy prod pipeline (OFF + recipes + shelf-life); prefer `npm run db:seed:prod`

### NEVO deployment (new database)

English food metadata and locale overlays are loaded in **three steps**:

```bash
# 1. Schema
npm run db:migrate:deploy   # or db:migrate locally

# 2. English NEVO foods (+ other prod seed data). Skips if data already exists.
npm run db:seed:prod          # production seed
# or: npm run db:seed         # development (includes dev fixtures)
# optional: -- --force        # re-import even when rows exist

# 3. Non-English food name/group/remark/synonym overlays (~40k rows). Skips if already present.
npm run db:translations -- --dry-run   # optional preview
npm run db:translations
# optional: -- --force                 # re-import even when rows exist
```

**What each step writes**

| Step | Command | Table | Locales |
| --- | --- | --- | --- |
| Seed | `db:seed` / `db:seed:prod` | `generic_foods` | English canonical fields only |
| Translations | `db:translations` | `entity_translations` | `nl`, `no`, `de`, `el`, `es`, `it`, `pl`, `sl` |

**Updating translations later**

- Bulk NEVO file refresh → `npm run db:translations -- --force`
- Low-level NEVO-only import → `npm run db:import:nevo-translations`
- Vendor spreadsheet edits → `npm run i18n:export:db` / `i18n:import:db`

**Data files**

- `prisma/seeds/data/nevo/NEVO2025_v9.0.csv` — nutrition + English labels
- `prisma/seeds/data/nevo/nevo_translations.csv` — all non-English display strings

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
npm run db:seed:prod
npm run db:translations
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
