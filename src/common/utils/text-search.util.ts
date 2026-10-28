/**
 * Lowercased, unique words of a search term. Splits on spaces and on
 * punctuation between words ("chilli,beef"), but keeps apostrophes and
 * hyphens inside a word ("d'oliva", "coca-cola"). Shared with the Open Food
 * Facts search, so every search splits a term the same way.
 */
export function searchWords(search: string | undefined): string[] {
  return [
    ...new Set(
      (search ?? '')
        .toLowerCase()
        .split(/[^\p{L}\p{N}'’-]+/u)
        .filter((word) => /[\p{L}\p{N}]/u.test(word)),
    ),
  ];
}

/** Letters an inflected form may add after the stem: "pomodor-i", "pomodor-ini". */
const MAX_INFLECTION_LENGTH = 3;

/** Shorter terms must match a whole word, so "ei" does not find "eingelegt". */
const MIN_PREFIX_LENGTH = 4;

/**
 * The term without a final vowel, so plurals and other endings match:
 * "pomodoro" -> "pomodor" (pomodori), "pollo" -> "poll" (polli). Short terms
 * stay whole.
 */
export function searchStem(term: string): string {
  const lower = term.toLowerCase();
  return lower.length >= MIN_PREFIX_LENGTH
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
 * MIN_PREFIX_LENGTH must equal the word.
 */
function isWordMatch(word: string, part: string): boolean {
  if (part.length < MIN_PREFIX_LENGTH) return word === part;
  const stem = searchStem(part);
  return (
    word.startsWith(part) ||
    (word.startsWith(stem) &&
      word.length - stem.length <= MAX_INFLECTION_LENGTH)
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
