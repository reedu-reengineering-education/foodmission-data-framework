# Database Scripts

This directory contains database management scripts for the FOODMISSION Data Framework.

## Scripts Overview

### Seeding Scripts

- **`seed-dev.ts`** — OFF JSON + core users + extra dev users / food products from fixtures
- **`seed-test.ts`** — Minimal deterministic users + barcode food products for CI (`npm run db:seed:test`)
- **`seed-prod.ts`** — Production-oriented pipeline: NEVO (create-only) → OFF JSON → recipes → FoodKeeper → shelf-life links (`npm run db:seed:prod`)
- **`seed-nevo.ts`** — Standalone NEVO CSV → `generic_foods` (create-only); also runnable as CLI
- **`seed-prod-nevo.ts`** — NEVO import then recipe seeding (subset prod workflow)
- **`seed-food-products-only.ts`** — **Wipes all `food_products`** then loads `openfoodfacts-foods.json` only (`npm run db:seed:food-products`); destructive — use only when you intend to replace the catalog

### Migration Scripts

- **`migration-utils.ts`** — Custom data migrations (separate from `prisma migrate`); CLI via `npm run migrate`

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

- Root [README.md](../README.md) — setup, migrations, and `npm run db:*` commands.
- [prisma/seed.ts](../prisma/seed.ts) — main database seed entrypoint.
