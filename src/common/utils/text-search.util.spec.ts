import {
  hasWordMatch,
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

  it('returns no words for an empty term or punctuation only', () => {
    expect(searchWords(undefined)).toEqual([]);
    expect(searchWords('   ')).toEqual([]);
    expect(searchWords(" ' - , ")).toEqual([]);
  });
});
