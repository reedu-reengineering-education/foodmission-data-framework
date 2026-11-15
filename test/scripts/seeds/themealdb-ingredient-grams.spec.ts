import * as fs from 'node:fs';
import * as path from 'node:path';
import { ingredientKey } from '../../../scripts/seeds/prod/themealdb';

const DATA_DIR = path.join(process.cwd(), 'prisma', 'seeds', 'data');

const readJson = <T>(file: string): T =>
  JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8')) as T;

describe('TheMealDB ingredient weights', () => {
  const weights = readJson<{ name: string; measure: string; grams: number }[]>(
    'themealdb-ingredient-grams.json',
  );
  const seededKeys = new Set(
    readJson<{
      recipes: { ingredients: { name: string; measure: string | null }[] }[];
    }>('themealdb-data.json').recipes.flatMap((recipe) =>
      recipe.ingredients.map((ingredient) =>
        ingredientKey(ingredient.name, ingredient.measure),
      ),
    ),
  );

  it('matches a seeded ingredient line with every row', () => {
    const unmatched = weights
      .filter((row) => !seededKeys.has(ingredientKey(row.name, row.measure)))
      .map((row) => `${row.name} | ${row.measure}`);

    expect(unmatched).toEqual([]);
  });

  it('has one positive weight per ingredient line', () => {
    const keys = weights.map((row) => ingredientKey(row.name, row.measure));

    expect(new Set(keys).size).toBe(keys.length);
    expect(weights.every((row) => row.grams > 0)).toBe(true);
  });
});
