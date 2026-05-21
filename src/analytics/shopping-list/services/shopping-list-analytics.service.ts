import { Injectable, Logger } from '@nestjs/common';
import { ShoppingListAnalyticsRepository } from '../repositories/shopping-list-analytics.repository';
import { ShoppingListAnalyticsAggregator } from './shopping-list-analytics-aggregator.service';
import { Prisma, ShoppingListAnalyticsBatchStatus } from '@prisma/client';
import { DemographicDimension } from '../../common/demographic-dimensions';
import { runBatchGeneration } from '../../common/batch-runner';
import { safeAvg } from '../../common/analytics-utils';
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
export class ShoppingListAnalyticsService {
  private readonly logger = new Logger(ShoppingListAnalyticsService.name);

  constructor(
    private readonly repository: ShoppingListAnalyticsRepository,
    private readonly aggregator: ShoppingListAnalyticsAggregator,
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
      ShoppingListAnalyticsBatchStatus.PUBLISHED,
      'system',
      yesterday,
      today,
    );

    return batchId;
  }

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
            itemPopularityRows: result.itemPopularity.length,
            categoryPopularityRows: result.categoryPopularity.length,
            listPatternsRows: result.listPatterns.length,
            nutritionProfileRows: result.nutritionProfile.length,
            sustainabilityRows: result.sustainability.length,
            foodGroupsRows: result.foodGroups.length,
            demographicPatternsRows: result.demographicPatterns.length,
            demographicNutritionRows: result.demographicNutrition.length,
            demographicClassificationRows:
              result.demographicClassification.length,
            crossDimPatternsRows: result.crossDimPatterns.length,
            crossDimNutritionRows: result.crossDimNutrition.length,
            crossDimClassificationRows: result.crossDimClassification.length,
          },
        });
        return batch.id;
      },
      async (batchId, result) => {
        if (result.itemPopularity.length > 0) {
          await this.repository.insertItemPopularity(
            result.itemPopularity.map((r) => ({ ...r, batchId })),
          );
        }
        if (result.categoryPopularity.length > 0) {
          await this.repository.insertCategoryPopularity(
            result.categoryPopularity.map((r) => ({ ...r, batchId })),
          );
        }
        if (result.listPatterns.length > 0) {
          await this.repository.insertListPatterns(
            result.listPatterns.map((r) => ({ ...r, batchId })),
          );
        }
        if (result.nutritionProfile.length > 0) {
          await this.repository.insertNutritionProfile(
            result.nutritionProfile.map((r) => ({ ...r, batchId })),
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
              novaDistribution: r.novaDistribution ?? Prisma.JsonNull,
            })),
          );
        }
        if (result.foodGroups.length > 0) {
          await this.repository.insertFoodGroups(
            result.foodGroups.map((r) => ({ ...r, batchId })),
          );
        }
        if (result.demographicPatterns.length > 0) {
          await this.repository.insertDemographicPatterns(
            result.demographicPatterns.map((r) => ({ ...r, batchId })),
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
        if (result.crossDimPatterns.length > 0) {
          await this.repository.insertCrossDimPatterns(
            result.crossDimPatterns.map((r) => ({ ...r, batchId })),
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
        this.logger.log(
          `Batch ${batchId}: ${result.totalRecords} records, ${result.suppressedGroups} suppressed`,
        );
      },
      (batchId) => this.repository.deleteBatch(batchId),
    );
  }

  // ============================================================
  // Public data
  // ============================================================

  getPublishedItemPopularity(from?: Date, to?: Date, limit = 20) {
    return this.repository.getPublishedItemPopularity(from, to, limit);
  }

  getPublishedCategoryPopularity(from?: Date, to?: Date, limit = 20) {
    return this.repository.getPublishedCategoryPopularity(from, to, limit);
  }

  getPublishedListPatterns(from?: Date, to?: Date) {
    return this.repository.getPublishedListPatterns(from, to);
  }

  getPublishedNutritionProfile(from?: Date, to?: Date) {
    return this.repository.getPublishedNutritionProfile(from, to);
  }

  getPublishedSustainability(from?: Date, to?: Date) {
    return this.repository.getPublishedSustainability(from, to);
  }

  getPublishedFoodGroups(from?: Date, to?: Date, limit = 20) {
    return this.repository.getPublishedFoodGroups(from, to, limit);
  }

  getPublishedDemographicPatterns(
    from?: Date,
    to?: Date,
    dimension?: DemographicDimension,
  ) {
    return this.repository.getPublishedDemographicPatterns(from, to, dimension);
  }

  getPublishedDemographicNutrition(
    from?: Date,
    to?: Date,
    dimension?: DemographicDimension,
  ) {
    return this.repository.getPublishedDemographicNutrition(
      from,
      to,
      dimension,
    );
  }

  getPublishedCrossDimPatterns(
    from?: Date,
    to?: Date,
    dim1?: DemographicDimension,
    dim2?: DemographicDimension,
  ) {
    return this.repository.getPublishedCrossDimPatterns(from, to, dim1, dim2);
  }

  getPublishedCrossDimNutrition(
    from?: Date,
    to?: Date,
    dim1?: DemographicDimension,
    dim2?: DemographicDimension,
  ) {
    return this.repository.getPublishedCrossDimNutrition(from, to, dim1, dim2);
  }

  getPublishedDemographicClassification(
    from?: Date,
    to?: Date,
    dimension?: DemographicDimension,
  ) {
    return this.repository.getPublishedDemographicClassification(
      from,
      to,
      dimension,
    );
  }

  getPublishedCrossDimClassification(
    from?: Date,
    to?: Date,
    dim1?: DemographicDimension,
    dim2?: DemographicDimension,
  ) {
    return this.repository.getPublishedCrossDimClassification(
      from,
      to,
      dim1,
      dim2,
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

    return {
      period: { from: from ?? null, to: to ?? null },
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
            ? safeAvg(listPatterns.map((p) => p.avgItemsPerList))
            : null,
        avgListsPerUser:
          listPatterns.length > 0
            ? safeAvg(listPatterns.map((p) => p.avgListsPerUser))
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
        avgCarbonFootprint: safeAvg(
          sustainability
            .map((s) => s.avgCarbonFootprint)
            .filter((v): v is number => v !== null),
        ),
        avgVegetarianItemPct: safeAvg(
          sustainability
            .map((s) => s.vegetarianItemPct)
            .filter((v): v is number => v !== null),
        ),
        avgUltraProcessedPct: safeAvg(
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
      ShoppingListAnalyticsBatchStatus.STAGING,
      ShoppingListAnalyticsBatchStatus.APPROVED,
    );
  }

  async publishBatch(batchId: string, adminUserId: string) {
    return publishAnalyticsBatch(
      this.repository,
      batchId,
      adminUserId,
      ShoppingListAnalyticsBatchStatus.APPROVED,
      ShoppingListAnalyticsBatchStatus.PUBLISHED,
    );
  }

  async rejectBatch(batchId: string, adminUserId: string, reason: string) {
    return rejectAnalyticsBatch(
      this.repository,
      batchId,
      adminUserId,
      reason,
      ShoppingListAnalyticsBatchStatus.STAGING,
      ShoppingListAnalyticsBatchStatus.REJECTED,
    );
  }

  async deleteBatch(batchId: string) {
    return deleteAnalyticsBatch(this.repository, batchId, [
      ShoppingListAnalyticsBatchStatus.PUBLISHED,
      ShoppingListAnalyticsBatchStatus.APPROVED,
      ShoppingListAnalyticsBatchStatus.SUPERSEDED,
    ]);
  }
}
