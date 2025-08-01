import { PrismaClient } from '@prisma/client';

export interface FoodSeedData {
  name: string;
  description: string;
  barcode?: string;
  openFoodFactsId?: string;
}

export const foodData: FoodSeedData[] = [
  // Fruits
  {
    name: 'Apple',
    description: 'Fresh red apple, crisp and sweet',
    barcode: '1234567890123',
  },
  {
    name: 'Banana',
    description: 'Fresh yellow banana, rich in potassium',
    barcode: '1234567890124',
  },
  {
    name: 'Orange',
    description: 'Fresh orange, high in vitamin C',
    barcode: '1234567890125',
  },
  {
    name: 'Strawberries',
    description: 'Fresh strawberries, sweet and juicy',
    barcode: '1234567890126',
  },

  // Vegetables
  {
    name: 'Carrot',
    description: 'Fresh orange carrot, crunchy and nutritious',
    barcode: '2234567890123',
  },
  {
    name: 'Broccoli',
    description: 'Fresh broccoli florets, rich in vitamins',
    barcode: '2234567890124',
  },
  {
    name: 'Spinach',
    description: 'Fresh spinach leaves, iron-rich leafy green',
    barcode: '2234567890125',
  },
  {
    name: 'Tomato',
    description: 'Fresh red tomato, versatile cooking ingredient',
    barcode: '2234567890126',
  },

  // Dairy
  {
    name: 'Whole Milk',
    description: '1 gallon whole milk, pasteurized',
    barcode: '3234567890123',
  },
  {
    name: 'Cheddar Cheese',
    description: 'Sharp cheddar cheese block, aged',
    barcode: '3234567890124',
  },
  {
    name: 'Greek Yogurt',
    description: 'Plain Greek yogurt, high protein',
    barcode: '3234567890125',
  },

  // Grains
  {
    name: 'White Bread',
    description: 'Sliced white bread loaf',
    barcode: '4234567890123',
  },
  {
    name: 'Brown Rice',
    description: 'Long grain brown rice, whole grain',
    barcode: '4234567890124',
  },
  {
    name: 'Pasta',
    description: 'Spaghetti pasta, durum wheat',
    barcode: '4234567890125',
  },

  // Proteins
  {
    name: 'Chicken Breast',
    description: 'Boneless skinless chicken breast',
    barcode: '5234567890123',
  },
  {
    name: 'Salmon Fillet',
    description: 'Fresh Atlantic salmon fillet',
    barcode: '5234567890124',
  },
  {
    name: 'Eggs',
    description: 'Large grade A eggs, dozen',
    barcode: '5234567890125',
  },
  {
    name: 'Black Beans',
    description: 'Canned black beans, low sodium',
    barcode: '5234567890126',
  },

  // Beverages
  {
    name: 'Orange Juice',
    description: '100% pure orange juice, no pulp',
    barcode: '6234567890123',
  },
  {
    name: 'Green Tea',
    description: 'Organic green tea bags',
    barcode: '6234567890124',
  },

  // Snacks
  {
    name: 'Almonds',
    description: 'Raw almonds, unsalted',
    barcode: '7234567890123',
  },
  {
    name: 'Crackers',
    description: 'Whole wheat crackers',
    barcode: '7234567890124',
  },
];

export async function seedFoods(prisma: PrismaClient) {
  console.log('🍎 Seeding food items...');

  const foods: any[] = [];

  for (const foodInfo of foodData) {
    const food = await prisma.food.upsert({
      where: {
        barcode:
          foodInfo.barcode ||
          `generated-${foodInfo.name.toLowerCase().replace(/\s+/g, '-')}`,
      },
      update: {
        name: foodInfo.name,
        description: foodInfo.description,
        openFoodFactsId: foodInfo.openFoodFactsId,
      },
      create: {
        name: foodInfo.name,
        description: foodInfo.description,
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
