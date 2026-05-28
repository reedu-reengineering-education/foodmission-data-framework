import { Injectable, Logger } from '@nestjs/common';
import { ShoppingListAnalyticsRepository } from '../repositories/shopping-list-analytics.repository';
import { ShoppingListAnalyticsAggregator } from './shopping-list-analytics-aggregator.service';
import { Prisma, ShoppingListAnalyticsBatch } from '@prisma/client';
import { runBatchGeneration } from '../../common/batch-runner';
import {
  DEMOGRAPHIC_DIMENSIONS,
  DemographicDimension,
  K_ANONYMITY_CROSS_DIM_THRESHOLD,
  K_ANONYMITY_THRESHOLD,
  safeAvg,
  normalizeDimPair,
  toAnalyticsFoodPopularityDto,
} from '../../common/analytics-utils';
import { BaseAnalyticsService } from '../../common/base-analytics.service';

@Injectable()
export class ShoppingListAnalyticsService extends BaseAnalyticsService<ShoppingListAnalyticsBatch> {
  private readonly logger = new Logger(ShoppingListAnalyticsService.name);

  constructor(
    protected readonly repository: ShoppingListAnalyticsRepository,
    private readonly aggregator: ShoppingListAnalyticsAggregator,
  ) {
    super();
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
            sustainabilityRows: result.sustainability.length,
            foodGroupsRows: result.foodGroups.length,
            demographicPatternsRows: result.demographicPatterns.length,
            demographicClassificationRows:
              result.demographicClassification.length,
            crossDimPatternsRows: result.crossDimPatterns.length,
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

  async getPublishedPopularity(from?: Date, to?: Date, limit = 20) {
    const rows = await this.repository.getPublishedItemPopularity(
      from,
      to,
      limit,
    );
    return rows.map((row) => ({
      ...toAnalyticsFoodPopularityDto(row),
      metadata: {
        valueUnit: 'count',
        entityUnit: 'item',
      },
    }));
  }

  getPublishedCategoryPopularity(from?: Date, to?: Date, limit = 20) {
    return this.repository.getPublishedCategoryPopularity(from, to, limit);
  }

  getPublishedListPatterns(from?: Date, to?: Date) {
    return this.repository.getPublishedListPatterns(from, to);
  }

  async getPublishedPatterns(from?: Date, to?: Date) {
    const rows = await this.repository.getPublishedListPatterns(from, to);
    return rows.map((row) => ({
      id: row.id,
      date: row.date,
      userCount: row.userCount,
      totalLists: row.totalLists,
      avgItemsPerList: row.avgItemsPerList,
      avgListsPerUser: row.avgListsPerUser,
      foodProductPct: row.foodProductPct,
      genericFoodPct: row.genericFoodPct,
      metadata: {
        valueUnit: 'percentage',
        entityUnit: 'list',
      },
    }));
  }

  async getPublishedFoodPopularity(from?: Date, to?: Date, limit = 20) {
    const rows = await this.repository.getPublishedItemPopularity(
      from,
      to,
      limit,
    );
    return rows.map(toAnalyticsFoodPopularityDto);
  }

  async getPublishedSustainability(from?: Date, to?: Date) {
    const rows = await this.repository.getPublishedSustainability(from, to);
    return rows.map((row) => ({
      id: row.id,
      date: row.date,
      userCount: row.userCount,
      avgSustainabilityScore: null,
      avgCarbonFootprint: row.avgCarbonFootprint,
      nutriScoreDistribution: row.nutriScoreDistribution,
      ecoScoreDistribution: row.ecoScoreDistribution,
      metadata: {
        valueUnit: 'per_item',
        entityUnit: 'item',
      },
      // Backward-compatibility fields kept for existing clients.
      itemCount: row.itemCount,
      novaDistribution: row.novaDistribution,
      vegetarianItemPct: row.vegetarianItemPct,
      veganItemPct: row.veganItemPct,
      avgUltraProcessedPct: row.avgUltraProcessedPct,
      p25UltraProcessedPct: row.p25UltraProcessedPct,
      p50UltraProcessedPct: row.p50UltraProcessedPct,
      p75UltraProcessedPct: row.p75UltraProcessedPct,
    }));
  }

  async getPublishedClassification(from?: Date, to?: Date) {
    const rows = await this.repository.getPublishedSustainability(from, to);
    return rows.map((row) => ({
      id: row.id,
      date: row.date,
      userCount: row.userCount,
      vegetarianPct: row.vegetarianItemPct,
      veganPct: row.veganItemPct,
      avgUltraProcessedPct: row.avgUltraProcessedPct,
      p25UltraProcessedPct: row.p25UltraProcessedPct,
      p50UltraProcessedPct: row.p50UltraProcessedPct,
      p75UltraProcessedPct: row.p75UltraProcessedPct,
      novaDistribution: row.novaDistribution,
      metadata: {
        valueUnit: 'percentage',
        entityUnit: 'item',
      },
    }));
  }

  getPublishedFoodGroups(from?: Date, to?: Date, limit = 20) {
    return this.repository.getPublishedFoodGroups(from, to, limit);
  }

  async getPublishedDemographicPatterns(
    from?: Date,
    to?: Date,
    dimension?: DemographicDimension,
  ) {
    const rows = await this.repository.getPublishedDemographicPatterns(
      from,
      to,
      dimension,
    );
    return rows.map((row) => ({
      id: row.id,
      date: row.date,
      dimensionName: row.dimensionName,
      dimensionValue: row.dimensionValue,
      userCount: row.userCount,
      totalLists: row.totalLists,
      avgItemsPerList: row.avgItemsPerList,
      avgListsPerUser: row.avgListsPerUser,
      foodProductPct: row.foodProductPct,
      genericFoodPct: row.genericFoodPct,
      metadata: {
        valueUnit: 'percentage',
        entityUnit: 'list',
      },
    }));
  }

  async getPublishedCrossDimPatterns(
    from?: Date,
    to?: Date,
    dim1?: DemographicDimension,
    dim2?: DemographicDimension,
  ) {
    const [d1, d2] = normalizeDimPair(dim1, dim2);
    const rows = await this.repository.getPublishedCrossDimPatterns(
      from,
      to,
      d1,
      d2,
    );
    return rows.map((row) => ({
      id: row.id,
      date: row.date,
      dim1Name: row.dim1Name,
      dim1Value: row.dim1Value,
      dim2Name: row.dim2Name,
      dim2Value: row.dim2Value,
      userCount: row.userCount,
      totalLists: row.totalLists,
      avgItemsPerList: row.avgItemsPerList,
      avgListsPerUser: row.avgListsPerUser,
      foodProductPct: row.foodProductPct,
      genericFoodPct: row.genericFoodPct,
      metadata: {
        valueUnit: 'percentage',
        entityUnit: 'list',
      },
    }));
  }

  async getPublishedDemographicClassification(
    from?: Date,
    to?: Date,
    dimension?: DemographicDimension,
  ) {
    const rows = await this.repository.getPublishedDemographicClassification(
      from,
      to,
      dimension,
    );
    return rows.map((row) => ({
      id: row.id,
      date: row.date,
      dimensionName: row.dimensionName,
      dimensionValue: row.dimensionValue,
      userCount: row.userCount,
      vegetarianPct: row.vegetarianItemPct,
      veganPct: row.veganItemPct,
      avgUltraProcessedPct: row.avgUltraProcessedPct,
      p25UltraProcessedPct: row.p25UltraProcessedPct,
      p50UltraProcessedPct: row.p50UltraProcessedPct,
      p75UltraProcessedPct: row.p75UltraProcessedPct,
      novaDistribution: row.novaDistribution,
      metadata: {
        valueUnit: 'percentage',
        entityUnit: 'item',
      },
      // Legacy fields kept.
      itemCount: row.itemCount,
      vegetarianItemPct: row.vegetarianItemPct,
      veganItemPct: row.veganItemPct,
    }));
  }

  async getPublishedCrossDimClassification(
    from?: Date,
    to?: Date,
    dim1?: DemographicDimension,
    dim2?: DemographicDimension,
  ) {
    const [d1, d2] = normalizeDimPair(dim1, dim2);
    const rows = await this.repository.getPublishedCrossDimClassification(
      from,
      to,
      d1,
      d2,
    );
    return rows.map((row) => ({
      id: row.id,
      date: row.date,
      dim1Name: row.dim1Name,
      dim1Value: row.dim1Value,
      dim2Name: row.dim2Name,
      dim2Value: row.dim2Value,
      userCount: row.userCount,
      vegetarianPct: row.vegetarianItemPct,
      veganPct: row.veganItemPct,
      avgUltraProcessedPct: row.avgUltraProcessedPct,
      p25UltraProcessedPct: row.p25UltraProcessedPct,
      p50UltraProcessedPct: row.p50UltraProcessedPct,
      p75UltraProcessedPct: row.p75UltraProcessedPct,
      novaDistribution: row.novaDistribution,
      metadata: {
        valueUnit: 'percentage',
        entityUnit: 'item',
      },
      // Legacy fields kept.
      itemCount: row.itemCount,
      vegetarianItemPct: row.vegetarianItemPct,
      veganItemPct: row.veganItemPct,
    }));
  }

  async getPublishedSummary(from?: Date, to?: Date) {
    const [
      popularity,
      patterns,
      sustainability,
      classification,
      categoryPopularity,
    ] = await Promise.all([
      this.getPublishedPopularity(from, to, 5),
      this.getPublishedPatterns(from, to),
      this.getPublishedSustainability(from, to),
      this.getPublishedClassification(from, to),
      this.repository.getPublishedCategoryPopularity(from, to, 5),
    ]);

    return {
      period: { from: from ?? null, to: to ?? null },
      metadata: {
        capabilities: {
          supportsNutrition: false,
          supportsDemographicNutrition: false,
          supportsCrossDimNutrition: false,
          supportsClassification: true,
          supportsRecords: false,
          supportedDimensions: DEMOGRAPHIC_DIMENSIONS,
          privacyThresholds: {
            singleDimMinUsers: K_ANONYMITY_THRESHOLD,
            crossDimMinUsers: K_ANONYMITY_CROSS_DIM_THRESHOLD,
          },
        },
      },
      topItems: popularity.map((item) => ({
        itemName: item.itemName,
        itemGroup: item.itemGroup,
        itemType: item.itemType,
        frequency: item.frequency,
        uniqueUsers: item.uniqueUsers,
      })),
      patterns: {
        dataPoints: patterns.length,
        avgItemsPerList:
          patterns.length > 0
            ? safeAvg(patterns.map((p) => p.avgItemsPerList))
            : null,
        avgFoodProductPct:
          patterns.length > 0
            ? safeAvg(patterns.map((p) => p.foodProductPct))
            : null,
      },
      sustainability: {
        dataPoints: sustainability.length,
        avgSustainabilityScore: null,
        avgCarbonFootprint: safeAvg(
          sustainability
            .map((s) => s.avgCarbonFootprint)
            .filter((v): v is number => v !== null),
        ),
      },
      classification: {
        dataPoints: classification.length,
        avgVegetarianPct: safeAvg(
          classification
            .map((c) => c.vegetarianPct)
            .filter((v): v is number => v !== null),
        ),
        avgVeganPct: safeAvg(
          classification
            .map((c) => c.veganPct)
            .filter((v): v is number => v !== null),
        ),
        avgUltraProcessedPct: safeAvg(
          classification
            .map((c) => c.avgUltraProcessedPct)
            .filter((v): v is number => v !== null),
        ),
      },
      // Backward-compatibility fields kept for legacy clients.
      topCategories: categoryPopularity.map((c) => ({
        category: c.category,
        frequency: c.frequency,
        uniqueUsers: c.uniqueUsers,
      })),
    };
  }

  // ============================================================
  // Admin — batch management
  // ============================================================
}
