import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { TypeOfMeal } from '@prisma/client';
import {
  DEMOGRAPHIC_DIMENSIONS,
  DemographicDimension,
} from '../../common/demographic-dimensions';
import {
  K_ANONYMITY_THRESHOLD,
  K_ANONYMITY_CROSS_DIM_THRESHOLD,
  safeAvg,
  percentile,
  stdDev,
  mode,
  distribution,
  FoodFrequencyRow,
  AGE_GROUP_SQL,
  applyKAnonymity,
  aggregateFoodFrequency,
} from '../../common/analytics-utils';

// ============================================================
// Raw SQL row type — joined from meal_logs, Meal, MealItem, Food, FoodCategory
// ============================================================

interface RawMealRow {
  mealLogId: string;
  userId: string;
  mealId: string;
  typeOfMeal: TypeOfMeal;
  timestamp: Date;
  userCreatedAt: Date;
  userAgeGroup: string | null;
  userGender: string | null;
  userEducationLevel: string | null;
  userRegion: string | null;
  userCountry: string | null;
  mealFromPantry: boolean;
  eatenOut: boolean;
  mealName: string;
  sustainabilityScore: number | null;
  // Item
  itemId: string | null;
  itemQuantity: number | null;
  itemUnit: string | null;
  itemType: string | null;
  // Food (OpenFoodFacts)
  foodName: string | null;
  foodEnergyKcal: number | null;
  foodProteins: number | null;
  foodFat: number | null;
  foodCarbs: number | null;
  foodFiber: number | null;
  foodSodium: number | null;
  foodSugar: number | null;
  foodSaturatedFat: number | null;
  foodNutriScoreGrade: string | null;
  foodEcoScoreGrade: string | null;
  foodNovaGroup: number | null;
  foodIsVegetarian: boolean | null;
  foodIsVegan: boolean | null;
  foodCarbonFootprint: number | null;
  // FoodCategory (NEVO)
  categoryFoodName: string | null;
  categoryFoodGroup: string | null;
  categoryEnergyKcal: number | null;
  categoryProteins: number | null;
  categoryFat: number | null;
  categoryCarbs: number | null;
  categoryFiber: number | null;
  categorySodium: number | null;
  categorySugar: number | null;
  categorySaturatedFat: number | null;
}

// ============================================================
// Per-meal aggregate (intermediate representation)
// ============================================================

interface MealAggregate {
  userId: string;
  mealId: string;
  typeOfMeal: TypeOfMeal;
  timestamp: Date;
  weeksSinceRegistration: number;
  ageGroup: string | null;
  gender: string | null;
  educationLevel: string | null;
  region: string | null;
  country: string | null;
  mealFromPantry: boolean;
  eatenOut: boolean;
  totalCalories: number;
  totalProteins: number;
  totalFat: number;
  totalCarbs: number;
  totalFiber: number;
  totalSodium: number;
  totalSugar: number;
  totalSaturatedFat: number;
  sustainabilityScore: number | null;
  totalCarbonFootprint: number;
  itemCount: number;
  isVegetarian: boolean;
  isVegan: boolean;
  novaGroups: number[];
  nutriScoreGrades: string[];
  ecoScoreGrades: string[];
  foods: Array<{
    name: string;
    foodGroup: string | null;
    itemType: string;
    quantity: number;
    unit: string;
  }>;
}

// ============================================================
// Output row types
// ============================================================

export interface DailyNutritionRow {
  date: Date;
  typeOfMeal: TypeOfMeal;
  userCount: number;
  mealCount: number;
  avgCalories: number | null;
  avgProteins: number | null;
  avgFat: number | null;
  avgCarbs: number | null;
  avgFiber: number | null;
  avgSodium: number | null;
  avgSugar: number | null;
  avgSaturatedFat: number | null;
  p25Calories: number | null;
  p50Calories: number | null;
  p75Calories: number | null;
}

export type FoodPopularityRow = FoodFrequencyRow;

export interface MealPatternsRow {
  date: Date;
  typeOfMeal: TypeOfMeal;
  userCount: number;
  totalMeals: number;
  mealsFromPantryCount: number;
  mealsFromPantryPct: number;
  mealsEatenOutCount: number;
  mealsEatenOutPct: number;
  avgItemsPerMeal: number;
  avgMealHour: number | null;
  mealHourStdDev: number | null;
}

export interface SustainabilityRow {
  date: Date;
  typeOfMeal: TypeOfMeal;
  userCount: number;
  avgSustainabilityScore: number | null;
  avgCarbonFootprint: number | null;
  nutriScoreDistribution: Record<string, number> | null;
  ecoScoreDistribution: Record<string, number> | null;
}

export interface MealClassificationRow {
  date: Date;
  typeOfMeal: TypeOfMeal;
  userCount: number;
  totalMeals: number;
  vegetarianCount: number;
  vegetarianPct: number;
  veganCount: number;
  veganPct: number;
  avgUltraProcessedPct: number | null;
  p25UltraProcessedPct: number | null;
  p50UltraProcessedPct: number | null;
  p75UltraProcessedPct: number | null;
  novaDistribution: Record<string, number> | null;
}

export interface MealRecordRow {
  weeksSinceRegistration: number;
  typeOfMeal: TypeOfMeal;
  totalCalories: number | null;
  totalProteins: number | null;
  totalFat: number | null;
  totalCarbs: number | null;
  totalFiber: number | null;
  totalSodium: number | null;
  totalSugar: number | null;
  totalSaturatedFat: number | null;
  nutriScoreGrade: string | null;
  ecoScoreGrade: string | null;
  novaGroupMode: number | null;
  ultraProcessedPct: number | null;
  sustainabilityScore: number | null;
  totalCarbonFootprint: number | null;
  isVegetarian: boolean;
  isVegan: boolean;
  itemCount: number;
}

// ============================================================
// Row types returned by the aggregator
// ============================================================

export interface DemographicNutritionRow {
  date: Date;
  typeOfMeal: TypeOfMeal;
  dimensionName: string;
  dimensionValue: string;
  userCount: number;
  mealCount: number;
  avgCalories: number | null;
  avgProteins: number | null;
  avgFat: number | null;
  avgCarbs: number | null;
  avgFiber: number | null;
  avgSodium: number | null;
  avgSugar: number | null;
  avgSaturatedFat: number | null;
  p25Calories: number | null;
  p50Calories: number | null;
  p75Calories: number | null;
}

export interface DemographicClassificationRow {
  date: Date;
  typeOfMeal: TypeOfMeal;
  dimensionName: string;
  dimensionValue: string;
  userCount: number;
  totalMeals: number;
  vegetarianCount: number;
  vegetarianPct: number;
  veganCount: number;
  veganPct: number;
  avgUltraProcessedPct: number | null;
  p25UltraProcessedPct: number | null;
  p50UltraProcessedPct: number | null;
  p75UltraProcessedPct: number | null;
  novaDistribution: Record<string, number> | null;
}

export interface DemographicPatternsRow {
  date: Date;
  typeOfMeal: TypeOfMeal;
  dimensionName: string;
  dimensionValue: string;
  userCount: number;
  totalMeals: number;
  mealsFromPantryCount: number;
  mealsFromPantryPct: number;
  mealsEatenOutCount: number;
  mealsEatenOutPct: number;
  avgItemsPerMeal: number;
  avgMealHour: number | null;
  mealHourStdDev: number | null;
}

// ============================================================
// Cross-dimensional row types (two dimensions combined, K=20)
// ============================================================

export interface CrossDimNutritionRow {
  date: Date;
  typeOfMeal: TypeOfMeal;
  dim1Name: string;
  dim1Value: string;
  dim2Name: string;
  dim2Value: string;
  userCount: number;
  mealCount: number;
  avgCalories: number | null;
  avgProteins: number | null;
  avgFat: number | null;
  avgCarbs: number | null;
  avgFiber: number | null;
  avgSodium: number | null;
  avgSugar: number | null;
  avgSaturatedFat: number | null;
  p25Calories: number | null;
  p50Calories: number | null;
  p75Calories: number | null;
}

export interface CrossDimClassificationRow {
  date: Date;
  typeOfMeal: TypeOfMeal;
  dim1Name: string;
  dim1Value: string;
  dim2Name: string;
  dim2Value: string;
  userCount: number;
  totalMeals: number;
  vegetarianCount: number;
  vegetarianPct: number;
  veganCount: number;
  veganPct: number;
  avgUltraProcessedPct: number | null;
  p25UltraProcessedPct: number | null;
  p50UltraProcessedPct: number | null;
  p75UltraProcessedPct: number | null;
  novaDistribution: Record<string, number> | null;
}

export interface CrossDimPatternsRow {
  date: Date;
  typeOfMeal: TypeOfMeal;
  dim1Name: string;
  dim1Value: string;
  dim2Name: string;
  dim2Value: string;
  userCount: number;
  totalMeals: number;
  mealsFromPantryCount: number;
  mealsFromPantryPct: number;
  mealsEatenOutCount: number;
  mealsEatenOutPct: number;
  avgItemsPerMeal: number;
  avgMealHour: number | null;
  mealHourStdDev: number | null;
}

export interface AggregationResult {
  dailyNutrition: DailyNutritionRow[];
  foodPopularity: FoodPopularityRow[];
  mealPatterns: MealPatternsRow[];
  sustainability: SustainabilityRow[];
  mealClassification: MealClassificationRow[];
  mealRecords: MealRecordRow[];
  demographicNutrition: DemographicNutritionRow[];
  demographicClassification: DemographicClassificationRow[];
  demographicPatterns: DemographicPatternsRow[];
  crossDimNutrition: CrossDimNutritionRow[];
  crossDimClassification: CrossDimClassificationRow[];
  crossDimPatterns: CrossDimPatternsRow[];
  totalRecords: number;
  suppressedGroups: number;
}

@Injectable()
export class MealLogAnalyticsAggregator {
  private readonly logger = new Logger(MealLogAnalyticsAggregator.name);

  constructor(private readonly prisma: PrismaService) {}

  async aggregate(
    periodStart: Date,
    periodEnd: Date,
  ): Promise<AggregationResult> {
    this.logger.log(
      `Aggregating ${periodStart.toISOString()} → ${periodEnd.toISOString()}`,
    );

    const rawData = await this.fetchRawData(periodStart, periodEnd);
    this.logger.log(`Fetched ${rawData.length} raw rows`);

    const meals = this.buildMealAggregates(rawData);
    this.logger.log(`Built ${meals.length} meal aggregates`);

    let suppressedGroups = 0;

    const dailyNutrition = this.aggregateDailyNutrition(meals);
    const foodPopularity = this.aggregateFoodPopularity(meals);
    const mealPatterns = this.aggregateMealPatterns(meals);
    const sustainability = this.aggregateSustainability(meals);
    const mealClassification = this.aggregateMealClassification(meals);
    const mealRecords = this.aggregateMealRecords(meals);
    const demographicNutrition = this.aggregateDemographicNutrition(meals);
    const demographicClassification =
      this.aggregateDemographicClassification(meals);
    const demographicPatterns = this.aggregateDemographicPatterns(meals);
    const crossDimNutrition = this.aggregateCrossDimNutrition(meals);
    const crossDimClassification = this.aggregateCrossDimClassification(meals);
    const crossDimPatterns = this.aggregateCrossDimPatterns(meals);

    // Apply k-anonymity: suppress groups with < K unique users
    const applyK = <T extends { userCount?: number; uniqueUsers?: number }>(
      rows: T[],
      field: 'userCount' | 'uniqueUsers' = 'userCount',
      threshold = K_ANONYMITY_THRESHOLD,
    ): T[] => {
      const { rows: filtered, suppressed } = applyKAnonymity(rows, field, threshold);
      suppressedGroups += suppressed;
      return filtered;
    };

    const filteredNutrition = applyK(dailyNutrition);
    const filteredPopularity = applyK(foodPopularity, 'uniqueUsers');
    const filteredPatterns = applyK(mealPatterns);
    const filteredSustainability = applyK(sustainability);
    const filteredClassification = applyK(mealClassification);
    const filteredDemographicNutrition = applyK(demographicNutrition);
    const filteredDemographicClassification = applyK(demographicClassification);
    const filteredDemographicPatterns = applyK(demographicPatterns);
    const filteredCrossDimNutrition = applyK(crossDimNutrition, 'userCount', K_ANONYMITY_CROSS_DIM_THRESHOLD);
    const filteredCrossDimClassification = applyK(crossDimClassification, 'userCount', K_ANONYMITY_CROSS_DIM_THRESHOLD);
    const filteredCrossDimPatterns = applyK(crossDimPatterns, 'userCount', K_ANONYMITY_CROSS_DIM_THRESHOLD);

    const totalRecords =
      filteredNutrition.length +
      filteredPopularity.length +
      filteredPatterns.length +
      filteredSustainability.length +
      filteredClassification.length +
      filteredDemographicNutrition.length +
      filteredDemographicClassification.length +
      filteredDemographicPatterns.length +
      filteredCrossDimNutrition.length +
      filteredCrossDimClassification.length +
      filteredCrossDimPatterns.length;

    this.logger.log(
      `Aggregation done: ${totalRecords} records, ${suppressedGroups} suppressed (k<${K_ANONYMITY_THRESHOLD} single-dim / k<${K_ANONYMITY_CROSS_DIM_THRESHOLD} cross-dim)`,
    );

    return {
      dailyNutrition: filteredNutrition,
      foodPopularity: filteredPopularity,
      mealPatterns: filteredPatterns,
      sustainability: filteredSustainability,
      mealClassification: filteredClassification,
      mealRecords,
      demographicNutrition: filteredDemographicNutrition,
      demographicClassification: filteredDemographicClassification,
      demographicPatterns: filteredDemographicPatterns,
      crossDimNutrition: filteredCrossDimNutrition,
      crossDimClassification: filteredCrossDimClassification,
      crossDimPatterns: filteredCrossDimPatterns,
      totalRecords,
      suppressedGroups,
    };
  }

  // ============================================================
  // Raw SQL fetch
  // ============================================================

  private async fetchRawData(
    periodStart: Date,
    periodEnd: Date,
  ): Promise<RawMealRow[]> {
    return this.prisma.$queryRaw<RawMealRow[]>`
      SELECT
        ml.id                AS "mealLogId",
        ml."userId"          AS "userId",
        ml."mealId"          AS "mealId",
        ml."typeOfMeal"      AS "typeOfMeal",
        ml."timestamp"       AS "timestamp",
        ml."mealFromPantry"  AS "mealFromPantry",
        ml."eatenOut"        AS "eatenOut",
        u."createdAt"        AS "userCreatedAt",
        ${AGE_GROUP_SQL} AS "userAgeGroup",
        u."gender"::text     AS "userGender",
        u."educationLevel"::text AS "userEducationLevel",
        u."region"           AS "userRegion",
        u."country"          AS "userCountry",
        m."name"             AS "mealName",
        m."sustainabilityScore" AS "sustainabilityScore",

        mi.id                AS "itemId",
        mi."quantity"        AS "itemQuantity",
        mi."unit"::text      AS "itemUnit",
        mi."itemType"        AS "itemType",

        f."name"             AS "foodName",
        f."energyKcal"       AS "foodEnergyKcal",
        f."proteins"         AS "foodProteins",
        f."fat"              AS "foodFat",
        f."carbohydrates"    AS "foodCarbs",
        f."fiber"            AS "foodFiber",
        f."sodium"           AS "foodSodium",
        f."sugars"           AS "foodSugar",
        f."saturatedFat"     AS "foodSaturatedFat",
        f."nutriscoreGrade"  AS "foodNutriScoreGrade",
        f."ecoscoreGrade"    AS "foodEcoScoreGrade",
        f."novaGroup"        AS "foodNovaGroup",
        f."isVegetarian"     AS "foodIsVegetarian",
        f."isVegan"          AS "foodIsVegan",
        f."carbonFootprint"  AS "foodCarbonFootprint",

        fc."foodName"        AS "categoryFoodName",
        fc."foodGroup"       AS "categoryFoodGroup",
        fc."energyKcal"      AS "categoryEnergyKcal",
        fc."proteins"        AS "categoryProteins",
        fc."fat"             AS "categoryFat",
        fc."carbohydrates"   AS "categoryCarbs",
        fc."fiber"           AS "categoryFiber",
        fc."sodium"          AS "categorySodium",
        fc."sugars"          AS "categorySugar",
        fc."saturatedFat"    AS "categorySaturatedFat"

      FROM meal_logs ml
      JOIN meals m ON ml."mealId" = m.id
      JOIN users u ON ml."userId" = u.id
      LEFT JOIN meal_items mi ON mi."mealId" = m.id
      LEFT JOIN food_products f ON mi."foodProductId" = f.id
      LEFT JOIN generic_foods fc ON mi."genericFoodId" = fc.id
      WHERE ml."timestamp" >= ${periodStart}
        AND ml."timestamp" < ${periodEnd}
      ORDER BY ml."userId", ml."timestamp"
    `;
  }

  // ============================================================
  // Build per-meal aggregates from raw rows
  // ============================================================

  private buildMealAggregates(rawData: RawMealRow[]): MealAggregate[] {
    const mealMap = new Map<string, MealAggregate>();

    for (const row of rawData) {
      const key = row.mealLogId;

      if (!mealMap.has(key)) {
        const msPerWeek = 7 * 24 * 60 * 60 * 1000;
        const weeksSinceRegistration = Math.floor(
          (row.timestamp.getTime() - row.userCreatedAt.getTime()) / msPerWeek,
        );
        mealMap.set(key, {
          userId: row.userId,
          mealId: row.mealId,
          typeOfMeal: row.typeOfMeal,
          timestamp: row.timestamp,
          weeksSinceRegistration,
          ageGroup: row.userAgeGroup,
          gender: row.userGender,
          educationLevel: row.userEducationLevel,
          region: row.userRegion,
          country: row.userCountry,
          mealFromPantry: row.mealFromPantry,
          eatenOut: row.eatenOut,
          totalCalories: 0,
          totalProteins: 0,
          totalFat: 0,
          totalCarbs: 0,
          totalFiber: 0,
          totalSodium: 0,
          totalSugar: 0,
          totalSaturatedFat: 0,
          sustainabilityScore: row.sustainabilityScore,
          totalCarbonFootprint: 0,
          itemCount: 0,
          isVegetarian: true,
          isVegan: true,
          novaGroups: [],
          nutriScoreGrades: [],
          ecoScoreGrades: [],
          foods: [],
        });
      }

      const meal = mealMap.get(key)!;

      if (!row.itemId) continue;

      meal.itemCount++;
      const quantity = row.itemQuantity ?? 1;
      // For gram-based items, scale per-100g values
      const scale = row.itemUnit === 'G' ? quantity / 100 : 1;

      if (row.itemType === 'food_product' && row.foodName) {
        meal.totalCalories += (row.foodEnergyKcal ?? 0) * scale;
        meal.totalProteins += (row.foodProteins ?? 0) * scale;
        meal.totalFat += (row.foodFat ?? 0) * scale;
        meal.totalCarbs += (row.foodCarbs ?? 0) * scale;
        meal.totalFiber += (row.foodFiber ?? 0) * scale;
        meal.totalSodium += (row.foodSodium ?? 0) * scale;
        meal.totalSugar += (row.foodSugar ?? 0) * scale;
        meal.totalSaturatedFat += (row.foodSaturatedFat ?? 0) * scale;
        meal.totalCarbonFootprint += (row.foodCarbonFootprint ?? 0) * scale;

        if (row.foodIsVegetarian === false) meal.isVegetarian = false;
        if (row.foodIsVegan === false) meal.isVegan = false;
        if (row.foodNovaGroup !== null) meal.novaGroups.push(row.foodNovaGroup);
        if (row.foodNutriScoreGrade)
          meal.nutriScoreGrades.push(row.foodNutriScoreGrade);
        if (row.foodEcoScoreGrade)
          meal.ecoScoreGrades.push(row.foodEcoScoreGrade);

        meal.foods.push({
          name: row.foodName,
          foodGroup: null,
          itemType: 'food_product',
          quantity,
          unit: row.itemUnit ?? 'PIECES',
        });
      } else if (row.itemType === 'generic_food' && row.categoryFoodName) {
        meal.totalCalories += (row.categoryEnergyKcal ?? 0) * scale;
        meal.totalProteins += (row.categoryProteins ?? 0) * scale;
        meal.totalFat += (row.categoryFat ?? 0) * scale;
        meal.totalCarbs += (row.categoryCarbs ?? 0) * scale;
        meal.totalFiber += (row.categoryFiber ?? 0) * scale;
        meal.totalSodium += (row.categorySodium ?? 0) * scale;
        meal.totalSugar += (row.categorySugar ?? 0) * scale;
        meal.totalSaturatedFat += (row.categorySaturatedFat ?? 0) * scale;

        // NEVO data doesn't have vegan/vegetarian flags — keep current state
        meal.foods.push({
          name: row.categoryFoodName,
          foodGroup: row.categoryFoodGroup,
          itemType: 'generic_food',
          quantity,
          unit: row.itemUnit ?? 'PIECES',
        });
      }
    }

    return Array.from(mealMap.values());
  }

  // ============================================================
  // Dimension aggregators
  // ============================================================

  private aggregateDailyNutrition(meals: MealAggregate[]): DailyNutritionRow[] {
    const grouped = this.groupBy(meals, (m) => {
      const dateStr = m.timestamp.toISOString().split('T')[0];
      return `${dateStr}|${m.typeOfMeal}`;
    });

    return Array.from(grouped.entries()).map(([key, group]) => {
      const [dateStr, typeOfMeal] = key.split('|');
      const uniqueUsers = new Set(group.map((m) => m.userId)).size;
      const calories = group.map((m) => m.totalCalories);

      return {
        date: new Date(dateStr),
        typeOfMeal: typeOfMeal as TypeOfMeal,
        userCount: uniqueUsers,
        mealCount: group.length,
        avgCalories: safeAvg(calories),
        avgProteins: safeAvg(group.map((m) => m.totalProteins)),
        avgFat: safeAvg(group.map((m) => m.totalFat)),
        avgCarbs: safeAvg(group.map((m) => m.totalCarbs)),
        avgFiber: safeAvg(group.map((m) => m.totalFiber)),
        avgSodium: safeAvg(group.map((m) => m.totalSodium)),
        avgSugar: safeAvg(group.map((m) => m.totalSugar)),
        avgSaturatedFat: safeAvg(group.map((m) => m.totalSaturatedFat)),
        p25Calories: percentile(calories, 25),
        p50Calories: percentile(calories, 50),
        p75Calories: percentile(calories, 75),
      };
    });
  }

  private aggregateFoodPopularity(meals: MealAggregate[]): FoodPopularityRow[] {
    const entries = meals.flatMap((meal) =>
      meal.foods.map((food) => ({
        date: meal.timestamp,
        userId: meal.userId,
        foodName: food.name,
        foodGroup: food.foodGroup,
        itemType: food.itemType,
        quantity: food.quantity,
        unit: food.unit,
      })),
    );
    return aggregateFoodFrequency(entries);
  }

  private aggregateMealPatterns(meals: MealAggregate[]): MealPatternsRow[] {
    const grouped = this.groupBy(meals, (m) => {
      const dateStr = m.timestamp.toISOString().split('T')[0];
      return `${dateStr}|${m.typeOfMeal}`;
    });

    return Array.from(grouped.entries()).map(([key, group]) => {
      const [dateStr, typeOfMeal] = key.split('|');
      const uniqueUsers = new Set(group.map((m) => m.userId)).size;
      const pantryMeals = group.filter((m) => m.mealFromPantry);
      const eatenOutMeals = group.filter((m) => m.eatenOut);
      const hours = group.map(
        (m) => m.timestamp.getHours() + m.timestamp.getMinutes() / 60,
      );

      return {
        date: new Date(dateStr),
        typeOfMeal: typeOfMeal as TypeOfMeal,
        userCount: uniqueUsers,
        totalMeals: group.length,
        mealsFromPantryCount: pantryMeals.length,
        mealsFromPantryPct:
          group.length > 0 ? (pantryMeals.length / group.length) * 100 : 0,
        mealsEatenOutCount: eatenOutMeals.length,
        mealsEatenOutPct:
          group.length > 0 ? (eatenOutMeals.length / group.length) * 100 : 0,
        avgItemsPerMeal: safeAvg(group.map((m) => m.itemCount)) ?? 0,
        avgMealHour: safeAvg(hours),
        mealHourStdDev: stdDev(hours),
      };
    });
  }

  private aggregateSustainability(meals: MealAggregate[]): SustainabilityRow[] {
    const grouped = this.groupBy(meals, (m) => {
      const dateStr = m.timestamp.toISOString().split('T')[0];
      return `${dateStr}|${m.typeOfMeal}`;
    });

    return Array.from(grouped.entries())
      .map(([key, group]) => {
        const [dateStr, typeOfMeal] = key.split('|');
        const uniqueUsers = new Set(group.map((m) => m.userId)).size;

        const susScores = group
          .map((m) => m.sustainabilityScore)
          .filter((s): s is number => s !== null);
        const carbonScores = group
          .map((m) => m.totalCarbonFootprint)
          .filter((c) => c > 0);

        // Build score distributions
        const nutriGrades = group.flatMap((m) => m.nutriScoreGrades);
        const ecoGrades = group.flatMap((m) => m.ecoScoreGrades);

        if (
          susScores.length === 0 &&
          carbonScores.length === 0 &&
          nutriGrades.length === 0 &&
          ecoGrades.length === 0
        ) {
          return null;
        }

        return {
          date: new Date(dateStr),
          typeOfMeal: typeOfMeal as TypeOfMeal,
          userCount: uniqueUsers,
          avgSustainabilityScore:
            susScores.length > 0 ? safeAvg(susScores) : null,
          avgCarbonFootprint:
            carbonScores.length > 0 ? safeAvg(carbonScores) : null,
          nutriScoreDistribution:
            nutriGrades.length > 0 ? distribution(nutriGrades) : null,
          ecoScoreDistribution:
            ecoGrades.length > 0 ? distribution(ecoGrades) : null,
        };
      })
      .filter((row): row is SustainabilityRow => row !== null);
  }

  private aggregateMealClassification(
    meals: MealAggregate[],
  ): MealClassificationRow[] {
    const grouped = this.groupBy(meals, (m) => {
      const dateStr = m.timestamp.toISOString().split('T')[0];
      return `${dateStr}|${m.typeOfMeal}`;
    });

    return Array.from(grouped.entries()).map(([key, group]) => {
      const [dateStr, typeOfMeal] = key.split('|');
      const uniqueUsers = new Set(group.map((m) => m.userId)).size;
      const vegCount = group.filter((m) => m.isVegetarian).length;
      const veganCount = group.filter((m) => m.isVegan).length;

      // Ultra-processed % per meal
      const ultraPcts = group.map((m) => {
        if (m.novaGroups.length === 0) return 0;
        const ultra = m.novaGroups.filter((g) => g === 4).length;
        return (ultra / m.novaGroups.length) * 100;
      });

      // NOVA distribution across all items
      const allNova = group.flatMap((m) => m.novaGroups);
      const novaDistribution = distribution(allNova.map((g) => String(g)));

      return {
        date: new Date(dateStr),
        typeOfMeal: typeOfMeal as TypeOfMeal,
        userCount: uniqueUsers,
        totalMeals: group.length,
        vegetarianCount: vegCount,
        vegetarianPct: group.length > 0 ? (vegCount / group.length) * 100 : 0,
        veganCount,
        veganPct: group.length > 0 ? (veganCount / group.length) * 100 : 0,
        avgUltraProcessedPct: safeAvg(ultraPcts),
        p25UltraProcessedPct: percentile(ultraPcts, 25),
        p50UltraProcessedPct: percentile(ultraPcts, 50),
        p75UltraProcessedPct: percentile(ultraPcts, 75),
        novaDistribution: novaDistribution,
      };
    });
  }

  // ============================================================
  // Utility methods
  // ============================================================

  private aggregateMealRecords(meals: MealAggregate[]): MealRecordRow[] {
    return meals.map((m) => {
      const nutriScoreGrade =
        m.nutriScoreGrades.length > 0 ? mode(m.nutriScoreGrades) : null;

      const ecoScoreGrade =
        m.ecoScoreGrades.length > 0 ? mode(m.ecoScoreGrades) : null;

      const novaGroupMode =
        m.novaGroups.length > 0 ? Number(mode(m.novaGroups.map(String))) : null;
      const ultraProcessedPct =
        m.novaGroups.length > 0
          ? (m.novaGroups.filter((g) => g === 4).length / m.novaGroups.length) *
            100
          : null;

      return {
        weeksSinceRegistration: m.weeksSinceRegistration,
        typeOfMeal: m.typeOfMeal,
        totalCalories: m.totalCalories > 0 ? m.totalCalories : null,
        totalProteins: m.totalProteins > 0 ? m.totalProteins : null,
        totalFat: m.totalFat > 0 ? m.totalFat : null,
        totalCarbs: m.totalCarbs > 0 ? m.totalCarbs : null,
        totalFiber: m.totalFiber > 0 ? m.totalFiber : null,
        totalSodium: m.totalSodium > 0 ? m.totalSodium : null,
        totalSugar: m.totalSugar > 0 ? m.totalSugar : null,
        totalSaturatedFat: m.totalSaturatedFat > 0 ? m.totalSaturatedFat : null,
        nutriScoreGrade,
        ecoScoreGrade,
        novaGroupMode,
        ultraProcessedPct,
        sustainabilityScore: m.sustainabilityScore,
        totalCarbonFootprint:
          m.totalCarbonFootprint > 0 ? m.totalCarbonFootprint : null,
        isVegetarian: m.isVegetarian,
        isVegan: m.isVegan,
        itemCount: m.itemCount,
      };
    });
  }

  // ============================================================
  // Demographic breakdown aggregators
  // ============================================================

  private aggregateDemographicNutrition(
    meals: MealAggregate[],
  ): DemographicNutritionRow[] {
    const rows: DemographicNutritionRow[] = [];

    for (const dim of DEMOGRAPHIC_DIMENSIONS) {
      const grouped = this.groupBy(meals, (m) => {
        const dateStr = m.timestamp.toISOString().split('T')[0];
        const val = m[dim] ?? '__null__';
        return `${dateStr}|${m.typeOfMeal}|${val}`;
      });

      for (const [key, group] of grouped.entries()) {
        const [dateStr, typeOfMeal, dimValue] = key.split('|');
        const uniqueUsers = new Set(group.map((m) => m.userId)).size;
        const calories = group.map((m) => m.totalCalories);

        rows.push({
          date: new Date(dateStr),
          typeOfMeal: typeOfMeal as TypeOfMeal,
          dimensionName: dim,
          dimensionValue: dimValue,
          userCount: uniqueUsers,
          mealCount: group.length,
          avgCalories: safeAvg(calories),
          avgProteins: safeAvg(group.map((m) => m.totalProteins)),
          avgFat: safeAvg(group.map((m) => m.totalFat)),
          avgCarbs: safeAvg(group.map((m) => m.totalCarbs)),
          avgFiber: safeAvg(group.map((m) => m.totalFiber)),
          avgSodium: safeAvg(group.map((m) => m.totalSodium)),
          avgSugar: safeAvg(group.map((m) => m.totalSugar)),
          avgSaturatedFat: safeAvg(group.map((m) => m.totalSaturatedFat)),
          p25Calories: percentile(calories, 25),
          p50Calories: percentile(calories, 50),
          p75Calories: percentile(calories, 75),
        });
      }
    }

    return rows;
  }

  private aggregateDemographicClassification(
    meals: MealAggregate[],
  ): DemographicClassificationRow[] {
    const rows: DemographicClassificationRow[] = [];

    for (const dim of DEMOGRAPHIC_DIMENSIONS) {
      const grouped = this.groupBy(meals, (m) => {
        const dateStr = m.timestamp.toISOString().split('T')[0];
        const val = m[dim] ?? '__null__';
        return `${dateStr}|${m.typeOfMeal}|${val}`;
      });

      for (const [key, group] of grouped.entries()) {
        const [dateStr, typeOfMeal, dimValue] = key.split('|');
        const uniqueUsers = new Set(group.map((m) => m.userId)).size;
        const vegCount = group.filter((m) => m.isVegetarian).length;
        const veganCount = group.filter((m) => m.isVegan).length;

        const ultraPcts = group.map((m) => {
          if (m.novaGroups.length === 0) return 0;
          const ultra = m.novaGroups.filter((g) => g === 4).length;
          return (ultra / m.novaGroups.length) * 100;
        });

        const allNova = group.flatMap((m) => m.novaGroups);
        const novaDistribution = distribution(allNova.map((g) => String(g)));

        rows.push({
          date: new Date(dateStr),
          typeOfMeal: typeOfMeal as TypeOfMeal,
          dimensionName: dim,
          dimensionValue: dimValue,
          userCount: uniqueUsers,
          totalMeals: group.length,
          vegetarianCount: vegCount,
          vegetarianPct: group.length > 0 ? (vegCount / group.length) * 100 : 0,
          veganCount,
          veganPct: group.length > 0 ? (veganCount / group.length) * 100 : 0,
          avgUltraProcessedPct: safeAvg(ultraPcts),
          p25UltraProcessedPct: percentile(ultraPcts, 25),
          p50UltraProcessedPct: percentile(ultraPcts, 50),
          p75UltraProcessedPct: percentile(ultraPcts, 75),
          novaDistribution: novaDistribution,
        });
      }
    }

    return rows;
  }

  private aggregateDemographicPatterns(
    meals: MealAggregate[],
  ): DemographicPatternsRow[] {
    const rows: DemographicPatternsRow[] = [];

    for (const dim of DEMOGRAPHIC_DIMENSIONS) {
      const grouped = this.groupBy(meals, (m) => {
        const dateStr = m.timestamp.toISOString().split('T')[0];
        const val = m[dim] ?? '__null__';
        return `${dateStr}|${m.typeOfMeal}|${val}`;
      });

      for (const [key, group] of grouped.entries()) {
        const [dateStr, typeOfMeal, dimValue] = key.split('|');
        const uniqueUsers = new Set(group.map((m) => m.userId)).size;
        const pantryMeals = group.filter((m) => m.mealFromPantry);
        const eatenOutMeals = group.filter((m) => m.eatenOut);
        const hours = group.map(
          (m) => m.timestamp.getHours() + m.timestamp.getMinutes() / 60,
        );

        rows.push({
          date: new Date(dateStr),
          typeOfMeal: typeOfMeal as TypeOfMeal,
          dimensionName: dim,
          dimensionValue: dimValue,
          userCount: uniqueUsers,
          totalMeals: group.length,
          mealsFromPantryCount: pantryMeals.length,
          mealsFromPantryPct:
            group.length > 0 ? (pantryMeals.length / group.length) * 100 : 0,
          mealsEatenOutCount: eatenOutMeals.length,
          mealsEatenOutPct:
            group.length > 0 ? (eatenOutMeals.length / group.length) * 100 : 0,
          avgItemsPerMeal: safeAvg(group.map((m) => m.itemCount)) ?? 0,
          avgMealHour: safeAvg(hours),
          mealHourStdDev: stdDev(hours),
        });
      }
    }

    return rows;
  }

  // ============================================================
  // Cross-dimensional breakdown aggregators (K=20)
  // ============================================================

  /**
   * Returns all 10 unique sorted pairs from the 5 demographic dimensions.
   * Pair is [dim1, dim2] where dim1 < dim2 alphabetically.
   */
  private buildCrossDimPairs(): [DemographicDimension, DemographicDimension][] {
    const pairs: [DemographicDimension, DemographicDimension][] = [];
    for (let i = 0; i < DEMOGRAPHIC_DIMENSIONS.length; i++) {
      for (let j = i + 1; j < DEMOGRAPHIC_DIMENSIONS.length; j++) {
        const a = DEMOGRAPHIC_DIMENSIONS[i];
        const b = DEMOGRAPHIC_DIMENSIONS[j];
        // Enforce alphabetical order for dim1Name < dim2Name
        const [d1, d2] = a < b ? [a, b] : [b, a];
        pairs.push([d1, d2]);
      }
    }
    return pairs;
  }

  private aggregateCrossDimNutrition(
    meals: MealAggregate[],
  ): CrossDimNutritionRow[] {
    const rows: CrossDimNutritionRow[] = [];

    for (const [dim1, dim2] of this.buildCrossDimPairs()) {
      const grouped = this.groupBy(meals, (m) => {
        const dateStr = m.timestamp.toISOString().split('T')[0];
        const v1 = m[dim1] ?? '__null__';
        const v2 = m[dim2] ?? '__null__';
        return `${dateStr}|${m.typeOfMeal}|${v1}|${v2}`;
      });

      for (const [key, group] of grouped.entries()) {
        const [dateStr, typeOfMeal, dim1Value, dim2Value] = key.split('|');
        const uniqueUsers = new Set(group.map((m) => m.userId)).size;
        const calories = group.map((m) => m.totalCalories);

        rows.push({
          date: new Date(dateStr),
          typeOfMeal: typeOfMeal as TypeOfMeal,
          dim1Name: dim1,
          dim1Value,
          dim2Name: dim2,
          dim2Value,
          userCount: uniqueUsers,
          mealCount: group.length,
          avgCalories: safeAvg(calories),
          avgProteins: safeAvg(group.map((m) => m.totalProteins)),
          avgFat: safeAvg(group.map((m) => m.totalFat)),
          avgCarbs: safeAvg(group.map((m) => m.totalCarbs)),
          avgFiber: safeAvg(group.map((m) => m.totalFiber)),
          avgSodium: safeAvg(group.map((m) => m.totalSodium)),
          avgSugar: safeAvg(group.map((m) => m.totalSugar)),
          avgSaturatedFat: safeAvg(group.map((m) => m.totalSaturatedFat)),
          p25Calories: percentile(calories, 25),
          p50Calories: percentile(calories, 50),
          p75Calories: percentile(calories, 75),
        });
      }
    }

    return rows;
  }

  private aggregateCrossDimClassification(
    meals: MealAggregate[],
  ): CrossDimClassificationRow[] {
    const rows: CrossDimClassificationRow[] = [];

    for (const [dim1, dim2] of this.buildCrossDimPairs()) {
      const grouped = this.groupBy(meals, (m) => {
        const dateStr = m.timestamp.toISOString().split('T')[0];
        const v1 = m[dim1] ?? '__null__';
        const v2 = m[dim2] ?? '__null__';
        return `${dateStr}|${m.typeOfMeal}|${v1}|${v2}`;
      });

      for (const [key, group] of grouped.entries()) {
        const [dateStr, typeOfMeal, dim1Value, dim2Value] = key.split('|');
        const uniqueUsers = new Set(group.map((m) => m.userId)).size;
        const vegCount = group.filter((m) => m.isVegetarian).length;
        const veganCount = group.filter((m) => m.isVegan).length;

        const ultraPcts = group.map((m) => {
          if (m.novaGroups.length === 0) return 0;
          const ultra = m.novaGroups.filter((g) => g === 4).length;
          return (ultra / m.novaGroups.length) * 100;
        });

        const allNova = group.flatMap((m) => m.novaGroups);
        const novaDistribution = distribution(allNova.map((g) => String(g)));

        rows.push({
          date: new Date(dateStr),
          typeOfMeal: typeOfMeal as TypeOfMeal,
          dim1Name: dim1,
          dim1Value,
          dim2Name: dim2,
          dim2Value,
          userCount: uniqueUsers,
          totalMeals: group.length,
          vegetarianCount: vegCount,
          vegetarianPct: group.length > 0 ? (vegCount / group.length) * 100 : 0,
          veganCount,
          veganPct: group.length > 0 ? (veganCount / group.length) * 100 : 0,
          avgUltraProcessedPct: safeAvg(ultraPcts),
          p25UltraProcessedPct: percentile(ultraPcts, 25),
          p50UltraProcessedPct: percentile(ultraPcts, 50),
          p75UltraProcessedPct: percentile(ultraPcts, 75),
          novaDistribution: novaDistribution,
        });
      }
    }

    return rows;
  }

  private aggregateCrossDimPatterns(
    meals: MealAggregate[],
  ): CrossDimPatternsRow[] {
    const rows: CrossDimPatternsRow[] = [];

    for (const [dim1, dim2] of this.buildCrossDimPairs()) {
      const grouped = this.groupBy(meals, (m) => {
        const dateStr = m.timestamp.toISOString().split('T')[0];
        const v1 = m[dim1] ?? '__null__';
        const v2 = m[dim2] ?? '__null__';
        return `${dateStr}|${m.typeOfMeal}|${v1}|${v2}`;
      });

      for (const [key, group] of grouped.entries()) {
        const [dateStr, typeOfMeal, dim1Value, dim2Value] = key.split('|');
        const uniqueUsers = new Set(group.map((m) => m.userId)).size;
        const pantryMeals = group.filter((m) => m.mealFromPantry);
        const eatenOutMeals = group.filter((m) => m.eatenOut);
        const hours = group.map(
          (m) => m.timestamp.getHours() + m.timestamp.getMinutes() / 60,
        );

        rows.push({
          date: new Date(dateStr),
          typeOfMeal: typeOfMeal as TypeOfMeal,
          dim1Name: dim1,
          dim1Value,
          dim2Name: dim2,
          dim2Value,
          userCount: uniqueUsers,
          totalMeals: group.length,
          mealsFromPantryCount: pantryMeals.length,
          mealsFromPantryPct:
            group.length > 0 ? (pantryMeals.length / group.length) * 100 : 0,
          mealsEatenOutCount: eatenOutMeals.length,
          mealsEatenOutPct:
            group.length > 0 ? (eatenOutMeals.length / group.length) * 100 : 0,
          avgItemsPerMeal: safeAvg(group.map((m) => m.itemCount)) ?? 0,
          avgMealHour: safeAvg(hours),
          mealHourStdDev: stdDev(hours),
        });
      }
    }

    return rows;
  }

  private groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
    const map = new Map<string, T[]>();
    for (const item of items) {
      const key = keyFn(item);
      const group = map.get(key) ?? [];
      group.push(item);
      map.set(key, group);
    }
    return map;
  }
}
