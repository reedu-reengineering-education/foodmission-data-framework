import { FoodCategory, PrismaClient } from '@prisma/client';

export interface CategorySeedData {
  name: string;
  description: string;
}

export const categoryData: CategorySeedData[] = [
  {
    name: 'Fruits',
    description:
      'Fresh and dried fruits, including tropical and seasonal varieties',
  },
  {
    name: 'Vegetables',
    description: 'Fresh vegetables, leafy greens, and root vegetables',
  },
  {
    name: 'Dairy',
    description: 'Milk, cheese, yogurt, butter and other dairy products',
  },
  {
    name: 'Grains',
    description: 'Bread, rice, pasta, cereals and grain-based products',
  },
  {
    name: 'Proteins',
    description: 'Meat, poultry, fish, eggs, legumes and protein sources',
  },
  {
    name: 'Beverages',
    description: 'Juices, soft drinks, coffee, tea and other beverages',
  },
  {
    name: 'Snacks',
    description: 'Chips, crackers, nuts and snack foods',
  },
  {
    name: 'Condiments',
    description: 'Sauces, dressings, spices and flavor enhancers',
  },
  {
    name: 'Frozen Foods',
    description: 'Frozen meals, vegetables, fruits and ice cream',
  },
  {
    name: 'Bakery',
    description: 'Fresh bread, pastries, cakes and baked goods',
  },
];

export async function seedCategories(prisma: PrismaClient) {
  console.log('🏷️  Seeding food categories...');

  const categories: FoodCategory[] = [];

  for (const categoryInfo of categoryData) {
    const category = await prisma.foodCategory.upsert({
      where: { name: categoryInfo.name },
      update: {
        description: categoryInfo.description,
      },
      create: {
        name: categoryInfo.name,
        description: categoryInfo.description,
      },
    });
    categories.push(category);
  }

  console.log(`✅ Created/updated ${categories.length} categories`);
  return categories;
}
