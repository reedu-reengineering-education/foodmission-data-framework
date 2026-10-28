import {
  MAX_SEARCH_WORDS,
  hasWordMatch,
  isCompoundHeadMatch,
  normalizeForSearch,
  normalizeSearchTerm,
  searchPrefix,
  searchStem,
  searchWords,
  textWords,
} from './text-search.util';

describe('searchStem', () => {
  it('drops a final vowel from terms of 4+ letters', () => {
    expect(searchStem('Pomodoro')).toBe('pomodor');
    expect(searchStem('uova')).toBe('uov');
    expect(searchStem('riso')).toBe('ris');
    expect(searchStem('pesci')).toBe('pesc');
  });

  it('keeps short terms and terms ending in a consonant whole', () => {
    expect(searchStem('uva')).toBe('uva');
    expect(searchStem('salmon')).toBe('salmon');
  });
});

describe('textWords', () => {
  it('splits on anything but letters and digits', () => {
    expect(textWords("Olio d'oliva, Tomaten-Gemüse/Saft 2")).toEqual([
      'olio',
      'd',
      'oliva',
      'tomaten',
      'gemüse',
      'saft',
      '2',
    ]);
  });
});

describe('hasWordMatch', () => {
  it.each([
    ['Pomodori crudi', 'pomodoro'],
    ['Pomodorini ciliegini', 'pomodoro'],
    ['Concentrato di pomodoro', 'pomodoro'],
    ['Petto di pollo crudo', 'Pollo'],
    ['Pomodori crudi', 'pomod'],
    ['Paste fresche', 'pasta'],
    ['Ei, gekocht', 'ei'],
    ["Olio d'oliva", "d'oliva"],
    ["Olio d'oliva", 'olio-oliva'],
    ['Eggs, beaten', 'egg'],
    ['Mini chilli beef pies', 'pie'],
  ])('%s matches %s', (text, term) => {
    expect(hasWordMatch(text, term)).toBe(true);
  });

  it.each([
    ['Cipollotti crudi', 'pollo'],
    ['Pastinaca cruda', 'pasta'],
    ['Pomodori crudi', 'pomodoroso'],
    ['Peperoni, sauer eingelegt', 'ei'],
    ['Eigelb, roh', 'ei'],
    ["Olio d'oliva", "l'oliva"],
    ['Olio di semi', "'-"],
    ['Chicken pieces', 'pie'],
    ['Eggplant', 'egg'],
  ])('%s does not match %s', (text, term) => {
    expect(hasWordMatch(text, term)).toBe(false);
  });
});

describe('searchWords', () => {
  it('splits on whitespace, lowercases and drops duplicates', () => {
    expect(searchWords('  Pasta  POMODORO pasta ')).toEqual([
      'pasta',
      'pomodoro',
    ]);
  });

  it('splits on punctuation between words', () => {
    expect(searchWords('chilli,beef; rice/peas + salt.')).toEqual([
      'chilli',
      'beef',
      'rice',
      'peas',
      'salt',
    ]);
  });

  it('keeps apostrophes and hyphens inside a word', () => {
    expect(searchWords("olio d'oliva coca-cola d’oliva")).toEqual([
      'olio',
      "d'oliva",
      'coca-cola',
      'd’oliva',
    ]);
  });

  it('keeps at most MAX_SEARCH_WORDS unique words, in order', () => {
    const words = Array.from({ length: 20 }, (_, i) => `w${i}`);
    expect(searchWords(['w0', ...words].join(' '))).toEqual(
      words.slice(0, MAX_SEARCH_WORDS),
    );
  });

  it('returns no words for an empty term or punctuation only', () => {
    expect(searchWords(undefined)).toEqual([]);
    expect(searchWords('   ')).toEqual([]);
    expect(searchWords(" ' - , ")).toEqual([]);
  });
});

describe('searchPrefix', () => {
  it('is the stem of the longest word', () => {
    expect(searchPrefix("d'oliva")).toBe('oliv');
    expect(searchPrefix('Egg')).toBe('egg');
  });

  it('is empty without letters or digits', () => {
    expect(searchPrefix("'-")).toBe('');
  });
});

describe('normalizeSearchTerm', () => {
  it.each([
    ["olio d'oliva", 'olio d oliva'],
    ['Olio d’oliva', 'olio d oliva'],
    ['Elstar-eple', 'elstar eple'],
    ['tin/glass, drained', 'tin glass drained'],
    ['Peanut butter 100%', 'peanut butter 100'],
    ['«fin» — test…', 'fin test'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeSearchTerm(input)).toBe(expected);
  });

  it('keeps accented and non-Latin letters', () => {
    expect(normalizeSearchTerm('Eple-pære')).toBe('eple pære');
    expect(normalizeSearchTerm('Ελαιόλαδο (παρθένο)')).toBe(
      'ελαιόλαδο παρθένο',
    );
    expect(normalizeSearchTerm('Ser żółty')).toBe('ser żółty');
  });
});

describe('normalizeForSearch', () => {
  it('lowercases and strips accents', () => {
    expect(normalizeForSearch(' Crème Brûlée ')).toBe('creme brulee');
  });

  it('treats punctuation as spaces', () => {
    expect(normalizeForSearch('Olio d’oliva')).toBe('olio d oliva');
  });
});

describe('isCompoundHeadMatch', () => {
  it.each([
    ['milch', 'Vollmilch', 'de', true],
    ['kartoffel', 'Kartoffeln, gekocht', 'de', true],
    ['milch', 'Käse aus Rohmilch', 'de', false],
    ['ei', 'Brei', 'de', false],
    ['milk', 'Buttermilk', 'en', false],
  ])('%s in %s (%s): %s', (term, text, locale, expected) => {
    expect(isCompoundHeadMatch(term, text, locale)).toBe(expected);
  });
});
