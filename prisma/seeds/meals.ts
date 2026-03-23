import {
  Meal,
  MealCategory,
  MealCourse,
  DietStyle,
  PrismaClient,
  Recipe,
} from '@prisma/client';

function mapRecipeCategoryToMealTaxonomy(recipe: Recipe): {
  mealCategories: MealCategory[];
  mealCourse?: MealCourse;
  dietaryLabels: DietStyle[];
} {
  const category = recipe.category?.trim().toLowerCase();
  const mealCategories = new Set<MealCategory>();
  const dietaryLabels = new Set<DietStyle>();
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
      dietaryLabels.add(DietStyle.VEGETARIAN);
      break;
    case 'vegan':
      mealCategories.add(MealCategory.PLANT_PROTEIN);
      dietaryLabels.add(DietStyle.VEGAN);
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
    if (normalized === 'vegan') dietaryLabels.add(DietStyle.VEGAN);
    if (normalized === 'vegetarian') dietaryLabels.add(DietStyle.VEGETARIAN);
    if (normalized === 'pescatarian') dietaryLabels.add(DietStyle.PESCATARIAN);

    // TheMealDB "dietary labels" contain many specific restriction strings
    // (gluten-free, dairy-free, etc.). Map what we can, and collapse the rest.
    if (normalized === 'keto') dietaryLabels.add(DietStyle.KETO);
    if (normalized === 'paleo') dietaryLabels.add(DietStyle.PALEO);
    if (normalized === 'flexitarian') dietaryLabels.add(DietStyle.FLEXITARIAN);
    if (normalized === 'low-carb') dietaryLabels.add(DietStyle.LOW_CARB);

    if (
      normalized === 'gluten-free' ||
      normalized === 'dairy-free' ||
      normalized === 'nut-free' ||
      normalized === 'halal' ||
      normalized === 'kosher'
    ) {
      dietaryLabels.add(DietStyle.OTHER);
    }
  }

  return {
    mealCategories: [...mealCategories],
    mealCourse,
    dietaryLabels: [...dietaryLabels],
  };
}

/**
 * Seed Meal records that are linked to existing recipes.
 *
 * Requirements:
 * - Always create 2 meals for the developer user (developer / dev123 in Keycloak).
 * - Always create 3 meals for the admin user (admin / admin123 in Keycloak).
 *
 * We look up users by email to avoid coupling to a specific DB id:
 * - Developer: dev@foodmission.dev (Keycloak realm user)
 * - Admin: admin@foodmission.dev (Keycloak realm user)
 */
export async function seedMeals(prisma: PrismaClient): Promise<Meal[]> {
  console.log('🍽️ Seeding meals for developer and admin users...');

  // Look up developer and admin users by email (must match Keycloak realm users)
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

  // Prefer public/system recipes (TheMealDB), fall back to any recipe if needed
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
    // Merge and de-duplicate by id
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

  // 2 meals for developer
  if (developer) {
    for (let i = 0; i < 2; i++) {
      const recipe = nextRecipe();
      const taxonomy = mapRecipeCategoryToMealTaxonomy(recipe);
      const meal = await prisma.meal.create({
        data: {
          name: recipe.title,
          userId: developer.id,
          recipeId: recipe.id,
          calories: null,
          proteins: null,
          nutritionalInfo: recipe.nutritionalInfo ?? undefined,
          sustainabilityScore: recipe.sustainabilityScore ?? undefined,
          price: recipe.price ?? undefined,
          barcode: null,
          mealCategories: taxonomy.mealCategories,
          mealCourse: taxonomy.mealCourse,
          dietaryLabels: taxonomy.dietaryLabels,
        },
      });
      meals.push(meal);
    }
  } else {
    console.log(
      '   ⏭️  Developer user dev@foodmission.dev not found; skipping developer meals.',
    );
  }

  // 3 meals for admin
  if (admin) {
    for (let i = 0; i < 3; i++) {
      const recipe = nextRecipe();
      const taxonomy = mapRecipeCategoryToMealTaxonomy(recipe);
      const meal = await prisma.meal.create({
        data: {
          name: recipe.title,
          userId: admin.id,
          recipeId: recipe.id,
          calories: null,
          proteins: null,
          nutritionalInfo: recipe.nutritionalInfo ?? undefined,
          sustainabilityScore: recipe.sustainabilityScore ?? undefined,
          price: recipe.price ?? undefined,
          barcode: null,
          mealCategories: taxonomy.mealCategories,
          mealCourse: taxonomy.mealCourse,
          dietaryLabels: taxonomy.dietaryLabels,
        },
      });
      meals.push(meal);
    }
  } else {
    console.log(
      '   ⏭️  Admin user admin@foodmission.com not found; skipping admin meals.',
    );
  }

  console.log(`   ✅ Seeded ${meals.length} meals linked to recipes`);
  return meals;
}

