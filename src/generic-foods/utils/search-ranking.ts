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
  /** FoodEx2 base term plus facets, e.g. ["A02LZ", "F09.A0EXH"]. */
  foodex2Codes: string[];
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

/**
 * Shortest term treated as a compound head, so "ei" does not match "Brei".
 */
const MIN_COMPOUND_HEAD_LENGTH = 4;

/** Locales whose food names are compound words with the head last. */
const COMPOUNDING_LOCALES = new Set(['de', 'nl', 'no']);

/** Plural/case ending still counted as the same word ("Kartoffel-n"). */
const MAX_INFLECTION_LENGTH = 2;

/**
 * FoodEx2 facets that make a food more specific: added ingredients (F04),
 * fortification (F09), qualitative info like "sugar added" (F10), ... F28
 * (process: raw, boiled) is left out, isBaseForm already covers it.
 */
const SPECIFYING_FACET = /^F(?!28\.)\d{2}\./;

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

/**
 * The first word of a compound-language name, with hyphenated parts joined:
 * "Schokoladen-Blancmanger, ..." -> "schokoladenblancmanger".
 */
function firstCompound(text: string): string {
  return normalizeForSearch(text.trim().split(/[\s,]+/u)[0] ?? '').replace(
    / /g,
    '',
  );
}

/**
 * `compoundHeads`: judge the first word as a compound. In German, Dutch and
 * Norwegian the last part names the food: "Vollmilch" is milk, "Milchshake" is
 * a shake. So a first word ending in the term (or the term plus a short
 * plural ending) counts like a name prefix, and one only starting with it like
 * a word prefix. Only the first word, so "Käse aus Rohmilch" stays cheese. Off
 * for English ("Pineapple").
 */
export function matchQuality(
  term: string,
  text: string | null,
  { compoundHeads = false }: { compoundHeads?: boolean } = {},
): number {
  if (!text) return MatchQuality.NONE;
  const needle = normalizeForSearch(term);
  const haystack = normalizeForSearch(text);
  if (!needle) return MatchQuality.NONE;

  if (haystack === needle) return MatchQuality.EXACT;
  if (compoundHeads && needle.length >= MIN_COMPOUND_HEAD_LENGTH) {
    const first = firstCompound(text);
    if (first.endsWith(needle)) return MatchQuality.NAME_PREFIX;
    if (first.startsWith(needle)) {
      return first.length - needle.length <= MAX_INFLECTION_LENGTH
        ? MatchQuality.NAME_PREFIX
        : MatchQuality.WORD_PREFIX;
    }
  }
  if (haystack.startsWith(needle)) return MatchQuality.NAME_PREFIX;
  const words = wordsOf(text);
  if (words.some((word) => word.startsWith(needle))) {
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

/** Number of specifying FoodEx2 facets; 0 = plain base term like "Milk whole". */
export function foodex2FacetCount(codes: string[]): number {
  return codes.filter((code) => SPECIFYING_FACET.test(code)).length;
}

export function isBaseForm(foodName: string): boolean {
  return wordsOf(foodName).some((word) => BASE_FORM_WORDS.has(word));
}

/** Candidates sorted best first; does not modify the input. */
export function rankSearchCandidates<T extends RankableSearchCandidate>(
  term: string,
  candidates: T[],
  locale = 'en',
): T[] {
  const compoundHeads = COMPOUNDING_LOCALES.has(locale);
  const keyed = candidates.map((candidate) => ({
    candidate,
    quality: Math.max(
      ...[candidate.foodName, candidate.synonym].map((text) =>
        matchQuality(term, text),
      ),
      ...candidate.translatedNames.map((text) =>
        matchQuality(term, text, { compoundHeads }),
      ),
    ),
    tier: foodGroupTier(candidate.foodGroup),
    baseForm: isBaseForm(candidate.foodName) ? 0 : 1,
    facets: foodex2FacetCount(candidate.foodex2Codes ?? []),
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
      a.facets - b.facets ||
      a.candidate.nevoCode - b.candidate.nevoCode ||
      a.candidate.foodName.localeCompare(b.candidate.foodName),
  );

  return keyed.map((entry) => entry.candidate);
}
