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

const DEMOGRAPHIC_DIMENSIONS = [
  'ageGroup',
  'country',
  'educationLevel',
  'gender',
  'region',
] as const;
type DemographicDimensionParam = (typeof DEMOGRAPHIC_DIMENSIONS)[number];
import { DataBaseAuthGuard } from '../../../common/guards/database-auth.guards';
import { Public, Roles } from 'nest-keycloak-connect';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Analytics - Shopping List')
@Controller('analytics/shopping-list')
export class ShoppingListAnalyticsController {
  constructor(
    private readonly analyticsService: ShoppingListAnalyticsService,
  ) {}

  private parseDate(
    value: string | undefined,
    param: string,
  ): Date | undefined {
    if (value === undefined || value === '') return undefined;
    const d = new Date(value);
    if (isNaN(d.getTime())) {
      throw new BadRequestException(
        `Invalid date "${value}" for ${param}. Expected ISO 8601 format (e.g. 2026-01-01).`,
      );
    }
    return d;
  }

  private parseDimension(
    value: string | undefined,
  ): DemographicDimensionParam | undefined {
    if (value === undefined) return undefined;
    if (!DEMOGRAPHIC_DIMENSIONS.includes(value as DemographicDimensionParam)) {
      throw new BadRequestException(
        `Invalid dimension "${value}". Must be one of: ${DEMOGRAPHIC_DIMENSIONS.join(', ')}.`,
      );
    }
    return value as DemographicDimensionParam;
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
  async getPublicItemPopularity(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.analyticsService.getPublishedItemPopularity(
      this.parseDate(from, 'from'),
      this.parseDate(to, 'to'),
      limit ? parseInt(limit, 10) : 20,
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
  async getPublicCategoryPopularity(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.analyticsService.getPublishedCategoryPopularity(
      this.parseDate(from, 'from'),
      this.parseDate(to, 'to'),
      limit ? parseInt(limit, 10) : 20,
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
  async getPublicListPatterns(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getPublishedListPatterns(
      this.parseDate(from, 'from'),
      this.parseDate(to, 'to'),
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
  async getPublicNutritionProfile(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getPublishedNutritionProfile(
      this.parseDate(from, 'from'),
      this.parseDate(to, 'to'),
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
  async getPublicSustainability(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getPublishedSustainability(
      this.parseDate(from, 'from'),
      this.parseDate(to, 'to'),
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
  async getPublicFoodGroups(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.analyticsService.getPublishedFoodGroups(
      this.parseDate(from, 'from'),
      this.parseDate(to, 'to'),
      limit ? parseInt(limit, 10) : 20,
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
  async getPublicDemographicPatterns(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('dimension') dimension?: string,
  ) {
    return this.analyticsService.getPublishedDemographicPatterns(
      this.parseDate(from, 'from'),
      this.parseDate(to, 'to'),
      this.parseDimension(dimension),
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
  async getPublicDemographicNutrition(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('dimension') dimension?: string,
  ) {
    return this.analyticsService.getPublishedDemographicNutrition(
      this.parseDate(from, 'from'),
      this.parseDate(to, 'to'),
      this.parseDimension(dimension),
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
  async getPublicCrossDimPatterns(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('dim1') dim1?: string,
    @Query('dim2') dim2?: string,
  ) {
    return this.analyticsService.getPublishedCrossDimPatterns(
      this.parseDate(from, 'from'),
      this.parseDate(to, 'to'),
      this.parseDimension(dim1),
      this.parseDimension(dim2),
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
  async getPublicCrossDimNutrition(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('dim1') dim1?: string,
    @Query('dim2') dim2?: string,
  ) {
    return this.analyticsService.getPublishedCrossDimNutrition(
      this.parseDate(from, 'from'),
      this.parseDate(to, 'to'),
      this.parseDimension(dim1),
      this.parseDimension(dim2),
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
      this.parseDate(from, 'from'),
      this.parseDate(to, 'to'),
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
      this.parseDate(periodStart, 'periodStart')!,
      this.parseDate(periodEnd, 'periodEnd')!,
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
    @Query('status') status?: ShoppingListAnalyticsBatchStatus,
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
