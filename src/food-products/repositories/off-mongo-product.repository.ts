import { Injectable, Logger } from '@nestjs/common';
import { OffMongoPrismaService } from '../../database/off-mongo-prisma.service';
import { OffProduct, Prisma } from '.prisma/off-mongo-client';
import { OpenFoodFactsSearchOptions } from '../interfaces/openfoodfacts.interface';
import { describeError } from '../../common/utils/error.utils';

/** The OFF tags meal-flag derivation reads (see `derive-meal-flags.ts`). */
export interface OffMealFacts {
  categories: string[];
  labels: string[];
  ingredientsAnalysisTags: string[];
}

const MEAL_FACTS_TIMEOUT_MS = 2000;

/**
 * Server-side limit for search queries. OpenFoodFactsService's own timeout
 * only stops waiting; this makes Mongo abort the query instead of letting it
 * keep running (and filling the cache) after the request has given up.
 * Kept below that 5000 ms timeout so Mongo's own MaxTimeMSExpired error is
 * what gets logged, not a generic "timed out".
 */
export const SEARCH_MAX_TIME_MS = 4500;

/**
 * Prisma's MongoDB connector parses findRaw options into the Rust driver's
 * FindOptions, where maxTimeMS is a Duration ({ secs, nanos }); a plain number
 * fails with "expected struct Duration". aggregateRaw takes plain milliseconds.
 */
const SEARCH_MAX_TIME_DURATION = {
  secs: Math.floor(SEARCH_MAX_TIME_MS / 1000),
  nanos: (SEARCH_MAX_TIME_MS % 1000) * 1_000_000,
};

/** _keywords-prefixed indexes on the OFF copy, by search order. */
const KEYWORD_INDEX_BY_SORT: Record<
  NonNullable<OpenFoodFactsSearchOptions['sortBy']>,
  string | undefined
> = {
  popularity: '_keywords_1_unique_scans_n_-1',
  last_modified_t: '_keywords_1_last_modified_t_-1',
  created_t: undefined,
};

export interface OffMongoSearchResult {
  items: OffProduct[];
  /** At least one more page exists (no total is counted). */
  hasMore: boolean;
  page: number;
  pageSize: number;
}

/**
 * How the search words are matched: `anchor` is the word the index scan is
 * bounded on (the rarest one), `others` are checked on each fetched product.
 */
type KeywordMatch = { anchor: string; others: string[] };

@Injectable()
export class OffMongoProductRepository {
  private readonly logger = new Logger(OffMongoProductRepository.name);

  constructor(private readonly prisma: OffMongoPrismaService) {}

  get isAvailable(): boolean {
    return this.prisma.isConfigured;
  }

  /**
   * Load a product by barcode via findRaw so language-suffixed fields
   * (product_name_de, ingredients_text_nl, …) survive. Prisma's typed
   * findUnique only returns schema-declared columns (en + bare).
   */
  async findByBarcode(
    barcode: string,
  ): Promise<Record<string, unknown> | null> {
    const rawItems = await this.prisma.offProduct.findRaw({
      filter: { _id: barcode } as Prisma.InputJsonValue,
    });
    const items = rawItems as unknown as Record<string, unknown>[];
    if (!items?.length) {
      return null;
    }
    const doc = items[0];
    return { ...doc, id: doc._id };
  }

  /**
   * Category, label and ingredient-analysis tags for several barcodes in one
   * query. Postgres `FoodProduct` rows imported from OFF don't keep these, so
   * meal-log flag derivation reads them here. Best-effort: Mongo not
   * configured, slow (>2s) or failing yields an empty map, never an error, so
   * a meal log is never blocked by it.
   */
  async findMealFactsByBarcodes(
    barcodes: string[],
  ): Promise<Map<string, OffMealFacts>> {
    const facts = new Map<string, OffMealFacts>();
    if (!this.isAvailable || barcodes.length === 0) {
      return facts;
    }

    let timer: NodeJS.Timeout | undefined;
    try {
      const rawItems = await Promise.race([
        this.prisma.offProduct.findRaw({
          filter: { _id: { $in: barcodes } } as Prisma.InputJsonValue,
          options: {
            projection: {
              categories_tags: 1,
              labels_tags: 1,
              ingredients_analysis_tags: 1,
            },
          } as Prisma.InputJsonValue,
        }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('OFF Mongo meal facts lookup timed out')),
            MEAL_FACTS_TIMEOUT_MS,
          );
        }),
      ]);

      for (const doc of rawItems as unknown as Record<string, unknown>[]) {
        facts.set(String(doc._id), {
          categories: toStringArray(doc.categories_tags),
          labels: toStringArray(doc.labels_tags),
          ingredientsAnalysisTags: toStringArray(doc.ingredients_analysis_tags),
        });
      }
    } catch (error) {
      this.logger.warn(
        `OFF Mongo meal-facts lookup failed for ${barcodes.length} barcode(s), deriving meal flags without OFF data: ${describeError(error)}`,
      );
      return new Map();
    } finally {
      clearTimeout(timer);
    }
    return facts;
  }

  // Uses findRaw/aggregateRaw instead of Prisma's regular query builder.
  // Prisma's mongodb connector compiles a where clause combining an array
  // filter (keywords hasEvery) with a scalar filter (product_name not null)
  // into an aggregation $expr, which MongoDB cannot match against the
  // _keywords index (falls back to a full IXSCAN on _id / collection scan).
  // Raw commands send a plain filter document, which lets Mongo use the
  // existing _keywords_1_* indexes.
  /**
   * One page of matches, plus whether there is another page. There is no
   * separate count query: we fetch pageSize + 1 and look at the extra item.
   *
   * Multi-word searches avoid Mongo's multi-planner: `$all: [a, b]` gives it
   * one candidate plan per word, and when few products contain all words no
   * candidate finishes its trial before maxTimeMS (seen in prod for
   * "mercadona avena"). Instead the scan is bounded on the rarest word (cheap
   * index-only counts pick it), the other words are checked via `$expr`, which
   * the planner cannot turn into index bounds, and the index is hinted. That
   * leaves exactly one plan.
   */
  async search(
    options: OpenFoodFactsSearchOptions,
  ): Promise<OffMongoSearchResult> {
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const sortBy = options.sortBy ?? 'popularity';

    const keywords = await this.resolveKeywordMatch(options.query);
    if (keywords === 'no-match') {
      return { items: [], hasMore: false, page, pageSize };
    }

    const filter = this.buildRawFilter(options, keywords);
    const findOptions: Record<string, unknown> = {
      skip: (page - 1) * pageSize,
      limit: pageSize + 1,
      sort: this.buildRawSort(sortBy),
      maxTimeMS: SEARCH_MAX_TIME_DURATION,
    };
    const hint = keywords ? KEYWORD_INDEX_BY_SORT[sortBy] : undefined;
    if (hint) {
      findOptions.hint = hint;
    }

    const rawItems = (await this.prisma.offProduct.findRaw({
      filter: filter as Prisma.InputJsonValue,
      options: findOptions as Prisma.InputJsonValue,
    })) as unknown as Record<string, unknown>[];

    const hasMore = rawItems.length > pageSize;
    const items = rawItems
      .slice(0, pageSize)
      .map((doc) => ({ ...doc, id: doc._id }) as unknown as OffProduct);

    return { items, hasMore, page, pageSize };
  }

  /**
   * null: no search words. 'no-match': some word appears in no product, so
   * nothing can match all words. Otherwise the rarest word anchors the scan.
   */
  private async resolveKeywordMatch(
    query: string | undefined,
  ): Promise<KeywordMatch | 'no-match' | null> {
    const words = [
      ...new Set(
        (query ?? '')
          .toLowerCase()
          .split(/\s+/)
          .filter((word) => word.length > 0),
      ),
    ];
    if (words.length === 0) return null;
    if (words.length === 1) return { anchor: words[0], others: [] };

    const counts = await Promise.all(
      words.map((word) => this.countKeyword(word)),
    );
    if (counts.some((count) => count === 0)) return 'no-match';

    const rarest = counts.indexOf(Math.min(...counts));
    return {
      anchor: words[rarest],
      others: words.filter((_, index) => index !== rarest),
    };
  }

  /** Index-only count of products with this keyword (reads no documents). */
  private async countKeyword(word: string): Promise<number> {
    const result = (await this.prisma.$runCommandRaw({
      count: 'products',
      query: { _keywords: word },
      hint: KEYWORD_INDEX_BY_SORT.popularity,
      maxTimeMS: SEARCH_MAX_TIME_MS,
    })) as { n?: number | { $numberLong: string } };
    const n = result.n;
    return typeof n === 'object' && n !== null
      ? Number(n.$numberLong)
      : (n ?? 0);
  }

  private buildRawFilter(
    options: OpenFoodFactsSearchOptions,
    keywords: KeywordMatch | null,
  ): Record<string, unknown> {
    const and: Record<string, unknown>[] = [];

    if (options.categories && options.categories.length > 0) {
      and.push({ categories_tags: { $in: options.categories } });
    }

    if (options.brands && options.brands.length > 0) {
      and.push({ brands_tags: { $in: options.brands } });
    }

    if (options.countries && options.countries.length > 0) {
      and.push({ countries_tags: { $in: options.countries } });
    }

    const filter: Record<string, unknown> = {
      product_name: { $exists: true, $nin: [null, ''] },
    };
    if (keywords) {
      filter._keywords = keywords.anchor;
      if (keywords.others.length > 0) {
        filter.$expr = { $setIsSubset: [keywords.others, '$_keywords'] };
      }
    }
    if (and.length > 0) {
      filter.$and = and;
    }

    return filter;
  }

  /**
   * Every option matches an index on the OFF copy, so Mongo reads results in
   * order and stops after one page instead of sorting all matches in memory.
   * Default is popularity (OFF's unique_scans_n, served by
   * _keywords_1_unique_scans_n_-1): well-known products first.
   */
  private buildRawSort(
    sortBy: OpenFoodFactsSearchOptions['sortBy'] = 'popularity',
  ): Record<string, 1 | -1> {
    switch (sortBy) {
      case 'created_t':
        return { created_t: -1 };
      case 'last_modified_t':
        return { last_modified_t: -1 };
      case 'popularity':
        return { unique_scans_n: -1 };
    }
  }
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string')
    : [];
}
