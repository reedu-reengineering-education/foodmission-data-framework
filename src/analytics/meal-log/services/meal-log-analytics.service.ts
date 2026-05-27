import { Injectable, Logger } from '@nestjs/common';
import { MealLogAnalyticsRepository } from '../repositories/meal-log-analytics.repository';
import { MealLogAnalyticsAggregator } from './meal-log-analytics-aggregator.service';
import { MealLogAnalyticsBatch, Prisma } from '@prisma/client';
import { DemographicDimension } from '../../common/demographic-dimensions';
import { runBatchGeneration } from '../../common/batch-runner';
import { safeAvg, normalizeDimPair } from '../../common/analytics-utils';
import {
  toAnalyticsNutritionDto,
  toAnalyticsFoodPopularityDto,
} from '../../common/analytics-mappers';
import { BaseAnalyticsService } from '../../common/base-analytics.service';

@Injectable()
export class MealLogAnalyticsService extends BaseAnalyticsService<MealLogAnalyticsBatch> {
  private readonly logger = new Logger(MealLogAnalyticsService.name);

  constructor(
    protected readonly repository: MealLogAnalyticsRepository,
    private readonly aggregator: MealLogAnalyticsAggregator,
  ) {
    super();
  }

  /**
   * Generate a batch for a specific date range.
   */
  async generateBatch(periodStart: Date, periodEnd: Date): Promise<string> {
    this.logger.log(
      `Generating batch: ${periodStart.toISOString()} → ${periodEnd.toISOString()}`,
    );
    return runBatchGeneration(
      periodStart,
      periodEnd,
      this.aggregator,
      async (result) => {
        const batch = await this.repository.createBatch({
          periodStart,
          periodEnd,
          recordCount: result.totalRecords,
          metadata: {
            suppressedGroups: result.suppressedGroups,
            dailyNutritionRows: result.dailyNutrition.length,
            foodPopularityRows: result.foodPopularity.length,
            mealPatternsRows: result.mealPatterns.length,
            sustainabilityRows: result.sustainability.length,
            mealClassificationRows: result.mealClassification.length,
            mealRecordsRows: result.mealRecords.length,
            demographicNutritionRows: result.demographicNutrition.length,
            demographicClassificationRows:
              result.demographicClassification.length,
            demographicPatternsRows: result.demographicPatterns.length,
            crossDimNutritionRows: result.crossDimNutrition.length,
            crossDimClassificationRows: result.crossDimClassification.length,
            crossDimPatternsRows: result.crossDimPatterns.length,
          },
        });
        return batch.id;
      },
      async (batchId, result) => {
        if (result.dailyNutrition.length > 0) {
          await this.repository.insertDailyNutrition(
            result.dailyNutrition.map((r) => ({ ...r, batchId })),
          );
        }
        if (result.foodPopularity.length > 0) {
          await this.repository.insertFoodPopularity(
            result.foodPopularity.map((r) => ({ ...r, batchId })),
          );
        }
        if (result.mealPatterns.length > 0) {
          await this.repository.insertMealPatterns(
            result.mealPatterns.map((r) => ({ ...r, batchId })),
          );
        }
        if (result.sustainability.length > 0) {
          await this.repository.insertSustainability(
            result.sustainability.map((r) => ({
              ...r,
              batchId,
              nutriScoreDistribution:
                r.nutriScoreDistribution ?? Prisma.JsonNull,
              ecoScoreDistribution: r.ecoScoreDistribution ?? Prisma.JsonNull,
            })),
          );
        }
        if (result.mealClassification.length > 0) {
          await this.repository.insertMealClassification(
            result.mealClassification.map((r) => ({
              ...r,
              batchId,
              novaDistribution: r.novaDistribution ?? Prisma.JsonNull,
            })),
          );
        }
        if (result.mealRecords.length > 0) {
          await this.repository.insertMealRecords(
            result.mealRecords.map((r) => ({ ...r, batchId })),
          );
        }
        if (result.demographicNutrition.length > 0) {
          await this.repository.insertDemographicNutrition(
            result.demographicNutrition.map((r) => ({ ...r, batchId })),
          );
        }
        if (result.demographicClassification.length > 0) {
          await this.repository.insertDemographicClassification(
            result.demographicClassification.map((r) => ({
              ...r,
              batchId,
              novaDistribution: r.novaDistribution ?? Prisma.JsonNull,
            })),
          );
        }
        if (result.demographicPatterns.length > 0) {
          await this.repository.insertDemographicPatterns(
            result.demographicPatterns.map((r) => ({ ...r, batchId })),
          );
        }
        if (result.crossDimNutrition.length > 0) {
          await this.repository.insertCrossDimNutrition(
            result.crossDimNutrition.map((r) => ({ ...r, batchId })),
          );
        }
        if (result.crossDimClassification.length > 0) {
          await this.repository.insertCrossDimClassification(
            result.crossDimClassification.map((r) => ({
              ...r,
              batchId,
              novaDistribution: r.novaDistribution ?? Prisma.JsonNull,
            })),
          );
        }
        if (result.crossDimPatterns.length > 0) {
          await this.repository.insertCrossDimPatterns(
            result.crossDimPatterns.map((r) => ({ ...r, batchId })),
          );
        }
        this.logger.log(
          `Batch ${batchId}: ${result.totalRecords} records, ${result.suppressedGroups} suppressed`,
        );
      },
      (batchId) => this.repository.deleteBatch(batchId),
    );
  }

  // ============================================================
  // Public data — per dimension
  // ============================================================

  async getPublishedNutrition(from?: Date, to?: Date, typeOfMeal?: string) {
    const rows = await this.repository.getPublishedNutrition(
      from,
      to,
      typeOfMeal,
    );
    return rows.map(toAnalyticsNutritionDto);
  }

  async getPublishedFoodPopularity(from?: Date, to?: Date, limit = 20) {
    const rows = await this.repository.getPublishedFoodPopularity(
      from,
      to,
      limit,
    );
    return rows.map(toAnalyticsFoodPopularityDto);
  }

  async getPublishedPopularity(from?: Date, to?: Date, limit = 20) {
    const rows = await this.repository.getPublishedFoodPopularity(
      from,
      to,
      limit,
    );
    return rows.map((row) => ({
      id: row.id,
      date: row.date,
      itemName: row.foodName,
      itemGroup: row.foodGroup,
      itemType: row.itemType,
      frequency: row.frequency,
      uniqueUsers: row.uniqueUsers,
      avgQuantity: row.avgQuantity,
      predominantUnit: row.predominantUnit,
      metadata: {
        valueUnit: 'per_meal',
        entityUnit: 'meal',
      },
      // Legacy fields kept.
      foodName: row.foodName,
      foodGroup: row.foodGroup,
    }));
  }

  async getPublishedMealPatterns(from?: Date, to?: Date, typeOfMeal?: string) {
    const rows = await this.repository.getPublishedMealPatterns(
      from,
      to,
      typeOfMeal,
    );
    return rows.map((row) => ({
      id: row.id,
      date: row.date,
      userCount: row.userCount,
      totalEntities: row.totalMeals,
      avgItemsPerEntity: row.avgItemsPerMeal,
      pantryPct: row.mealsFromPantryPct,
      eatenOutPct: row.mealsEatenOutPct,
      metadata: {
        valueUnit: 'percentage',
        entityUnit: 'meal',
      },
      // Legacy fields kept.
      typeOfMeal: row.typeOfMeal,
      totalMeals: row.totalMeals,
      mealsFromPantryCount: row.mealsFromPantryCount,
      mealsFromPantryPct: row.mealsFromPantryPct,
      mealsEatenOutCount: row.mealsEatenOutCount,
      mealsEatenOutPct: row.mealsEatenOutPct,
      avgItemsPerMeal: row.avgItemsPerMeal,
      avgMealHour: row.avgMealHour,
      mealHourStdDev: row.mealHourStdDev,
    }));
  }

  async getPublishedPatterns(from?: Date, to?: Date, typeOfMeal?: string) {
    return this.getPublishedMealPatterns(from, to, typeOfMeal);
  }

  async getPublishedSustainability(
    from?: Date,
    to?: Date,
    typeOfMeal?: string,
  ) {
    const rows = await this.repository.getPublishedSustainability(
      from,
      to,
      typeOfMeal,
    );
    return rows.map((row) => ({
      id: row.id,
      date: row.date,
      userCount: row.userCount,
      avgSustainabilityScore: row.avgSustainabilityScore,
      avgCarbonFootprint: row.avgCarbonFootprint,
      nutriScoreDistribution: row.nutriScoreDistribution,
      ecoScoreDistribution: row.ecoScoreDistribution,
      metadata: {
        valueUnit: 'per_meal',
        entityUnit: 'meal',
      },
      // Legacy fields kept.
      typeOfMeal: row.typeOfMeal,
    }));
  }

  async getPublishedMealClassification(
    from?: Date,
    to?: Date,
    typeOfMeal?: string,
  ) {
    const rows = await this.repository.getPublishedMealClassification(
      from,
      to,
      typeOfMeal,
    );
    return rows.map((row) => ({
      id: row.id,
      date: row.date,
      userCount: row.userCount,
      vegetarianPct: row.vegetarianPct,
      veganPct: row.veganPct,
      avgUltraProcessedPct: row.avgUltraProcessedPct,
      p25UltraProcessedPct: row.p25UltraProcessedPct,
      p50UltraProcessedPct: row.p50UltraProcessedPct,
      p75UltraProcessedPct: row.p75UltraProcessedPct,
      novaDistribution: row.novaDistribution,
      metadata: {
        valueUnit: 'percentage',
        entityUnit: 'meal',
      },
      // Legacy fields kept.
      typeOfMeal: row.typeOfMeal,
      totalMeals: row.totalMeals,
      vegetarianCount: row.vegetarianCount,
      veganCount: row.veganCount,
    }));
  }

  async getPublishedMealRecords(from?: Date, to?: Date, typeOfMeal?: string) {
    return this.repository.getPublishedMealRecords(from, to, typeOfMeal);
  }

  async getPublishedDemographicNutrition(
    from?: Date,
    to?: Date,
    typeOfMeal?: string,
    dimension?: string,
  ) {
    const rows = await this.repository.getPublishedDemographicNutrition(
      from,
      to,
      typeOfMeal,
      dimension as DemographicDimension | undefined,
    );
    return rows.map((row) => ({
      id: row.id,
      date: row.date,
      dimensionName: row.dimensionName,
      dimensionValue: row.dimensionValue,
      userCount: row.userCount,
      entityCount: row.mealCount,
      avgCalories: row.avgCalories,
      avgProteins: row.avgProteins,
      avgFat: row.avgFat,
      avgCarbs: row.avgCarbs,
      avgFiber: row.avgFiber,
      avgSodium: row.avgSodium,
      avgSugar: row.avgSugar,
      avgSaturatedFat: row.avgSaturatedFat,
      p25Calories: row.p25Calories,
      p50Calories: row.p50Calories,
      p75Calories: row.p75Calories,
      metadata: {
        valueUnit: 'per_meal',
        entityUnit: 'meal',
      },
      // Legacy fields kept.
      typeOfMeal: row.typeOfMeal,
      mealCount: row.mealCount,
    }));
  }

  async getPublishedDemographicClassification(
    from?: Date,
    to?: Date,
    typeOfMeal?: string,
    dimension?: string,
  ) {
    const rows = await this.repository.getPublishedDemographicClassification(
      from,
      to,
      typeOfMeal,
      dimension as DemographicDimension | undefined,
    );
    return rows.map((row) => ({
      id: row.id,
      date: row.date,
      dimensionName: row.dimensionName,
      dimensionValue: row.dimensionValue,
      userCount: row.userCount,
      vegetarianPct: row.vegetarianPct,
      veganPct: row.veganPct,
      avgUltraProcessedPct: row.avgUltraProcessedPct,
      p25UltraProcessedPct: row.p25UltraProcessedPct,
      p50UltraProcessedPct: row.p50UltraProcessedPct,
      p75UltraProcessedPct: row.p75UltraProcessedPct,
      novaDistribution: row.novaDistribution,
      metadata: {
        valueUnit: 'percentage',
        entityUnit: 'meal',
      },
      // Legacy fields kept.
      typeOfMeal: row.typeOfMeal,
      totalMeals: row.totalMeals,
      vegetarianCount: row.vegetarianCount,
      veganCount: row.veganCount,
    }));
  }

  async getPublishedDemographicPatterns(
    from?: Date,
    to?: Date,
    typeOfMeal?: string,
    dimension?: string,
  ) {
    const rows = await this.repository.getPublishedDemographicPatterns(
      from,
      to,
      typeOfMeal,
      dimension as DemographicDimension | undefined,
    );
    return rows.map((row) => ({
      id: row.id,
      date: row.date,
      dimensionName: row.dimensionName,
      dimensionValue: row.dimensionValue,
      userCount: row.userCount,
      totalEntities: row.totalMeals,
      avgItemsPerEntity: row.avgItemsPerMeal,
      pantryPct: row.mealsFromPantryPct,
      eatenOutPct: row.mealsEatenOutPct,
      metadata: {
        valueUnit: 'percentage',
        entityUnit: 'meal',
      },
      // Legacy fields kept.
      typeOfMeal: row.typeOfMeal,
      totalMeals: row.totalMeals,
      mealsFromPantryCount: row.mealsFromPantryCount,
      mealsFromPantryPct: row.mealsFromPantryPct,
      mealsEatenOutCount: row.mealsEatenOutCount,
      mealsEatenOutPct: row.mealsEatenOutPct,
      avgItemsPerMeal: row.avgItemsPerMeal,
      avgMealHour: row.avgMealHour,
      mealHourStdDev: row.mealHourStdDev,
    }));
  }

  async getPublishedCrossDimNutrition(
    from?: Date,
    to?: Date,
    typeOfMeal?: string,
    dim1?: string,
    dim2?: string,
  ) {
    const [d1, d2] = normalizeDimPair(dim1, dim2);
    const rows = await this.repository.getPublishedCrossDimNutrition(
      from,
      to,
      typeOfMeal,
      d1 as DemographicDimension | undefined,
      d2 as DemographicDimension | undefined,
    );
    return rows.map((row) => ({
      id: row.id,
      date: row.date,
      dim1Name: row.dim1Name,
      dim1Value: row.dim1Value,
      dim2Name: row.dim2Name,
      dim2Value: row.dim2Value,
      userCount: row.userCount,
      entityCount: row.mealCount,
      avgCalories: row.avgCalories,
      avgProteins: row.avgProteins,
      avgFat: row.avgFat,
      avgCarbs: row.avgCarbs,
      avgFiber: row.avgFiber,
      avgSodium: row.avgSodium,
      avgSugar: row.avgSugar,
      avgSaturatedFat: row.avgSaturatedFat,
      p25Calories: row.p25Calories,
      p50Calories: row.p50Calories,
      p75Calories: row.p75Calories,
      metadata: {
        valueUnit: 'per_meal',
        entityUnit: 'meal',
      },
      // Legacy fields kept.
      typeOfMeal: row.typeOfMeal,
      mealCount: row.mealCount,
    }));
  }

  async getPublishedCrossDimClassification(
    from?: Date,
    to?: Date,
    typeOfMeal?: string,
    dim1?: string,
    dim2?: string,
  ) {
    const [d1, d2] = normalizeDimPair(dim1, dim2);
    const rows = await this.repository.getPublishedCrossDimClassification(
      from,
      to,
      typeOfMeal,
      d1 as DemographicDimension | undefined,
      d2 as DemographicDimension | undefined,
    );
    return rows.map((row) => ({
      id: row.id,
      date: row.date,
      dim1Name: row.dim1Name,
      dim1Value: row.dim1Value,
      dim2Name: row.dim2Name,
      dim2Value: row.dim2Value,
      userCount: row.userCount,
      vegetarianPct: row.vegetarianPct,
      veganPct: row.veganPct,
      avgUltraProcessedPct: row.avgUltraProcessedPct,
      p25UltraProcessedPct: row.p25UltraProcessedPct,
      p50UltraProcessedPct: row.p50UltraProcessedPct,
      p75UltraProcessedPct: row.p75UltraProcessedPct,
      novaDistribution: row.novaDistribution,
      metadata: {
        valueUnit: 'percentage',
        entityUnit: 'meal',
      },
      // Legacy fields kept.
      typeOfMeal: row.typeOfMeal,
      totalMeals: row.totalMeals,
      vegetarianCount: row.vegetarianCount,
      veganCount: row.veganCount,
    }));
  }

  async getPublishedCrossDimPatterns(
    from?: Date,
    to?: Date,
    typeOfMeal?: string,
    dim1?: string,
    dim2?: string,
  ) {
    const [d1, d2] = normalizeDimPair(dim1, dim2);
    const rows = await this.repository.getPublishedCrossDimPatterns(
      from,
      to,
      typeOfMeal,
      d1 as DemographicDimension | undefined,
      d2 as DemographicDimension | undefined,
    );
    return rows.map((row) => ({
      id: row.id,
      date: row.date,
      dim1Name: row.dim1Name,
      dim1Value: row.dim1Value,
      dim2Name: row.dim2Name,
      dim2Value: row.dim2Value,
      userCount: row.userCount,
      totalEntities: row.totalMeals,
      avgItemsPerEntity: row.avgItemsPerMeal,
      pantryPct: row.mealsFromPantryPct,
      eatenOutPct: row.mealsEatenOutPct,
      metadata: {
        valueUnit: 'percentage',
        entityUnit: 'meal',
      },
      // Legacy fields kept.
      typeOfMeal: row.typeOfMeal,
      totalMeals: row.totalMeals,
      mealsFromPantryCount: row.mealsFromPantryCount,
      mealsFromPantryPct: row.mealsFromPantryPct,
      mealsEatenOutCount: row.mealsEatenOutCount,
      mealsEatenOutPct: row.mealsEatenOutPct,
      avgItemsPerMeal: row.avgItemsPerMeal,
      avgMealHour: row.avgMealHour,
      mealHourStdDev: row.mealHourStdDev,
    }));
  }

  async getPublishedSummary(from?: Date, to?: Date) {
    const [nutrition, popularity, patterns, sustainability, classification] =
      await Promise.all([
        this.getPublishedNutrition(from, to),
        this.getPublishedPopularity(from, to, 5),
        this.getPublishedPatterns(from, to),
        this.getPublishedSustainability(from, to),
        this.getPublishedMealClassification(from, to),
      ]);

    return {
      period: { from: from ?? null, to: to ?? null },
      topItems: popularity.map((f) => ({
        itemName: f.itemName,
        itemGroup: f.itemGroup,
        itemType: f.itemType,
        frequency: f.frequency,
        uniqueUsers: f.uniqueUsers,
      })),
      patterns: {
        dataPoints: patterns.length,
        avgItemsPerEntity:
          patterns.length > 0
            ? safeAvg(patterns.map((p) => p.avgItemsPerEntity))
            : null,
        avgPantryPct:
          patterns.length > 0
            ? safeAvg(patterns.map((p) => p.pantryPct))
            : null,
      },
      nutrition: {
        dataPoints: nutrition.length,
        latestAvgCalories: nutrition.at(-1)?.avgCalories ?? null,
        latestAvgProteins: nutrition.at(-1)?.avgProteins ?? null,
        latestAvgFat: nutrition.at(-1)?.avgFat ?? null,
        latestAvgCarbs: nutrition.at(-1)?.avgCarbs ?? null,
        metadata: {
          valueUnit: 'per_meal',
          entityUnit: 'meal',
        },
      },
      sustainability: {
        dataPoints: sustainability.length,
        avgSustainabilityScore: safeAvg(
          sustainability
            .map((s) => s.avgSustainabilityScore)
            .filter((v): v is number => v !== null),
        ),
        avgCarbonFootprint: safeAvg(
          sustainability
            .map((s) => s.avgCarbonFootprint)
            .filter((v): v is number => v !== null),
        ),
      },
      classification: {
        dataPoints: classification.length,
        avgVegetarianPct: safeAvg(classification.map((c) => c.vegetarianPct)),
        avgVeganPct: safeAvg(classification.map((c) => c.veganPct)),
        avgUltraProcessedPct: safeAvg(
          classification
            .map((c) => c.avgUltraProcessedPct)
            .filter((v): v is number => v !== null),
        ),
      },
      // Backward-compatibility fields kept for legacy clients.
      topFoods: popularity.map((f) => ({
        name: f.itemName,
        frequency: f.frequency,
        uniqueUsers: f.uniqueUsers,
      })),
      mealPatterns: {
        dataPoints: patterns.length,
        avgPantryUsagePct:
          patterns.length > 0
            ? safeAvg(patterns.map((p) => p.pantryPct))
            : null,
        avgItemsPerMeal:
          patterns.length > 0
            ? safeAvg(patterns.map((p) => p.avgItemsPerEntity))
            : null,
      },
    };
  }

  // ============================================================
  // Admin — batch management
  // ============================================================
}
