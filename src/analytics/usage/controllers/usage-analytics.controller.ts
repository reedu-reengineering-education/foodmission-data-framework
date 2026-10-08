import {
  BadRequestException,
  Controller,
  Get,
  ParseEnumPipe,
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
import { DataBaseAuthGuard } from '../../../common/guards/database-auth.guards';
import { UsageAnalyticsService } from '../services/usage-analytics.service';
import {
  USAGE_DIMENSIONS,
  UsageDimension,
} from '../repositories/usage-analytics.repository';

const UsageDimensionEnum = Object.fromEntries(
  USAGE_DIMENSIONS.map((d) => [d, d]),
) as Record<UsageDimension, UsageDimension>;

const DEFAULT_ACTIVE_DAYS = 7;
const MAX_ACTIVE_DAYS = 365;
const DEFAULT_TREND_WEEKS = 12;
const MAX_TREND_WEEKS = 104;

/** Parses an optional positive integer query param within [1, max]. */
export function parseBoundedInt(
  value: string | undefined,
  param: string,
  defaultValue: number,
  max: number,
): number {
  if (value === undefined || value === '') return defaultValue;
  const parsed = /^\d+$/.test(value) ? parseInt(value, 10) : NaN;
  if (!(parsed >= 1 && parsed <= max)) {
    throw new BadRequestException(
      `Invalid ${param} "${value}". Must be an integer between 1 and ${max}.`,
    );
  }
  return parsed;
}

/**
 * Admin-only live app usage stats (active users, signups, demographics).
 * Not anonymised or batch-gated like the published analytics — never mark
 * these routes @Public().
 */
@ApiTags('analytics-usage')
@Controller('analytics/usage')
export class UsageAnalyticsController {
  constructor(private readonly usageService: UsageAnalyticsService) {}

  @Get('overview')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles('admin')
  @ApiOperation({
    summary: 'App usage overview (admin only)',
    description:
      'Total/active/new users, stickiness, and active users by country, age group, gender and language. ' +
      'A user is active when they made an authenticated request within the window.',
  })
  @ApiQuery({
    name: 'activeDays',
    required: false,
    type: Number,
    example: DEFAULT_ACTIVE_DAYS,
    description: 'Active-user window for the breakdowns (days, default 7)',
  })
  @ApiResponse({ status: 200, description: 'Usage overview' })
  async getOverview(@Query('activeDays') activeDays?: string) {
    return this.usageService.getOverview(
      parseBoundedInt(
        activeDays,
        'activeDays',
        DEFAULT_ACTIVE_DAYS,
        MAX_ACTIVE_DAYS,
      ),
    );
  }

  @Get('breakdown')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles('admin')
  @ApiOperation({
    summary: 'Total and active users by a single dimension (admin only)',
  })
  @ApiQuery({ name: 'dim', required: true, enum: USAGE_DIMENSIONS })
  @ApiQuery({
    name: 'activeDays',
    required: false,
    type: Number,
    example: DEFAULT_ACTIVE_DAYS,
  })
  @ApiResponse({ status: 200, description: 'Usage breakdown' })
  async getBreakdown(
    @Query('dim', new ParseEnumPipe(UsageDimensionEnum)) dim: UsageDimension,
    @Query('activeDays') activeDays?: string,
  ) {
    return this.usageService.getBreakdown(
      dim,
      parseBoundedInt(
        activeDays,
        'activeDays',
        DEFAULT_ACTIVE_DAYS,
        MAX_ACTIVE_DAYS,
      ),
    );
  }

  @Get('trend')
  @UseGuards(DataBaseAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles('admin')
  @ApiOperation({
    summary: 'Weekly active, new and cumulative users (admin only)',
    description:
      'ISO weeks (Monday start, UTC), oldest first, current partial week last. ' +
      'Weekly actives = distinct users with any recorded user event that week.',
  })
  @ApiQuery({
    name: 'weeks',
    required: false,
    type: Number,
    example: DEFAULT_TREND_WEEKS,
  })
  @ApiResponse({ status: 200, description: 'Weekly usage series' })
  async getTrend(@Query('weeks') weeks?: string) {
    return this.usageService.getWeeklyTrend(
      parseBoundedInt(weeks, 'weeks', DEFAULT_TREND_WEEKS, MAX_TREND_WEEKS),
    );
  }
}
