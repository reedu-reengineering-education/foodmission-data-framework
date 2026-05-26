import { Injectable, Logger } from '@nestjs/common';
import { MealLogAnalyticsRepository } from '../repositories/meal-log-analytics.repository';
import { MealLogAnalyticsAggregator } from './meal-log-analytics-aggregator.service';
import { AnalyticsBatchStatus, Prisma } from '@prisma/client';
import { DemographicDimension } from '../../common/demographic-dimensions';
import { runBatchGeneration } from '../../common/batch-runner';
import { safeAvg, normalizeDimPair } from '../../common/analytics-utils';
import {
  getAnalyticsBatch,
  listAnalyticsBatches,
  approveAnalyticsBatch,
  publishAnalyticsBatch,
  rejectAnalyticsBatch,
  deleteAnalyticsBatch,
  autoPublishAndSupersede,
} from '../../common/batch-lifecycle';

@Injectable()
export class MealLogAnalyticsService {
  private readonly logger = new Logger(MealLogAnalyticsService.name);

  constructor(
    private readonly repository: MealLogAnalyticsRepository,
    private readonly aggregator: MealLogAnalyticsAggregator,
  ) {}

  /**
   * Aggregate yesterday's data into staging.
   * Scheduled by AnalyticsBatchCoordinator at 2:00 AM daily.
   */
  async runDailyAggregation(): Promise<string> {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const batchId = await this.generateBatch(yesterday, today);

    await autoPublishAndSupersede(
      this.repository,
      batchId,
      AnalyticsBatchStatus.PUBLISHED,
      'system',
      yesterday,
      today,
    );

    return batchId;
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
    return this.repository.getPublishedNutrition(from, to, typeOfMeal);
  }

  async getPublishedFoodPopularity(from?: Date, to?: Date, limit = 20) {
    return this.repository.getPublishedFoodPopularity(from, to, limit);
  }

  async getPublishedMealPatterns(from?: Date, to?: Date, typeOfMeal?: string) {
    return this.repository.getPublishedMealPatterns(from, to, typeOfMeal);
  }

  async getPublishedSustainability(
    from?: Date,
    to?: Date,
    typeOfMeal?: string,
  ) {
    return this.repository.getPublishedSustainability(from, to, typeOfMeal);
  }

  async getPublishedMealClassification(
    from?: Date,
    to?: Date,
    typeOfMeal?: string,
  ) {
    return this.repository.getPublishedMealClassification(from, to, typeOfMeal);
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
    return this.repository.getPublishedDemographicNutrition(
      from,
      to,
      typeOfMeal,
      dimension as DemographicDimension | undefined,
    );
  }

  async getPublishedDemographicClassification(
    from?: Date,
    to?: Date,
    typeOfMeal?: string,
    dimension?: string,
  ) {
    return this.repository.getPublishedDemographicClassification(
      from,
      to,
      typeOfMeal,
      dimension as DemographicDimension | undefined,
    );
  }

  async getPublishedDemographicPatterns(
    from?: Date,
    to?: Date,
    typeOfMeal?: string,
    dimension?: string,
  ) {
    return this.repository.getPublishedDemographicPatterns(
      from,
      to,
      typeOfMeal,
      dimension as DemographicDimension | undefined,
    );
  }

  async getPublishedCrossDimNutrition(
    from?: Date,
    to?: Date,
    typeOfMeal?: string,
    dim1?: string,
    dim2?: string,
  ) {
    const [d1, d2] = normalizeDimPair(dim1, dim2);
    return this.repository.getPublishedCrossDimNutrition(
      from,
      to,
      typeOfMeal,
      d1 as DemographicDimension | undefined,
      d2 as DemographicDimension | undefined,
    );
  }

  async getPublishedCrossDimClassification(
    from?: Date,
    to?: Date,
    typeOfMeal?: string,
    dim1?: string,
    dim2?: string,
  ) {
    const [d1, d2] = normalizeDimPair(dim1, dim2);
    return this.repository.getPublishedCrossDimClassification(
      from,
      to,
      typeOfMeal,
      d1 as DemographicDimension | undefined,
      d2 as DemographicDimension | undefined,
    );
  }

  async getPublishedCrossDimPatterns(
    from?: Date,
    to?: Date,
    typeOfMeal?: string,
    dim1?: string,
    dim2?: string,
  ) {
    const [d1, d2] = normalizeDimPair(dim1, dim2);
    return this.repository.getPublishedCrossDimPatterns(
      from,
      to,
      typeOfMeal,
      d1 as DemographicDimension | undefined,
      d2 as DemographicDimension | undefined,
    );
  }

  async getPublishedSummary(from?: Date, to?: Date) {
    const [nutrition, popularity, patterns, sustainability, classification] =
      await Promise.all([
        this.repository.getPublishedNutrition(from, to),
        this.repository.getPublishedFoodPopularity(from, to, 5),
        this.repository.getPublishedMealPatterns(from, to),
        this.repository.getPublishedSustainability(from, to),
        this.repository.getPublishedMealClassification(from, to),
      ]);

    return {
      period: { from: from ?? null, to: to ?? null },
      nutrition: {
        dataPoints: nutrition.length,
        latestAvgCalories: nutrition.at(-1)?.avgCalories ?? null,
        latestAvgProteins: nutrition.at(-1)?.avgProteins ?? null,
        latestAvgFat: nutrition.at(-1)?.avgFat ?? null,
        latestAvgCarbs: nutrition.at(-1)?.avgCarbs ?? null,
      },
      topFoods: popularity.map((f) => ({
        name: f.foodName,
        frequency: f.frequency,
        uniqueUsers: f.uniqueUsers,
      })),
      mealPatterns: {
        dataPoints: patterns.length,
        avgPantryUsagePct:
          patterns.length > 0
            ? patterns.reduce((s, p) => s + p.mealsFromPantryPct, 0) /
              patterns.length
            : null,
        avgItemsPerMeal:
          patterns.length > 0
            ? patterns.reduce((s, p) => s + p.avgItemsPerMeal, 0) /
              patterns.length
            : null,
      },
      sustainability: {
        dataPoints: sustainability.length,
        avgSustainabilityScore: safeAvg(
          sustainability
            .map((s) => s.avgSustainabilityScore)
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
    };
  }

  // ============================================================
  // Admin — batch management
  // ============================================================

  async listBatches(status?: AnalyticsBatchStatus) {
    return listAnalyticsBatches(this.repository, status);
  }

  async getBatch(batchId: string) {
    return getAnalyticsBatch(this.repository, batchId);
  }

  async approveBatch(batchId: string, adminUserId: string) {
    return approveAnalyticsBatch(
      this.repository,
      batchId,
      adminUserId,
      AnalyticsBatchStatus.STAGING,
      AnalyticsBatchStatus.APPROVED,
    );
  }

  async publishBatch(batchId: string, adminUserId: string) {
    return publishAnalyticsBatch(
      this.repository,
      batchId,
      adminUserId,
      AnalyticsBatchStatus.APPROVED,
      AnalyticsBatchStatus.PUBLISHED,
    );
  }

  async rejectBatch(batchId: string, adminUserId: string, reason: string) {
    return rejectAnalyticsBatch(
      this.repository,
      batchId,
      adminUserId,
      reason,
      AnalyticsBatchStatus.STAGING,
      AnalyticsBatchStatus.REJECTED,
    );
  }

  async deleteBatch(batchId: string) {
    return deleteAnalyticsBatch(this.repository, batchId, [
      AnalyticsBatchStatus.PUBLISHED,
      AnalyticsBatchStatus.APPROVED,
      AnalyticsBatchStatus.SUPERSEDED,
    ]);
  }
}
