import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  MealLogAnalyticsBatch,
  AnalyticsBatchStatus,
  Prisma,
} from '@prisma/client';
import { DemographicDimension } from '../../common/analytics-utils';
import { buildStatusUpdateFields } from '../../common/batch-lifecycle';

@Injectable()
export class MealLogAnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createBatch(data: {
    periodStart: Date;
    periodEnd: Date;
    recordCount: number;
    metadata?: Prisma.InputJsonValue;
  }): Promise<MealLogAnalyticsBatch> {
    return this.prisma.mealLogAnalyticsBatch.create({ data });
  }

  findBatchById(id: string) {
    return this.prisma.mealLogAnalyticsBatch.findUnique({
      where: { id },
      include: {
        dailyNutrition: true,
        foodPopularity: { orderBy: { frequency: 'desc' } },
        mealPatterns: true,
        sustainability: true,
        mealClassification: true,
        demographicNutrition: true,
        demographicClassification: true,
        demographicPatterns: true,
      },
    });
  }

  findBatches(status?: AnalyticsBatchStatus) {
    return this.prisma.mealLogAnalyticsBatch.findMany({
      where: status ? { status } : undefined,
      orderBy: { generatedAt: 'desc' },
    });
  }

  updateBatchStatus(
    id: string,
    status: AnalyticsBatchStatus,
    userId?: string,
    reason?: string,
  ): Promise<MealLogAnalyticsBatch> {
    const data: Prisma.MealLogAnalyticsBatchUpdateInput = {
      status,
      ...buildStatusUpdateFields(
        status,
        AnalyticsBatchStatus.PUBLISHED,
        AnalyticsBatchStatus.REJECTED,
        userId,
        reason,
      ),
    };

    return this.prisma.mealLogAnalyticsBatch.update({ where: { id }, data });
  }

  async deleteBatch(id: string): Promise<void> {
    await this.prisma.mealLogAnalyticsBatch.delete({ where: { id } });
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
    await this.prisma.mealLogAnalyticsBatch.updateMany({
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
  // Bulk inserts for aggregated data
  // ============================================================

  insertDailyNutrition(
    data: Prisma.MealLogAnalyticsDailyNutritionCreateManyInput[],
  ) {
    return this.prisma.mealLogAnalyticsDailyNutrition.createMany({ data });
  }

  insertFoodPopularity(
    data: Prisma.MealLogAnalyticsFoodPopularityCreateManyInput[],
  ) {
    return this.prisma.mealLogAnalyticsFoodPopularity.createMany({ data });
  }

  insertMealPatterns(
    data: Prisma.MealLogAnalyticsMealPatternsCreateManyInput[],
  ) {
    return this.prisma.mealLogAnalyticsMealPatterns.createMany({ data });
  }

  insertSustainability(
    data: Prisma.MealLogAnalyticsSustainabilityCreateManyInput[],
  ) {
    return this.prisma.mealLogAnalyticsSustainability.createMany({ data });
  }

  insertMealClassification(
    data: Prisma.MealLogAnalyticsMealClassificationCreateManyInput[],
  ) {
    return this.prisma.mealLogAnalyticsMealClassification.createMany({ data });
  }

  insertMealRecords(data: Prisma.MealLogAnalyticsMealRecordCreateManyInput[]) {
    return this.prisma.mealLogAnalyticsMealRecord.createMany({ data });
  }

  // ============================================================
  // Per-dimension published data queries
  // ============================================================

  private publishedBatchFilter(
    from?: Date,
    to?: Date,
  ): Prisma.MealLogAnalyticsBatchWhereInput {
    const filter: Prisma.MealLogAnalyticsBatchWhereInput = {
      status: AnalyticsBatchStatus.PUBLISHED,
    };
    // Overlap semantics: batch overlaps [from, to) when periodEnd > from AND periodStart < to.
    // Matches supersedeBatchesForPeriod and the shopping-list equivalent.
    if (from) filter.periodEnd = { gt: from };
    if (to) filter.periodStart = { lt: to };
    return filter;
  }

  getPublishedNutrition(from?: Date, to?: Date, typeOfMeal?: string) {
    const batchFilter = this.publishedBatchFilter(from, to);

    return this.prisma.mealLogAnalyticsDailyNutrition.findMany({
      where: {
        batch: batchFilter,
        ...(typeOfMeal
          ? { typeOfMeal: typeOfMeal as Prisma.EnumTypeOfMealFilter }
          : {}),
      },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        date: true,
        typeOfMeal: true,
        userCount: true,
        mealCount: true,
        avgCalories: true,
        avgProteins: true,
        avgFat: true,
        avgCarbs: true,
        avgFiber: true,
        avgSodium: true,
        avgSugar: true,
        avgSaturatedFat: true,
        p25Calories: true,
        p50Calories: true,
        p75Calories: true,
      },
    });
  }

  getPublishedFoodPopularity(from?: Date, to?: Date, limit = 20) {
    const batchFilter = this.publishedBatchFilter(from, to);

    return this.prisma.mealLogAnalyticsFoodPopularity.findMany({
      where: { batch: batchFilter },
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

  getPublishedMealPatterns(from?: Date, to?: Date, typeOfMeal?: string) {
    const batchFilter = this.publishedBatchFilter(from, to);

    return this.prisma.mealLogAnalyticsMealPatterns.findMany({
      where: {
        batch: batchFilter,
        ...(typeOfMeal
          ? { typeOfMeal: typeOfMeal as Prisma.EnumTypeOfMealFilter }
          : {}),
      },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        date: true,
        typeOfMeal: true,
        userCount: true,
        totalMeals: true,
        mealsFromPantryCount: true,
        mealsFromPantryPct: true,
        mealsEatenOutCount: true,
        mealsEatenOutPct: true,
        avgItemsPerMeal: true,
        avgMealHour: true,
        mealHourStdDev: true,
      },
    });
  }

  getPublishedSustainability(from?: Date, to?: Date, typeOfMeal?: string) {
    const batchFilter = this.publishedBatchFilter(from, to);

    return this.prisma.mealLogAnalyticsSustainability.findMany({
      where: {
        batch: batchFilter,
        ...(typeOfMeal
          ? { typeOfMeal: typeOfMeal as Prisma.EnumTypeOfMealFilter }
          : {}),
      },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        date: true,
        typeOfMeal: true,
        userCount: true,
        avgSustainabilityScore: true,
        avgCarbonFootprint: true,
        nutriScoreDistribution: true,
        ecoScoreDistribution: true,
      },
    });
  }

  getPublishedMealClassification(from?: Date, to?: Date, typeOfMeal?: string) {
    const batchFilter = this.publishedBatchFilter(from, to);

    return this.prisma.mealLogAnalyticsMealClassification.findMany({
      where: {
        batch: batchFilter,
        ...(typeOfMeal
          ? { typeOfMeal: typeOfMeal as Prisma.EnumTypeOfMealFilter }
          : {}),
      },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        date: true,
        typeOfMeal: true,
        userCount: true,
        totalMeals: true,
        vegetarianCount: true,
        vegetarianPct: true,
        veganCount: true,
        veganPct: true,
        avgUltraProcessedPct: true,
        p25UltraProcessedPct: true,
        p50UltraProcessedPct: true,
        p75UltraProcessedPct: true,
        novaDistribution: true,
      },
    });
  }

  getPublishedMealRecords(from?: Date, to?: Date, typeOfMeal?: string) {
    const batchFilter = this.publishedBatchFilter(from, to);

    return this.prisma.mealLogAnalyticsMealRecord.findMany({
      where: {
        batch: batchFilter,
        ...(typeOfMeal
          ? { typeOfMeal: typeOfMeal as Prisma.EnumTypeOfMealFilter }
          : {}),
      },
      orderBy: { weeksSinceRegistration: 'asc' },
      select: {
        id: true,
        weeksSinceRegistration: true,
        typeOfMeal: true,
        totalCalories: true,
        totalProteins: true,
        totalFat: true,
        totalCarbs: true,
        totalFiber: true,
        totalSodium: true,
        totalSugar: true,
        totalSaturatedFat: true,
        nutriScoreGrade: true,
        ecoScoreGrade: true,
        novaGroupMode: true,
        ultraProcessedPct: true,
        sustainabilityScore: true,
        totalCarbonFootprint: true,
        isVegetarian: true,
        isVegan: true,
        itemCount: true,
      },
    });
  }

  // ============================================================
  // Demographic breakdown inserts
  // ============================================================

  insertDemographicNutrition(
    data: Prisma.MealLogAnalyticsDemographicNutritionCreateManyInput[],
  ) {
    return this.prisma.mealLogAnalyticsDemographicNutrition.createMany({
      data,
    });
  }

  insertDemographicClassification(
    data: Prisma.MealLogAnalyticsDemographicClassificationCreateManyInput[],
  ) {
    return this.prisma.mealLogAnalyticsDemographicClassification.createMany({
      data,
    });
  }

  insertDemographicPatterns(
    data: Prisma.MealLogAnalyticsDemographicPatternsCreateManyInput[],
  ) {
    return this.prisma.mealLogAnalyticsDemographicPatterns.createMany({ data });
  }

  // ============================================================
  // Cross-dimensional inserts (K=20)
  // ============================================================

  insertCrossDimNutrition(
    data: Prisma.MealLogAnalyticsCrossDimNutritionCreateManyInput[],
  ) {
    return this.prisma.mealLogAnalyticsCrossDimNutrition.createMany({ data });
  }

  insertCrossDimClassification(
    data: Prisma.MealLogAnalyticsCrossDimClassificationCreateManyInput[],
  ) {
    return this.prisma.mealLogAnalyticsCrossDimClassification.createMany({
      data,
    });
  }

  insertCrossDimPatterns(
    data: Prisma.MealLogAnalyticsCrossDimPatternsCreateManyInput[],
  ) {
    return this.prisma.mealLogAnalyticsCrossDimPatterns.createMany({ data });
  }

  // ============================================================
  // Cross-dimensional public queries
  // ============================================================

  getPublishedCrossDimNutrition(
    from?: Date,
    to?: Date,
    typeOfMeal?: string,
    dim1?: DemographicDimension,
    dim2?: DemographicDimension,
  ) {
    const batchFilter = this.publishedBatchFilter(from, to);

    return this.prisma.mealLogAnalyticsCrossDimNutrition.findMany({
      where: {
        batch: batchFilter,
        ...(typeOfMeal
          ? { typeOfMeal: typeOfMeal as Prisma.EnumTypeOfMealFilter }
          : {}),
        ...(dim1 ? { dim1Name: dim1 } : {}),
        ...(dim2 ? { dim2Name: dim2 } : {}),
      },
      orderBy: [{ date: 'asc' }, { dim1Name: 'asc' }, { dim2Name: 'asc' }],
      select: {
        id: true,
        date: true,
        typeOfMeal: true,
        dim1Name: true,
        dim1Value: true,
        dim2Name: true,
        dim2Value: true,
        userCount: true,
        mealCount: true,
        avgCalories: true,
        avgProteins: true,
        avgFat: true,
        avgCarbs: true,
        avgFiber: true,
        avgSodium: true,
        avgSugar: true,
        avgSaturatedFat: true,
        p25Calories: true,
        p50Calories: true,
        p75Calories: true,
      },
    });
  }

  getPublishedCrossDimClassification(
    from?: Date,
    to?: Date,
    typeOfMeal?: string,
    dim1?: DemographicDimension,
    dim2?: DemographicDimension,
  ) {
    const batchFilter = this.publishedBatchFilter(from, to);

    return this.prisma.mealLogAnalyticsCrossDimClassification.findMany({
      where: {
        batch: batchFilter,
        ...(typeOfMeal
          ? { typeOfMeal: typeOfMeal as Prisma.EnumTypeOfMealFilter }
          : {}),
        ...(dim1 ? { dim1Name: dim1 } : {}),
        ...(dim2 ? { dim2Name: dim2 } : {}),
      },
      orderBy: [{ date: 'asc' }, { dim1Name: 'asc' }, { dim2Name: 'asc' }],
      select: {
        id: true,
        date: true,
        typeOfMeal: true,
        dim1Name: true,
        dim1Value: true,
        dim2Name: true,
        dim2Value: true,
        userCount: true,
        totalMeals: true,
        vegetarianCount: true,
        vegetarianPct: true,
        veganCount: true,
        veganPct: true,
        avgUltraProcessedPct: true,
        p25UltraProcessedPct: true,
        p50UltraProcessedPct: true,
        p75UltraProcessedPct: true,
        novaDistribution: true,
      },
    });
  }

  getPublishedCrossDimPatterns(
    from?: Date,
    to?: Date,
    typeOfMeal?: string,
    dim1?: DemographicDimension,
    dim2?: DemographicDimension,
  ) {
    const batchFilter = this.publishedBatchFilter(from, to);

    return this.prisma.mealLogAnalyticsCrossDimPatterns.findMany({
      where: {
        batch: batchFilter,
        ...(typeOfMeal
          ? { typeOfMeal: typeOfMeal as Prisma.EnumTypeOfMealFilter }
          : {}),
        ...(dim1 ? { dim1Name: dim1 } : {}),
        ...(dim2 ? { dim2Name: dim2 } : {}),
      },
      orderBy: [{ date: 'asc' }, { dim1Name: 'asc' }, { dim2Name: 'asc' }],
      select: {
        id: true,
        date: true,
        typeOfMeal: true,
        dim1Name: true,
        dim1Value: true,
        dim2Name: true,
        dim2Value: true,
        userCount: true,
        totalMeals: true,
        mealsFromPantryCount: true,
        mealsFromPantryPct: true,
        mealsEatenOutCount: true,
        mealsEatenOutPct: true,
        avgItemsPerMeal: true,
        avgMealHour: true,
        mealHourStdDev: true,
      },
    });
  }

  // ============================================================
  // Demographic breakdown public queries
  // ============================================================

  getPublishedDemographicNutrition(
    from?: Date,
    to?: Date,
    typeOfMeal?: string,
    dimension?: DemographicDimension,
  ) {
    const batchFilter = this.publishedBatchFilter(from, to);

    return this.prisma.mealLogAnalyticsDemographicNutrition.findMany({
      where: {
        batch: batchFilter,
        ...(typeOfMeal
          ? { typeOfMeal: typeOfMeal as Prisma.EnumTypeOfMealFilter }
          : {}),
        ...(dimension ? { dimensionName: dimension } : {}),
      },
      orderBy: [
        { date: 'asc' },
        { typeOfMeal: 'asc' },
        { dimensionName: 'asc' },
      ],
      select: {
        id: true,
        date: true,
        typeOfMeal: true,
        dimensionName: true,
        dimensionValue: true,
        userCount: true,
        mealCount: true,
        avgCalories: true,
        avgProteins: true,
        avgFat: true,
        avgCarbs: true,
        avgFiber: true,
        avgSodium: true,
        avgSugar: true,
        avgSaturatedFat: true,
        p25Calories: true,
        p50Calories: true,
        p75Calories: true,
      },
    });
  }

  getPublishedDemographicClassification(
    from?: Date,
    to?: Date,
    typeOfMeal?: string,
    dimension?: DemographicDimension,
  ) {
    const batchFilter = this.publishedBatchFilter(from, to);

    return this.prisma.mealLogAnalyticsDemographicClassification.findMany({
      where: {
        batch: batchFilter,
        ...(typeOfMeal
          ? { typeOfMeal: typeOfMeal as Prisma.EnumTypeOfMealFilter }
          : {}),
        ...(dimension ? { dimensionName: dimension } : {}),
      },
      orderBy: [
        { date: 'asc' },
        { typeOfMeal: 'asc' },
        { dimensionName: 'asc' },
      ],
      select: {
        id: true,
        date: true,
        typeOfMeal: true,
        dimensionName: true,
        dimensionValue: true,
        userCount: true,
        totalMeals: true,
        vegetarianCount: true,
        vegetarianPct: true,
        veganCount: true,
        veganPct: true,
        avgUltraProcessedPct: true,
        p25UltraProcessedPct: true,
        p50UltraProcessedPct: true,
        p75UltraProcessedPct: true,
        novaDistribution: true,
      },
    });
  }

  getPublishedDemographicPatterns(
    from?: Date,
    to?: Date,
    typeOfMeal?: string,
    dimension?: DemographicDimension,
  ) {
    const batchFilter = this.publishedBatchFilter(from, to);

    return this.prisma.mealLogAnalyticsDemographicPatterns.findMany({
      where: {
        batch: batchFilter,
        ...(typeOfMeal
          ? { typeOfMeal: typeOfMeal as Prisma.EnumTypeOfMealFilter }
          : {}),
        ...(dimension ? { dimensionName: dimension } : {}),
      },
      orderBy: [
        { date: 'asc' },
        { typeOfMeal: 'asc' },
        { dimensionName: 'asc' },
      ],
      select: {
        id: true,
        date: true,
        typeOfMeal: true,
        dimensionName: true,
        dimensionValue: true,
        userCount: true,
        totalMeals: true,
        mealsFromPantryCount: true,
        mealsFromPantryPct: true,
        mealsEatenOutCount: true,
        mealsEatenOutPct: true,
        avgItemsPerMeal: true,
        avgMealHour: true,
        mealHourStdDev: true,
      },
    });
  }
}
