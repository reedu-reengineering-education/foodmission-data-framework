import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { EnvironmentalImpact } from '../src/recipes/nutrition/calculate-recipe-impact';

const SAME_DISH: [themealdbId: string, agribalyseCode: string][] = [
  ['52854', '23799'],
  ['52844', '25081'],
  ['52982', '25135'],
  ['53006', '25123'],
  ['52908', '25018'],
  ['53014', '25404'],
  ['53269', '25621'],
  ['53173', '25967'],
  ['52860', '23032'],
  ['52850', '25043'],
  ['52851', '25174'],
];

async function main() {
  const prisma = new PrismaClient();
  try {
    const rows: Record<string, string | number>[] = [];
    for (const [externalId, code] of SAME_DISH) {
      const [recipe, dish] = await Promise.all([
        prisma.recipe.findUnique({
          where: { externalId },
          select: { title: true, environmentalImpact: true },
        }),
        prisma.agribalyseFood.findUnique({ where: { code } }),
      ]);
      if (!recipe || !dish) {
        rows.push({
          recipe: recipe?.title ?? `missing recipe ${externalId}`,
          agribalyse: dish?.nameEn ?? `missing AGRIBALYSE ${code}`,
        });
        continue;
      }
      const impact = recipe.environmentalImpact as EnvironmentalImpact | null;
      rows.push({
        recipe: recipe.title,
        agribalyse: dish.nameEn,
        'co2 ours': impact?.perKg.co2 ?? 'withheld',
        'co2 AGRIBALYSE': dish.co2PerKg,
        'co2 ratio': impact
          ? +(impact.perKg.co2 / dish.co2PerKg).toFixed(2)
          : '',
        'EF ratio': impact
          ? +(impact.perKg.efScoreMpt / dish.efScorePerKg).toFixed(2)
          : '',
      });
    }
    console.table(rows);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
