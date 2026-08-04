import * as fs from 'node:fs';
import * as path from 'node:path';
import { ContentLevel, PrismaClient } from '@prisma/client';

export interface FoodFactSeedRow {
  code: string;
  topicCode: string;
  body: string;
  source: string | null;
  level: ContentLevel | string;
  health?: boolean;
  foodChoice?: boolean;
  foodWaste?: boolean;
}

function catalogJsonPath(fileName: string): string {
  return path.join(
    process.cwd(),
    'prisma',
    'seeds',
    'data',
    'catalog',
    fileName,
  );
}

export function loadCatalogJson<T>(fileName: string): T[] {
  const filePath = catalogJsonPath(fileName);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Catalog JSON not found: ${filePath}`);
    return [];
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as T[];
}

export async function seedFoodFacts(prisma: PrismaClient) {
  console.log('📘 Seeding food facts...');
  const rows = loadCatalogJson<FoodFactSeedRow>('food-facts.en.json');
  if (rows.length === 0) {
    console.log('   ⏭️  No food facts to seed');
    return { seeded: 0 };
  }

  const topics = await prisma.topic.findMany({ select: { id: true, code: true } });
  const topicByCode = new Map(topics.map((t) => [t.code, t.id]));

  let seeded = 0;
  let skipped = 0;

  for (const row of rows) {
    const topicId = topicByCode.get(row.topicCode);
    if (!topicId) {
      console.warn(`   ⚠️  Unknown topic ${row.topicCode} for ${row.code}`);
      skipped += 1;
      continue;
    }

    await prisma.foodFact.upsert({
      where: { code: row.code },
      update: {
        topicId,
        body: row.body,
        source: row.source,
        level: row.level as ContentLevel,
        health: row.health ?? false,
        foodChoice: row.foodChoice ?? false,
        foodWaste: row.foodWaste ?? false,
        available: true,
      },
      create: {
        code: row.code,
        topicId,
        body: row.body,
        source: row.source,
        level: row.level as ContentLevel,
        health: row.health ?? false,
        foodChoice: row.foodChoice ?? false,
        foodWaste: row.foodWaste ?? false,
        available: true,
      },
    });
    seeded += 1;
  }

  console.log(`✅ Upserted ${seeded} food facts (${skipped} skipped)`);
  return { seeded, skipped };
}
