import { PrismaClient, RecipeOrigin } from '@prisma/client';
import { recalculateRecipeEstimates } from '../../../scripts/seeds/prod/recipe-estimates';

describe('recalculateRecipeEstimates', () => {
  it('keeps the nutrition users entered and recalculates only the impact of their recipes', async () => {
    const updates: { where: { id: string }; data: object }[] = [];
    const prisma = {
      recipe: {
        findMany: () =>
          Promise.resolve([
            { id: 'seeded', origin: RecipeOrigin.THEMEALDB, ingredients: [] },
            { id: 'user', origin: RecipeOrigin.USER, ingredients: [] },
          ]),
        update: (update: { where: { id: string }; data: object }) => {
          updates.push(update);
          return Promise.resolve();
        },
      },
    } as unknown as PrismaClient;
    jest.spyOn(console, 'log').mockImplementation(() => undefined);

    await recalculateRecipeEstimates(prisma);

    expect(
      updates.map(({ where, data }) => [where.id, Object.keys(data).sort()]),
    ).toEqual([
      ['seeded', ['environmentalImpact', 'nutritionalInfo']],
      ['user', ['environmentalImpact']],
    ]);
  });
});
