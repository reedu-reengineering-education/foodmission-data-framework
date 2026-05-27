import {
  BadRequestException,
  Controller,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from 'nest-keycloak-connect';
import { DataBaseAuthGuard } from '../common/guards/database-auth.guards';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { parseDate } from './common/analytics-utils';
import { AnalyticsBatchCoordinator } from './analytics-batch-coordinator.service';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly batchCoordinator: AnalyticsBatchCoordinator) {}

  @Post('batches/generate-all')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles('admin')
  @ApiOperation({
    summary: 'Manually trigger all analytics aggregations for a period',
  })
  @ApiQuery({
    name: 'periodStart',
    required: true,
    type: String,
    example: '2026-04-01',
  })
  @ApiQuery({
    name: 'periodEnd',
    required: true,
    type: String,
    example: '2026-04-30',
  })
  @ApiResponse({
    status: 201,
    description: 'Batch IDs for all generated analytics sources',
  })
  async generateAllBatches(
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string,
  ) {
    if (!periodStart || !periodEnd) {
      throw new BadRequestException('periodStart and periodEnd are required');
    }

    return this.batchCoordinator.generateForAll(
      parseDate(periodStart, 'periodStart')!,
      parseDate(periodEnd, 'periodEnd')!,
    );
  }

  @Patch('batches/approve-all')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles('admin')
  @ApiOperation({
    summary: 'Approve Meal Log and Shopping List analytics batches together',
  })
  @ApiQuery({ name: 'mealLogBatchId', required: true, type: String })
  @ApiQuery({ name: 'shoppingListBatchId', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'Approved batch records for both analytics sources',
  })
  async approveAllBatches(
    @Query('mealLogBatchId') mealLogBatchId?: string,
    @Query('shoppingListBatchId') shoppingListBatchId?: string,
    @CurrentUser('id') adminUserId?: string,
  ) {
    if (!mealLogBatchId || !shoppingListBatchId) {
      throw new BadRequestException(
        'mealLogBatchId and shoppingListBatchId are required',
      );
    }

    return this.batchCoordinator.approveForAll(
      mealLogBatchId,
      shoppingListBatchId,
      adminUserId!,
    );
  }

  @Patch('batches/publish-all')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles('admin')
  @ApiOperation({
    summary: 'Publish Meal Log and Shopping List analytics batches together',
  })
  @ApiQuery({ name: 'mealLogBatchId', required: true, type: String })
  @ApiQuery({ name: 'shoppingListBatchId', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'Published batch records for both analytics sources',
  })
  async publishAllBatches(
    @Query('mealLogBatchId') mealLogBatchId?: string,
    @Query('shoppingListBatchId') shoppingListBatchId?: string,
    @CurrentUser('id') adminUserId?: string,
  ) {
    if (!mealLogBatchId || !shoppingListBatchId) {
      throw new BadRequestException(
        'mealLogBatchId and shoppingListBatchId are required',
      );
    }

    return this.batchCoordinator.publishForAll(
      mealLogBatchId,
      shoppingListBatchId,
      adminUserId!,
    );
  }
}
