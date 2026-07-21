import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ShoppingListAnalyticsService } from '../services/shopping-list-analytics.service';
import { ShoppingListAnalyticsBatch } from '@prisma/client';
import {
  DemographicDimension,
  parseLimit,
  parseDate,
} from '../../common/analytics-utils';
import { Public } from 'nest-keycloak-connect';
import { BaseAnalyticsAdminController } from '../../common/base-analytics-admin.controller';
import { DimQuery } from '../../common/decorators/dim-query.decorator';
import { DateRangeQuery } from '../../common/decorators/date-range-query.decorator';

@ApiTags('Analytics - Shopping List')
@Controller('analytics/shopping-list')
export class ShoppingListAnalyticsController extends BaseAnalyticsAdminController<ShoppingListAnalyticsBatch> {
  constructor(
    protected readonly analyticsService: ShoppingListAnalyticsService,
  ) {
    super();
  }

  // ============================================================
  // Public Endpoints — no auth required
  // ============================================================

  @Public()
  @Get('public/item-popularity')
  @ApiOperation({
    summary: 'Most commonly added individual food items',
    description:
      'Items ranked by frequency of addition to shopping lists. ' +
      'Only items added by ≥5 unique users are shown (k-anonymity).',
  })
  @DateRangeQuery()
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Item popularity rankings' })
  getPublicItemPopularity(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.analyticsService.getPublishedItemPopularity(
      parseDate(from, 'from'),
      parseDate(to, 'to'),
      parseLimit(limit),
    );
  }

  @Public()
  @Get('public/popularity')
  @ApiOperation({
    summary: 'Unified popularity metrics for shopping list analytics',
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
  @Get('public/category-popularity')
  @ApiOperation({
    summary: 'Most commonly planned food categories',
    description:
      'Food categories (e.g. "Dairy", "Vegetables") ranked by how often items from them appear ' +
      'in shopping lists. Only categories added by ≥5 unique users are shown (k-anonymity).',
  })
  @DateRangeQuery()
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Category popularity rankings' })
  getPublicCategoryPopularity(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.analyticsService.getPublishedCategoryPopularity(
      parseDate(from, 'from'),
      parseDate(to, 'to'),
      parseLimit(limit),
    );
  }

  @Public()
  @Get('public/list-patterns')
  @ApiOperation({
    summary: 'Shopping list behaviour patterns over time',
    description:
      'Daily aggregates of list structure: average items per list, lists per user, ' +
      'and split between food-product vs. generic-food items. k-anonymity (k≥5) enforced.',
  })
  @DateRangeQuery()
  @ApiResponse({ status: 200, description: 'List pattern aggregates' })
  getPublicListPatterns(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getPublishedListPatterns(
      parseDate(from, 'from'),
      parseDate(to, 'to'),
    );
  }

  @Public()
  @Get('public/patterns')
  @ApiOperation({
    summary: 'Unified behavior patterns for shopping list analytics',
  })
  @DateRangeQuery()
  @ApiResponse({ status: 200, description: 'Unified pattern aggregates' })
  getPublicPatterns(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analyticsService.getPublishedPatterns(
      parseDate(from, 'from'),
      parseDate(to, 'to'),
    );
  }

  @Public()
  @Get('public/sustainability')
  @ApiOperation({
    summary: 'Sustainability & health quality of planned baskets',
    description:
      'Daily aggregates of eco-score, nutri-score, NOVA distribution, carbon footprint, ' +
      'vegetarian/vegan item %, and ultra-processed item % across shopping list items. ' +
      'Applies to food-product items only (scores unavailable for generic foods). ' +
      'k-anonymity (k≥5) enforced.',
  })
  @DateRangeQuery()
  @ApiResponse({ status: 200, description: 'Sustainability aggregates' })
  getPublicSustainability(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getPublishedSustainability(
      parseDate(from, 'from'),
      parseDate(to, 'to'),
    );
  }

  @Public()
  @Get('public/classification')
  @ApiOperation({
    summary: 'Unified classification metrics for shopping list analytics',
  })
  @DateRangeQuery()
  @ApiResponse({
    status: 200,
    description: 'Unified classification aggregates',
  })
  getPublicClassification(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getPublishedClassification(
      parseDate(from, 'from'),
      parseDate(to, 'to'),
    );
  }

  @Public()
  @Get('public/food-groups')
  @ApiOperation({
    summary: 'Food group distribution in shopping lists',
    description:
      'Which food groups (e.g. "Potatoes and tubers", "Meat") dominate shopping lists, ' +
      'including average quantities and predominant units. k-anonymity (k≥5) enforced.',
  })
  @DateRangeQuery()
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Food group distribution' })
  getPublicFoodGroups(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.analyticsService.getPublishedFoodGroups(
      parseDate(from, 'from'),
      parseDate(to, 'to'),
      parseLimit(limit),
    );
  }

  @Public()
  @Get('public/demographic/patterns')
  @ApiOperation({
    summary: 'Demographic breakdown of shopping list patterns',
    description:
      'List behaviour patterns (items/list, lists/user, item type split) segmented by one demographic dimension. ' +
      'Each row has exactly one non-null dimension field. k-anonymity (k≥5) enforced.',
  })
  @DateRangeQuery()
  @ApiQuery({
    name: 'dimension',
    required: false,
    enum: ['ageGroup', 'gender', 'educationLevel', 'region', 'country'],
    description: 'Filter to a single demographic axis',
  })
  @ApiResponse({
    status: 200,
    description: 'Demographic list pattern aggregates',
  })
  getPublicDemographicPatterns(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @DimQuery('dimension')
    dimension?: DemographicDimension,
  ) {
    return this.analyticsService.getPublishedDemographicPatterns(
      parseDate(from, 'from'),
      parseDate(to, 'to'),
      dimension,
    );
  }

  @Public()
  @Get('public/cross-dim/patterns')
  @ApiOperation({
    summary:
      'Cross-dimensional shopping list patterns (two demographic dimensions combined)',
    description:
      'List behaviour patterns where two demographic dimensions are active simultaneously ' +
      '(e.g. ageGroup=25_34 AND gender=FEMALE). dim1Name < dim2Name alphabetically. ' +
      'Stricter k-anonymity (k≥20) enforced.',
  })
  @DateRangeQuery()
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
    description: 'Cross-dimensional list pattern aggregates (k≥20)',
  })
  getPublicCrossDimPatterns(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @DimQuery('dim1')
    dim1?: DemographicDimension,
    @DimQuery('dim2')
    dim2?: DemographicDimension,
  ) {
    return this.analyticsService.getPublishedCrossDimPatterns(
      parseDate(from, 'from'),
      parseDate(to, 'to'),
      dim1,
      dim2,
    );
  }

  @Public()
  @Get('public/summary')
  @ApiOperation({
    summary: 'High-level summary across all shopping list analytics dimensions',
    description:
      'Includes aggregate KPI counts (`uniqueItemsTracked`, `categoryCount`, `foodGroupCount`) ' +
      'computed from the full filtered published dataset (not affected by popularity pagination limits).',
  })
  @DateRangeQuery()
  @ApiResponse({
    status: 200,
    description:
      'Summary across all dimensions, including backend-computed shopping-list KPI counts',
  })
  async getPublicSummary(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getPublishedSummary(
      parseDate(from, 'from'),
      parseDate(to, 'to'),
    );
  }

  @Public()
  @Get('public/demographic/classification')
  @ApiOperation({
    summary: 'Demographic breakdown of shopping list item classification',
    description:
      'Vegetarian/vegan/ultra-processed/NOVA breakdown of food_product items segmented by one ' +
      'demographic dimension. Each row has exactly one non-null dimension field. k-anonymity (k≥5) enforced.',
  })
  @DateRangeQuery()
  @ApiQuery({
    name: 'dimension',
    required: false,
    enum: ['ageGroup', 'gender', 'educationLevel', 'region', 'country'],
    description: 'Filter to a single demographic axis',
  })
  @ApiResponse({
    status: 200,
    description: 'Demographic classification aggregates',
  })
  getPublicDemographicClassification(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @DimQuery('dimension')
    dimension?: DemographicDimension,
  ) {
    return this.analyticsService.getPublishedDemographicClassification(
      parseDate(from, 'from'),
      parseDate(to, 'to'),
      dimension,
    );
  }

  @Public()
  @Get('public/cross-dim/classification')
  @ApiOperation({
    summary:
      'Cross-dimensional shopping list item classification (two demographic dimensions combined)',
    description:
      'Vegetarian/vegan/ultra-processed/NOVA breakdown where two demographic dimensions are active ' +
      'simultaneously. dim1Name < dim2Name alphabetically. Stricter k-anonymity (k≥20) enforced.',
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
    description: 'Cross-dimensional classification aggregates (k≥20)',
  })
  getPublicCrossDimClassification(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @DimQuery('dim1')
    dim1?: DemographicDimension,
    @DimQuery('dim2')
    dim2?: DemographicDimension,
  ) {
    return this.analyticsService.getPublishedCrossDimClassification(
      parseDate(from, 'from'),
      parseDate(to, 'to'),
      dim1,
      dim2,
    );
  }
}
