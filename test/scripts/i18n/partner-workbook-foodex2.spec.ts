import * as fs from 'node:fs';
import * as path from 'node:path';
import { resolveCategories } from '../../../scripts/i18n/partner-workbook';

/**
 * FoodEx2 concept names are translated through the master partner workbook,
 * so the `food-foodex2` sheet has to stay in sync with the CSV that
 * `db:translations` actually seeds from.
 */
describe('partner workbook: food-foodex2', () => {
  const CSV = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'prisma',
    'seeds',
    'data',
    'foodex2',
    'foodex2-translations.csv',
  );
  const locales = ['no', 'de', 'el', 'es', 'it', 'nl', 'pl', 'sl'];
  const [category] = resolveCategories(['food-foodex2']);

  it('is registered in the master workbook', () => {
    expect(category).toBeDefined();
    expect(category.id).toBe('food-foodex2');
    expect(category.source).toBe(
      'prisma/seeds/data/foodex2/foodex2-translations.csv',
    );
    // The sheet feeds the same CSV that db:translations loads.
    expect(category.seededBy).toBe('db:translations');
  });

  it('collects one row per FoodEx2 concept, keyed by code', () => {
    const entries = category.collect(locales);
    const csvRows =
      fs
        .readFileSync(CSV, 'utf8')
        .split(/\r?\n/)
        .filter((line) => line.trim() !== '').length - 1;

    expect(entries).toHaveLength(csvRows);
    expect(new Set(entries.map((e) => e.key)).size).toBe(entries.length);
    expect(entries.every((e) => /^[A-Z][A-Z0-9]{4}$/.test(e.key))).toBe(true);
  });

  it('exposes every locale as its own column with no gaps', () => {
    const entries = category.collect(locales);
    const blanks = entries.flatMap((entry) =>
      locales
        .filter((locale) => !entry.translations[locale]?.trim())
        .map((locale) => `${entry.key}/${locale}`),
    );

    expect(blanks).toEqual([]);
  });

  it('carries the English source alongside the translations', () => {
    const pasta = category
      .collect(locales)
      .find((entry) => entry.key === 'A007L');

    expect(pasta?.en).toBe('Dried pasta');
    expect(pasta?.translations.de).toBe('Getrocknete Nudeln');
  });

  it('writes a partner edit back to the CSV without touching other cells', () => {
    const before = fs.readFileSync(CSV, 'utf8');
    try {
      const written = category.apply(
        [{ key: 'A007L', locale: 'de', value: 'ROUNDTRIP Nudeln' }],
        false,
        { locales, validKeys: new Set(['A007L']) },
      );
      expect(written).toEqual([
        'prisma/seeds/data/foodex2/foodex2-translations.csv',
      ]);

      const after = fs.readFileSync(CSV, 'utf8');
      const changed = after
        .split('\n')
        .filter((line, i) => line !== before.split('\n')[i]);

      expect(changed).toHaveLength(1);
      expect(changed[0]).toContain('ROUNDTRIP Nudeln');
      // Neighbouring locale columns are untouched.
      expect(changed[0]).toContain('Ξηρά ζυμαρικά');
      expect(changed[0]).toContain('Sušene testenine');
    } finally {
      fs.writeFileSync(CSV, before, 'utf8');
    }
  });

  it('ignores updates for codes that are no longer in the CSV', () => {
    const before = fs.readFileSync(CSV, 'utf8');
    const written = category.apply(
      [{ key: 'ZZZZZ', locale: 'de', value: 'nope' }],
      false,
      { locales, validKeys: new Set(['ZZZZZ']) },
    );

    expect(written).toEqual([]);
    expect(fs.readFileSync(CSV, 'utf8')).toBe(before);
  });
});
