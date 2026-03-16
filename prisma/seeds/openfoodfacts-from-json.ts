/**
 * Seed Food records from openfoodfacts-foods.json.
 *
 * Run this (or have the main seed run it) so that OpenFoodFacts data exists
 * before TheMealDB recipe seeding, when recipe ingredients link to Food (source=off).
 *
 * If the JSON file does not exist, this is a no-op.
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, 'data');
const JSON_PATH = path.join(DATA_DIR, 'openfoodfacts-foods.json');

function toStrArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.filter((x) => typeof x === 'string');
  if (val === undefined || val === null || (typeof val === 'string' && val.trim() === ''))
    return [];
  return (String(val))
    .split('|')
    .map((x) => x.trim())
    .filter(Boolean);
}

function num(val: unknown): number | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  const n = Number(val);
  return Number.isNaN(n) ? undefined : n;
}

type OffRow = Record<string, unknown>;

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
    const barcode = row.barcode != null ? String(row.barcode).trim() : '';
    if (!barcode) continue;

    const createdBy: string =
      (row.createdBy != null && String(row.createdBy).trim())
        ? String(row.createdBy).trim()
        : 'system-seed-openfoodfacts';

    const data = {
      name: (row.name != null ? String(row.name).trim() : '') || `Product ${barcode}`,
      description: row.description != null ? String(row.description).trim() || undefined : undefined,
      createdBy,
      brands: row.brands != null ? String(row.brands).trim() || undefined : undefined,
      categories: toStrArray(row.categories),
      labels: toStrArray(row.labels),
      quantity: row.quantity != null ? String(row.quantity).trim() || undefined : undefined,
      servingSize: row.servingSize != null ? String(row.servingSize).trim() || undefined : undefined,
      ingredientsText:
        row.ingredientsText != null ? String(row.ingredientsText).trim() || undefined : undefined,
      allergens: toStrArray(row.allergens),
      traces: toStrArray(row.traces),
      countries: toStrArray(row.countries),
      origins: row.origins != null ? String(row.origins).trim() || undefined : undefined,
      manufacturingPlaces:
        row.manufacturingPlaces != null
          ? String(row.manufacturingPlaces).trim() || undefined
          : undefined,
      imageUrl: row.imageUrl != null ? String(row.imageUrl).trim() || undefined : undefined,
      imageFrontUrl:
        row.imageFrontUrl != null ? String(row.imageFrontUrl).trim() || undefined : undefined,
      nutritionDataPer:
        row.nutritionDataPer != null ? String(row.nutritionDataPer).trim() || undefined : undefined,
      energyKcal: num(row.energyKcal),
      energyKj: num(row.energyKj),
      fat: num(row.fat),
      saturatedFat: num(row.saturatedFat),
      transFat: num(row.transFat),
      cholesterol: num(row.cholesterol),
      carbohydrates: num(row.carbohydrates),
      sugars: num(row.sugars),
      addedSugars: num(row.addedSugars),
      fiber: num(row.fiber),
      proteins: num(row.proteins),
      salt: num(row.salt),
      sodium: num(row.sodium),
      vitaminA: num(row.vitaminA),
      vitaminC: num(row.vitaminC),
      calcium: num(row.calcium),
      iron: num(row.iron),
      potassium: num(row.potassium),
      magnesium: num(row.magnesium),
      zinc: num(row.zinc),
      nutriscoreGrade:
        row.nutriscoreGrade != null ? String(row.nutriscoreGrade).trim() || undefined : undefined,
      nutriscoreScore: num(row.nutriscoreScore),
      novaGroup: num(row.novaGroup),
      ecoscoreGrade:
        row.ecoscoreGrade != null ? String(row.ecoscoreGrade).trim() || undefined : undefined,
      carbonFootprint: num(row.carbonFootprint),
      isVegan:
        row.isVegan === undefined || row.isVegan === ''
          ? undefined
          : row.isVegan === true || row.isVegan === '1' || row.isVegan === 1,
      isVegetarian:
        row.isVegetarian === undefined || row.isVegetarian === ''
          ? undefined
          : row.isVegetarian === true || row.isVegetarian === '1' || row.isVegetarian === 1,
      isPalmOilFree:
        row.isPalmOilFree === undefined || row.isPalmOilFree === ''
          ? undefined
          : row.isPalmOilFree === true || row.isPalmOilFree === '1' || row.isPalmOilFree === 1,
      ingredientsAnalysisTags: toStrArray(row.ingredientsAnalysisTags),
      packagingTags: toStrArray(row.packagingTags),
      packagingMaterials: toStrArray(row.packagingMaterials),
      packagingRecycling: toStrArray(row.packagingRecycling),
      packagingText:
        row.packagingText != null ? String(row.packagingText).trim() || undefined : undefined,
      completeness: num(row.completeness),
    };

    await prisma.food.upsert({
      where: { barcode },
      create: { barcode, ...data },
      update: data,
    });
  }

  console.log(`   ✅ OpenFoodFacts JSON: ${rows.length} foods upserted`);
  return { count: rows.length, skipped: false };
}
