import {
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
import { AnalyticsService } from '../services/analytics.service';
import { AnalyticsBatchStatus } from '@prisma/client';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { Roles } from 'nest-keycloak-connect';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ============================================================
  // Public Endpoints — no auth required
  // ============================================================

  @Get('public/nutrition')
  @ApiOperation({
    summary: 'Daily nutrition averages (calories, protein, fat, etc.)',
    description:
      'Aggregated daily nutrition data with percentiles. Anonymized with k-anonymity (k≥5).',
  })
  @ApiQuery({ name: 'from', required: false, type: String, example: '2026-01-01' })
  @ApiQuery({ name: 'to', required: false, type: String, example: '2026-02-25' })
  @ApiQuery({ name: 'typeOfMeal', required: false, enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'SPECIAL_DRINKS'] })
  @ApiResponse({ status: 200, description: 'Daily nutrition aggregates' })
  async getPublicNutrition(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('typeOfMeal') typeOfMeal?: string,
  ) {
    return this.analyticsService.getPublishedNutrition(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      typeOfMeal,
    );
  }

  @Get('public/food-popularity')
  @ApiOperation({
    summary: 'Most consumed foods and food categories',
    description: 'Ranked by frequency. Only foods consumed by ≥5 unique users.',
  })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Food popularity rankings' })
  async getPublicFoodPopularity(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.analyticsService.getPublishedFoodPopularity(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('public/meal-patterns')
  @ApiOperation({
    summary: 'Meal behavior patterns (timing, pantry usage, items per meal)',
  })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'typeOfMeal', required: false, enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'SPECIAL_DRINKS'] })
  @ApiResponse({ status: 200, description: 'Meal pattern aggregates' })
  async getPublicMealPatterns(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('typeOfMeal') typeOfMeal?: string,
  ) {
    return this.analyticsService.getPublishedMealPatterns(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      typeOfMeal,
    );
  }

  @Get('public/sustainability')
  @ApiOperation({
    summary: 'Sustainability, carbon footprint & nutri/eco-score distributions',
  })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'typeOfMeal', required: false, enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'SPECIAL_DRINKS'] })
  @ApiResponse({ status: 200, description: 'Sustainability aggregates' })
  async getPublicSustainability(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('typeOfMeal') typeOfMeal?: string,
  ) {
    return this.analyticsService.getPublishedSustainability(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      typeOfMeal,
    );
  }

  @Get('public/meal-classification')
  @ApiOperation({
    summary: 'Vegetarian/vegan rates, ultra-processed %, NOVA distribution',
  })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'typeOfMeal', required: false, enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'SPECIAL_DRINKS'] })
  @ApiResponse({ status: 200, description: 'Meal classification aggregates' })
  async getPublicMealClassification(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('typeOfMeal') typeOfMeal?: string,
  ) {
    return this.analyticsService.getPublishedMealClassification(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      typeOfMeal,
    );
  }

  @Get('public/meal-records')
  @ApiOperation({
    summary:
      'Individual meal records — anonymized microdata (one row per meal log)',
  })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'typeOfMeal', required: false, enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'SPECIAL_DRINKS'] })
  @ApiResponse({ status: 200, description: 'Anonymized meal-level records' })
  async getPublicMealRecords(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('typeOfMeal') typeOfMeal?: string,
  ) {
    return this.analyticsService.getPublishedMealRecords(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      typeOfMeal,
    );
  }

  @Get('public/demographic/nutrition')
  @ApiOperation({
    summary: 'Demographic breakdown of daily nutrition averages',
    description:
      'Nutrition averages segmented by one demographic dimension (ageGroup, gender, educationLevel, or region). ' +
      'Each row has exactly one non-null dimension field. k-anonymity (k≥5) enforced.',
  })
  @ApiQuery({ name: 'from', required: false, type: String, example: '2026-01-01' })
  @ApiQuery({ name: 'to', required: false, type: String, example: '2026-02-25' })
  @ApiQuery({ name: 'typeOfMeal', required: false, enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'SPECIAL_DRINKS'] })
  @ApiQuery({ name: 'dimension', required: false, enum: ['ageGroup', 'gender', 'educationLevel', 'region', 'country'], description: 'Filter to a single demographic axis' })
  @ApiResponse({ status: 200, description: 'Demographic nutrition aggregates' })
  async getPublicDemographicNutrition(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('typeOfMeal') typeOfMeal?: string,
    @Query('dimension') dimension?: string,
  ) {
    return this.analyticsService.getPublishedDemographicNutrition(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      typeOfMeal,
      dimension,
    );
  }

  @Get('public/demographic/classification')
  @ApiOperation({
    summary: 'Demographic breakdown of meal classification (vegetarian/vegan/NOVA/ultra-processed)',
    description:
      'Classification metrics segmented by one demographic dimension. k-anonymity (k≥5) enforced.',
  })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'typeOfMeal', required: false, enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'SPECIAL_DRINKS'] })
  @ApiQuery({ name: 'dimension', required: false, enum: ['ageGroup', 'gender', 'educationLevel', 'region', 'country'] })
  @ApiResponse({ status: 200, description: 'Demographic classification aggregates' })
  async getPublicDemographicClassification(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('typeOfMeal') typeOfMeal?: string,
    @Query('dimension') dimension?: string,
  ) {
    return this.analyticsService.getPublishedDemographicClassification(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      typeOfMeal,
      dimension,
    );
  }

  @Get('public/demographic/patterns')
  @ApiOperation({
    summary: 'Demographic breakdown of meal patterns (pantry usage, timing, items per meal)',
    description:
      'Meal behavior patterns segmented by one demographic dimension. k-anonymity (k≥5) enforced.',
  })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'typeOfMeal', required: false, enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'SPECIAL_DRINKS'] })
  @ApiQuery({ name: 'dimension', required: false, enum: ['ageGroup', 'gender', 'educationLevel', 'region', 'country'] })
  @ApiResponse({ status: 200, description: 'Demographic meal pattern aggregates' })
  async getPublicDemographicPatterns(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('typeOfMeal') typeOfMeal?: string,
    @Query('dimension') dimension?: string,
  ) {
    return this.analyticsService.getPublishedDemographicPatterns(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      typeOfMeal,
      dimension,
    );
  }

  @Get('public/cross-dim/nutrition')
  @ApiOperation({
    summary: 'Cross-dimensional nutrition averages (two demographic dimensions combined)',
    description:
      'Nutrition averages where two demographic dimensions are active simultaneously (e.g. ageGroup=65_plus AND gender=MALE). ' +
      'Each row has dim1Name/dim1Value/dim2Name/dim2Value; dim1Name < dim2Name alphabetically. ' +
      'Stricter k-anonymity (k≥20) is enforced. ' +
      'Use ?dim1= and ?dim2= to filter to a specific dimension pair.',
  })
  @ApiQuery({ name: 'from', required: false, type: String, example: '2026-01-01' })
  @ApiQuery({ name: 'to', required: false, type: String, example: '2026-02-25' })
  @ApiQuery({ name: 'typeOfMeal', required: false, enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'SPECIAL_DRINKS'] })
  @ApiQuery({ name: 'dim1', required: false, enum: ['ageGroup', 'country', 'educationLevel', 'gender', 'region'], description: 'First dimension name (alphabetically earlier)' })
  @ApiQuery({ name: 'dim2', required: false, enum: ['ageGroup', 'country', 'educationLevel', 'gender', 'region'], description: 'Second dimension name (alphabetically later)' })
  @ApiResponse({ status: 200, description: 'Cross-dimensional nutrition aggregates (k≥20)' })
  async getPublicCrossDimNutrition(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('typeOfMeal') typeOfMeal?: string,
    @Query('dim1') dim1?: string,
    @Query('dim2') dim2?: string,
  ) {
    return this.analyticsService.getPublishedCrossDimNutrition(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      typeOfMeal,
      dim1,
      dim2,
    );
  }

  @Get('public/cross-dim/classification')
  @ApiOperation({
    summary: 'Cross-dimensional meal classification (two demographic dimensions combined)',
    description:
      'Vegetarian/vegan rates, ultra-processed % and NOVA distribution for two demographic dimensions combined. ' +
      'Stricter k-anonymity (k≥20) is enforced.',
  })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'typeOfMeal', required: false, enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'SPECIAL_DRINKS'] })
  @ApiQuery({ name: 'dim1', required: false, enum: ['ageGroup', 'country', 'educationLevel', 'gender', 'region'] })
  @ApiQuery({ name: 'dim2', required: false, enum: ['ageGroup', 'country', 'educationLevel', 'gender', 'region'] })
  @ApiResponse({ status: 200, description: 'Cross-dimensional classification aggregates (k≥20)' })
  async getPublicCrossDimClassification(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('typeOfMeal') typeOfMeal?: string,
    @Query('dim1') dim1?: string,
    @Query('dim2') dim2?: string,
  ) {
    return this.analyticsService.getPublishedCrossDimClassification(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      typeOfMeal,
      dim1,
      dim2,
    );
  }

  @Get('public/cross-dim/patterns')
  @ApiOperation({
    summary: 'Cross-dimensional meal patterns (two demographic dimensions combined)',
    description:
      'Meal behavior patterns (pantry usage, eaten out, timing, items per meal) for two demographic dimensions combined. ' +
      'Stricter k-anonymity (k≥20) is enforced.',
  })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'typeOfMeal', required: false, enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'SPECIAL_DRINKS'] })
  @ApiQuery({ name: 'dim1', required: false, enum: ['ageGroup', 'country', 'educationLevel', 'gender', 'region'] })
  @ApiQuery({ name: 'dim2', required: false, enum: ['ageGroup', 'country', 'educationLevel', 'gender', 'region'] })
  @ApiResponse({ status: 200, description: 'Cross-dimensional meal pattern aggregates (k≥20)' })
  async getPublicCrossDimPatterns(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('typeOfMeal') typeOfMeal?: string,
    @Query('dim1') dim1?: string,
    @Query('dim2') dim2?: string,
  ) {
    return this.analyticsService.getPublishedCrossDimPatterns(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      typeOfMeal,
      dim1,
      dim2,
    );
  }

  @Get('public/summary')
  @ApiOperation({
    summary: 'High-level summary across all dimensions',
  })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Summary across all dimensions' })
  async getPublicSummary(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getPublishedSummary(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  // ============================================================
  // Admin Endpoints — requires auth + admin role
  // ============================================================

  @Post('batches/generate')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles('admin')
  @ApiOperation({ summary: 'Manually trigger analytics aggregation' })
  @ApiQuery({ name: 'periodStart', required: true, type: String, example: '2026-02-18' })
  @ApiQuery({ name: 'periodEnd', required: true, type: String, example: '2026-02-25' })
  @ApiResponse({ status: 201, description: 'Batch ID' })
  async generateBatch(
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
  ) {
    const batchId = await this.analyticsService.generateBatch(
      new Date(periodStart),
      new Date(periodEnd),
    );
    return { batchId };
  }

  @Post('batches/run-daily')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles('admin')
  @ApiOperation({ summary: 'Manually trigger the daily aggregation job' })
  @ApiResponse({ status: 201, description: 'Batch ID for yesterday' })
  async runDaily() {
    const batchId = await this.analyticsService.runDailyAggregation();
    return { batchId };
  }

  @Get('batches')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles('admin')
  @ApiOperation({ summary: 'List all analytics batches' })
  @ApiQuery({ name: 'status', required: false, enum: AnalyticsBatchStatus })
  @ApiResponse({ status: 200, description: 'List of batches' })
  async listBatches(@Query('status') status?: AnalyticsBatchStatus) {
    return this.analyticsService.listBatches(status);
  }

  @Get('batches/:id')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles('admin')
  @ApiOperation({ summary: 'Get batch details with all aggregated data for review' })
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
