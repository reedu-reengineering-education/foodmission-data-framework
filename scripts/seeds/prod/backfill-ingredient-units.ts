#!/usr/bin/env ts-node

/**
 * Idempotent seed step: re-parses RecipeIngredient.quantity/unit of TheMealDB
 * recipes from the free-text measure into metric units. Unparseable measures
 * stay null. User-created recipes are never touched.
 *
 * Runs as part of db:seed / db:seed:prod, or on its own:
 *   npm run db:backfill:ingredient-units -- [--dry-run]
 *   npm run db:backfill:ingredient-units:prod -- [--dry-run]
 */

import { parseArgs } from 'node:util';
import { PrismaClient, RecipeOrigin } from '@prisma/client';
import { parseQuantityUnit } from '../../../src/common/utils/measure-parser';

export async function backfillIngredientUnits(
  prisma: PrismaClient,
  { dryRun = false }: { dryRun?: boolean } = {},
): Promise<void> {
  const ingredients = await prisma.recipeIngredient.findMany({
    where: { recipe: { origin: RecipeOrigin.THEMEALDB } },
    select: { id: true, measure: true, quantity: true, unit: true },
  });

  let updated = 0;
  let unparsed = 0;
  for (const ingredient of ingredients) {
    const parsed = ingredient.measure
      ? parseQuantityUnit(ingredient.measure)
      : null;
    if (!parsed) unparsed++;
    const quantity = parsed?.quantity ?? null;
    const unit = parsed?.unit ?? null;
    if (quantity === ingredient.quantity && unit === ingredient.unit) continue;
    if (!dryRun) {
      await prisma.recipeIngredient.update({
        where: { id: ingredient.id },
        data: { quantity, unit },
      });
    }
    updated++;
  }

  console.log(
    `   ✅ Ingredient units: ${dryRun ? 'would update' : 'updated'} ${updated}, ${unparsed} unparsed`,
  );
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      'dry-run': { type: 'boolean', default: false },
    },
  });
  const dryRun = values['dry-run'] ?? false;

  console.log('📏 Backfilling recipe ingredient units...');
  console.log(`   dry-run: ${dryRun}`);

  const prisma = new PrismaClient();
  try {
    await backfillIngredientUnits(prisma, { dryRun });
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
