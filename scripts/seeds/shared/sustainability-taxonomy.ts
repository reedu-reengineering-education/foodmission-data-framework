import { PrismaClient } from '@prisma/client';

interface SustainabilityTopicSeed {
  code: string;
  name: string;
  sortOrder: number;
}

interface SustainabilityDimensionSeed {
  code: string;
  name: string;
  sortOrder: number;
  topics: SustainabilityTopicSeed[];
}

const sustainabilityTaxonomySeedData: SustainabilityDimensionSeed[] = [
  {
    code: 'DIET_CHANGES',
    name: 'Diet changes towards a more sustainable system',
    sortOrder: 1,
    topics: [
      {
        code: 'REDUCING_MEAT_CONSUMPTION',
        name: 'Reducing meat consumption',
        sortOrder: 1,
      },
      {
        code: 'INCREASING_OTHER_PROTEIN_SOURCES',
        name: 'Increasing other protein sources',
        sortOrder: 2,
      },
      {
        code: 'ALTERNATIVE_STAPLE_FOODS',
        name: 'Alternative staple foods',
        sortOrder: 3,
      },
    ],
  },
  {
    code: 'PRODUCT_CHOICES',
    name: 'Product choices considering environmental impact',
    sortOrder: 2,
    topics: [
      { code: 'LAND_USE', name: 'Land use', sortOrder: 1 },
      { code: 'WATER_USE', name: 'Water use', sortOrder: 2 },
      {
        code: 'ENERGY_CONSUMPTION',
        name: 'Energy consumption',
        sortOrder: 3,
      },
      { code: 'CARBON_FOOTPRINT', name: 'Carbon footprint', sortOrder: 4 },
      { code: 'TRAVEL_DISTANCES', name: 'Travel distances', sortOrder: 5 },
    ],
  },
  {
    code: 'PRODUCTION_METHODS',
    name: 'Production methods',
    sortOrder: 3,
    topics: [
      {
        code: 'LEVEL_OF_PROCESSING',
        name: 'Level of processing',
        sortOrder: 1,
      },
      {
        code: 'COUNTRY_OF_ORIGIN',
        name: 'Country of origin',
        sortOrder: 2,
      },
      {
        code: 'FARMING_PRODUCTION_METHODS',
        name: 'Farming production methods',
        sortOrder: 3,
      },
      {
        code: 'BREEDING_METHODS',
        name: 'Breeding methods',
        sortOrder: 4,
      },
      {
        code: 'FAIR_TRADE_LABOUR',
        name: 'Fair trade/labour',
        sortOrder: 5,
      },
    ],
  },
  {
    code: 'PACKAGING',
    name: 'Packaging',
    sortOrder: 4,
    topics: [
      {
        code: 'SUSTAINABILITY_OF_PACKAGING_MATERIALS',
        name: 'Sustainability of packaging materials',
        sortOrder: 1,
      },
      {
        code: 'CAPACITY_TO_REUSE_PACKAGING',
        name: 'Capacity to reuse packaging',
        sortOrder: 2,
      },
    ],
  },
  {
    code: 'FOOD_WASTE',
    name: 'Food waste',
    sortOrder: 5,
    topics: [
      {
        code: 'PLATE_WASTE',
        name: 'Plate waste (directly to bin)',
        sortOrder: 1,
      },
      {
        code: 'LEFTOVERS_WASTE',
        name: 'Leftovers waste (improper storage or reuse)',
        sortOrder: 2,
      },
      {
        code: 'EXPIRED_FOOD',
        name: 'Expired food (overbuying or poor planning)',
        sortOrder: 3,
      },
      { code: 'OVERCONSUMPTION', name: 'Overconsumption', sortOrder: 4 },
    ],
  },
  {
    code: 'NUTRITION_VALUES',
    name: 'Nutrition values',
    sortOrder: 6,
    topics: [
      { code: 'PROTEIN', name: 'Protein', sortOrder: 1 },
      { code: 'FAT', name: 'Fat', sortOrder: 2 },
      { code: 'SUGAR', name: 'Sugar', sortOrder: 3 },
      { code: 'SALT', name: 'Salt', sortOrder: 4 },
      { code: 'FIBER', name: 'Fiber', sortOrder: 5 },
      { code: 'VITAMINS', name: 'Vitamins', sortOrder: 6 },
      {
        code: 'ENERGY_VALUE_CALORIES',
        name: 'Energy value/Calories',
        sortOrder: 7,
      },
    ],
  },
];

export async function seedSustainabilityTaxonomy(prisma: PrismaClient) {
  console.log('🌿 Seeding sustainability taxonomy...');

  const db = prisma as PrismaClient & {
    sustainabilityDimension: {
      upsert(args: any): Promise<{ id: string }>;
      count(): Promise<number>;
    };
    sustainabilityTopic: {
      upsert(args: any): Promise<unknown>;
      count(): Promise<number>;
    };
  };

  for (const dimensionData of sustainabilityTaxonomySeedData) {
    const dimension = await db.sustainabilityDimension.upsert({
      where: { code: dimensionData.code },
      update: {
        name: dimensionData.name,
        sortOrder: dimensionData.sortOrder,
      },
      create: {
        code: dimensionData.code,
        name: dimensionData.name,
        sortOrder: dimensionData.sortOrder,
      },
    });

    for (const topicData of dimensionData.topics) {
      await db.sustainabilityTopic.upsert({
        where: { code: topicData.code },
        update: {
          dimensionId: dimension.id,
          name: topicData.name,
          sortOrder: topicData.sortOrder,
        },
        create: {
          dimensionId: dimension.id,
          code: topicData.code,
          name: topicData.name,
          sortOrder: topicData.sortOrder,
        },
      });
    }
  }

  const dimensions = await db.sustainabilityDimension.count();
  const topics = await db.sustainabilityTopic.count();

  console.log(
    `✅ Created/updated ${dimensions} sustainability dimensions and ${topics} topics`,
  );

  return { dimensions, topics };
}
