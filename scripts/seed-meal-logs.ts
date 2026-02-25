import { PrismaClient, MealType, TypeOfMeal, Unit } from '@prisma/client';

const prisma = new PrismaClient();

const MEAL_TYPES = [MealType.SALAD, MealType.MEAT, MealType.PASTA];

const TYPE_OF_MEALS = [
  TypeOfMeal.BREAKFAST,
  TypeOfMeal.LUNCH,
  TypeOfMeal.DINNER,
];

// Will be populated from database
let SAMPLE_FOODS: Array<{ id: string; hasPer100gData: boolean }> = [];
let SAMPLE_CATEGORIES: Array<{ id: string; hasPer100gData: boolean }> = [];

async function loadSampleIds() {
  console.log('Loading sample food and category IDs...');

  const foods = await prisma.food.findMany({
    take: 50,
    select: {
      id: true,
      nutritionDataPer: true,
      energyKcal: true,
    },
  });

  const categories = await prisma.foodCategory.findMany({
    take: 20,
    select: {
      id: true,
      energyKcal: true,
      quantity: true,
    },
  });

  SAMPLE_FOODS = foods.map((f) => ({
    id: f.id,
    hasPer100gData:
      f.nutritionDataPer === '100g' || (!!f.energyKcal && !f.nutritionDataPer),
  }));

  SAMPLE_CATEGORIES = categories.map((c) => ({
    id: c.id,
    hasPer100gData: !!c.energyKcal, // NEVO data is always per 100g
  }));

  if (SAMPLE_FOODS.length === 0) {
    throw new Error('No foods found in database. Please seed foods first.');
  }

  if (SAMPLE_CATEGORIES.length === 0) {
    throw new Error(
      'No food categories found in database. Please seed categories first.',
    );
  }

  console.log(
    `✓ Loaded ${SAMPLE_FOODS.length} foods and ${SAMPLE_CATEGORIES.length} categories`,
  );
}

async function seedMealLogs() {
  await loadSampleIds();

  console.log('Fetching users...');
  const users = await prisma.user.findMany({ select: { id: true } });
  console.log(`✓ Found ${users.length} users`);

  if (users.length === 0) {
    throw new Error('No users found in database. Please seed users first.');
  }

  const daysToSeed = 7;
  const mealsPerDay = 3;
  let totalMealLogs = 0;
  let totalMealItems = 0;

  console.log(
    `\nSeeding ${daysToSeed} days × ${mealsPerDay} meals/day for ${users.length} users...`,
  );
  console.log(
    `Expected total: ${users.length * daysToSeed * mealsPerDay} meal logs\n`,
  );

  for (const user of users) {
    for (let dayOffset = 0; dayOffset < daysToSeed; dayOffset++) {
      const date = new Date();
      date.setDate(date.getDate() - dayOffset);
      date.setHours(0, 0, 0, 0);

      for (let mealIndex = 0; mealIndex < mealsPerDay; mealIndex++) {
        // Create meal with 1-4 items
        const itemCount = Math.floor(Math.random() * 4) + 1;
        const mealType =
          MEAL_TYPES[Math.floor(Math.random() * MEAL_TYPES.length)];
        const typeOfMeal = TYPE_OF_MEALS[mealIndex];

        // Track used IDs to prevent duplicates in the same meal
        const usedFoodIds = new Set<string>();
        const usedCategoryIds = new Set<string>();

        const mealItems: Array<{
          foodId: string | null;
          foodCategoryId: string | null;
          itemType: string;
          quantity: number;
          unit: Unit;
        }> = [];
        for (let i = 0; i < itemCount; i++) {
          const useFood = Math.random() > 0.5;

          if (useFood) {
            // Find unused food
            let foodItem: { id: string; hasPer100gData: boolean };
            let attempts = 0;
            do {
              foodItem =
                SAMPLE_FOODS[Math.floor(Math.random() * SAMPLE_FOODS.length)];
              attempts++;
            } while (usedFoodIds.has(foodItem.id) && attempts < 10);

            if (!usedFoodIds.has(foodItem.id)) {
              usedFoodIds.add(foodItem.id);
              const quantity = foodItem.hasPer100gData
                ? Math.floor(Math.random() * 450) + 50 // 50-500g
                : Math.floor(Math.random() * 3) + 1; // 1-3 pieces
              const unit = foodItem.hasPer100gData ? Unit.G : Unit.PIECES;

              mealItems.push({
                foodId: foodItem.id,
                foodCategoryId: null,
                itemType: 'food',
                quantity,
                unit,
              });
            }
          } else {
            // Find unused category
            let categoryItem: { id: string; hasPer100gData: boolean };
            let attempts = 0;
            do {
              categoryItem =
                SAMPLE_CATEGORIES[
                  Math.floor(Math.random() * SAMPLE_CATEGORIES.length)
                ];
              attempts++;
            } while (usedCategoryIds.has(categoryItem.id) && attempts < 10);

            if (!usedCategoryIds.has(categoryItem.id)) {
              usedCategoryIds.add(categoryItem.id);
              const quantity = categoryItem.hasPer100gData
                ? Math.floor(Math.random() * 450) + 50 // 50-500g
                : Math.floor(Math.random() * 3) + 1; // 1-3 pieces
              const unit = categoryItem.hasPer100gData ? Unit.G : Unit.PIECES;

              mealItems.push({
                foodId: null,
                foodCategoryId: categoryItem.id,
                itemType: 'food_category',
                quantity,
                unit,
              });
            }
          }
        }

        // Skip if no items could be generated
        if (mealItems.length === 0) {
          continue;
        }

        const meal = await prisma.meal.create({
          data: {
            name: `${typeOfMeal} ${date.toISOString().split('T')[0]}`,
            mealType,
            userId: user.id,
            items: {
              create: mealItems,
            },
          },
        });

        // Create meal log with timestamp spread across the day
        const hourOffset = mealIndex === 0 ? 8 : mealIndex === 1 ? 13 : 19; // 8am, 1pm, 7pm
        const timestamp = new Date(date);
        timestamp.setHours(hourOffset, Math.floor(Math.random() * 60), 0, 0);

        await prisma.mealLog.create({
          data: {
            mealId: meal.id,
            userId: user.id,
            typeOfMeal,
            timestamp,
            mealFromPantry: Math.random() > 0.7, // 30% from pantry
          },
        });

        totalMealLogs++;
        totalMealItems += itemCount;

        if (totalMealLogs % 100 === 0) {
          console.log(`Progress: ${totalMealLogs} meal logs created...`);
        }
      }
    }
  }

  console.log('\n✅ Seeding completed!');
  console.log(`   Users: ${users.length}`);
  console.log(`   Meal logs: ${totalMealLogs}`);
  console.log(`   Meal items: ${totalMealItems}`);
  console.log(
    `   Avg items/meal: ${(totalMealItems / totalMealLogs).toFixed(1)}`,
  );
}

seedMealLogs()
  .catch((e) => {
    console.error('\n❌ Seeding failed:', e.message);
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
