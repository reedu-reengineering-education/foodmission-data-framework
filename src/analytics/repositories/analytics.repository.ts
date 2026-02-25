import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  AnalyticsBatch,
  AnalyticsBatchStatus,
  Prisma,
} from '@prisma/client';
import { DemographicDimension } from '../services/analytics-aggregator.service';

@Injectable()
export class AnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createBatch(data: {
    periodStart: Date;
    periodEnd: Date;
    recordCount: number;
    metadata?: Prisma.InputJsonValue;
  }): Promise<AnalyticsBatch> {
    return this.prisma.analyticsBatch.create({ data });
  }

  async findBatchById(id: string) {
    return this.prisma.analyticsBatch.findUnique({
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

  async findBatches(status?: AnalyticsBatchStatus) {
    return this.prisma.analyticsBatch.findMany({
      where: status ? { status } : undefined,
      orderBy: { generatedAt: 'desc' },
    });
  }

  async updateBatchStatus(
    id: string,
    status: AnalyticsBatchStatus,
    userId?: string,
    reason?: string,
  ): Promise<AnalyticsBatch> {
    const data: Prisma.AnalyticsBatchUpdateInput = { status };

    if (status === AnalyticsBatchStatus.PUBLISHED) {
      data.publishedAt = new Date();
      data.publishedBy = userId;
    } else if (status === AnalyticsBatchStatus.REJECTED) {
      data.rejectedAt = new Date();
      data.rejectedBy = userId;
      data.rejectionReason = reason;
    }

    return this.prisma.analyticsBatch.update({ where: { id }, data });
  }

  async deleteBatch(id: string): Promise<void> {
    await this.prisma.analyticsBatch.delete({ where: { id } });
  }

  // ============================================================
  // Bulk inserts for aggregated data
  // ============================================================

  async insertDailyNutrition(
    data: Prisma.AnalyticsDailyNutritionCreateManyInput[],
  ) {
    return this.prisma.analyticsDailyNutrition.createMany({ data });
  }

  async insertFoodPopularity(
    data: Prisma.AnalyticsFoodPopularityCreateManyInput[],
  ) {
    return this.prisma.analyticsFoodPopularity.createMany({ data });
  }

  async insertMealPatterns(
    data: Prisma.AnalyticsMealPatternsCreateManyInput[],
  ) {
    return this.prisma.analyticsMealPatterns.createMany({ data });
  }

  async insertSustainability(
    data: Prisma.AnalyticsSustainabilityCreateManyInput[],
  ) {
    return this.prisma.analyticsSustainability.createMany({ data });
  }

  async insertMealClassification(
    data: Prisma.AnalyticsMealClassificationCreateManyInput[],
  ) {
    return this.prisma.analyticsMealClassification.createMany({ data });
  }

  async insertMealRecords(
    data: Prisma.AnalyticsMealRecordCreateManyInput[],
  ) {
    return this.prisma.analyticsMealRecord.createMany({ data });
  }

  // ============================================================
  // Per-dimension published data queries
  // ============================================================

  private publishedBatchFilter(
    from?: Date,
    to?: Date,
  ): Prisma.AnalyticsBatchWhereInput {
    const filter: Prisma.AnalyticsBatchWhereInput = {
      status: AnalyticsBatchStatus.PUBLISHED,
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

    return this.prisma.analyticsDailyNutrition.findMany({
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

    return this.prisma.analyticsFoodPopularity.findMany({
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

    return this.prisma.analyticsMealPatterns.findMany({
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

    return this.prisma.analyticsSustainability.findMany({
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

    return this.prisma.analyticsMealClassification.findMany({
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

    return this.prisma.analyticsMealRecord.findMany({
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
    data: Prisma.AnalyticsDemographicNutritionCreateManyInput[],
  ) {
    return this.prisma.analyticsDemographicNutrition.createMany({ data });
  }

  async insertDemographicClassification(
    data: Prisma.AnalyticsDemographicClassificationCreateManyInput[],
  ) {
    return this.prisma.analyticsDemographicClassification.createMany({ data });
  }

  async insertDemographicPatterns(
    data: Prisma.AnalyticsDemographicPatternsCreateManyInput[],
  ) {
    return this.prisma.analyticsDemographicPatterns.createMany({ data });
  }

  // ============================================================
  // Cross-dimensional inserts (K=20)
  // ============================================================

  async insertCrossDimNutrition(
    data: Prisma.AnalyticsCrossDimNutritionCreateManyInput[],
  ) {
    return this.prisma.analyticsCrossDimNutrition.createMany({ data });
  }

  async insertCrossDimClassification(
    data: Prisma.AnalyticsCrossDimClassificationCreateManyInput[],
  ) {
    return this.prisma.analyticsCrossDimClassification.createMany({ data });
  }

  async insertCrossDimPatterns(
    data: Prisma.AnalyticsCrossDimPatternsCreateManyInput[],
  ) {
    return this.prisma.analyticsCrossDimPatterns.createMany({ data });
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

    return this.prisma.analyticsCrossDimNutrition.findMany({
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

    return this.prisma.analyticsCrossDimClassification.findMany({
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

    return this.prisma.analyticsCrossDimPatterns.findMany({
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

    return this.prisma.analyticsDemographicNutrition.findMany({
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

    return this.prisma.analyticsDemographicClassification.findMany({
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

    return this.prisma.analyticsDemographicPatterns.findMany({
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
