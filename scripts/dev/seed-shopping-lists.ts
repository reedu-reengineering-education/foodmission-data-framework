import { PrismaClient, Unit } from '@prisma/client';

const prisma = new PrismaClient();

// Will be populated from database
let SAMPLE_FOODS: Array<{ id: string }> = [];
let SAMPLE_GENERIC_FOODS: Array<{ id: string }> = [];

// Realistic shopping list titles
const LIST_TITLES = [
  'Weekly groceries',
  'Weekend shopping',
  'Quick top-up',
  'Meal prep',
  'Healthy week',
  'Party supplies',
  'Breakfast essentials',
  'Dinner ideas',
];

async function loadSampleIds() {
  console.log('Loading sample food IDs...');

  const foods = await prisma.foodProduct.findMany({
    take: 80,
    select: { id: true },
  });

  const genericFoods = await prisma.genericFood.findMany({
    take: 30,
    select: { id: true },
  });

  SAMPLE_FOODS = foods;
  SAMPLE_GENERIC_FOODS = genericFoods;

  if (SAMPLE_FOODS.length === 0) {
    throw new Error('No food products found. Please run db:seed first.');
  }
  if (SAMPLE_GENERIC_FOODS.length === 0) {
    throw new Error('No generic foods found. Please run db:seed first.');
  }

  console.log(
    `✓ Loaded ${SAMPLE_FOODS.length} food products and ${SAMPLE_GENERIC_FOODS.length} generic foods`,
  );
}

async function seedShoppingLists() {
  await loadSampleIds();

  console.log('Fetching users...');
  const users = await prisma.user.findMany({ select: { id: true } });
  console.log(`✓ Found ${users.length} users`);

  if (users.length === 0) {
    throw new Error('No users found. Please run db:seed first.');
  }

  const daysToSeed = 7;
  const listsPerDay = 2; // each user creates ~2 lists per day across the period
  let totalLists = 0;
  let totalItems = 0;

  console.log(
    `\nSeeding up to ${daysToSeed} days × ${listsPerDay} list(s)/day for ${users.length} users...`,
  );

  for (const user of users) {
    const usedTitles = new Set<string>();

    for (let dayOffset = 0; dayOffset < daysToSeed; dayOffset++) {
      const date = new Date();
      date.setDate(date.getDate() - dayOffset);
      date.setHours(0, 0, 0, 0);

      const listsThisDay = Math.random() > 0.4 ? listsPerDay : 1;

      for (let listIndex = 0; listIndex < listsThisDay; listIndex++) {
        // Pick a unique title per user
        let title: string;
        let attempts = 0;
        do {
          const base =
            LIST_TITLES[Math.floor(Math.random() * LIST_TITLES.length)];
          title =
            usedTitles.size < LIST_TITLES.length
              ? base
              : `${base} ${dayOffset + 1}`;
          attempts++;
        } while (usedTitles.has(title) && attempts < 20);

        if (usedTitles.has(title)) continue; // skip if we can't get a unique title
        usedTitles.add(title);

        // 3-8 items per list
        const itemCount = Math.floor(Math.random() * 6) + 3;
        const usedFoodIds = new Set<string>();
        const usedGenericIds = new Set<string>();

        const items: Array<{
          itemType: string;
          foodProductId: string | null;
          genericFoodId: string | null;
          quantity: number;
          unit: Unit;
          checked: boolean;
        }> = [];

        for (let i = 0; i < itemCount; i++) {
          const useFood = Math.random() > 0.4; // 60% food products, 40% generic

          if (useFood && SAMPLE_FOODS.length > 0) {
            let food: { id: string };
            let pick = 0;
            do {
              food =
                SAMPLE_FOODS[Math.floor(Math.random() * SAMPLE_FOODS.length)];
              pick++;
            } while (usedFoodIds.has(food.id) && pick < 15);

            if (!usedFoodIds.has(food.id)) {
              usedFoodIds.add(food.id);
              items.push({
                itemType: 'food_product',
                foodProductId: food.id,
                genericFoodId: null,
                quantity: Math.floor(Math.random() * 4) + 1,
                unit: Math.random() > 0.5 ? Unit.PIECES : Unit.G,
                checked: Math.random() > 0.6, // 40% already checked off
              });
            }
          } else if (SAMPLE_GENERIC_FOODS.length > 0) {
            let gf: { id: string };
            let pick = 0;
            do {
              gf =
                SAMPLE_GENERIC_FOODS[
                  Math.floor(Math.random() * SAMPLE_GENERIC_FOODS.length)
                ];
              pick++;
            } while (usedGenericIds.has(gf.id) && pick < 15);

            if (!usedGenericIds.has(gf.id)) {
              usedGenericIds.add(gf.id);
              items.push({
                itemType: 'generic_food',
                foodProductId: null,
                genericFoodId: gf.id,
                quantity: Math.floor(Math.random() * 3) + 1,
                unit: Unit.PIECES,
                checked: Math.random() > 0.6,
              });
            }
          }
        }

        if (items.length === 0) continue;

        const createdAt = new Date(date);
        createdAt.setHours(
          Math.floor(Math.random() * 18) + 6, // 6am–midnight
          Math.floor(Math.random() * 60),
          0,
          0,
        );

        await prisma.shoppingList.create({
          data: {
            userId: user.id,
            title,
            createdAt,
            updatedAt: createdAt,
            items: {
              create: items,
            },
          },
        });

        totalLists++;
        totalItems += items.length;

        if (totalLists % 50 === 0) {
          console.log(`Progress: ${totalLists} shopping lists created...`);
        }
      }
    }
  }

  console.log('\n✅ Seeding completed!');
  console.log(`   Users: ${users.length}`);
  console.log(`   Shopping lists: ${totalLists}`);
  console.log(`   Shopping list items: ${totalItems}`);
  console.log(
    `   Avg items/list: ${totalLists > 0 ? (totalItems / totalLists).toFixed(1) : 0}`,
  );

  // Print suggested date range for the generate batch call
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 7);
  console.log(
    `\n   Suggested batch range: periodStart=${from.toISOString().split('T')[0]}&periodEnd=${to.toISOString().split('T')[0]}`,
  );
}

seedShoppingLists()
  .catch((e) => {
    console.error('\n❌ Seeding failed:', e.message);
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
