import { TypeOfMeal } from '@prisma/client';
import { MealLogAnalyticsAggregator } from './meal-log-analytics-aggregator.service';

describe('MealLogAnalyticsAggregator', () => {
  let aggregator: MealLogAnalyticsAggregator;
  let prisma: { $queryRaw: jest.Mock };

  const periodStart = new Date('2026-04-01T00:00:00.000Z');
  const periodEnd = new Date('2026-05-01T00:00:00.000Z');

  beforeEach(() => {
    prisma = {
      $queryRaw: jest.fn(),
    };
    aggregator = new MealLogAnalyticsAggregator(prisma as any);
  });

  const makeRawRow = (overrides: Partial<any> = {}) => ({
    mealLogId: 'log-1',
    userId: 'user-1',
    mealId: 'meal-1',
    typeOfMeal: TypeOfMeal.LUNCH,
    timestamp: new Date('2026-04-15T12:00:00.000Z'),
    userCreatedAt: new Date('2026-01-01T00:00:00.000Z'),
    userAgeGroup: '25_34',
    userGender: 'MALE',
    userEducationLevel: 'BACHELOR',
    userRegion: 'EU',
    userCountry: 'DE',
    mealFromPantry: true,
    eatenOut: false,
    mealName: 'Meal',
    sustainabilityScore: 50,
    itemId: 'item-1',
    itemQuantity: 100,
    itemUnit: 'G',
    itemType: 'food',
    foodName: 'Apple',
    foodEnergyKcal: 100,
    foodProteins: 10,
    foodFat: 5,
    foodCarbs: 20,
    foodFiber: 3,
    foodSodium: 1,
    foodSugar: 8,
    foodSaturatedFat: 2,
    foodNutriScoreGrade: 'A',
    foodEcoScoreGrade: 'B',
    foodNovaGroup: 4,
    foodIsVegetarian: true,
    foodIsVegan: true,
    foodCarbonFootprint: 2,
    categoryFoodName: null,
    categoryFoodGroup: null,
    categoryEnergyKcal: null,
    categoryProteins: null,
    categoryFat: null,
    categoryCarbs: null,
    categoryFiber: null,
    categorySodium: null,
    categorySugar: null,
    categorySaturatedFat: null,
    ...overrides,
  });

  it('applies K=5 suppression for single-dimension aggregates', async () => {
    const lowGroup = [1, 2, 3, 4].map((i) =>
      makeRawRow({
        mealLogId: `low-log-${i}`,
        mealId: `low-meal-${i}`,
        userId: `low-user-${i}`,
        typeOfMeal: TypeOfMeal.BREAKFAST,
      }),
    );
    const keepGroup = [1, 2, 3, 4, 5].map((i) =>
      makeRawRow({
        mealLogId: `keep-log-${i}`,
        mealId: `keep-meal-${i}`,
        userId: `keep-user-${i}`,
        typeOfMeal: TypeOfMeal.DINNER,
      }),
    );

    prisma.$queryRaw.mockResolvedValue([...lowGroup, ...keepGroup]);

    const result = await aggregator.aggregate(periodStart, periodEnd);

    expect(
      result.dailyNutrition.some((r) => r.typeOfMeal === TypeOfMeal.BREAKFAST),
    ).toBe(false);
    expect(
      result.dailyNutrition.some((r) => r.typeOfMeal === TypeOfMeal.DINNER),
    ).toBe(true);
    expect(result.suppressedGroups).toBeGreaterThan(0);
  });

  it('applies stricter K=20 suppression for cross-dimensional aggregates', async () => {
    const males = Array.from({ length: 20 }, (_, i) =>
      makeRawRow({
        mealLogId: `m-log-${i}`,
        mealId: `m-meal-${i}`,
        userId: `m-user-${i}`,
        userGender: 'MALE',
      }),
    );
    const females = Array.from({ length: 19 }, (_, i) =>
      makeRawRow({
        mealLogId: `f-log-${i}`,
        mealId: `f-meal-${i}`,
        userId: `f-user-${i}`,
        userGender: 'FEMALE',
      }),
    );

    prisma.$queryRaw.mockResolvedValue([...males, ...females]);

    const result = await aggregator.aggregate(periodStart, periodEnd);
    const ageGenderRows = result.crossDimNutrition.filter(
      (r) => r.dim1Name === 'ageGroup' && r.dim2Name === 'gender',
    );

    expect(
      ageGenderRows.some(
        (r) => r.dim1Value === '25_34' && r.dim2Value === 'MALE',
      ),
    ).toBe(true);
    expect(
      ageGenderRows.some(
        (r) => r.dim1Value === '25_34' && r.dim2Value === 'FEMALE',
      ),
    ).toBe(false);
  });

  it('computes gram scaling and classification fields in meal records', async () => {
    const foodRow = makeRawRow({
      mealLogId: 'meal-log-1',
      mealId: 'meal-1',
      userId: 'user-1',
      itemId: 'item-food-1',
      itemType: 'food',
      itemQuantity: 150,
      itemUnit: 'G',
      foodEnergyKcal: 100,
      foodProteins: 10,
      foodFat: 5,
      foodCarbs: 20,
      foodFiber: 3,
      foodSodium: 1,
      foodSugar: 8,
      foodSaturatedFat: 2,
      foodNutriScoreGrade: 'A',
      foodEcoScoreGrade: 'B',
      foodNovaGroup: 4,
      foodIsVegetarian: false,
      foodIsVegan: false,
      foodCarbonFootprint: 2,
      foodName: 'Chicken',
      categoryFoodName: null,
    });

    const categoryRow = makeRawRow({
      mealLogId: 'meal-log-1',
      mealId: 'meal-1',
      userId: 'user-1',
      itemId: 'item-cat-1',
      itemType: 'food_category',
      itemQuantity: 200,
      itemUnit: 'G',
      foodName: null,
      foodEnergyKcal: null,
      foodProteins: null,
      foodFat: null,
      foodCarbs: null,
      foodFiber: null,
      foodSodium: null,
      foodSugar: null,
      foodSaturatedFat: null,
      foodNutriScoreGrade: null,
      foodEcoScoreGrade: null,
      foodNovaGroup: null,
      categoryFoodName: 'Rice',
      categoryFoodGroup: 'Cereals',
      categoryEnergyKcal: 50,
      categoryProteins: 5,
      categoryFat: 1,
      categoryCarbs: 10,
      categoryFiber: 1,
      categorySodium: 0.5,
      categorySugar: 1,
      categorySaturatedFat: 0.2,
    });

    prisma.$queryRaw.mockResolvedValue([foodRow, categoryRow]);

    const result = await aggregator.aggregate(periodStart, periodEnd);
    const record = result.mealRecords[0];

    expect(record.itemCount).toBe(2);
    expect(record.totalCalories).toBeCloseTo(250, 6); // 100*1.5 + 50*2
    expect(record.totalProteins).toBeCloseTo(25, 6); // 10*1.5 + 5*2
    expect(record.totalFat).toBeCloseTo(9.5, 6); // 5*1.5 + 1*2
    expect(record.nutriScoreGrade).toBe('A');
    expect(record.ecoScoreGrade).toBe('B');
    expect(record.novaGroupMode).toBe(4);
    expect(record.ultraProcessedPct).toBe(100);
    expect(record.isVegetarian).toBe(false);
    expect(record.isVegan).toBe(false);
  });

  it('keeps mealRecords even when all aggregate groups are suppressed', async () => {
    const rows = [1, 2, 3, 4].map((i) =>
      makeRawRow({
        mealLogId: `s-log-${i}`,
        mealId: `s-meal-${i}`,
        userId: `s-user-${i}`,
      }),
    );
    prisma.$queryRaw.mockResolvedValue(rows);

    const result = await aggregator.aggregate(periodStart, periodEnd);

    expect(result.dailyNutrition).toHaveLength(0); // K=5 suppression
    expect(result.demographicNutrition).toHaveLength(0); // K=5 suppression
    expect(result.crossDimNutrition).toHaveLength(0); // K=20 suppression
    expect(result.mealRecords).toHaveLength(4); // intentionally retained
  });
});
