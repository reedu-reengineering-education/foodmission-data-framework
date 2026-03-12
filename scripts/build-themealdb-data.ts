/**
 * Build a single themealdb-data.json from the recipe, ingredient, mapping, and enriched CSVs.
 *
 * Run after extracting TheMealDB or updating mapping/enriched data:
 *   npx ts-node scripts/build-themealdb-data.ts
 *
 * Output: prisma/seeds/data/themealdb-data.json
 * The seed (themealdb.ts) then loads only this file.
 */

import * as fs from 'fs';
import * as path from 'path';
import { csvToObjects } from './parse-csv';

const DATA_DIR = path.join(__dirname, '..', 'prisma', 'seeds', 'data');
const RECIPES_PATH = path.join(DATA_DIR, 'themealdb-recipes.csv');
const INGREDIENTS_PATH = path.join(DATA_DIR, 'themealdb-ingredients.csv');
const MAPPING_PATH_BASE = path.join(DATA_DIR, 'ingredient-food-mapping.csv');
const MAPPING_PATH_CORRECTED = path.join(DATA_DIR, 'ingredient-food-mapping-corrected.csv');
const ENRICHED_PATH = path.join(DATA_DIR, 'enriched-recipes.csv');
const OUT_PATH = path.join(DATA_DIR, 'themealdb-data.json');

function loadCsv<T = Record<string, string>>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return csvToObjects(content) as unknown as T[];
}

function parseTags(s: string): string[] {
  if (!s || s.trim() === '') return [];
  return s.split(',').map((t) => t.trim()).filter(Boolean);
}

interface RecipeRow {
  externalId: string;
  title: string;
  category: string;
  cuisineType: string;
  instructions: string;
  imageUrl: string;
  videoUrl: string;
  tags: string;
  dietaryLabels: string;
  servings: string;
}

interface IngredientRow {
  recipeExternalId: string;
  ingredientName: string;
  measure: string;
  order: string;
}

interface MappingRow {
  ingredientName: string;
  foodName: string;
  source: string;
  sourceId: string;
  matchConfidence: string;
  [key: string]: string;
}

interface EnrichedRow {
  externalId: string;
  nutritionalInfo: string;
  allergens: string;
  sustainabilityScore: string;
}

interface OutputRecipe {
  externalId: string;
  title: string;
  category: string;
  cuisineType: string;
  instructions: string;
  imageUrl: string;
  videoUrl: string;
  tags: string[];
  dietaryLabels: string[];
  servings: number;
  ingredients: { name: string; measure: string; order: number }[];
  nutritionalInfo?: Record<string, unknown> | null;
  allergens?: string[];
  sustainabilityScore?: number | null;
}

interface OutputMapping {
  ingredientName: string;
  foodName: string;
  source: string;
  sourceId: string;
  matchConfidence: string;
}

interface Output {
  ingredientMappings: OutputMapping[];
  recipes: OutputRecipe[];
}

/** Normalize ingredient key for lookup (must match themealdb seed). */
function mappingKey(name: string): string {
  return (name ?? '').toLowerCase().trim();
}

/**
 * Merge base mapping (full NEVO set) with corrected mapping (review overrides: OFF + NEVO corrections).
 * - All base rows are included; where corrected has the same ingredient (by key), use corrected row.
 * - Any corrected row whose ingredient is not in base is appended (so review-only entries are kept).
 */
function mergeMappings(
  base: MappingRow[],
  corrected: MappingRow[] | null,
): OutputMapping[] {
  const correctedByKey = new Map<string, MappingRow>();
  if (corrected) {
    for (const row of corrected) {
      const key = mappingKey(row.ingredientName);
      if (key) correctedByKey.set(key, row);
    }
  }

  const baseKeys = new Set(base.map((r) => mappingKey(r.ingredientName)));
  const result: OutputMapping[] = [];

  for (const row of base) {
    const key = mappingKey(row.ingredientName);
    const override = correctedByKey.get(key);
    const r = override ?? row;
    if (r.source === 'none' || r.matchConfidence === 'none') continue;
    // Use override's sourceId when present; otherwise keep base's (e.g. corrected NEVO row with empty sourceId)
    const sourceId = (r.sourceId?.trim() ?? '') || (row.sourceId?.trim() ?? '');
    result.push({
      ingredientName: row.ingredientName, // keep base name (matches recipe ingredients)
      foodName: r.foodName ?? row.foodName ?? '',
      source: r.source,
      sourceId,
      matchConfidence: r.matchConfidence,
    });
  }

  // Append corrected-only rows (in review but not in base)
  if (corrected) {
    for (const row of corrected) {
      const key = mappingKey(row.ingredientName);
      if (!key || baseKeys.has(key)) continue;
      if (row.source === 'none' || row.matchConfidence === 'none') continue;
      result.push({
        ingredientName: row.ingredientName,
        foodName: row.foodName ?? '',
        source: row.source,
        sourceId: row.sourceId ?? '',
        matchConfidence: row.matchConfidence,
      });
    }
  }

  return result;
}

function main() {
  console.log('Building themealdb-data.json from CSVs...');

  const recipes = loadCsv<RecipeRow>(RECIPES_PATH);
  const ingredients = loadCsv<IngredientRow>(INGREDIENTS_PATH);
  const baseMappings = loadCsv<MappingRow>(MAPPING_PATH_BASE);
  let correctedMappings: MappingRow[] | null = null;
  if (fs.existsSync(MAPPING_PATH_CORRECTED)) {
    correctedMappings = loadCsv<MappingRow>(MAPPING_PATH_CORRECTED);
    console.log(
      `  Merging mappings: ${baseMappings.length} base + ${correctedMappings.length} review overrides (OFF/NEVO)`,
    );
  }

  const outputMappings = mergeMappings(baseMappings, correctedMappings);

  const enrichedByExternalId = new Map<string, EnrichedRow>();
  if (fs.existsSync(ENRICHED_PATH)) {
    const enriched = loadCsv<EnrichedRow>(ENRICHED_PATH);
    for (const row of enriched) {
      enrichedByExternalId.set(row.externalId.trim(), row);
    }
    console.log(`  Enriched: ${enriched.length} recipes`);
  }

  const ingredientsByRecipe = new Map<string, IngredientRow[]>();
  for (const ing of ingredients) {
    const id = ing.recipeExternalId;
    if (!ingredientsByRecipe.has(id)) ingredientsByRecipe.set(id, []);
    ingredientsByRecipe.get(id)!.push(ing);
  }

  const outputRecipes: OutputRecipe[] = recipes.map((r) => {
    const ings = ingredientsByRecipe.get(r.externalId) ?? [];
    const enriched = enrichedByExternalId.get(r.externalId);

    let nutritionalInfo: Record<string, unknown> | null | undefined;
    let allergens: string[] | undefined;
    let sustainabilityScore: number | null | undefined;

    if (enriched) {
      try {
        nutritionalInfo = enriched.nutritionalInfo?.trim()
          ? (JSON.parse(enriched.nutritionalInfo) as Record<string, unknown>)
          : null;
      } catch {
        nutritionalInfo = null;
      }
      allergens = enriched.allergens?.trim()
        ? enriched.allergens.split(',').map((a) => a.trim()).filter(Boolean)
        : [];
      const parsed = enriched.sustainabilityScore?.trim()
        ? parseFloat(enriched.sustainabilityScore)
        : NaN;
      sustainabilityScore = Number.isNaN(parsed) ? null : parsed;
    }

    const servings = (() => {
      const n = parseInt(r.servings?.trim() ?? '', 10);
      return isNaN(n) ? 4 : n;
    })();

    return {
      externalId: r.externalId,
      title: r.title,
      category: r.category ?? '',
      cuisineType: r.cuisineType ?? '',
      instructions: r.instructions ?? '',
      imageUrl: r.imageUrl ?? '',
      videoUrl: r.videoUrl ?? '',
      tags: parseTags(r.tags),
      dietaryLabels: parseTags(r.dietaryLabels),
      servings,
      ingredients: ings.map((i) => ({
        name: i.ingredientName,
        measure: i.measure ?? '',
        order: parseInt(i.order, 10) || 0,
      })),
      ...(enriched && {
        nutritionalInfo: nutritionalInfo ?? null,
        allergens: allergens ?? [],
        sustainabilityScore: sustainabilityScore ?? null,
      }),
    };
  });

  const output: Output = {
    ingredientMappings: outputMappings,
    recipes: outputRecipes,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 0), 'utf-8');
  console.log(`Wrote ${OUT_PATH}`);
  console.log(`  recipes: ${outputRecipes.length}`);
  console.log(`  ingredientMappings: ${outputMappings.length}`);
}

main();
