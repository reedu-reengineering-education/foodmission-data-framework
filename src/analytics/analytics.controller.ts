import {
  BadRequestException,
  Controller,
  Param,
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

interface AnalyticsRunPayload {
  mealLogBatchId: string;
  shoppingListBatchId: string;
}

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly batchCoordinator: AnalyticsBatchCoordinator) {}

  private encodeRunId(payload: AnalyticsRunPayload): string {
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  private decodeRunId(runId: string): AnalyticsRunPayload {
    try {
      const parsed = JSON.parse(
        Buffer.from(runId, 'base64url').toString('utf-8'),
      ) as Partial<AnalyticsRunPayload>;
      if (!parsed.mealLogBatchId || !parsed.shoppingListBatchId) {
        throw new Error('missing ids');
      }
      return {
        mealLogBatchId: parsed.mealLogBatchId,
        shoppingListBatchId: parsed.shoppingListBatchId,
      };
    } catch {
      throw new BadRequestException('Invalid runId');
    }
  }

  @Post('runs/generate')
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
  async generateRun(
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string,
  ) {
    if (!periodStart || !periodEnd) {
      throw new BadRequestException('periodStart and periodEnd are required');
    }

    const generated = await this.batchCoordinator.generateForAll(
      parseDate(periodStart, 'periodStart')!,
      parseDate(periodEnd, 'periodEnd')!,
    );
    return {
      ...generated,
      runId: this.encodeRunId(generated),
    };
  }

  @Post('runs/:runId/approve')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles('admin')
  @ApiOperation({
    summary: 'Approve all analytics batches associated with a run',
  })
  @ApiResponse({
    status: 200,
    description: 'Approved batch records for all run domains',
  })
  async approveRun(
    @Param('runId') runId: string,
    @CurrentUser('id') adminUserId?: string,
  ) {
    const { mealLogBatchId, shoppingListBatchId } = this.decodeRunId(runId);
    return this.batchCoordinator.approveForAll(
      mealLogBatchId,
      shoppingListBatchId,
      adminUserId!,
    );
  }

  @Post('runs/:runId/publish')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles('admin')
  @ApiOperation({
    summary: 'Publish all analytics batches associated with a run',
  })
  @ApiResponse({
    status: 200,
    description: 'Published batch records for all run domains',
  })
  async publishRun(
    @Param('runId') runId: string,
    @CurrentUser('id') adminUserId?: string,
  ) {
    const { mealLogBatchId, shoppingListBatchId } = this.decodeRunId(runId);
    return this.batchCoordinator.publishForAll(
      mealLogBatchId,
      shoppingListBatchId,
      adminUserId!,
    );
  }
}
