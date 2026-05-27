import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  Prisma,
  ShoppingListAnalyticsBatch,
  AnalyticsBatchStatus,
} from '@prisma/client';
import { DemographicDimension } from '../../common/analytics-utils';

@Injectable()
export class ShoppingListAnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createBatch(data: {
    periodStart: Date;
    periodEnd: Date;
    recordCount: number;
    metadata?: Prisma.InputJsonValue;
  }): Promise<ShoppingListAnalyticsBatch> {
    return this.prisma.shoppingListAnalyticsBatch.create({ data });
  }

  async findBatchById(id: string) {
    return this.prisma.shoppingListAnalyticsBatch.findUnique({
      where: { id },
      include: {
        itemPopularity: { orderBy: { frequency: 'desc' } },
        categoryPopularity: { orderBy: { frequency: 'desc' } },
        listPatterns: true,
        sustainability: true,
        foodGroups: { orderBy: { frequency: 'desc' } },
        demographicPatterns: true,
        demographicClassification: true,
        crossDimPatterns: true,
        crossDimClassification: true,
      },
    });
  }

  async findBatches(status?: AnalyticsBatchStatus) {
    return this.prisma.shoppingListAnalyticsBatch.findMany({
      where: status ? { status } : undefined,
      orderBy: { generatedAt: 'desc' },
    });
  }

  async updateBatchStatus(
    id: string,
    status: AnalyticsBatchStatus,
    userId?: string,
    reason?: string,
  ): Promise<ShoppingListAnalyticsBatch> {
    const data: Prisma.ShoppingListAnalyticsBatchUpdateInput = { status };

    if (status === AnalyticsBatchStatus.PUBLISHED) {
      data.publishedAt = new Date();
      data.publishedBy = userId;
    } else if (status === AnalyticsBatchStatus.REJECTED) {
      data.rejectedAt = new Date();
      data.rejectedBy = userId;
      data.rejectionReason = reason;
    }

    return this.prisma.shoppingListAnalyticsBatch.update({
      where: { id },
      data,
    });
  }

  async deleteBatch(id: string): Promise<void> {
    await this.prisma.shoppingListAnalyticsBatch.delete({ where: { id } });
  }

  /**
   * Mark all PUBLISHED batches that cover [from, to) as SUPERSEDED.
   * Called by runDailyAggregation before publishing the replacement batch,
   * so read queries never see two PUBLISHED batches for the same day.
   */
  async supersedeBatchesForPeriod(
    from: Date,
    to: Date,
    excludeId: string,
  ): Promise<void> {
    await this.prisma.shoppingListAnalyticsBatch.updateMany({
      where: {
        id: { not: excludeId },
        status: AnalyticsBatchStatus.PUBLISHED,
        // Overlap semantics: batch overlaps [from, to) when periodEnd > from AND periodStart < to
        periodEnd: { gt: from },
        periodStart: { lt: to },
      },
      data: { status: AnalyticsBatchStatus.SUPERSEDED },
    });
  }

  // ============================================================
  // Bulk inserts
  // ============================================================

  insertItemPopularity(
    data: Prisma.ShoppingListAnalyticsItemPopularityCreateManyInput[],
  ) {
    return this.prisma.shoppingListAnalyticsItemPopularity.createMany({ data });
  }

  insertCategoryPopularity(
    data: Prisma.ShoppingListAnalyticsCategoryPopularityCreateManyInput[],
  ) {
    return this.prisma.shoppingListAnalyticsCategoryPopularity.createMany({
      data,
    });
  }

  insertListPatterns(
    data: Prisma.ShoppingListAnalyticsListPatternsCreateManyInput[],
  ) {
    return this.prisma.shoppingListAnalyticsListPatterns.createMany({ data });
  }

  async insertSustainability(
    data: Prisma.ShoppingListAnalyticsSustainabilityCreateManyInput[],
  ) {
    return this.prisma.shoppingListAnalyticsSustainability.createMany({ data });
  }

  async insertFoodGroups(
    data: Prisma.ShoppingListAnalyticsFoodGroupsCreateManyInput[],
  ) {
    return this.prisma.shoppingListAnalyticsFoodGroups.createMany({ data });
  }

  async insertDemographicPatterns(
    data: Prisma.ShoppingListAnalyticsDemographicPatternsCreateManyInput[],
  ) {
    return this.prisma.shoppingListAnalyticsDemographicPatterns.createMany({
      data,
    });
  }

  async insertDemographicClassification(
    data: Prisma.ShoppingListAnalyticsDemographicClassificationCreateManyInput[],
  ) {
    return this.prisma.shoppingListAnalyticsDemographicClassification.createMany(
      { data },
    );
  }

  async insertCrossDimPatterns(
    data: Prisma.ShoppingListAnalyticsCrossDimPatternsCreateManyInput[],
  ) {
    return this.prisma.shoppingListAnalyticsCrossDimPatterns.createMany({
      data,
    });
  }

  async insertCrossDimClassification(
    data: Prisma.ShoppingListAnalyticsCrossDimClassificationCreateManyInput[],
  ) {
    return this.prisma.shoppingListAnalyticsCrossDimClassification.createMany({
      data,
    });
  }

  // ============================================================
  // Published data queries
  // ============================================================

  private publishedBatchFilter(
    from?: Date,
    to?: Date,
  ): Prisma.ShoppingListAnalyticsBatchWhereInput {
    const filter: Prisma.ShoppingListAnalyticsBatchWhereInput = {
      status: AnalyticsBatchStatus.PUBLISHED,
    };
    // Use overlap semantics: any batch whose period intersects [from, to].
    // A batch overlaps the window when periodStart < to AND periodEnd > from.
    if (from) filter.periodEnd = { gt: from };
    if (to) filter.periodStart = { lt: to };
    return filter;
  }

  getPublishedItemPopularity(from?: Date, to?: Date, limit = 20) {
    return this.prisma.shoppingListAnalyticsItemPopularity.findMany({
      where: { batch: this.publishedBatchFilter(from, to) },
      orderBy: { frequency: 'desc' },
      take: limit,
      select: {
        id: true,
        date: true,
        foodName: true,
        foodGroup: true,
        itemType: true,
        frequency: true,
        uniqueUsers: true,
        avgQuantity: true,
        predominantUnit: true,
      },
    });
  }

  getPublishedCategoryPopularity(from?: Date, to?: Date, limit = 20) {
    return this.prisma.shoppingListAnalyticsCategoryPopularity.findMany({
      where: { batch: this.publishedBatchFilter(from, to) },
      orderBy: { frequency: 'desc' },
      take: limit,
      select: {
        id: true,
        date: true,
        category: true,
        frequency: true,
        uniqueUsers: true,
      },
    });
  }

  getPublishedListPatterns(from?: Date, to?: Date) {
    return this.prisma.shoppingListAnalyticsListPatterns.findMany({
      where: { batch: this.publishedBatchFilter(from, to) },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        date: true,
        userCount: true,
        totalLists: true,
        avgItemsPerList: true,
        avgListsPerUser: true,
        foodProductPct: true,
        genericFoodPct: true,
      },
    });
  }

  getPublishedSustainability(from?: Date, to?: Date) {
    return this.prisma.shoppingListAnalyticsSustainability.findMany({
      where: { batch: this.publishedBatchFilter(from, to) },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        date: true,
        userCount: true,
        itemCount: true,
        avgCarbonFootprint: true,
        nutriScoreDistribution: true,
        ecoScoreDistribution: true,
        novaDistribution: true,
        vegetarianItemPct: true,
        veganItemPct: true,
        avgUltraProcessedPct: true,
        p25UltraProcessedPct: true,
        p50UltraProcessedPct: true,
        p75UltraProcessedPct: true,
      },
    });
  }

  getPublishedFoodGroups(from?: Date, to?: Date, limit = 20) {
    return this.prisma.shoppingListAnalyticsFoodGroups.findMany({
      where: { batch: this.publishedBatchFilter(from, to) },
      orderBy: { frequency: 'desc' },
      take: limit,
      select: {
        id: true,
        date: true,
        foodGroup: true,
        frequency: true,
        uniqueUsers: true,
        avgQuantity: true,
        predominantUnit: true,
      },
    });
  }

  getPublishedDemographicPatterns(
    from?: Date,
    to?: Date,
    dimension?: DemographicDimension,
  ) {
    return this.prisma.shoppingListAnalyticsDemographicPatterns.findMany({
      where: {
        batch: this.publishedBatchFilter(from, to),
        ...(dimension ? { dimensionName: dimension } : {}),
      },
      orderBy: [{ date: 'asc' }, { dimensionName: 'asc' }],
      select: {
        id: true,
        date: true,
        dimensionName: true,
        dimensionValue: true,
        userCount: true,
        totalLists: true,
        avgItemsPerList: true,
        avgListsPerUser: true,
        foodProductPct: true,
        genericFoodPct: true,
      },
    });
  }

  getPublishedCrossDimPatterns(
    from?: Date,
    to?: Date,
    dim1?: DemographicDimension,
    dim2?: DemographicDimension,
  ) {
    return this.prisma.shoppingListAnalyticsCrossDimPatterns.findMany({
      where: {
        batch: this.publishedBatchFilter(from, to),
        ...(dim1 ? { dim1Name: dim1 } : {}),
        ...(dim2 ? { dim2Name: dim2 } : {}),
      },
      orderBy: [{ date: 'asc' }, { dim1Name: 'asc' }, { dim2Name: 'asc' }],
      select: {
        id: true,
        date: true,
        dim1Name: true,
        dim1Value: true,
        dim2Name: true,
        dim2Value: true,
        userCount: true,
        totalLists: true,
        avgItemsPerList: true,
        avgListsPerUser: true,
        foodProductPct: true,
        genericFoodPct: true,
      },
    });
  }

  getPublishedDemographicClassification(
    from?: Date,
    to?: Date,
    dimension?: DemographicDimension,
  ) {
    return this.prisma.shoppingListAnalyticsDemographicClassification.findMany({
      where: {
        batch: this.publishedBatchFilter(from, to),
        ...(dimension ? { dimensionName: dimension } : {}),
      },
      orderBy: [{ date: 'asc' }, { dimensionName: 'asc' }],
      select: {
        id: true,
        date: true,
        dimensionName: true,
        dimensionValue: true,
        userCount: true,
        itemCount: true,
        vegetarianItemPct: true,
        veganItemPct: true,
        avgUltraProcessedPct: true,
        p25UltraProcessedPct: true,
        p50UltraProcessedPct: true,
        p75UltraProcessedPct: true,
        novaDistribution: true,
      },
    });
  }

  getPublishedCrossDimClassification(
    from?: Date,
    to?: Date,
    dim1?: DemographicDimension,
    dim2?: DemographicDimension,
  ) {
    return this.prisma.shoppingListAnalyticsCrossDimClassification.findMany({
      where: {
        batch: this.publishedBatchFilter(from, to),
        ...(dim1 ? { dim1Name: dim1 } : {}),
        ...(dim2 ? { dim2Name: dim2 } : {}),
      },
      orderBy: [{ date: 'asc' }, { dim1Name: 'asc' }, { dim2Name: 'asc' }],
      select: {
        id: true,
        date: true,
        dim1Name: true,
        dim1Value: true,
        dim2Name: true,
        dim2Value: true,
        userCount: true,
        itemCount: true,
        vegetarianItemPct: true,
        veganItemPct: true,
        avgUltraProcessedPct: true,
        p25UltraProcessedPct: true,
        p50UltraProcessedPct: true,
        p75UltraProcessedPct: true,
        novaDistribution: true,
      },
    });
  }
}
