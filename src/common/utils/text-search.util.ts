/**
 * Lowercased, unique words of a search term. Shared with the Open Food Facts
 * search, so every search splits a term the same way.
 */
export function searchWords(search: string | undefined): string[] {
  return [
    ...new Set(
      (search ?? '')
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 0),
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

/**
 * True when a word of `text` starts with `term` ("pomod" finds "pomodoro"), or
 * is an inflected form of it: its stem plus a short ending ("pomodoro" finds
 * "pomodori", "pasta" finds "paste" but not "pastinaca"). Words, not
 * substrings, so "pollo" does not find "cipollotti". Terms shorter than
 * MIN_PREFIX_LENGTH must equal a word.
 */
export function hasWordMatch(text: string, term: string): boolean {
  const needle = term.toLowerCase();
  const stem = searchStem(needle);
  const matches =
    needle.length < MIN_PREFIX_LENGTH
      ? (word: string) => word === needle
      : (word: string) =>
          word.startsWith(needle) ||
          (word.startsWith(stem) &&
            word.length - stem.length <= MAX_INFLECTION_LENGTH);
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .some(matches);
}
