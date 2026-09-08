import { Injectable } from '@nestjs/common';
import { GenericFood, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DEFAULT_LOCALE } from '../../i18n/constants';

/** One FoodEx2 concept together with its canonical NEVO record. */
export interface Foodex2SearchRow {
  termId: string;
  code: string;
  /** Localized when a translation exists, English otherwise. */
  name: string;
  nameEn: string;
  shortName: string | null;
  isCore: boolean;
  parentCode: string | null;
  nevoCode: number;
  sourceFoodex2Code: string;
  hierarchyDepth: number;
  variantCount: number;
  matchRank: number;
}

export interface Foodex2SearchResult {
  rows: Foodex2SearchRow[];
  total: number;
}

/** Escapes LIKE wildcards so a query such as `50%` is matched literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * Reads the FoodEx2 vocabulary.
 *
 * Only concepts that carry a canonical NEVO mapping are ever returned, so a
 * user can never pick a food the application has no nutritional values for.
 */
@Injectable()
export class Foodex2Repository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Joins the translated FoodEx2 name for a locale.
   *
   * MTX is English-only, so a concept's localized name lives in
   * `entity_translations` like every other translatable entity.
   */
  private translationJoin(locale: string): Prisma.Sql {
    return Prisma.sql`
      LEFT JOIN "entity_translations" tr
        ON tr."entityType" = 'Foodex2Term'
       AND tr."entityId" = t."id"
       AND tr."locale" = ${locale}
       AND tr."field" = 'name'
    `;
  }

  /**
   * Joins the canonical NEVO record's name, localized when available.
   *
   * Used both for ranking and for the "Nudeln" case below: the concept name may
   * be untranslated while its canonical NEVO record ("Weiße Nudeln, roh") is.
   */
  private canonicalNameJoin(locale: string): Prisma.Sql {
    return Prisma.sql`
      JOIN "generic_foods" cg ON cg."nevoCode" = m."nevoCode"
      LEFT JOIN "entity_translations" ctr
        ON ctr."entityType" = 'GenericFood'
       AND ctr."entityId" = cg."id"
       AND ctr."locale" = ${locale}
       AND ctr."field" = 'foodName'
    `;
  }

  /**
   * Matches any NEVO record behind a concept, in the requested locale.
   *
   * Ranked below a canonical-name match, because a hit here is often
   * incidental: "Klare Suppe mit Nudeln" makes *Nudeln* match the soup concept
   * even though the soup is not a pasta.
   */
  private variantMatch(pattern: string, locale: string): Prisma.Sql {
    return Prisma.sql`EXISTS (
      SELECT 1
      FROM "foodex2_nevo_mappings" vm
      JOIN "generic_foods" g ON g."nevoCode" = vm."nevoCode"
      LEFT JOIN "entity_translations" gtr
        ON gtr."entityType" = 'GenericFood'
       AND gtr."entityId" = g."id"
       AND gtr."locale" = ${locale}
       AND gtr."field" IN ('foodName', 'synonym')
      WHERE vm."foodex2Code" = t."code"
        AND (
          LOWER(g."foodName") LIKE ${`%${pattern}%`} ESCAPE '\\'
          OR LOWER(g."synonym") LIKE ${`%${pattern}%`} ESCAPE '\\'
          OR LOWER(gtr."value") LIKE ${`%${pattern}%`} ESCAPE '\\'
        )
    )`;
  }

  /**
   * Ranked, case-insensitive search over FoodEx2 names.
   *
   * Ranking follows the project's search conventions: exact name, then prefix,
   * then substring, then synonyms, and finally a match on one of the concept's
   * NEVO variant names. Ordering is fully deterministic — shorter (more
   * generic) names first, with the FoodEx2 code as the final tiebreak — so
   * paging never reshuffles results.
   */
  async search(params: {
    search?: string;
    coreOnly?: boolean;
    locale?: string;
    skip: number;
    take: number;
  }): Promise<Foodex2SearchResult> {
    const term = params.search?.trim().toLowerCase() ?? '';
    const pattern = escapeLike(term);
    const locale = params.locale ?? DEFAULT_LOCALE;
    const coreOnly = params.coreOnly ?? false;

    // COALESCE keeps one code path for every locale: with no translation row
    // (English, or an untranslated concept) it falls back to the MTX name.
    const displayName = Prisma.sql`COALESCE(tr."value", t."name")`;
    const canonicalName = Prisma.sql`COALESCE(ctr."value", cg."foodName")`;
    const join = Prisma.sql`${this.translationJoin(locale)} ${this.canonicalNameJoin(locale)}`;

    // An empty query browses the vocabulary; every row then shares rank 0.
    const matches = term
      ? Prisma.sql`(
          LOWER(${displayName}) LIKE ${`%${pattern}%`} ESCAPE '\\'
          OR LOWER(t."name") LIKE ${`%${pattern}%`} ESCAPE '\\'
          OR LOWER(t."shortName") LIKE ${`%${pattern}%`} ESCAPE '\\'
          OR EXISTS (
            SELECT 1 FROM UNNEST(t."synonyms") AS s
            WHERE LOWER(s) LIKE ${`%${pattern}%`} ESCAPE '\\'
          )
          OR ${this.variantMatch(pattern, locale)}
        )`
      : Prisma.sql`TRUE`;

    const matchRank = term
      ? Prisma.sql`CASE
          WHEN LOWER(${displayName}) = ${term} OR LOWER(t."name") = ${term} THEN 0
          WHEN LOWER(t."shortName") = ${term} THEN 1
          WHEN LOWER(${displayName}) LIKE ${`${pattern}%`} ESCAPE '\\'
            OR LOWER(t."name") LIKE ${`${pattern}%`} ESCAPE '\\' THEN 2
          WHEN LOWER(t."shortName") LIKE ${`${pattern}%`} ESCAPE '\\' THEN 3
          WHEN LOWER(${displayName}) LIKE ${`%${pattern}%`} ESCAPE '\\'
            OR LOWER(t."name") LIKE ${`%${pattern}%`} ESCAPE '\\' THEN 4
          WHEN LOWER(t."shortName") LIKE ${`%${pattern}%`} ESCAPE '\\' THEN 5
          WHEN EXISTS (
            SELECT 1 FROM UNNEST(t."synonyms") AS s
            WHERE LOWER(s) LIKE ${`%${pattern}%`} ESCAPE '\\'
          ) THEN 6
          WHEN LOWER(${canonicalName}) LIKE ${`${pattern}%`} ESCAPE '\\' THEN 7
          WHEN LOWER(${canonicalName}) LIKE ${`%${pattern}%`} ESCAPE '\\' THEN 8
          ELSE 9
        END`
      : Prisma.sql`0`;

    const coreFilter = coreOnly
      ? Prisma.sql`AND t."isCore" = TRUE`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<Foodex2SearchRow[]>`
      SELECT
        t."id"                AS "termId",
        t."code"              AS "code",
        ${displayName}        AS "name",
        t."name"              AS "nameEn",
        t."shortName"         AS "shortName",
        t."isCore"            AS "isCore",
        t."parentCode"        AS "parentCode",
        m."nevoCode"          AS "nevoCode",
        m."sourceFoodex2Code" AS "sourceFoodex2Code",
        m."hierarchyDepth"    AS "hierarchyDepth",
        (
          SELECT COUNT(*)::int FROM "foodex2_nevo_mappings" v
          WHERE v."foodex2Code" = t."code"
        )                     AS "variantCount",
        ${matchRank}          AS "matchRank"
      FROM "foodex2_terms" t
      JOIN "foodex2_nevo_mappings" m
        ON m."foodex2Code" = t."code" AND m."isCanonical" = TRUE
      ${join}
      WHERE ${matches} ${coreFilter}
      ORDER BY "matchRank" ASC, LENGTH(${displayName}) ASC, ${displayName} ASC, t."code" ASC
      LIMIT ${params.take} OFFSET ${params.skip}
    `;

    const [{ count }] = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count
      FROM "foodex2_terms" t
      JOIN "foodex2_nevo_mappings" m
        ON m."foodex2Code" = t."code" AND m."isCanonical" = TRUE
      ${join}
      WHERE ${matches} ${coreFilter}
    `;

    return { rows, total: Number(count) };
  }

  /** The FoodEx2 concept for a code, or `null` when it has no canonical NEVO item. */
  async findByCode(
    code: string,
    locale: string = DEFAULT_LOCALE,
  ): Promise<Foodex2SearchRow | null> {
    const rows = await this.prisma.$queryRaw<Foodex2SearchRow[]>`
      SELECT
        t."id"                       AS "termId",
        t."code"                     AS "code",
        COALESCE(tr."value", t."name") AS "name",
        t."name"                     AS "nameEn",
        t."shortName"                AS "shortName",
        t."isCore"                   AS "isCore",
        t."parentCode"               AS "parentCode",
        m."nevoCode"                 AS "nevoCode",
        m."sourceFoodex2Code"        AS "sourceFoodex2Code",
        m."hierarchyDepth"           AS "hierarchyDepth",
        (
          SELECT COUNT(*)::int FROM "foodex2_nevo_mappings" v
          WHERE v."foodex2Code" = t."code"
        )                            AS "variantCount",
        0                            AS "matchRank"
      FROM "foodex2_terms" t
      JOIN "foodex2_nevo_mappings" m
        ON m."foodex2Code" = t."code" AND m."isCanonical" = TRUE
      ${this.translationJoin(locale)}
      WHERE t."code" = ${code.trim().toUpperCase()}
      LIMIT 1
    `;
    return rows[0] ?? null;
  }

  /**
   * Loads the NEVO records backing a set of concepts.
   *
   * Nutrients are read straight off `GenericFood` — FoodEx2 references NEVO and
   * never stores its own copy of the nutritional values.
   */
  async findGenericFoodsByNevoCodes(
    nevoCodes: number[],
  ): Promise<Map<number, GenericFood>> {
    if (nevoCodes.length === 0) return new Map();

    const foods = await this.prisma.genericFood.findMany({
      where: { nevoCode: { in: nevoCodes } },
    });
    return new Map(foods.map((food) => [food.nevoCode, food]));
  }
}
