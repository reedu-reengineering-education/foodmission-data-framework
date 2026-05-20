import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  MealLogAnalyticsBatch,
  MealLogAnalyticsBatchStatus,
  Prisma,
} from '@prisma/client';
import { DemographicDimension } from '../../common/demographic-dimensions';

@Injectable()
export class MealLogAnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createBatch(data: {
    periodStart: Date;
    periodEnd: Date;
    recordCount: number;
    metadata?: Prisma.InputJsonValue;
  }): Promise<MealLogAnalyticsBatch> {
    return this.prisma.mealLogAnalyticsBatch.create({ data });
  }

  async findBatchById(id: string) {
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

  async findBatches(status?: MealLogAnalyticsBatchStatus) {
    return this.prisma.mealLogAnalyticsBatch.findMany({
      where: status ? { status } : undefined,
      orderBy: { generatedAt: 'desc' },
    });
  }

  async updateBatchStatus(
    id: string,
    status: MealLogAnalyticsBatchStatus,
    userId?: string,
    reason?: string,
  ): Promise<MealLogAnalyticsBatch> {
    const data: Prisma.MealLogAnalyticsBatchUpdateInput = { status };

    if (status === MealLogAnalyticsBatchStatus.PUBLISHED) {
      data.publishedAt = new Date();
      data.publishedBy = userId;
    } else if (status === MealLogAnalyticsBatchStatus.REJECTED) {
      data.rejectedAt = new Date();
      data.rejectedBy = userId;
      data.rejectionReason = reason;
    }

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
  async supersedeBatchesForPeriod(from: Date, to: Date): Promise<void> {
    await this.prisma.mealLogAnalyticsBatch.updateMany({
      where: {
        status: MealLogAnalyticsBatchStatus.PUBLISHED,
        periodStart: { gte: from },
        periodEnd: { lte: to },
      },
      data: { status: MealLogAnalyticsBatchStatus.SUPERSEDED },
    });
  }

  // ============================================================
  // Bulk inserts for aggregated data
  // ============================================================

  async insertDailyNutrition(
    data: Prisma.MealLogAnalyticsDailyNutritionCreateManyInput[],
  ) {
    return this.prisma.mealLogAnalyticsDailyNutrition.createMany({ data });
  }

  async insertFoodPopularity(
    data: Prisma.MealLogAnalyticsFoodPopularityCreateManyInput[],
  ) {
    return this.prisma.mealLogAnalyticsFoodPopularity.createMany({ data });
  }

  async insertMealPatterns(
    data: Prisma.MealLogAnalyticsMealPatternsCreateManyInput[],
  ) {
    return this.prisma.mealLogAnalyticsMealPatterns.createMany({ data });
  }

  async insertSustainability(
    data: Prisma.MealLogAnalyticsSustainabilityCreateManyInput[],
  ) {
    return this.prisma.mealLogAnalyticsSustainability.createMany({ data });
  }

  async insertMealClassification(
    data: Prisma.MealLogAnalyticsMealClassificationCreateManyInput[],
  ) {
    return this.prisma.mealLogAnalyticsMealClassification.createMany({ data });
  }

  async insertMealRecords(
    data: Prisma.MealLogAnalyticsMealRecordCreateManyInput[],
  ) {
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
      status: MealLogAnalyticsBatchStatus.PUBLISHED,
    };
    if (from) {
      filter.periodStart = { gte: from };
    }
    if (to) {
      filter.periodEnd = { lte: to };
    }
    return filter;
  }

  async getPublishedNutrition(
    from?: Date,
    to?: Date,
    typeOfMeal?: string,
  ) {
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

  async getPublishedFoodPopularity(from?: Date, to?: Date, limit = 20) {
    const batchFilter = this.publishedBatchFilter(from, to);

    return this.prisma.mealLogAnalyticsFoodPopularity.findMany({
      where: { batch: batchFilter },
      orderBy: { frequency: 'desc' },
      take: limit,
      select: {
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

  async getPublishedMealPatterns(
    from?: Date,
    to?: Date,
    typeOfMeal?: string,
  ) {
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

  async getPublishedSustainability(
    from?: Date,
    to?: Date,
    typeOfMeal?: string,
  ) {
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

  async getPublishedMealClassification(
    from?: Date,
    to?: Date,
    typeOfMeal?: string,
  ) {
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

  async getPublishedMealRecords(
    from?: Date,
    to?: Date,
    typeOfMeal?: string,
  ) {
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

  async insertDemographicNutrition(
    data: Prisma.MealLogAnalyticsDemographicNutritionCreateManyInput[],
  ) {
    return this.prisma.mealLogAnalyticsDemographicNutrition.createMany({ data });
  }

  async insertDemographicClassification(
    data: Prisma.MealLogAnalyticsDemographicClassificationCreateManyInput[],
  ) {
    return this.prisma.mealLogAnalyticsDemographicClassification.createMany({ data });
  }

  async insertDemographicPatterns(
    data: Prisma.MealLogAnalyticsDemographicPatternsCreateManyInput[],
  ) {
    return this.prisma.mealLogAnalyticsDemographicPatterns.createMany({ data });
  }

  // ============================================================
  // Cross-dimensional inserts (K=20)
  // ============================================================

  async insertCrossDimNutrition(
    data: Prisma.MealLogAnalyticsCrossDimNutritionCreateManyInput[],
  ) {
    return this.prisma.mealLogAnalyticsCrossDimNutrition.createMany({ data });
  }

  async insertCrossDimClassification(
    data: Prisma.MealLogAnalyticsCrossDimClassificationCreateManyInput[],
  ) {
    return this.prisma.mealLogAnalyticsCrossDimClassification.createMany({ data });
  }

  async insertCrossDimPatterns(
    data: Prisma.MealLogAnalyticsCrossDimPatternsCreateManyInput[],
  ) {
    return this.prisma.mealLogAnalyticsCrossDimPatterns.createMany({ data });
  }

  // ============================================================
  // Cross-dimensional public queries
  // ============================================================

  async getPublishedCrossDimNutrition(
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

  async getPublishedCrossDimClassification(
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

  async getPublishedCrossDimPatterns(
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

  async getPublishedDemographicNutrition(
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
        ...(dimension ? { [dimension]: { not: null } } : {}),
      },
      orderBy: [{ date: 'asc' }, { typeOfMeal: 'asc' }],
      select: {
        date: true,
        typeOfMeal: true,
        ageGroup: true,
        gender: true,
        educationLevel: true,
        region: true,
        country: true,
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

  async getPublishedDemographicClassification(
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
        ...(dimension ? { [dimension]: { not: null } } : {}),
      },
      orderBy: [{ date: 'asc' }, { typeOfMeal: 'asc' }],
      select: {
        date: true,
        typeOfMeal: true,
        ageGroup: true,
        gender: true,
        educationLevel: true,
        region: true,
        country: true,
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

  async getPublishedDemographicPatterns(
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
        ...(dimension ? { [dimension]: { not: null } } : {}),
      },
      orderBy: [{ date: 'asc' }, { typeOfMeal: 'asc' }],
      select: {
        date: true,
        typeOfMeal: true,
        ageGroup: true,
        gender: true,
        educationLevel: true,
        region: true,
        country: true,
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
