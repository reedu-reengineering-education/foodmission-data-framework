import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnalyticsRepository } from '../repositories/analytics.repository';
import { AnalyticsAggregator, DemographicDimension } from './analytics-aggregator.service';
import { AnalyticsBatchStatus, Prisma } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly repository: AnalyticsRepository,
    private readonly aggregator: AnalyticsAggregator,
  ) {}

  /**
   * Daily cron: aggregate yesterday's data into staging.
   * Runs at 2:00 AM every day.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runDailyAggregation(): Promise<string> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.generateBatch(yesterday, today);
  }

  /**
   * Generate a batch for a specific date range.
   */
  async generateBatch(periodStart: Date, periodEnd: Date): Promise<string> {
    this.logger.log(
      `Generating batch: ${periodStart.toISOString()} → ${periodEnd.toISOString()}`,
    );

    const result = await this.aggregator.aggregate(periodStart, periodEnd);

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
        demographicClassificationRows: result.demographicClassification.length,
        demographicPatternsRows: result.demographicPatterns.length,
        crossDimNutritionRows: result.crossDimNutrition.length,
        crossDimClassificationRows: result.crossDimClassification.length,
        crossDimPatternsRows: result.crossDimPatterns.length,
      },
    });

    if (result.dailyNutrition.length > 0) {
      await this.repository.insertDailyNutrition(
        result.dailyNutrition.map((r) => ({ ...r, batchId: batch.id })),
      );
    }
    if (result.foodPopularity.length > 0) {
      await this.repository.insertFoodPopularity(
        result.foodPopularity.map((r) => ({ ...r, batchId: batch.id })),
      );
    }
    if (result.mealPatterns.length > 0) {
      await this.repository.insertMealPatterns(
        result.mealPatterns.map((r) => ({ ...r, batchId: batch.id })),
      );
    }
    if (result.sustainability.length > 0) {
      await this.repository.insertSustainability(
        result.sustainability.map((r) => ({
          ...r,
          batchId: batch.id,
          nutriScoreDistribution:
            r.nutriScoreDistribution ?? Prisma.JsonNull,
          ecoScoreDistribution:
            r.ecoScoreDistribution ?? Prisma.JsonNull,
        })),
      );
    }
    if (result.mealClassification.length > 0) {
      await this.repository.insertMealClassification(
        result.mealClassification.map((r) => ({
          ...r,
          batchId: batch.id,
          novaDistribution: r.novaDistribution ?? Prisma.JsonNull,
        })),
      );
    }
    if (result.mealRecords.length > 0) {
      await this.repository.insertMealRecords(
        result.mealRecords.map((r) => ({ ...r, batchId: batch.id })),
      );
    }
    if (result.demographicNutrition.length > 0) {
      await this.repository.insertDemographicNutrition(
        result.demographicNutrition.map((r) => ({ ...r, batchId: batch.id })),
      );
    }
    if (result.demographicClassification.length > 0) {
      await this.repository.insertDemographicClassification(
        result.demographicClassification.map((r) => ({
          ...r,
          batchId: batch.id,
          novaDistribution: r.novaDistribution ?? Prisma.JsonNull,
        })),
      );
    }
    if (result.demographicPatterns.length > 0) {
      await this.repository.insertDemographicPatterns(
        result.demographicPatterns.map((r) => ({ ...r, batchId: batch.id })),
      );
    }
    if (result.crossDimNutrition.length > 0) {
      await this.repository.insertCrossDimNutrition(
        result.crossDimNutrition.map((r) => ({ ...r, batchId: batch.id })),
      );
    }
    if (result.crossDimClassification.length > 0) {
      await this.repository.insertCrossDimClassification(
        result.crossDimClassification.map((r) => ({
          ...r,
          batchId: batch.id,
          novaDistribution: r.novaDistribution ?? Prisma.JsonNull,
        })),
      );
    }
    if (result.crossDimPatterns.length > 0) {
      await this.repository.insertCrossDimPatterns(
        result.crossDimPatterns.map((r) => ({ ...r, batchId: batch.id })),
      );
    }

    this.logger.log(
      `Batch ${batch.id}: ${result.totalRecords} records, ${result.suppressedGroups} suppressed`,
    );

    return batch.id;
  }

  // ============================================================
  // Public data — per dimension
  // ============================================================

  async getPublishedNutrition(
    from?: Date,
    to?: Date,
    typeOfMeal?: string,
  ) {
    return this.repository.getPublishedNutrition(from, to, typeOfMeal);
  }

  async getPublishedFoodPopularity(from?: Date, to?: Date, limit = 20) {
    return this.repository.getPublishedFoodPopularity(from, to, limit);
  }

  async getPublishedMealPatterns(
    from?: Date,
    to?: Date,
    typeOfMeal?: string,
  ) {
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
    return this.repository.getPublishedCrossDimNutrition(
      from,
      to,
      typeOfMeal,
      dim1 as DemographicDimension | undefined,
      dim2 as DemographicDimension | undefined,
    );
  }

  async getPublishedCrossDimClassification(
    from?: Date,
    to?: Date,
    typeOfMeal?: string,
    dim1?: string,
    dim2?: string,
  ) {
    return this.repository.getPublishedCrossDimClassification(
      from,
      to,
      typeOfMeal,
      dim1 as DemographicDimension | undefined,
      dim2 as DemographicDimension | undefined,
    );
  }

  async getPublishedCrossDimPatterns(
    from?: Date,
    to?: Date,
    typeOfMeal?: string,
    dim1?: string,
    dim2?: string,
  ) {
    return this.repository.getPublishedCrossDimPatterns(
      from,
      to,
      typeOfMeal,
      dim1 as DemographicDimension | undefined,
      dim2 as DemographicDimension | undefined,
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
        avgSustainabilityScore: this.safeAvg(
          sustainability
            .map((s) => s.avgSustainabilityScore)
            .filter((v): v is number => v !== null),
        ),
      },
      classification: {
        dataPoints: classification.length,
        avgVegetarianPct: this.safeAvg(
          classification.map((c) => c.vegetarianPct),
        ),
        avgVeganPct: this.safeAvg(classification.map((c) => c.veganPct)),
        avgUltraProcessedPct: this.safeAvg(
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
    return this.repository.findBatches(status);
  }

  async getBatch(batchId: string) {
    const batch = await this.repository.findBatchById(batchId);
    if (!batch) {
      throw new NotFoundException(`Batch ${batchId} not found`);
    }
    return batch;
  }

  async approveBatch(batchId: string, adminUserId: string) {
    const batch = await this.getBatch(batchId);
    if (batch.status !== AnalyticsBatchStatus.STAGING) {
      throw new BadRequestException(
        `Batch is ${batch.status}, can only approve STAGING batches`,
      );
    }
    return this.repository.updateBatchStatus(
      batchId,
      AnalyticsBatchStatus.APPROVED,
      adminUserId,
    );
  }

  async publishBatch(batchId: string, adminUserId: string) {
    const batch = await this.getBatch(batchId);
    if (batch.status !== AnalyticsBatchStatus.APPROVED) {
      throw new BadRequestException(
        `Batch is ${batch.status}, can only publish APPROVED batches`,
      );
    }
    return this.repository.updateBatchStatus(
      batchId,
      AnalyticsBatchStatus.PUBLISHED,
      adminUserId,
    );
  }

  async rejectBatch(batchId: string, adminUserId: string, reason: string) {
    const batch = await this.getBatch(batchId);
    if (batch.status !== AnalyticsBatchStatus.STAGING) {
      throw new BadRequestException(
        `Batch is ${batch.status}, can only reject STAGING batches`,
      );
    }
    return this.repository.updateBatchStatus(
      batchId,
      AnalyticsBatchStatus.REJECTED,
      adminUserId,
      reason,
    );
  }

  async deleteBatch(batchId: string) {
    const batch = await this.getBatch(batchId);
    if (
      batch.status === AnalyticsBatchStatus.PUBLISHED ||
      batch.status === AnalyticsBatchStatus.APPROVED
    ) {
      throw new BadRequestException(
        `Cannot delete ${batch.status} batch. Reject it first.`,
      );
    }
    await this.repository.deleteBatch(batchId);
  }

  // ============================================================
  // Helpers
  // ============================================================

  private safeAvg(values: number[]): number | null {
    if (values.length === 0) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
}
