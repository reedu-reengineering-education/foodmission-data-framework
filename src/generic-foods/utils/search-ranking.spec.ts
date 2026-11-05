import {
  foodex2FacetCount,
  foodGroupTier,
  isBaseForm,
  matchQuality,
  MatchQuality,
  rankSearchCandidates,
  RankableSearchCandidate,
} from './search-ranking';

const candidate = (
  nevoCode: number,
  foodName: string,
  foodGroup: string,
  extra: Partial<RankableSearchCandidate> = {},
): RankableSearchCandidate => ({
  id: String(nevoCode),
  nevoCode,
  foodName,
  synonym: null,
  foodGroup,
  foodex2Codes: [],
  translatedNames: [],
  score: 1,
  ...extra,
});

const namesOf = (ranked: RankableSearchCandidate[]) =>
  ranked.map((c) => c.foodName);

describe('search ranking', () => {
  describe('matchQuality', () => {
    it.each([
      ['milk', 'Milk', MatchQuality.EXACT],
      ['milk', 'Milk raw', MatchQuality.NAME_PREFIX],
      ['potato', 'Potatoes raw', MatchQuality.NAME_PREFIX],
      ['milk', 'Potatoes mashed w milk', MatchQuality.WORD_PREFIX],
      ['milk', 'Buttermilk', MatchQuality.INSIDE_WORD],
      ['creme', 'Crème fraîche', MatchQuality.NAME_PREFIX],
      ["olio d'oliva", 'Olio d’oliva', MatchQuality.EXACT],
      ['elstar eple', 'Elstar-eple med skall', MatchQuality.NAME_PREFIX],
      ['milk', 'Coconut', MatchQuality.NONE],
      ['milk', null, MatchQuality.NONE],
    ])('%s in %s', (term, text, expected) => {
      expect(matchQuality(term, text)).toBe(expected);
    });

    it.each([
      ['milch', 'Vollmilch', MatchQuality.NAME_PREFIX],
      ['milch', 'Vollmilch, getrocknet', MatchQuality.NAME_PREFIX],
      ['milch', 'Käse aus Rohmilch', MatchQuality.INSIDE_WORD],
      ['ei', 'Brei', MatchQuality.INSIDE_WORD],
      ['schokolade', 'Schokoladeneis', MatchQuality.WORD_PREFIX],
      ['schokolade', 'Schokoladen-Blancmanger', MatchQuality.WORD_PREFIX],
      ['schokolade', 'Schokolade extra dunkel', MatchQuality.NAME_PREFIX],
      ['kartoffel', 'Kartoffeln, roh', MatchQuality.NAME_PREFIX],
      ['melk', 'Volle melk', MatchQuality.NAME_PREFIX],
      ['melk', 'Chocolademelk uit de automaat', MatchQuality.NAME_PREFIX],
      ['ei', 'Ei, roh', MatchQuality.NAME_PREFIX],
      ['ei', 'Eisbergsalat', MatchQuality.WORD_PREFIX],
    ])('compound head: %s in %s', (term, text, expected) => {
      expect(matchQuality(term, text, { compoundHeads: true })).toBe(expected);
    });
  });

  describe('foodGroupTier', () => {
    it('puts basic ingredients first and dishes last', () => {
      expect(foodGroupTier('Vegetables')).toBe(0);
      expect(foodGroupTier('Non-alcoholic beverages')).toBe(1);
      expect(foodGroupTier('Mixed dishes')).toBe(2);
    });

    it('treats unknown groups as the middle tier', () => {
      expect(foodGroupTier('Something new')).toBe(1);
      expect(foodGroupTier(null)).toBe(1);
    });
  });

  describe('foodex2FacetCount', () => {
    it('counts facets except the F28 process facet', () => {
      expect(foodex2FacetCount(['A02LY'])).toBe(0);
      expect(foodex2FacetCount(['A02LX', 'F28.A07HS'])).toBe(0);
      expect(foodex2FacetCount(['A02MP', 'F04.A0EQS', 'F10.A077A'])).toBe(2);
    });
  });

  describe('isBaseForm', () => {
    it('recognises NEVO "raw" and "av" as whole words', () => {
      expect(isBaseForm('Apple w skin av')).toBe(true);
      expect(isBaseForm('Pasta white raw')).toBe(true);
      expect(isBaseForm('Potatoes mashed instant prepared average')).toBe(
        false,
      );
      expect(isBaseForm('Strawberry jam')).toBe(false);
    });
  });

  describe('rankSearchCandidates', () => {
    it('prefers names that start with the term over names that only contain it', () => {
      const ranked = rankSearchCandidates('milk', [
        candidate(121, 'Potatoes mashed w milk', 'Potatoes and tubers'),
        candidate(5000, 'Buttermilk', 'Milk and milk products'),
        candidate(270, 'Milk raw', 'Milk and milk products'),
      ]);

      expect(namesOf(ranked)).toEqual([
        'Milk raw',
        'Potatoes mashed w milk',
        'Buttermilk',
      ]);
    });

    it('puts basic ingredients before dishes for the same match', () => {
      const ranked = rankSearchCandidates('pasta', [
        candidate(5393, 'Pasta dish carbonara homemade', 'Mixed dishes'),
        candidate(
          2157,
          'Pasta wholemeal boiled',
          'Cereal products and types of flour',
        ),
      ]);

      expect(namesOf(ranked)).toEqual([
        'Pasta wholemeal boiled',
        'Pasta dish carbonara homemade',
      ]);
    });

    it('puts the raw / average form first, then lower NEVO codes', () => {
      const ranked = rankSearchCandidates('apple', [
        candidate(179, 'Apple sauce tinned', 'Fruits'),
        candidate(875, 'Apple w skin av', 'Fruits'),
        candidate(147, 'Apple wo skin av', 'Fruits'),
      ]);

      expect(namesOf(ranked)).toEqual([
        'Apple wo skin av',
        'Apple w skin av',
        'Apple sauce tinned',
      ]);
    });

    it('does not let trigram score demote plural names among real matches', () => {
      const ranked = rankSearchCandidates('potato', [
        candidate(671, 'Potato sweet raw', 'Potatoes and tubers', {
          score: 1,
        }),
        candidate(1, 'Potatoes raw', 'Potatoes and tubers', { score: 0.75 }),
      ]);

      expect(namesOf(ranked)).toEqual(['Potatoes raw', 'Potato sweet raw']);
    });

    it('orders typo-only matches by similarity', () => {
      const ranked = rankSearchCandidates('tomatos', [
        candidate(2, 'Tomato ketchup', 'Savoury sauces', { score: 0.6 }),
        candidate(1, 'Tomatoes raw', 'Vegetables', { score: 0.9 }),
      ]);

      expect(namesOf(ranked)).toEqual(['Tomatoes raw', 'Tomato ketchup']);
    });

    it('uses translated names for the match', () => {
      const ranked = rankSearchCandidates('tomaat', [
        candidate(1397, 'Tomatoes stewed w vegetable oil', 'Vegetables', {
          translatedNames: ['Gestoofde tomaat'],
        }),
        candidate(60, 'Tomatoes classic round raw', 'Vegetables', {
          translatedNames: ['Tomaat gewoon rauw'],
        }),
      ]);

      expect(namesOf(ranked)).toEqual([
        'Tomatoes classic round raw',
        'Tomatoes stewed w vegetable oil',
      ]);
    });

    it('treats translated compound heads like a prefix', () => {
      const ranked = rankSearchCandidates(
        'milch',
        [
          candidate(862, 'Milkshake w fresh fruit', 'Milk and milk products', {
            translatedNames: ['Milchshake mit frischen Früchten'],
          }),
          candidate(279, 'Milk whole', 'Milk and milk products', {
            translatedNames: ['Vollmilch'],
          }),
        ],
        'de',
      );

      expect(namesOf(ranked)).toEqual([
        'Milk whole',
        'Milkshake w fresh fruit',
      ]);
    });

    it('uses compound heads only for compounding locales', () => {
      const candidates = [
        candidate(1, 'Mozzarella', 'Cheese', {
          translatedNames: ['Mozzarella di latte'],
        }),
        candidate(2, 'Coffee w milk', 'Non-alcoholic beverages', {
          translatedNames: ['Caffelatte'],
        }),
      ];

      expect(namesOf(rankSearchCandidates('latte', candidates, 'it'))).toEqual([
        'Mozzarella',
        'Coffee w milk',
      ]);
      expect(namesOf(rankSearchCandidates('latte', candidates, 'de'))).toEqual([
        'Coffee w milk',
        'Mozzarella',
      ]);
    });

    it('puts translated matches before English-only ones', () => {
      const ranked = rankSearchCandidates(
        'ost',
        [
          candidate(1, 'Ostrich meat raw', 'Meat and poultry', {
            translatedNames: ['Strutsekjøtt, rått'],
          }),
          candidate(2, 'Cheese 30+', 'Cheese', {
            translatedNames: ['Ost, lett (30+)'],
          }),
        ],
        'no',
      );

      expect(namesOf(ranked)).toEqual(['Cheese 30+', 'Ostrich meat raw']);
    });

    it('puts foods with fewer FoodEx2 facets first', () => {
      const ranked = rankSearchCandidates('milk', [
        candidate(
          272,
          'Milk chocolate-flavoured full fat',
          'Milk and milk products',
          {
            foodex2Codes: ['A02MP', 'F04.A0EQS', 'F10.A077A'],
          },
        ),
        candidate(279, 'Milk whole', 'Milk and milk products', {
          foodex2Codes: ['A02LY'],
        }),
      ]);

      expect(namesOf(ranked)).toEqual([
        'Milk whole',
        'Milk chocolate-flavoured full fat',
      ]);
    });

    it('does not use compound heads for English names', () => {
      const ranked = rankSearchCandidates('apple', [
        candidate(1, 'Pineapple raw', 'Fruits'),
        candidate(2, 'Apple sauce tinned', 'Fruits'),
      ]);

      expect(namesOf(ranked)).toEqual(['Apple sauce tinned', 'Pineapple raw']);
    });

    it('is deterministic on full ties and does not modify the input', () => {
      const input = [
        candidate(1, 'Pasta B', 'Cereal products and types of flour'),
        candidate(1, 'Pasta A', 'Cereal products and types of flour'),
      ];

      expect(namesOf(rankSearchCandidates('pasta', input))).toEqual([
        'Pasta A',
        'Pasta B',
      ]);
      expect(namesOf(input)).toEqual(['Pasta B', 'Pasta A']);
    });
  });
});
