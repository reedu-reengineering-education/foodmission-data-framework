import {
  DEFAULT_EFF_FOOTPRINTS_CSV,
  DEFAULT_NEVO_EFF_MAPPING_CSV,
  EFF_INDICATORS,
  parseEffFootprintsCsv,
  parseNevoEffMappingCsv,
} from '../../../scripts/seeds/prod/nevoEnvironment';
import * as fs from 'node:fs';
import { gunzipSync } from 'node:zlib';

function committedFootprints() {
  return parseEffFootprintsCsv(
    gunzipSync(fs.readFileSync(DEFAULT_EFF_FOOTPRINTS_CSV)).toString('utf-8'),
  );
}

const FOOTPRINT_HEADER = [
  'foodex2_code',
  'product',
  'category',
  'country',
  'basis',
  'stage',
  ...EFF_INDICATORS,
].join(',');

function footprintLine(cells: string[], value: string) {
  return [...cells, ...EFF_INDICATORS.map(() => value)].join(',');
}

describe('EFF footprints import', () => {
  it('parses one row per product, country, basis and stage', () => {
    const content = [
      FOOTPRINT_HEADER,
      footprintLine(
        ['A01QV', 'Bovine fresh meat', 'Meat', 'DE', 'RETAIL', 'TOTAL'],
        '50.5',
      ),
      footprintLine(
        [
          'A03ZLsub',
          '"b) Hamburger, no bread"',
          '',
          'EU_27',
          'CONSUMED',
          'END_OF_LIFE',
        ],
        '1.19e-07',
      ),
    ].join('\n');

    const rows = parseEffFootprintsCsv(content);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      foodex2Code: 'A01QV',
      product: 'Bovine fresh meat',
      category: 'Meat',
      country: 'DE',
      basis: 'RETAIL',
      stage: 'TOTAL',
      climateChange: 50.5,
      waterUse: 50.5,
    });
    expect(rows[1].product).toBe('b) Hamburger, no bread');
    expect(rows[1].category).toBeNull();
    expect(rows[1].stage).toBe('END_OF_LIFE');
    expect(rows[1].landUse).toBe(1.19e-7);
  });

  it('drops rows with an unknown basis/stage or a missing value', () => {
    const content = [
      FOOTPRINT_HEADER,
      footprintLine(['A001C', 'Rice', 'Cereals', 'AT', 'RAW', 'TOTAL'], '1'),
      footprintLine(['A001C', 'Rice', 'Cereals', 'AT', 'RETAIL', 'FARM'], '1'),
      footprintLine(['A001C', 'Rice', 'Cereals', 'AT', 'RETAIL', 'TOTAL'], ''),
    ].join('\n');

    expect(parseEffFootprintsCsv(content)).toEqual([]);
  });

  describe('committed CSV', () => {
    const rows = committedFootprints();
    const totals = rows.filter((r) => r.stage === 'TOTAL');

    it('has one total per product, region and basis in all 28 regions', () => {
      const keys = new Set(
        totals.map((r) => `${r.foodex2Code}|${r.country}|${r.basis}`),
      );
      const countries = new Set(totals.map((r) => r.country));

      expect(keys.size).toBe(totals.length);
      expect(countries.size).toBe(28);
      expect(countries.has('EU_27')).toBe(true);
      // every product has a consumed footprint; a few have no retail one
      const consumed = new Set(
        totals.filter((r) => r.basis === 'CONSUMED').map((r) => r.foodex2Code),
      );
      expect(consumed.size).toBe(new Set(rows.map((r) => r.foodex2Code)).size);
    });

    it('has a full stage breakdown that sums to the climate total', () => {
      const stageSums = new Map<string, { sum: number; count: number }>();
      for (const r of rows) {
        if (r.stage === 'TOTAL') continue;
        const key = `${r.foodex2Code}|${r.country}|${r.basis}`;
        const acc = stageSums.get(key) ?? { sum: 0, count: 0 };
        acc.sum += r.climateChange;
        acc.count += 1;
        stageSums.set(key, acc);
      }

      for (const total of totals) {
        const acc = stageSums.get(
          `${total.foodex2Code}|${total.country}|${total.basis}`,
        );
        expect(acc?.count).toBe(total.basis === 'RETAIL' ? 6 : 8);
        expect(Math.abs(acc!.sum - total.climateChange)).toBeLessThanOrEqual(
          Math.max(0.02 * Math.abs(total.climateChange), 1e-3),
        );
      }
    });
  });
});

describe('NEVO to EFF mapping import', () => {
  it('parses mapping rows and drops unknown enums', () => {
    const content = [
      'NEVO-code,English food name,nevo_foodex2_base,eff_foodex2_code,match_type,preferred_basis',
      '2336,Beef av raw,A01QX,A01QV,EFF_NEVO_PROXY,RETAIL',
      '1,Potatoes raw,A00ZX,A00ZT,GUESS,RETAIL',
      '2,Potatoes new raw,A00ZV,A00ZT,PARENT_1,RAW',
    ].join('\n');

    expect(parseNevoEffMappingCsv(content)).toEqual([
      {
        nevoCode: 2336,
        foodex2Code: 'A01QV',
        matchType: 'EFF_NEVO_PROXY',
        preferredBasis: 'RETAIL',
      },
    ]);
  });

  it('committed mapping only points at products in the footprints CSV', () => {
    const products = new Set(committedFootprints().map((r) => r.foodex2Code));
    const rows = parseNevoEffMappingCsv(
      fs.readFileSync(DEFAULT_NEVO_EFF_MAPPING_CSV, 'utf-8'),
    );

    expect(rows.length).toBeGreaterThan(1000);
    expect(new Set(rows.map((r) => r.nevoCode)).size).toBe(rows.length);
    expect(rows.every((r) => products.has(r.foodex2Code))).toBe(true);
  });
});
