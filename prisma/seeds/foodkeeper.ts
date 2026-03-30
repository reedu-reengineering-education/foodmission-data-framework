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
  tips: string;
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

  let created = 0;
  let skipped = 0;
  let errors = 0;

  const productsToProcess = limit ? data.products.slice(0, limit) : data.products;

  console.log(
    `\n🌱 ${dryRun ? '[DRY RUN] ' : ''}Seeding ${productsToProcess.length} shelf life records...`,
  );

  for (const product of productsToProcess) {
    try {
      if (skipExisting && !dryRun) {
        const existing = await prisma.foodShelfLife.findUnique({
          where: { foodKeeperProductId: product.id },
        });
        if (existing) {
          skipped++;
          continue;
        }
      }

      const category = categoryMap.get(product.categoryId);

      if (dryRun) {
        console.log(
          `  Would create: ${product.name} (${category?.name ?? 'Unknown'})`,
        );
        created++;
        continue;
      }

      await prisma.foodShelfLife.upsert({
        where: { foodKeeperProductId: product.id },
        update: {
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
          tips: product.tips,
        },
        create: {
          foodKeeperProductId: product.id,
          foodKeeperCategoryId: product.categoryId,
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
          tips: product.tips,
        },
      });
      created++;

      if (created % 25 === 0) {
        console.log(`   ⏳ ${created}/${productsToProcess.length} records created...`);
      }
    } catch (error) {
      console.error(`   ❌ Error seeding product ${product.id}: ${error}`);
      errors++;
    }
  }

  console.log(`\n✅ FoodKeeper seeding complete:`);
  console.log(`   📥 Created: ${created}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);

  return { created, skipped, errors };
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
