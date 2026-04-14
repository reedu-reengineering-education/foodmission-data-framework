import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, 'data');
const DATA_PATH = path.join(DATA_DIR, 'foodkeeper-data.json');

interface FoodKeeperCategory {
  id: number;
  name: string;
  defaultStorageType: string;
}

interface FoodKeeperProduct {
  id: number;
  categoryId: number;
  name: string;
  keywords: string[];
  pantryMinDays: number | null;
  pantryMaxDays: number | null;
  refrigeratorMinDays: number | null;
  refrigeratorMaxDays: number | null;
  refrigeratorAfterOpeningDays: number | null;
  freezerMinDays: number | null;
  freezerMaxDays: number | null;
}

interface FoodKeeperData {
  categories: FoodKeeperCategory[];
  products: FoodKeeperProduct[];
}

interface SeedOptions {
  limit?: number;
  dryRun?: boolean;
  skipExisting?: boolean;
}

function loadFoodKeeperData(): FoodKeeperData {
  if (!fs.existsSync(DATA_PATH)) {
    throw new Error(
      `FoodKeeper data file not found: ${DATA_PATH}. Place foodkeeper-data.json in prisma/seeds/data/`,
    );
  }
  const content = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(content) as FoodKeeperData;
}

export async function seedFoodKeeper(
  prisma: PrismaClient,
  options: SeedOptions = {},
): Promise<{ created: number; skipped: number; errors: number }> {
  const { limit, dryRun = false, skipExisting = true } = options;

  console.log('📦 Loading FoodKeeper shelf life data...');

  const data = loadFoodKeeperData();
  const categoryMap = new Map<number, FoodKeeperCategory>();
  for (const cat of data.categories) {
    categoryMap.set(cat.id, cat);
  }

  console.log(`   📄 ${data.products.length} products`);
  console.log(`   📁 ${data.categories.length} categories`);

  const productsToProcess = limit
    ? data.products.slice(0, limit)
    : data.products;

  console.log(
    `\n🌱 ${dryRun ? '[DRY RUN] ' : ''}Seeding ${productsToProcess.length} shelf life records...`,
  );

  if (dryRun) {
    for (const product of productsToProcess) {
      const category = categoryMap.get(product.categoryId);
      console.log(
        `  Would create: ${product.name} (${category?.name ?? 'Unknown'})`,
      );
    }
    return { created: productsToProcess.length, skipped: 0, errors: 0 };
  }

  const rows = productsToProcess.map((product) => {
    const category = categoryMap.get(product.categoryId);
    return {
      foodKeeperProductId: product.id,
      name: product.name,
      keywords: product.keywords,
      categoryName: category?.name ?? null,
      defaultStorageType: category?.defaultStorageType ?? null,
      pantryMinDays: product.pantryMinDays,
      pantryMaxDays: product.pantryMaxDays,
      pantryAfterOpeningDays: null,
      refrigeratorMinDays: product.refrigeratorMinDays,
      refrigeratorMaxDays: product.refrigeratorMaxDays,
      refrigeratorAfterOpeningDays: product.refrigeratorAfterOpeningDays,
      freezerMinDays: product.freezerMinDays,
      freezerMaxDays: product.freezerMaxDays,
    };
  });

  if (skipExisting) {
    // Single batch insert — existing records (duplicate foodKeeperProductId) are silently skipped
    const countBefore = await prisma.foodShelfLife.count();
    await prisma.foodShelfLife.createMany({ data: rows, skipDuplicates: true });
    const countAfter = await prisma.foodShelfLife.count();
    const created = countAfter - countBefore;
    const skipped = productsToProcess.length - created;

    console.log(`\n✅ FoodKeeper seeding complete:`);
    console.log(`   📥 Created: ${created}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: 0`);

    return { created, skipped, errors: 0 };
  }

  // --force: upsert all in a single transaction batch
  let errors = 0;
  try {
    await prisma.$transaction(
      rows.map((row) =>
        prisma.foodShelfLife.upsert({
          where: { foodKeeperProductId: row.foodKeeperProductId },
          update: row,
          create: row,
        }),
      ),
    );
  } catch (error) {
    console.error(`   ❌ Error seeding: ${error}`);
    errors++;
  }

  const created = errors === 0 ? productsToProcess.length : 0;

  console.log(`\n✅ FoodKeeper seeding complete:`);
  console.log(`   📥 Created/Updated: ${created}`);
  console.log(`   ⏭️  Skipped: 0`);
  console.log(`   ❌ Errors: ${errors}`);

  return { created, skipped: 0, errors };
}

function parseSeedArgs(args: string[]): SeedOptions {
  const options: SeedOptions = {
    dryRun: args.includes('--dry-run'),
    skipExisting: !args.includes('--force'),
  };
  const limitArg = args.find((a) => a.startsWith('--limit='));
  if (limitArg) {
    const n = parseInt(limitArg.split('=')[1], 10);
    if (!isNaN(n)) options.limit = n;
  }
  return options;
}

async function main() {
  const options = parseSeedArgs(process.argv.slice(2));
  const prisma = new PrismaClient();

  try {
    console.log('=====================================');
    console.log('📦 FoodKeeper Shelf Life Seeding');
    console.log('=====================================');
    console.log(`Options: ${JSON.stringify(options)}`);
    console.log('');

    const result = await seedFoodKeeper(prisma, options);

    if (result.errors > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void main();
}
