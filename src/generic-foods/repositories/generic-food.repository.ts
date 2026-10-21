import { Injectable } from '@nestjs/common';
import { GenericFood, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateGenericFoodDto } from '../dto/create-generic-food.dto';
import { UpdateGenericFoodDto } from '../dto/update-generic-food.dto';
import { GenericFoodQueryDto } from '../dto/generic-food-query.dto';
import { DEFAULT_LOCALE } from '../../i18n/constants';
import {
  normalizeSearchTerm,
  RankableSearchCandidate,
} from '../utils/search-ranking';

/** A search hit with what ranking needs (see utils/search-ranking.ts). */
export type GenericFoodSearchCandidate = RankableSearchCandidate & {
  /** The term appears literally (ILIKE) rather than only as a close typo. */
  substringMatch: boolean;
};

/** Escape LIKE wildcards so user input is matched literally. */
function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, '\\$&');
}

export type GenericFoodFindAllContext = {
  /** Entity IDs whose translated foodName/synonym match search (non-English). */
  localizedSearchIds?: string[];
  /** Entity IDs whose translated foodGroup matches filter (non-English). */
  localizedFoodGroupIds?: string[];
};

@Injectable()
export class GenericFoodRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateGenericFoodDto) {
    return this.prisma.genericFood.create({
      data,
    });
  }

  async findAll(
    query: GenericFoodQueryDto,
    context?: GenericFoodFindAllContext,
  ) {
    const { search, foodGroup, page = 1, limit = 20, lang } = query;
    const skip = (page - 1) * limit;
    const locale = (lang ?? DEFAULT_LOCALE).toLowerCase();
    const localizedSearchIds = context?.localizedSearchIds;
    const localizedFoodGroupIds = context?.localizedFoodGroupIds;
    const useLocalizedSearch =
      Boolean(search) &&
      locale !== DEFAULT_LOCALE &&
      Array.isArray(localizedSearchIds);
    const useLocalizedFoodGroup =
      Boolean(foodGroup) &&
      locale !== DEFAULT_LOCALE &&
      Array.isArray(localizedFoodGroupIds);

    const where: Prisma.GenericFoodWhereInput = {};
    const conditions: Prisma.GenericFoodWhereInput[] = [];

    if (search) {
      const englishMatch: Prisma.GenericFoodWhereInput = {
        OR: [
          { foodName: { contains: search, mode: 'insensitive' } },
          {
            AND: [
              { synonym: { not: null } },
              { synonym: { contains: search, mode: 'insensitive' } },
            ],
          },
        ],
      };

      if (useLocalizedSearch && localizedSearchIds.length > 0) {
        conditions.push({
          OR: [englishMatch, { id: { in: localizedSearchIds } }],
        });
      } else {
        conditions.push(englishMatch);
      }
    }

    if (foodGroup) {
      conditions.push(
        this.foodGroupCondition(
          foodGroup,
          useLocalizedFoodGroup ? localizedFoodGroupIds : undefined,
        ),
      );
    }

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    const [items, total] = await Promise.all([
      this.prisma.genericFood.findMany({
        where,
        skip,
        take: limit,
        orderBy: { foodName: 'asc' },
      }),
      this.prisma.genericFood.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * All foods matching `term`, unordered (ranking happens in the service). A food matches when its
   * English name/synonym — or, for other locales, its translated name/synonym —
   * contains the term — compared with punctuation as spaces (search_normalize) —
   * or is a close typo of it (pg_trgm `<%`, i.e.
   * word_similarity >= 0.6). Uses the trigram GIN indexes.
   *
   * Callers decide whether to keep typo-only matches (see `substringMatch`).
   */
  async findSearchCandidates(
    term: string,
    locale: string,
  ): Promise<GenericFoodSearchCandidate[]> {
    // Compare like-for-like with search_normalize() on the columns, which is
    // what the *_norm_trgm_idx expression indexes cover.
    const normalized = normalizeSearchTerm(term);
    if (!normalized) return [];
    const pattern = `%${escapeLike(normalized)}%`;

    if (locale === DEFAULT_LOCALE) {
      return this.prisma.$queryRaw<GenericFoodSearchCandidate[]>`
        SELECT g.id,
               g."nevoCode",
               g."foodName",
               g.synonym,
               g."foodGroup",
               '{}'::text[] AS "translatedNames",
               (search_normalize(g."foodName") LIKE ${pattern}
                 OR COALESCE(search_normalize(g.synonym) LIKE ${pattern}, false)) AS "substringMatch",
               GREATEST(
                 word_similarity(${normalized}, search_normalize(g."foodName")),
                 COALESCE(word_similarity(${normalized}, search_normalize(g.synonym)), 0)
               )::float8 AS score
        FROM generic_foods g
        WHERE search_normalize(g."foodName") LIKE ${pattern}
           OR ${normalized} <% search_normalize(g."foodName")
           OR search_normalize(g.synonym) LIKE ${pattern}
           OR ${normalized} <% search_normalize(g.synonym)`;
    }

    return this.prisma.$queryRaw<GenericFoodSearchCandidate[]>`
      SELECT g.id,
             g."nevoCode",
             g."foodName",
             g.synonym,
             g."foodGroup",
             ARRAY_REMOVE(ARRAY_AGG(t.value), NULL) AS "translatedNames",
             BOOL_OR(
               search_normalize(g."foodName") LIKE ${pattern}
               OR COALESCE(search_normalize(g.synonym) LIKE ${pattern}, false)
               OR COALESCE(search_normalize(t.value) LIKE ${pattern}, false)
             ) AS "substringMatch",
             GREATEST(
               word_similarity(${normalized}, search_normalize(g."foodName")),
               COALESCE(word_similarity(${normalized}, search_normalize(g.synonym)), 0),
               COALESCE(MAX(word_similarity(${normalized}, search_normalize(t.value))), 0)
             )::float8 AS score
      FROM generic_foods g
      LEFT JOIN entity_translations t
        ON t."entityType" = 'GenericFood'
       AND t."entityId" = g.id
       AND t.locale = ${locale}
       AND t.field IN ('foodName', 'synonym')
      WHERE search_normalize(g."foodName") LIKE ${pattern}
         OR ${normalized} <% search_normalize(g."foodName")
         OR search_normalize(g.synonym) LIKE ${pattern}
         OR ${normalized} <% search_normalize(g.synonym)
         OR search_normalize(t.value) LIKE ${pattern}
         OR ${normalized} <% search_normalize(t.value)
      GROUP BY g.id`;
  }

  /** The subset of `ids` whose food group matches (English or translated). */
  async filterIdsByFoodGroup(
    ids: string[],
    foodGroup: string,
    localizedFoodGroupIds?: string[],
  ): Promise<string[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.genericFood.findMany({
      where: {
        AND: [
          { id: { in: ids } },
          this.foodGroupCondition(foodGroup, localizedFoodGroupIds),
        ],
      },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  /** Full rows for the given ids (order not guaranteed). */
  async findByIds(ids: string[]): Promise<GenericFood[]> {
    if (ids.length === 0) return [];
    return this.prisma.genericFood.findMany({
      where: { id: { in: ids } },
    });
  }

  private foodGroupCondition(
    foodGroup: string,
    localizedFoodGroupIds?: string[],
  ): Prisma.GenericFoodWhereInput {
    const englishFoodGroup: Prisma.GenericFoodWhereInput = {
      foodGroup: { contains: foodGroup, mode: 'insensitive' },
    };
    return localizedFoodGroupIds && localizedFoodGroupIds.length > 0
      ? { OR: [englishFoodGroup, { id: { in: localizedFoodGroupIds } }] }
      : englishFoodGroup;
  }

  findById(id: string) {
    return this.prisma.genericFood.findUnique({
      where: { id },
    });
  }

  update(id: string, data: UpdateGenericFoodDto) {
    return this.prisma.genericFood.update({
      where: { id },
      data,
    });
  }

  delete(id: string) {
    return this.prisma.genericFood.delete({
      where: { id },
    });
  }

  findByNevoCode(nevoCode: number) {
    return this.prisma.genericFood.findUnique({
      where: { nevoCode },
    });
  }

  /**
   * Distinct English food groups with one sample entity id each
   * (for resolving localized group labels).
   */
  async getDistinctFoodGroups(): Promise<
    { foodGroup: string; sampleId: string }[]
  > {
    const result = await this.prisma.genericFood.findMany({
      select: { id: true, foodGroup: true },
      distinct: ['foodGroup'],
      orderBy: [{ foodGroup: 'asc' }, { id: 'asc' }],
    });

    return result.map((r) => ({
      foodGroup: r.foodGroup,
      sampleId: r.id,
    }));
  }
}
