import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DEFAULT_LOCALE } from '../../i18n/constants';
import { FOODEX2_CANONICAL_CONFIG } from '../foodex2/foodex2-canonical.config';
import {
  ConceptCandidate,
  RecordCandidate,
} from '../search/food-search.ranking';

/** Escapes LIKE wildcards so a query such as `50%` is matched literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

interface RecordRow {
  nevoCode: number;
  nameEn: string;
  synonymEn: string | null;
  nameLocal: string | null;
  synonymLocal: string | null;
  conceptCode: string | null;
  conceptTermType: string | null;
  sourceCode: string | null;
  priority: number | null;
}

interface ConceptRow {
  code: string;
  termType: string;
  nameEn: string;
  shortName: string | null;
  synonyms: string[];
  nameLocal: string | null;
  canonicalNevoCode: number;
  canonicalNameEn: string;
  canonicalNameLocal: string | null;
  priority: number;
  recordCount: number;
}

export interface FindSearchCandidatesParams {
  /** Substring every candidate must contain; `null` loads every record. */
  stem: string | null;
  locale?: string;
  /** Food group filter (partial match; English or translated). */
  foodGroup?: string;
  /** Restricts records to those filed under this FoodEx2 code. */
  foodex2Code?: string;
  /** Concepts are only needed when results may collapse into them. */
  includeConcepts: boolean;
}

/**
 * Loads search candidates for {@link rankFoodSearch}.
 *
 * Filtering here is a deliberately loose substring match over a 2.3k-record
 * catalogue, so the ranking rules live in one pure, testable place instead of
 * being split between SQL and TypeScript.
 */
@Injectable()
export class FoodSearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCandidates(
    params: FindSearchCandidatesParams,
  ): Promise<{ records: RecordCandidate[]; concepts: ConceptCandidate[] }> {
    const locale = params.locale ?? DEFAULT_LOCALE;
    const [records, concepts] = await Promise.all([
      this.findRecordCandidates(params, locale),
      params.includeConcepts && params.stem
        ? this.findConceptCandidates(params, params.stem, locale)
        : Promise.resolve([]),
    ]);
    return { records, concepts };
  }

  /**
   * Counts the NEVO records filed under each code, as a concept or as the
   * code published on the record — exactly what `?foodex2Code=` lists.
   */
  async countRecordsByCode(codes: string[]): Promise<Map<string, number>> {
    if (codes.length === 0) return new Map();

    const list = Prisma.join(codes);
    const rows = await this.prisma.$queryRaw<{ code: string; count: number }[]>`
      SELECT "code", COUNT(DISTINCT "nevoCode")::int AS "count"
      FROM (
        SELECT "foodex2Code" AS "code", "nevoCode"
        FROM "foodex2_nevo_mappings" WHERE "foodex2Code" IN (${list})
        UNION ALL
        SELECT "sourceFoodex2Code" AS "code", "nevoCode"
        FROM "foodex2_nevo_mappings" WHERE "sourceFoodex2Code" IN (${list})
      ) AS "filed"
      GROUP BY "code"
    `;
    return new Map(rows.map((row) => [row.code, row.count]));
  }

  private foodGroupFilter(
    foodGroup: string | undefined,
    locale: string,
    food: Prisma.Sql,
  ): Prisma.Sql {
    if (!foodGroup) return Prisma.empty;
    const pattern = `%${escapeLike(foodGroup.trim().toLowerCase())}%`;
    return Prisma.sql`AND (
      LOWER(${food}."foodGroup") LIKE ${pattern} ESCAPE '\\'
      OR EXISTS (
        SELECT 1 FROM "entity_translations" fg
        WHERE fg."entityType" = 'GenericFood'
          AND fg."entityId" = ${food}."id"
          AND fg."locale" = ${locale}
          AND fg."field" = 'foodGroup'
          AND LOWER(fg."value") LIKE ${pattern} ESCAPE '\\'
      )
    )`;
  }

  private async findRecordCandidates(
    params: FindSearchCandidatesParams,
    locale: string,
  ): Promise<RecordCandidate[]> {
    const pattern = params.stem ? `%${escapeLike(params.stem)}%` : null;
    const textFilter = pattern
      ? Prisma.sql`AND (
          LOWER(g."foodName") LIKE ${pattern} ESCAPE '\\'
          OR LOWER(g."synonym") LIKE ${pattern} ESCAPE '\\'
          OR LOWER(name_tr."value") LIKE ${pattern} ESCAPE '\\'
          OR LOWER(synonym_tr."value") LIKE ${pattern} ESCAPE '\\'
        )`
      : Prisma.empty;
    const codeFilter = params.foodex2Code
      ? Prisma.sql`AND (
          m."foodex2Code" = ${params.foodex2Code}
          OR m."sourceFoodex2Code" = ${params.foodex2Code}
        )`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<RecordRow[]>`
      SELECT
        g."nevoCode"          AS "nevoCode",
        g."foodName"          AS "nameEn",
        g."synonym"           AS "synonymEn",
        name_tr."value"       AS "nameLocal",
        synonym_tr."value"    AS "synonymLocal",
        m."foodex2Code"       AS "conceptCode",
        t."termType"          AS "conceptTermType",
        m."sourceFoodex2Code" AS "sourceCode",
        m."priority"          AS "priority"
      FROM "generic_foods" g
      LEFT JOIN "entity_translations" name_tr
        ON name_tr."entityType" = 'GenericFood'
       AND name_tr."entityId" = g."id"
       AND name_tr."locale" = ${locale}
       AND name_tr."field" = 'foodName'
      LEFT JOIN "entity_translations" synonym_tr
        ON synonym_tr."entityType" = 'GenericFood'
       AND synonym_tr."entityId" = g."id"
       AND synonym_tr."locale" = ${locale}
       AND synonym_tr."field" = 'synonym'
      LEFT JOIN "foodex2_nevo_mappings" m ON m."nevoCode" = g."nevoCode"
      LEFT JOIN "foodex2_terms" t ON t."code" = m."foodex2Code"
      WHERE TRUE
        ${textFilter}
        ${codeFilter}
        ${this.foodGroupFilter(params.foodGroup, locale, Prisma.sql`g`)}
    `;

    const isDefaultLocale = locale === DEFAULT_LOCALE;
    return rows.map((row) => {
      const displayName = row.nameLocal ?? row.nameEn;
      return {
        nevoCode: row.nevoCode,
        displayName,
        names: isDefaultLocale
          ? { local: [row.nameEn, row.synonymEn], fallback: [] }
          : {
              local: [displayName, row.synonymLocal],
              fallback: [row.nameEn, row.synonymEn],
            },
        conceptCode: row.conceptCode,
        conceptTermType: row.conceptTermType,
        sourceCode: row.sourceCode,
        priority: row.priority,
      };
    });
  }

  /**
   * Concepts that may absorb records: those with a canonical NEVO record, and
   * never a dish category (see `nonCollapsibleTermTypes`).
   */
  private async findConceptCandidates(
    params: FindSearchCandidatesParams,
    stem: string,
    locale: string,
  ): Promise<ConceptCandidate[]> {
    const pattern = `%${escapeLike(stem)}%`;
    const rows = await this.prisma.$queryRaw<ConceptRow[]>`
      SELECT
        t."code"          AS "code",
        t."termType"      AS "termType",
        t."name"          AS "nameEn",
        t."shortName"     AS "shortName",
        t."synonyms"      AS "synonyms",
        tr."value"        AS "nameLocal",
        m."nevoCode"      AS "canonicalNevoCode",
        cg."foodName"     AS "canonicalNameEn",
        ctr."value"       AS "canonicalNameLocal",
        m."priority"      AS "priority",
        (
          SELECT COUNT(*)::int FROM "foodex2_nevo_mappings" v
          WHERE v."foodex2Code" = t."code"
        )                 AS "recordCount"
      FROM "foodex2_terms" t
      JOIN "foodex2_nevo_mappings" m
        ON m."foodex2Code" = t."code" AND m."isCanonical" = TRUE
      JOIN "generic_foods" cg ON cg."nevoCode" = m."nevoCode"
      LEFT JOIN "entity_translations" ctr
        ON ctr."entityType" = 'GenericFood'
       AND ctr."entityId" = cg."id"
       AND ctr."locale" = ${locale}
       AND ctr."field" = 'foodName'
      LEFT JOIN "entity_translations" tr
        ON tr."entityType" = 'Foodex2Term'
       AND tr."entityId" = t."id"
       AND tr."locale" = ${locale}
       AND tr."field" = 'name'
      WHERE t."termType" NOT IN (${Prisma.join([
        ...FOODEX2_CANONICAL_CONFIG.nonCollapsibleTermTypes,
      ])})
        AND (
          LOWER(t."name") LIKE ${pattern} ESCAPE '\\'
          OR LOWER(t."shortName") LIKE ${pattern} ESCAPE '\\'
          OR LOWER(tr."value") LIKE ${pattern} ESCAPE '\\'
          OR EXISTS (
            SELECT 1 FROM UNNEST(t."synonyms") AS s
            WHERE LOWER(s) LIKE ${pattern} ESCAPE '\\'
          )
        )
        ${this.foodGroupFilter(params.foodGroup, locale, Prisma.sql`cg`)}
    `;

    const isDefaultLocale = locale === DEFAULT_LOCALE;
    return rows.map((row) => {
      const displayName = row.nameLocal ?? row.nameEn;
      // MTX names are English; curated synonyms count as the user's language.
      const english = [row.nameEn, row.shortName];
      return {
        code: row.code,
        termType: row.termType,
        displayName,
        names: isDefaultLocale
          ? { local: [...english, ...row.synonyms], fallback: [] }
          : { local: [displayName, ...row.synonyms], fallback: english },
        canonicalNevoCode: row.canonicalNevoCode,
        canonicalName: row.canonicalNameLocal ?? row.canonicalNameEn,
        priority: row.priority,
        recordCount: row.recordCount,
      };
    });
  }
}
