import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanAnalytics() {
  console.log('Starting analytics cleanup...\n');

  // Count existing data per table
  const [
    batches,
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
  ] = await Promise.all([
    prisma.analyticsBatch.count(),
    prisma.analyticsDailyNutrition.count(),
    prisma.analyticsFoodPopularity.count(),
    prisma.analyticsMealPatterns.count(),
    prisma.analyticsSustainability.count(),
    prisma.analyticsMealClassification.count(),
    prisma.analyticsMealRecord.count(),
    prisma.analyticsDemographicNutrition.count(),
    prisma.analyticsDemographicClassification.count(),
    prisma.analyticsDemographicPatterns.count(),
    prisma.analyticsCrossDimNutrition.count(),
    prisma.analyticsCrossDimClassification.count(),
    prisma.analyticsCrossDimPatterns.count(),
  ]);

  console.log('Current analytics data:');
  console.log(`  Batches:                       ${batches}`);
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
  console.log(`  Cross-dim patterns:            ${crossDimPatterns}\n`);

  const total =
    batches +
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
    crossDimPatterns;

  if (total === 0) {
    console.log('✓ No analytics data to clean');
    return;
  }

  // Deleting batches cascades to all child tables via FK onDelete: Cascade
  console.log('Deleting all batches (cascades to all analytics tables)...');
  const deleted = await prisma.analyticsBatch.deleteMany({});
  console.log(`✓ Deleted ${deleted.count} batches and all associated records`);

  console.log('\n✅ Analytics cleanup completed!');
}

cleanAnalytics()
  .catch((e) => {
    console.error('\n❌ Cleanup failed:', e.message);
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
