#!/usr/bin/env ts-node

/**
 * Idempotent seed step: fills RecipeIngredient.quantity/unit from the free-text
 * measure for rows that have neither yet. Unparseable measures stay null.
 *
 * Runs as part of db:seed / db:seed:prod, or on its own:
 *   npm run db:backfill:ingredient-units -- [--dry-run] [--force]
 *   npm run db:backfill:ingredient-units:prod -- [--dry-run] [--force]
 *
 * --force re-parses TheMealDB ingredients that already have a unit (after
 * parser changes). User-created recipes are never overwritten.
 */

import { parseArgs } from 'node:util';
import { Prisma, PrismaClient, RecipeOrigin } from '@prisma/client';
import { parseQuantityUnit } from '../../../src/common/utils/measure-parser';

interface BackfillOptions {
  dryRun?: boolean;
  force?: boolean;
}

export async function backfillIngredientUnits(
  prisma: PrismaClient,
  { dryRun = false, force = false }: BackfillOptions = {},
): Promise<{ updated: number; unparsed: number }> {
  const where: Prisma.RecipeIngredientWhereInput = force
    ? {
        measure: { not: null },
        recipe: { origin: RecipeOrigin.THEMEALDB },
      }
    : { quantity: null, unit: null, measure: { not: null } };

  const ingredients = await prisma.recipeIngredient.findMany({
    where,
    select: { id: true, name: true, measure: true, quantity: true, unit: true },
  });

  let updated = 0;
  let unparsed = 0;
  for (const ingredient of ingredients) {
    const parsed = parseQuantityUnit(ingredient.measure!, ingredient.name);
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

  return { updated, unparsed };
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      'dry-run': { type: 'boolean', default: false },
      force: { type: 'boolean', default: false },
    },
  });
  const dryRun = values['dry-run'] ?? false;
  const force = values.force ?? false;

  console.log('📏 Backfilling recipe ingredient units...');
  console.log(`   dry-run: ${dryRun}`);
  console.log(`   force: ${force}`);

  const prisma = new PrismaClient();
  try {
    const result = await backfillIngredientUnits(prisma, { dryRun, force });
    console.log(
      `   ✅ ${dryRun ? 'Would update' : 'Updated'} ${result.updated} ingredients, ${result.unparsed} unparsed`,
    );
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
