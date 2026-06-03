import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { MealLogAnalyticsService } from '../services/meal-log-analytics.service';
import { MealLogAnalyticsBatch } from '@prisma/client';
import {
  DemographicDimension,
  parseLimit,
  parseDate,
} from '../../common/analytics-utils';
import { Public } from 'nest-keycloak-connect';
import { BaseAnalyticsAdminController } from '../../common/base-analytics-admin.controller';
import { DimQuery } from '../../common/decorators/dim-query.decorator';
import { DateRangeQuery } from '../../common/decorators/date-range-query.decorator';

@ApiTags('analytics-meal-log')
@Controller('analytics/meal-log')
export class MealLogAnalyticsController extends BaseAnalyticsAdminController<MealLogAnalyticsBatch> {
  constructor(protected readonly analyticsService: MealLogAnalyticsService) {
    super();
  }

  // ============================================================
  // Public Endpoints — no auth required
  // ============================================================

  @Public()
  @Get('public/nutrition')
  @ApiOperation({
    summary: 'Daily nutrition averages (calories, protein, fat, etc.)',
    description:
      'Aggregated daily nutrition data with percentiles. Anonymized with k-anonymity (k≥5).',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    example: '2026-01-01',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    example: '2026-02-25',
  })
  @ApiQuery({
    name: 'typeOfMeal',
    required: false,
    enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'SPECIAL_DRINKS'],
  })
  @ApiResponse({ status: 200, description: 'Daily nutrition aggregates' })
  async getPublicNutrition(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('typeOfMeal') typeOfMeal?: string,
  ) {
    return this.analyticsService.getPublishedNutrition(
      parseDate(from, 'from'),
      parseDate(to, 'to'),
      typeOfMeal,
    );
  }

  @Public()
  @Get('public/food-popularity')
  @ApiOperation({
    summary: 'Most consumed foods and food categories',
    description: 'Ranked by frequency. Only foods consumed by ≥5 unique users.',
  })
  @DateRangeQuery()
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Food popularity rankings' })
  async getPublicFoodPopularity(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.analyticsService.getPublishedFoodPopularity(
      parseDate(from, 'from'),
      parseDate(to, 'to'),
      parseLimit(limit),
    );
  }

  @Public()
  @Get('public/popularity')
  @ApiOperation({
    summary: 'Unified popularity metrics for meal log analytics',
    description:
      'Unified contract endpoint with consistent itemName/itemGroup/itemType fields and metadata.',
  })
  @DateRangeQuery()
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Unified popularity rows' })
  getPublicPopularity(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.analyticsService.getPublishedPopularity(
      parseDate(from, 'from'),
      parseDate(to, 'to'),
      parseLimit(limit),
    );
  }

  @Public()
  @Get('public/patterns')
  @ApiOperation({
    summary: 'Meal behavior patterns (timing, pantry usage, items per meal)',
  })
  @DateRangeQuery()
  @ApiQuery({
    name: 'typeOfMeal',
    required: false,
    enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'SPECIAL_DRINKS'],
  })
  @ApiResponse({ status: 200, description: 'Meal pattern aggregates' })
  async getPublicMealPatterns(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('typeOfMeal') typeOfMeal?: string,
  ) {
    return this.analyticsService.getPublishedMealPatterns(
      parseDate(from, 'from'),
      parseDate(to, 'to'),
      typeOfMeal,
    );
  }

  @Public()
  @Get('public/sustainability')
  @ApiOperation({
    summary: 'Sustainability, carbon footprint & nutri/eco-score distributions',
  })
  @DateRangeQuery()
  @ApiQuery({
    name: 'typeOfMeal',
    required: false,
    enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'SPECIAL_DRINKS'],
  })
  @ApiResponse({ status: 200, description: 'Sustainability aggregates' })
  async getPublicSustainability(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('typeOfMeal') typeOfMeal?: string,
  ) {
    return this.analyticsService.getPublishedSustainability(
      parseDate(from, 'from'),
      parseDate(to, 'to'),
      typeOfMeal,
    );
  }

  @Public()
  @Get('public/classification')
  @ApiOperation({
    summary: 'Vegetarian/vegan rates, ultra-processed %, NOVA distribution',
  })
  @DateRangeQuery()
  @ApiQuery({
    name: 'typeOfMeal',
    required: false,
    enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'SPECIAL_DRINKS'],
  })
  @ApiResponse({ status: 200, description: 'Meal classification aggregates' })
  async getPublicMealClassification(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('typeOfMeal') typeOfMeal?: string,
  ) {
    return this.analyticsService.getPublishedMealClassification(
      parseDate(from, 'from'),
      parseDate(to, 'to'),
      typeOfMeal,
    );
  }

  @Public()
  @Get('public/records')
  @ApiOperation({
    summary:
      'Individual meal records — anonymized microdata (one row per meal log)',
  })
  @DateRangeQuery()
  @ApiQuery({
    name: 'typeOfMeal',
    required: false,
    enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'SPECIAL_DRINKS'],
  })
  @ApiResponse({ status: 200, description: 'Anonymized meal-level records' })
  async getPublicMealRecords(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('typeOfMeal') typeOfMeal?: string,
  ) {
    return this.analyticsService.getPublishedMealRecords(
      parseDate(from, 'from'),
      parseDate(to, 'to'),
      typeOfMeal,
    );
  }

  @Public()
  @Get('public/demographic/nutrition')
  @ApiOperation({
    summary: 'Demographic breakdown of daily nutrition averages',
    description:
      'Nutrition averages segmented by one demographic dimension (ageGroup, gender, educationLevel, or region). ' +
      'Each row has exactly one non-null dimension field. k-anonymity (k≥5) enforced.',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    example: '2026-01-01',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    example: '2026-02-25',
  })
  @ApiQuery({
    name: 'typeOfMeal',
    required: false,
    enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'SPECIAL_DRINKS'],
  })
  @ApiQuery({
    name: 'dimension',
    required: false,
    enum: ['ageGroup', 'gender', 'educationLevel', 'region', 'country'],
    description: 'Filter to a single demographic axis',
  })
  @ApiResponse({ status: 200, description: 'Demographic nutrition aggregates' })
  async getPublicDemographicNutrition(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('typeOfMeal') typeOfMeal?: string,
    @DimQuery('dimension')
    dimension?: DemographicDimension,
  ) {
    return this.analyticsService.getPublishedDemographicNutrition(
      parseDate(from, 'from'),
      parseDate(to, 'to'),
      typeOfMeal,
      dimension,
    );
  }

  @Public()
  @Get('public/demographic/classification')
  @ApiOperation({
    summary:
      'Demographic breakdown of meal classification (vegetarian/vegan/NOVA/ultra-processed)',
    description:
      'Classification metrics segmented by one demographic dimension. k-anonymity (k≥5) enforced.',
  })
  @DateRangeQuery()
  @ApiQuery({
    name: 'typeOfMeal',
    required: false,
    enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'SPECIAL_DRINKS'],
  })
  @ApiQuery({
    name: 'dimension',
    required: false,
    enum: ['ageGroup', 'gender', 'educationLevel', 'region', 'country'],
  })
  @ApiResponse({
    status: 200,
    description: 'Demographic classification aggregates',
  })
  async getPublicDemographicClassification(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('typeOfMeal') typeOfMeal?: string,
    @DimQuery('dimension')
    dimension?: DemographicDimension,
  ) {
    return this.analyticsService.getPublishedDemographicClassification(
      parseDate(from, 'from'),
      parseDate(to, 'to'),
      typeOfMeal,
      dimension,
    );
  }

  @Public()
  @Get('public/demographic/patterns')
  @ApiOperation({
    summary:
      'Demographic breakdown of meal patterns (pantry usage, timing, items per meal)',
    description:
      'Meal behavior patterns segmented by one demographic dimension. k-anonymity (k≥5) enforced.',
  })
  @DateRangeQuery()
  @ApiQuery({
    name: 'typeOfMeal',
    required: false,
    enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'SPECIAL_DRINKS'],
  })
  @ApiQuery({
    name: 'dimension',
    required: false,
    enum: ['ageGroup', 'gender', 'educationLevel', 'region', 'country'],
  })
  @ApiResponse({
    status: 200,
    description: 'Demographic meal pattern aggregates',
  })
  async getPublicDemographicPatterns(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('typeOfMeal') typeOfMeal?: string,
    @DimQuery('dimension')
    dimension?: DemographicDimension,
  ) {
    return this.analyticsService.getPublishedDemographicPatterns(
      parseDate(from, 'from'),
      parseDate(to, 'to'),
      typeOfMeal,
      dimension,
    );
  }

  @Public()
  @Get('public/cross-dim/nutrition')
  @ApiOperation({
    summary:
      'Cross-dimensional nutrition averages (two demographic dimensions combined)',
    description:
      'Nutrition averages where two demographic dimensions are active simultaneously (e.g. ageGroup=65_plus AND gender=MALE). ' +
      'Each row has dim1Name/dim1Value/dim2Name/dim2Value; dim1Name < dim2Name alphabetically. ' +
      'Stricter k-anonymity (k≥20) is enforced. ' +
      'Use ?dim1= and ?dim2= to filter to a specific dimension pair.',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    example: '2026-01-01',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    example: '2026-02-25',
  })
  @ApiQuery({
    name: 'typeOfMeal',
    required: false,
    enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'SPECIAL_DRINKS'],
  })
  @ApiQuery({
    name: 'dim1',
    required: false,
    enum: ['ageGroup', 'country', 'educationLevel', 'gender', 'region'],
    description: 'First dimension name (alphabetically earlier)',
  })
  @ApiQuery({
    name: 'dim2',
    required: false,
    enum: ['ageGroup', 'country', 'educationLevel', 'gender', 'region'],
    description: 'Second dimension name (alphabetically later)',
  })
  @ApiResponse({
    status: 200,
    description: 'Cross-dimensional nutrition aggregates (k≥20)',
  })
  async getPublicCrossDimNutrition(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('typeOfMeal') typeOfMeal?: string,
    @DimQuery('dim1')
    dim1?: DemographicDimension,
    @DimQuery('dim2')
    dim2?: DemographicDimension,
  ) {
    return this.analyticsService.getPublishedCrossDimNutrition(
      parseDate(from, 'from'),
      parseDate(to, 'to'),
      typeOfMeal,
      dim1,
      dim2,
    );
  }

  @Public()
  @Get('public/cross-dim/classification')
  @ApiOperation({
    summary:
      'Cross-dimensional meal classification (two demographic dimensions combined)',
    description:
      'Vegetarian/vegan rates, ultra-processed % and NOVA distribution for two demographic dimensions combined. ' +
      'Stricter k-anonymity (k≥20) is enforced.',
  })
  @DateRangeQuery()
  @ApiQuery({
    name: 'typeOfMeal',
    required: false,
    enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'SPECIAL_DRINKS'],
  })
  @ApiQuery({
    name: 'dim1',
    required: false,
    enum: ['ageGroup', 'country', 'educationLevel', 'gender', 'region'],
  })
  @ApiQuery({
    name: 'dim2',
    required: false,
    enum: ['ageGroup', 'country', 'educationLevel', 'gender', 'region'],
  })
  @ApiResponse({
    status: 200,
    description: 'Cross-dimensional classification aggregates (k≥20)',
  })
  async getPublicCrossDimClassification(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('typeOfMeal') typeOfMeal?: string,
    @DimQuery('dim1')
    dim1?: DemographicDimension,
    @DimQuery('dim2')
    dim2?: DemographicDimension,
  ) {
    return this.analyticsService.getPublishedCrossDimClassification(
      parseDate(from, 'from'),
      parseDate(to, 'to'),
      typeOfMeal,
      dim1,
      dim2,
    );
  }

  @Public()
  @Get('public/cross-dim/patterns')
  @ApiOperation({
    summary:
      'Cross-dimensional meal patterns (two demographic dimensions combined)',
    description:
      'Meal behavior patterns (pantry usage, eaten out, timing, items per meal) for two demographic dimensions combined. ' +
      'Stricter k-anonymity (k≥20) is enforced.',
  })
  @DateRangeQuery()
  @ApiQuery({
    name: 'typeOfMeal',
    required: false,
    enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'SPECIAL_DRINKS'],
  })
  @ApiQuery({
    name: 'dim1',
    required: false,
    enum: ['ageGroup', 'country', 'educationLevel', 'gender', 'region'],
  })
  @ApiQuery({
    name: 'dim2',
    required: false,
    enum: ['ageGroup', 'country', 'educationLevel', 'gender', 'region'],
  })
  @ApiResponse({
    status: 200,
    description: 'Cross-dimensional meal pattern aggregates (k≥20)',
  })
  async getPublicCrossDimPatterns(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('typeOfMeal') typeOfMeal?: string,
    @DimQuery('dim1')
    dim1?: DemographicDimension,
    @DimQuery('dim2')
    dim2?: DemographicDimension,
  ) {
    return this.analyticsService.getPublishedCrossDimPatterns(
      parseDate(from, 'from'),
      parseDate(to, 'to'),
      typeOfMeal,
      dim1,
      dim2,
    );
  }

  @Public()
  @Get('public/summary')
  @ApiOperation({
    summary: 'High-level summary across all dimensions',
  })
  @DateRangeQuery()
  @ApiResponse({ status: 200, description: 'Summary across all dimensions' })
  async getPublicSummary(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getPublishedSummary(
      parseDate(from, 'from'),
      parseDate(to, 'to'),
    );
  }
}
