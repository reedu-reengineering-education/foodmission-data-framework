import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { EnvironmentalImpact } from '../src/recipes/nutrition/calculate-recipe-impact';

const SAME_DISH: [recipeTitle: string, agribalyseCode: string][] = [
  ['Pancakes', '23799'],
  ['Lasagne', '25081'],
  ['Spaghetti alla Carbonara', '25135'],
  ['Moussaka', '25123'],
  ['Ratatouille', '25018'],
  ['Pizza Express Margherita', '25404'],
  ['Hummus', '25621'],
  ['Quick gazpacho', '25967'],
  ['Chocolate Raspberry Brownies', '23032'],
  ['Chicken Couscous', '25043'],
  ['Nutty Chicken Curry', '25174'],
];

async function main() {
  const prisma = new PrismaClient();
  try {
    const rows: Record<string, string | number>[] = [];
    for (const [title, code] of SAME_DISH) {
      const [recipe, dish] = await Promise.all([
        prisma.recipe.findFirst({
          where: { title },
          select: { environmentalImpact: true },
        }),
        prisma.agribalyseFood.findUnique({ where: { code } }),
      ]);
      const impact = recipe?.environmentalImpact as EnvironmentalImpact | null;
      if (!dish) continue;
      rows.push({
        recipe: title,
        agribalyse: dish.nameEn,
        'co2 ours': impact?.perKg.co2 ?? 'withheld',
        'co2 AGRIBALYSE': dish.co2PerKg,
        'co2 ratio': impact
          ? +(impact.perKg.co2 / dish.co2PerKg).toFixed(2)
          : '',
        'EF ratio': impact
          ? +(impact.perKg.efScoreMpt / 1000 / dish.efScorePerKg).toFixed(2)
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
