import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { seedAgribalyse } from '../../../scripts/seeds/prod/agribalyse';

describe('seedAgribalyse', () => {
  const imported: Record<string, unknown>[] = [];
  const links: { nevoCode: number; agribalyseCode: string }[] = [];
  const prisma = {
    agribalyseFood: {
      upsert: ({ create }: { create: Record<string, unknown> }) => {
        imported.push(create);
        return Promise.resolve();
      },
    },
    genericFood: {
      updateMany: ({
        where,
        data,
      }: {
        where: { nevoCode: number | object };
        data: { agribalyseCode: string | null };
      }) => {
        if (typeof where.nevoCode === 'number' && data.agribalyseCode) {
          links.push({
            nevoCode: where.nevoCode,
            agribalyseCode: data.agribalyseCode,
          });
        }
        return Promise.resolve({ count: 1 });
      },
    },
  } as unknown as PrismaClient;
  const rows = () => imported;
  const nevoCodes = new Set(
    fs
      .readFileSync(
        path.join(process.cwd(), 'prisma/seeds/data/nevo/NEVO2025_v9.0.csv'),
        'utf-8',
      )
      .split('\n')
      .slice(1)
      .map((line) => Number(line.split('|')[3]?.replace(/"/g, '')))
      .filter(Number.isFinite),
  );

  beforeAll(async () => {
    const log = console.log;
    console.log = () => undefined;
    await seedAgribalyse(prisma);
    console.log = log;
  });

  it('imports every AGRIBALYSE food once', () => {
    const codes = rows().map((row) => row.code);
    expect(codes).toHaveLength(2451);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('reads names, indicators and quality per food', () => {
    expect(rows().find((row) => row.code === '20034')).toEqual({
      code: '20034',
      ciqualCode: 20034,
      foodGroup: 'fruits, légumes, légumineuses et oléagineux',
      foodSubgroup: 'légumes',
      nameFr: 'Oignon, cru',
      nameEn: 'Onion, raw',
      preparation: 'Pas de préparation',
      dqr: 2.39,
      efScorePerKg: 0.0487,
      co2PerKg: 0.421,
      version: '3.2',
    });
  });

  it('gives every food finite, non-negative values', () => {
    expect(
      rows().filter(
        (row) =>
          ![row.ciqualCode, row.dqr, row.efScorePerKg, row.co2PerKg].every(
            (value) => Number.isFinite(value) && (value as number) >= 0,
          ),
      ),
    ).toEqual([]);
  });

  it('links each mapped NEVO food once, to an imported AGRIBALYSE food', () => {
    const codes = new Set(rows().map((row) => row.code));
    const linkedNevoCodes = links.map((link) => link.nevoCode);

    expect(links.length).toBeGreaterThan(0);
    expect(new Set(linkedNevoCodes).size).toBe(linkedNevoCodes.length);
    expect(linkedNevoCodes.filter((code) => !nevoCodes.has(code))).toEqual([]);
    expect(links.filter((link) => !codes.has(link.agribalyseCode))).toEqual([]);
  });
});
