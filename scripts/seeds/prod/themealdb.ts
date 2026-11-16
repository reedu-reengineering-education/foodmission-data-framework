import {
  Allergens,
  Prisma,
  PrismaClient,
  RecipeOrigin,
  Unit,
} from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parseQuantityUnit } from './measure-parser';
import {
  calculateRecipeNutrition,
  NUTRITION_INGREDIENT_SELECT,
  toNutritionJson,
} from '../../../src/recipes/nutrition/calculate-recipe-nutrition';

const DATA_DIR = path.join(process.cwd(), 'prisma', 'seeds', 'data');

const SOURCE_NEVO = 'nevo';

interface ThemealdbData {
  ingredientMappings: {
    ingredientName: string;
    foodName: string;
    source: string;
    sourceId: string;
    matchConfidence: string;
  }[];
  recipes: {
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
    allergens?: string[];
    sustainabilityScore?: number | null;
  }[];
}

function mapAllergenTokenToEnum(token: string): Allergens {
  const normalized = token.trim().toLowerCase();

  switch (normalized) {
    case 'gluten':
      return Allergens.GLUTEN;
    case 'milk':
      return Allergens.DAIRY;
    case 'eggs':
      return Allergens.EGGS;
    case 'fish':
      return Allergens.FISH;
    case 'crustaceans':
    case 'molluscs':
      return Allergens.SHELLFISH;
    case 'nuts':
      return Allergens.TREE_NUTS;
    case 'peanuts':
      return Allergens.PEANUTS;
    case 'soy':
      return Allergens.SOY;
    case 'mustard':
      return Allergens.MUSTARD;
    case 'sesame':
      return Allergens.SESAME;
    case 'sulphites':
      return Allergens.SULFITES;
    case 'nightshades':
      return Allergens.NIGHTSHADES;
    default:
      return Allergens.OTHER;
  }
}

function mapAllergensToEnum(tokens?: string[]): Allergens[] {
  if (!tokens?.length) return [];
  return tokens
    .map((t) => mapAllergenTokenToEnum(t))
    .filter((v, i, arr) => arr.indexOf(v) === i);
}

interface SeedOptions {
  limit?: number;
  dryRun?: boolean;
  skipExisting?: boolean;
}

function readSeedJson<T>(fileName: string): T {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Seed data file not found: ${filePath}. Place it in prisma/seeds/data/.`,
    );
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

const normalize = (text: string) =>
  text.toLowerCase().replace(/\s+/g, ' ').trim();

export const ingredientKey = (name: string, measure: string | null) =>
  `${normalize(name)}|${normalize(measure ?? '')}`;

async function loadGenericFoodIdByIngredient(
  prisma: PrismaClient,
  mappings: ThemealdbData['ingredientMappings'],
): Promise<Map<string, string>> {
  const genericFoods = await prisma.genericFood.findMany({
    select: { id: true, nevoCode: true },
  });
  const idByNevoCode = new Map(
    genericFoods.map((food) => [food.nevoCode, food.id]),
  );
  const idByIngredient = new Map<string, string>();
  for (const row of mappings) {
    if (row.source !== SOURCE_NEVO) continue;
    const id = idByNevoCode.get(parseInt(row.sourceId, 10));
    if (id) idByIngredient.set(normalize(row.ingredientName), id);
  }
  return idByIngredient;
}

function toRecipeCreateData(
  recipe: ThemealdbData['recipes'][0],
): Prisma.RecipeUncheckedCreateInput {
  return {
    externalId: recipe.externalId,
    title: recipe.title,
    category: recipe.category || null,
    cuisineType: recipe.cuisineType || null,
    instructions: recipe.instructions || null,
    imageUrl: recipe.imageUrl || null,
    videoUrl: recipe.videoUrl || null,
    tags: recipe.tags ?? [],
    dietaryLabels: recipe.dietaryLabels ?? [],
    servings: recipe.servings ?? 4,
    allergens: mapAllergensToEnum(recipe.allergens),
    sustainabilityScore: recipe.sustainabilityScore ?? undefined,
    isPublic: true,
    userId: null,
    origin: RecipeOrigin.THEMEALDB,
  };
}

function seededAmount(
  name: string,
  measure: string | null,
  gramsByLine: Map<string, number>,
): { quantity: number | null; unit: Unit | null } {
  const grams = gramsByLine.get(ingredientKey(name, measure));
  if (grams !== undefined) return { quantity: grams, unit: Unit.G };
  return (
    (measure ? parseQuantityUnit(measure) : null) ?? {
      quantity: null,
      unit: null,
    }
  );
}

async function syncIngredients(
  prisma: PrismaClient,
  mappings: ThemealdbData['ingredientMappings'],
): Promise<void> {
  const genericFoodIdByIngredient = await loadGenericFoodIdByIngredient(
    prisma,
    mappings,
  );
  const gramsByLine = new Map(
    readSeedJson<{ name: string; measure: string; grams: number }[]>(
      'themealdb-ingredient-grams.json',
    ).map((row) => [ingredientKey(row.name, row.measure), row.grams]),
  );
  const ingredients = await prisma.recipeIngredient.findMany({
    where: { recipe: { origin: RecipeOrigin.THEMEALDB } },
    select: {
      id: true,
      name: true,
      measure: true,
      quantity: true,
      unit: true,
      itemType: true,
      genericFoodId: true,
      foodProductId: true,
    },
  });

  let updated = 0;
  let unparsed = 0;
  for (const { id, ...current } of ingredients) {
    const expected = {
      ...seededAmount(current.name, current.measure, gramsByLine),
      itemType: 'generic_food' as const,
      genericFoodId:
        genericFoodIdByIngredient.get(normalize(current.name)) ?? null,
      foodProductId: null,
    };
    if (expected.quantity === null) unparsed++;
    const upToDate = (Object.keys(expected) as (keyof typeof expected)[]).every(
      (field) => current[field] === expected[field],
    );
    if (upToDate) continue;
    await prisma.recipeIngredient.update({ where: { id }, data: expected });
    updated++;
  }

  console.log(
    `   🔗 Ingredients: updated ${updated}, ${unparsed} without a parsed amount`,
  );
}

async function recalculateNutrition(prisma: PrismaClient): Promise<void> {
  const recipes = await prisma.recipe.findMany({
    where: { origin: RecipeOrigin.THEMEALDB },
    select: {
      id: true,
      ingredients: {
        orderBy: { order: 'asc' },
        select: NUTRITION_INGREDIENT_SELECT,
      },
    },
  });

  let stored = 0;
  for (const recipe of recipes) {
    const nutrition = calculateRecipeNutrition(recipe);
    if (nutrition) stored++;
    await prisma.recipe.update({
      where: { id: recipe.id },
      data: {
        nutritionalInfo: toNutritionJson(nutrition),
      },
    });
  }

  console.log(
    `   🥗 Recipe nutrition: stored ${stored}, withheld ${recipes.length - stored}`,
  );
}

export async function seedRecipes(
  prisma: PrismaClient,
  options: SeedOptions = {},
): Promise<{ created: number; skipped: number; errors: number }> {
  const { limit, dryRun = false, skipExisting = true } = options;

  console.log('🍽️  Loading TheMealDB recipe data...');

  const data = readSeedJson<ThemealdbData>('themealdb-data.json');
  const recipes = data.recipes;

  const ingredientCount = recipes.reduce(
    (sum, r) => sum + r.ingredients.length,
    0,
  );
  console.log(`   📄 ${recipes.length} recipes`);
  console.log(`   🥕 ${ingredientCount} ingredient entries`);
  console.log(`   🔗 ${data.ingredientMappings.length} ingredient mappings`);
  const withAllergens = recipes.filter(
    (r) => (r.allergens?.length ?? 0) > 0,
  ).length;
  if (withAllergens > 0) {
    console.log(`   📊 ${withAllergens} recipes with allergens`);
  }

  let created = 0;
  let skipped = 0;
  let errors = 0;

  const recipesToProcess = limit ? recipes.slice(0, limit) : recipes;

  console.log(
    `\n🌱 ${dryRun ? '[DRY RUN] ' : ''}Seeding ${recipesToProcess.length} recipes...`,
  );

  for (const recipe of recipesToProcess) {
    try {
      if (skipExisting && !dryRun) {
        const existing = await prisma.recipe.findUnique({
          where: { externalId: recipe.externalId },
        });
        if (existing) {
          skipped++;
          continue;
        }
      }

      if (dryRun) {
        console.log(
          `  Would create: ${recipe.title} (${recipe.ingredients.length} ingredients)`,
        );
        created++;
        continue;
      }

      await prisma.$transaction(async (tx) => {
        const createdRecipe = await tx.recipe.create({
          data: toRecipeCreateData(recipe),
        });
        if (recipe.ingredients.length > 0) {
          await tx.recipeIngredient.createMany({
            data: recipe.ingredients.map((ing) => ({
              recipeId: createdRecipe.id,
              name: ing.name,
              measure: ing.measure?.trim() ?? null,
              order: ing.order,
            })),
          });
        }
      });

      created++;
      if (created % 50 === 0) {
        console.log(
          `   ⏳ ${created}/${recipesToProcess.length} recipes created...`,
        );
      }
    } catch (error) {
      console.error(
        `   ❌ Error seeding recipe ${recipe.externalId}: ${error}`,
      );
      errors++;
    }
  }

  if (!dryRun) {
    await syncIngredients(prisma, data.ingredientMappings);
    await recalculateNutrition(prisma);
  }

  console.log(`\n✅ TheMealDB seeding complete:`);
  console.log(`   📥 Created: ${created}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);

  return { created, skipped, errors };
}

function parseSeedArgs(args: string[]): SeedOptions {
  const options: SeedOptions = {
    dryRun: args.includes('--dry-run'),
    skipExisting: !args.includes('--force'),
  };
  const limitArg = args.find((a) => a.startsWith('--limit='));
  if (limitArg) {
    const n = parseInt(limitArg.split('=')[1], 10);
    if (!isNaN(n)) options.limit = n;
  }
  return options;
}

async function main() {
  const options = parseSeedArgs(process.argv.slice(2));
  const prisma = new PrismaClient();

  try {
    console.log('=====================================');
    console.log('🍽️  TheMealDB Recipe Seeding');
    console.log('=====================================');
    console.log(`Options: ${JSON.stringify(options)}`);
    console.log('');

    const result = await seedRecipes(prisma, options);

    if (result.errors > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void main();
}
