import { PrismaClient } from '@prisma/client';
import {
  createTestPrismaClient,
  createTestFixtures,
  cleanupTestFixtures,
  setupDbSuite,
  TestFixtures,
} from './test-utils/db-e2e-helpers';

describe('Pantry Items Auto Expiry', () => {
  let prisma: PrismaClient;
  let skipSuite = false;
  let fixtures: TestFixtures;

  beforeAll(async () => {
    prisma = createTestPrismaClient();
    skipSuite = !(await setupDbSuite(prisma));
    if (skipSuite) return;

    fixtures = await createTestFixtures(prisma, 'e2e-auto-expiry-user');
  });

  afterAll(async () => {
    if (!skipSuite) await cleanupTestFixtures(prisma, fixtures);
    await prisma.$disconnect();
  });

  afterEach(async () => {
    if (skipSuite) return;
    await prisma.pantryItem.deleteMany({
      where: { pantryId: fixtures.pantryId },
    });
  });

  it('should store manual expiry date when provided', async () => {
    if (skipSuite) return;

    const manualExpiryDate = new Date('2027-06-15');

    const pantryItem = await prisma.pantryItem.create({
      data: {
        pantryId: fixtures.pantryId,
        foodId: fixtures.foodId,
        quantity: 5,
        unit: 'PIECES',
        expiryDate: manualExpiryDate,
        expiryDateSource: 'manual',
      },
    });

    expect(pantryItem.expiryDate).toEqual(manualExpiryDate);
    expect(pantryItem.expiryDateSource).toBe('manual');
  });

  it('should persist auto_foodkeeper expiryDateSource correctly', async () => {
    if (skipSuite) return;

    const autoExpiryDate = new Date();
    autoExpiryDate.setDate(autoExpiryDate.getDate() + 7);

    const pantryItem = await prisma.pantryItem.create({
      data: {
        pantryId: fixtures.pantryId,
        foodId: fixtures.foodId,
        quantity: 1,
        unit: 'L',
        expiryDate: autoExpiryDate,
        expiryDateSource: 'auto_foodkeeper',
      },
    });

    const fetched = await prisma.pantryItem.findUnique({
      where: { id: pantryItem.id },
    });
    expect(fetched?.expiryDateSource).toBe('auto_foodkeeper');
    expect(fetched?.expiryDate).toBeDefined();
  });

  it('should have FoodShelfLife data available for expiry calculation', async () => {
    if (skipSuite) return;

    const shelfLifeCount = await prisma.foodShelfLife.count();
    expect(shelfLifeCount).toBeGreaterThan(0);

    const dairyEntries = await prisma.foodShelfLife.findMany({
      where: { categoryName: { contains: 'Dairy', mode: 'insensitive' } },
    });
    expect(dairyEntries.length).toBeGreaterThan(0);
  });

  it('should allow pantry item creation without expiry date', async () => {
    if (skipSuite) return;

    const pantryItem = await prisma.pantryItem.create({
      data: {
        pantryId: fixtures.pantryId,
        foodId: fixtures.foodId,
        quantity: 2,
        unit: 'L',
      },
    });

    expect(pantryItem).toBeDefined();
    expect(pantryItem.expiryDate).toBeNull();
    expect(pantryItem.expiryDateSource).toBeNull();
  });
});
