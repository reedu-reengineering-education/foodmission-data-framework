import * as fs from 'node:fs';
import * as path from 'node:path';

const DATA_DIR = path.join(process.cwd(), 'prisma', 'seeds', 'data');

type Mapping = {
  foods: { nevoCode: number; co2PerKg: number; match: string }[];
  unmatched: { nevoCode: number; reason: string }[];
};

describe('NEVO to AGRIBALYSE mapping', () => {
  const mapping = JSON.parse(
    fs.readFileSync(
      path.join(DATA_DIR, 'nevo-agribalyse-mapping.json'),
      'utf-8',
    ),
  ) as Mapping;
  const nevoCodes = new Set(
    fs
      .readFileSync(path.join(DATA_DIR, 'nevo', 'NEVO2025_v9.0.csv'), 'utf-8')
      .split('\n')
      .slice(1)
      .map((line) => Number(line.split('|')[3]?.replace(/"/g, '')))
      .filter(Number.isFinite),
  );

  it('maps only NEVO foods that exist, each once', () => {
    const codes = [
      ...mapping.foods.map((food) => food.nevoCode),
      ...mapping.unmatched.map((food) => food.nevoCode),
    ];

    expect(codes.filter((code) => !nevoCodes.has(code))).toEqual([]);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('gives every mapped food a positive footprint and a match level', () => {
    expect(
      mapping.foods.filter(
        (food) =>
          !(food.co2PerKg > 0) || !['high', 'medium'].includes(food.match),
      ),
    ).toEqual([]);
  });

  it('explains every unmatched food', () => {
    expect(mapping.unmatched.every((food) => food.reason.length > 0)).toBe(
      true,
    );
  });
});
