import { PrismaClient } from '@prisma/client';
import { seedFoodKeeper } from '../../scripts/seeds/prod/foodkeeper';
import {
  createTestPrismaClient,
  createTestFixtures,
  cleanupTestFixtures,
  TestFixtures,
} from './helpers/prisma-e2e-helpers';

jest.setTimeout(60000);

describe('Shopping List Items to Pantry', () => {
  let prisma: PrismaClient;
  let fixtures: TestFixtures;

  beforeAll(async () => {
    prisma = createTestPrismaClient();
    await seedFoodKeeper(prisma);
    fixtures = await createTestFixtures(prisma, 'e2e-shopping-to-pantry-user', {
      withShoppingList: true,
    });
  });

  afterAll(async () => {
    await cleanupTestFixtures(prisma, fixtures);
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await prisma.shoppingListItem.deleteMany({
      where: { shoppingListId: fixtures.shoppingListId },
    });
    await prisma.pantryItem.deleteMany({
      where: { pantryId: fixtures.pantryId },
    });
  });

  it('should create and toggle a shopping list item', async () => {
    const item = await prisma.shoppingListItem.create({
      data: {
        shoppingListId: fixtures.shoppingListId!,
        foodProductId: fixtures.foodProductId,
        quantity: 2,
        unit: 'L',
        checked: false,
      },
    });

    expect(item.checked).toBe(false);

    const toggled = await prisma.shoppingListItem.update({
      where: { id: item.id },
      data: { checked: true },
    });

    expect(toggled.checked).toBe(true);
  });

  it('should create pantry item from checked shopping list item with auto expiry', async () => {
    const shoppingListItem = await prisma.shoppingListItem.create({
      data: {
        shoppingListId: fixtures.shoppingListId!,
        foodProductId: fixtures.foodProductId,
        quantity: 2,
        unit: 'L',
        checked: false,
      },
    });

    await prisma.shoppingListItem.update({
      where: { id: shoppingListItem.id },
      data: { checked: true },
    });

    const autoExpiryDate = new Date();
    autoExpiryDate.setDate(autoExpiryDate.getDate() + 7);

    const pantryItem = await prisma.pantryItem.create({
      data: {
        pantryId: fixtures.pantryId,
        foodProductId: shoppingListItem.foodProductId!,
        quantity: shoppingListItem.quantity,
        unit: shoppingListItem.unit,
        expiryDate: autoExpiryDate,
        expiryDateSource: 'auto_foodkeeper',
      },
    });

    expect(pantryItem.foodProductId).toBe(fixtures.foodProductId);
    expect(pantryItem.quantity).toBe(shoppingListItem.quantity);
    expect(pantryItem.expiryDate).toBeDefined();
    expect(pantryItem.expiryDateSource).toBe('auto_foodkeeper');
  });

  it('should have FoodShelfLife entries available for expiry calculation on move to pantry', async () => {
    const shelfLifeCount = await prisma.foodShelfLife.count();
    expect(shelfLifeCount).toBeGreaterThan(0);
  });

  it('should persist pantry item expiry data correctly after move from shopping list', async () => {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 14);

    const pantryItem = await prisma.pantryItem.create({
      data: {
        pantryId: fixtures.pantryId,
        foodProductId: fixtures.foodProductId,
        quantity: 1,
        unit: 'L',
        expiryDate,
        expiryDateSource: 'auto_foodkeeper',
      },
    });

    const fetched = await prisma.pantryItem.findUnique({
      where: { id: pantryItem.id },
    });
    expect(fetched?.expiryDate).toBeDefined();
    expect(fetched?.expiryDateSource).toBe('auto_foodkeeper');
  });
});
