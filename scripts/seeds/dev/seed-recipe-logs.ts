import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const RUN_PREFIX = '[RA-SEED]';
const RECIPE_COUNT = 135;
const DAYS_SPAN = 95;

const DIET_LABELS = [
  'vegan',
  'vegetarian',
  'pescatarian',
  'meat-based',
  'gluten-free',
  'lactose-free',
  'low-carb',
  'high-protein',
  'keto',
] as const;

const CUISINES = [
  'Italian',
  'Mexican',
  'Japanese',
  'Thai',
  'Indian',
  'Mediterranean',
  'French',
  'Middle Eastern',
  'Nordic',
  'American',
] as const;

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

const INGREDIENT_POOL = [
  'Tomato',
  'Onion',
  'Garlic',
  'Olive Oil',
  'Bell Pepper',
  'Carrot',
  'Broccoli',
  'Spinach',
  'Chickpeas',
  'Lentils',
  'Tofu',
  'Tempeh',
  'Chicken Breast',
  'Beef',
  'Salmon',
  'Tuna',
  'Egg',
  'Yogurt',
  'Cheese',
  'Milk',
  'Rice',
  'Quinoa',
  'Pasta',
  'Potato',
  'Sweet Potato',
  'Avocado',
  'Lemon',
  'Apple',
  'Banana',
  'Mushroom',
  'Basil',
  'Parsley',
  'Soy Sauce',
  'Coconut Milk',
  'Ginger',
  'Black Pepper',
  'Sea Salt',
  'Oats',
  'Almonds',
  'Peanut Butter',
  'Kidney Beans',
  'Corn',
  'Cucumber',
  'Zucchini',
  'Cauliflower',
  'Shrimp',
] as const;

function createRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function pickOne<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)];
}

function pickUnique<T>(items: readonly T[], count: number, rng: () => number): T[] {
  const copy = [...items];
  const selected: T[] = [];

  while (copy.length > 0 && selected.length < count) {
    const idx = Math.floor(rng() * copy.length);
    selected.push(copy[idx]);
    copy.splice(idx, 1);
  }

  return selected;
}

function normalizeTitleSeed(value: string) {
  return value.replace(/[^a-z0-9]+/gi, ' ').trim();
}

async function seedRecipeLogs() {
  const rng = createRng(20260618);

  const users = await prisma.user.findMany({
    select: { id: true },
    orderBy: { createdAt: 'asc' },
    take: 30,
  });

  if (users.length === 0) {
    throw new Error('No users found. Run npm run db:seed first.');
  }

  console.log(`Found ${users.length} users.`);

  const existingSeededRecipes = await prisma.recipe.findMany({
    where: { externalId: { startsWith: 'ra-seed-' } },
    select: { id: true },
  });

  await prisma.meal.deleteMany({
    where: {
      name: { startsWith: RUN_PREFIX },
    },
  });

  if (existingSeededRecipes.length > 0) {
    await prisma.recipe.deleteMany({
      where: {
        externalId: { startsWith: 'ra-seed-' },
      },
    });
  }

  const now = new Date();
  let totalIngredients = 0;
  let totalMeals = 0;

  for (let i = 0; i < RECIPE_COUNT; i++) {
    const user = users[i % users.length];
    const cuisine = pickOne(CUISINES, rng);
    const difficulty = pickOne(DIFFICULTIES, rng);

    const daysAgo = Math.floor((i / RECIPE_COUNT) * DAYS_SPAN);
    const createdAt = new Date(now);
    createdAt.setUTCDate(createdAt.getUTCDate() - daysAgo);
    createdAt.setUTCHours(8 + (i % 12), Math.floor(rng() * 60), 0, 0);

    const titleSeed = normalizeTitleSeed(
      `${cuisine} ${difficulty} recipe ${i + 1}`,
    );
    const title = `${titleSeed} ${RUN_PREFIX}`;

    const prepTime = 8 + Math.floor(rng() * 45);
    const cookTime = 10 + Math.floor(rng() * 70);

    const rating = Math.round((2.5 + rng() * 2.5) * 100) / 100;
    const ratingCount = 5 + Math.floor(rng() * 320);

    const dietCount = 1 + Math.floor(rng() * 3);
    const diets = pickUnique(DIET_LABELS, dietCount, rng);

    if (i % 9 === 0 && !diets.includes('keto')) diets.push('keto');
    if (i % 11 === 0 && !diets.includes('vegan')) diets.push('vegan');
    if (i % 7 === 0 && !diets.includes('meat-based')) diets.push('meat-based');

    const ingredientCount = 6 + Math.floor(rng() * 6);
    const ingredients = pickUnique(INGREDIENT_POOL, ingredientCount, rng).map(
      (name, idx) => ({
        name,
        order: idx,
        measure: `${1 + Math.floor(rng() * 3)} portion`,
      }),
    );

    totalIngredients += ingredients.length;

    const nutrition = {
      calories: Math.round(280 + rng() * 560),
      protein: Math.round((12 + rng() * 42) * 10) / 10,
      carbs: Math.round((15 + rng() * 85) * 10) / 10,
      fat: Math.round((8 + rng() * 45) * 10) / 10,
      fiber: Math.round((3 + rng() * 16) * 10) / 10,
      sugar: Math.round((2 + rng() * 22) * 10) / 10,
      salt: Math.round((0.2 + rng() * 2.6) * 100) / 100,
      ecoScore: Math.round(35 + rng() * 60),
      sustainabilityScore: Math.round(40 + rng() * 58),
      co2Footprint: Math.round((0.8 + rng() * 7.4) * 100) / 100,
      waterFootprint: Math.round(120 + rng() * 1600),
      seasonalShare: Math.round((0.25 + rng() * 0.7) * 100) / 100,
      localShare: Math.round((0.2 + rng() * 0.75) * 100) / 100,
    };

    const recipe = await prisma.recipe.create({
      data: {
        userId: user.id,
        title,
        description: `Synthetic recipe analytics seed #${i + 1}`,
        instructions: 'Mix, cook, and serve.',
        prepTime,
        cookTime,
        servings: 2 + Math.floor(rng() * 5),
        difficulty,
        tags: ['analytics-seed', cuisine.toLowerCase().replace(/\s+/g, '-')],
        nutritionalInfo: nutrition,
        sustainabilityScore: nutrition.sustainabilityScore,
        price: Math.round((4 + rng() * 22) * 100) / 100,
        allergens: [],
        rating,
        ratingCount,
        externalId: `ra-seed-${String(i + 1).padStart(4, '0')}`,
        imageUrl: null,
        videoUrl: null,
        cuisineType: cuisine,
        category: 'Main',
        isPublic: i % 5 !== 0,
        dietaryLabels: diets,
        createdAt,
        updatedAt: createdAt,
        ingredients: {
          create: ingredients,
        },
      },
      select: { id: true },
    });

    const cookEvents = 1 + Math.floor(rng() * 7);
    totalMeals += cookEvents;

    for (let m = 0; m < cookEvents; m++) {
      const mealUser = users[(i + m) % users.length];
      const mealDate = new Date(createdAt);
      mealDate.setUTCDate(mealDate.getUTCDate() + (m % 21));

      await prisma.meal.create({
        data: {
          name: `${RUN_PREFIX} Meal ${i + 1}-${m + 1}`,
          userId: mealUser.id,
          recipeId: recipe.id,
          createdAt: mealDate,
          updatedAt: mealDate,
        },
      });
    }

    if ((i + 1) % 25 === 0) {
      console.log(`Seed progress: ${i + 1}/${RECIPE_COUNT} recipes`);
    }
  }

  const minDate = new Date(now);
  minDate.setUTCDate(minDate.getUTCDate() - DAYS_SPAN);

  console.log('');
  console.log('Recipe logs seed completed.');
  console.log(`Recipes created: ${RECIPE_COUNT}`);
  console.log(`Meals created: ${totalMeals}`);
  console.log(`Recipe ingredients created: ${totalIngredients}`);
  console.log(`Active recipes (isPublic=true): ${Math.ceil(RECIPE_COUNT * 0.8)}`);
  console.log(`Archived recipes (isPublic=false): ${Math.floor(RECIPE_COUNT * 0.2)}`);
  console.log(
    `Suggested range: from=${minDate.toISOString().slice(0, 10)} to=${now
      .toISOString()
      .slice(0, 10)}`,
  );
}

seedRecipeLogs()
  .catch((error) => {
    console.error('Recipe analytics seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
