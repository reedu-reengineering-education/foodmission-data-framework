import {
  Foodex2HierarchyNode,
  NevoCandidate,
  parseFoodex2BaseCode,
  rankNevoCandidates,
  resolveConceptCode,
  scoreNevoCandidate,
  selectCanonicalNevo,
} from './foodex2-resolution';
import {
  FOODEX2_CANONICAL_CONFIG,
  FOODEX2_DETAIL_LEVEL,
} from './foodex2-canonical.config';

/**
 * Mirrors the real MTX shape around pasta:
 *   A007G Pasta (hierarchy)
 *     └ A007L Dried pasta (core)
 *         ├ A007P Dried durum pasta (extended)
 *         └ A007Q Dried wholemeal pasta (extended)
 */
const nodes = new Map<string, Foodex2HierarchyNode>(
  (
    [
      {
        code: 'A007G',
        detailLevel: FOODEX2_DETAIL_LEVEL.HIERARCHY,
        parentCode: null,
      },
      {
        code: 'A007L',
        detailLevel: FOODEX2_DETAIL_LEVEL.CORE,
        parentCode: 'A007G',
      },
      {
        code: 'A007P',
        detailLevel: FOODEX2_DETAIL_LEVEL.EXTENDED,
        parentCode: 'A007L',
      },
      {
        code: 'A007Q',
        detailLevel: FOODEX2_DETAIL_LEVEL.EXTENDED,
        parentCode: 'A007L',
      },
      // A grouping EFSA files under M with no core ancestor, e.g. "Dried herbs".
      {
        code: 'A016T',
        detailLevel: FOODEX2_DETAIL_LEVEL.MIXED,
        parentCode: 'A016S',
      },
      {
        code: 'A016S',
        detailLevel: FOODEX2_DETAIL_LEVEL.HIERARCHY,
        parentCode: null,
      },
    ] satisfies Foodex2HierarchyNode[]
  ).map((node) => [node.code, node]),
);

describe('parseFoodex2BaseCode', () => {
  it('takes the base term from a full FoodEx2 expression', () => {
    // NEVO publishes "A00ZX#F28.A07HS"; the importer stores it split.
    expect(parseFoodex2BaseCode(['A00ZX', 'F28.A07HS'])).toBe('A00ZX');
  });

  it('normalises case', () => {
    expect(parseFoodex2BaseCode(['a007l'])).toBe('A007L');
  });

  it('returns null when there is no usable base code', () => {
    expect(parseFoodex2BaseCode([])).toBeNull();
    expect(parseFoodex2BaseCode([''])).toBeNull();
    expect(parseFoodex2BaseCode(['F28.A07HS'])).toBeNull();
    expect(parseFoodex2BaseCode(['TOO-LONG'])).toBeNull();
  });
});

describe('resolveConceptCode', () => {
  it('rolls an extended term up to its core ancestor', () => {
    expect(resolveConceptCode('A007P', nodes)).toEqual({
      conceptCode: 'A007L',
      hierarchyDepth: 1,
      via: 'core',
    });
  });

  it('keeps a core term as its own concept', () => {
    expect(resolveConceptCode('A007L', nodes)).toEqual({
      conceptCode: 'A007L',
      hierarchyDepth: 0,
      via: 'core',
    });
  });

  it('maps sibling extended terms onto the same concept', () => {
    expect(resolveConceptCode('A007P', nodes)?.conceptCode).toBe(
      resolveConceptCode('A007Q', nodes)?.conceptCode,
    );
  });

  it('falls back to an M/P grouping when no core ancestor exists', () => {
    expect(resolveConceptCode('A016T', nodes)).toEqual({
      conceptCode: 'A016T',
      hierarchyDepth: 0,
      via: 'fallback',
    });
  });

  it('returns null for an unknown code', () => {
    expect(resolveConceptCode('A18PR', nodes)).toBeNull();
  });

  it('returns null when only hierarchy terms are in the chain', () => {
    expect(resolveConceptCode('A007G', nodes)).toBeNull();
  });

  it('terminates on a cyclic hierarchy', () => {
    const cyclic = new Map<string, Foodex2HierarchyNode>([
      ['A1', { code: 'A1', detailLevel: 'H', parentCode: 'A2' }],
      ['A2', { code: 'A2', detailLevel: 'H', parentCode: 'A1' }],
    ]);
    expect(resolveConceptCode('A1', cyclic)).toBeNull();
  });
});

describe('scoreNevoCandidate', () => {
  const candidate = (
    overrides: Partial<NevoCandidate> &
      Pick<NevoCandidate, 'nevoCode' | 'foodName'>,
  ): NevoCandidate => ({
    sourceFoodex2Code: 'A007P',
    hierarchyDepth: 0,
    ...overrides,
  });

  it('prefers raw over cooked for the same food', () => {
    const raw = scoreNevoCandidate(
      candidate({ nevoCode: 4, foodName: 'Pasta white raw' }),
    );
    const boiled = scoreNevoCandidate(
      candidate({ nevoCode: 2779, foodName: 'Pasta white boiled' }),
    );
    expect(raw.priority).toBeGreaterThan(boiled.priority);
  });

  it("does not read 'raw milk' as a preparation state", () => {
    const rawMilk = scoreNevoCandidate(
      candidate({ nevoCode: 1112, foodName: 'Cheese raw milk 48' }),
    );
    const raw = scoreNevoCandidate(
      candidate({ nevoCode: 1113, foodName: 'Cheese raw 48' }),
    );
    expect(rawMilk.priority).toBeLessThan(raw.priority);
  });

  it('scores the most processed state when a name carries several', () => {
    const both = scoreNevoCandidate(
      candidate({ nevoCode: 1, foodName: 'Beans raw boiled' }),
    );
    expect(both.selectionReason).toContain('prep:boiled');
  });

  it("rewards NEVO's own generic averages", () => {
    const average = scoreNevoCandidate(
      candidate({ nevoCode: 2336, foodName: 'Beef av raw' }),
    );
    const specific = scoreNevoCandidate(
      candidate({ nevoCode: 2337, foodName: 'Beef rib raw' }),
    );
    expect(average.priority).toBeGreaterThan(specific.priority);
  });

  it('penalises fortified variants', () => {
    const plain = scoreNevoCandidate(
      candidate({ nevoCode: 4, foodName: 'Pasta raw' }),
    );
    const fortified = scoreNevoCandidate(
      candidate({ nevoCode: 3191, foodName: 'Pasta fortified raw' }),
    );
    expect(fortified.priority).toBeLessThan(plain.priority);
  });

  it('penalises deeper hierarchy roll-ups', () => {
    const direct = scoreNevoCandidate(
      candidate({ nevoCode: 4, foodName: 'Pasta raw', hierarchyDepth: 0 }),
    );
    const distant = scoreNevoCandidate(
      candidate({ nevoCode: 5, foodName: 'Pasta raw', hierarchyDepth: 2 }),
    );
    expect(distant.priority).toBeLessThan(direct.priority);
  });

  it('records why a candidate scored what it did', () => {
    const scored = scoreNevoCandidate(
      candidate({ nevoCode: 4, foodName: 'Pasta white raw' }),
    );
    expect(scored.selectionReason).toContain('prep:raw=100');
    expect(scored.selectionReason).toContain('depth0=0');
  });

  it('is a pure function of the candidate and config', () => {
    const input = candidate({ nevoCode: 4, foodName: 'Pasta white raw' });
    expect(scoreNevoCandidate(input, FOODEX2_CANONICAL_CONFIG)).toEqual(
      scoreNevoCandidate(input, FOODEX2_CANONICAL_CONFIG),
    );
  });
});

describe('selectCanonicalNevo', () => {
  const pastaVariants: NevoCandidate[] = [
    {
      nevoCode: 2779,
      foodName: 'Pasta white wo egg boiled',
      sourceFoodex2Code: 'A007P',
      hierarchyDepth: 1,
    },
    {
      nevoCode: 4,
      foodName: 'Pasta white raw',
      sourceFoodex2Code: 'A007P',
      hierarchyDepth: 1,
    },
    {
      nevoCode: 3191,
      foodName: 'Pasta fortified w fibre raw',
      sourceFoodex2Code: 'A007Q',
      hierarchyDepth: 1,
    },
  ];

  it('elects exactly one canonical record, never an aggregate', () => {
    const { canonical, ranked } = selectCanonicalNevo(pastaVariants);

    expect(canonical?.nevoCode).toBe(4);
    expect(ranked).toHaveLength(3);
    expect(
      ranked.filter((c) => c.nevoCode === canonical?.nevoCode),
    ).toHaveLength(1);
  });

  it('is deterministic regardless of input order', () => {
    const forward = selectCanonicalNevo(pastaVariants).canonical?.nevoCode;
    const reversed = selectCanonicalNevo([...pastaVariants].reverse()).canonical
      ?.nevoCode;
    expect(forward).toBe(reversed);
  });

  it('breaks score ties on the lowest NEVO code', () => {
    const tied: NevoCandidate[] = [
      {
        nevoCode: 5280,
        foodName: 'Veal av raw',
        sourceFoodex2Code: 'A01QV',
        hierarchyDepth: 0,
      },
      {
        nevoCode: 2336,
        foodName: 'Beef av raw',
        sourceFoodex2Code: 'A01QV',
        hierarchyDepth: 0,
      },
    ];
    const { canonical, tiedCandidates } = selectCanonicalNevo(tied);

    expect(canonical?.nevoCode).toBe(2336);
    // Ties are surfaced so the import report can flag them for review.
    expect(tiedCandidates.map((c) => c.nevoCode)).toEqual([5280]);
  });

  it('reports no canonical record for an empty candidate set', () => {
    expect(selectCanonicalNevo([])).toEqual({
      canonical: null,
      ranked: [],
      tiedCandidates: [],
    });
  });
});

describe('rankNevoCandidates', () => {
  it('orders by score descending, then NEVO code ascending', () => {
    const scored = [
      {
        nevoCode: 9,
        foodName: 'b',
        sourceFoodex2Code: 'X',
        hierarchyDepth: 0,
        priority: 10,
        selectionReason: '',
      },
      {
        nevoCode: 2,
        foodName: 'a',
        sourceFoodex2Code: 'X',
        hierarchyDepth: 0,
        priority: 10,
        selectionReason: '',
      },
      {
        nevoCode: 1,
        foodName: 'c',
        sourceFoodex2Code: 'X',
        hierarchyDepth: 0,
        priority: 99,
        selectionReason: '',
      },
    ];
    expect(rankNevoCandidates(scored).map((c) => c.nevoCode)).toEqual([
      1, 2, 9,
    ]);
  });
});
