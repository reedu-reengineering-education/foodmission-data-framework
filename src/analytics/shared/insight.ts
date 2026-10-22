import { Prisma } from '@prisma/client';
import { BreakdownKey, BreakdownSelection } from './breakdowns';

export type InsightArea = 'usage' | 'learning';

/** Validated request parameters handed to an insight's SQL builder. */
export interface InsightParams {
  breakdowns: BreakdownSelection;
  /** Rollup level, one of the insight's `by` options (first is the default). */
  by: string;
  /** Number of ISO weeks for time series, current partial week last. */
  weeks: number;
}

/**
 * One insight: an admin-only live query plus its documented semantics.
 *
 * The SQL must select:
 * - its group columns (e.g. "dimension", "level", "week"),
 * - `breakdownColumns(params.breakdowns)` and `GROUP BY "bd1", "bd2"`,
 * - every key of `values`, as numbers (cast COUNT to ::int, AVG to ::float8).
 *
 * Every selected column that is neither a value nor bd1/bd2 becomes part of
 * `row.group`, so `by` rollups simply select fewer group columns.
 */
export interface InsightDefinition {
  id: string;
  area: InsightArea;
  title: string;
  /** Exact semantics: what is counted, from where, and known caveats. */
  description: string;
  /** Value columns; `usersValue` must be one of them. */
  values: readonly string[];
  /** Distinct users the row represents, used for the minimum group size. */
  usersValue: string;
  /** Accepts `weeks` and groups by "week" (YYYY-MM-DD, Monday, UTC). */
  timeSeries: boolean;
  /** Allowed rollups; the first one is the default. */
  by?: readonly string[];
  /**
   * Group columns that split users by a user or device property (e.g.
   * platform). They get the minimum group size like breakdowns do.
   */
  userGroupColumns?: readonly string[];
  sql(params: InsightParams): Prisma.Sql;
}

export interface InsightRow {
  /** NULL group values (e.g. missing event metadata) stay null. */
  group: Record<string, string | null>;
  values: Record<string, number | null>;
}

export interface InsightMeta {
  insight: string;
  breakdowns: BreakdownKey[];
  by: string | null;
  /** First week start and exclusive end (YYYY-MM-DD) for time series. */
  from: string | null;
  to: string | null;
  minGroupSize: number;
  suppressedGroups: number;
  generatedAt: string;
}

/** Response envelope shared by every insight. */
export interface InsightResponse {
  meta: InsightMeta;
  rows: InsightRow[];
}
