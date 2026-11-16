import * as fs from 'node:fs';
import * as path from 'node:path';

const DATA_DIR = path.join(process.cwd(), 'prisma', 'seeds', 'data');

describe('NEVO to AGRIBALYSE mapping', () => {
  const { foods } = JSON.parse(
    fs.readFileSync(
      path.join(DATA_DIR, 'nevo-agribalyse-mapping.json'),
      'utf-8',
    ),
  ) as { foods: { nevoCode: number; co2PerKg: number }[] };
  const nevoCodes = new Set(
    fs
      .readFileSync(path.join(DATA_DIR, 'nevo', 'NEVO2025_v9.0.csv'), 'utf-8')
      .split('\n')
      .slice(1)
      .map((line) => Number(line.split('|')[3]?.replace(/"/g, '')))
      .filter(Number.isFinite),
  );

  it('maps only NEVO foods that exist, each once', () => {
    const codes = foods.map((food) => food.nevoCode);

    expect(codes.filter((code) => !nevoCodes.has(code))).toEqual([]);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('gives every mapped food a positive footprint', () => {
    expect(foods.filter((food) => !(food.co2PerKg > 0))).toEqual([]);
  });
});
