#!/usr/bin/env ts-node

/**
 * Idempotent seed step: writes Recipe.nutritionalInfo for TheMealDB recipes
 * from linked NEVO foods and parsed quantity/unit. Recipes that cannot be
 * totalled are stored as null. User recipes and sustainabilityScore are
 * never touched.
 *
 * Runs after ingredient-unit backfill as part of db:seed / db:seed:prod, or:
 *   npm run db:backfill:recipe-nutrition -- [--dry-run]
 *   npm run db:backfill:recipe-nutrition:prod -- [--dry-run]
 */

import { parseArgs } from 'node:util';
import { Prisma, PrismaClient, RecipeOrigin } from '@prisma/client';
import {
  calculateRecipeNutrition,
  NUTRITION_VALUE_SELECT,
} from '../../../src/recipes/nutrition/calculate-recipe-nutrition';

export async function backfillRecipeNutrition(
  prisma: PrismaClient,
  { dryRun = false }: { dryRun?: boolean } = {},
): Promise<void> {
  const recipes = await prisma.recipe.findMany({
    where: { origin: RecipeOrigin.THEMEALDB },
    select: {
      id: true,
      servings: true,
      nutritionalInfo: true,
      ingredients: {
        orderBy: { order: 'asc' },
        select: {
          name: true,
          measure: true,
          quantity: true,
          unit: true,
          foodProduct: { select: NUTRITION_VALUE_SELECT },
          genericFood: { select: NUTRITION_VALUE_SELECT },
        },
      },
    },
  });

  let stored = 0;
  let cleared = 0;
  let unchanged = 0;

  for (const recipe of recipes) {
    const nutrition = calculateRecipeNutrition(recipe);
    const next = nutrition ?? null;
    if (sameJson(recipe.nutritionalInfo, next)) {
      unchanged++;
      continue;
    }
    if (!dryRun) {
      await prisma.recipe.update({
        where: { id: recipe.id },
        data: {
          nutritionalInfo:
            next === null
              ? Prisma.JsonNull
              : (next as unknown as Prisma.InputJsonValue),
        },
      });
    }
    if (next === null) cleared++;
    else stored++;
  }

  console.log(
    `   ✅ Recipe nutrition: ${dryRun ? 'would store' : 'stored'} ${stored}, ${dryRun ? 'would clear' : 'cleared'} ${cleared}, unchanged ${unchanged}`,
  );
}

function sameJson(current: unknown, next: unknown): boolean {
  return stable(current ?? null) === stable(next ?? null);
}

function stable(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, sortKeys(nested)]),
    );
  }
  return value;
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      'dry-run': { type: 'boolean', default: false },
    },
  });
  const dryRun = values['dry-run'] ?? false;

  console.log('🥗 Backfilling MealDB recipe nutrition...');
  console.log(`   dry-run: ${dryRun}`);

  const prisma = new PrismaClient();
  try {
    await backfillRecipeNutrition(prisma, { dryRun });
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void main().catch((error) => {
    console.error(
      `❌ ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  });
}
