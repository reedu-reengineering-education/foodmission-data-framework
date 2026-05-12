import { offTagToPlain, buildCategoryHints } from './food-tag.utils';

describe('offTagToPlain', () => {
  it('strips a two-letter language prefix', () => {
    expect(offTagToPlain('en:dairy-products')).toBe('dairy products');
  });

  it('replaces dashes with spaces', () => {
    expect(offTagToPlain('en:sweet-spreads')).toBe('sweet spreads');
  });

  it('lowercases the result', () => {
    expect(offTagToPlain('en:Dairy-Products')).toBe('dairy products');
  });

  it('handles tags without a language prefix', () => {
    expect(offTagToPlain('cheeses')).toBe('cheeses');
  });

  it('handles non-english prefixes', () => {
    expect(offTagToPlain('fr:produits-laitiers')).toBe('produits laitiers');
  });

  it('returns empty string for an empty input', () => {
    expect(offTagToPlain('')).toBe('');
  });
});

describe('buildCategoryHints', () => {
  it('converts all tags to plain text', () => {
    expect(buildCategoryHints(['en:dairy-products', 'en:cheeses'])).toEqual([
      'dairy products',
      'cheeses',
    ]);
  });

  it('filters out empty strings from malformed tags', () => {
    expect(buildCategoryHints(['', 'en:dairy-products'])).toEqual([
      'dairy products',
    ]);
  });

  it('returns an empty array for an empty input', () => {
    expect(buildCategoryHints([])).toEqual([]);
  });
});
