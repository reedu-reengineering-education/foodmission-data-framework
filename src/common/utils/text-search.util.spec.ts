import { Prisma } from '@prisma/client';
import { searchWords, textSearchConditions } from './text-search.util';

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

describe('textSearchConditions', () => {
  it('matches any of the fields, case-insensitively', () => {
    expect(
      textSearchConditions<Prisma.FoodFactWhereInput>('meat', [
        'title',
        'body',
      ]),
    ).toEqual([
      { title: { contains: 'meat', mode: 'insensitive' } },
      { body: { contains: 'meat', mode: 'insensitive' } },
    ]);
  });

  it('also matches entities whose translation matched', () => {
    expect(
      textSearchConditions<Prisma.FoodFactWhereInput>(
        'carne',
        ['title'],
        ['f1'],
      ),
    ).toEqual([
      { title: { contains: 'carne', mode: 'insensitive' } },
      { id: { in: ['f1'] } },
    ]);
  });
});
