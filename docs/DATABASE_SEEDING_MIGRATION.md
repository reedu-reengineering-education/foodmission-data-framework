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

## TheMealDB Recipe Integration

The framework includes a comprehensive recipe dataset imported from TheMealDB and enriched
with nutritional data from the NEVO Dutch Food Composition Database and OpenFoodFacts (packaged products).

### Data Sources

| Source | Description | Records | URL |
|--------|-------------|---------|-----|
| [OpenFoodFacts](https://openfoodfacts.org/) (OFF) | Open food database (barcode-linked packaged products) | On-demand via `npx ts-node scripts/pull-openfoodfacts-foods.ts` | https://openfoodfacts.org/ |
| [TheMealDB](https://www.themealdb.com/api.php) | Free recipe API with images and videos | 598 recipes | https://www.themealdb.com/api.php |
| [NEVO](https://nevo-online.rivm.nl/) | Dutch Food Composition Database (generic foods) | 2,152 foods | https://nevo-online.rivm.nl/ |

### Data Pipeline

The integration uses three external data sources. OFF and NEVO populate the **Food** and **FoodCategory** tables first; TheMealDB recipes then link ingredients to those records.

```
┌─────────────────────┐     ┌─────────────────────────┐     ┌──────────────────┐
│  OpenFoodFacts API  │────▶│  openfoodfacts-foods.csv │────▶│  Seed (OFF CSV)   │
│  (pull script)      │     │  (optional)              │     │  → Food table     │
└─────────────────────┘     └─────────────────────────┘     └────────┬─────────┘
                                                                      │
┌─────────────────────┐     ┌─────────────────────────┐     ┌────────▼─────────┐
│  NEVO CSV           │────▶│  Seed (foodCategories)   │────▶│  FoodCategory     │
│  (NEVO2025_v9.0.csv)│     │  → FoodCategory table   │     │  table            │
└─────────────────────┘     └─────────────────────────┘     └────────┬─────────┘
                                                                      │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────▼──────────┐
│  TheMealDB API  │───▶│  CSV Extraction │───▶│  Ingredient Mapping             │
│  (598 recipes)  │    │  (recipes.csv,   │    │  → NEVO (FoodCategory) + OFF    │
└─────────────────┘    │   ingredients)   │    │    (Food by barcode/name)        │
                       └─────────────────┘    └─────────────────────┬──────────┘
                                                                      │
                       ┌─────────────────┐    ┌───────────────────────▼──────────┐
                       │  themealdb-data │◀───│  build-themealdb-data             │
                       │  .json          │    │  (recipes + mappings + enriched)  │
                       └────────┬────────┘    └───────────────────────────────────┘
                                │
                       ┌────────▼────────┐
                       │  Prisma Seed    │────▶  Recipe + RecipeIngredient
                       │  (themealdb.ts) │      (links to Food / FoodCategory)
                       └─────────────────┘
```

**OpenFoodFacts (OFF)**  
- Script `scripts/pull-openfoodfacts-foods.ts` (run with `npx ts-node scripts/pull-openfoodfacts-foods.ts`) fetches products by barcode from the OFF API and writes `openfoodfacts-foods.csv`.  
- Seed reads only the CSV (`openfoodfacts-from-csv.ts`); no API calls during seed. If the CSV is missing, no OFF products are loaded.

**NEVO**  
- Food categories are seeded from `prisma/seeds/data/nevo/NEVO2025_v9.0.csv` into the **FoodCategory** table.

**TheMealDB + ingredient mapping**  
- **Phase 1 – Data Extraction** (`scripts/extract-themealdb.ts`): Fetches all TheMealDB categories and recipe details; outputs `themealdb-recipes.csv`, `themealdb-ingredients.csv`.  
- **Phase 2 – Ingredient Mapping** (`scripts/map-ingredients-to-foods.ts`): Maps 836 unique TheMealDB ingredients to **NEVO** (FoodCategory) and/or **OpenFoodFacts** (Food by barcode or name). Outputs `ingredient-food-mapping.csv`. Coverage: ~74% mapped to NEVO; additional rows can map to OFF.  
- **Phase 3 – Build** (`npx ts-node scripts/build-themealdb-data.ts`): Produces single `themealdb-data.json` (recipes + ingredients + mappings + enriched nutrition/allergens/sustainability).  
- **Phase 4 – Database Seeding** (`prisma/seeds/themealdb.ts`): Creates Recipe and RecipeIngredient records; resolves each ingredient’s mapping to `FoodCategory.id` (NEVO) or `Food.id` (OFF). Sets `source: 'themealdb'`, `isPublic: true`, `userId: null`.

### Seed order (OpenFoodFacts and NEVO first)

Recipe seeding depends on **Food** (OpenFoodFacts) and **FoodCategory** (NEVO) being present so ingredient links can be resolved. The main seed (`npm run db:seed`) runs in this order:

1. **OpenFoodFacts** – from CSV only: if `prisma/seeds/data/openfoodfacts-foods.csv` exists, it is loaded into the Food table; if not, no OFF products are seeded (run `npx ts-node scripts/pull-openfoodfacts-foods.ts` to generate the CSV; the seed does not call the OFF API).
2. **Food categories (NEVO)** – from `prisma/seeds/data/nevo/NEVO2025_v9.0.csv` into FoodCategory.
3. **TheMealDB recipes** – from `themealdb-data.json` (recipes + ingredients + mappings + enriched nutritionalInfo/allergens/sustainability). Generate it with `npx ts-node scripts/build-themealdb-data.ts`.

To pre-generate the OpenFoodFacts CSV (so seeding does not call the API):

```bash
npx ts-node scripts/pull-openfoodfacts-foods.ts        # foods.ts + review CSV; only fetches barcodes not already in openfoodfacts-foods.csv
npx ts-node scripts/pull-openfoodfacts-foods.ts -- --test   # test barcode set only (no review CSV)
npx ts-node scripts/pull-openfoodfacts-foods.ts -- --force  # re-fetch all barcodes (ignore existing CSV)
```

Fetched data is stored in **`prisma/seeds/data/openfoodfacts-foods.csv`**. If that file already exists, the script fetches only barcodes that are not yet in the CSV and appends the new products, so you can pull only missing items on subsequent runs.

Barcode sources for the pull script (merged and deduped):

- **foods.ts** – `openFoodFactsBarcodes` (or test set with `--test`)
- **ingredient-mapping-review.csv** – manually confirmed OpenFoodFacts ingredients: rows with `correctedNevoCode = OFF`; `correctedMatch` is the barcode. This file is the place to add or correct OFF barcodes for recipe ingredients.

On fetch failure (e.g. network error), the script retries after 60 seconds (up to 2 retries). It does not retry when the product is not found in OpenFoodFacts (invalid barcode).

### Seeding Commands

```bash
# Full seed (OFF/NEVO/recipes in correct order)
npm run db:seed

# Seed only TheMealDB recipes (run after OFF + NEVO are seeded)
npx ts-node prisma/seeds/themealdb.ts

# Seed with limit (for testing)
npx ts-node prisma/seeds/themealdb.ts --limit=50

# Dry run (preview only)
npx ts-node prisma/seeds/themealdb.ts --dry-run

# Force re-seed existing recipes
npx ts-node prisma/seeds/themealdb.ts --force
```

### Data Files

Located in `prisma/seeds/data/`:

| File | Description | Records |
|------|-------------|---------|
| `openfoodfacts-foods.csv` | OpenFoodFacts products (optional; generated by `scripts/pull-openfoodfacts-foods.ts`) | — |
| `themealdb-data.json` | **Single file**: all recipes, ingredients, mappings, and enriched data (used by seed) | 598 recipes |
| `themealdb-recipes.csv` | Recipe metadata (source for building themealdb-data.json) | 598 |
| `themealdb-ingredients.csv` | Ingredients per recipe (source for build) | 6,331 |
| `themealdb-categories.csv` | Recipe categories (Beef, Chicken, etc.) | 27 |
| `ingredient-food-mapping.csv` | Ingredient-to-NEVO/OFF mappings (source for build) | 836 |
| `enriched-recipes.csv` | Pre-calculated nutritionalInfo, allergens, sustainability (source for build) | 598 |

To (re)build the single `themealdb-data.json` from the CSVs (e.g. after re-extracting or updating mappings):

```bash
npx ts-node scripts/build-themealdb-data.ts
```

### Ingredient Matching Algorithm

The mapping process matches TheMealDB ingredient names to **NEVO** (FoodCategory) and/or **OpenFoodFacts** (Food, by barcode or product name). For NEVO it uses:

1. **Exact Match**: Direct lookup in NEVO by name
2. **Normalized Match**: Lowercase, trim, remove plurals
3. **Fuzzy Match**: Levenshtein distance with 80% threshold
4. **Manual Review**: Low-confidence matches flagged for review; OFF barcodes can be set in `ingredient-mapping-review.csv` (`correctedNevoCode = OFF`, `correctedMatch` = barcode).

Confidence levels:
- `high`: Exact or near-exact match (distance < 0.1)
- `medium`: Good fuzzy match (distance 0.1-0.3)
- `low`: Weak match requiring verification

### Recipe Schema

Imported recipes use the following structure:

```typescript
{
  externalId: "53281",           // TheMealDB idMeal
  title: "Algerian Kefta",
  source: "themealdb",
  isPublic: true,
  userId: null,                  // System recipe
  category: "Beef",
  cuisineType: "Algerian",
  instructions: "...",
  imageUrl: "https://...",
  videoUrl: "https://...",
  tags: ["Meatballs"],
  dietaryLabels: [],
  servings: 4,
  ingredients: [
    {
      name: "Ground Beef",
      measure: "1 lb",
      order: 1,
      foodCategoryId: "uuid-of-nevo-foodcategory",  // Optional: NEVO generic food
      // OR foodId: "uuid-of-off-food" for OpenFoodFacts packaged product
      foodName: "Beef minced",
      source: "nevo",
      matchConfidence: "high"
    },
    // ...
  ]
}
```

### Ingredient Enrichment Data

Each mapped ingredient can include:

| Field | Description | Source |
|-------|-------------|--------|
| `foodId` | Link to Food record (packaged product) | OpenFoodFacts (Prisma lookup by barcode/name) |
| `foodCategoryId` | Link to FoodCategory (generic food) | NEVO (Prisma lookup by nevoCode) |
| `foodName` | NEVO/OFF food name | Mapping |
| `source` | Data source (`nevo` or `openfoodfacts`/`off`) | Mapping |
| `matchConfidence` | `high`, `medium`, `low` | Algorithm |
| `energyKcal` | Energy per 100g | NEVO (or OFF when linked to Food) |
| `protein` | Protein per 100g | NEVO / OFF |
| `fat` | Fat per 100g | NEVO / OFF |
| `carbs` | Carbohydrates per 100g | NEVO / OFF |

### Extending the Dataset

To add more recipes from TheMealDB:

1. Run extraction script: `npx ts-node scripts/extract-themealdb.ts`
2. Run ingredient mapping: `npx ts-node scripts/map-ingredients-to-foods.ts`
3. Review low-confidence mappings in `ingredient-mapping-review.csv`
4. Run seeding: `npx ts-node prisma/seeds/themealdb.ts`

To add recipes from other sources:
1. Create a new extraction script following the TheMealDB pattern
2. Ensure CSV output matches the expected schema
3. Use the ingredient mapping infrastructure for food links

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
