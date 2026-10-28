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
 * contains `search` (case-insensitive), or `idField` is one of
 * `translatedIds`, the entities whose translation matched (see
 * TranslationService.findEntityIdsByValue).
 */
export function textSearchConditions<TWhere>(
  search: string,
  fields: readonly (keyof TWhere & string)[],
  translatedIds: string[] = [],
  idField: keyof TWhere & string = 'id' as keyof TWhere & string,
): TWhere[] {
  return [
    ...fields.map((field) => ({
      [field]: { contains: search, mode: 'insensitive' },
    })),
    ...(translatedIds.length > 0 ? [{ [idField]: { in: translatedIds } }] : []),
  ] as TWhere[];
}
