import {
  Meal,
  MealCategory,
  MealCourse,
  PrismaClient,
  Recipe,
} from '@prisma/client';

function mapRecipeCategoryToMealTaxonomy(recipe: Recipe): {
  mealCategories: MealCategory[];
  mealCourse?: MealCourse;
  dietaryLabels: string[];
} {
  const category = recipe.category?.trim().toLowerCase();
  const mealCategories = new Set<MealCategory>();
  const dietaryLabels = new Set<string>();
  let mealCourse: MealCourse | undefined;

  switch (category) {
    case 'beef':
    case 'goat':
    case 'lamb':
    case 'pork':
      mealCategories.add(MealCategory.ANIMAL_PROTEIN);
      break;
    case 'chicken':
      mealCategories.add(MealCategory.ANIMAL_PROTEIN);
      break;
    case 'seafood':
      mealCategories.add(MealCategory.SEAFOOD);
      break;
    case 'pasta':
      mealCategories.add(MealCategory.STARCH_GRAIN);
      break;
    case 'vegetarian':
      mealCategories.add(MealCategory.PLANT_PROTEIN);
      dietaryLabels.add('VEGETARIAN');
      break;
    case 'vegan':
      mealCategories.add(MealCategory.PLANT_PROTEIN);
      dietaryLabels.add('VEGAN');
      break;
    case 'starter':
      mealCourse = MealCourse.SIDE_SNACK;
      break;
    case 'side':
      mealCourse = MealCourse.SIDE_SNACK;
      break;
    case 'dessert':
      mealCourse = MealCourse.DESSERT;
      break;
    default:
      mealCategories.add(MealCategory.MIXED_OTHER);
      break;
  }

  for (const raw of recipe.dietaryLabels) {
    const normalized = raw.trim().toLowerCase();
    if (normalized === 'vegan') dietaryLabels.add('VEGAN');
    if (normalized === 'vegetarian') dietaryLabels.add('VEGETARIAN');
    if (normalized === 'pescatarian') dietaryLabels.add('PESCATARIAN');
    if (normalized === 'gluten-free') dietaryLabels.add('GLUTEN_FREE');
    if (normalized === 'dairy-free') dietaryLabels.add('DAIRY_FREE');
    if (normalized === 'nut-free') dietaryLabels.add('NUT_FREE');
    if (normalized === 'halal') dietaryLabels.add('HALAL');
    if (normalized === 'kosher') dietaryLabels.add('KOSHER');
  }

  return {
    mealCategories: [...mealCategories],
    mealCourse,
    dietaryLabels: [...dietaryLabels],
  };
}

export async function seedMeals(prisma: PrismaClient): Promise<Meal[]> {
  console.log('🍽️ Seeding meals for developer and admin users...');

  const developer = await prisma.user.findFirst({
    where: { email: 'dev@foodmission.dev' },
  });

  const admin = await prisma.user.findFirst({
    where: { email: 'admin@foodmission.dev' },
  });

  if (!developer && !admin) {
    console.log(
      '   ⏭️  Skipping Meal seed: no developer or admin users found (dev@foodmission.dev / admin@foodmission.dev).',
    );
    return [];
  }

  let recipes = await prisma.recipe.findMany({
    where: {
      OR: [{ isPublic: true }, { source: 'themealdb' }],
    },
    orderBy: { createdAt: 'asc' },
    take: 10,
  });

  if (recipes.length < 5) {
    const extra = await prisma.recipe.findMany({
      where: {},
      orderBy: { createdAt: 'asc' },
      take: 10,
    });
    const byId = new Map(extra.concat(recipes).map((r) => [r.id, r]));
    recipes = Array.from(byId.values());
  }

  if (recipes.length === 0) {
    console.log(
      '   ⏭️  Skipping Meal seed: no recipes available to link.',
    );
    return [];
  }

  const meals: Meal[] = [];
  let recipeIndex = 0;

  const nextRecipe = () => {
    const recipe = recipes[recipeIndex % recipes.length]!;
    recipeIndex++;
    return recipe;
  };

  const createMealsForUser = async (userId: string, count: number) => {
    for (let i = 0; i < count; i++) {
      const recipe = nextRecipe();
      const taxonomy = mapRecipeCategoryToMealTaxonomy(recipe);
      const meal = await prisma.meal.create({
        data: {
          name: recipe.title,
          userId,
          recipeId: recipe.id,
          calories: null,
          proteins: null,
          nutritionalInfo: recipe.nutritionalInfo ?? undefined,
          sustainabilityScore: recipe.sustainabilityScore ?? undefined,
          price: recipe.price ?? undefined,
          barcode: null,
          mealCategories: taxonomy.mealCategories,
          mealCourse: taxonomy.mealCourse,
          dietaryLabels: taxonomy.dietaryLabels as any,
        },
      });
      meals.push(meal);
    }
  };

  if (developer) {
    await createMealsForUser(developer.id, 2);
  } else {
    console.log(
      '   ⏭️  Developer user dev@foodmission.dev not found; skipping developer meals.',
    );
  }

  if (admin) {
    await createMealsForUser(admin.id, 3);
  } else {
    console.log(
      '   ⏭️  Admin user admin@foodmission.com not found; skipping admin meals.',
    );
  }

  console.log(`   ✅ Seeded ${meals.length} meals linked to recipes`);
  return meals;
}

