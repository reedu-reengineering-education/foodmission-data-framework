import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanAnalytics() {
  console.log('Starting analytics cleanup...\n');

  // Count existing data per table
  const [
    mlBatches,
    nutrition,
    popularity,
    patterns,
    sustainability,
    classification,
    records,
    demoNutrition,
    demoClassification,
    demoPatterns,
    crossDimNutrition,
    crossDimClassification,
    crossDimPatterns,
    slBatches,
    slItemPopularity,
    slCategoryPopularity,
    slListPatterns,
    slSustainability,
    slFoodGroups,
    slDemoPatterns,
    slDemoClassification,
    slCrossDimPatterns,
    slCrossDimClassification,
  ] = await Promise.all([
    prisma.mealLogAnalyticsBatch.count(),
    prisma.mealLogAnalyticsDailyNutrition.count(),
    prisma.mealLogAnalyticsFoodPopularity.count(),
    prisma.mealLogAnalyticsMealPatterns.count(),
    prisma.mealLogAnalyticsSustainability.count(),
    prisma.mealLogAnalyticsMealClassification.count(),
    prisma.mealLogAnalyticsMealRecord.count(),
    prisma.mealLogAnalyticsDemographicNutrition.count(),
    prisma.mealLogAnalyticsDemographicClassification.count(),
    prisma.mealLogAnalyticsDemographicPatterns.count(),
    prisma.mealLogAnalyticsCrossDimNutrition.count(),
    prisma.mealLogAnalyticsCrossDimClassification.count(),
    prisma.mealLogAnalyticsCrossDimPatterns.count(),
    prisma.shoppingListAnalyticsBatch.count(),
    prisma.shoppingListAnalyticsItemPopularity.count(),
    prisma.shoppingListAnalyticsCategoryPopularity.count(),
    prisma.shoppingListAnalyticsListPatterns.count(),
    prisma.shoppingListAnalyticsSustainability.count(),
    prisma.shoppingListAnalyticsFoodGroups.count(),
    prisma.shoppingListAnalyticsDemographicPatterns.count(),
    prisma.shoppingListAnalyticsDemographicClassification.count(),
    prisma.shoppingListAnalyticsCrossDimPatterns.count(),
    prisma.shoppingListAnalyticsCrossDimClassification.count(),
  ]);

  console.log('--- Meal-log analytics ---');
  console.log(`  Batches:                       ${mlBatches}`);
  console.log(`  Daily nutrition:               ${nutrition}`);
  console.log(`  Food popularity:               ${popularity}`);
  console.log(`  Meal patterns:                 ${patterns}`);
  console.log(`  Sustainability:                ${sustainability}`);
  console.log(`  Meal classification:           ${classification}`);
  console.log(`  Meal records:                  ${records}`);
  console.log(`  Demographic nutrition:         ${demoNutrition}`);
  console.log(`  Demographic classification:    ${demoClassification}`);
  console.log(`  Demographic patterns:          ${demoPatterns}`);
  console.log(`  Cross-dim nutrition:           ${crossDimNutrition}`);
  console.log(`  Cross-dim classification:      ${crossDimClassification}`);
  console.log(`  Cross-dim patterns:            ${crossDimPatterns}`);

  console.log('\n--- Shopping-list analytics ---');
  console.log(`  Batches:                       ${slBatches}`);
  console.log(`  Item popularity:               ${slItemPopularity}`);
  console.log(`  Category popularity:           ${slCategoryPopularity}`);
  console.log(`  List patterns:                 ${slListPatterns}`);
  console.log(`  Sustainability:                ${slSustainability}`);
  console.log(`  Food groups:                   ${slFoodGroups}`);
  console.log(`  Demographic patterns:          ${slDemoPatterns}`);
  console.log(`  Demographic classification:    ${slDemoClassification}`);
  console.log(`  Cross-dim patterns:            ${slCrossDimPatterns}`);
  console.log(`  Cross-dim classification:      ${slCrossDimClassification}\n`);

  const total =
    mlBatches +
    nutrition +
    popularity +
    patterns +
    sustainability +
    classification +
    records +
    demoNutrition +
    demoClassification +
    demoPatterns +
    crossDimNutrition +
    crossDimClassification +
    crossDimPatterns +
    slBatches +
    slItemPopularity +
    slCategoryPopularity +
    slListPatterns +
    slSustainability +
    slFoodGroups +
    slDemoPatterns +
    slDemoClassification +
    slCrossDimPatterns +
    slCrossDimClassification;

  if (total === 0) {
    console.log('✓ No analytics data to clean');
    return;
  }

  // Deleting batches cascades to all child tables via FK onDelete: Cascade
  console.log('Deleting all batches (cascades to all analytics tables)...');
  const [deletedMl, deletedSl] = await Promise.all([
    prisma.mealLogAnalyticsBatch.deleteMany({}),
    prisma.shoppingListAnalyticsBatch.deleteMany({}),
  ]);
  console.log(`✓ Deleted ${deletedMl.count} meal-log batches`);
  console.log(`✓ Deleted ${deletedSl.count} shopping-list batches`);

  console.log('\n✅ Analytics cleanup completed!');
}

cleanAnalytics()
  .catch((e) => {
    console.error('\n❌ Cleanup failed:', e.message);
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
