import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ShoppingListAnalyticsRepository } from '../repositories/shopping-list-analytics.repository';
import {
  ShoppingListAnalyticsAggregator,
  DemographicDimension,
} from './shopping-list-analytics-aggregator.service';
import { Prisma, ShoppingListAnalyticsBatchStatus } from '@prisma/client';

@Injectable()
export class ShoppingListAnalyticsService {
  private readonly logger = new Logger(ShoppingListAnalyticsService.name);

  constructor(
    private readonly repository: ShoppingListAnalyticsRepository,
    private readonly aggregator: ShoppingListAnalyticsAggregator,
  ) {}

  /**
   * Daily cron: aggregate yesterday's data into staging.
   * Runs at 3:00 AM every day (offset from meal log's 2 AM to avoid contention).
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async runDailyAggregation(): Promise<string> {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    return this.generateBatch(yesterday, today);
  }

  async generateBatch(periodStart: Date, periodEnd: Date): Promise<string> {
    if (periodStart >= periodEnd) {
      throw new BadRequestException('periodStart must be before periodEnd');
    }
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
        itemPopularityRows: result.itemPopularity.length,
        categoryPopularityRows: result.categoryPopularity.length,
        listPatternsRows: result.listPatterns.length,
        nutritionProfileRows: result.nutritionProfile.length,
        sustainabilityRows: result.sustainability.length,
        foodGroupsRows: result.foodGroups.length,
        demographicPatternsRows: result.demographicPatterns.length,
        demographicNutritionRows: result.demographicNutrition.length,
        crossDimPatternsRows: result.crossDimPatterns.length,
        crossDimNutritionRows: result.crossDimNutrition.length,
      },
    });

    if (result.itemPopularity.length > 0) {
      await this.repository.insertItemPopularity(
        result.itemPopularity.map((r) => ({ ...r, batchId: batch.id })),
      );
    }
    if (result.categoryPopularity.length > 0) {
      await this.repository.insertCategoryPopularity(
        result.categoryPopularity.map((r) => ({ ...r, batchId: batch.id })),
      );
    }
    if (result.listPatterns.length > 0) {
      await this.repository.insertListPatterns(
        result.listPatterns.map((r) => ({ ...r, batchId: batch.id })),
      );
    }
    if (result.nutritionProfile.length > 0) {
      await this.repository.insertNutritionProfile(
        result.nutritionProfile.map((r) => ({ ...r, batchId: batch.id })),
      );
    }
    if (result.sustainability.length > 0) {
      await this.repository.insertSustainability(
        result.sustainability.map((r) => ({
          ...r,
          batchId: batch.id,
          nutriScoreDistribution: r.nutriScoreDistribution ?? Prisma.JsonNull,
          ecoScoreDistribution: r.ecoScoreDistribution ?? Prisma.JsonNull,
          novaDistribution: r.novaDistribution ?? Prisma.JsonNull,
        })),
      );
    }
    if (result.foodGroups.length > 0) {
      await this.repository.insertFoodGroups(
        result.foodGroups.map((r) => ({ ...r, batchId: batch.id })),
      );
    }
    if (result.demographicPatterns.length > 0) {
      await this.repository.insertDemographicPatterns(
        result.demographicPatterns.map((r) => ({ ...r, batchId: batch.id })),
      );
    }
    if (result.demographicNutrition.length > 0) {
      await this.repository.insertDemographicNutrition(
        result.demographicNutrition.map((r) => ({ ...r, batchId: batch.id })),
      );
    }
    if (result.crossDimPatterns.length > 0) {
      await this.repository.insertCrossDimPatterns(
        result.crossDimPatterns.map((r) => ({ ...r, batchId: batch.id })),
      );
    }
    if (result.crossDimNutrition.length > 0) {
      await this.repository.insertCrossDimNutrition(
        result.crossDimNutrition.map((r) => ({ ...r, batchId: batch.id })),
      );
    }

    this.logger.log(
      `Batch ${batch.id}: ${result.totalRecords} records, ${result.suppressedGroups} suppressed`,
    );

    return batch.id;
  }

  // ============================================================
  // Public data
  // ============================================================

  async getPublishedItemPopularity(from?: Date, to?: Date, limit = 20) {
    return this.repository.getPublishedItemPopularity(from, to, limit);
  }

  async getPublishedCategoryPopularity(from?: Date, to?: Date, limit = 20) {
    return this.repository.getPublishedCategoryPopularity(from, to, limit);
  }

  async getPublishedListPatterns(from?: Date, to?: Date) {
    return this.repository.getPublishedListPatterns(from, to);
  }

  async getPublishedNutritionProfile(from?: Date, to?: Date) {
    return this.repository.getPublishedNutritionProfile(from, to);
  }

  async getPublishedSustainability(from?: Date, to?: Date) {
    return this.repository.getPublishedSustainability(from, to);
  }

  async getPublishedFoodGroups(from?: Date, to?: Date, limit = 20) {
    return this.repository.getPublishedFoodGroups(from, to, limit);
  }

  async getPublishedDemographicPatterns(
    from?: Date,
    to?: Date,
    dimension?: string,
  ) {
    return this.repository.getPublishedDemographicPatterns(
      from,
      to,
      dimension as DemographicDimension | undefined,
    );
  }

  async getPublishedDemographicNutrition(
    from?: Date,
    to?: Date,
    dimension?: string,
  ) {
    return this.repository.getPublishedDemographicNutrition(
      from,
      to,
      dimension as DemographicDimension | undefined,
    );
  }

  async getPublishedCrossDimPatterns(
    from?: Date,
    to?: Date,
    dim1?: string,
    dim2?: string,
  ) {
    return this.repository.getPublishedCrossDimPatterns(
      from,
      to,
      dim1 as DemographicDimension | undefined,
      dim2 as DemographicDimension | undefined,
    );
  }

  async getPublishedCrossDimNutrition(
    from?: Date,
    to?: Date,
    dim1?: string,
    dim2?: string,
  ) {
    return this.repository.getPublishedCrossDimNutrition(
      from,
      to,
      dim1 as DemographicDimension | undefined,
      dim2 as DemographicDimension | undefined,
    );
  }

  async getPublishedSummary(from?: Date, to?: Date) {
    const [
      itemPopularity,
      categoryPopularity,
      listPatterns,
      nutritionProfile,
      sustainability,
    ] = await Promise.all([
      this.repository.getPublishedItemPopularity(from, to, 5),
      this.repository.getPublishedCategoryPopularity(from, to, 5),
      this.repository.getPublishedListPatterns(from, to),
      this.repository.getPublishedNutritionProfile(from, to),
      this.repository.getPublishedSustainability(from, to),
    ]);

    const derivedFrom = from ?? listPatterns.at(0)?.date ?? null;
    const derivedTo = to ?? listPatterns.at(-1)?.date ?? null;

    return {
      period: { from: derivedFrom, to: derivedTo },
      topItems: itemPopularity.map((f) => ({
        name: f.foodName,
        frequency: f.frequency,
        uniqueUsers: f.uniqueUsers,
      })),
      topCategories: categoryPopularity.map((c) => ({
        category: c.category,
        frequency: c.frequency,
        uniqueUsers: c.uniqueUsers,
      })),
      listPatterns: {
        dataPoints: listPatterns.length,
        avgItemsPerList:
          listPatterns.length > 0
            ? this.safeAvg(listPatterns.map((p) => p.avgItemsPerList))
            : null,
        avgListsPerUser:
          listPatterns.length > 0
            ? this.safeAvg(listPatterns.map((p) => p.avgListsPerUser))
            : null,
      },
      nutritionProfile: {
        dataPoints: nutritionProfile.length,
        latestAvgCaloriesPer100g:
          nutritionProfile.at(-1)?.avgCaloriesPer100g ?? null,
        latestAvgProteinsPer100g:
          nutritionProfile.at(-1)?.avgProteinsPer100g ?? null,
      },
      sustainability: {
        dataPoints: sustainability.length,
        avgCarbonFootprint: this.safeAvg(
          sustainability
            .map((s) => s.avgCarbonFootprint)
            .filter((v): v is number => v !== null),
        ),
        avgVegetarianItemPct: this.safeAvg(
          sustainability
            .map((s) => s.vegetarianItemPct)
            .filter((v): v is number => v !== null),
        ),
        avgUltraProcessedPct: this.safeAvg(
          sustainability
            .map((s) => s.avgUltraProcessedPct)
            .filter((v): v is number => v !== null),
        ),
      },
    };
  }

  // ============================================================
  // Admin — batch management
  // ============================================================

  async listBatches(status?: ShoppingListAnalyticsBatchStatus) {
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
    if (batch.status !== ShoppingListAnalyticsBatchStatus.STAGING) {
      throw new BadRequestException(
        `Batch is ${batch.status}, can only approve STAGING batches`,
      );
    }
    return this.repository.updateBatchStatus(
      batchId,
      ShoppingListAnalyticsBatchStatus.APPROVED,
      adminUserId,
    );
  }

  async publishBatch(batchId: string, adminUserId: string) {
    const batch = await this.getBatch(batchId);
    if (batch.status !== ShoppingListAnalyticsBatchStatus.APPROVED) {
      throw new BadRequestException(
        `Batch is ${batch.status}, can only publish APPROVED batches`,
      );
    }
    return this.repository.updateBatchStatus(
      batchId,
      ShoppingListAnalyticsBatchStatus.PUBLISHED,
      adminUserId,
    );
  }

  async rejectBatch(batchId: string, adminUserId: string, reason: string) {
    const batch = await this.getBatch(batchId);
    if (batch.status !== ShoppingListAnalyticsBatchStatus.STAGING) {
      throw new BadRequestException(
        `Batch is ${batch.status}, can only reject STAGING batches`,
      );
    }
    return this.repository.updateBatchStatus(
      batchId,
      ShoppingListAnalyticsBatchStatus.REJECTED,
      adminUserId,
      reason,
    );
  }

  async deleteBatch(batchId: string) {
    const batch = await this.getBatch(batchId);
    if (
      batch.status === ShoppingListAnalyticsBatchStatus.PUBLISHED ||
      batch.status === ShoppingListAnalyticsBatchStatus.APPROVED
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
