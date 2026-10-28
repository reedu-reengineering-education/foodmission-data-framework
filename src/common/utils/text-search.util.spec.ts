import { hasWordMatch, searchStem, searchWords } from './text-search.util';

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

describe('hasWordMatch', () => {
  it.each([
    ['Pomodori crudi', 'pomodoro'],
    ['Pomodorini ciliegini', 'pomodoro'],
    ['Concentrato di pomodoro', 'pomodoro'],
    ['Petto di pollo crudo', 'Pollo'],
    ['Pomodori crudi', 'pomod'],
    ['Paste fresche', 'pasta'],
    ['Ei, gekocht', 'ei'],
  ])('%s matches %s', (text, term) => {
    expect(hasWordMatch(text, term)).toBe(true);
  });

  it.each([
    ['Cipollotti crudi', 'pollo'],
    ['Pastinaca cruda', 'pasta'],
    ['Pomodori crudi', 'pomodoroso'],
    ['Peperoni, sauer eingelegt', 'ei'],
    ['Eigelb, roh', 'ei'],
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

  it('returns no words for an empty term', () => {
    expect(searchWords(undefined)).toEqual([]);
    expect(searchWords('   ')).toEqual([]);
  });
});
