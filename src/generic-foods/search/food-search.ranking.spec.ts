import {
  ConceptCandidate,
  FALLBACK_TIER_OFFSET,
  MATCH_TIER,
  matchTier,
  parseSearchQuery,
  rankFoodSearch,
  RecordCandidate,
  SearchQuery,
  splitHead,
} from './food-search.ranking';

function query(raw: string): SearchQuery {
  const parsed = parseSearchQuery(raw);
  if (!parsed) throw new Error(`"${raw}" is not a search query`);
  return parsed;
}

function record(
  nevoCode: number,
  name: string,
  overrides: Partial<RecordCandidate> = {},
): RecordCandidate {
  return {
    nevoCode,
    displayName: name,
    names: { local: [name], fallback: [] },
    conceptCode: null,
    conceptTermType: null,
    sourceCode: null,
    priority: null,
    ...overrides,
  };
}

function concept(
  code: string,
  name: string,
  canonicalNevoCode: number,
  overrides: Partial<ConceptCandidate> = {},
): ConceptCandidate {
  return {
    code,
    termType: 's',
    displayName: name,
    names: { local: [name], fallback: [] },
    canonicalNevoCode,
    canonicalName: `record ${canonicalNevoCode}`,
    priority: 100,
    recordCount: 2,
    ...overrides,
  };
}

/**
 * Mirrors the real data around pasta:
 *   A007L Dried pasta (concept) ← A007P Dried durum pasta ← two NEVO records
 *   A03VT Pasta based dishes (dish category) ← A040P Lasagna ← two records,
 *         plus Bami goreng filed directly under the category.
 */
const PASTA_RECORDS = [
  record(4, 'Pasta white raw', {
    conceptCode: 'A007L',
    conceptTermType: 's',
    sourceCode: 'A007P',
    priority: 180,
  }),
  record(5, 'Pasta white wo egg boiled', {
    conceptCode: 'A007L',
    conceptTermType: 's',
    sourceCode: 'A007P',
    priority: 40,
  }),
  record(10, 'Lasagna bolognese ready to eat', {
    conceptCode: 'A03VT',
    conceptTermType: 'c',
    sourceCode: 'A040P',
    priority: 50,
  }),
  record(11, 'Lasagna w vegetables ready-to-eat', {
    conceptCode: 'A03VT',
    conceptTermType: 'c',
    sourceCode: 'A040P',
    priority: 45,
  }),
  record(12, 'Chinese noodle dish Bami goreng wo egg', {
    conceptCode: 'A03VT',
    conceptTermType: 'c',
    sourceCode: 'A03VT',
    priority: 70,
  }),
];
const PASTA_CONCEPTS = [
  concept('A007L', 'Dried pasta', 4, { recordCount: 2 }),
  concept('A03VT', 'Pasta based dishes, cooked', 12, { termType: 'c' }),
];

function search(raw: string | null) {
  return rankFoodSearch(
    PASTA_RECORDS,
    PASTA_CONCEPTS,
    raw === null ? null : query(raw),
    { collapse: true },
  );
}

describe('parseSearchQuery', () => {
  it('trims and lowercases the term', () => {
    expect(parseSearchQuery('  Pasta ')).toEqual({
      term: 'pasta',
      stem: 'pasta',
    });
  });

  it('returns null when there is nothing to search for', () => {
    expect(parseSearchQuery(undefined)).toBeNull();
    expect(parseSearchQuery('   ')).toBeNull();
  });

  it('drops a German plural -n from the stem only', () => {
    expect(parseSearchQuery('Kartoffeln')).toEqual({
      term: 'kartoffeln',
      stem: 'kartoffel',
    });
  });

  it('leaves short words alone', () => {
    expect(parseSearchQuery('Wein')?.stem).toBe('wein');
  });
});

describe('splitHead', () => {
  it('cuts at the first comma', () => {
    expect(splitHead('Weiße Nudeln, roh')).toEqual({
      head: 'weiße nudeln',
      tail: ['roh'],
    });
  });

  it('cuts at the first modifier word', () => {
    expect(splitHead('Omelett mit Kartoffeln, spanische Tortilla')).toEqual({
      head: 'omelett',
      tail: ['kartoffeln', 'spanische', 'tortilla'],
    });
  });

  it('never cuts before the first word', () => {
    expect(splitHead('Met worst').head).toBe('met worst');
  });
});

describe('matchTier', () => {
  it.each([
    ['Gulasch', 'Gulasch', MATCH_TIER.EXACT],
    ['Kartoffeln, roh', 'Kartoffeln', MATCH_TIER.LEADING_WORD],
    ['Hummus mit Gemüse', 'Hummus', MATCH_TIER.LEADING_WORD],
    ['Hummus natur', 'Hummus', MATCH_TIER.LEADING_WORD],
    ['Kartoffelpüree', 'Kartoffeln', MATCH_TIER.PREFIX],
    ['Pizza Margherita', 'pizza', MATCH_TIER.LEADING_WORD],
    ['Vollmilch', 'Milch', MATCH_TIER.WORD],
    ['Weißer Reis, roh', 'Reis', MATCH_TIER.WORD],
    ['Milchschokolade', 'Milch', MATCH_TIER.PREFIX],
    ['Rohes Möhrenbündel', 'Möhren', MATCH_TIER.WORD_PREFIX],
    ['Omelett mit Kartoffeln', 'Kartoffeln', MATCH_TIER.MENTION],
  ])('"%s" for "%s" is tier %i', (name, raw, tier) => {
    expect(matchTier(name, query(raw))).toBe(tier);
  });

  it('only reads a compound head off the last word', () => {
    // "-freier" is an adjective ending, not the food "Eier".
    expect(matchTier('Alkoholfreier Wein', query('Eier'))).toBe(
      MATCH_TIER.SUBSTRING,
    );
  });

  it('does not treat a two-letter stem as a compound head', () => {
    expect(matchTier('Reisbrei', query('ei'))).toBe(MATCH_TIER.SUBSTRING);
  });

  it('returns null when the name does not match', () => {
    expect(matchTier('Carrot raw', query('pasta'))).toBeNull();
  });
});

describe('rankFoodSearch', () => {
  it('collapses the records of a concept the query names into one row', () => {
    const hits = search('dried pasta');

    expect(hits).toEqual([
      {
        nevoCode: 4,
        concept: { code: 'A007L', displayName: 'Dried pasta' },
        groupCode: 'A007L',
        tier: MATCH_TIER.EXACT,
      },
    ]);
  });

  it('returns the named records, not the canonical record of their category', () => {
    const hits = search('lasagna');

    // Bami goreng — the category's canonical record — never answers a
    // search for lasagne. The two lasagnas are two dishes, so neither folds
    // into the other; the plainer one comes first.
    expect(hits).toEqual([
      {
        nevoCode: 10,
        concept: null,
        groupCode: null,
        tier: MATCH_TIER.LEADING_WORD,
      },
      {
        nevoCode: 11,
        concept: null,
        groupCode: null,
        tier: MATCH_TIER.LEADING_WORD,
      },
    ]);
  });

  it('never collapses a dish category, even when the query names it', () => {
    const hits = search('pasta');

    expect(hits.map((hit) => hit.concept?.code ?? hit.nevoCode)).toEqual([
      'A007L',
    ]);
    expect(search('bami')).toEqual([
      expect.objectContaining({ nevoCode: 12, concept: null, groupCode: null }),
    ]);
  });

  it('ranks a named concept as well as its best hidden record', () => {
    const hits = rankFoodSearch(
      [
        record(1, 'Hähnchen, roh', {
          conceptCode: 'A01SP',
          conceptTermType: 'r',
          sourceCode: 'A01SP',
        }),
        record(2, 'Hähnchen mit Grillwurst', {
          conceptCode: 'A025N',
          conceptTermType: 'd',
          sourceCode: 'A025N',
        }),
      ],
      [concept('A01SP', 'Frisches Hähnchenfleisch', 1)],
      query('Hähnchen'),
      { collapse: true },
    );

    expect(
      hits.map((hit) => [hit.concept?.code ?? hit.nevoCode, hit.tier]),
    ).toEqual([
      ['A01SP', MATCH_TIER.LEADING_WORD],
      [2, MATCH_TIER.LEADING_WORD],
    ]);
  });

  it('answers a single-record concept with the record under its own name', () => {
    const hits = rankFoodSearch(
      [],
      [
        concept('A007E', 'Nudeln ungefüllt ungekocht', 659, {
          canonicalName: 'Weiße Nudeln, gekocht',
          recordCount: 1,
        }),
      ],
      query('Nudeln'),
      { collapse: true },
    );

    // The concept name found it, but "ungekocht" would mislabel boiled pasta.
    // It ranks by the name it shows, not by the concept name.
    expect(hits).toEqual([
      {
        nevoCode: 659,
        concept: null,
        groupCode: 'A007E',
        tier: MATCH_TIER.WORD,
      },
    ]);
  });

  it('answers a record named exactly by the query instead of its concept', () => {
    const bananas = [
      record(1, 'Banane', {
        conceptCode: 'A01LB',
        conceptTermType: 'r',
        sourceCode: 'A01LC',
      }),
      record(2, 'Reife Kochbanane, roh', {
        conceptCode: 'A01LB',
        conceptTermType: 'r',
        sourceCode: 'A01LE',
        priority: 200,
      }),
    ];
    const hits = rankFoodSearch(
      bananas,
      [concept('A01LB', 'Bananen und ähnliche', 2)],
      query('Banane'),
      { collapse: true },
    );

    // Not *Bananen und ähnliche*, whose canonical record is the plantain.
    expect(hits[0]).toEqual({
      nevoCode: 1,
      concept: null,
      groupCode: 'A01LC',
      tier: MATCH_TIER.EXACT,
    });
    expect(hits.some((hit) => hit.concept !== null)).toBe(false);
  });

  it('puts the more common concept first on a tie', () => {
    const hits = rankFoodSearch(
      [],
      [
        concept('A02LV', 'Kuhmilch', 1, { recordCount: 8 }),
        concept('A02MC', 'Muttermilch', 2, { recordCount: 2 }),
      ],
      query('Milch'),
      { collapse: true },
    );

    expect(hits.map((hit) => hit.concept?.code)).toEqual(['A02LV', 'A02MC']);
  });

  it('ranks hits in the requested language above English-only ones', () => {
    const hits = rankFoodSearch(
      [
        record(1, 'Pasta, roh', {
          names: { local: ['Pasta, roh'], fallback: ['Pasta white raw'] },
        }),
        record(2, 'Weiße Nudeln', {
          names: { local: ['Weiße Nudeln'], fallback: ['Pasta'] },
        }),
      ],
      [],
      query('pasta'),
      { collapse: true },
    );

    expect(hits.map((hit) => [hit.nevoCode, hit.tier])).toEqual([
      [1, MATCH_TIER.LEADING_WORD],
      [2, MATCH_TIER.EXACT + FALLBACK_TIER_OFFSET],
    ]);
  });

  it('lists every record, most generic first, when not collapsing', () => {
    const hits = rankFoodSearch(PASTA_RECORDS.slice(0, 2), [], null, {
      collapse: false,
    });

    expect(hits.map((hit) => [hit.nevoCode, hit.groupCode])).toEqual([
      [4, null],
      [5, null],
    ]);
  });

  it('orders deterministically', () => {
    expect(search('pasta')).toEqual(search('pasta'));
    expect(search(null)).toEqual(search(null));
  });
});
