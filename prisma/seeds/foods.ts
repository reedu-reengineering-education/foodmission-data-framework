import { PrismaClient } from '@prisma/client';

export interface FoodSeedData {
  name: string;
  description: string;
  categoryName: string;
  barcode?: string;
  openFoodFactsId?: string;
}

export const foodData: FoodSeedData[] = [
  // Fruits
  {
    name: 'Apple',
    description: 'Fresh red apple, crisp and sweet',
    categoryName: 'Fruits',
    barcode: '1234567890123',
  },
  {
    name: 'Banana',
    description: 'Fresh yellow banana, rich in potassium',
    categoryName: 'Fruits',
    barcode: '1234567890124',
  },
  {
    name: 'Orange',
    description: 'Fresh orange, high in vitamin C',
    categoryName: 'Fruits',
    barcode: '1234567890125',
  },
  {
    name: 'Strawberries',
    description: 'Fresh strawberries, sweet and juicy',
    categoryName: 'Fruits',
    barcode: '1234567890126',
  },

  // Vegetables
  {
    name: 'Carrot',
    description: 'Fresh orange carrot, crunchy and nutritious',
    categoryName: 'Vegetables',
    barcode: '2234567890123',
  },
  {
    name: 'Broccoli',
    description: 'Fresh broccoli florets, rich in vitamins',
    categoryName: 'Vegetables',
    barcode: '2234567890124',
  },
  {
    name: 'Spinach',
    description: 'Fresh spinach leaves, iron-rich leafy green',
    categoryName: 'Vegetables',
    barcode: '2234567890125',
  },
  {
    name: 'Tomato',
    description: 'Fresh red tomato, versatile cooking ingredient',
    categoryName: 'Vegetables',
    barcode: '2234567890126',
  },

  // Dairy
  {
    name: 'Whole Milk',
    description: '1 gallon whole milk, pasteurized',
    categoryName: 'Dairy',
    barcode: '3234567890123',
  },
  {
    name: 'Cheddar Cheese',
    description: 'Sharp cheddar cheese block, aged',
    categoryName: 'Dairy',
    barcode: '3234567890124',
  },
  {
    name: 'Greek Yogurt',
    description: 'Plain Greek yogurt, high protein',
    categoryName: 'Dairy',
    barcode: '3234567890125',
  },

  // Grains
  {
    name: 'White Bread',
    description: 'Sliced white bread loaf',
    categoryName: 'Grains',
    barcode: '4234567890123',
  },
  {
    name: 'Brown Rice',
    description: 'Long grain brown rice, whole grain',
    categoryName: 'Grains',
    barcode: '4234567890124',
  },
  {
    name: 'Pasta',
    description: 'Spaghetti pasta, durum wheat',
    categoryName: 'Grains',
    barcode: '4234567890125',
  },

  // Proteins
  {
    name: 'Chicken Breast',
    description: 'Boneless skinless chicken breast',
    categoryName: 'Proteins',
    barcode: '5234567890123',
  },
  {
    name: 'Salmon Fillet',
    description: 'Fresh Atlantic salmon fillet',
    categoryName: 'Proteins',
    barcode: '5234567890124',
  },
  {
    name: 'Eggs',
    description: 'Large grade A eggs, dozen',
    categoryName: 'Proteins',
    barcode: '5234567890125',
  },
  {
    name: 'Black Beans',
    description: 'Canned black beans, low sodium',
    categoryName: 'Proteins',
    barcode: '5234567890126',
  },

  // Beverages
  {
    name: 'Orange Juice',
    description: '100% pure orange juice, no pulp',
    categoryName: 'Beverages',
    barcode: '6234567890123',
  },
  {
    name: 'Green Tea',
    description: 'Organic green tea bags',
    categoryName: 'Beverages',
    barcode: '6234567890124',
  },

  // Snacks
  {
    name: 'Almonds',
    description: 'Raw almonds, unsalted',
    categoryName: 'Snacks',
    barcode: '7234567890123',
  },
  {
    name: 'Crackers',
    description: 'Whole wheat crackers',
    categoryName: 'Snacks',
    barcode: '7234567890124',
  },
];

export async function seedFoods(prisma: PrismaClient) {
  console.log('🍎 Seeding food items...');

  // Get all categories first
  const categories = await prisma.foodCategory.findMany();
  const categoryMap = new Map(categories.map((cat) => [cat.name, cat.id]));

  const foods: any[] = [];

  for (const foodInfo of foodData) {
    const categoryId = categoryMap.get(foodInfo.categoryName);
    if (!categoryId) {
      console.warn(
        `⚠️  Category '${foodInfo.categoryName}' not found for food '${foodInfo.name}'`,
      );
      continue;
    }

    const food = await prisma.food.upsert({
      where: {
        barcode:
          foodInfo.barcode ||
          `generated-${foodInfo.name.toLowerCase().replace(/\s+/g, '-')}`,
      },
      update: {
        name: foodInfo.name,
        description: foodInfo.description,
        categoryId,
        openFoodFactsId: foodInfo.openFoodFactsId,
      },
      create: {
        name: foodInfo.name,
        description: foodInfo.description,
        categoryId,
        barcode: foodInfo.barcode,
        openFoodFactsId: foodInfo.openFoodFactsId,
        createdBy: 'system-seed',
      },
    });
    foods.push(food);
  }

  console.log(`✅ Created/updated ${foods.length} food items`);
  return foods;
}
