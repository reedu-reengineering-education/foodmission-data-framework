import { Injectable } from '@nestjs/common';
import { GenericFood, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DEFAULT_LOCALE } from '../../i18n/constants';
import { FOODEX2_CANONICAL_CONFIG } from '../foodex2/foodex2-canonical.config';

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
 * Words that introduce an ingredient instead of naming the food.
 *
 * NEVO names are head-first — "Omelett mit Kartoffeln", "Pasta white wo egg
 * boiled" — so everything from the first of these words on describes what was
 * added, not what the food *is*.
 */
const MODIFIER_WORDS = [
  'mit',
  'met',
  'with',
  'w',
  'wo',
  'without',
  'und',
  'and',
  'en',
  'in',
  'im',
  'auf',
  'op',
  'ohne',
  'zonder',
  'from',
  'van',
];

/**
 * Drops a German plural `-n`, so a search matches the singular a food is
 * usually named with: *Frühlingsrollen* finds "Frühlingsrolle", *Kartoffeln*
 * finds "Kartoffelpüree".
 *
 * Only ever *shortens* the pattern, and every tier but the exact-name one
 * matches on a substring, so a wrong guess widens the search instead of
 * breaking it. Short words are left alone — "Wein" must not become "Wei".
 */
function singularize(term: string): string {
  return term.length >= 5 && /[aeiouäöü]n$/.test(term)
    ? term.slice(0, -1)
    : term;
}

/** Cuts a food name down to its head phrase; see {@link MODIFIER_WORDS}. */
const HEAD_PHRASE_PATTERN = `\\s+(${MODIFIER_WORDS.join('|')})\\s.*$`;

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
   * The head of a food name, lowercased: everything before the first comma or
   * modifier word.
   *
   * A concept collapses every NEVO record filed under it, so an unrestricted
   * name match makes an ingredient pull in an unrelated concept — "Omelett mit
   * Kartoffeln" is filed under *Egg based dishes*, which then answered a search
   * for "Kartoffeln". Matching only the head keeps *Nudeln* finding "Weiße
   * Nudeln, roh" while "Klare Suppe mit Nudeln" stays a soup.
   */
  private headPhrase(column: Prisma.Sql): Prisma.Sql {
    return Prisma.sql`regexp_replace(
      split_part(LOWER(${column}), ',', 1),
      ${HEAD_PHRASE_PATTERN},
      ''
    )`;
  }

  /**
   * Matches a concept's own name in any of the locales it is translated into.
   *
   * MTX is English-only, so without this a German query finds a concept only
   * through its NEVO records — "Kartoffeln" would rank *Kartoffeln und
   * ähnliche* below foods that merely mention potatoes.
   */
  private translatedTermName(pattern: string): Prisma.Sql {
    return Prisma.sql`EXISTS (
      SELECT 1 FROM "entity_translations" ltr
      WHERE ltr."entityType" = 'Foodex2Term'
        AND ltr."entityId" = t."id"
        AND ltr."field" = 'name'
        AND LOWER(ltr."value") LIKE ${pattern} ESCAPE '\\'
    )`;
  }

  /**
   * The composite (recipe-based) branch of the MTX hierarchy, as a CTE.
   *
   * Recursion runs downwards from a single root, so it walks the ~866 dish and
   * bakery terms rather than the whole 29908-term catalogue.
   */
  private compositeBranch(): Prisma.Sql {
    return Prisma.sql`
      WITH RECURSIVE "composite_terms" AS (
        SELECT "code" FROM "foodex2_terms"
        WHERE "code" = ${FOODEX2_CANONICAL_CONFIG.compositeFoodRootCode}
        UNION ALL
        SELECT child."code"
        FROM "foodex2_terms" child
        JOIN "composite_terms" parent ON child."parentCode" = parent."code"
      )
    `;
  }

  /**
   * Matches any NEVO record behind a concept.
   *
   * A plain concept matches in *any* locale, so "Möhren" finds the carrot
   * whatever `lang` says; only the display name follows the locale. The rest
   * of a composite concept is held to the requested locale, because word order
   * differs per language and the head rule below relies on it: the Slovenian
   * "Paprika, polnjena s kremnim sirom" is head-initial where the German "Mit
   * Frischkäse gefüllte Paprika" is not, which would put *Finger food* back
   * into a search for peppers.
   *
   * Only the head of a variant name counts, and a hit here still ranks below a
   * canonical-name match: the concept was reached through a record the user
   * did not name.
   *
   * Under a composite concept a non-canonical record has to be *named* after
   * the term, not merely mention it: the head has to start with it. A dish is
   * named after its recipe, so a word further along is an ingredient — "Mit
   * Frischkäse gefüllte Paprika" is what made "Paprika" return a frozen rice
   * ball from *Finger food*. Requiring the head instead of dropping these
   * records outright keeps the dish names users actually search: *Finger food*
   * still answers "Frühlingsrolle", *Nudelgerichte* still answers "Lasagne".
   */
  private variantMatch(pattern: string, locale: string): Prisma.Sql {
    // A plain concept, and a composite concept's own canonical record, are
    // read leniently; the rest of a composite concept is not.
    const lenient = Prisma.sql`(
      vm."isCanonical" = TRUE
      OR t."code" NOT IN (SELECT "code" FROM "composite_terms")
    )`;
    // Anywhere in the head when lenient, only at the front of it otherwise.
    const variantPattern = Prisma.sql`(CASE
      WHEN ${lenient} THEN ${`%${pattern}%`}
      ELSE ${`${pattern}%`}
    END)`;

    return Prisma.sql`EXISTS (
      SELECT 1
      FROM "foodex2_nevo_mappings" vm
      JOIN "generic_foods" g ON g."nevoCode" = vm."nevoCode"
      LEFT JOIN "entity_translations" gtr
        ON gtr."entityType" = 'GenericFood'
       AND gtr."entityId" = g."id"
       AND gtr."field" IN ('foodName', 'synonym')
      WHERE vm."foodex2Code" = t."code"
        AND (
          ${this.headPhrase(Prisma.sql`g."foodName"`)} LIKE ${variantPattern} ESCAPE '\\'
          OR ${this.headPhrase(Prisma.sql`g."synonym"`)} LIKE ${variantPattern} ESCAPE '\\'
          OR (
            (${lenient} OR gtr."locale" = ${locale})
            AND ${this.headPhrase(Prisma.sql`gtr."value"`)} LIKE ${variantPattern} ESCAPE '\\'
          )
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
    // The exact-name tier compares the term as typed; every other tier matches
    // the stem, so a plural still finds the food.
    const pattern = escapeLike(singularize(term));
    const locale = params.locale ?? DEFAULT_LOCALE;
    const coreOnly = params.coreOnly ?? false;

    // COALESCE keeps one code path for every locale: with no translation row
    // (English, or an untranslated concept) it falls back to the MTX name.
    const displayName = Prisma.sql`COALESCE(tr."value", t."name")`;
    // Ranked on the head as well, so the rank agrees with what matched.
    const canonicalName = this.headPhrase(
      Prisma.sql`COALESCE(ctr."value", cg."foodName")`,
    );
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
          OR ${this.translatedTermName(`%${pattern}%`)}
          OR ${this.variantMatch(pattern, locale)}
        )`
      : Prisma.sql`TRUE`;

    const matchRank = term
      ? Prisma.sql`CASE
          WHEN LOWER(${displayName}) = ${term} OR LOWER(t."name") = ${term} THEN 0
          WHEN LOWER(t."shortName") = ${term} THEN 1
          WHEN LOWER(${displayName}) LIKE ${`${pattern}%`} ESCAPE '\\'
            OR LOWER(t."name") LIKE ${`${pattern}%`} ESCAPE '\\'
            OR ${this.translatedTermName(`${pattern}%`)} THEN 2
          WHEN LOWER(t."shortName") LIKE ${`${pattern}%`} ESCAPE '\\' THEN 3
          WHEN LOWER(${displayName}) LIKE ${`%${pattern}%`} ESCAPE '\\'
            OR LOWER(t."name") LIKE ${`%${pattern}%`} ESCAPE '\\'
            OR ${this.translatedTermName(`%${pattern}%`)} THEN 4
          WHEN LOWER(t."shortName") LIKE ${`%${pattern}%`} ESCAPE '\\' THEN 5
          WHEN EXISTS (
            SELECT 1 FROM UNNEST(t."synonyms") AS s
            WHERE LOWER(s) LIKE ${`%${pattern}%`} ESCAPE '\\'
          ) THEN 6
          WHEN ${canonicalName} LIKE ${`${pattern}%`} ESCAPE '\\' THEN 7
          WHEN ${canonicalName} LIKE ${`%${pattern}%`} ESCAPE '\\' THEN 8
          ELSE 9
        END`
      : Prisma.sql`0`;

    const coreFilter = coreOnly
      ? Prisma.sql`AND t."isCore" = TRUE`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<Foodex2SearchRow[]>`
      ${this.compositeBranch()}
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
      ${this.compositeBranch()}
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
