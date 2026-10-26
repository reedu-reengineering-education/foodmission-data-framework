/**
 * Idempotent seed step: fills RecipeIngredient.quantity/unit from the free-text
 * measure for rows that have neither yet. Unparseable measures stay null.
 */

import { PrismaClient } from '@prisma/client';
import { parseQuantityUnit } from '../../../src/common/utils/measure-parser';

export async function backfillIngredientUnits(
  prisma: PrismaClient,
): Promise<{ updated: number; unparsed: number }> {
  const ingredients = await prisma.recipeIngredient.findMany({
    where: { quantity: null, unit: null, measure: { not: null } },
    select: { id: true, name: true, measure: true },
  });

  let updated = 0;
  for (const ingredient of ingredients) {
    const parsed = parseQuantityUnit(ingredient.measure!, ingredient.name);
    if (!parsed) continue;
    await prisma.recipeIngredient.update({
      where: { id: ingredient.id },
      data: parsed,
    });
    updated++;
  }

  return { updated, unparsed: ingredients.length - updated };
}
