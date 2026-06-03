import {
  BadRequestException,
  Body,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { AnalyticsBatchStatus } from '@prisma/client';
import { Roles } from 'nest-keycloak-connect';
import { DataBaseAuthGuard } from '../../common/guards/database-auth.guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { parseDate } from './analytics-utils';

interface AnalyticsAdminService<TBatch> {
  generateBatch(periodStart: Date, periodEnd: Date): Promise<string>;
  runDailyAggregation(): Promise<string>;
  listBatches(status?: AnalyticsBatchStatus): Promise<TBatch[]>;
  getBatch(batchId: string): Promise<TBatch>;
  approveBatch(batchId: string, adminUserId: string): Promise<TBatch>;
  publishBatch(batchId: string, adminUserId: string): Promise<TBatch>;
  rejectBatch(
    batchId: string,
    adminUserId: string,
    reason: string,
  ): Promise<TBatch>;
  supersedeBatch(batchId: string, adminUserId: string): Promise<TBatch>;
  deleteBatch(batchId: string): Promise<void>;
}

export abstract class BaseAnalyticsAdminController<TBatch> {
  protected abstract readonly analyticsService: AnalyticsAdminService<TBatch>;

  @Post('batches/generate')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles('admin')
  @ApiOperation({ summary: 'Manually trigger analytics aggregation' })
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
  @ApiQuery({
    name: 'status',
    required: false,
    enum: AnalyticsBatchStatus,
  })
  @ApiResponse({ status: 200, description: 'List of batches' })
  async listBatches(
    @Query(
      'status',
      new ParseEnumPipe(AnalyticsBatchStatus, { optional: true }),
    )
    status?: AnalyticsBatchStatus,
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

  @Patch('batches/:id/supersede')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles('admin')
  @ApiOperation({ summary: 'Mark a published batch as superseded' })
  @ApiParam({ name: 'id', description: 'Batch UUID' })
  @ApiResponse({ status: 200, description: 'Batch superseded' })
  async supersedeBatch(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.analyticsService.supersedeBatch(id, adminUserId);
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
