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

/**
 * Conditions for a free-text search, meant to be OR-ed: any of `fields`
 * contains `search` (case-insensitive), or the id is one of `translatedIds`,
 * the entities whose translation matched (see
 * TranslationService.findEntityIdsByValue).
 */
export function textSearchConditions<TWhere>(
  search: string,
  fields: readonly (keyof TWhere & string)[],
  translatedIds: string[] = [],
): TWhere[] {
  return [
    ...fields.map((field) => ({
      [field]: { contains: search, mode: 'insensitive' },
    })),
    ...(translatedIds.length > 0 ? [{ id: { in: translatedIds } }] : []),
  ] as TWhere[];
}

/** Letters an inflected form may add after the stem: "pomodor-i", "pomodor-ini". */
const MAX_INFLECTION_LENGTH = 3;

/**
 * The term without a final vowel, so plurals and other endings match:
 * "pomodoro" -> "pomodor" (pomodori), "pollo" -> "poll" (polli). Short terms
 * stay whole.
 */
export function searchStem(term: string): string {
  const lower = term.toLowerCase();
  return lower.length >= 4 ? lower.replace(/[aeiouàèéìòù]$/u, '') : lower;
}

/**
 * True when a word of `text` starts with `term` ("pomod" finds "pomodoro"), or
 * is an inflected form of it: its stem plus a short ending ("pomodoro" finds
 * "pomodori", "pasta" finds "paste" but not "pastinaca"). Words, not
 * substrings, so "pollo" does not find "cipollotti".
 */
export function hasWordMatch(text: string, term: string): boolean {
  const needle = term.toLowerCase();
  const stem = searchStem(needle);
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .some(
      (word) =>
        word.startsWith(needle) ||
        (word.startsWith(stem) &&
          word.length - stem.length <= MAX_INFLECTION_LENGTH),
    );
}
