import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { breakdownColumns, parseBreakdowns } from './breakdowns';
import { InsightDefinition } from './insight';
import {
  isoWeekStart,
  resolveParams,
  sensitiveKeys,
  toInsightRows,
} from './insight-runner.service';
import { suppressSmallGroups } from './privacy';
import { contentRollup } from '../insights/learning/content-rollup';

const definition: InsightDefinition = {
  id: 'test',
  area: 'learning',
  title: 'Test',
  description: 'Test',
  values: ['users', 'rate'],
  usersValue: 'users',
  timeSeries: false,
  by: ['item', 'dimension'],
  sql: () => Prisma.sql`SELECT 1`,
};

describe('parseBreakdowns', () => {
  it('accepts up to two distinct known keys', () => {
    expect(parseBreakdowns()).toEqual([]);
    expect(parseBreakdowns('country')).toEqual(['country']);
    expect(parseBreakdowns('country', 'ageGroup')).toEqual([
      'country',
      'ageGroup',
    ]);
  });

  it('rejects unknown, duplicate, orphan and quasi-identifier combinations', () => {
    expect(() => parseBreakdowns('shoeSize')).toThrow(BadRequestException);
    expect(() => parseBreakdowns('country', 'country')).toThrow('must differ');
    expect(() => parseBreakdowns(undefined, 'country')).toThrow(
      'breakdown2 requires breakdown',
    );
    expect(() => parseBreakdowns('region', 'gender')).toThrow(
      'region cannot be combined',
    );
    expect(parseBreakdowns('region')).toEqual(['region']);
  });
});

describe('breakdownColumns', () => {
  it('always selects bd1 and bd2, NULL for unused slots', () => {
    const sql = breakdownColumns(['gender']);
    expect(sql.sql).toContain('AS "bd1"');
    expect(sql.sql).toContain('NULL::text AS "bd2"');
    expect(breakdownColumns([]).sql).toBe(
      'NULL::text AS "bd1", NULL::text AS "bd2"',
    );
  });
});

describe('suppressSmallGroups', () => {
  type Row = { group: Record<string, string>; users: number };
  const row = (group: Record<string, string>, users: number): Row => ({
    group,
    users,
  });
  const usersOf = (r: Row) => r.users;
  // The tests pin the rule to 5 users, independent of the configured size.
  const minGroupSize = 5;

  it('keeps every row without a sensitive key', () => {
    const rows = [row({ item: 'A' }, 1), row({ item: 'B' }, 9)];
    expect(suppressSmallGroups(rows, usersOf, [])).toEqual({
      rows,
      suppressedGroups: 0,
    });
  });

  it('hides the smallest other row when a partition hides only one', () => {
    const rows = [
      row({ gender: 'MALE' }, 6),
      row({ gender: 'FEMALE' }, 3),
      row({ gender: 'unknown' }, 8),
    ];
    // Without the complement, FEMALE = total - MALE - unknown.
    expect(
      suppressSmallGroups(rows, usersOf, ['gender'], minGroupSize),
    ).toEqual({
      rows: [row({ gender: 'unknown' }, 8)],
      suppressedGroups: 2,
    });
  });

  it('hides more rows until the hidden users reach the minimum', () => {
    const rows = [
      row({ country: 'XA' }, 1),
      row({ country: 'XB' }, 1),
      row({ country: 'XC' }, 5),
      row({ country: 'XD' }, 9),
    ];
    expect(
      suppressSmallGroups(rows, usersOf, ['country'], minGroupSize).rows.map(
        (r) => r.group.country,
      ),
    ).toEqual(['XD']);
  });

  it('suppresses per partition, leaving other weeks alone', () => {
    const rows = [
      row({ week: 'w1', country: 'XA' }, 2),
      row({ week: 'w1', country: 'XB' }, 7),
      row({ week: 'w1', country: 'XC' }, 9),
      row({ week: 'w2', country: 'XA' }, 6),
      row({ week: 'w2', country: 'XB' }, 7),
    ];
    const { rows: kept } = suppressSmallGroups(
      rows,
      usersOf,
      ['country'],
      minGroupSize,
    );
    expect(kept.map((r) => `${r.group.week}/${r.group.country}`)).toEqual([
      'w1/XC',
      'w2/XA',
      'w2/XB',
    ]);
  });

  it('protects both axes of a two-way split', () => {
    // country totals XA = 13, XB = 10; gender totals MALE = 14, FEMALE = 9.
    const rows = [
      row({ country: 'XA', gender: 'MALE' }, 8),
      row({ country: 'XA', gender: 'FEMALE' }, 5),
      row({ country: 'XB', gender: 'MALE' }, 6),
      row({ country: 'XB', gender: 'FEMALE' }, 4),
    ];
    const { rows: kept } = suppressSmallGroups(
      rows,
      usersOf,
      ['country', 'gender'],
      minGroupSize,
    );
    // XB/FEMALE is small. Its FEMALE column hides XA/FEMALE, then the XA
    // and XB rows each hide their MALE cell.
    expect(kept).toEqual([]);
  });
});

describe('sensitiveKeys', () => {
  const sessions = { ...definition, userGroupColumns: ['platform'] };

  it('adds user group columns only when the rollup selects them', () => {
    const params = { breakdowns: ['country' as const], by: 'item', weeks: 12 };
    expect(
      sensitiveKeys(sessions, params, [
        { group: { week: 'w1', platform: 'ios' }, values: {} },
      ]),
    ).toEqual(['country', 'platform']);
    expect(
      sensitiveKeys(sessions, params, [{ group: { week: 'w1' }, values: {} }]),
    ).toEqual(['country']);
  });
});

describe('resolveParams', () => {
  it('defaults by to the first option and weeks to 12', () => {
    expect(resolveParams(definition, {})).toEqual({
      breakdowns: [],
      by: 'item',
      weeks: 12,
    });
  });

  it('rejects unknown rollups and weeks on snapshots', () => {
    expect(() => resolveParams(definition, { by: 'topic' })).toThrow(
      'Invalid by "topic"',
    );
    expect(() => resolveParams(definition, { weeks: 4 })).toThrow(
      'does not take weeks',
    );
    expect(() =>
      resolveParams({ ...definition, by: undefined }, { by: 'item' }),
    ).toThrow('does not support by');
  });
});

describe('toInsightRows', () => {
  it('maps breakdown slots to their keys and splits group from values', () => {
    const rows = toInsightRows(
      definition,
      { breakdowns: ['country'], by: 'item', weeks: 12 },
      [{ dimension: 'FOOD_WASTE', bd1: 'DE', bd2: null, users: 7, rate: null }],
    );
    expect(rows).toEqual([
      {
        group: { dimension: 'FOOD_WASTE', country: 'DE' },
        values: { users: 7, rate: null },
      },
    ]);
  });

  it('keeps NULL group values as null', () => {
    const [row] = toInsightRows(
      definition,
      { breakdowns: [], by: 'item', weeks: 12 },
      [{ dimension: null, level: 2, users: 1, rate: null }],
    );
    expect(row.group).toEqual({ dimension: null, level: '2' });
  });

  it('converts bigint values to numbers', () => {
    const [row] = toInsightRows(
      definition,
      { breakdowns: [], by: 'item', weeks: 12 },
      [{ users: BigInt(3), rate: 0.5 }],
    );
    expect(row.values).toEqual({ users: 3, rate: 0.5 });
  });
});

describe('isoWeekStart', () => {
  it('returns Monday 00:00 UTC', () => {
    expect(isoWeekStart(new Date('2026-10-18T23:00:00Z')).toISOString()).toBe(
      '2026-10-12T00:00:00.000Z',
    );
    expect(isoWeekStart(new Date('2026-10-12T00:00:00Z')).toISOString()).toBe(
      '2026-10-12T00:00:00.000Z',
    );
  });
});

describe('contentRollup', () => {
  const columns = {
    dimension: Prisma.sql`d."code"`,
    dimensionOrder: Prisma.sql`d."sortOrder"`,
    level: Prisma.sql`q."level"`,
    topic: Prisma.sql`t."code"`,
    item: Prisma.sql`q."code"`,
    itemKey: 'quiz',
  };

  it('selects fewer group columns for coarser rollups', () => {
    expect(contentRollup('dimension', columns).select.sql).toBe(
      'd."code"::text AS "dimension",',
    );
    expect(contentRollup('topic', columns).groupBy.sql).toBe(
      'd."code",t."code",',
    );
    expect(contentRollup('item', columns).select.sql).toContain(
      'q."code"::text AS "quiz"',
    );
  });
});
