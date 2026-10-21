/**
 * Relevance ranking for generic food (NEVO) search.
 *
 * pg_trgm decides which foods match and gives a similarity score, but that
 * score only measures how alike the text looks: "Crisps potato" beats
 * "Potatoes raw" for "potato". These signals put the basic food first.
 */

export type RankableSearchCandidate = {
  id: string;
  nevoCode: number;
  foodName: string;
  synonym: string | null;
  /** Canonical English food group. */
  foodGroup: string;
  /** Translated name/synonym for the request locale (empty for English). */
  translatedNames: string[];
  /** pg_trgm word_similarity, 0..1. */
  score: number;
};

/** How the term appears in a text, best = 4. */
export const MatchQuality = {
  EXACT: 4,
  NAME_PREFIX: 3,
  WORD_PREFIX: 2,
  INSIDE_WORD: 1,
  NONE: 0,
} as const;

/** Basic ingredients people usually mean. */
const BASIC_GROUPS = new Set(
  [
    'Fruits',
    'Vegetables',
    'Potatoes and tubers',
    'Legumes',
    'Cereal products and types of flour',
    'Meat and poultry',
    'Fish, crustacean and shellfish',
    'Eggs',
    'Milk and milk products',
    'Cheese',
    'Nuts and seeds',
    'Fats and oils',
    'Herbs and spices',
    'Bread',
  ].map((group) => group.toLowerCase()),
);

/** Dishes and composite products: shown after everything else. */
const COMPOSITE_GROUPS = new Set(
  [
    'Mixed dishes',
    'Soups',
    'Pastry and biscuits',
    'Savoury snacks',
    'Foods for special nutritional use',
  ].map((group) => group.toLowerCase()),
);

/** NEVO marks the generic form with "raw" or "av" (average). */
const BASE_FORM_WORDS = new Set(['raw', 'av']);

/**
 * Whitespace, ASCII punctuation and common Unicode quotes/dashes. Mirrors the
 * character class in the SQL function search_normalize() (migration
 * 20261022120000_add_search_normalize_indexes) — change both together.
 */
const SEPARATOR_RUN =
  /[\s!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~’‘´“”„«»‹›–—…·]+/gu;

/**
 * Same result as SQL search_normalize(): lowercase, punctuation runs become a
 * single space. Letters (including accents) are kept. Used for the search term
 * so it compares like-for-like with the normalized columns.
 */
export function normalizeSearchTerm(text: string): string {
  return text.toLowerCase().replace(SEPARATOR_RUN, ' ').trim();
}

/** As normalizeSearchTerm, plus accents stripped ("Crème" ~ "creme"); ranking only. */
export function normalizeForSearch(text: string): string {
  return normalizeSearchTerm(text.normalize('NFD').replace(/\p{M}/gu, ''));
}

export function wordsOf(text: string): string[] {
  return normalizeForSearch(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 0);
}

export function matchQuality(term: string, text: string | null): number {
  if (!text) return MatchQuality.NONE;
  const needle = normalizeForSearch(term);
  const haystack = normalizeForSearch(text);
  if (!needle) return MatchQuality.NONE;

  if (haystack === needle) return MatchQuality.EXACT;
  if (haystack.startsWith(needle)) return MatchQuality.NAME_PREFIX;
  if (wordsOf(text).some((word) => word.startsWith(needle))) {
    return MatchQuality.WORD_PREFIX;
  }
  if (haystack.includes(needle)) return MatchQuality.INSIDE_WORD;
  return MatchQuality.NONE;
}

/** 0 = basic ingredient, 1 = other, 2 = dish / composite. */
export function foodGroupTier(foodGroup: string | null): 0 | 1 | 2 {
  const group = (foodGroup ?? '').trim().toLowerCase();
  if (BASIC_GROUPS.has(group)) return 0;
  if (COMPOSITE_GROUPS.has(group)) return 2;
  return 1;
}

export function isBaseForm(foodName: string): boolean {
  return wordsOf(foodName).some((word) => BASE_FORM_WORDS.has(word));
}

/** Candidates sorted best first; does not modify the input. */
export function rankSearchCandidates<T extends RankableSearchCandidate>(
  term: string,
  candidates: T[],
): T[] {
  const keyed = candidates.map((candidate) => ({
    candidate,
    quality: Math.max(
      ...[
        candidate.foodName,
        candidate.synonym,
        ...candidate.translatedNames,
      ].map((text) => matchQuality(term, text)),
    ),
    tier: foodGroupTier(candidate.foodGroup),
    baseForm: isBaseForm(candidate.foodName) ? 0 : 1,
  }));

  keyed.sort(
    (a, b) =>
      b.quality - a.quality ||
      // Similarity only orders typo matches. For real matches it penalises
      // plurals ("Potatoes raw" vs "potato") and adds nothing over `quality`.
      (a.quality === MatchQuality.NONE
        ? b.candidate.score - a.candidate.score
        : 0) ||
      a.tier - b.tier ||
      a.baseForm - b.baseForm ||
      a.candidate.nevoCode - b.candidate.nevoCode ||
      a.candidate.foodName.localeCompare(b.candidate.foodName),
  );

  return keyed.map((entry) => entry.candidate);
}
