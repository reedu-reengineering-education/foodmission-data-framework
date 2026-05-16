import { ShoppingListAnalyticsAggregator } from './shopping-list-analytics-aggregator.service';

describe('ShoppingListAnalyticsAggregator', () => {
  let aggregator: ShoppingListAnalyticsAggregator;
  let prisma: { $queryRaw: jest.Mock };

  const periodStart = new Date('2026-04-01T00:00:00.000Z');
  const periodEnd = new Date('2026-05-01T00:00:00.000Z');

  beforeEach(() => {
    prisma = { $queryRaw: jest.fn() };
    aggregator = new ShoppingListAnalyticsAggregator(prisma as any);
  });

  // ============================================================
  // Helpers
  // ============================================================

  const makeRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
    itemId: 'item-1',
    userId: 'user-1',
    listId: 'list-1',
    createdAt: new Date('2026-04-15T10:00:00.000Z'),
    userAgeGroup: '25_34',
    userGender: 'FEMALE',
    userEducationLevel: 'BACHELOR',
    userRegion: 'NL',
    userCountry: 'NL',
    itemType: 'food_product',
    quantity: 2,
    unit: 'PIECES',
    foodName: 'Whole Milk',
    foodGroup: 'Dairy',
    category: 'Dairy',
    energyKcal: 61,
    proteins: 3.2,
    fat: 3.3,
    carbohydrates: 4.8,
    fiber: 0,
    sodium: 0.04,
    sugar: 4.8,
    saturatedFat: 2.1,
    nutriScoreGrade: 'B',
    ecoScoreGrade: 'c',
    novaGroup: 1,
    isVegetarian: true,
    isVegan: false,
    carbonFootprint: 3.2,
    ...overrides,
  });

  // Build N rows for N distinct users, same date/list structure
  const makeRows = (
    n: number,
    overrides: Partial<Record<string, unknown>> = {},
  ) =>
    Array.from({ length: n }, (_, i) =>
      makeRow({
        itemId: `item-${i}`,
        userId: `user-${i}`,
        listId: `list-${i}`,
        ...overrides,
      }),
    );

  // ============================================================
  // K-anonymity suppression
  // ============================================================

  it('suppresses item popularity rows where uniqueUsers < 5', async () => {
    prisma.$queryRaw.mockResolvedValue(makeRows(4)); // 4 users — below threshold

    const result = await aggregator.aggregate(periodStart, periodEnd);

    expect(result.itemPopularity).toHaveLength(0);
    expect(result.suppressedGroups).toBeGreaterThan(0);
  });

  it('keeps item popularity rows where uniqueUsers >= 5', async () => {
    prisma.$queryRaw.mockResolvedValue(makeRows(5));

    const result = await aggregator.aggregate(periodStart, periodEnd);

    expect(result.itemPopularity).toHaveLength(1);
    expect(result.itemPopularity[0].foodName).toBe('Whole Milk');
    expect(result.itemPopularity[0].uniqueUsers).toBe(5);
  });

  it('suppresses category popularity where uniqueUsers < 5', async () => {
    prisma.$queryRaw.mockResolvedValue(makeRows(3, { category: 'Dairy' }));

    const result = await aggregator.aggregate(periodStart, periodEnd);

    expect(result.categoryPopularity).toHaveLength(0);
  });

  it('keeps category popularity where uniqueUsers >= 5', async () => {
    prisma.$queryRaw.mockResolvedValue(makeRows(5, { category: 'Dairy' }));

    const result = await aggregator.aggregate(periodStart, periodEnd);

    expect(result.categoryPopularity).toHaveLength(1);
    expect(result.categoryPopularity[0].category).toBe('Dairy');
  });

  it('suppresses list patterns where userCount < 5', async () => {
    prisma.$queryRaw.mockResolvedValue(makeRows(4));

    const result = await aggregator.aggregate(periodStart, periodEnd);

    expect(result.listPatterns).toHaveLength(0);
  });

  it('keeps list patterns where userCount >= 5', async () => {
    prisma.$queryRaw.mockResolvedValue(makeRows(5));

    const result = await aggregator.aggregate(periodStart, periodEnd);

    expect(result.listPatterns).toHaveLength(1);
    expect(result.listPatterns[0].userCount).toBe(5);
    expect(result.listPatterns[0].totalLists).toBe(5);
  });

  it('applies K=20 suppression for cross-dimensional aggregates', async () => {
    // 19 users in one gender group — cross-dim should be suppressed
    const rows = [
      ...Array.from({ length: 19 }, (_, i) =>
        makeRow({ userId: `f-${i}`, listId: `fl-${i}`, itemId: `fi-${i}`, userGender: 'FEMALE' }),
      ),
      ...Array.from({ length: 20 }, (_, i) =>
        makeRow({ userId: `m-${i}`, listId: `ml-${i}`, itemId: `mi-${i}`, userGender: 'MALE' }),
      ),
    ];
    prisma.$queryRaw.mockResolvedValue(rows);

    const result = await aggregator.aggregate(periodStart, periodEnd);

    const ageGenderCrossDim = result.crossDimPatterns.filter(
      (r) => r.dim1Name === 'ageGroup' && r.dim2Name === 'gender',
    );

    // FEMALE group (19 users) should be suppressed at K=20
    expect(
      ageGenderCrossDim.some(
        (r) => r.dim2Value === 'FEMALE' && r.userCount === 19,
      ),
    ).toBe(false);
    // MALE group (20 users) should survive
    expect(
      ageGenderCrossDim.some(
        (r) => r.dim2Value === 'MALE' && r.userCount === 20,
      ),
    ).toBe(true);
  });

  // ============================================================
  // Item popularity
  // ============================================================

  it('counts frequency and unique users correctly for item popularity', async () => {
    // user-0 adds Milk twice (two separate items in the same list)
    const rows = [
      ...makeRows(5), // 5 users each with Whole Milk (1 each)
      makeRow({ itemId: 'extra-item', userId: 'user-0', listId: 'list-0', foodName: 'Whole Milk' }),
    ];
    prisma.$queryRaw.mockResolvedValue(rows);

    const result = await aggregator.aggregate(periodStart, periodEnd);

    const milkRow = result.itemPopularity.find((r) => r.foodName === 'Whole Milk');
    expect(milkRow).toBeDefined();
    expect(milkRow!.frequency).toBe(6); // 6 item occurrences
    expect(milkRow!.uniqueUsers).toBe(5); // still 5 distinct users
  });

  it('selects predominant unit by mode', async () => {
    const rows = [
      ...makeRows(4, { unit: 'PIECES' }),
      makeRow({ userId: 'user-4', listId: 'list-4', itemId: 'item-4', unit: 'KG' }),
      makeRow({ userId: 'user-5', listId: 'list-5', itemId: 'item-5', unit: 'PIECES' }),
    ];
    prisma.$queryRaw.mockResolvedValue(rows);

    const result = await aggregator.aggregate(periodStart, periodEnd);

    const milkRow = result.itemPopularity.find((r) => r.foodName === 'Whole Milk');
    expect(milkRow!.predominantUnit).toBe('PIECES');
  });

  // ============================================================
  // Category popularity
  // ============================================================

  it('counts multiple food categories independently', async () => {
    const rows = [
      ...makeRows(5, { category: 'Dairy', foodGroup: 'Dairy', foodName: 'Milk' }),
      ...Array.from({ length: 5 }, (_, i) =>
        makeRow({
          userId: `v-user-${i}`,
          listId: `v-list-${i}`,
          itemId: `v-item-${i}`,
          category: 'Vegetables',
          foodGroup: 'Vegetables',
          foodName: 'Carrot',
        }),
      ),
    ];
    prisma.$queryRaw.mockResolvedValue(rows);

    const result = await aggregator.aggregate(periodStart, periodEnd);

    const dairy = result.categoryPopularity.find((r) => r.category === 'Dairy');
    const veg = result.categoryPopularity.find((r) => r.category === 'Vegetables');
    expect(dairy).toBeDefined();
    expect(veg).toBeDefined();
    expect(dairy!.frequency).toBe(5);
    expect(veg!.frequency).toBe(5);
  });

  it('ignores items without a category', async () => {
    const rows = makeRows(5, { category: null, foodGroup: null });
    prisma.$queryRaw.mockResolvedValue(rows);

    const result = await aggregator.aggregate(periodStart, periodEnd);

    expect(result.categoryPopularity).toHaveLength(0);
  });

  // ============================================================
  // List patterns
  // ============================================================

  it('calculates avgItemsPerList and item type percentages correctly', async () => {
    // 5 users — each with a list containing 1 food_product item and 1 generic_food item
    const rows = [
      ...Array.from({ length: 5 }, (_, i) =>
        makeRow({
          userId: `u-${i}`,
          listId: `l-${i}`,
          itemId: `fp-${i}`,
          itemType: 'food_product',
        }),
      ),
      ...Array.from({ length: 5 }, (_, i) =>
        makeRow({
          userId: `u-${i}`,
          listId: `l-${i}`,
          itemId: `gf-${i}`,
          itemType: 'generic_food',
        }),
      ),
    ];
    prisma.$queryRaw.mockResolvedValue(rows);

    const result = await aggregator.aggregate(periodStart, periodEnd);

    expect(result.listPatterns).toHaveLength(1);
    const p = result.listPatterns[0];
    expect(p.avgItemsPerList).toBe(2); // 10 items across 5 lists
    expect(p.foodProductPct).toBe(50);
    expect(p.genericFoodPct).toBe(50);
    expect(p.avgListsPerUser).toBe(1);
  });

  // ============================================================
  // Nutrition profile
  // ============================================================

  it('averages nutritional values across all items', async () => {
    const rows = [
      ...makeRows(4, { energyKcal: 100, proteins: 10 }),
      makeRow({ userId: 'user-4', listId: 'list-4', itemId: 'item-4', energyKcal: 200, proteins: 20 }),
    ];
    prisma.$queryRaw.mockResolvedValue(rows);

    const result = await aggregator.aggregate(periodStart, periodEnd);

    expect(result.nutritionProfile).toHaveLength(1);
    const n = result.nutritionProfile[0];
    expect(n.avgCaloriesPer100g).toBeCloseTo(120, 5); // (4*100 + 200) / 5
    expect(n.avgProteinsPer100g).toBeCloseTo(12, 5);  // (4*10 + 20) / 5
  });

  it('returns null for nutrition fields when no items have data', async () => {
    const rows = makeRows(5, { energyKcal: null, proteins: null, fat: null, carbohydrates: null });
    prisma.$queryRaw.mockResolvedValue(rows);

    const result = await aggregator.aggregate(periodStart, periodEnd);

    expect(result.nutritionProfile[0].avgCaloriesPer100g).toBeNull();
    expect(result.nutritionProfile[0].avgProteinsPer100g).toBeNull();
  });

  // ============================================================
  // Sustainability
  // ============================================================

  it('computes vegetarianItemPct and veganItemPct for food_product items', async () => {
    const rows = [
      ...Array.from({ length: 3 }, (_, i) =>
        makeRow({
          userId: `u-${i}`,
          listId: `l-${i}`,
          itemId: `veg-${i}`,
          itemType: 'food_product',
          isVegetarian: true,
          isVegan: false,
        }),
      ),
      ...Array.from({ length: 2 }, (_, i) =>
        makeRow({
          userId: `u-${i + 3}`,
          listId: `l-${i + 3}`,
          itemId: `non-${i}`,
          itemType: 'food_product',
          isVegetarian: false,
          isVegan: false,
        }),
      ),
    ];
    prisma.$queryRaw.mockResolvedValue(rows);

    const result = await aggregator.aggregate(periodStart, periodEnd);

    expect(result.sustainability).toHaveLength(1);
    const s = result.sustainability[0];
    expect(s.vegetarianItemPct).toBeCloseTo(60, 5); // 3/5
    expect(s.veganItemPct).toBeCloseTo(0, 5);
  });

  it('excludes generic_food items from sustainability scores', async () => {
    // All items are generic_food — sustainability scores should have itemCount=0 for fp items
    const rows = makeRows(5, { itemType: 'generic_food', nutriScoreGrade: null, novaGroup: null });
    prisma.$queryRaw.mockResolvedValue(rows);

    const result = await aggregator.aggregate(periodStart, periodEnd);

    // userCount still covers all users
    expect(result.sustainability[0].userCount).toBe(5);
    expect(result.sustainability[0].itemCount).toBe(0);
    expect(result.sustainability[0].vegetarianItemPct).toBeNull();
  });

  it('builds novaDistribution correctly', async () => {
    const rows = [
      ...Array.from({ length: 3 }, (_, i) =>
        makeRow({ userId: `u-${i}`, listId: `l-${i}`, itemId: `n1-${i}`, novaGroup: 1 }),
      ),
      ...Array.from({ length: 2 }, (_, i) =>
        makeRow({ userId: `u-${i + 3}`, listId: `l-${i + 3}`, itemId: `n4-${i}`, novaGroup: 4 }),
      ),
    ];
    prisma.$queryRaw.mockResolvedValue(rows);

    const result = await aggregator.aggregate(periodStart, periodEnd);

    const dist = result.sustainability[0].novaDistribution as Record<string, number>;
    expect(dist['1']).toBe(3);
    expect(dist['4']).toBe(2);
  });

  // ============================================================
  // Food groups
  // ============================================================

  it('groups items by foodGroup and suppresses below K=5', async () => {
    const rows = [
      ...makeRows(4, { foodGroup: 'Dairy', foodName: 'Milk' }),        // suppressed
      ...makeRows(5, { foodGroup: 'Vegetables', foodName: 'Carrot' }).map((r, i) => ({
        ...r,
        userId: `v-${i}`,
        listId: `vl-${i}`,
        itemId: `vi-${i}`,
      })),
    ];
    prisma.$queryRaw.mockResolvedValue(rows);

    const result = await aggregator.aggregate(periodStart, periodEnd);

    const dairy = result.foodGroups.find((r) => r.foodGroup === 'Dairy');
    const veg = result.foodGroups.find((r) => r.foodGroup === 'Vegetables');
    expect(dairy).toBeUndefined(); // suppressed
    expect(veg).toBeDefined();
    expect(veg!.uniqueUsers).toBe(5);
  });

  // ============================================================
  // Demographic breakdowns
  // ============================================================

  it('produces separate rows per demographic dimension', async () => {
    const rows = makeRows(5);
    prisma.$queryRaw.mockResolvedValue(rows);

    const result = await aggregator.aggregate(periodStart, periodEnd);

    // Each dimension should have exactly one non-null column per row
    for (const row of result.demographicPatterns) {
      const nonNull = [row.ageGroup, row.gender, row.educationLevel, row.region, row.country]
        .filter((v) => v !== null);
      expect(nonNull).toHaveLength(1);
    }
  });

  it('uses __null__ sentinel for missing demographic values and maps them to null in output', async () => {
    const rows = makeRows(5, { userAgeGroup: null, userGender: null });
    prisma.$queryRaw.mockResolvedValue(rows);

    const result = await aggregator.aggregate(periodStart, periodEnd);

    const ageRow = result.demographicPatterns.find(
      (r) => r.ageGroup !== null,
    );
    const genderRow = result.demographicPatterns.find(
      (r) => r.gender !== null,
    );
    // null demographic values should appear as null in output, not the __null__ sentinel
    expect(ageRow).toBeUndefined();
    expect(genderRow).toBeUndefined();
  });

  // ============================================================
  // Cross-dimensional: dim1Name < dim2Name alphabetically
  // ============================================================

  it('ensures dim1Name < dim2Name alphabetically in cross-dim rows', async () => {
    prisma.$queryRaw.mockResolvedValue(makeRows(20));

    const result = await aggregator.aggregate(periodStart, periodEnd);

    for (const row of result.crossDimPatterns) {
      expect(row.dim1Name < row.dim2Name).toBe(true);
    }
    for (const row of result.crossDimNutrition) {
      expect(row.dim1Name < row.dim2Name).toBe(true);
    }
  });

  // ============================================================
  // aggregation result summary
  // ============================================================

  it('totalRecords reflects the sum of all non-suppressed output rows', async () => {
    prisma.$queryRaw.mockResolvedValue(makeRows(20));

    const result = await aggregator.aggregate(periodStart, periodEnd);

    const expectedTotal =
      result.itemPopularity.length +
      result.categoryPopularity.length +
      result.listPatterns.length +
      result.nutritionProfile.length +
      result.sustainability.length +
      result.foodGroups.length +
      result.demographicPatterns.length +
      result.demographicNutrition.length +
      result.crossDimPatterns.length +
      result.crossDimNutrition.length;

    expect(result.totalRecords).toBe(expectedTotal);
  });

  it('returns empty results without error when there is no data', async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    const result = await aggregator.aggregate(periodStart, periodEnd);

    expect(result.totalRecords).toBe(0);
    expect(result.suppressedGroups).toBe(0);
    expect(result.itemPopularity).toHaveLength(0);
    expect(result.listPatterns).toHaveLength(0);
  });
});
