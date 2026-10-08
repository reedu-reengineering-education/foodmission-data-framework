import { Injectable } from '@nestjs/common';
import {
  USAGE_DIMENSIONS,
  UsageAnalyticsRepository,
  UsageBreakdownRow,
  UsageDimension,
  UsageTrendRow,
} from '../repositories/usage-analytics.repository';

export interface UsageOverviewDto {
  generatedAt: Date;
  totalUsers: number;
  /** Users seen (lastLoginAt) within the trailing window. */
  activeUsers: { last1d: number; last7d: number; last30d: number };
  newUsers: { last7d: number; last30d: number };
  /** Users that registered but never made an authenticated request since lastLoginAt was introduced. */
  neverSeenUsers: number;
  /** DAU/MAU and WAU/MAU, 0–1; null when there are no monthly actives. */
  stickiness: { dauOverMau: number | null; wauOverMau: number | null };
  /** Window (days) used for `activeUsers` in `breakdowns`. */
  activeWindowDays: number;
  breakdowns: Record<UsageDimension, UsageBreakdownRow[]>;
}

export interface UsageBreakdownDto {
  dimension: UsageDimension;
  activeWindowDays: number;
  rows: UsageBreakdownRow[];
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 1000) / 1000;
}

@Injectable()
export class UsageAnalyticsService {
  constructor(private readonly repository: UsageAnalyticsRepository) {}

  async getOverview(activeWindowDays: number): Promise<UsageOverviewDto> {
    const [totals, ...breakdownRows] = await Promise.all([
      this.repository.getTotals(),
      ...USAGE_DIMENSIONS.map((dim) =>
        this.repository.getBreakdown(dim, activeWindowDays),
      ),
    ]);

    const breakdowns = Object.fromEntries(
      USAGE_DIMENSIONS.map((dim, i) => [dim, breakdownRows[i]]),
    ) as Record<UsageDimension, UsageBreakdownRow[]>;

    return {
      generatedAt: new Date(),
      totalUsers: totals.totalUsers,
      activeUsers: {
        last1d: totals.active1d,
        last7d: totals.active7d,
        last30d: totals.active30d,
      },
      newUsers: { last7d: totals.new7d, last30d: totals.new30d },
      neverSeenUsers: totals.neverSeen,
      stickiness: {
        dauOverMau: ratio(totals.active1d, totals.active30d),
        wauOverMau: ratio(totals.active7d, totals.active30d),
      },
      activeWindowDays,
      breakdowns,
    };
  }

  async getBreakdown(
    dimension: UsageDimension,
    activeWindowDays: number,
  ): Promise<UsageBreakdownDto> {
    return {
      dimension,
      activeWindowDays,
      rows: await this.repository.getBreakdown(dimension, activeWindowDays),
    };
  }

  getWeeklyTrend(weeks: number): Promise<UsageTrendRow[]> {
    return this.repository.getWeeklyTrend(weeks);
  }
}
