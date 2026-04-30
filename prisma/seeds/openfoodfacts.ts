import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, 'data');
const JSON_PATH = path.join(DATA_DIR, 'openfoodfacts-foods.json');

type OffRow = Record<string, unknown>;

function toOptionalString(val: unknown): string | undefined {
  if (val === undefined || val === null) return undefined;
  const normalized = String(val).trim();
  return normalized || undefined;
}

function toStrArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.filter((x) => typeof x === 'string');
  const normalized = toOptionalString(val);
  if (!normalized) return [];
  return normalized
    .split('|')
    .map((x) => x.trim())
    .filter(Boolean);
}

function toNumber(val: unknown): number | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  const n = Number(val);
  return Number.isNaN(n) ? undefined : n;
}

function toOptionalBool(val: unknown): boolean | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  return val === true || val === '1' || val === 1;
}

function toFoodUpsertData(row: OffRow, barcode: string) {
  return {
    name: toOptionalString(row.name) ?? `Product ${barcode}`,
    description: toOptionalString(row.description),
    createdBy: toOptionalString(row.createdBy) ?? 'system-seed-openfoodfacts',
    brands: toOptionalString(row.brands),
    categories: toStrArray(row.categories),
    labels: toStrArray(row.labels),
    quantity: toOptionalString(row.quantity),
    servingSize: toOptionalString(row.servingSize),
    ingredientsText: toOptionalString(row.ingredientsText),
    allergens: toStrArray(row.allergens),
    traces: toStrArray(row.traces),
    countries: toStrArray(row.countries),
    origins: toOptionalString(row.origins),
    manufacturingPlaces: toOptionalString(row.manufacturingPlaces),
    imageUrl: toOptionalString(row.imageUrl),
    imageFrontUrl: toOptionalString(row.imageFrontUrl),
    nutritionDataPer: toOptionalString(row.nutritionDataPer),
    energyKcal: toNumber(row.energyKcal),
    energyKj: toNumber(row.energyKj),
    fat: toNumber(row.fat),
    saturatedFat: toNumber(row.saturatedFat),
    transFat: toNumber(row.transFat),
    cholesterol: toNumber(row.cholesterol),
    carbohydrates: toNumber(row.carbohydrates),
    sugars: toNumber(row.sugars),
    addedSugars: toNumber(row.addedSugars),
    fiber: toNumber(row.fiber),
    proteins: toNumber(row.proteins),
    salt: toNumber(row.salt),
    sodium: toNumber(row.sodium),
    vitaminA: toNumber(row.vitaminA),
    vitaminC: toNumber(row.vitaminC),
    calcium: toNumber(row.calcium),
    iron: toNumber(row.iron),
    potassium: toNumber(row.potassium),
    magnesium: toNumber(row.magnesium),
    zinc: toNumber(row.zinc),
    nutriscoreGrade: toOptionalString(row.nutriscoreGrade),
    nutriscoreScore: toNumber(row.nutriscoreScore),
    novaGroup: toNumber(row.novaGroup),
    ecoscoreGrade: toOptionalString(row.ecoscoreGrade),
    carbonFootprint: toNumber(row.carbonFootprint),
    isVegan: toOptionalBool(row.isVegan),
    isVegetarian: toOptionalBool(row.isVegetarian),
    isPalmOilFree: toOptionalBool(row.isPalmOilFree),
    ingredientsAnalysisTags: toStrArray(row.ingredientsAnalysisTags),
    packagingTags: toStrArray(row.packagingTags),
    packagingMaterials: toStrArray(row.packagingMaterials),
    packagingRecycling: toStrArray(row.packagingRecycling),
    packagingText: toOptionalString(row.packagingText),
    completeness: toNumber(row.completeness),
  };
}

export async function seedOpenFoodFactsFromJson(
  prisma: PrismaClient,
): Promise<{ count: number; skipped: boolean }> {
  if (!fs.existsSync(JSON_PATH)) {
    console.log(
      `   ⏭️  ${JSON_PATH} not found; skipping OFF import. Run npx ts-node scripts/pull-openfoodfacts-foods.ts to generate it.`,
    );
    return { count: 0, skipped: true };
  }

  const content = fs.readFileSync(JSON_PATH, 'utf-8');
  const rows = JSON.parse(content) as OffRow[];

  if (!Array.isArray(rows)) {
    console.log(`   ⏭️  ${JSON_PATH} is not a JSON array; skipping OFF import.`);
    return { count: 0, skipped: true };
  }

  console.log(`🍎 Seeding Food from OpenFoodFacts JSON (${rows.length} rows)...`);

  for (const row of rows) {
    const barcode = toOptionalString(row.barcode) ?? '';
    if (!barcode) continue;

    const data = toFoodUpsertData(row, barcode);

    await prisma.food.upsert({
      where: { barcode },
      create: { barcode, ...data },
      update: data,
    });
  }

  console.log(`   ✅ OpenFoodFacts JSON: ${rows.length} foods upserted`);
  return { count: rows.length, skipped: false };
}
