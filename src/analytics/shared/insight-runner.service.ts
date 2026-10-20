import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { parseBreakdowns } from './breakdowns';
import {
  InsightDefinition,
  InsightParams,
  InsightResponse,
  InsightRow,
} from './insight';
import { DEFAULT_WEEKS, InsightQueryDto } from './insight-query.dto';
import { MIN_GROUP_SIZE, suppressSmallGroups } from './privacy';

const BREAKDOWN_COLUMNS = ['bd1', 'bd2'] as const;

/** Monday 00:00 UTC of the week containing `date`. */
export function isoWeekStart(date: Date): Date {
  const day = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const offset = (day.getUTCDay() + 6) % 7;
  day.setUTCDate(day.getUTCDate() - offset);
  return day;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Validates query params against an insight definition. */
export function resolveParams(
  definition: InsightDefinition,
  query: InsightQueryDto,
): InsightParams {
  const breakdowns = parseBreakdowns(query.breakdown, query.breakdown2);
  const options = definition.by ?? [];
  if (query.by !== undefined && !options.includes(query.by)) {
    throw new BadRequestException(
      options.length
        ? `Invalid by "${query.by}". Must be one of: ${options.join(', ')}.`
        : `${definition.id} does not support by.`,
    );
  }
  if (query.weeks !== undefined && !definition.timeSeries) {
    throw new BadRequestException(
      `${definition.id} is a snapshot and does not take weeks.`,
    );
  }
  return {
    breakdowns,
    by: query.by ?? options[0] ?? '',
    weeks: query.weeks ?? DEFAULT_WEEKS,
  };
}

/** SQL group values are text or numbers; NULL stays null. */
function groupValue(value: unknown): string | null {
  return value == null ? null : `${value as string | number}`;
}

/**
 * Maps raw SQL rows onto the envelope: breakdown columns and the insight's
 * own group columns go to `group`, value columns to `values`.
 */
export function toInsightRows(
  definition: InsightDefinition,
  params: InsightParams,
  raw: Record<string, unknown>[],
): InsightRow[] {
  const values = new Set(definition.values);
  return raw.map((record) => {
    const row: InsightRow = { group: {}, values: {} };
    for (const [column, value] of Object.entries(record)) {
      if (values.has(column)) {
        row.values[column] = value == null ? null : Number(value);
      } else if (!(BREAKDOWN_COLUMNS as readonly string[]).includes(column)) {
        row.group[column] = groupValue(value);
      }
    }
    params.breakdowns.forEach((key, i) => {
      row.group[key] = groupValue(record[BREAKDOWN_COLUMNS[i]]);
    });
    return row;
  });
}

/**
 * Group keys that split users by a user or device property: the breakdowns
 * plus the insight's `userGroupColumns` its current rollup selects.
 */
export function sensitiveKeys(
  definition: InsightDefinition,
  params: InsightParams,
  rows: InsightRow[],
): string[] {
  const columns = (definition.userGroupColumns ?? []).filter((column) =>
    rows.some((row) => column in row.group),
  );
  return [...params.breakdowns, ...columns];
}

/**
 * Runs an insight: validate params, one SQL round trip, map to the
 * envelope, apply the minimum group size.
 */
@Injectable()
export class InsightRunner {
  constructor(private readonly prisma: PrismaService) {}

  async run(
    definition: InsightDefinition,
    query: InsightQueryDto,
  ): Promise<InsightResponse> {
    const params = resolveParams(definition, query);
    const raw = await this.prisma.$queryRaw<Record<string, unknown>[]>(
      definition.sql(params),
    );
    const mapped = toInsightRows(definition, params, raw);
    const { rows, suppressedGroups } = suppressSmallGroups(
      mapped,
      (row) => row.values[definition.usersValue] ?? 0,
      sensitiveKeys(definition, params, mapped),
    );

    const now = new Date();
    let from: string | null = null;
    let to: string | null = null;
    if (definition.timeSeries) {
      const current = isoWeekStart(now);
      const start = new Date(current);
      start.setUTCDate(start.getUTCDate() - (params.weeks - 1) * 7);
      const end = new Date(current);
      end.setUTCDate(end.getUTCDate() + 7);
      from = isoDate(start);
      to = isoDate(end);
    }

    return {
      meta: {
        insight: definition.id,
        breakdowns: params.breakdowns,
        by: params.by || null,
        from,
        to,
        minGroupSize: MIN_GROUP_SIZE,
        suppressedGroups,
        generatedAt: now.toISOString(),
      },
      rows,
    };
  }
}
