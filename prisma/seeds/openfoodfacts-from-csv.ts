/**
 * Seed Food records from openfoodfacts-foods.csv.
 *
 * Run this (or have the main seed run it) so that OpenFoodFacts data exists
 * before TheMealDB recipe seeding, when recipe ingredients link to Food (source=off).
 *
 * If the CSV does not exist, this is a no-op (main seed can fall back to seedFoods from API).
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { parse: csvParse } = require('csv-parse/sync');

const DATA_DIR = path.join(__dirname, 'data');
const CSV_PATH = path.join(DATA_DIR, 'openfoodfacts-foods.csv');

function pipeToArray(s: string | undefined): string[] {
  if (s === undefined || s === null || (typeof s === 'string' && s.trim() === ''))
    return [];
  return (s as string).split('|').map((x) => x.trim()).filter(Boolean);
}

function num(val: unknown): number | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  const n = Number(val);
  return Number.isNaN(n) ? undefined : n;
}

export async function seedOpenFoodFactsFromCsv(
  prisma: PrismaClient,
): Promise<{ count: number; skipped: boolean }> {
  if (!fs.existsSync(CSV_PATH)) {
    console.log(`   ⏭️  ${CSV_PATH} not found; skipping OFF CSV import. Run scripts/pull-openfoodfacts-foods.ts to generate it.`);
    return { count: 0, skipped: true };
  }

  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows = csvParse(content, { columns: true, skip_empty_lines: true, relax_column_count: true }) as Record<string, string>[];

  console.log(`🍎 Seeding Food from OpenFoodFacts CSV (${rows.length} rows)...`);

  for (const row of rows) {
    const barcode = row.barcode?.trim();
    if (!barcode) continue;

    const data = {
      name: row.name?.trim() || `Product ${barcode}`,
      description: row.description?.trim() || undefined,
      createdBy: row.createdBy?.trim() || 'system-seed-openfoodfacts',
      brands: row.brands?.trim() || undefined,
      categories: pipeToArray(row.categories),
      labels: pipeToArray(row.labels),
      quantity: row.quantity?.trim() || undefined,
      servingSize: row.servingSize?.trim() || undefined,
      ingredientsText: row.ingredientsText?.trim() || undefined,
      allergens: pipeToArray(row.allergens),
      traces: pipeToArray(row.traces),
      countries: pipeToArray(row.countries),
      origins: row.origins?.trim() || undefined,
      manufacturingPlaces: row.manufacturingPlaces?.trim() || undefined,
      imageUrl: row.imageUrl?.trim() || undefined,
      imageFrontUrl: row.imageFrontUrl?.trim() || undefined,
      nutritionDataPer: row.nutritionDataPer?.trim() || undefined,
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
      nutriscoreGrade: row.nutriscoreGrade?.trim() || undefined,
      nutriscoreScore: num(row.nutriscoreScore),
      novaGroup: num(row.novaGroup),
      ecoscoreGrade: row.ecoscoreGrade?.trim() || undefined,
      carbonFootprint: num(row.carbonFootprint),
      isVegan: row.isVegan === undefined || row.isVegan === '' ? undefined : row.isVegan === '1',
      isVegetarian: row.isVegetarian === undefined || row.isVegetarian === '' ? undefined : row.isVegetarian === '1',
      isPalmOilFree: row.isPalmOilFree === undefined || row.isPalmOilFree === '' ? undefined : row.isPalmOilFree === '1',
      ingredientsAnalysisTags: pipeToArray(row.ingredientsAnalysisTags),
      packagingTags: pipeToArray(row.packagingTags),
      packagingMaterials: pipeToArray(row.packagingMaterials),
      packagingRecycling: pipeToArray(row.packagingRecycling),
      packagingText: row.packagingText?.trim() || undefined,
      completeness: num(row.completeness),
    };

    await prisma.food.upsert({
      where: { barcode },
      create: { barcode, ...data },
      update: data,
    });
  }

  console.log(`   ✅ OpenFoodFacts CSV: ${rows.length} foods upserted`);
  return { count: rows.length, skipped: false };
}
