/**
 * Words used from a search term; the rest are ignored. Each word costs a
 * database query (Open Food Facts keyword counts, recipe translation
 * lookups), so a long pasted text cannot fan out into hundreds of them.
 */
export const MAX_SEARCH_WORDS = 8;

/**
 * Lowercased, unique words of a search term, at most MAX_SEARCH_WORDS. Splits
 * on spaces and on punctuation between words ("chilli,beef"), but keeps
 * apostrophes and hyphens inside a word ("d'oliva", "coca-cola"). Shared with
 * the Open Food Facts search, so every search splits a term the same way.
 */
export function searchWords(search: string | undefined): string[] {
  return [
    ...new Set(
      (search ?? '')
        .toLowerCase()
        .split(/[^\p{L}\p{N}'’-]+/u)
        .filter((word) => /[\p{L}\p{N}]/u.test(word)),
    ),
  ].slice(0, MAX_SEARCH_WORDS);
}

/**
 * Shortest term matched as part of a word: as a prefix, by its stem, or as a
 * compound head. Shorter terms must be the whole word, plus at most one
 * letter ("egg" finds "eggs"), so "ei" finds neither "eingelegt" nor "Brei".
 */
const MIN_PARTIAL_MATCH_LENGTH = 4;

/** Letters a word may add after the term's stem: "pomodor-i", "pomodor-ini". */
const MAX_STEM_ENDING_LENGTH = 3;

/** Plural/case ending a compound head may add after the term: "Kartoffel-n". */
const MAX_HEAD_ENDING_LENGTH = 2;

/** Locales whose food names are compound words with the head last. */
const COMPOUNDING_LOCALES = new Set(['de', 'nl', 'no']);

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

/** As normalizeSearchTerm, plus accents stripped ("Crème" ~ "creme"). */
export function normalizeForSearch(text: string): string {
  return normalizeSearchTerm(text.normalize('NFD').replace(/\p{M}/gu, ''));
}

/**
 * The term without a final vowel, so plurals and other endings match:
 * "pomodoro" -> "pomodor" (pomodori), "pollo" -> "poll" (polli). Short terms
 * stay whole.
 */
export function searchStem(term: string): string {
  const lower = term.toLowerCase();
  return lower.length >= MIN_PARTIAL_MATCH_LENGTH
    ? lower.replace(/[aeiouàèéìòù]$/u, '')
    : lower;
}

/** Lowercased words, split on anything but letters and digits: "Olio d'oliva" -> olio, d, oliva. */
export function textWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 0);
}

/**
 * True when `word` starts with `part` ("pomod" finds "pomodoro"), or is an
 * inflected form of it: its stem plus a short ending ("pomodoro" finds
 * "pomodori", "pasta" finds "paste" but not "pastinaca"). Parts shorter than
 * MIN_PARTIAL_MATCH_LENGTH must equal the word, plus at most one letter.
 */
function isWordMatch(word: string, part: string): boolean {
  if (part.length < MIN_PARTIAL_MATCH_LENGTH) {
    return word.startsWith(part) && word.length - part.length <= 1;
  }
  const stem = searchStem(part);
  return (
    word.startsWith(part) ||
    (word.startsWith(stem) &&
      word.length - stem.length <= MAX_STEM_ENDING_LENGTH)
  );
}

/**
 * True when every word of `term` matches a word of `text` (see isWordMatch),
 * so "d'oliva" finds "Olio d'oliva". Words, not substrings, so "pollo" does
 * not find "cipollotti".
 */
export function hasWordMatch(text: string, term: string): boolean {
  const words = textWords(text);
  const parts = textWords(term);
  return (
    parts.length > 0 &&
    parts.every((part) => words.some((word) => isWordMatch(word, part)))
  );
}

/** True when every word of `term` is a word of `text` as is: "pie" in "Fish pie", not "pies". */
export function hasExactWordMatch(text: string, term: string): boolean {
  const words = new Set(textWords(text));
  const parts = textWords(term);
  return parts.length > 0 && parts.every((part) => words.has(part));
}

/**
 * A substring of every text hasWordMatch accepts for `term`: the stem of its
 * longest word ("d'oliva" -> "oliv"). Lets SQL narrow the rows before the
 * word check runs in code. Empty when the term has no letters or digits.
 */
export function searchPrefix(term: string): string {
  const [longest] = textWords(term).sort((a, b) => b.length - a.length);
  return longest ? searchStem(longest) : '';
}

/** Food names in this locale are compound words with the head last. */
export function isCompoundingLocale(locale: string): boolean {
  return COMPOUNDING_LOCALES.has(locale);
}

/** One word with hyphenated parts joined: "Schokoladen-Blancmanger" -> "schokoladenblancmanger". */
function joinedWord(word: string): string {
  return normalizeForSearch(word).replace(/ /g, '');
}

/**
 * Words of a compound-language name that can name the food: the first word,
 * plus the second when the name starts with two words before any comma
 * ("Volle melk", "Rode kool, gekookt").
 */
export function headCandidates(text: string): {
  first: string;
  second?: string;
} {
  const lead = (text.split(',')[0] ?? '').trim().split(/\s+/u);
  return {
    first: joinedWord(lead[0] ?? ''),
    second: lead.length === 2 ? joinedWord(lead[1]) : undefined,
  };
}

/**
 * A leading word of `text` (see headCandidates) names the same food as the
 * normalized `needle`: equal to it, a compound ending in it ("vollmilch" for
 * "milch"), or it plus a short plural ending ("kartoffeln"). Only the leading
 * words, so "Käse aus Rohmilch" stays cheese.
 */
export function hasCompoundHead(text: string, needle: string): boolean {
  const long = needle.length >= MIN_PARTIAL_MATCH_LENGTH;
  const isHead = (word: string) =>
    word === needle ||
    (long &&
      (word.endsWith(needle) ||
        (word.startsWith(needle) &&
          word.length - needle.length <= MAX_HEAD_ENDING_LENGTH)));
  const { first, second } = headCandidates(text);
  return isHead(first) || (second !== undefined && isHead(second));
}

/**
 * In a compounding locale, `text` names the food `term` as a compound head:
 * "milch" finds "Vollmilch", "kartoffel" finds "Kartoffeln".
 */
export function isCompoundHeadMatch(
  term: string,
  text: string,
  locale: string,
): boolean {
  const needle = normalizeForSearch(term);
  return (
    isCompoundingLocale(locale) &&
    needle.length > 0 &&
    hasCompoundHead(text, needle)
  );
}
