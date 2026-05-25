import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
  ParseEnumPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ShoppingListAnalyticsService } from '../services/shopping-list-analytics.service';
import { ShoppingListAnalyticsBatchStatus } from '@prisma/client';
import {
  DemographicDimension,
  DemographicDimensionEnum,
} from '../../common/demographic-dimensions';
import { parseLimit, parseDate } from '../../common/analytics-utils';
import { DataBaseAuthGuard } from '../../../common/guards/database-auth.guards';
import { Public, Roles } from 'nest-keycloak-connect';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Analytics - Shopping List')
@Controller('analytics/shopping-list')
export class ShoppingListAnalyticsController {
  constructor(
    private readonly analyticsService: ShoppingListAnalyticsService,
  ) {}

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
  @Get('public/category-popularity')
  @ApiOperation({
    summary: 'Most commonly planned food categories',
    description:
      'Food categories (e.g. "Dairy", "Vegetables") ranked by how often items from them appear ' +
      'in shopping lists. Only categories added by ≥5 unique users are shown (k-anonymity).',
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
  @Get('public/nutrition-profile')
  @ApiOperation({
    summary: 'Average nutritional density of planned shopping items',
    description:
      'Daily averages of key nutritional values per 100 g across all items added to shopping lists. ' +
      'k-anonymity (k≥5) enforced.',
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
  @ApiResponse({ status: 200, description: 'Nutrition profile aggregates' })
  getPublicNutritionProfile(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getPublishedNutritionProfile(
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
  @Get('public/food-groups')
  @ApiOperation({
    summary: 'Food group distribution in shopping lists',
    description:
      'Which food groups (e.g. "Potatoes and tubers", "Meat") dominate shopping lists, ' +
      'including average quantities and predominant units. k-anonymity (k≥5) enforced.',
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
    @Query(
      'dimension',
      new ParseEnumPipe(DemographicDimensionEnum, { optional: true }),
    )
    dimension?: DemographicDimension,
  ) {
    return this.analyticsService.getPublishedDemographicPatterns(
      parseDate(from, 'from'),
      parseDate(to, 'to'),
      dimension,
    );
  }

  @Public()
  @Get('public/demographic/nutrition')
  @ApiOperation({
    summary: 'Demographic breakdown of shopping list nutrition profile',
    description:
      'Average nutritional density per 100 g segmented by one demographic dimension. ' +
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
    name: 'dimension',
    required: false,
    enum: ['ageGroup', 'gender', 'educationLevel', 'region', 'country'],
    description: 'Filter to a single demographic axis',
  })
  @ApiResponse({
    status: 200,
    description: 'Demographic nutrition profile aggregates',
  })
  getPublicDemographicNutrition(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query(
      'dimension',
      new ParseEnumPipe(DemographicDimensionEnum, { optional: true }),
    )
    dimension?: DemographicDimension,
  ) {
    return this.analyticsService.getPublishedDemographicNutrition(
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
    description: 'Cross-dimensional list pattern aggregates (k≥20)',
  })
  getPublicCrossDimPatterns(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query(
      'dim1',
      new ParseEnumPipe(DemographicDimensionEnum, { optional: true }),
    )
    dim1?: DemographicDimension,
    @Query(
      'dim2',
      new ParseEnumPipe(DemographicDimensionEnum, { optional: true }),
    )
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
  @Get('public/cross-dim/nutrition')
  @ApiOperation({
    summary:
      'Cross-dimensional nutrition profile (two demographic dimensions combined)',
    description:
      'Average nutritional density per 100 g where two demographic dimensions are active simultaneously. ' +
      'Stricter k-anonymity (k≥20) enforced.',
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
  })
  @ApiQuery({
    name: 'dim2',
    required: false,
    enum: ['ageGroup', 'country', 'educationLevel', 'gender', 'region'],
  })
  @ApiResponse({
    status: 200,
    description: 'Cross-dimensional nutrition aggregates (k≥20)',
  })
  getPublicCrossDimNutrition(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query(
      'dim1',
      new ParseEnumPipe(DemographicDimensionEnum, { optional: true }),
    )
    dim1?: DemographicDimension,
    @Query(
      'dim2',
      new ParseEnumPipe(DemographicDimensionEnum, { optional: true }),
    )
    dim2?: DemographicDimension,
  ) {
    return this.analyticsService.getPublishedCrossDimNutrition(
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

  @Public()
  @Get('public/demographic/classification')
  @ApiOperation({
    summary: 'Demographic breakdown of shopping list item classification',
    description:
      'Vegetarian/vegan/ultra-processed/NOVA breakdown of food_product items segmented by one ' +
      'demographic dimension. Each row has exactly one non-null dimension field. k-anonymity (k≥5) enforced.',
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
    @Query(
      'dimension',
      new ParseEnumPipe(DemographicDimensionEnum, { optional: true }),
    )
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
    @Query(
      'dim1',
      new ParseEnumPipe(DemographicDimensionEnum, { optional: true }),
    )
    dim1?: DemographicDimension,
    @Query(
      'dim2',
      new ParseEnumPipe(DemographicDimensionEnum, { optional: true }),
    )
    dim2?: DemographicDimension,
  ) {
    return this.analyticsService.getPublishedCrossDimClassification(
      parseDate(from, 'from'),
      parseDate(to, 'to'),
      dim1,
      dim2,
    );
  }

  // ============================================================
  // Admin Endpoints — requires auth + admin role
  // ============================================================

  @Post('batches/generate')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles('admin')
  @ApiOperation({
    summary: 'Manually trigger shopping list analytics aggregation',
  })
  @ApiQuery({
    name: 'periodStart',
    required: true,
    type: String,
    example: '2026-02-18',
  })
  @ApiQuery({
    name: 'periodEnd',
    required: true,
    type: String,
    example: '2026-02-25',
  })
  @ApiResponse({ status: 201, description: 'Batch ID' })
  async generateBatch(
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string,
  ) {
    if (!periodStart || !periodEnd) {
      throw new BadRequestException('periodStart and periodEnd are required');
    }
    const batchId = await this.analyticsService.generateBatch(
      parseDate(periodStart, 'periodStart')!,
      parseDate(periodEnd, 'periodEnd')!,
    );
    return { batchId };
  }

  @Post('batches/run-daily')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles('admin')
  @ApiOperation({
    summary: 'Manually trigger the daily aggregation job (yesterday)',
  })
  @ApiResponse({ status: 201, description: 'Batch ID for yesterday' })
  async runDaily() {
    const batchId = await this.analyticsService.runDailyAggregation();
    return { batchId };
  }

  @Get('batches')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles('admin')
  @ApiOperation({ summary: 'List all shopping list analytics batches' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ShoppingListAnalyticsBatchStatus,
  })
  @ApiResponse({ status: 200, description: 'List of batches' })
  async listBatches(
    @Query(
      'status',
      new ParseEnumPipe(ShoppingListAnalyticsBatchStatus, { optional: true }),
    )
    status?: ShoppingListAnalyticsBatchStatus,
  ) {
    return this.analyticsService.listBatches(status);
  }

  @Get('batches/:id')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles('admin')
  @ApiOperation({
    summary: 'Get batch details with all aggregated data for review',
  })
  @ApiParam({ name: 'id', description: 'Batch UUID' })
  @ApiResponse({ status: 200, description: 'Batch with aggregated data' })
  async getBatch(@Param('id', ParseUUIDPipe) id: string) {
    return this.analyticsService.getBatch(id);
  }

  @Patch('batches/:id/approve')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles('admin')
  @ApiOperation({ summary: 'Approve a staging batch for publication' })
  @ApiParam({ name: 'id', description: 'Batch UUID' })
  @ApiResponse({ status: 200, description: 'Batch approved' })
  async approveBatch(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.analyticsService.approveBatch(id, adminUserId);
  }

  @Patch('batches/:id/publish')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles('admin')
  @ApiOperation({ summary: 'Publish an approved batch (makes data public)' })
  @ApiParam({ name: 'id', description: 'Batch UUID' })
  @ApiResponse({ status: 200, description: 'Batch published' })
  async publishBatch(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.analyticsService.publishBatch(id, adminUserId);
  }

  @Patch('batches/:id/reject')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles('admin')
  @ApiOperation({ summary: 'Reject a staging batch' })
  @ApiParam({ name: 'id', description: 'Batch UUID' })
  @ApiResponse({ status: 200, description: 'Batch rejected' })
  async rejectBatch(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminUserId: string,
    @Body('reason') reason: string,
  ) {
    return this.analyticsService.rejectBatch(id, adminUserId, reason);
  }

  @Delete('batches/:id')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a staging or rejected batch' })
  @ApiParam({ name: 'id', description: 'Batch UUID' })
  @ApiResponse({ status: 204, description: 'Batch deleted' })
  async deleteBatch(@Param('id', ParseUUIDPipe) id: string) {
    await this.analyticsService.deleteBatch(id);
  }
}
