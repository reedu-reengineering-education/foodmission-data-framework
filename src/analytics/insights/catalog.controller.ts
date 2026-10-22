import { Controller, Get, Injectable } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ContentLevel } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  BREAKDOWN_KEYS,
  BREAKDOWNS,
  BreakdownValue,
} from '../shared/breakdowns';
import { MIN_GROUP_SIZE } from '../shared/privacy';
import { AdminOnly } from './admin-insight.decorator';
import { insightPath, INSIGHTS } from './insights.registry';
import { FEATURE_FAMILIES } from './usage/feature-usage.insight';

/** Group keys whose values are catalog codes, labelled in `labels`. */
const LABEL_KINDS = [
  'dimension',
  'topic',
  'quest',
  'mission',
  'challenge',
  'quiz',
  'foodFact',
  'badge',
] as const;

type LabelKind = (typeof LABEL_KINDS)[number];

/**
 * Everything the admin UI needs to render insights without hard-coded
 * lists: the insights and their options, the breakdowns with ordered
 * values, and English names for every catalog code that can appear in
 * `row.group`.
 */
@Injectable()
export class AnalyticsCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getCatalog() {
    // One round trip for all labels; ordered by display order within each kind.
    const rows = await this.prisma.$queryRaw<
      { kind: LabelKind; code: string; label: string }[]
    >`
      SELECT 'dimension' AS "kind", "code", "name" AS "label", "sortOrder" AS "o" FROM dimensions
      UNION ALL SELECT 'topic', "code", "name", "sortOrder" FROM topics
      UNION ALL SELECT 'quest', "code", COALESCE("title", "name", "code"), 0 FROM quests
      UNION ALL SELECT 'mission', "code", "title", 0 FROM missions
      UNION ALL SELECT 'challenge', "code", "title", 0 FROM challenges
      UNION ALL SELECT 'quiz', "code", "title", 0 FROM quizzes
      UNION ALL SELECT 'foodFact', "code", "title", 0 FROM food_facts
      UNION ALL SELECT 'badge', "code", "name", "sortOrder" FROM badges
      ORDER BY 1, 4, 2`;

    const labels = Object.fromEntries(
      LABEL_KINDS.map((kind) => [kind, {}]),
    ) as Record<LabelKind, Record<string, string>>;
    for (const row of rows) labels[row.kind][row.code] = row.label;

    return {
      minGroupSize: MIN_GROUP_SIZE,
      maxBreakdowns: 2,
      insights: INSIGHTS.map((insight) => ({
        id: insight.id,
        area: insight.area,
        path: insightPath(insight),
        title: insight.title,
        description: insight.description,
        values: insight.values,
        timeSeries: insight.timeSeries,
        by: insight.by ?? null,
      })),
      breakdowns: BREAKDOWN_KEYS.map((key) => ({
        key,
        label: BREAKDOWNS[key].label,
        values: BREAKDOWNS[key].values,
        allowInTwoWay: BREAKDOWNS[key].allowInTwoWay,
      })),
      dimensions: Object.entries(labels.dimension).map(([code, name]) => ({
        code,
        name,
      })),
      levels: Object.values(ContentLevel).map((value): BreakdownValue => ({
        value,
        label: value.charAt(0) + value.slice(1).toLowerCase(),
      })),
      featureFamilies: Object.keys(FEATURE_FAMILIES),
      labels,
    };
  }
}

@ApiTags('analytics-admin')
@Controller('analytics/admin')
export class AnalyticsCatalogController {
  constructor(private readonly catalog: AnalyticsCatalogService) {}

  @Get('catalog')
  @AdminOnly()
  @ApiOperation({
    summary: 'Admin insights catalog (admin only)',
    description:
      'Lists insights with their routes and options, breakdowns with ordered values and labels, learning dimensions, ' +
      'content levels, the minimum group size and English labels for every catalog code used in row.group.',
  })
  @ApiResponse({ status: 200, description: 'Insights catalog' })
  getCatalog() {
    return this.catalog.getCatalog();
  }
}
